import Layout from './components/layout/Layout';
import Base64Tool from './components/tools/base64';
import { ApiTester } from './components/tools/api-tester/ApiTester';
import RSATool from './components/tools/rsa';
import KeytabTool from './components/tools/keytab';
import KafkaTester from './components/tools/kafka-tester';
import RegexTool from './components/tools/regex';
import TimeUnitsTool from './components/tools/time-units';
import BSONTool from './components/tools/bson';
import HelmSecrets from './components/tools/helm-secrets';
import { useTheme } from './hooks/useTheme';
import { useState, useEffect, useRef } from 'react';
import { CodeBracketIcon, LockClosedIcon, KeyIcon, CloudIcon, CommandLineIcon, DocumentTextIcon, ClockIcon, CubeTransparentIcon, ShieldCheckIcon, FaceSmileIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Add Google Fonts import for pixel/arcade font
// Add this to the top of the file (React will ignore it, but user should add to index.html):
// <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

const ARCADE_FONT = '"Press Start 2P", "VT323", monospace';

// Simple T-Rex runner game (canvas-based, minimal)
const TrexGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const groundY = 310;
  const dinoHeight = 50;
  const dinoWidth = 50;
  const dinoX = 60;
  const animationRef = useRef<number | null>(null);
  const runningRef = useRef(true);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let running = true;
    runningRef.current = true;
    let dinoY = groundY - dinoHeight;
    let velocity = 0, gravity = 0.6, isJumping = false;
    let obstacles: {x: number, w: number, h: number}[] = [];
    let frame = 0, score = 0;
    let speed = 8;
    function drawDino() {
      ctx.save();
      ctx.translate(dinoX, dinoY);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(10, 10, 30, 25);
      ctx.fillRect(30, 0, 18, 18);
      ctx.fillStyle = '#fff';
      ctx.fillRect(44, 6, 3, 3);
      ctx.fillStyle = '#111';
      ctx.fillRect(45, 7, 1, 1);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(0, 20, 12, 6);
      ctx.fillRect(14, 35, 6, 10);
      ctx.fillRect(30, 35, 6, 10);
      ctx.restore();
    }
    function drawObstacles() {
      for (const obs of obstacles) {
        ctx.save();
        ctx.translate(obs.x, groundY - obs.h);
        ctx.fillStyle = '#2ecc40';
        ctx.fillRect(0, 0, obs.w, obs.h);
        ctx.fillRect(-8, obs.h - 30, 8, 18);
        ctx.fillRect(obs.w, obs.h - 40, 8, 24);
        ctx.restore();
      }
    }
    function drawGround() {
      ctx.strokeStyle = '#ff00cc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(800, groundY);
      ctx.stroke();
    }
    function drawScore() {
      ctx.fillStyle = '#00ffe7';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillText(`Score: ${score}`, 420, 50);
      ctx.fillStyle = '#ff00cc';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText(`High: ${highScore}`, 80, 50);
    }
    function update() {
      ctx.clearRect(0, 0, 800, 350);
      drawGround();
      drawDino();
      drawObstacles();
      drawScore();
      if (isJumping) {
        velocity += gravity;
        dinoY += velocity;
        if (dinoY >= groundY - dinoHeight) {
          dinoY = groundY - dinoHeight;
          velocity = 0;
          isJumping = false;
        }
      }
      if (frame % 80 === 0) {
        const h = 50 + Math.random() * 60;
        obstacles.push({ x: 800, w: 24 + Math.random() * 12, h });
      }
      speed = 8 + Math.min(Math.floor(score / 200), 7); // max speed = 15
      for (const obs of obstacles) {
        obs.x -= speed;
      }
      obstacles = obstacles.filter(obs => obs.x + obs.w > 0);
      let collided = false;
      for (const obs of obstacles) {
        if (
          dinoX + dinoWidth > obs.x &&
          dinoX < obs.x + obs.w &&
          dinoY + dinoHeight > groundY - obs.h
        ) {
          collided = true;
          break;
        }
      }
      if (collided) {
        running = false;
        runningRef.current = false;
        setLastScore(score);
        if (score > highScore) setHighScore(score);
        ctx.fillStyle = '#ff003c';
        ctx.font = 'bold 36px "Press Start 2P", monospace';
        ctx.fillText('Game Over', 270, 150);
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.fillText('Press Space to Restart', 180, 200);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }
      if (running) {
        score++;
        frame++;
        animationRef.current = requestAnimationFrame(update);
      }
    }
    function jump() {
      if (!isJumping && runningRef.current) {
        isJumping = true;
        velocity = -13;
      }
      if (!runningRef.current) {
        running = true;
        runningRef.current = true;
        dinoY = groundY - dinoHeight;
        velocity = 0;
        isJumping = false;
        obstacles = [];
        frame = 0;
        score = 0;
        speed = 8;
        animationRef.current = requestAnimationFrame(update);
      }
    }
    const keyListener = (e: KeyboardEvent) => {
      if (e.code === 'Space') jump();
    };
    window.addEventListener('keydown', keyListener);
    animationRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', keyListener);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line
  }, [highScore]);
  return (
    <div className="flex flex-col items-center relative">
      <div className="relative">
        <canvas ref={canvasRef} width={800} height={350} className="border-4 border-[#00ffe7] rounded bg-[#fff] dark:bg-[#181824] shadow-xl arcade-glow" style={{ imageRendering: 'pixelated', fontFamily: ARCADE_FONT }} />
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 800,
          height: 350,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(transparent, transparent 6px, rgba(0,0,0,0.08) 8px)',
          borderRadius: 8,
          zIndex: 2
        }} />
      </div>
      <div className="mt-4 text-[#ff00cc] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Press <b>Space</b> to jump!
      </div>
    </div>
  );
};

