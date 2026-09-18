import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GAME_OVER_LINE_Y,
  SCALE,
  boardX,
  boardY,
} from './config.js';
import { MERGE_SETS } from './sets.js';
import { createGameModel } from './model.js';
import { getTopScores, submitScore } from './leaderboardRepository.js';
import {
  applyTheme,
  createUI,
  renderLeaderboard,
  getNextPreviewPos,
  getWheelCenter,
  renderGameOver,
  uiElements,
  updateTimerDisplay,
} from './ui.js';

const model = createGameModel();
const state = model;
const runtime = {
  bgMusic: null,
  gameOverLine: null,
  aimLine: null,
  currentSausageSprite: null,
  nextSausagePreview: null,
  wheelSprites: [],
};

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
  backgroundColor: '#181412',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.5 * SCALE },
      runner: { isFixed: true, fps: 120 },
      positionIterations: 20,
      velocityIterations: 20,
      constraintIterations: 10,
      debug: false,
    },
  },
  input: {
    activePointers: 1,
    touch: { capture: true },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

new Phaser.Game(config);

function preload() {
  // Charge uniquement les assets du set actuel
  const currentSet = MERGE_SETS[state.currentSetKey];

  if (currentSet.bgImage) {
    this.load.image('set_background', currentSet.bgImage);
  }
  if (currentSet.popSoundUrl) {
    this.load.audio(`pop_${state.currentSetKey}`, currentSet.popSoundUrl);
  }

  currentSet.items.forEach((type) => {
    this.load.image(type.key, `assets/${state.currentSetKey}/${type.key}.png`);
  });

  this.load.json('physics_shapes', `assets/${state.currentSetKey}/physics.json`);
  this.load.audio('bgm', currentSet.bgmUrl);
}

function create() {
  model.reset();

  this.matter.world.setBounds(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT, 32 * SCALE, true, true, false, true);

  // Gestion de la musique de fond
  if (runtime.bgMusic) {
    runtime.bgMusic.stop();
    runtime.bgMusic.destroy();
    runtime.bgMusic = null;
  }
  runtime.bgMusic = this.sound.add('bgm', { volume: 0.25, loop: true });

  // Initialisation globale de l'interface
  createUI(this, model);

  // Roue d'évolution
  createEvolutionWheel(this);

  // Écoute des changements de thème du système
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      state.isDarkMode = e.matches;
      applyTheme(this, model);
    });
  }

  // Ligne de Game Over
  runtime.gameOverLine = this.add.graphics();
  runtime.gameOverLine.setPosition(0, 0);
  runtime.gameOverLine.setDepth(100);

  drawGameOverLine();

  this.add
    .text(boardX + BOARD_WIDTH - 5 * SCALE, GAME_OVER_LINE_Y - 3 * SCALE, 'LIMIT', {
      fontSize: `${9 * SCALE}px`,
      fontStyle: 'bold',
      fill: '#ff2244',
    })
    .setOrigin(1, 1)
    .setDepth(100);

  runtime.aimLine = this.add.graphics();

  applyTheme(this, model);
  loadLeaderboard();

  state.nextTypeIndex = getRandomNextIndex();
  spawnNextSausage(this);

  // --- Gestion des entrées / interactions ---
  const isPointerInBoard = (worldPoint) => {
    return (
      worldPoint.x >= boardX &&
      worldPoint.x <= boardX + BOARD_WIDTH &&
      worldPoint.y >= boardY &&
      worldPoint.y <= boardY + BOARD_HEIGHT
    );
  };

  const updatePosition = (pointer) => {
    if (state.canDrop && runtime.currentSausageSprite && !state.gameOver) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const currentRadius = state.SAUSAGE_TYPES[state.currentTypeIndex].radius;
      const minX = boardX + currentRadius + 5 * SCALE;
      const maxX = boardX + BOARD_WIDTH - currentRadius - 5 * SCALE;
      runtime.currentSausageSprite.x = Phaser.Math.Clamp(worldPoint.x, minX, maxX);
    }
  };

  this.input.on('pointermove', updatePosition);

  this.input.on('pointerdown', (pointer) => {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (!isPointerInBoard(worldPoint)) return;
    updatePosition(pointer);
  });

  this.input.on('pointerup', (pointer) => {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    if (!isPointerInBoard(worldPoint)) return;
    if (!state.canDrop || state.gameOver) return;

    if (this.sound.context && this.sound.context.state === 'suspended') {
      this.sound.context.resume();
    }
    if (!runtime.bgMusic.isPlaying && !state.isMuted) {
      this.sound.unlock();
      runtime.bgMusic.play();
    }
    if (!state.isTimerRunning) {
      model.startTimer((seconds) => updateTimerDisplay(model, seconds));
    }

    state.canDrop = false;
    const dropX = runtime.currentSausageSprite.x;

    runtime.currentSausageSprite.destroy();
    runtime.aimLine.clear();

    createPhysicsSausage(this, dropX, boardY + 60 * SCALE, state.currentTypeIndex);

    this.time.delayedCall(450, () => {
      if (!state.gameOver) {
        spawnNextSausage(this);
        state.canDrop = true;
      }
    });
  });

  window.addEventListener('blur', () => model.pauseTimer());
  window.addEventListener(
    'focus',
    () => !state.gameOver && model.startTimer((seconds) => updateTimerDisplay(model, seconds)),
  );

  // --- Gestion des collisions et fusions ---
  this.matter.world.on('collisionstart', (event) => {
    event.pairs.forEach((pair) => {
      const bodyA = pair.bodyA.parent || pair.bodyA;
      const bodyB = pair.bodyB.parent || pair.bodyB;

      if (bodyA.sausageTypeIndex !== undefined && bodyB.sausageTypeIndex !== undefined) {
        if (bodyA.sausageTypeIndex === bodyB.sausageTypeIndex) {
          const currentIndex = bodyA.sausageTypeIndex;

          if (bodyA.isMarkedForDelete || bodyB.isMarkedForDelete) return;
          bodyA.isMarkedForDelete = true;
          bodyB.isMarkedForDelete = true;

          playPopSound(this, currentIndex);

          if (currentIndex < state.SAUSAGE_TYPES.length - 1) {
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            const nextIndex = currentIndex + 1;

            model.addScore(state.SAUSAGE_TYPES[nextIndex].score);
            updateScoreDisplay();

            destroySausageBody(this, bodyA);
            destroySausageBody(this, bodyB);

            this.time.delayedCall(20, () => {
              createPhysicsSausage(this, newX, newY, nextIndex);
            });
          } else {
            model.addScore(state.SAUSAGE_TYPES[currentIndex].score * 2);
            updateScoreDisplay();

            destroySausageBody(this, bodyA);
            destroySausageBody(this, bodyB);
          }
        }
      }
    });
  });
}

