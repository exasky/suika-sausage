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

export let uiElements = {};

// --- CONFIGURATION DES THÈMES ---
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

// --- GETTERS DE POSITIONNEMENT ---
export function getWheelCenter() {
  if (isMobilePortrait) {
    return {
      x: BOARD_WIDTH / 2 + 75 * SCALE,
      y: boardY + BOARD_HEIGHT + 70 * SCALE,
      radius: 35 * SCALE,
    };
  }
  return {
    x: BOARD_WIDTH + 70 * SCALE,
    y: 490 * SCALE,
    radius: 42 * SCALE,
  };
}

export function getNextPreviewPos() {
  return isMobilePortrait
    ? { x: BOARD_WIDTH - 60 * SCALE, y: 80 * SCALE }
    : { x: BOARD_WIDTH + 70 * SCALE, y: 212 * SCALE };
}

// --- POSITIONNEMENT DYNAMIQUE DE L'UI ---
export function positionUIElements(model) {
  if (isMobilePortrait) {
    // Top Bar compacte
    if (uiElements.homeBtnText) uiElements.homeBtnText.setText(' 🏠 ').setPosition(5 * SCALE, 6 * SCALE);

    const themeLabel = model.isDarkMode ? ' 🌙 ' : ' ☀️ ';
    if (uiElements.themeBtnText) uiElements.themeBtnText.setText(themeLabel).setPosition(55 * SCALE, 6 * SCALE);

    const soundLabel = model.isMuted ? ' 🔇 ' : ' 🔊 ';
    if (uiElements.soundBtnText) uiElements.soundBtnText.setText(soundLabel).setPosition(105 * SCALE, 6 * SCALE);

    const rightX = BOARD_WIDTH - 10;
    if (uiElements.timerText) {
      uiElements.timerText.setPosition(rightX - uiElements.timerText.width - 10 * SCALE, 10 * SCALE);
    }

    // Leaderboard & Suivante
    if (uiElements.leaderLabel) uiElements.leaderLabel.setPosition(10 * SCALE, 45 * SCALE);
    uiElements.topScoresTexts.forEach((txt, i) => txt?.setPosition(10 * SCALE, (62 + i * 15) * SCALE));

    if (uiElements.nextLabel) uiElements.nextLabel.setPosition(BOARD_WIDTH - 110 * SCALE, 45 * SCALE);

    // Bottom Stats
    const bottomY = boardY + BOARD_HEIGHT;
    if (uiElements.scoreLabel) uiElements.scoreLabel.setPosition(15 * SCALE, bottomY + 15 * SCALE);
    if (uiElements.scoreText) uiElements.scoreText.setPosition(15 * SCALE, bottomY + 30 * SCALE);
    if (uiElements.highLabel) uiElements.highLabel.setPosition(100 * SCALE, bottomY + 15 * SCALE);
    if (uiElements.highScoreText) uiElements.highScoreText.setPosition(100 * SCALE, bottomY + 30 * SCALE);
    if (uiElements.sausNameText) uiElements.sausNameText.setPosition(15 * SCALE, bottomY + 60 * SCALE);

    if (uiElements.wheelLabel) {
      uiElements.wheelLabel.setPosition(BOARD_WIDTH / 2 + 10 * SCALE, bottomY + 15 * SCALE);
    }
  } else {
    // Mode Desktop
    const uiX = BOARD_WIDTH + 15 * SCALE;

    if (uiElements.homeBtnText) uiElements.homeBtnText.setText(' 🏠 MENU ').setPosition(10 * SCALE, 8 * SCALE);
    if (uiElements.timerText) {
      uiElements.timerText.setPosition(BOARD_WIDTH - uiElements.timerText.width - 10 * SCALE, 12.5 * SCALE);
    }

    const themeLabel = model.isDarkMode ? ' 🌙 DARK ' : ' ☀️ LIGHT ';
    if (uiElements.themeBtnText) uiElements.themeBtnText.setText(themeLabel).setPosition(uiX, 12 * SCALE);

    const soundLabel = model.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
    if (uiElements.soundBtnText) uiElements.soundBtnText.setText(soundLabel).setPosition(uiX, 42 * SCALE);

    if (uiElements.leaderLabel) uiElements.leaderLabel.setPosition(uiX, 75 * SCALE);
    uiElements.topScoresTexts.forEach((txt, i) => txt?.setPosition(uiX, (92 + i * 15) * SCALE));

    if (uiElements.nextLabel) uiElements.nextLabel.setPosition(uiX, 150 * SCALE);

    if (uiElements.scoreLabel) uiElements.scoreLabel.setPosition(uiX, 275 * SCALE);
    if (uiElements.scoreText) uiElements.scoreText.setPosition(uiX, 290 * SCALE);
    if (uiElements.highLabel) uiElements.highLabel.setPosition(uiX, 325 * SCALE);
    if (uiElements.highScoreText) uiElements.highScoreText.setPosition(uiX, 340 * SCALE);
    if (uiElements.sausNameText) uiElements.sausNameText.setPosition(uiX, 375 * SCALE);

    if (uiElements.wheelLabel) uiElements.wheelLabel.setPosition(uiX, 415 * SCALE);
  }
}