const TETROMINOES = [
  // I
  { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  // O
  { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  // T
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  // S
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  // Z
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
  // J
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
  // L
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' },
];
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const CELL_SIZE = 32;

function randomTetromino() {
  const idx = Math.floor(Math.random() * TETROMINOES.length);
  return { ...TETROMINOES[idx], rotation: 0 };
}

const TetrisGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [grid, setGrid] = useState<number[][]>(Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0)));
  const [current, setCurrent] = useState<any>(null);
  const [pos, setPos] = useState({ x: 3, y: 0 });
  const [next, setNext] = useState<any>(randomTetromino());
  const [blinkingRows, setBlinkingRows] = useState<number[]>([]);
  const [isBlinking, setIsBlinking] = useState(false);
  const [blinkState, setBlinkState] = useState(0); // 0: off, 1: on
  const [blinkCount, setBlinkCount] = useState(0); // how many blinks left
  const dropRef = useRef<any>();
  const blinkTimerRef = useRef<any>();

  // Draw the grid and pieces
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, GRID_WIDTH * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        let isBlink = blinkingRows.includes(y) && isBlinking && blinkState === 1;
        if (grid[y][x]) {
          ctx.fillStyle = isBlink ? '#ffe600' : (typeof grid[y][x] === 'string' ? grid[y][x] : '#888');
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#222';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        } else {
          ctx.fillStyle = '#181824';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#222';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
    // Draw current tetromino
    if (current && !isBlinking) {
      const shape = current.shape;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            ctx.fillStyle = current.color;
            ctx.fillRect((pos.x + x) * CELL_SIZE, (pos.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect((pos.x + x) * CELL_SIZE, (pos.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
  }, [grid, current, pos, blinkingRows, isBlinking, blinkState]);

  // Spawn new tetromino
  useEffect(() => {
    if (!current && !isBlinking) {
      setCurrent(next);
      setNext(randomTetromino());
      setPos({ x: 3, y: 0 });
    }
  }, [current, next, isBlinking]);

  // Blinking effect logic
  useEffect(() => {
    if (isBlinking && blinkingRows.length > 0) {
      if (blinkCount > 0) {
        blinkTimerRef.current = setTimeout(() => {
          setBlinkState(s => 1 - s); // toggle
          setBlinkCount(c => c - 1);
        }, 120);
      } else {
        // After blinking, clear lines
        setBlinkingRows([]);
        setIsBlinking(false);
        setBlinkState(0);
        setBlinkCount(0);
      }
    }
    return () => clearTimeout(blinkTimerRef.current);
  }, [isBlinking, blinkingRows, blinkCount]);

  // Drop logic
  useEffect(() => {
    if (gameOver || isBlinking) return;
    function canMove(newX: number, newY: number, shape = current.shape) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const gx = newX + x;
            const gy = newY + y;
            if (gx < 0 || gx >= GRID_WIDTH || gy >= GRID_HEIGHT) return false;
            if (gy >= 0 && grid[gy][gx]) return false;
          }
        }
      }
      return true;
    }
    function mergeToGrid() {
      const newGrid = grid.map(row => [...row]);
      for (let y = 0; y < current.shape.length; y++) {
        for (let x = 0; x < current.shape[y].length; x++) {
          if (current.shape[y][x]) {
            const gx = pos.x + x;
            const gy = pos.y + y;
            if (gy >= 0 && gx >= 0 && gx < GRID_WIDTH && gy < GRID_HEIGHT) {
              newGrid[gy][gx] = current.color;
            }
          }
        }
      }
      return newGrid;
    }
    function checkFullRows(gridToCheck: any[][]) {
      let fullRows: number[] = [];
      for (let y = 0; y < GRID_HEIGHT; y++) {
        if (gridToCheck[y].every(cell => cell)) fullRows.push(y);
      }
      return fullRows;
    }
    function clearLines(gridToCheck: any[][], rows: number[]) {
      let lines = rows.length;
      let newGrid = gridToCheck.filter((_, y) => !rows.includes(y)).map(row => [...row]);
      while (newGrid.length < GRID_HEIGHT) newGrid.unshift(Array(GRID_WIDTH).fill(0));
      if (lines > 0) setScore(s => s + lines * 100);
      return newGrid;
    }
    function drop() {
      if (!current) return;
      if (canMove(pos.x, pos.y + 1)) {
        setPos(p => ({ ...p, y: p.y + 1 }));
      } else {
        // Merge to grid
        const merged = mergeToGrid();
        // Check for full rows
        const fullRows = checkFullRows(merged);
        if (fullRows.length > 0) {
          setBlinkingRows(fullRows);
          setIsBlinking(true);
          setBlinkState(1);
          setBlinkCount(5); // 3 flashes (on/off)
          setTimeout(() => {
            setGrid(clearLines(merged, fullRows));
            setCurrent(null);
          }, 5 * 120 + 10); // after blinking, clear
        } else {
          setGrid(merged);
          // Check for game over
          if (pos.y <= 0) {
            setGameOver(true);
          }
          setCurrent(null);
        }
      }
    }
    dropRef.current = setInterval(drop, 500);
    return () => clearInterval(dropRef.current);
  }, [current, pos, grid, gameOver, isBlinking]);

  // Keyboard controls
  useEffect(() => {
    if (gameOver || isBlinking) return;
    function canMove(newX: number, newY: number, shape = current.shape) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const gx = newX + x;
            const gy = newY + y;
            if (gx < 0 || gx >= GRID_WIDTH || gy >= GRID_HEIGHT) return false;
            if (gy >= 0 && grid[gy][gx]) return false;
          }
        }
      }
      return true;
    }
    function rotate(shape: number[][]) {
      return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    }
    const handleKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft') {
        if (canMove(pos.x - 1, pos.y)) setPos(p => ({ ...p, x: p.x - 1 }));
      } else if (e.code === 'ArrowRight') {
        if (canMove(pos.x + 1, pos.y)) setPos(p => ({ ...p, x: p.x + 1 }));
      } else if (e.code === 'ArrowDown') {
        if (canMove(pos.x, pos.y + 1)) setPos(p => ({ ...p, y: p.y + 1 }));
      } else if (e.code === 'ArrowUp') {
        const rotated = rotate(current.shape);
        if (canMove(pos.x, pos.y, rotated)) setCurrent({ ...current, shape: rotated });
      } else if (e.code === 'Space') {
        // Hard drop
        let dropY = pos.y;
        while (canMove(pos.x, dropY + 1)) dropY++;
        setPos(p => ({ ...p, y: dropY }));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, pos, grid, gameOver, isBlinking]);

  // Reset game
  const reset = () => {
    setGrid(Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0)));
    setScore(0);
    setGameOver(false);
    setCurrent(null);
    setNext(randomTetromino());
    setPos({ x: 3, y: 0 });
    setBlinkingRows([]);
    setIsBlinking(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH * CELL_SIZE}
          height={GRID_HEIGHT * CELL_SIZE}
          className="border-4 border-[#00ffe7] rounded bg-[#181824] shadow-xl arcade-glow"
          style={{ imageRendering: 'pixelated', fontFamily: ARCADE_FONT }}
        />
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: GRID_WIDTH * CELL_SIZE,
          height: GRID_HEIGHT * CELL_SIZE,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(transparent, transparent 6px, rgba(0,0,0,0.08) 8px)',
          borderRadius: 8,
          zIndex: 2
        }} />
      </div>
      <div className="mt-4 text-[#ff00cc] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Score: <b>{score}</b>
        {gameOver && (
          <span className="ml-4 text-red-500">Game Over <button className="ml-2 px-2 py-1 bg-[#00ffe7] text-black rounded" onClick={reset}>Restart</button></span>
        )}
      </div>
      <div className="mt-2 text-[#00ffe7] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Controls: ← → ↓ to move, ↑ to rotate, Space to hard drop
      </div>
    </div>
  );
};

