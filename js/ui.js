import { state } from './state.js';
import { getLeaderboardTable } from './sets.js';
import {
  SCALE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  boardX,
  boardY,
  isMobilePortrait,
  supabaseClient,
} from './config.js';

export let uiElements = {};

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
  if (isMobilePortrait) {
    return { x: BOARD_WIDTH - 60 * SCALE, y: 80 * SCALE };
  }
  return { x: BOARD_WIDTH + 70 * SCALE, y: 212 * SCALE };
}

export function positionUIElements() {
  if (isMobilePortrait) {
    // --- LIGNE 1 : Sélection des Sets ---
    uiElements.setSausageBtn.setText(' 🌭 SAUCISSES ').setPosition(5 * SCALE, 6 * SCALE);
    uiElements.setExplosiveBtn.setText(' 💣 EXPLOSIFS ').setPosition(115 * SCALE, 6 * SCALE);

    // --- LIGNE 2 : Options Thème & Son (compactes sur mobile) ---
    const themeLabel = state.isDarkMode ? ' 🌙 ' : ' ☀️ ';
    uiElements.themeBtnText.setText(themeLabel).setPosition(235 * SCALE, 6 * SCALE);

    const soundLabel = state.isMuted ? ' 🔇 ' : ' 🔊 ';
    uiElements.soundBtnText.setText(soundLabel).setPosition(275 * SCALE, 6 * SCALE);

    // --- LEADERBOARD & SUIVANTE ---
    uiElements.leaderLabel.setPosition(10 * SCALE, 45 * SCALE);
    state.topScoresTexts[0].setPosition(10 * SCALE, 62 * SCALE);
    state.topScoresTexts[1].setPosition(10 * SCALE, 77 * SCALE);
    state.topScoresTexts[2].setPosition(10 * SCALE, 92 * SCALE);

    uiElements.nextLabel.setPosition(BOARD_WIDTH - 110 * SCALE, 45 * SCALE);

    // --- SCORES & INFOS BAS DE PAGE ---
    uiElements.scoreLabel.setPosition(15 * SCALE, boardY + BOARD_HEIGHT + 15 * SCALE);
    uiElements.scoreText.setPosition(15 * SCALE, boardY + BOARD_HEIGHT + 30 * SCALE);
    uiElements.highLabel.setPosition(100 * SCALE, boardY + BOARD_HEIGHT + 15 * SCALE);
    uiElements.highScoreText.setPosition(100 * SCALE, boardY + BOARD_HEIGHT + 30 * SCALE);
    uiElements.sausNameText.setPosition(15 * SCALE, boardY + BOARD_HEIGHT + 60 * SCALE);

    uiElements.wheelLabel.setPosition(BOARD_WIDTH / 2 + 10 * SCALE, boardY + BOARD_HEIGHT + 15 * SCALE);
  } else {
    // --- MODE DESKTOP ---
    const uiX = BOARD_WIDTH + 15 * SCALE;

    uiElements.setSausageBtn.setText(' 🌭 SAUCISSES ').setPosition(10 * SCALE, 8 * SCALE);
    uiElements.setExplosiveBtn.setText(' 💣 EXPLOSIFS ').setPosition(120 * SCALE, 8 * SCALE);

    const themeLabel = state.isDarkMode ? ' 🌙 DARK ' : ' ☀️ LIGHT ';
    uiElements.themeBtnText.setText(themeLabel).setPosition(uiX, 12 * SCALE);

    const soundLabel = state.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
    uiElements.soundBtnText.setText(soundLabel).setPosition(uiX, 42 * SCALE);

    uiElements.leaderLabel.setPosition(uiX, 75 * SCALE);
    state.topScoresTexts[0].setPosition(uiX, 92 * SCALE);
    state.topScoresTexts[1].setPosition(uiX, 107 * SCALE);
    state.topScoresTexts[2].setPosition(uiX, 122 * SCALE);

    uiElements.nextLabel.setPosition(uiX, 150 * SCALE);

    uiElements.scoreLabel.setPosition(uiX, 275 * SCALE);
    uiElements.scoreText.setPosition(uiX, 290 * SCALE);
    uiElements.highLabel.setPosition(uiX, 325 * SCALE);
    uiElements.highScoreText.setPosition(uiX, 340 * SCALE);
    uiElements.sausNameText.setPosition(uiX, 375 * SCALE);

    uiElements.wheelLabel.setPosition(uiX, 415 * SCALE);
  }
}