// --- CREATION DE L'UI ---
export function createUI(scene, model) {
  // Arrière-plans
  uiElements.bgContainer = scene.add.graphics().setDepth(-3);

  if (scene.textures.exists('set_background')) {
    uiElements.boardBg = scene.add
      .image(boardX + BOARD_WIDTH / 2, boardY + BOARD_HEIGHT / 2, 'set_background')
      .setDisplaySize(BOARD_WIDTH, BOARD_HEIGHT)
      .setDepth(-2);
  }

  uiElements.uiBg = scene.add.graphics().setDepth(-2);

  // Styles de polices
  const fontS = `${11 * SCALE}px`;
  const fontM = `${13 * SCALE}px`;
  const fontL = `${17 * SCALE}px`;

  // Helper pour les boutons
  const createButton = (text, onClick) => {
    return scene.add
      .text(0, 0, text, { fontSize: fontS, fontStyle: 'bold' })
      .setPadding(8 * SCALE, 5 * SCALE)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer, localX, localY, event) => {
        if (event) event.stopPropagation();
        onClick();
      });
  };

  // Boutons d'action
  uiElements.homeBtnText = createButton('', () => {
    window.location.href = 'index.html';
  });

  uiElements.themeBtnText = createButton('', () => {
    model.isDarkMode = !model.isDarkMode;
    applyTheme(scene, model);
  });

  uiElements.soundBtnText = createButton(' 🔊 SON ', () => {
    model.isMuted = !model.isMuted;
    scene.sound.mute = model.isMuted;
    const soundLabel = isMobilePortrait ? (model.isMuted ? ' 🔇 ' : ' 🔊 ') : model.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
    uiElements.soundBtnText.setText(soundLabel);
  });

  // Conteneurs graphiques
  uiElements.leaderBox = scene.add.graphics();
  uiElements.nextBox = scene.add.graphics();
  uiElements.wheelGraphics = scene.add.graphics();

  // Labels et Scores
  uiElements.leaderLabel = scene.add.text(0, 0, 'TOP 3', {
    fontFamily: 'monospace',
    fontSize: `${12 * SCALE}px`,
    fontStyle: 'bold',
  });

  uiElements.topScoresTexts = [1, 2, 3].map((num) =>
    scene.add.text(0, 0, `${num}. ---`, { fontFamily: 'monospace', fontSize: `${11 * SCALE}px` }),
  );

  uiElements.nextLabel = scene.add.text(0, 0, 'SUIVANTE', { fontSize: fontS, fontStyle: 'bold' });
  uiElements.scoreLabel = scene.add.text(0, 0, 'SCORE', { fontSize: fontS, fontStyle: 'bold' });
  uiElements.scoreText = scene.add.text(0, 0, '0', { fontSize: fontL, fontStyle: 'bold' });
  uiElements.highLabel = scene.add.text(0, 0, 'RECORD', { fontSize: fontS, fontStyle: 'bold' });
  uiElements.highScoreText = scene.add.text(0, 0, model.highScore, { fontSize: fontM });
  uiElements.sausNameText = scene.add
    .text(0, 0, '', { fontSize: fontS, fontStyle: 'bold' })
    .setWordWrapWidth(110 * SCALE);
  uiElements.wheelLabel = scene.add.text(0, 0, 'ÉVOLUTION', { fontSize: fontS, fontStyle: 'bold' });

  uiElements.timerText = scene.add.text(0, 0, '00:00', { fontSize: fontM, fontStyle: 'bold' });

  positionUIElements(model);
}