const SNAKE_GRID_SIZE = 20;
const SNAKE_CELL_SIZE = 20;

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [snake, setSnake] = useState<{x: number, y: number}[]>([{x: 10, y: 10}]);
  const [dir, setDir] = useState<{x: number, y: number}>({x: 1, y: 0});
  const [apple, setApple] = useState<{x: number, y: number}>({x: 5, y: 5});
  const [gameOver, setGameOver] = useState(false);
  const moveRef = useRef<any>();
  const dirRef = useRef(dir);
  dirRef.current = dir;

  // Draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SNAKE_GRID_SIZE * SNAKE_CELL_SIZE, SNAKE_GRID_SIZE * SNAKE_CELL_SIZE);
    // Draw grid
    for (let y = 0; y < SNAKE_GRID_SIZE; y++) {
      for (let x = 0; x < SNAKE_GRID_SIZE; x++) {
        ctx.fillStyle = '#181824';
        ctx.fillRect(x * SNAKE_CELL_SIZE, y * SNAKE_CELL_SIZE, SNAKE_CELL_SIZE, SNAKE_CELL_SIZE);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(x * SNAKE_CELL_SIZE, y * SNAKE_CELL_SIZE, SNAKE_CELL_SIZE, SNAKE_CELL_SIZE);
      }
    }
    // Draw apple
    ctx.fillStyle = '#ff003c';
    ctx.fillRect(apple.x * SNAKE_CELL_SIZE, apple.y * SNAKE_CELL_SIZE, SNAKE_CELL_SIZE, SNAKE_CELL_SIZE);
    // Draw snake
    for (let i = 0; i < snake.length; i++) {
      ctx.fillStyle = i === 0 ? '#00ffe7' : '#00f000';
      ctx.fillRect(snake[i].x * SNAKE_CELL_SIZE, snake[i].y * SNAKE_CELL_SIZE, SNAKE_CELL_SIZE, SNAKE_CELL_SIZE);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(snake[i].x * SNAKE_CELL_SIZE, snake[i].y * SNAKE_CELL_SIZE, SNAKE_CELL_SIZE, SNAKE_CELL_SIZE);
    }
  }, [snake, apple]);

  // Move the snake
  useEffect(() => {
    if (gameOver) return;
    function move() {
      setSnake(prev => {
        const head = {x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y};
        // Check collision
        if (
          head.x < 0 || head.x >= SNAKE_GRID_SIZE ||
          head.y < 0 || head.y >= SNAKE_GRID_SIZE ||
          prev.some(seg => seg.x === head.x && seg.y === head.y)
        ) {
          setGameOver(true);
          return prev;
        }
        let newSnake = [head, ...prev];
        if (head.x === apple.x && head.y === apple.y) {
          setScore(s => s + 10);
          // Place new apple
          let newApple;
          do {
            newApple = {
              x: Math.floor(Math.random() * SNAKE_GRID_SIZE),
              y: Math.floor(Math.random() * SNAKE_GRID_SIZE)
            };
          } while (newSnake.some(seg => seg.x === newApple.x && seg.y === newApple.y));
          setApple(newApple);
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }
    moveRef.current = setInterval(move, 120);
    return () => clearInterval(moveRef.current);
  }, [apple, gameOver]);

  // Keyboard controls
  useEffect(() => {
    if (gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' && dirRef.current.x !== 1) setDir({x: -1, y: 0});
      else if (e.code === 'ArrowRight' && dirRef.current.x !== -1) setDir({x: 1, y: 0});
      else if (e.code === 'ArrowUp' && dirRef.current.y !== 1) setDir({x: 0, y: -1});
      else if (e.code === 'ArrowDown' && dirRef.current.y !== -1) setDir({x: 0, y: 1});
    };
    window.addEventListener('keydown', handleKey, { passive: false });
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameOver]);

  // Reset game
  const reset = () => {
    setScore(0);
    setSnake([{x: 10, y: 10}]);
    setDir({x: 1, y: 0});
    setApple({x: 5, y: 5});
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SNAKE_GRID_SIZE * SNAKE_CELL_SIZE}
          height={SNAKE_GRID_SIZE * SNAKE_CELL_SIZE}
          className="border-4 border-[#00ffe7] rounded bg-[#181824] shadow-xl arcade-glow"
          style={{ imageRendering: 'pixelated', fontFamily: ARCADE_FONT }}
        />
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SNAKE_GRID_SIZE * SNAKE_CELL_SIZE,
          height: SNAKE_GRID_SIZE * SNAKE_CELL_SIZE,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(transparent, transparent 6px, rgba(0,0,0,0.08) 8px)',
          borderRadius: 8,
          zIndex: 2
        }} />
      </div>
      <div className="mt-4 text-[#ff00cc] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Score: <b>{score}</b>
        {gameOver && (
          <span className="ml-4 text-red-500">Game Over <button className="ml-2 px-2 py-1 bg-[#00ffe7] text-black rounded" onClick={reset}>Restart</button></span>
        )}
      </div>
      <div className="mt-2 text-[#00ffe7] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Controls: ← → ↑ ↓ to move
      </div>
    </div>
  );
};

