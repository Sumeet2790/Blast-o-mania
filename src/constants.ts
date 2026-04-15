export const GRID_SIZE = 15; // Must be odd for the pattern
export const CELL_SIZE = 40;
export const GAME_WIDTH = GRID_SIZE * CELL_SIZE;
export const GAME_HEIGHT = GRID_SIZE * CELL_SIZE;

export const BOMB_TIMER = 3000;
export const EXPLOSION_DURATION = 500;
export const PLAYER_SPEED_BASE = 2.5;
export const ENEMY_SPEED_BASE = 1;

export const COLORS = {
  WALL: '#747d8c',
  BLOCK: '#d17d3d',
  EMPTY: '#26ae60',
  PLAYER: '#3498db',
  ENEMY: '#e74c3c',
  BOMB: '#000000',
  EXPLOSION: '#ff4757',
  EXIT: '#eccc68',
  POWERUP: '#f1c40f',
};