function drawGameOverLine() {
  runtime.gameOverLine.clear();
  runtime.gameOverLine.lineStyle(6 * SCALE, 0xff0000, 0.35);
  runtime.gameOverLine.lineBetween(boardX, GAME_OVER_LINE_Y, boardX + BOARD_WIDTH, GAME_OVER_LINE_Y);

  runtime.gameOverLine.lineStyle(2.5 * SCALE, 0xff2244, 1.0);
  const dashWidth = 8 * SCALE;
  const gapWidth = 6 * SCALE;

  for (let x = boardX; x < boardX + BOARD_WIDTH; x += dashWidth + gapWidth) {
    runtime.gameOverLine.lineBetween(
      x,
      GAME_OVER_LINE_Y,
      Math.min(x + dashWidth, boardX + BOARD_WIDTH),
      GAME_OVER_LINE_Y,
    );
  }
}

function createEvolutionWheel(scene) {
  const { x: centerX, y: centerY, radius: wheelRadius } = getWheelCenter();
  const total = state.SAUSAGE_TYPES.length;

  runtime.wheelSprites.forEach((s) => s.destroy());
  runtime.wheelSprites = [];

  state.SAUSAGE_TYPES.forEach((type, index) => {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * wheelRadius;
    const y = centerY + Math.sin(angle) * wheelRadius;

    const img = scene.add.image(x, y, type.key);
    const iconSize = 12 * SCALE;
    const maxDim = Math.max(img.width, img.height);
    img.setScale(iconSize / maxDim);

    runtime.wheelSprites.push(img);
  });
}

