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

import * as Phaser from 'https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.esm.min.js';

class MergeGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MergeGameScene' });
    this.model = createGameModel();
    this.runtime = {
      bgMusic: null,
      gameOverLine: null,
      aimLine: null,
      currentSausageSprite: null,
      nextSausagePreview: null,
      wheelSprites: [],
    };
  }

  get state() {
    return this.model;
  }

  preload() {
    // Charge uniquement les assets du set actuel
    const currentSet = MERGE_SETS[this.state.currentSetKey];

    if (currentSet.bgImage) {
      this.load.image('set_background', currentSet.bgImage);
    }
    if (currentSet.popSoundUrl) {
      this.load.audio(`pop_${this.state.currentSetKey}`, currentSet.popSoundUrl);
    }

    currentSet.items.forEach((type) => {
      this.load.image(type.key, `assets/${this.state.currentSetKey}/${type.key}.png`);
    });

    this.load.json('physics_shapes', `assets/${this.state.currentSetKey}/physics.json`);
    this.load.audio('bgm', currentSet.bgmUrl);
  }

  create() {
    const state = this.state;
    const runtime = this.runtime;
    this.model.reset();

    this.matter.world.setBounds(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT, 32 * SCALE, true, true, false, true);

    // Gestion de la musique de fond
    if (this.runtime.bgMusic) {
      this.runtime.bgMusic.stop();
      this.runtime.bgMusic.destroy();
      this.runtime.bgMusic = null;
    }
    this.runtime.bgMusic = this.sound.add('bgm', { volume: 0.25, loop: true });

    // Initialisation globale de l'interface
    createUI(this, this.model);

    // Roue d'évolution
    this.createEvolutionWheel();

    // Écoute des changements de thème du système
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.state.isDarkMode = e.matches;
        applyTheme(this, this.model);
      });
    }

    // Ligne de Game Over
    this.runtime.gameOverLine = this.add.graphics();
    this.runtime.gameOverLine.setPosition(0, 0);
    this.runtime.gameOverLine.setDepth(100);

    this.drawGameOverLine();

    this.add
      .text(boardX + BOARD_WIDTH - 5 * SCALE, GAME_OVER_LINE_Y - 3 * SCALE, 'LIMIT', {
        fontSize: `${9 * SCALE}px`,
        fontStyle: 'bold',
        fill: '#ff2244',
      })
      .setOrigin(1, 1)
      .setDepth(100);

    this.runtime.aimLine = this.add.graphics();

    applyTheme(this, this.model);
    this.loadLeaderboard();

    this.state.nextTypeIndex = this.getRandomNextIndex();
    this.spawnNextSausage();

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
        this.model.startTimer((seconds) => updateTimerDisplay(this.model, seconds));
      }

      state.canDrop = false;
      const dropX = runtime.currentSausageSprite.x;

      runtime.currentSausageSprite.destroy();
      runtime.aimLine.clear();

      this.createPhysicsSausage(dropX, boardY + 60 * SCALE, state.currentTypeIndex);

      this.time.delayedCall(450, () => {
        if (!state.gameOver) {
          this.spawnNextSausage();
          state.canDrop = true;
        }
      });
    });

    window.addEventListener('blur', () => {
      this.game.pause();
      this.model.pauseTimer();
    });
    window.addEventListener('focus', () => {
      this.game.resume();
      if (!state.gameOver) {
        this.model.startTimer((seconds) => updateTimerDisplay(this.model, seconds));
      }
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

            this.playPopSound(currentIndex);

            if (currentIndex < state.SAUSAGE_TYPES.length - 1) {
              const newX = (bodyA.position.x + bodyB.position.x) / 2;
              const newY = (bodyA.position.y + bodyB.position.y) / 2;
              const nextIndex = currentIndex + 1;

              this.model.addScore(state.SAUSAGE_TYPES[nextIndex].score);
              this.updateScoreDisplay();

              this.destroySausageBody(bodyA);
              this.destroySausageBody(bodyB);

              this.time.delayedCall(20, () => {
                this.createPhysicsSausage(newX, newY, nextIndex);
              });
            } else {
              this.model.addScore(state.SAUSAGE_TYPES[currentIndex].score * 2);
              this.updateScoreDisplay();

              this.destroySausageBody(bodyA);
              this.destroySausageBody(bodyB);
            }
          }
        }
      });
    });
  }

  drawGameOverLine() {
    const runtime = this.runtime;
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

  createEvolutionWheel() {
    const state = this.state;
    const runtime = this.runtime;
    const { x: centerX, y: centerY, radius: wheelRadius } = getWheelCenter();
    const total = state.SAUSAGE_TYPES.length;

    runtime.wheelSprites.forEach((s) => s.destroy());
    runtime.wheelSprites = [];

    state.SAUSAGE_TYPES.forEach((type, index) => {
      const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * wheelRadius;
      const y = centerY + Math.sin(angle) * wheelRadius;

      const img = this.add.image(x, y, type.key);
      const iconSize = 12 * SCALE;
      const maxDim = Math.max(img.width, img.height);
      img.setScale(iconSize / maxDim);

      runtime.wheelSprites.push(img);
    });
  }

  playPopSound(levelIndex = 0) {
    const state = this.state;
    if (state.isMuted) return;

    const currentSetKey = state.currentSetKey;
    const soundKey = `pop_${currentSetKey}`;
    if (this.cache.audio.has(soundKey)) {
      // Pitch de base légerement plus aigu pour les petits objets, plus grave pour les gros
      const baseDetune = (10 - levelIndex) * 30; // ex: +300 cents à -300 cents

      // Variation aléatoire de ±120 cents (environ un ton au-dessus/en-dessous)
      const randomJitter = Math.floor(Math.random() * 240) - 120;

      this.sound.play(soundKey, {
        volume: 0.6,
        detune: baseDetune + randomJitter, // Module la tonalité/pitch du MP3
      });
      return;
    }

    try {
      const audioCtx = this.sound.context;
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

  updateScoreDisplay() {
    const state = this.state;
    if (uiElements.scoreText) uiElements.scoreText.setText(state.score);
    if (uiElements.highScoreText) uiElements.highScoreText.setText(state.highScore);
  }

  async loadLeaderboard() {
    try {
      renderLeaderboard(await getTopScores(this.model.currentSetKey));
    } catch (error) {
      console.error('Erreur Supabase (Leaderboard) :', error.message || error);
    }
  }

  update(time, delta) {
    const state = this.state;
    const runtime = this.runtime;
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
        this.triggerGameOver();
      }
    } else {
      state.overflowTimer = 0;
    }
  }

  getRandomNextIndex() {
    return Math.floor(Math.random() * 4);
    // return Math.floor(Math.random() * 8) + 3; // Pour tester les fusions rapides, on peut limiter aux types 3 à 10
  }

  spawnNextSausage() {
    const state = this.state;
    const runtime = this.runtime;
    state.currentTypeIndex = state.nextTypeIndex;
    state.nextTypeIndex = this.getRandomNextIndex();

    const typeInfo = state.SAUSAGE_TYPES[state.currentTypeIndex];
    if (uiElements.sausNameText) uiElements.sausNameText.setText(typeInfo.name);

    if (runtime.nextSausagePreview) runtime.nextSausagePreview.destroy();
    const nextInfo = state.SAUSAGE_TYPES[state.nextTypeIndex];
    const previewPos = getNextPreviewPos();
    runtime.nextSausagePreview = this.add.image(previewPos.x, previewPos.y, nextInfo.key);

    const maxPreviewSize = 50 * SCALE;
    const maxDimension = Math.max(runtime.nextSausagePreview.width, runtime.nextSausagePreview.height);
    runtime.nextSausagePreview.setScale(maxPreviewSize / maxDimension);

    runtime.currentSausageSprite = this.createPreviewSprite(typeInfo);

    const activePointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(activePointer.x, activePointer.y);
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

  createPreviewSprite(typeInfo) {
    const sprite = this.add.image(0, 0, typeInfo.key);
    const targetSize = typeInfo.radius * 2;
    const maxDim = Math.max(sprite.width, sprite.height);
    sprite.setScale(targetSize / maxDim);
    return sprite;
  }

  createPhysicsSausage(x, y, typeIndex) {
    const state = this.state;
    const typeInfo = state.SAUSAGE_TYPES[typeIndex];
    const targetSize = typeInfo.radius * 2;

    const shapes = this.cache.json.get('physics_shapes');
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
      sprite = this.matter.add.sprite(x, y, typeInfo.key, null, {
        shape: shapeData,
        ...commonOptions,
      });

      const frame = this.textures.getFrame(typeInfo.key);
      const maxDim = Math.max(frame.width, frame.height);
      const scale = targetSize / maxDim;

      sprite.setBody(shapeData, { scale: { x: scale, y: scale } });
      sprite.setScale(scale);
    } else {
      const tempTexture = this.textures.get(typeInfo.key).getSourceImage();
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
      const body = this.matter.add.rectangle(x, y, boxWidth, boxHeight, {
        chamfer: { radius: chamferRadius },
        ...commonOptions,
      });

      sprite = this.add.image(x, y, typeInfo.key);
      sprite.setDisplaySize(boxWidth, boxHeight);
      body.gameObject = sprite;

      body.sausageTypeIndex = typeIndex;
      return body;
    }

    sprite.body.sausageTypeIndex = typeIndex;
    sprite.body.gameObject = sprite;

    return sprite.body;
  }

  destroySausageBody(body) {
    const gameObject = body.gameObject || (body.parent ? body.parent.gameObject : null);
    if (gameObject) {
      gameObject.destroy();
    }
    this.matter.world.remove(body);
  }

  triggerGameOver() {
    this.runtime.aimLine.clear();
    this.model.setGameOver();
    renderGameOver(this, this.model, {
      onSubmitScore: async (playerName, score) => {
        await submitScore(this.model.currentSetKey, playerName, score);
        await this.loadLeaderboard();
      },
      onRestart: () => {
        this.scene.restart();
      },
    });
  }
}

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
      runner: { fps: 120 },
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
  scene: MergeGameScene,
};

new Phaser.Game(config);
