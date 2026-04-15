/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Heart, 
  Timer, 
  Bomb as BombIcon, 
  Zap, 
  ArrowRight, 
  RotateCcw, 
  Play,
  Gamepad2
} from 'lucide-react';
import { GameState, CellType, Position, Bomb, Explosion, PowerUp, Enemy, Player } from './types';
import { 
  GRID_SIZE, 
  CELL_SIZE, 
  BOMB_TIMER, 
  EXPLOSION_DURATION, 
  PLAYER_SPEED_BASE, 
  ENEMY_SPEED_BASE 
} from './constants';
import { createInitialGrid, getGridPos, getPixelPos, isColliding } from './utils';
import { GameCanvas } from './components/GameCanvas';
import { initAudio, playExplosionSound, playBreakSound } from './audio';

const INITIAL_PLAYER: Player = {
  id: 'player',
  pos: { x: 1, y: 1 },
  pixelPos: { x: CELL_SIZE, y: CELL_SIZE },
  type: 'player',
  direction: 'down',
  isMoving: false,
  bombsMax: 1,
  bombsPlaced: 0,
  bombRange: 2,
  speed: PLAYER_SPEED_BASE,
  lives: 3,
  score: 0
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const initGame = useCallback((level = 1) => {
    initAudio();
    const { grid, exitPos } = createInitialGrid();
    
    // Spawn enemies
    const enemies: Enemy[] = [];
    for (let i = 0; i < level + 2; i++) {
      let ex, ey;
      do {
        ex = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        ey = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      } while (grid[ey][ex] !== 'empty' || (ex < 5 && ey < 5));
      
      enemies.push({
        id: `enemy-${i}`,
        pos: { x: ex, y: ey },
        pixelPos: getPixelPos(ex, ey),
        type: 'enemy',
        enemyType: 'basic',
        direction: Math.random() > 0.5 ? 'right' : 'down',
        isMoving: true
      });
    }

    setGameState({
      grid,
      player: { ...INITIAL_PLAYER, score: gameState?.player.score || 0, lives: gameState?.player.lives || 3 },
      enemies,
      bombs: [],
      explosions: [],
      powerUps: [],
      exitPos,
      isExitRevealed: false,
      status: 'playing',
      level,
      timeLeft: 200
    });
  }, [gameState?.player.score, gameState?.player.lives]);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const placeBomb = useCallback(() => {
    if (!gameState || gameState.status !== 'playing') return;
    const { player, bombs, grid } = gameState;
    
    const gridPos = getGridPos(player.pixelPos.x, player.pixelPos.y);
    
    // Check if bomb already there or too many bombs
    if (grid[gridPos.y][gridPos.x] === 'bomb' || player.bombsPlaced >= player.bombsMax) return;

    const newBomb: Bomb = {
      id: `bomb-${Date.now()}`,
      pos: gridPos,
      range: player.bombRange,
      timer: BOMB_TIMER,
      ownerId: player.id
    };

    setGameState(prev => {
      if (!prev) return null;
      const newGrid = prev.grid.map(row => [...row]);
      newGrid[gridPos.y][gridPos.x] = 'bomb';
      return {
        ...prev,
        grid: newGrid,
        bombs: [...prev.bombs, newBomb],
        player: { ...prev.player, bombsPlaced: prev.player.bombsPlaced + 1 }
      };
    });
  }, [gameState]);

  useEffect(() => {
    const checkBombInput = () => {
      if (keysRef.current.has('Space')) {
        placeBomb();
      }
      requestAnimationFrame(checkBombInput);
    };
    const bombRequest = requestAnimationFrame(checkBombInput);
    return () => cancelAnimationFrame(bombRequest);
  }, [placeBomb]);

  const update = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Target 60fps for speed scaling
    const speedMultiplier = deltaTime / 16.67;

    setGameState(prev => {
      if (!prev || prev.status !== 'playing') return prev;

      let { player, enemies, bombs, explosions, grid, powerUps, isExitRevealed, timeLeft } = prev;
      const newGrid = grid.map(row => [...row]);
      const keys = keysRef.current;

      // 1. Update Timer
      timeLeft -= deltaTime / 1000;
      if (timeLeft <= 0) {
        // Time out logic
      }

      // 2. Player Movement
      let nextPixelX = player.pixelPos.x;
      let nextPixelY = player.pixelPos.y;
      let isMoving = false;
      let direction = player.direction;

      const moveAmount = player.speed * speedMultiplier;
      const slideAmount = moveAmount * 0.8; // Slightly slower sliding

      if (keys.has('ArrowUp') || keys.has('KeyW')) {
        const targetY = player.pixelPos.y - moveAmount;
        if (!isColliding(player.pixelPos.x, targetY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
          nextPixelY = targetY;
        } else {
          // Corner sliding: if blocked, try sliding left or right
          if (!isColliding(player.pixelPos.x - CELL_SIZE / 2, targetY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelX -= slideAmount;
          } else if (!isColliding(player.pixelPos.x + CELL_SIZE / 2, targetY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelX += slideAmount;
          }
        }
        direction = 'up';
        isMoving = true;
      } else if (keys.has('ArrowDown') || keys.has('KeyS')) {
        const targetY = player.pixelPos.y + moveAmount;
        if (!isColliding(player.pixelPos.x, targetY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
          nextPixelY = targetY;
        } else {
          if (!isColliding(player.pixelPos.x - CELL_SIZE / 2, targetY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelX -= slideAmount;
          } else if (!isColliding(player.pixelPos.x + CELL_SIZE / 2, targetY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelX += slideAmount;
          }
        }
        direction = 'down';
        isMoving = true;
      } else if (keys.has('ArrowLeft') || keys.has('KeyA')) {
        const targetX = player.pixelPos.x - moveAmount;
        if (!isColliding(targetX, player.pixelPos.y, newGrid, player.pixelPos.x, player.pixelPos.y)) {
          nextPixelX = targetX;
        } else {
          if (!isColliding(targetX, player.pixelPos.y - CELL_SIZE / 2, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelY -= slideAmount;
          } else if (!isColliding(targetX, player.pixelPos.y + CELL_SIZE / 2, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelY += slideAmount;
          }
        }
        direction = 'left';
        isMoving = true;
      } else if (keys.has('ArrowRight') || keys.has('KeyD')) {
        const targetX = player.pixelPos.x + moveAmount;
        if (!isColliding(targetX, player.pixelPos.y, newGrid, player.pixelPos.x, player.pixelPos.y)) {
          nextPixelX = targetX;
        } else {
          if (!isColliding(targetX, player.pixelPos.y - CELL_SIZE / 2, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelY -= slideAmount;
          } else if (!isColliding(targetX, player.pixelPos.y + CELL_SIZE / 2, newGrid, player.pixelPos.x, player.pixelPos.y)) {
            nextPixelY += slideAmount;
          }
        }
        direction = 'right';
        isMoving = true;
      }

      // Apply final positions with collision check to be safe
      if (!isColliding(nextPixelX, player.pixelPos.y, newGrid, player.pixelPos.x, player.pixelPos.y)) {
        player.pixelPos.x = nextPixelX;
      }
      if (!isColliding(player.pixelPos.x, nextPixelY, newGrid, player.pixelPos.x, player.pixelPos.y)) {
        player.pixelPos.y = nextPixelY;
      }
      player.isMoving = isMoving;
      player.direction = direction;
      player.pos = getGridPos(player.pixelPos.x, player.pixelPos.y);

      // 3. Enemy Movement
      enemies = enemies.map(enemy => {
        let ex = enemy.pixelPos.x;
        let ey = enemy.pixelPos.y;
        const speed = ENEMY_SPEED_BASE * speedMultiplier;

        if (enemy.direction === 'up') ey -= speed;
        else if (enemy.direction === 'down') ey += speed;
        else if (enemy.direction === 'left') ex -= speed;
        else if (enemy.direction === 'right') ex += speed;

        if (isColliding(ex, ey, newGrid)) {
          // Change direction
          const dirs: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
          const newDir = dirs[Math.floor(Math.random() * dirs.length)];
          return { ...enemy, direction: newDir };
        }

        return {
          ...enemy,
          pixelPos: { x: ex, y: ey },
          pos: getGridPos(ex, ey)
        };
      });

      // 4. Update Bombs
      const remainingBombs: Bomb[] = [];
      const newExplosions: Explosion[] = [...explosions];
      let didExplode = false;
      let didBreak = false;

      bombs.forEach(bomb => {
        bomb.timer -= deltaTime;
        if (bomb.timer <= 0) {
          didExplode = true;
          // Explode!
          newGrid[bomb.pos.y][bomb.pos.x] = 'empty';
          player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);
          
          // Add center explosion
          newExplosions.push({ id: `exp-${Date.now()}-${bomb.pos.x}-${bomb.pos.y}`, pos: bomb.pos, timer: EXPLOSION_DURATION, isCenter: true });

          // Spread in 4 directions
          const dirs = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
          dirs.forEach(dir => {
            for (let i = 1; i <= bomb.range; i++) {
              const ex = bomb.pos.x + dir.x * i;
              const ey = bomb.pos.y + dir.y * i;
              
              if (ey < 0 || ey >= GRID_SIZE || ex < 0 || ex >= GRID_SIZE) break;
              
              const cell = newGrid[ey][ex];
              if (cell === 'wall') break;
              
              newExplosions.push({ id: `exp-${Date.now()}-${ex}-${ey}`, pos: {x: ex, y: ey}, timer: EXPLOSION_DURATION, isCenter: false });
              
              if (cell === 'block') {
                didBreak = true;
                newGrid[ey][ex] = 'empty';
                // Check for exit reveal
                if (ex === prev.exitPos.x && ey === prev.exitPos.y) {
                  isExitRevealed = true;
                  newGrid[ey][ex] = 'exit';
                } else if (Math.random() < 0.2) {
                  // Spawn powerup
                  powerUps.push({
                    pos: { x: ex, y: ey },
                    type: Math.random() < 0.4 ? 'extra-bomb' : Math.random() < 0.7 ? 'range' : 'speed'
                  });
                }
                break; // Stop explosion spread
              }
              if (cell === 'bomb') {
                // Chain reaction could be added here
              }
            }
          });
        } else {
          remainingBombs.push(bomb);
        }
      });

      let screenShakeUntil = prev.screenShakeUntil;
      if (didExplode) {
        playExplosionSound();
        screenShakeUntil = Date.now() + 300; // 300ms shake
      }
      if (didBreak) {
        playBreakSound();
      }

      // 5. Update Explosions
      const activeExplosions = newExplosions.filter(exp => {
        exp.timer -= deltaTime;
        return exp.timer > 0;
      });

      // 6. Collision Detection (Lethal)
      const isPlayerHit = activeExplosions.some(exp => exp.pos.x === player.pos.x && exp.pos.y === player.pos.y) ||
                          enemies.some(enemy => Math.abs(enemy.pixelPos.x - player.pixelPos.x) < CELL_SIZE * 0.7 && 
                                               Math.abs(enemy.pixelPos.y - player.pixelPos.y) < CELL_SIZE * 0.7);

      if (isPlayerHit) {
        if (player.lives > 1) {
          // Reset player position
          player.lives -= 1;
          player.pixelPos = getPixelPos(1, 1);
          player.pos = { x: 1, y: 1 };
        } else {
          return { ...prev, status: 'gameover' };
        }
      }

      // Enemies hit by explosion
      const aliveEnemies = enemies.filter(enemy => {
        const hit = activeExplosions.some(exp => exp.pos.x === enemy.pos.x && exp.pos.y === enemy.pos.y);
        if (hit) player.score += 100;
        return !hit;
      });

      // 7. Power-ups
      const remainingPowerUps = powerUps.filter(pu => {
        if (pu.pos.x === player.pos.x && pu.pos.y === player.pos.y) {
          if (pu.type === 'extra-bomb') player.bombsMax++;
          else if (pu.type === 'range') player.bombRange++;
          else if (pu.type === 'speed') player.speed += 0.5;
          player.score += 50;
          return false;
        }
        return true;
      });

      // 8. Exit
      if (isExitRevealed && player.pos.x === prev.exitPos.x && player.pos.y === prev.exitPos.y && aliveEnemies.length === 0) {
        return { ...prev, status: 'win' };
      }

      return {
        ...prev,
        grid: newGrid,
        player,
        enemies: aliveEnemies,
        bombs: remainingBombs,
        explosions: activeExplosions,
        powerUps: remainingPowerUps,
        isExitRevealed,
        timeLeft,
        screenShakeUntil
      };
    });

    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    if (gameState?.status === 'playing') {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState?.status, update]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white font-sans selection:bg-blue-500/30">
      {/* Header / HUD */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between bg-[#2f3542] px-10 py-4 rounded-[20px] border-4 border-[#57606f] shadow-[0_8px_0_#1e272e]">
          <div className="flex flex-col items-center">
            <span className="text-[12px] text-[#a4b0be] uppercase font-bold mb-1">Score</span>
            <span className="text-2xl font-black text-[#eccc68] [text-shadow:2px_2px_0_#000]">{gameState?.player.score.toString().padStart(6, '0')}</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[12px] text-[#a4b0be] uppercase font-bold mb-1">Time</span>
            <span className="text-2xl font-black text-[#eccc68] [text-shadow:2px_2px_0_#000]">{Math.max(0, Math.floor(gameState?.timeLeft || 0))}s</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[12px] text-[#a4b0be] uppercase font-bold mb-1">Stage</span>
            <span className="text-2xl font-black text-[#eccc68] [text-shadow:2px_2px_0_#000]">1 - {gameState?.level || 1}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[12px] text-[#a4b0be] uppercase font-bold mb-1">Lives</span>
            <div className="flex gap-1">
              {Array.from({ length: gameState?.player.lives || 0 }).map((_, i) => (
                <span key={i} className="text-xl">❤️</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="pt-40 pb-12 px-6 flex flex-col items-center justify-center min-h-screen">
        <AnimatePresence mode="wait">
          {!gameState || gameState.status === 'menu' ? (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full text-center space-y-8"
            >
              <div className="space-y-4">
                <div className="inline-flex p-4 bg-[#ff4757]/10 rounded-3xl border border-[#ff4757]/20 mb-4">
                  <Gamepad2 className="w-12 h-12 text-[#ff4757]" />
                </div>
                <h2 className="text-5xl font-black tracking-tighter italic text-[#ff4757]">BLAST-O-RAMA</h2>
                <p className="text-white/60 text-lg leading-relaxed">
                  Classic arcade action. Navigate the maze, place bombs, and defeat all enemies to reveal the exit.
                </p>
              </div>

              <button 
                onClick={() => initGame(1)}
                className="group relative w-full py-4 bg-[#ff4757] hover:bg-[#ff4757]/90 rounded-2xl font-bold text-xl transition-all active:scale-95 shadow-xl shadow-[#ff4757]/20 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  START GAME <Play className="w-5 h-5 fill-current" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </motion.div>
          ) : gameState.status === 'playing' ? (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="relative border-[10px] border-[#57606f] rounded-lg shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                <GameCanvas gameState={gameState} />
              </div>
              
              {/* Controls Section */}
              <div className="w-full max-w-2xl flex justify-between items-center px-10">
                {/* D-Pad */}
                <div className="relative w-40 h-40 bg-white/10 rounded-full flex items-center justify-center">
                  <div className="absolute top-0 w-12 h-12 bg-[#2f3542] rounded-xl border-2 border-[#57606f] shadow-[0_4px_0_#1e272e] flex items-center justify-center text-xs font-bold">W</div>
                  <div className="absolute bottom-0 w-12 h-12 bg-[#2f3542] rounded-xl border-2 border-[#57606f] shadow-[0_4px_0_#1e272e] flex items-center justify-center text-xs font-bold">S</div>
                  <div className="absolute left-0 w-12 h-12 bg-[#2f3542] rounded-xl border-2 border-[#57606f] shadow-[0_4px_0_#1e272e] flex items-center justify-center text-xs font-bold">A</div>
                  <div className="absolute right-0 w-12 h-12 bg-[#2f3542] rounded-xl border-2 border-[#57606f] shadow-[0_4px_0_#1e272e] flex items-center justify-center text-xs font-bold">D</div>
                </div>

                {/* Action Group */}
                <div className="flex gap-6 items-end">
                  <div className="w-16 h-16 bg-[#eccc68] text-[#1e272e] rounded-full flex items-center justify-center font-black text-xl border-4 border-black/30 shadow-[0_6px_0_rgba(0,0,0,0.4)]">⚡</div>
                  <div className="w-24 h-24 bg-[#ff4757] text-white rounded-full flex items-center justify-center font-black text-lg border-6 border-black/30 shadow-[0_8px_0_rgba(0,0,0,0.4)]">BOMB</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full bg-[#2f3542] border-4 border-[#57606f] rounded-[30px] p-10 text-center shadow-[0_12px_0_#1e272e]"
            >
              {gameState.status === 'win' ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-[#2ed573]/20 rounded-full flex items-center justify-center mx-auto border border-[#2ed573]/30">
                    <Trophy className="w-10 h-10 text-[#2ed573]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic text-[#2ed573]">LEVEL COMPLETE!</h2>
                    <p className="text-white/60">You've cleared the maze and found the exit.</p>
                  </div>
                  <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Final Score</span>
                      <span className="text-2xl font-black text-[#eccc68]">{gameState.player.score}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => initGame(gameState.level + 1)}
                    className="w-full py-4 bg-[#2ed573] hover:bg-[#2ed573]/90 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    NEXT LEVEL <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-[#ff4757]/20 rounded-full flex items-center justify-center mx-auto border border-[#ff4757]/30">
                    <RotateCcw className="w-10 h-10 text-[#ff4757]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic text-[#ff4757]">GAME OVER</h2>
                    <p className="text-white/60">The maze was too much this time.</p>
                  </div>
                  <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Final Score</span>
                      <span className="text-2xl font-black text-[#eccc68]">{gameState.player.score}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => initGame(1)}
                    className="w-full py-4 bg-white text-black hover:bg-white/90 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    TRY AGAIN <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
        Blast-O-Rama Arcade v1.0 • Built with Motion
      </footer>
    </div>
  );
}
