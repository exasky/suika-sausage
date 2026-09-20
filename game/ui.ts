import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  boardX,
  boardY,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  isMobilePortrait,
  SCALE,
} from './config.js';
import type { GameModelClass } from './model';

export type UiElementCollection = {
  bgContainer: Phaser.GameObjects.Graphics;
  boardBg: Phaser.GameObjects.Image | null;
  uiBg: Phaser.GameObjects.Graphics;
  leaderBox: Phaser.GameObjects.Graphics;
  nextBox: Phaser.GameObjects.Graphics;
  wheelGraphics: Phaser.GameObjects.Graphics;
  leaderLabel: Phaser.GameObjects.Text;
  topScoresTexts: Phaser.GameObjects.Text[];
  nextLabel: Phaser.GameObjects.Text;
  scoreLabel: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  highLabel: Phaser.GameObjects.Text;
  highScoreText: Phaser.GameObjects.Text;
  sausNameText: Phaser.GameObjects.Text;
  wheelLabel: Phaser.GameObjects.Text;
  timerText: Phaser.GameObjects.Text;
  homeBtnText: Phaser.GameObjects.Text;
  themeBtnText: Phaser.GameObjects.Text;
  soundBtnText: Phaser.GameObjects.Text;
};

const THEMES = {
  dark: {
    bgBoard: 0x231e1a,
    uiBg: 0x110e0d,
    border: 0x3a312b,
    boxStroke: 0x443932,
    label: '#888888',
    scoreText: '#ffca28',
    highText: '#ffffff',
    nameText: '#ff8a65',
    btnBg: '#2a2421',
    btnText: '#ffffff',
    btnLabel: ' 🌙 DARK ',
    wheelStroke: 0x554438,
  },
  light: {
    bgBoard: 0xf5f2eb,
    uiBg: 0xe8e2d8,
    border: 0xc8bfb0,
    boxStroke: 0xbaa896,
    label: '#666666',
    scoreText: '#d84315',
    highText: '#222222',
    nameText: '#bf360c',
    btnBg: '#ffffff',
    btnText: '#222222',
    btnLabel: ' ☀️ LIGHT ',
    wheelStroke: 0xc4b3a3,
  },
};

export class UiManager {
  public uiElements: UiElementCollection;

