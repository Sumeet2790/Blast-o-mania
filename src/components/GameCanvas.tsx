import React, { useEffect, useRef } from 'react';
import { GameState, CellType } from '../types';
import { CELL_SIZE, COLORS, GAME_WIDTH, GAME_HEIGHT, GRID_SIZE } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.save();
    
    // Screen Shake
    if (gameState.screenShakeUntil && Date.now() < gameState.screenShakeUntil) {
      const shakeX = (Math.random() - 0.5) * 10;
      const shakeY = (Math.random() - 0.5) * 10;
      ctx.translate(shakeX, shakeY);
    }

    // Draw Grid
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = gameState.grid[y][x];
        
        // Background (Grass)
        ctx.fillStyle = COLORS.EMPTY;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        if (cell === 'wall') {
          ctx.fillStyle = COLORS.WALL;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          // Theme Wall Style: border and inset shadow
          ctx.strokeStyle = '#2f3542';
          ctx.lineWidth = 2;
          ctx.strokeRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          
          // Inset shadow effect (bottom)
          ctx.fillStyle = '#2f3542';
          ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 6, CELL_SIZE - 4, 4);
        } else if (cell === 'block') {
          ctx.fillStyle = COLORS.BLOCK;
          ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          // Theme Brick Style: border and inner border
          ctx.strokeStyle = '#8e44ad';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x * CELL_SIZE + 6, y * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12);
        } else if (cell === 'exit' && gameState.isExitRevealed) {
          ctx.fillStyle = COLORS.EXIT;
          ctx.fillRect(x * CELL_SIZE + 5, y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
        }
      }
    }

    // Draw Powerups
    gameState.powerUps.forEach(pu => {
      ctx.fillStyle = COLORS.POWERUP;
      ctx.beginPath();
      ctx.arc(pu.pos.x * CELL_SIZE + CELL_SIZE / 2, pu.pos.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw Bombs
    gameState.bombs.forEach(bomb => {
      ctx.fillStyle = COLORS.BOMB;
      ctx.beginPath();
      ctx.arc(bomb.pos.x * CELL_SIZE + CELL_SIZE / 2, bomb.pos.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Fuse (Yellow as per theme)
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(bomb.pos.x * CELL_SIZE + CELL_SIZE / 2 - 2, bomb.pos.y * CELL_SIZE + CELL_SIZE / 4 - 6, 4, 10);
    });

    // Draw Explosions
    gameState.explosions.forEach(exp => {
      ctx.fillStyle = COLORS.EXPLOSION;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(exp.pos.x * CELL_SIZE, exp.pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.globalAlpha = 1.0;
    });

    // Draw Enemies
    gameState.enemies.forEach(enemy => {
      ctx.fillStyle = COLORS.ENEMY;
      const { x, y } = enemy.pixelPos;
      // Theme Enemy Style: circular, black border
      ctx.beginPath();
      ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 14, y + 14, 4, 4);
      ctx.fillRect(x + 22, y + 14, 4, 4);
    });

    // Draw Player
    const p = gameState.player;
    ctx.fillStyle = COLORS.PLAYER;
    const px = p.pixelPos.x;
    const py = p.pixelPos.y;
    // Theme Player Style: rounded top, flatter bottom, black border
    ctx.beginPath();
    ctx.moveTo(px + 4, py + CELL_SIZE - 4);
    ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE - 4);
    ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE / 2);
    ctx.arcTo(px + CELL_SIZE - 4, py + 4, px + 4, py + 4, CELL_SIZE / 2);
    ctx.arcTo(px + 4, py + 4, px + 4, py + CELL_SIZE / 2, CELL_SIZE / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 12, py + 12, 6, 6);
    ctx.fillRect(px + 22, py + 12, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 14, py + 14, 3, 3);
    ctx.fillRect(px + 24, py + 14, 3, 3);

    ctx.restore();

  }, [gameState]);

  return (
    <div className="relative border-4 border-gray-800 rounded-lg overflow-hidden shadow-2xl">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="bg-emerald-600"
      />
    </div>
  );
};
