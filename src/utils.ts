import { GRID_SIZE, CELL_SIZE } from './constants';
import { CellType, Position } from './types';

export const createInitialGrid = (): { grid: CellType[][], exitPos: Position } => {
  const grid: CellType[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));

  // Outer walls
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[0][i] = 'wall';
    grid[GRID_SIZE - 1][i] = 'wall';
    grid[i][0] = 'wall';
    grid[i][GRID_SIZE - 1] = 'wall';
  }

  // Fixed internal walls
  for (let y = 2; y < GRID_SIZE - 2; y += 2) {
    for (let x = 2; x < GRID_SIZE - 2; x += 2) {
      grid[y][x] = 'wall';
    }
  }

  // Random destructible blocks
  const possibleBlockPositions: Position[] = [];
  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      // Don't place blocks in player starting area (top-left)
      if ((x <= 2 && y <= 2)) continue;
      
      if (grid[y][x] === 'empty' && Math.random() < 0.7) {
        grid[y][x] = 'block';
        possibleBlockPositions.push({ x, y });
      }
    }
  }

  // Hide exit door
  const exitIdx = Math.floor(Math.random() * possibleBlockPositions.length);
  const exitPos = possibleBlockPositions[exitIdx] || { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
  grid[exitPos.y][exitPos.x] = 'block'; // Ensure it's a block

  return { grid, exitPos };
};

export const getGridPos = (pixelX: number, pixelY: number): Position => {
  return {
    x: Math.floor((pixelX + CELL_SIZE / 2) / CELL_SIZE),
    y: Math.floor((pixelY + CELL_SIZE / 2) / CELL_SIZE)
  };
};

export const getPixelPos = (gridX: number, gridY: number): Position => {
  return {
    x: gridX * CELL_SIZE,
    y: gridY * CELL_SIZE
  };
};

export const isColliding = (
  nextX: number, 
  nextY: number, 
  grid: CellType[][], 
  currentX?: number, 
  currentY?: number
): boolean => {
  const margin = 6;
  const corners = [
    { x: nextX + margin, y: nextY + margin },
    { x: nextX + CELL_SIZE - margin, y: nextY + margin },
    { x: nextX + margin, y: nextY + CELL_SIZE - margin },
    { x: nextX + CELL_SIZE - margin, y: nextY + CELL_SIZE - margin }
  ];

  for (const corner of corners) {
    const gridX = Math.floor(corner.x / CELL_SIZE);
    const gridY = Math.floor(corner.y / CELL_SIZE);

    if (gridY < 0 || gridY >= GRID_SIZE || gridX < 0 || gridX >= GRID_SIZE) return true;
    
    const cell = grid[gridY][gridX];
    if (cell === 'wall' || cell === 'block') return true;

    // Check bombs
    if (cell === 'bomb') {
      if (currentX !== undefined && currentY !== undefined) {
        // Check if any corner of the player's CURRENT position is in this bomb cell
        const currentCorners = [
          { x: currentX + margin, y: currentY + margin },
          { x: currentX + CELL_SIZE - margin, y: currentY + margin },
          { x: currentX + margin, y: currentY + CELL_SIZE - margin },
          { x: currentX + CELL_SIZE - margin, y: currentY + CELL_SIZE - margin }
        ];
        
        const isAlreadyInCell = currentCorners.some(c => 
          Math.floor(c.x / CELL_SIZE) === gridX && Math.floor(c.y / CELL_SIZE) === gridY
        );

        if (!isAlreadyInCell) return true;
      } else {
        // For enemies or when no current position is provided, bombs are solid
        return true;
      }
    }
  }

  return false;
};