  constructor(scene: Phaser.Scene, model: GameModelClass) {
    this.uiElements = {} as UiElementCollection;

    this.uiElements.bgContainer = scene.add.graphics().setDepth(-3);
    this.uiElements.boardBg = scene.textures.exists('set_background')
      ? scene.add
        .image(boardX + BOARD_WIDTH / 2, boardY + BOARD_HEIGHT / 2, 'set_background')
        .setDisplaySize(BOARD_WIDTH, BOARD_HEIGHT)
        .setDepth(-2)
      : null;
    this.uiElements.uiBg = scene.add.graphics().setDepth(-2);

    const fontS = `${11 * SCALE}px`;
    const fontM = `${13 * SCALE}px`;
    const fontL = `${17 * SCALE}px`;
    const createButton = (text: string, onClick: () => void) =>
      scene.add
        .text(0, 0, text, { fontSize: fontS, fontStyle: 'bold' })
        .setPadding(8 * SCALE, 5 * SCALE)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', (pointer: any, localX: any, localY: any, event: Event) => {
          if (event) event.stopPropagation();
          onClick();
        });

    this.uiElements.homeBtnText = createButton('', () => {
      window.location.href = 'index.html';
    });
    this.uiElements.themeBtnText = createButton('', () => {
      model.isDarkMode = !model.isDarkMode;
      this.applyTheme(scene, model);
    });
    this.uiElements.soundBtnText = createButton(' 🔊 SON ', () => {
      model.isMuted = !model.isMuted;
      scene.sound.mute = model.isMuted;
      const soundLabel = isMobilePortrait ? (model.isMuted ? ' 🔇 ' : ' 🔊 ') : model.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
      this.uiElements.soundBtnText.setText(soundLabel);
    });

    this.uiElements.leaderBox = scene.add.graphics();
    this.uiElements.nextBox = scene.add.graphics();
    this.uiElements.wheelGraphics = scene.add.graphics();
    this.uiElements.leaderLabel = scene.add.text(0, 0, 'TOP 3', {
      fontFamily: 'monospace',
      fontSize: `${12 * SCALE}px`,
      fontStyle: 'bold',
    });
    this.uiElements.topScoresTexts = [1, 2, 3].map((num) =>
      scene.add.text(0, 0, `${num}. ---`, { fontFamily: 'monospace', fontSize: `${11 * SCALE}px` }),
    );
    this.uiElements.nextLabel = scene.add.text(0, 0, 'SUIVANTE', { fontSize: fontS, fontStyle: 'bold' });
    this.uiElements.scoreLabel = scene.add.text(0, 0, 'SCORE', { fontSize: fontS, fontStyle: 'bold' });
    this.uiElements.scoreText = scene.add.text(0, 0, '0', { fontSize: fontL, fontStyle: 'bold' });
    this.uiElements.highLabel = scene.add.text(0, 0, 'RECORD', { fontSize: fontS, fontStyle: 'bold' });
    this.uiElements.highScoreText = scene.add.text(0, 0, `${model.highScore}`, { fontSize: fontM });
    this.uiElements.sausNameText = scene.add
      .text(0, 0, '', { fontSize: fontS, fontStyle: 'bold' })
      .setWordWrapWidth(110 * SCALE);
    this.uiElements.wheelLabel = scene.add.text(0, 0, 'ÉVOLUTION', { fontSize: fontS, fontStyle: 'bold' });
    this.uiElements.timerText = scene.add.text(0, 0, '00:00', { fontSize: fontM, fontStyle: 'bold' });

    this.positionUIElements(model);
  }

  get elements() {
    return this.uiElements;
  }

  getWheelCenter() {
    if (isMobilePortrait) {
      return {
        x: BOARD_WIDTH / 2 + 75 * SCALE,
        y: boardY + BOARD_HEIGHT + 70 * SCALE,
        radius: 40 * SCALE,
      };
    }
    return {
      x: BOARD_WIDTH + 70 * SCALE,
      y: 490 * SCALE,
      radius: 52 * SCALE,
    };
  }

  getNextPreviewPos() {
    return isMobilePortrait
      ? { x: BOARD_WIDTH - 60 * SCALE, y: 80 * SCALE }
      : { x: BOARD_WIDTH + 70 * SCALE, y: 212 * SCALE };
  }

  positionUIElements(model: GameModelClass) {
    if (isMobilePortrait) {
      this.uiElements.homeBtnText.setText(' 🏠 ').setPosition(5 * SCALE, 6 * SCALE);

      const themeLabel = model.isDarkMode ? ' 🌙 ' : ' ☀️ ';
      this.uiElements.themeBtnText.setText(themeLabel).setPosition(55 * SCALE, 6 * SCALE);

      const soundLabel = model.isMuted ? ' 🔇 ' : ' 🔊 ';
      this.uiElements.soundBtnText.setText(soundLabel).setPosition(105 * SCALE, 6 * SCALE);

      const rightX = BOARD_WIDTH - 10;
      this.uiElements.timerText.setPosition(rightX - this.uiElements.timerText.width - 10 * SCALE, 10 * SCALE);

      this.uiElements.leaderLabel.setPosition(10 * SCALE, 45 * SCALE);
      this.uiElements.topScoresTexts.forEach((txt, i) => txt?.setPosition(10 * SCALE, (62 + i * 15) * SCALE));

      this.uiElements.nextLabel.setPosition(BOARD_WIDTH - 110 * SCALE, 45 * SCALE);

      const bottomY = boardY + BOARD_HEIGHT;
      this.uiElements.scoreLabel.setPosition(15 * SCALE, bottomY + 15 * SCALE);
      this.uiElements.scoreText.setPosition(15 * SCALE, bottomY + 30 * SCALE);
      this.uiElements.highLabel.setPosition(100 * SCALE, bottomY + 15 * SCALE);
      this.uiElements.highScoreText.setPosition(100 * SCALE, bottomY + 30 * SCALE);
      this.uiElements.sausNameText.setPosition(15 * SCALE, bottomY + 60 * SCALE);

      this.uiElements.wheelLabel.setPosition(BOARD_WIDTH / 2 + 10 * SCALE, bottomY + 15 * SCALE);
    } else {
      const uiX = BOARD_WIDTH + 15 * SCALE;

      this.uiElements.homeBtnText.setText(' 🏠 MENU ').setPosition(10 * SCALE, 8 * SCALE);
      this.uiElements.timerText.setPosition(BOARD_WIDTH - this.uiElements.timerText.width - 10 * SCALE, 12.5 * SCALE);

      const themeLabel = model.isDarkMode ? ' 🌙 DARK ' : ' ☀️ LIGHT ';
      this.uiElements.themeBtnText.setText(themeLabel).setPosition(uiX, 12 * SCALE);

      const soundLabel = model.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
      this.uiElements.soundBtnText.setText(soundLabel).setPosition(uiX, 42 * SCALE);

      this.uiElements.leaderLabel.setPosition(uiX, 75 * SCALE);
      this.uiElements.topScoresTexts.forEach((txt, i) => txt?.setPosition(uiX, (92 + i * 15) * SCALE));

      this.uiElements.nextLabel.setPosition(uiX, 150 * SCALE);

      this.uiElements.scoreLabel.setPosition(uiX, 275 * SCALE);
      this.uiElements.scoreText.setPosition(uiX, 290 * SCALE);
      this.uiElements.highLabel.setPosition(uiX, 325 * SCALE);
      this.uiElements.highScoreText.setPosition(uiX, 340 * SCALE);
      this.uiElements.sausNameText.setPosition(uiX, 375 * SCALE);

      this.uiElements.wheelLabel.setPosition(uiX, 415 * SCALE);
    }
  }

  drawWheelGraphics(colors: typeof THEMES.dark) {
    const { x: centerX, y: centerY, radius: wheelRadius } = this.getWheelCenter();

    this.uiElements.wheelGraphics.clear();
    this.uiElements.wheelGraphics.lineStyle(1.5 * SCALE, colors.wheelStroke, 0.8);
    this.uiElements.wheelGraphics.strokeCircle(centerX, centerY, wheelRadius);

    const arrowRadius = wheelRadius + 10 * SCALE;
    const startAngle = -Math.PI / 3;
    const endAngle = Math.PI / 4;

    this.uiElements.wheelGraphics.lineStyle(2 * SCALE, colors.boxStroke, 1);
    this.uiElements.wheelGraphics.beginPath();
    this.uiElements.wheelGraphics.arc(centerX, centerY, arrowRadius, startAngle, endAngle, false);
    this.uiElements.wheelGraphics.strokePath();

    const tipX = centerX + Math.cos(endAngle) * arrowRadius;
    const tipY = centerY + Math.sin(endAngle) * arrowRadius;
    const arrowHeadSize = 5 * SCALE;
    const tangentAngle = endAngle + Math.PI / 2;

    this.uiElements.wheelGraphics.fillStyle(colors.boxStroke, 1);
    this.uiElements.wheelGraphics.beginPath();
    this.uiElements.wheelGraphics.moveTo(tipX, tipY);
    this.uiElements.wheelGraphics.lineTo(
      tipX - arrowHeadSize * Math.cos(tangentAngle - Math.PI / 6),
      tipY - arrowHeadSize * Math.sin(tangentAngle - Math.PI / 6),
    );
    this.uiElements.wheelGraphics.lineTo(
      tipX - arrowHeadSize * Math.cos(tangentAngle + Math.PI / 6),
      tipY - arrowHeadSize * Math.sin(tangentAngle + Math.PI / 6),
    );
    this.uiElements.wheelGraphics.closePath();
    this.uiElements.wheelGraphics.fillPath();
  }

  applyTheme(scene: Phaser.Scene, model: GameModelClass) {
    document.body.classList.toggle('light-theme', !model.isDarkMode);
    const colors = model.isDarkMode ? THEMES.dark : THEMES.light;

    if (!this.uiElements.bgContainer || !this.uiElements.uiBg) return;

    this.uiElements.bgContainer.clear();
    this.uiElements.uiBg.clear();
    this.uiElements.bgContainer.fillStyle(colors.uiBg, 1).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.uiElements.boardBg && scene.textures.exists('set_background')) {
      const tintColor = model.isDarkMode ? 0x999999 : 0xffffff;
      this.uiElements.boardBg.setTint(tintColor);

      const overlayColor = model.isDarkMode ? 0x000000 : 0xffffff;
      const overlayAlpha = model.isDarkMode ? 0.5 : 0.2;
      this.uiElements.uiBg.fillStyle(overlayColor, overlayAlpha).fillRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);
    } else {
      this.uiElements.uiBg.fillStyle(colors.bgBoard, 1).fillRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);
    }

    this.uiElements.uiBg.lineStyle(3 * SCALE, colors.border, 1).strokeRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);

    if (!this.uiElements.leaderBox || !this.uiElements.nextBox) return;

    this.uiElements.leaderBox.clear().lineStyle(1.5 * SCALE, colors.boxStroke, 1);
    this.uiElements.nextBox.clear().lineStyle(2 * SCALE, colors.boxStroke, 1);

    if (isMobilePortrait) {
      this.uiElements.leaderBox.strokeRoundedRect(5 * SCALE, 40 * SCALE, 160 * SCALE, 65 * SCALE, 6 * SCALE);
      this.uiElements.nextBox.strokeRoundedRect(BOARD_WIDTH - 115 * SCALE, 40 * SCALE, 100 * SCALE, 80 * SCALE, 8 * SCALE);
    } else {
      this.uiElements.leaderBox.strokeRoundedRect(BOARD_WIDTH + 10 * SCALE, 68 * SCALE, 120 * SCALE, 70 * SCALE, 6 * SCALE);
      this.uiElements.nextBox.strokeRoundedRect(BOARD_WIDTH + 20 * SCALE, 168 * SCALE, 100 * SCALE, 90 * SCALE, 8 * SCALE);
    }

    this.drawWheelGraphics(colors);

    if (this.uiElements.leaderLabel) this.uiElements.leaderLabel.setColor(colors.scoreText);
    this.uiElements.topScoresTexts.forEach((t) => t.setColor(colors.btnText));

    if (this.uiElements.homeBtnText) {
      this.uiElements.homeBtnText.setColor(colors.btnText).setBackgroundColor(colors.btnBg);
    }

    [this.uiElements.nextLabel, this.uiElements.scoreLabel, this.uiElements.highLabel, this.uiElements.wheelLabel].forEach((label) =>
      label?.setColor(colors.label),
    );

    if (this.uiElements.scoreText) this.uiElements.scoreText.setColor(colors.scoreText);
    if (this.uiElements.highScoreText) this.uiElements.highScoreText.setColor(colors.highText);
    if (this.uiElements.sausNameText) this.uiElements.sausNameText.setColor(colors.nameText);

    if (this.uiElements.themeBtnText) {
      const themeLabel = isMobilePortrait ? (model.isDarkMode ? ' 🌙 ' : ' ☀️ ') : colors.btnLabel;
      this.uiElements.themeBtnText.setText(themeLabel).setColor(colors.btnText).setBackgroundColor(colors.btnBg);
    }

    if (this.uiElements.soundBtnText) {
      const soundLabel = isMobilePortrait ? (model.isMuted ? ' 🔇 ' : ' 🔊 ') : model.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
      this.uiElements.soundBtnText.setText(soundLabel).setColor(colors.btnText).setBackgroundColor(colors.btnBg);
    }
  }

  renderLeaderboard(data: Array<{ name: string; score: number }> = []) {
    this.uiElements.topScoresTexts.forEach((textObj, index) => {
      const entry = data?.[index];
      if (entry) {
        const name = entry.name.length > 10 ? `${entry.name.substring(0, 8)}..` : entry.name;
        textObj.setText(`${index + 1}. ${name} (${entry.score})`);
      } else {
        textObj.setText(`${index + 1}. ---`);
      }
    });
  }

  updateTimerDisplay(model: GameModelClass, seconds = model.elapsedTime) {
    if (this.uiElements.timerText) {
      this.uiElements.timerText.setText(formatTime(seconds));
    }
  }

  renderContinuePrompt(
    scene: Phaser.Scene,
    { onContinue, onNewGame }: { onContinue: () => void; onNewGame: () => void },
  ) {
    const overlay = scene.add.graphics().setDepth(2000);
    overlay.fillStyle(0x000000, 0.72).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const centerX = CANVAS_WIDTH / 2;
    const centerY = isMobilePortrait ? boardY + BOARD_HEIGHT / 2 : CANVAS_HEIGHT / 2;
    const title = scene.add
      .text(centerX, centerY - 75 * SCALE, 'PARTIE EN COURS', {
        fontSize: `${22 * SCALE}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2001);

    const subtitle = scene.add
      .text(centerX, centerY - 35 * SCALE, 'Voulez-vous continuer ?', {
        fontSize: `${13 * SCALE}px`,
        color: '#cccccc',
      })
      .setOrigin(0.5)
      .setDepth(2001);

    const createChoice = (label: string, x: number, callback: () => void, color: string) =>
      scene.add
        .text(x, centerY + 35 * SCALE, label, {
          fontSize: `${14 * SCALE}px`,
          fontStyle: 'bold',
          color: '#181412',
          backgroundColor: color,
          padding: { x: 14 * SCALE, y: 8 * SCALE },
        })
        .setOrigin(0.5)
        .setDepth(2001)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', callback);

    let continueButton: Phaser.GameObjects.Text;
    let newGameButton: Phaser.GameObjects.Text;
    const cleanup = () => {
      overlay.destroy();
      title.destroy();
      subtitle.destroy();
      continueButton.destroy();
      newGameButton.destroy();
    };

    continueButton = createChoice('CONTINUER', centerX - 80 * SCALE, () => {
      cleanup();
      onContinue();
    }, '#ffca28');

    newGameButton = createChoice('NOUVELLE PARTIE', centerX + 60 * SCALE, () => {
      cleanup();
      onNewGame();
    }, '#ffffff');
  }

  renderGameOver(
    scene: Phaser.Scene,
    model: GameModelClass,
    { onSubmitScore, onRestart }: { onSubmitScore: (playerName: string, score: number) => Promise<void>; onRestart: () => void },
  ) {
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    overlay.setDepth(1000);

    const centerX = CANVAS_WIDTH / 2;
    const gameOverOffsetY = isMobilePortrait ? boardY + 200 : 0;
    scene.add
      .text(centerX, gameOverOffsetY + 50 * SCALE, 'GAME OVER', {
        fontSize: `${28 * SCALE}px`,
        color: '#ff4444',
        fontStyle: 'bold',
      })
      .setDepth(1001)
      .setOrigin(0.5);

    scene.add
      .text(centerX, gameOverOffsetY + 90 * SCALE, `Score: ${model.score}`, {
        fontSize: `${20 * SCALE}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setDepth(1001)
      .setOrigin(0.5);

    let playerPseudo = (localStorage.getItem('sausage_player_name') || 'JOUEUR').substring(0, 10).toUpperCase();
    const statusText = scene.add
      .text(centerX, gameOverOffsetY + 185 * SCALE, '', { fontSize: `${11 * SCALE}px`, color: '#aaa' })
      .setDepth(1001)
      .setOrigin(0.5);
    const pseudoDisplay = scene.add
      .text(centerX, gameOverOffsetY + 155 * SCALE, `${playerPseudo}_`, {
        fontSize: `${20 * SCALE}px`,
        color: '#ffca28',
        fontStyle: 'bold',
        backgroundColor: '#222222',
        padding: { x: 15 * SCALE, y: 5 * SCALE },
      })
      .setDepth(1001)
      .setOrigin(0.5);

    scene.add
      .text(centerX, gameOverOffsetY + 130 * SCALE, 'VOTRE PSEUDO:', {
        fontSize: `${11 * SCALE}px`,
        color: '#888888',
      })
      .setDepth(1001)
      .setOrigin(0.5);

    const keyboardKeys = [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
      ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
      ['V', 'W', 'X', 'Y', 'Z', '⌫'],
    ];
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
        const x = startX + colIndex * (keyWidth + gap) + keyWidth / 2;
        const y = gameOverOffsetY + 220 * SCALE + rowIndex * (keyHeight + gap) + keyHeight / 2;
        const keyButton = scene.add
          .text(x, y, char, {
            fontSize: `${13 * SCALE}px`,
            fontStyle: 'bold',
            color: char === '⌫' ? '#ff6b6b' : '#ffffff',
            backgroundColor: '#333333',
            fixedWidth: keyWidth,
            fixedHeight: keyHeight,
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(1001)
          .setInteractive({ useHandCursor: true });

        keyButton.on('pointerdown', () => {
          if (char === '⌫') {
            playerPseudo = playerPseudo.slice(0, -1);
          } else if (playerPseudo.length < 10) {
            playerPseudo += char;
          }
          updatePseudoDisplay();
        });
      });
    });

    const sendButton = scene.add
      .text(centerX, gameOverOffsetY + 380 * SCALE, ' ENVOYER MON SCORE ', {
        fontSize: `${15 * SCALE}px`,
        fontStyle: 'bold',
        color: '#181412',
        backgroundColor: '#ffca28',
        padding: { x: 15 * SCALE, y: 8 * SCALE },
      })
      .setOrigin(0.5)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });

    let isSubmitting = false;
    sendButton.on('pointerdown', async () => {
      if (isSubmitting) return;
      if (!playerPseudo.trim()) {
        statusText.setColor('#ff6b6b').setText('Veuillez entrer un pseudo !');
        return;
      }

      isSubmitting = true;
      sendButton.setAlpha(0.5);
      statusText.setColor('#aaa').setText('Envoi du score...');
      try {
        await onSubmitScore(playerPseudo, model.score);
        localStorage.setItem('sausage_player_name', playerPseudo);
        statusText.setColor('#51cf66').setText('Score envoyé avec succès !');
      } catch (error) {
        console.error(error);
        statusText.setColor('#ff6b6b').setText("Erreur lors de l'envoi");
        isSubmitting = false;
        sendButton.setAlpha(1);
      }
    });

    scene.add
      .text(centerX, gameOverOffsetY + 435 * SCALE, ' 🔄 REJOUER ', {
        fontSize: `${15 * SCALE}px`,
        color: '#ffffff',
        backgroundColor: '#444444',
        padding: { x: 15 * SCALE, y: 8 * SCALE },
      })
      .setOrigin(0.5)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onRestart);
  }
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
