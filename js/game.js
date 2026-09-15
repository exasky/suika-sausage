import {
  SCALE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  boardX,
  boardY,
  GAME_OVER_LINE_Y,
  supabaseClient,
} from './config.js';
import { MERGE_SETS, getLeaderboardTable } from './sets.js';
import { state } from './state.js';
import {
  uiElements,
  createUI,
  applyTheme,
  fetchLeaderboard,
  getNextPreviewPos,
  getWheelCenter,
  positionUIElements,
} from './ui.js';

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

  currentSet.items.forEach((type) => {
    this.load.image(type.key, `assets/${state.currentSetKey}/${type.key}.png`);
  });

  this.load.json('physics_shapes', `assets/${state.currentSetKey}/physics.json`);
  this.load.audio('bgm', currentSet.bgmUrl);
}

function create() {
  state.gameOver = false;
  state.canDrop = true;
  state.score = 0;
  state.overflowTimer = 0;

  this.matter.world.setBounds(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT, 32 * SCALE, true, true, false, true);

  // Gestion de la musique de fond
  if (state.bgMusic) {
    state.bgMusic.stop();
    state.bgMusic.destroy();
    state.bgMusic = null;
  }
  state.bgMusic = this.sound.add('bgm', { volume: 0.25, loop: true });

  // Initialisation globale de l'interface
  createUI(this);

  // Roue d'évolution
  createEvolutionWheel(this);

  // Écoute des changements de thème du système
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      state.isDarkMode = e.matches;
      applyTheme(this);
    });
  }

  // Ligne de Game Over
  state.gameOverLine = this.add.graphics();
  state.gameOverLine.setPosition(0, 0);
  state.gameOverLine.setDepth(100);

  drawGameOverLine();

  this.add
    .text(boardX + BOARD_WIDTH - 5 * SCALE, GAME_OVER_LINE_Y - 3 * SCALE, 'LIMIT', {
      fontSize: `${9 * SCALE}px`,
      fontStyle: 'bold',
      fill: '#ff2244',
    })
    .setOrigin(1, 1)
    .setDepth(100);

  state.aimLine = this.add.graphics();

  applyTheme(this);
  fetchLeaderboard();

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
    if (state.canDrop && state.currentSausageSprite && !state.gameOver) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const currentRadius = state.SAUSAGE_TYPES[state.currentTypeIndex].radius;
      const minX = boardX + currentRadius + 5 * SCALE;
      const maxX = boardX + BOARD_WIDTH - currentRadius - 5 * SCALE;
      state.currentSausageSprite.x = Phaser.Math.Clamp(worldPoint.x, minX, maxX);
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
    if (!state.bgMusic.isPlaying && !state.isMuted) {
      this.sound.unlock();
      state.bgMusic.play();
    }

    state.canDrop = false;
    const dropX = state.currentSausageSprite.x;

    state.currentSausageSprite.destroy();
    state.aimLine.clear();

    createPhysicsSausage(this, dropX, boardY + 60 * SCALE, state.currentTypeIndex);

    this.time.delayedCall(450, () => {
      if (!state.gameOver) {
        spawnNextSausage(this);
        state.canDrop = true;
      }
    });
  });

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

            state.score += state.SAUSAGE_TYPES[nextIndex].score;
            updateScoreDisplay();

            destroySausageBody(this, bodyA);
            destroySausageBody(this, bodyB);

            this.time.delayedCall(20, () => {
              createPhysicsSausage(this, newX, newY, nextIndex);
            });
          } else {
            state.score += state.SAUSAGE_TYPES[currentIndex].score * 2;
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
  state.gameOverLine.clear();
  state.gameOverLine.lineStyle(6 * SCALE, 0xff0000, 0.35);
  state.gameOverLine.lineBetween(boardX, GAME_OVER_LINE_Y, boardX + BOARD_WIDTH, GAME_OVER_LINE_Y);

  state.gameOverLine.lineStyle(2.5 * SCALE, 0xff2244, 1.0);
  const dashWidth = 8 * SCALE;
  const gapWidth = 6 * SCALE;

  for (let x = boardX; x < boardX + BOARD_WIDTH; x += dashWidth + gapWidth) {
    state.gameOverLine.lineBetween(
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

  state.wheelSprites.forEach((s) => s.destroy());
  state.wheelSprites = [];

  state.SAUSAGE_TYPES.forEach((type, index) => {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * wheelRadius;
    const y = centerY + Math.sin(angle) * wheelRadius;

    const img = scene.add.image(x, y, type.key);
    const iconSize = 12 * SCALE;
    const maxDim = Math.max(img.width, img.height);
    img.setScale(iconSize / maxDim);

    state.wheelSprites.push(img);
  });
}

function playPopSound(scene, levelIndex = 0) {
  if (state.isMuted) return;
  try {
    const audioCtx = scene.sound.context;
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const baseFreq = 420 - levelIndex * 18;
    const endFreq = baseFreq + 220;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.08);
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

function update(time, delta) {
  if (state.gameOver) return;

  // Ligne de visée
  if (state.canDrop && state.currentSausageSprite) {
    state.aimLine.clear();
    const lineColor = state.isDarkMode ? 0xffffff : 0x000000;
    state.aimLine.lineStyle(1 * SCALE, lineColor, 0.3);
    const startY = boardY + 60 * SCALE + state.SAUSAGE_TYPES[state.currentTypeIndex].radius;
    for (let y = startY; y < boardY + BOARD_HEIGHT; y += 12 * SCALE) {
      state.aimLine.lineBetween(state.currentSausageSprite.x, y, state.currentSausageSprite.x, y + 6 * SCALE);
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

  if (state.nextSausagePreview) state.nextSausagePreview.destroy();
  const nextInfo = state.SAUSAGE_TYPES[state.nextTypeIndex];
  const previewPos = getNextPreviewPos();
  state.nextSausagePreview = scene.add.image(previewPos.x, previewPos.y, nextInfo.key);

  const maxPreviewSize = 50 * SCALE;
  const maxDimension = Math.max(state.nextSausagePreview.width, state.nextSausagePreview.height);
  state.nextSausagePreview.setScale(maxPreviewSize / maxDimension);

  state.currentSausageSprite = createPreviewSprite(scene, typeInfo);

  const activePointer = scene.input.activePointer;
  const worldPoint = scene.cameras.main.getWorldPoint(activePointer.x, activePointer.y);
  const currentRadius = typeInfo.radius;
  const minX = boardX + currentRadius + 5 * SCALE;
  const maxX = boardX + BOARD_WIDTH - currentRadius - 5 * SCALE;

  const initialX =
    activePointer && activePointer.x > 0 && worldPoint.x >= boardX && worldPoint.x <= boardX + BOARD_WIDTH
      ? Phaser.Math.Clamp(worldPoint.x, minX, maxX)
      : boardX + BOARD_WIDTH / 2;

  state.currentSausageSprite.x = initialX;
  state.currentSausageSprite.y = boardY + 60 * SCALE;
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
  state.gameOver = true;
  state.aimLine.clear();

  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.88);
  overlay.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const centerX = CANVAS_WIDTH / 2;

  scene.add
    .text(centerX, 50 * SCALE, 'GAME OVER', {
      fontSize: `${28 * SCALE}px`,
      fill: '#ff4444',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  scene.add
    .text(centerX, 90 * SCALE, 'Score: ' + state.score, {
      fontSize: `${20 * SCALE}px`,
      fill: '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  let playerPseudo = (localStorage.getItem('sausage_player_name') || 'JOUEUR').substring(0, 10).toUpperCase();

  scene.add
    .text(centerX, 130 * SCALE, 'VOTRE PSEUDO:', {
      fontSize: `${11 * SCALE}px`,
      fill: '#888888',
    })
    .setOrigin(0.5);

  const pseudoDisplay = scene.add
    .text(centerX, 155 * SCALE, playerPseudo + '_', {
      fontSize: `${20 * SCALE}px`,
      fill: '#ffca28',
      fontStyle: 'bold',
      backgroundColor: '#222222',
      padding: { x: 15 * SCALE, y: 5 * SCALE },
    })
    .setOrigin(0.5);

  const statusText = scene.add
    .text(centerX, 185 * SCALE, '', {
      fontSize: `${11 * SCALE}px`,
      fill: '#aaa',
    })
    .setOrigin(0.5);

  const keyboardKeys = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
    ['V', 'W', 'X', 'Y', 'Z', '⌫'],
  ];

  const startKeyY = 220 * SCALE;
  const keyWidth = 32 * SCALE;
  const keyHeight = 30 * SCALE;
  const gap = 5 * SCALE;

  const updatePseudoDisplay = () => {
    pseudoDisplay.setText(playerPseudo + (playerPseudo.length < 10 ? '_' : ''));
  };

  keyboardKeys.forEach((row, rowIndex) => {
    const rowWidth = row.length * keyWidth + (row.length - 1) * gap;
    const startX = centerX - rowWidth / 2;

    row.forEach((char, colIndex) => {
      const kx = startX + colIndex * (keyWidth + gap) + keyWidth / 2;
      const ky = startKeyY + rowIndex * (keyHeight + gap) + keyHeight / 2;

      const keyBtn = scene.add
        .text(kx, ky, char, {
          fontSize: `${13 * SCALE}px`,
          fontStyle: 'bold',
          fill: char === '⌫' ? '#ff6b6b' : '#ffffff',
          backgroundColor: '#333333',
          fixedWidth: keyWidth,
          fixedHeight: keyHeight,
          align: 'center',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      keyBtn.on('pointerdown', () => {
        if (char === '⌫') {
          if (playerPseudo.length > 0) {
            playerPseudo = playerPseudo.slice(0, -1);
          }
        } else {
          if (playerPseudo.length < 10) {
            playerPseudo += char;
          }
        }
        updatePseudoDisplay();
      });
    });
  });

  const sendBtnY = 380 * SCALE;
  const sendBtn = scene.add
    .text(centerX, sendBtnY, ' ENVOYER MON SCORE ', {
      fontSize: `${15 * SCALE}px`,
      fontStyle: 'bold',
      fill: '#181412',
      backgroundColor: '#ffca28',
      padding: { x: 15 * SCALE, y: 8 * SCALE },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  let isSubmitting = false;

  sendBtn.on('pointerdown', async () => {
    if (isSubmitting) return;
    if (!playerPseudo.trim()) {
      statusText.setColor('#ff6b6b');
      statusText.setText('Veuillez entrer un pseudo !');
      return;
    }

    isSubmitting = true;
    sendBtn.setAlpha(0.5);
    statusText.setColor('#aaa');
    statusText.setText('Envoi du score...');

    try {
      const table = getLeaderboardTable(state.currentSetKey);
      const { error } = await supabaseClient.from(table).insert([{ name: playerPseudo, score: state.score }]);

      if (error) throw error;

      localStorage.setItem('sausage_player_name', playerPseudo);
      statusText.setColor('#51cf66');
      statusText.setText('Score envoyé avec succès !');

      await fetchLeaderboard();
    } catch (err) {
      console.error(err);
      statusText.setColor('#ff6b6b');
      statusText.setText("Erreur lors de l'envoi");
      isSubmitting = false;
      sendBtn.setAlpha(1);
    }
  });

  const restartBtn = scene.add
    .text(centerX, 435 * SCALE, ' 🔄 REJOUER ', {
      fontSize: `${15 * SCALE}px`,
      fill: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 15 * SCALE, y: 8 * SCALE },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  restartBtn.on('pointerdown', () => {
    scene.scene.restart();
  });
}