const BREAKOUT_WIDTH = 400;
const BREAKOUT_HEIGHT = 320;
const BREAKOUT_ROWS = 5;
const BREAKOUT_COLS = 10;
const BREAKOUT_BRICK_W = 36;
const BREAKOUT_BRICK_H = 16;
const BREAKOUT_PADDLE_W = 64;
const BREAKOUT_PADDLE_H = 12;
const BREAKOUT_BALL_R = 7;

const BreakoutGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [bricks, setBricks] = useState<number[][]>(Array.from({ length: BREAKOUT_ROWS }, () => Array(BREAKOUT_COLS).fill(1)));
  const [paddleX, setPaddleX] = useState(BREAKOUT_WIDTH / 2 - BREAKOUT_PADDLE_W / 2);
  const [ball, setBall] = useState({ x: BREAKOUT_WIDTH / 2, y: BREAKOUT_HEIGHT - 40, dx: 2, dy: -2 });
  const [running, setRunning] = useState(true);
  const moveRef = useRef(0);
  const leftPressed = useRef(false);
  const rightPressed = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT);
    // Draw bricks
    for (let r = 0; r < BREAKOUT_ROWS; r++) {
      for (let c = 0; c < BREAKOUT_COLS; c++) {
        if (bricks[r][c]) {
          ctx.fillStyle = `hsl(${r * 60}, 80%, 60%)`;
          ctx.fillRect(
            c * BREAKOUT_BRICK_W + 8,
            r * BREAKOUT_BRICK_H + 32,
            BREAKOUT_BRICK_W - 4,
            BREAKOUT_BRICK_H - 4
          );
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(
            c * BREAKOUT_BRICK_W + 8,
            r * BREAKOUT_BRICK_H + 32,
            BREAKOUT_BRICK_W - 4,
            BREAKOUT_BRICK_H - 4
          );
        }
      }
    }
    // Draw paddle
    ctx.fillStyle = '#00ffe7';
    ctx.fillRect(paddleX, BREAKOUT_HEIGHT - 24, BREAKOUT_PADDLE_W, BREAKOUT_PADDLE_H);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(paddleX, BREAKOUT_HEIGHT - 24, BREAKOUT_PADDLE_W, BREAKOUT_PADDLE_H);
    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BREAKOUT_BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#ff00cc';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    // Draw score/lives
    ctx.fillStyle = '#00ffe7';
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 12, 22);
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${lives}`, BREAKOUT_WIDTH - 12, 22);
  }, [bricks, paddleX, ball, score, lives]);

  // Game loop
  useEffect(() => {
    if (!running || gameOver) return;
    function loop() {
      setBall(prev => {
        let { x, y, dx, dy } = prev;
        let newX = x + dx;
        let newY = y + dy;
        let newDx = dx;
        let newDy = dy;
        // Wall collision
        if (newX < BREAKOUT_BALL_R || newX > BREAKOUT_WIDTH - BREAKOUT_BALL_R) newDx = -dx;
        if (newY < BREAKOUT_BALL_R) newDy = -dy;
        // Paddle collision
        if (
          newY > BREAKOUT_HEIGHT - 24 - BREAKOUT_BALL_R &&
          newX > paddleX &&
          newX < paddleX + BREAKOUT_PADDLE_W
        ) {
          newDy = -Math.abs(dy);
          // Add some angle based on where it hit the paddle
          newDx = ((newX - (paddleX + BREAKOUT_PADDLE_W / 2)) / (BREAKOUT_PADDLE_W / 2)) * 4;
        }
        // Brick collision
        let hit = false;
        let hitRow = -1, hitCol = -1;
        for (let r = 0; r < BREAKOUT_ROWS; r++) {
          for (let c = 0; c < BREAKOUT_COLS; c++) {
            if (bricks[r][c]) {
              let bx = c * BREAKOUT_BRICK_W + 8;
              let by = r * BREAKOUT_BRICK_H + 32;
              if (
                newX > bx && newX < bx + BREAKOUT_BRICK_W - 4 &&
                newY > by && newY < by + BREAKOUT_BRICK_H - 4
              ) {
                hit = true;
                hitRow = r;
                hitCol = c;
                break;
              }
            }
          }
        }
        if (hit) {
          let newBricks = bricks.map(row => [...row]);
          newBricks[hitRow][hitCol] = 0;
          setBricks(newBricks);
          setScore(s => s + 10);
          newDy = -newDy;
        }
        // Lose life
        if (newY > BREAKOUT_HEIGHT + 20) {
          setLives(l => l - 1);
          setBall({ x: BREAKOUT_WIDTH / 2, y: BREAKOUT_HEIGHT - 40, dx: 2, dy: -2 });
          setPaddleX(BREAKOUT_WIDTH / 2 - BREAKOUT_PADDLE_W / 2);
          if (lives - 1 <= 0) setGameOver(true);
          return prev;
        }
        // Win
        if (bricks.flat().every(b => b === 0)) {
          setGameOver(true);
          setRunning(false);
        }
        return { x: newX, y: newY, dx: newDx, dy: newDy };
      });
      // Paddle movement
      setPaddleX(prev => {
        let next = prev;
        if (leftPressed.current) next -= 6;
        if (rightPressed.current) next += 6;
        next = Math.max(0, Math.min(BREAKOUT_WIDTH - BREAKOUT_PADDLE_W, next));
        return next;
      });
      animationRef.current = requestAnimationFrame(loop);
    }
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [running, gameOver, bricks, paddleX, lives]);

  // Keyboard controls
  useEffect(() => {
    if (gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft') leftPressed.current = true;
      if (e.code === 'ArrowRight') rightPressed.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') leftPressed.current = false;
      if (e.code === 'ArrowRight') rightPressed.current = false;
    };
    window.addEventListener('keydown', handleKey, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver]);

  // Reset game
  const reset = () => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setBricks(Array.from({ length: BREAKOUT_ROWS }, () => Array(BREAKOUT_COLS).fill(1)));
    setPaddleX(BREAKOUT_WIDTH / 2 - BREAKOUT_PADDLE_W / 2);
    setBall({ x: BREAKOUT_WIDTH / 2, y: BREAKOUT_HEIGHT - 40, dx: 2, dy: -2 });
    setRunning(true);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={BREAKOUT_WIDTH}
          height={BREAKOUT_HEIGHT}
          className="border-4 border-[#00ffe7] rounded bg-[#181824] shadow-xl arcade-glow"
          style={{ imageRendering: 'pixelated', fontFamily: ARCADE_FONT }}
        />
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: BREAKOUT_WIDTH,
          height: BREAKOUT_HEIGHT,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(transparent, transparent 6px, rgba(0,0,0,0.08) 8px)',
          borderRadius: 8,
          zIndex: 2
        }} />
      </div>
      <div className="mt-4 text-[#ff00cc] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Score: <b>{score}</b> &nbsp; Lives: <b>{lives}</b>
        {gameOver && (
          <span className="ml-4 text-red-500">Game Over <button className="ml-2 px-2 py-1 bg-[#00ffe7] text-black rounded" onClick={reset}>Restart</button></span>
        )}
      </div>
      <div className="mt-2 text-[#00ffe7] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Controls: ← → to move
      </div>
    </div>
  );
};

const PongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ left: 0, right: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'left' | 'right' | null>(null);
  const [paddleLeft, setPaddleLeft] = useState(150);
  const [paddleRight, setPaddleRight] = useState(150);
  const [ball, setBall] = useState({ x: 400, y: 200, dx: 4, dy: 4 });
  const [running, setRunning] = useState(true);
  const animationRef = useRef<number | null>(null);
  const upPressed = useRef(false);
  const downPressed = useRef(false);
  const wPressed = useRef(false);
  const sPressed = useRef(false);

  // Draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 800, 400);
    
    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#00ffe7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 400);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#ff00cc';
    ctx.fillRect(20, paddleLeft, 10, 80);
    ctx.fillRect(770, paddleRight, 10, 80);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(20, paddleLeft, 10, 80);
    ctx.strokeRect(770, paddleRight, 10, 80);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffe7';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw score
    ctx.fillStyle = '#00ffe7';
    ctx.font = 'bold 32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(score.left.toString(), 350, 50);
    ctx.fillText(score.right.toString(), 450, 50);

    if (gameOver) {
      ctx.fillStyle = '#ff003c';
      ctx.font = 'bold 36px "Press Start 2P", monospace';
      ctx.fillText(`${winner === 'left' ? 'Left' : 'Right'} Player Wins!`, 400, 200);
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillText('Press Space to Restart', 400, 250);
    }
  }, [paddleLeft, paddleRight, ball, score, gameOver, winner]);

  // Game loop
  useEffect(() => {
    if (!running || gameOver) return;

    function loop() {
      setBall(prev => {
        let { x, y, dx, dy } = prev;
        let newX = x + dx;
        let newY = y + dy;
        let newDx = dx;
        let newDy = dy;

        // Wall collision (top/bottom)
        if (newY < 8 || newY > 392) {
          newDy = -dy;
        }

        // Paddle collision
        if (newX <= 30 && newY >= paddleLeft && newY <= paddleLeft + 80) {
          newDx = -dx * 1.1; // Increase speed slightly
          newDy = ((newY - (paddleLeft + 40)) / 40) * Math.abs(dx); // Add angle based on hit position
        }
        if (newX >= 770 && newY >= paddleRight && newY <= paddleRight + 80) {
          newDx = -dx * 1.1;
          newDy = ((newY - (paddleRight + 40)) / 40) * Math.abs(dx);
        }

        // Score points
        if (newX < 0) {
          setScore(s => {
            const newScore = { ...s, right: s.right + 1 };
            if (newScore.right >= 5) {
              setGameOver(true);
              setWinner('right');
              setRunning(false);
            }
            return newScore;
          });
          return { x: 400, y: 200, dx: 4, dy: 4 };
        }
        if (newX > 800) {
          setScore(s => {
            const newScore = { ...s, left: s.left + 1 };
            if (newScore.left >= 5) {
              setGameOver(true);
              setWinner('left');
              setRunning(false);
            }
            return newScore;
          });
          return { x: 400, y: 200, dx: -4, dy: 4 };
        }

        return { x: newX, y: newY, dx: newDx, dy: newDy };
      });

      // Paddle movement
      setPaddleLeft(prev => {
        let next = prev;
        if (wPressed.current) next -= 8;
        if (sPressed.current) next += 8;
        return Math.max(0, Math.min(320, next));
      });

      setPaddleRight(prev => {
        let next = prev;
        if (upPressed.current) next -= 8;
        if (downPressed.current) next += 8;
        return Math.max(0, Math.min(320, next));
      });

      animationRef.current = requestAnimationFrame(loop);
    }

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [running, gameOver, paddleLeft, paddleRight]);

  // Keyboard controls
  useEffect(() => {
    if (gameOver) return;

    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "KeyW", "KeyS", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'ArrowUp') upPressed.current = true;
      if (e.code === 'ArrowDown') downPressed.current = true;
      if (e.code === 'KeyW') wPressed.current = true;
      if (e.code === 'KeyS') sPressed.current = true;
      if (e.code === 'Space' && gameOver) reset();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') upPressed.current = false;
      if (e.code === 'ArrowDown') downPressed.current = false;
      if (e.code === 'KeyW') wPressed.current = false;
      if (e.code === 'KeyS') sPressed.current = false;
    };

    window.addEventListener('keydown', handleKey, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver]);

  // Reset game
  const reset = () => {
    setScore({ left: 0, right: 0 });
    setGameOver(false);
    setWinner(null);
    setPaddleLeft(150);
    setPaddleRight(150);
    setBall({ x: 400, y: 200, dx: 4, dy: 4 });
    setRunning(true);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-4 border-[#00ffe7] rounded bg-[#181824] shadow-xl arcade-glow"
          style={{ imageRendering: 'pixelated', fontFamily: ARCADE_FONT }}
        />
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 800,
          height: 400,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(transparent, transparent 6px, rgba(0,0,0,0.08) 8px)',
          borderRadius: 8,
          zIndex: 2
        }} />
      </div>
      <div className="mt-4 text-[#ff00cc] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Left: <b>{score.left}</b> &nbsp; Right: <b>{score.right}</b>
        {gameOver && (
          <span className="ml-4 text-red-500">Game Over <button className="ml-2 px-2 py-1 bg-[#00ffe7] text-black rounded" onClick={reset}>Restart</button></span>
        )}
      </div>
      <div className="mt-2 text-[#00ffe7] text-xs" style={{ fontFamily: ARCADE_FONT }}>
        Controls: W/S for left paddle, ↑/↓ for right paddle
      </div>
    </div>
  );
};

const GAME_LIST = [
  { id: 'trex', name: 'T-Rex Runner', icon: '🦖', component: TrexGame },
  { id: 'tetris', name: 'Tetris', icon: '🟦', component: TetrisGame },
  { id: 'snake', name: 'Snake', icon: '🐍', component: SnakeGame },
  { id: 'breakout', name: 'Breakout', icon: '🟩', component: BreakoutGame },
  { id: 'pong', name: 'Pong', icon: '🏓', component: PongGame },
];

const WaitingRoom = () => {
  const [activeGame, setActiveGame] = useState('trex');
  const ActiveGameComponent = GAME_LIST.find(g => g.id === activeGame)?.component || TrexGame;
  return (
    <div className="h-full flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#1a1a2e] to-[#23234d] dark:from-[#181824] dark:to-[#22223b]">
      <div className="max-w-4xl w-full p-8 rounded-2xl bg-[#181824]/90 dark:bg-[#181824]/90 backdrop-blur-sm shadow-2xl border-4 border-[#00ffe7] relative arcade-glow">
        <div className="flex items-center justify-center mb-8">
          <span className="text-4xl mr-3 drop-shadow-[0_0_8px_#00ffe7]">🕹️</span>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-[#00ffe7] to-[#ff00cc] bg-clip-text text-transparent drop-shadow-[0_0_8px_#00ffe7]" style={{ fontFamily: ARCADE_FONT, letterSpacing: 2 }}>
            Game Zone
          </h2>
        </div>
        <p className="text-lg text-[#e0e0e0] mb-6 max-w-2xl mx-auto" style={{ fontFamily: ARCADE_FONT, fontSize: '1rem' }}>
          Take a break and enjoy some classic games while your tasks are running!
          <span className="block text-xs text-[#00ffe7] mt-2" style={{ fontFamily: ARCADE_FONT }}>
            🎯 Score points, beat your high score, and have fun!
          </span>
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {GAME_LIST.map(game => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game.id)}
              className={`group relative px-5 py-4 rounded-full text-2xl border-4 transition-all duration-300 focus:outline-none shadow-lg
                ${activeGame === game.id
                  ? 'bg-gradient-to-br from-[#00ffe7] to-[#ff00cc] text-white border-[#fff] scale-110 arcade-glow'
                  : 'bg-[#23234d] text-[#00ffe7] border-[#00ffe7] hover:bg-[#1a1a2e] hover:scale-105'}
                `}
              style={{ fontFamily: ARCADE_FONT, minWidth: 80 }}
              title={game.name}
            >
              <span className="relative z-10 flex flex-col items-center">
                <span role="img" aria-label={game.name} className="text-3xl mb-1">{game.icon}</span>
                <span className="text-xs mt-1" style={{ fontFamily: ARCADE_FONT }}>{game.name}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex flex-col items-center">
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: '0 0 40px 8px #00ffe7, 0 0 80px 16px #ff00cc' }}></div>
          <div className="relative z-10 w-full flex justify-center">
            <div className="arcade-frame p-4 bg-[#23234d] rounded-xl border-4 border-[#ff00cc] shadow-2xl" style={{ maxWidth: 860 }}>
              <ActiveGameComponent />
            </div>
          </div>
        </div>
        <div className="mt-8 text-xs text-[#00ffe7]" style={{ fontFamily: ARCADE_FONT }}>
          <span className="inline-flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Your tasks are running in the background
          </span>
        </div>
      </div>
    </div>
  );
};

const TOOL_COMPONENTS: Record<string, any> = {
  'base64': Base64Tool,
  'rsa': RSATool,
  'keytab': KeytabTool,
  'api-tester': ApiTester,
  'kafka': KafkaTester,
  'regex': RegexTool,
  'time': TimeUnitsTool,
  'bson': BSONTool,
  'helm-secrets': HelmSecrets,
  'waiting-room': WaitingRoom,
};

const TOOL_LABELS: Record<string, string> = {
  'base64': 'Base64',
  'rsa': 'RSA',
  'keytab': 'Keytab',
  'api-tester': 'API Tester',
  'kafka': 'Kafka Tester',
  'regex': 'Regex',
  'time': 'Time Units',
  'bson': 'BSON Tools',
  'helm-secrets': 'Helm Secrets',
  'waiting-room': 'Waiting Room',
};

// Add tool icons mapping
const TOOL_ICONS: Record<string, any> = {
  'base64': CodeBracketIcon,
  'rsa': LockClosedIcon,
  'keytab': KeyIcon,
  'api-tester': CloudIcon,
  'kafka': CommandLineIcon,
  'regex': DocumentTextIcon,
  'time': ClockIcon,
  'bson': CubeTransparentIcon,
  'helm-secrets': ShieldCheckIcon,
  'waiting-room': FaceSmileIcon,
};

function App() {
  const { currentTool, setCurrentTool } = useTheme();
  const [tabs, setTabs] = useState([
    { id: 'api-tester-1', tool: 'api-tester', label: 'API Tester' }
  ]);
  const [activeTabId, setActiveTabId] = useState('api-tester-1');
  // Map: tabId -> { ...tool-specific state } (for future per-tab state)

  // Open a new tab or focus existing
  const openToolTab = (tool: string) => {
    // Try to find an existing tab for this tool (single instance per tool for now)
    let tab = tabs.find(t => t.tool === tool);
    if (!tab) {
      // Unique id for each tab (tool + index)
      const count = tabs.filter(t => t.tool === tool).length;
      const id = `${tool}-${count + 1}`;
      tab = { id, tool, label: TOOL_LABELS[tool] || tool };
      setTabs(prev => [...prev, tab!]);
    }
    setActiveTabId(tab.id);
    setCurrentTool(tool); // For sidebar highlight
  };

  // Close a tab
  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);
      // If closing the active tab, switch to the previous or next tab
      if (activeTabId === tabId && newTabs.length > 0) {
        const newIdx = idx > 0 ? idx - 1 : 0;
        setActiveTabId(newTabs[newIdx].id);
        setCurrentTool(newTabs[newIdx].tool);
      } else if (newTabs.length === 0) {
        setActiveTabId('');
        setCurrentTool('');
      }
      return newTabs;
    });
  };

  // Switch tab
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) setCurrentTool(tab.tool);
  };

  // Render the active tab's tool
  const renderActiveTab = () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) {
      return (
        <div className="h-full flex items-center justify-center">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Select a tool to get started
          </h1>
        </div>
      );
    }
    const ToolComponent = TOOL_COMPONENTS[tab.tool];
    return ToolComponent ? <ToolComponent /> : null;
  };

  return (
    <Layout
      currentTool={currentTool}
      setCurrentTool={openToolTab}
      tabBar={
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80">
          {tabs.map(tab => {
            const Icon = TOOL_ICONS[tab.tool];
            return (
              <div
                key={tab.id}
                className={`flex items-center px-3 py-1.5 cursor-pointer border-b-2 transition-colors
                  ${activeTabId === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                `}
                onClick={() => switchTab(tab.id)}
              >
                {Icon && <Icon className="w-4 h-4 mr-1.5" />}
                <span className="text-xs font-medium">{tab.label}</span>
                {tabs.length > 1 && (
                  <button
                    className="ml-1.5 text-gray-400 hover:text-red-500 focus:outline-none"
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    title="Close tab"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      }
    >
      {/* Active Tool */}
      <div className="flex-1 min-h-0">
        {renderActiveTab()}
      </div>
    </Layout>
  );
}

export default App;