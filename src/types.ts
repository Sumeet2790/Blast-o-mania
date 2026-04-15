export type CellType = 'empty' | 'wall' | 'block' | 'bomb' | 'explosion' | 'powerup' | 'exit';

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Position; // Grid position
  pixelPos: Position; // Smooth movement position
  type: 'player' | 'enemy';
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
}

export interface Player extends Entity {
  bombsMax: number;
  bombsPlaced: number;
  bombRange: number;
  speed: number;
  lives: number;
  score: number;
}

export interface Enemy extends Entity {
  enemyType: 'basic' | 'fast' | 'smart';
}

export interface Bomb {
  id: string;
  pos: Position;
  range: number;
  timer: number;
  ownerId: string;
}

export interface Explosion {
  id: string;
  pos: Position;
  timer: number;
  isCenter: boolean;
}

export interface PowerUp {
  pos: Position;
  type: 'extra-bomb' | 'range' | 'speed';
}

export interface GameState {
  grid: CellType[][];
  player: Player;
  enemies: Enemy[];
  bombs: Bomb[];
  explosions: Explosion[];
  powerUps: PowerUp[];
  exitPos: Position;
  isExitRevealed: boolean;
  status: 'menu' | 'playing' | 'gameover' | 'win';
  level: number;
  timeLeft: number;
  screenShakeUntil?: number;
}