// --- DESSIN DU CERCLE D'ÉVOLUTION ---
function drawWheelGraphics(colors) {
  const { x: centerX, y: centerY, radius: wheelRadius } = getWheelCenter();

  uiElements.wheelGraphics.clear();
  uiElements.wheelGraphics.lineStyle(1.5 * SCALE, colors.wheelStroke, 0.8);
  uiElements.wheelGraphics.strokeCircle(centerX, centerY, wheelRadius);

  const arrowRadius = wheelRadius + 10 * SCALE;
  const startAngle = -Math.PI / 3;
  const endAngle = Math.PI / 4;

  uiElements.wheelGraphics.lineStyle(2 * SCALE, colors.boxStroke, 1);
  uiElements.wheelGraphics.beginPath();
  uiElements.wheelGraphics.arc(centerX, centerY, arrowRadius, startAngle, endAngle, false);
  uiElements.wheelGraphics.strokePath();

  // Tête de la flèche
  const tipX = centerX + Math.cos(endAngle) * arrowRadius;
  const tipY = centerY + Math.sin(endAngle) * arrowRadius;
  const arrowHeadSize = 5 * SCALE;
  const tangentAngle = endAngle + Math.PI / 2;

  uiElements.wheelGraphics.fillStyle(colors.boxStroke, 1);
  uiElements.wheelGraphics.beginPath();
  uiElements.wheelGraphics.moveTo(tipX, tipY);
  uiElements.wheelGraphics.lineTo(
    tipX - arrowHeadSize * Math.cos(tangentAngle - Math.PI / 6),
    tipY - arrowHeadSize * Math.sin(tangentAngle - Math.PI / 6),
  );
  uiElements.wheelGraphics.lineTo(
    tipX - arrowHeadSize * Math.cos(tangentAngle + Math.PI / 6),
    tipY - arrowHeadSize * Math.sin(tangentAngle + Math.PI / 6),
  );
  uiElements.wheelGraphics.closePath();
  uiElements.wheelGraphics.fillPath();
}

// --- APPLICATION DU THÈME ---
export function applyTheme(scene, model) {
  document.body.classList.toggle('light-theme', !model.isDarkMode);
  const colors = model.isDarkMode ? THEMES.dark : THEMES.light;

  // 1. Nettoyage des graphics
  uiElements.bgContainer.clear();
  uiElements.uiBg.clear();

  // 2. Fond global du Canvas (autour de la zone de jeu)
  uiElements.bgContainer.fillStyle(colors.uiBg, 1).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 3. Gestion de l'aire de jeu (Board)
  if (uiElements.boardBg && scene.textures.exists('set_background')) {
    // Si l'image existe, on lui applique une teinte selon le mode (ou rien en Light)
    // Dark mode : assombrit l'image / Light mode : couleur d'origine (0xffffff)
    const tintColor = model.isDarkMode ? 0x999999 : 0xffffff;
    uiElements.boardBg.setTint(tintColor);

    // Voile optionnel sur l'aire de jeu pour ajuster le contraste
    const overlayColor = model.isDarkMode ? 0x000000 : 0xffffff;
    const overlayAlpha = model.isDarkMode ? 0.5 : 0.2;
    uiElements.uiBg.fillStyle(overlayColor, overlayAlpha).fillRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);
  } else {
    // Fallback sans image : couleur unie
    uiElements.uiBg.fillStyle(colors.bgBoard, 1).fillRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);
  }

  // 4. Contour du plateau de jeu
  uiElements.uiBg.lineStyle(3 * SCALE, colors.border, 1).strokeRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);

  // Cadres Leaderboard et Suivante
  uiElements.leaderBox.clear().lineStyle(1.5 * SCALE, colors.boxStroke, 1);
  uiElements.nextBox.clear().lineStyle(2 * SCALE, colors.boxStroke, 1);

  if (isMobilePortrait) {
    uiElements.leaderBox.strokeRoundedRect(5 * SCALE, 40 * SCALE, 160 * SCALE, 65 * SCALE, 6 * SCALE);
    uiElements.nextBox.strokeRoundedRect(BOARD_WIDTH - 115 * SCALE, 40 * SCALE, 100 * SCALE, 80 * SCALE, 8 * SCALE);
  } else {
    uiElements.leaderBox.strokeRoundedRect(BOARD_WIDTH + 10 * SCALE, 68 * SCALE, 120 * SCALE, 70 * SCALE, 6 * SCALE);
    uiElements.nextBox.strokeRoundedRect(BOARD_WIDTH + 20 * SCALE, 168 * SCALE, 100 * SCALE, 90 * SCALE, 8 * SCALE);
  }

  // Graphiques Roue
  drawWheelGraphics(colors);

  // Couleurs des textes
  uiElements.leaderLabel.setColor(colors.scoreText);
  uiElements.topScoresTexts.forEach((t) => t.setColor(colors.btnText));

  if (uiElements.homeBtnText) {
    uiElements.homeBtnText.setColor(colors.btnText).setBackgroundColor(colors.btnBg);
  }

  [uiElements.nextLabel, uiElements.scoreLabel, uiElements.highLabel, uiElements.wheelLabel].forEach((label) =>
    label?.setColor(colors.label),
  );

  uiElements.scoreText.setColor(colors.scoreText);
  uiElements.highScoreText.setColor(colors.highText);
  uiElements.sausNameText.setColor(colors.nameText);

  // Labels boutons dynamique
  if (uiElements.themeBtnText) {
    const themeLabel = isMobilePortrait ? (model.isDarkMode ? ' 🌙 ' : ' ☀️ ') : colors.btnLabel;
    uiElements.themeBtnText.setText(themeLabel).setColor(colors.btnText).setBackgroundColor(colors.btnBg);
  }

  if (uiElements.soundBtnText) {
    const soundLabel = isMobilePortrait ? (model.isMuted ? ' 🔇 ' : ' 🔊 ') : model.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
    uiElements.soundBtnText.setText(soundLabel).setColor(colors.btnText).setBackgroundColor(colors.btnBg);
  }
}