export function applyTheme(scene) {
  document.body.classList.toggle('light-theme', !state.isDarkMode);

  const colors = state.isDarkMode
    ? {
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
        btnActiveBg: '#ffca28',
        btnActiveText: '#181412',
        btnLabel: ' 🌙 DARK ',
        wheelStroke: 0x554438,
      }
    : {
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
        btnActiveBg: '#d84315',
        btnActiveText: '#ffffff',
        btnLabel: ' ☀️ LIGHT ',
        wheelStroke: 0xc4b3a3,
      };

  uiElements.bgContainer.clear();
  uiElements.bgContainer.fillStyle(colors.uiBg, 1);
  uiElements.bgContainer.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  uiElements.uiBg.clear();
  uiElements.uiBg.fillStyle(colors.bgBoard, 1);
  uiElements.uiBg.fillRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);
  uiElements.uiBg.lineStyle(2 * SCALE, colors.border, 1);
  uiElements.uiBg.strokeRect(boardX, boardY, BOARD_WIDTH, BOARD_HEIGHT);

  uiElements.leaderBox.clear();
  uiElements.leaderBox.lineStyle(1.5 * SCALE, colors.boxStroke, 1);
  uiElements.nextBox.clear();
  uiElements.nextBox.lineStyle(2 * SCALE, colors.boxStroke, 1);

  if (isMobilePortrait) {
    uiElements.leaderBox.strokeRoundedRect(5 * SCALE, 40 * SCALE, 160 * SCALE, 65 * SCALE, 6 * SCALE);
    uiElements.nextBox.strokeRoundedRect(BOARD_WIDTH - 115 * SCALE, 40 * SCALE, 100 * SCALE, 80 * SCALE, 8 * SCALE);
  } else {
    uiElements.leaderBox.strokeRoundedRect(BOARD_WIDTH + 10 * SCALE, 68 * SCALE, 120 * SCALE, 70 * SCALE, 6 * SCALE);
    uiElements.nextBox.strokeRoundedRect(BOARD_WIDTH + 20 * SCALE, 168 * SCALE, 100 * SCALE, 90 * SCALE, 8 * SCALE);
  }

  if (state.currentSetKey === 'sausages') {
    uiElements.setSausageBtn.setBackgroundColor(colors.btnActiveBg).setColor(colors.btnActiveText);
    uiElements.setExplosiveBtn.setBackgroundColor(colors.btnBg).setColor(colors.btnText);
  } else {
    uiElements.setSausageBtn.setBackgroundColor(colors.btnBg).setColor(colors.btnText);
    uiElements.setExplosiveBtn.setBackgroundColor(colors.btnActiveBg).setColor(colors.btnActiveText);
  }

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

  uiElements.leaderLabel.setColor(colors.scoreText);
  state.topScoresTexts.forEach((t) => t.setColor(colors.btnText));

  uiElements.nextLabel.setColor(colors.label);
  uiElements.scoreLabel.setColor(colors.label);
  uiElements.highLabel.setColor(colors.label);
  uiElements.wheelLabel.setColor(colors.label);

  uiElements.scoreText.setColor(colors.scoreText);
  uiElements.highScoreText.setColor(colors.highText);
  uiElements.sausNameText.setColor(colors.nameText);

  uiElements.themeBtnText.setText(colors.btnLabel);
  uiElements.themeBtnText.setColor(colors.btnText);
  uiElements.themeBtnText.setBackgroundColor(colors.btnBg);

  uiElements.soundBtnText.setColor(colors.btnText);
  uiElements.soundBtnText.setBackgroundColor(colors.btnBg);

  // À LA FIN de applyTheme() :
  const themeLabel = isMobilePortrait ? (state.isDarkMode ? ' 🌙 ' : ' ☀️ ') : colors.btnLabel;
  uiElements.themeBtnText.setText(themeLabel);
  uiElements.themeBtnText.setColor(colors.btnText);
  uiElements.themeBtnText.setBackgroundColor(colors.btnBg);

  const soundLabel = isMobilePortrait ? (state.isMuted ? ' 🔇 ' : ' 🔊 ') : state.isMuted ? ' 🔇 MUET ' : ' 🔊 SON ';
  uiElements.soundBtnText.setText(soundLabel);
  uiElements.soundBtnText.setColor(colors.btnText);
  uiElements.soundBtnText.setBackgroundColor(colors.btnBg);
}

export async function fetchLeaderboard() {
  const table = getLeaderboardTable(state.currentSetKey);
  try {
    const { data, error } = await supabaseClient
      .from(table)
      .select('name, score')
      .order('score', { ascending: false })
      .limit(3);

    if (error) return console.error('Erreur Supabase:', error);

    state.topScoresTexts.forEach((textObj, index) => {
      if (data && data[index]) {
        const name = data[index].name.length > 10 ? data[index].name.substring(0, 8) + '..' : data[index].name;
        textObj.setText(`${index + 1}. ${name} (${data[index].score})`);
      } else {
        textObj.setText(`${index + 1}. ---`);
      }
    });
  } catch (e) {
    console.error(e);
  }
}
