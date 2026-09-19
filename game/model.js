import { getScaledSet, MERGE_SETS } from './sets.js';

/**
 *
 * @param {keyof MERGE_SETS} setKey
 * @returns {number}
 */
function readHighScore(setKey) {
  return Number(localStorage.getItem(`high_score_${setKey}`) || 0);
}

/**
 *
 * @param {keyof MERGE_SETS} setKey
 * @returns {string}
 */
function getSaveKey(setKey) {
  return `sausage_game_save_${setKey}`;
}

/**
 *
 * @param {keyof MERGE_SETS} initialSetKey
 */
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

    /**
     *
     * @param {keyof MERGE_SETS} setKey
     */
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

    /**
     *
     * @param {number} points
     */
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

    getSavedGame() {
      try {
        const savedGame = JSON.parse(localStorage.getItem(getSaveKey(this.currentSetKey)) || 'null');
        return [1, 2].includes(savedGame?.version) && savedGame.setKey === this.currentSetKey ? savedGame : null;
      } catch (error) {
        localStorage.removeItem(getSaveKey(this.currentSetKey));
        return null;
      }
    },

    saveGame(snapshot) {
      try {
        localStorage.setItem(
          getSaveKey(this.currentSetKey),
          JSON.stringify({ version: 2, setKey: this.currentSetKey, ...snapshot }),
        );
      } catch (error) {
        console.warn('Impossible de sauvegarder la partie.', error);
      }
    },

    clearSavedGame() {
      localStorage.removeItem(getSaveKey(this.currentSetKey));
    },

    setGameOver() {
      this.gameOver = true;
      this.stopTimer();
    },
  };

  model.loadSet(initialSetKey);
  return model;
}
