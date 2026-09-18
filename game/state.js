import { getScaledSet } from './sets.js';

export const state = {
  currentSetKey: window.INITIAL_SET_KEY || 'sausages',
  SAUSAGE_TYPES: [],
  currentTypeIndex: 0,
  nextTypeIndex: 0,
  currentSausageSprite: null,
  nextSausagePreview: null,
  aimLine: null,
  gameOverLine: null,
  canDrop: true,
  score: 0,
  highScore: 0,
  gameOver: false,
  overflowTimer: 0,
  bgMusic: null,
  isMuted: false,
  isDarkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
  wheelSprites: [],
  topScoresTexts: [],
  // Timer
  elapsedTime: 0,
  timerInterval: null,
  isTimerRunning: false,
};

export function loadCurrentSet() {
  state.SAUSAGE_TYPES = getScaledSet(state.currentSetKey);
  // Un high score distinct sauvegardé par set
  state.highScore = localStorage.getItem(`high_score_${state.currentSetKey}`) || 0;
}

loadCurrentSet();

//region Timer
export function startTimer(onTick) {
  if (!state.isTimerRunning) {
    state.isTimerRunning = true;
    state.timerInterval = setInterval(() => {
      state.elapsedTime += 1;
      if (onTick) onTick(state.elapsedTime);
    }, 1000);
  }
}

export function pauseTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  state.isTimerRunning = false;
}

export function stopTimer() {
  pauseTimer();
  state.elapsedTime = 0;
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
//endregion Timer
