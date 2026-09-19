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
  renderContinuePrompt,
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
      currentItemSprite: null,
      nextItemPreview: null,
      wheelSprites: [],
    };
    this.isStartChoicePending = false;
    this.ignoreNextPointerUp = false;
    this.saveInterval = null;
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
    const savedGame = this.model.getSavedGame();
    this.isStartChoicePending = Boolean(savedGame);
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

    const startGame = (gameToRestore, ignorePointerUp = false) => {
      if (gameToRestore) {
        this.restoreGame(gameToRestore);
      } else {
        this.model.clearSavedGame();
        this.state.nextTypeIndex = this.getRandomNextIndex();
        this.spawnNextItem();
      }

      this.ignoreNextPointerUp = ignorePointerUp;
      this.isStartChoicePending = false;
      this.saveInterval = window.setInterval(() => this.saveGame(), 500);
    };

    if (savedGame) {
      renderContinuePrompt(this, {
        onContinue: () => startGame(savedGame, true),
        onNewGame: () => startGame(null, true),
      });
    } else {
      startGame(null);
    }

    window.addEventListener('pagehide', () => this.saveGame());

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
      if (state.canDrop && runtime.currentItemSprite && !state.gameOver) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const currentRadius = state.ITEM_TYPES[state.currentTypeIndex].radius;
        const minX = boardX + currentRadius + 5 * SCALE;
        const maxX = boardX + BOARD_WIDTH - currentRadius - 5 * SCALE;
        runtime.currentItemSprite.x = Phaser.Math.Clamp(worldPoint.x, minX, maxX);
      }
    };

    this.input.on('pointermove', updatePosition);

    this.input.on('pointerdown', (pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (!isPointerInBoard(worldPoint)) return;
      updatePosition(pointer);
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isStartChoicePending || this.ignoreNextPointerUp) {
        this.ignoreNextPointerUp = false;
        return;
      }
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
      const dropX = runtime.currentItemSprite.x;

      runtime.currentItemSprite.destroy();
      runtime.aimLine.clear();

      this.createPhysicsItem(dropX, boardY + 60 * SCALE, state.currentTypeIndex);
      this.saveGame();

      this.time.delayedCall(450, () => {
        if (!state.gameOver) {
          this.spawnNextItem();
          state.canDrop = true;
          this.saveGame();
        }
      });
    });

    window.addEventListener('blur', () => {
      this.model.pauseTimer();
    });
    window.addEventListener('focus', () => {
      if (!state.gameOver) {
        this.model.startTimer((seconds) => updateTimerDisplay(this.model, seconds));
      }
    });

    // --- Gestion des collisions et fusions ---
    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA.parent || pair.bodyA;
        const bodyB = pair.bodyB.parent || pair.bodyB;

        if (bodyA.itemTypeIndex !== undefined && bodyB.itemTypeIndex !== undefined) {
          if (bodyA.itemTypeIndex === bodyB.itemTypeIndex) {
            const currentIndex = bodyA.itemTypeIndex;

            if (bodyA.isMarkedForDelete || bodyB.isMarkedForDelete) return;
            bodyA.isMarkedForDelete = true;
            bodyB.isMarkedForDelete = true;

            this.playPopSound(currentIndex);

            if (currentIndex < state.ITEM_TYPES.length - 1) {
              const newX = (bodyA.position.x + bodyB.position.x) / 2;
              const newY = (bodyA.position.y + bodyB.position.y) / 2;
              const nextIndex = currentIndex + 1;

              this.model.addScore(state.ITEM_TYPES[nextIndex].score);
              this.updateScoreDisplay();

              this.destroyItemBody(bodyA);
              this.destroyItemBody(bodyB);

              this.time.delayedCall(20, () => {
                this.createPhysicsItem(newX, newY, nextIndex);
              });
            } else {
              this.model.addScore(state.ITEM_TYPES[currentIndex].score * 2);
              this.updateScoreDisplay();

              this.destroyItemBody(bodyA);
              this.destroyItemBody(bodyB);
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
    const total = state.ITEM_TYPES.length;

    runtime.wheelSprites.forEach((s) => s.destroy());
    runtime.wheelSprites = [];

    state.ITEM_TYPES.forEach((type, index) => {
      const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * wheelRadius;
      const y = centerY + Math.sin(angle) * wheelRadius;

      const img = this.add.image(x, y, type.key);
      const firstIconSize = 8 * SCALE;
      const lastIconSize = 20 * SCALE;
      const progress = total > 1 ? index / (total - 1) : 0;
      const iconSize = Phaser.Math.Linear(firstIconSize, lastIconSize, progress);
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
    if (state.canDrop && runtime.currentItemSprite) {
      runtime.aimLine.clear();
      const lineColor = state.isDarkMode ? 0xffffff : 0x000000;
      runtime.aimLine.lineStyle(1 * SCALE, lineColor, 0.3);
      const startY = boardY + 60 * SCALE + state.ITEM_TYPES[state.currentTypeIndex].radius;
      for (let y = startY; y < boardY + BOARD_HEIGHT; y += 12 * SCALE) {
        runtime.aimLine.lineBetween(runtime.currentItemSprite.x, y, runtime.currentItemSprite.x, y + 6 * SCALE);
      }
    }

    const bodies = this.matter.world.getAllBodies();
    let isOverflowing = false;

    bodies.forEach((body) => {
      if (body && body.itemTypeIndex !== undefined && state.ITEM_TYPES[body.itemTypeIndex]) {
        if (body.gameObject) {
          body.gameObject.x = body.position.x;
          body.gameObject.y = body.position.y;
          body.gameObject.rotation = body.angle;
        }

        // Détection du dépassement au-dessus de la ligne
        if (body.speed < 0.3 * SCALE) {
          const topY = body.bounds.min.y;

          if (topY < GAME_OVER_LINE_Y) {
            isOverflowing = true;
            // Debug visuel pour le dépassement
            // this.add.pointlight(body.position.x, topY, 0xff0000, 10 * SCALE, 0.5);
            // console.log('overflowcheck', body.speed, topY, GAME_OVER_LINE_Y, isOverflowing, state.overflowTimer);
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

  spawnNextItem() {
    const state = this.state;
    const runtime = this.runtime;
    state.currentTypeIndex = state.nextTypeIndex;
    state.nextTypeIndex = this.getRandomNextIndex();

    this.spawnCurrentItem();
  }

  spawnCurrentItem() {
    const state = this.state;
    const runtime = this.runtime;
    const typeInfo = state.ITEM_TYPES[state.currentTypeIndex];
    if (uiElements.sausNameText) uiElements.sausNameText.setText(typeInfo.name);

    if (runtime.nextItemPreview) runtime.nextItemPreview.destroy();
    const nextInfo = state.ITEM_TYPES[state.nextTypeIndex];
    const previewPos = getNextPreviewPos();
    runtime.nextItemPreview = this.add.image(previewPos.x, previewPos.y, nextInfo.key);

    const maxPreviewSize = 50 * SCALE;
    const maxDimension = Math.max(runtime.nextItemPreview.width, runtime.nextItemPreview.height);
    runtime.nextItemPreview.setScale(maxPreviewSize / maxDimension);

    runtime.currentItemSprite = this.createPreviewSprite(typeInfo);

    const activePointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(activePointer.x, activePointer.y);
    const currentRadius = typeInfo.radius;
    const minX = boardX + currentRadius + 5 * SCALE;
    const maxX = boardX + BOARD_WIDTH - currentRadius - 5 * SCALE;

    const initialX =
      activePointer && activePointer.x > 0 && worldPoint.x >= boardX && worldPoint.x <= boardX + BOARD_WIDTH
        ? Phaser.Math.Clamp(worldPoint.x, minX, maxX)
        : boardX + BOARD_WIDTH / 2;

    runtime.currentItemSprite.x = initialX;
    runtime.currentItemSprite.y = boardY + 60 * SCALE;
  }

  saveGame() {
    if (this.state.gameOver || !this.state.ITEM_TYPES.length || this.isStartChoicePending) return;

    const bodies = this.matter.world
      .getAllBodies()
      .filter((body) => body?.itemTypeIndex !== undefined)
      .map((body) => ({
        typeIndex: body.itemTypeIndex,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
        velocityX: body.velocity.x,
        velocityY: body.velocity.y,
        angularVelocity: body.angularVelocity,
      }));

    this.model.saveGame({
      score: this.state.score,
      elapsedTime: this.state.elapsedTime,
      currentTypeIndex: this.state.currentTypeIndex,
      nextTypeIndex: this.state.nextTypeIndex,
      currentItemX: this.runtime.currentItemSprite?.x,
      boardY,
      bodies,
    });
  }

  restoreGame(savedGame) {
    const savedBoardY = Number.isFinite(savedGame.boardY) ? savedGame.boardY : 0;
    const boardOffset = boardY - savedBoardY;
    this.state.score = savedGame.score || 0;
    this.state.elapsedTime = savedGame.elapsedTime || 0;
    this.state.currentTypeIndex = savedGame.currentTypeIndex;
    this.state.nextTypeIndex = savedGame.nextTypeIndex;
    this.state.canDrop = true;

    savedGame.bodies?.forEach((savedBody) => {
      const body = this.createPhysicsItem(savedBody.x, savedBody.y + boardOffset, savedBody.typeIndex);
      this.matter.body.setAngle(body, savedBody.angle || 0);
      this.matter.body.setVelocity(body, { x: savedBody.velocityX || 0, y: savedBody.velocityY || 0 });
      this.matter.body.setAngularVelocity(body, savedBody.angularVelocity || 0);
    });

    this.spawnCurrentItem();
    if (Number.isFinite(savedGame.currentItemX)) {
      this.runtime.currentItemSprite.x = savedGame.currentItemX;
    }
    this.updateScoreDisplay();
    updateTimerDisplay(this.state);
    if (this.state.elapsedTime > 0) {
      this.state.startTimer((seconds) => updateTimerDisplay(this.state, seconds));
    }
  }

  createPreviewSprite(typeInfo) {
    const sprite = this.add.image(0, 0, typeInfo.key);
    const targetSize = typeInfo.radius * 2;
    const maxDim = Math.max(sprite.width, sprite.height);
    sprite.setScale(targetSize / maxDim);
    return sprite;
  }

  createPhysicsItem(x, y, typeIndex) {
    const state = this.state;
    const typeInfo = state.ITEM_TYPES[typeIndex];
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

      body.itemTypeIndex = typeIndex;
      return body;
    }

    sprite.body.itemTypeIndex = typeIndex;
    sprite.body.gameObject = sprite;

    return sprite.body;
  }

  destroyItemBody(body) {
    const gameObject = body.gameObject || (body.parent ? body.parent.gameObject : null);
    if (gameObject) {
      gameObject.destroy();
    }
    this.matter.world.remove(body);
  }

  triggerGameOver() {
    this.model.clearSavedGame();
    if (this.saveInterval) window.clearInterval(this.saveInterval);
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