function playPopSound(scene, levelIndex = 0) {
  if (state.isMuted) return;

  const currentSetKey = state.currentSetKey;
  const soundKey = `pop_${currentSetKey}`;
  if (scene.cache.audio.has(soundKey)) {
    // Pitch de base légerement plus aigu pour les petits objets, plus grave pour les gros
    const baseDetune = (10 - levelIndex) * 30; // ex: +300 cents à -300 cents

    // Variation aléatoire de ±120 cents (environ un ton au-dessus/en-dessous)
    const randomJitter = Math.floor(Math.random() * 240) - 120;

    scene.sound.play(soundKey, {
      volume: 0.6,
      detune: baseDetune + randomJitter, // Module la tonalité/pitch du MP3
    });
    return;
  }

  try {
    const audioCtx = scene.sound.context;
    if (!audioCtx) return;

    const pitchVariation = 1 + (Math.random() * 0.16 - 0.08);
    const duration = 0.08 * pitchVariation;
    const baseFreq = (420 - levelIndex * 18) * pitchVariation;
    const endFreq = baseFreq + 220 * pitchVariation;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function updateScoreDisplay() {
  if (uiElements.scoreText) uiElements.scoreText.setText(state.score);
  if (state.score > state.highScore) {
    state.highScore = state.score;
    if (uiElements.highScoreText) uiElements.highScoreText.setText(state.highScore);
    localStorage.setItem(`high_score_${state.currentSetKey}`, state.highScore);
  }
}

async function loadLeaderboard() {
  try {
    renderLeaderboard(await getTopScores(model.currentSetKey));
  } catch (error) {
    console.error('Erreur Supabase (Leaderboard) :', error.message || error);
  }
}

function update(time, delta) {
  if (state.gameOver) return;

  // Ligne de visée
  if (state.canDrop && runtime.currentSausageSprite) {
    runtime.aimLine.clear();
    const lineColor = state.isDarkMode ? 0xffffff : 0x000000;
    runtime.aimLine.lineStyle(1 * SCALE, lineColor, 0.3);
    const startY = boardY + 60 * SCALE + state.SAUSAGE_TYPES[state.currentTypeIndex].radius;
    for (let y = startY; y < boardY + BOARD_HEIGHT; y += 12 * SCALE) {
      runtime.aimLine.lineBetween(runtime.currentSausageSprite.x, y, runtime.currentSausageSprite.x, y + 6 * SCALE);
    }
  }

  const bodies = this.matter.world.getAllBodies();
  let isOverflowing = false;

  bodies.forEach((body) => {
    if (body && body.sausageTypeIndex !== undefined && state.SAUSAGE_TYPES[body.sausageTypeIndex]) {
      if (body.gameObject) {
        body.gameObject.x = body.position.x;
        body.gameObject.y = body.position.y;
        body.gameObject.rotation = body.angle;
      }

      // Détection du dépassement au-dessus de la ligne
      if (body.speed < 0.3 * SCALE) {
        const itemRadius = state.SAUSAGE_TYPES[body.sausageTypeIndex].radius;
        const topY = body.position.y - itemRadius;

        if (topY < GAME_OVER_LINE_Y) {
          isOverflowing = true;
        }
      }
    }
  });

  // Décompte avant déclenchement du Game Over
  if (isOverflowing) {
    state.overflowTimer += delta;
    if (state.overflowTimer > 1000) {
      triggerGameOver(this);
    }
  } else {
    state.overflowTimer = 0;
  }
}

function getRandomNextIndex() {
  return Math.floor(Math.random() * 4);
}

function spawnNextSausage(scene) {
  state.currentTypeIndex = state.nextTypeIndex;
  state.nextTypeIndex = getRandomNextIndex();

  const typeInfo = state.SAUSAGE_TYPES[state.currentTypeIndex];
  if (uiElements.sausNameText) uiElements.sausNameText.setText(typeInfo.name);

  if (runtime.nextSausagePreview) runtime.nextSausagePreview.destroy();
  const nextInfo = state.SAUSAGE_TYPES[state.nextTypeIndex];
  const previewPos = getNextPreviewPos();
  runtime.nextSausagePreview = scene.add.image(previewPos.x, previewPos.y, nextInfo.key);

  const maxPreviewSize = 50 * SCALE;
  const maxDimension = Math.max(runtime.nextSausagePreview.width, runtime.nextSausagePreview.height);
  runtime.nextSausagePreview.setScale(maxPreviewSize / maxDimension);

  runtime.currentSausageSprite = createPreviewSprite(scene, typeInfo);

  const activePointer = scene.input.activePointer;
  const worldPoint = scene.cameras.main.getWorldPoint(activePointer.x, activePointer.y);
  const currentRadius = typeInfo.radius;
  const minX = boardX + currentRadius + 5 * SCALE;
  const maxX = boardX + BOARD_WIDTH - currentRadius - 5 * SCALE;

  const initialX =
    activePointer && activePointer.x > 0 && worldPoint.x >= boardX && worldPoint.x <= boardX + BOARD_WIDTH
      ? Phaser.Math.Clamp(worldPoint.x, minX, maxX)
      : boardX + BOARD_WIDTH / 2;

  runtime.currentSausageSprite.x = initialX;
  runtime.currentSausageSprite.y = boardY + 60 * SCALE;
}

function createPreviewSprite(scene, typeInfo) {
  const sprite = scene.add.image(0, 0, typeInfo.key);
  const targetSize = typeInfo.radius * 2;
  const maxDim = Math.max(sprite.width, sprite.height);
  sprite.setScale(targetSize / maxDim);
  return sprite;
}

function createPhysicsSausage(scene, x, y, typeIndex) {
  const typeInfo = state.SAUSAGE_TYPES[typeIndex];
  const targetSize = typeInfo.radius * 2;

  const shapes = scene.cache.json.get('physics_shapes');
  const shapeData = shapes ? shapes[typeInfo.key] : null;

  let sprite;

  const commonOptions = {
    restitution: 0.05,
    friction: 0.5,
    frictionStatic: 1.0,
    density: 0.005,
    slop: 0.05 * SCALE,
  };

  if (shapeData) {
    sprite = scene.matter.add.sprite(x, y, typeInfo.key, null, {
      shape: shapeData,
      ...commonOptions,
    });

    const frame = scene.textures.getFrame(typeInfo.key);
    const maxDim = Math.max(frame.width, frame.height);
    const scale = targetSize / maxDim;

    sprite.setBody(shapeData, { scale: { x: scale, y: scale } });
    sprite.setScale(scale);
  } else {
    const tempTexture = scene.textures.get(typeInfo.key).getSourceImage();
    const aspect = tempTexture.width / tempTexture.height;

    let boxWidth, boxHeight;
    if (aspect >= 1) {
      boxWidth = targetSize;
      boxHeight = targetSize / aspect;
    } else {
      boxHeight = targetSize;
      boxWidth = targetSize * aspect;
    }

    const chamferRadius = Math.min(boxWidth, boxHeight) / 2;
    const body = scene.matter.add.rectangle(x, y, boxWidth, boxHeight, {
      chamfer: { radius: chamferRadius },
      ...commonOptions,
    });

    sprite = scene.add.image(x, y, typeInfo.key);
    sprite.setDisplaySize(boxWidth, boxHeight);
    body.gameObject = sprite;

    body.sausageTypeIndex = typeIndex;
    return body;
  }

  sprite.body.sausageTypeIndex = typeIndex;
  sprite.body.gameObject = sprite;

  return sprite.body;
}

function destroySausageBody(scene, body) {
  const gameObject = body.gameObject || (body.parent ? body.parent.gameObject : null);
  if (gameObject) {
    gameObject.destroy();
  }
  scene.matter.world.remove(body);
}

function triggerGameOver(scene) {
  runtime.aimLine.clear();
  model.setGameOver();
  renderGameOver(scene, model, {
    onSubmitScore: async (playerName, score) => {
      await submitScore(model.currentSetKey, playerName, score);
      await loadLeaderboard();
    },
    onRestart: () => {
      scene.scene.restart();
    },
  });
}
