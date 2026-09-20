// @ts-nocheck

import { getScaledSet, type ItemDefinition, type SetKey } from './sets.js';

type SavedBody = {
  typeIndex: number;
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
};

type GameSnapshot = {
  score: number;
  elapsedTime: number;
  currentTypeIndex: number;
  nextTypeIndex: number;
  currentItemX?: number;
  boardY: number;
  bodies: SavedBody[];
};

export class GameModelClass {
  currentSetKey: SetKey;
  itemTypes: ItemDefinition[];
  currentTypeIndex = 0;
  nextTypeIndex = 0;
  score = 0;
  highScore = 0;
  gameOver = false;
  canDrop = true;
  overflowTimer = 0;
  isMuted = false;
  isDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  elapsedTime = 0;
  isTimerRunning = false;
  timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(initialSetKey: SetKey = (window.INITIAL_SET_KEY as SetKey | undefined) || 'sausages') {
    this.currentSetKey = initialSetKey;
    this.loadSet(initialSetKey);
  }

  loadSet(setKey: SetKey) {
    this.currentSetKey = setKey;
    this.itemTypes = getScaledSet(setKey);
    this.highScore = readHighScore(setKey);
  }

  get ITEM_TYPES(): ItemDefinition[] {
    return this.itemTypes;
  }

  reset() {
    this.score = 0;
    this.gameOver = false;
    this.canDrop = true;
    this.overflowTimer = 0;
    this.stopTimer();
  }

  addScore(points: number) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(`high_score_${this.currentSetKey}`, String(this.highScore));
    }
  }

  startTimer(onTick?: (seconds: number) => void) {
    if (this.isTimerRunning) return;

    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      this.elapsedTime += 1;
      onTick?.(this.elapsedTime);
    }, 1000);
  }

  pauseTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.isTimerRunning = false;
  }

  stopTimer() {
    this.pauseTimer();
    this.elapsedTime = 0;
  }

  getSavedGame(): { version?: number; setKey?: string;[key: string]: unknown } | null {
    try {
      const savedGame = JSON.parse(localStorage.getItem(getSaveKey(this.currentSetKey)) || 'null');
      return [1, 2].includes(savedGame?.version) && savedGame.setKey === this.currentSetKey ? savedGame : null;
    } catch {
      localStorage.removeItem(getSaveKey(this.currentSetKey));
      return null;
    }
  }

  saveGame(snapshot: GameSnapshot) {
    try {
      localStorage.setItem(
        getSaveKey(this.currentSetKey),
        JSON.stringify({ version: 2, setKey: this.currentSetKey, ...snapshot }),
      );
    } catch (error) {
      console.warn('Impossible de sauvegarder la partie.', error);
    }
  }

  clearSavedGame() {
    localStorage.removeItem(getSaveKey(this.currentSetKey));
  }

  setGameOver() {
    this.gameOver = true;
    this.stopTimer();
  }
}

function readHighScore(setKey: SetKey): number {
  return Number(localStorage.getItem(`high_score_${setKey}`) || 0);
}

function getSaveKey(setKey: SetKey): string {
  return `sausage_game_save_${setKey}`;
}

export function createGameModel(initialSetKey: SetKey = (window.INITIAL_SET_KEY as SetKey | undefined) || 'sausages') {
  return new GameModelClass(initialSetKey);
}
