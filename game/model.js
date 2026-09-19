import { getScaledSet } from './sets.js';

function readHighScore(setKey) {
  return Number(localStorage.getItem(`high_score_${setKey}`) || 0);
}

export function createGameModel(initialSetKey = window.INITIAL_SET_KEY || 'sausages') {
  const model = {
    currentSetKey: initialSetKey,
    itemTypes: [],
    currentTypeIndex: 0,
    nextTypeIndex: 0,
    score: 0,
    highScore: 0,
    gameOver: false,
    canDrop: true,
    overflowTimer: 0,
    isMuted: false,
    isDarkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
    elapsedTime: 0,
    isTimerRunning: false,
    timerInterval: null,

    loadSet(setKey) {
      this.currentSetKey = setKey;
      this.itemTypes = getScaledSet(setKey);
      this.highScore = readHighScore(setKey);
    },

    get ITEM_TYPES() {
      return this.itemTypes;
    },

    reset() {
      this.score = 0;
      this.gameOver = false;
      this.canDrop = true;
      this.overflowTimer = 0;
      this.stopTimer();
    },

    addScore(points) {
      this.score += points;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(`high_score_${this.currentSetKey}`, String(this.highScore));
      }
    },

    startTimer(onTick) {
      if (this.isTimerRunning) return;

      this.isTimerRunning = true;
      this.timerInterval = setInterval(() => {
        this.elapsedTime += 1;
        onTick?.(this.elapsedTime);
      }, 1000);
    },

    pauseTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.isTimerRunning = false;
    },

    stopTimer() {
      this.pauseTimer();
      this.elapsedTime = 0;
    },

    setGameOver() {
      this.gameOver = true;
      this.stopTimer();
    },
  };

  model.loadSet(initialSetKey);
  return model;
}