// --- APPEL API LEADERBOARD ---
export function renderLeaderboard(data = []) {
  uiElements.topScoresTexts.forEach((textObj, index) => {
    const entry = data?.[index];
    if (entry) {
      const name = entry.name.length > 10 ? `${entry.name.substring(0, 8)}..` : entry.name;
      textObj.setText(`${index + 1}. ${name} (${entry.score})`);
    } else {
      textObj.setText(`${index + 1}. ---`);
    }
  });
}

export function updateTimerDisplay(model, seconds = model.elapsedTime) {
  if (uiElements.timerText) {
    uiElements.timerText.setText(formatTime(seconds));
  }
}

/**
 *
 * @param {Phaser.Scene} scene
 * @param {*} model
 * @param {*} param2
 */
export function renderGameOver(scene, model, { onSubmitScore, onRestart }) {
  const overlay = scene.add.graphics();
  overlay.fillStyle(0x000000, 0.88);
  overlay.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  overlay.setDepth(1000);

  const centerX = CANVAS_WIDTH / 2;
  scene.add
    .text(centerX, 50 * SCALE, 'GAME OVER', {
      fontSize: `${28 * SCALE}px`,
      fill: '#ff4444',
      fontStyle: 'bold',
    })
    .setDepth(1001)
    .setOrigin(0.5);

  scene.add
    .text(centerX, 90 * SCALE, `Score: ${model.score}`, {
      fontSize: `${20 * SCALE}px`,
      fill: '#ffffff',
      fontStyle: 'bold',
    })
    .setDepth(1001)
    .setOrigin(0.5);

  let playerPseudo = (localStorage.getItem('sausage_player_name') || 'JOUEUR').substring(0, 10).toUpperCase();
  const statusText = scene.add
    .text(centerX, 185 * SCALE, '', { fontSize: `${11 * SCALE}px`, fill: '#aaa' })
    .setDepth(1001)
    .setOrigin(0.5);
  const pseudoDisplay = scene.add
    .text(centerX, 155 * SCALE, `${playerPseudo}_`, {
      fontSize: `${20 * SCALE}px`,
      fill: '#ffca28',
      fontStyle: 'bold',
      backgroundColor: '#222222',
      padding: { x: 15 * SCALE, y: 5 * SCALE },
    })
    .setDepth(1001)
    .setOrigin(0.5);

  scene.add
    .text(centerX, 130 * SCALE, 'VOTRE PSEUDO:', {
      fontSize: `${11 * SCALE}px`,
      fill: '#888888',
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
      const y = 220 * SCALE + rowIndex * (keyHeight + gap) + keyHeight / 2;
      const keyButton = scene.add
        .text(x, y, char, {
          fontSize: `${13 * SCALE}px`,
          fontStyle: 'bold',
          fill: char === '⌫' ? '#ff6b6b' : '#ffffff',
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
    .text(centerX, 380 * SCALE, ' ENVOYER MON SCORE ', {
      fontSize: `${15 * SCALE}px`,
      fontStyle: 'bold',
      fill: '#181412',
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
    .text(centerX, 435 * SCALE, ' 🔄 REJOUER ', {
      fontSize: `${15 * SCALE}px`,
      fill: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 15 * SCALE, y: 8 * SCALE },
    })
    .setOrigin(0.5)
    .setDepth(1001)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', onRestart);
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
