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
};

export function loadCurrentSet() {
  state.SAUSAGE_TYPES = getScaledSet(state.currentSetKey);
  // Un high score distinct sauvegardé par set
  state.highScore = localStorage.getItem(`high_score_${state.currentSetKey}`) || 0;
}

loadCurrentSet();
