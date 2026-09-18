export const SCALE = 2;

// --- CALCUL RESPONSIVE ---
export const isMobilePortrait = window.innerWidth / window.innerHeight < 0.77;

export const BOARD_WIDTH = 340 * SCALE;
export const BOARD_HEIGHT = 620 * SCALE;

export const boardX = 0;
export const boardY = isMobilePortrait ? 130 * SCALE : 0;

export const CANVAS_WIDTH = isMobilePortrait ? BOARD_WIDTH : BOARD_WIDTH + 140 * SCALE;
export const CANVAS_HEIGHT = isMobilePortrait ? BOARD_HEIGHT + 260 * SCALE : BOARD_HEIGHT;

export const GAME_OVER_LINE_Y = boardY + 110 * SCALE;
