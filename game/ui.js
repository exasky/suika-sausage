import { supabaseClient } from '../shared/supabaseClient.js';
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
import { getLeaderboardTable } from './sets.js';
import { state } from './state.js';

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
export function positionUIElements() {
  if (isMobilePortrait) {
    // Top Bar compacte
    if (uiElements.homeBtnText) uiElements.homeBtnText.setText(' 🏠 ').setPosition(5 * SCALE, 6 * SCALE);

    const themeLabel = state.isDarkMode ? ' 🌙 ' : ' ☀️ ';
    if (uiElements.themeBtnText) uiElements.themeBtnText.setText(themeLabel).setPosition(55 * SCALE, 6 * SCALE);

    const soundLabel = state.isMuted ? ' 🔇 ' : ' 🔊 ';
    if (uiElements.soundBtnText) uiElements.soundBtnText.setText(soundLabel).setPosition(105 * SCALE, 6 * SCALE);

    const rightX = BOARD_WIDTH - 10;
    if (uiElements.timerText) {
      uiElements.timerText.setPosition(rightX - uiElements.timerText.width - 10 * SCALE, 10 * SCALE);
    }

    // Leaderboard & Suivante
    if (uiElements.leaderLabel) uiElements.leaderLabel.setPosition(10 * SCALE, 45 * SCALE);
    state.topScoresTexts.forEach((txt, i) => txt?.setPosition(10 * SCALE, (62 + i * 15) * SCALE));

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

    const themeLabel = state.isDarkMode ? ' 🌙 DARK ' : ' ☀️ LIGHT ';
    if (uiElements.themeBtnText) uiElements.themeBtnText.setText(themeLabel).setPosition(uiX, 12 * SCALE);

    const soundLabel = state.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
    if (uiElements.soundBtnText) uiElements.soundBtnText.setText(soundLabel).setPosition(uiX, 42 * SCALE);

    if (uiElements.leaderLabel) uiElements.leaderLabel.setPosition(uiX, 75 * SCALE);
    state.topScoresTexts.forEach((txt, i) => txt?.setPosition(uiX, (92 + i * 15) * SCALE));

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
export function createUI(scene) {
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
    state.isDarkMode = !state.isDarkMode;
    applyTheme(scene);
  });

  uiElements.soundBtnText = createButton(' 🔊 SON ', () => {
    state.isMuted = !state.isMuted;
    scene.sound.mute = state.isMuted;
    const soundLabel = isMobilePortrait ? (state.isMuted ? ' 🔇 ' : ' 🔊 ') : state.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
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

  state.topScoresTexts = [1, 2, 3].map((num) =>
    scene.add.text(0, 0, `${num}. ---`, { fontFamily: 'monospace', fontSize: `${11 * SCALE}px` }),
  );

  uiElements.nextLabel = scene.add.text(0, 0, 'SUIVANTE', { fontSize: fontS, fontStyle: 'bold' });
  uiElements.scoreLabel = scene.add.text(0, 0, 'SCORE', { fontSize: fontS, fontStyle: 'bold' });
  uiElements.scoreText = scene.add.text(0, 0, '0', { fontSize: fontL, fontStyle: 'bold' });
  uiElements.highLabel = scene.add.text(0, 0, 'RECORD', { fontSize: fontS, fontStyle: 'bold' });
  uiElements.highScoreText = scene.add.text(0, 0, state.highScore, { fontSize: fontM });
  uiElements.sausNameText = scene.add
    .text(0, 0, '', { fontSize: fontS, fontStyle: 'bold' })
    .setWordWrapWidth(110 * SCALE);
  uiElements.wheelLabel = scene.add.text(0, 0, 'ÉVOLUTION', { fontSize: fontS, fontStyle: 'bold' });

  uiElements.timerText = scene.add.text(0, 0, '00:00', { fontSize: fontM, fontStyle: 'bold' });

  positionUIElements();
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
export function applyTheme(scene) {
  document.body.classList.toggle('light-theme', !state.isDarkMode);
  const colors = state.isDarkMode ? THEMES.dark : THEMES.light;

  // 1. Nettoyage des graphics
  uiElements.bgContainer.clear();
  uiElements.uiBg.clear();

  // 2. Fond global du Canvas (autour de la zone de jeu)
  uiElements.bgContainer.fillStyle(colors.uiBg, 1).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 3. Gestion de l'aire de jeu (Board)
  if (uiElements.boardBg && scene.textures.exists('set_background')) {
    // Si l'image existe, on lui applique une teinte selon le mode (ou rien en Light)
    // Dark mode : assombrit l'image / Light mode : couleur d'origine (0xffffff)
    const tintColor = state.isDarkMode ? 0x999999 : 0xffffff;
    uiElements.boardBg.setTint(tintColor);

    // Voile optionnel sur l'aire de jeu pour ajuster le contraste
    const overlayColor = state.isDarkMode ? 0x000000 : 0xffffff;
    const overlayAlpha = state.isDarkMode ? 0.5 : 0.2;
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
  state.topScoresTexts.forEach((t) => t.setColor(colors.btnText));

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
    const themeLabel = isMobilePortrait ? (state.isDarkMode ? ' 🌙 ' : ' ☀️ ') : colors.btnLabel;
    uiElements.themeBtnText.setText(themeLabel).setColor(colors.btnText).setBackgroundColor(colors.btnBg);
  }

  if (uiElements.soundBtnText) {
    const soundLabel = isMobilePortrait ? (state.isMuted ? ' 🔇 ' : ' 🔊 ') : state.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
    uiElements.soundBtnText.setText(soundLabel).setColor(colors.btnText).setBackgroundColor(colors.btnBg);
  }
}

// --- APPEL API LEADERBOARD ---
export async function fetchLeaderboard() {
  const table = getLeaderboardTable(state.currentSetKey);
  try {
    const { data, error } = await supabaseClient
      .from(table)
      .select('name, score')
      .order('score', { ascending: false })
      .limit(3);

    if (error) throw error;

    state.topScoresTexts.forEach((textObj, index) => {
      const entry = data?.[index];
      if (entry) {
        const name = entry.name.length > 10 ? `${entry.name.substring(0, 8)}..` : entry.name;
        textObj.setText(`${index + 1}. ${name} (${entry.score})`);
      } else {
        textObj.setText(`${index + 1}. ---`);
      }
    });
  } catch (e) {
    console.error('Erreur Supabase (Leaderboard) :', e.message || e);
  }
}

export function updateTimerDisplay() {
  if (uiElements.timerText) {
    uiElements.timerText.setText(formatTime(state.elapsedTime));
  }
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
