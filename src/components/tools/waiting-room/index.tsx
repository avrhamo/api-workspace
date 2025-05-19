import React, { useState, useEffect, useRef } from 'react';
import { BaseToolProps } from '../types';

const GAMES = [
  { name: 'Tetris', key: 'tetris', available: true },
  { name: 'Dinosaur Runner', key: 'dino', available: false },
  { name: 'Sudoku', key: 'sudoku', available: false },
  { name: 'CheckMate', key: 'checkmate', available: false },
  { name: 'Ping Ball Wall', key: 'pingball', available: false },
];

const retroFont = {
  fontFamily: 'Press Start 2P, Courier, monospace',
};

// Placeholder Tetris component (replace with real one later)
const TetrisGame = ({ onBack }: { onBack: () => void }) => (
  <div className="flex flex-col items-center justify-center w-full h-full" style={{ minHeight: '32vh', minWidth: '32vw' }}>
    <div className="text-4xl text-pink-400 mb-10" style={retroFont}>Tetris (Coming Back Soon!)</div>
    <div className="bg-gray-900 border-8 border-pink-400 rounded-3xl flex items-center justify-center shadow-2xl" style={{ width: '200px', height: '300px', maxWidth: '90vw', maxHeight: '80vh' }}>
      <span className="text-pink-200 text-2xl" style={retroFont}>[Tetris Game Here]</span>
    </div>
    <button
      className="mt-12 px-8 py-4 bg-pink-600 text-white rounded-xl text-2xl shadow-lg hover:bg-pink-700 transition-all"
      style={retroFont}
      onClick={onBack}
    >
      ⬅ Back to Menu
    </button>
  </div>
);

const WaitingRoom: React.FC<BaseToolProps> = () => {
  const [selected, setSelected] = useState(0);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeGame) return; // Don't handle menu keys if in a game
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setSelected(prev => (prev === 0 ? GAMES.length - 1 : prev - 1));
      } else if (e.key === 'ArrowDown') {
        setSelected(prev => (prev === GAMES.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'Enter') {
        if (!GAMES[selected].available) {
          setShowComingSoon(true);
          setTimeout(() => setShowComingSoon(false), 1200);
        } else {
          setActiveGame(GAMES[selected].key);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, activeGame]);

  // Render Tetris if active
  if (activeGame === 'tetris') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-black scanlines" style={{ minHeight: '100vh', ...retroFont }}>
        <TetrisGame onBack={() => setActiveGame(null)} />
        <style>{`
          .scanlines::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            pointer-events: none;
            background: repeating-linear-gradient(
              to bottom,
              rgba(255,255,255,0.04) 0px,
              rgba(255,255,255,0.04) 1px,
              transparent 1px,
              transparent 4px
            );
            z-index: 10;
            mix-blend-mode: overlay;
            animation: scanline-move 2s linear infinite;
          }
          @keyframes scanline-move {
            0% { background-position-y: 0; }
            100% { background-position-y: 4px; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="h-full w-full flex flex-col items-center justify-center bg-black scanlines"
      style={{ minHeight: '100vh', ...retroFont }}
    >
      <div className="mb-12 flex flex-col items-center">
        <div
          className="text-6xl md:text-7xl text-pink-400 drop-shadow-lg mb-6 animate-pulse"
          style={{ letterSpacing: '0.1em', ...retroFont }}
        >
          🕹️ Retro Arcade
        </div>
        <div className="text-green-300 text-3xl md:text-4xl tracking-widest mb-6" style={retroFont}>
          Waiting Room
        </div>
        <div className="text-yellow-300 text-2xl md:text-2xl mb-6" style={retroFont}>
          Use ↑ ↓ to select, Enter to play
        </div>
      </div>
      <div
        className="rounded-3xl border-8 border-pink-400 shadow-2xl px-20 py-16 bg-gradient-to-br from-gray-900 to-black flex flex-col items-center"
        style={{ minWidth: 700, maxWidth: 900 }}
      >
        {GAMES.map((game, idx) => (
          <div
            key={game.key}
            className={`flex items-center justify-between px-10 py-6 my-5 rounded-xl transition-all duration-150
              ${selected === idx
                ? 'bg-pink-600/80 text-white shadow-lg scale-105 neon-glow'
                : 'bg-gray-800 text-pink-200'
              }
              ${!game.available ? 'opacity-60' : ''}`}
            style={{
              fontSize: '2rem',
              cursor: 'pointer',
              border: selected === idx ? '2px solid #fff' : '2px solid transparent',
              ...retroFont,
              filter: selected === idx ? 'drop-shadow(0 0 12px #ff00cc)' : 'none',
            }}
            onClick={() => {
              setSelected(idx);
              if (!game.available) {
                setShowComingSoon(true);
                setTimeout(() => setShowComingSoon(false), 1200);
              } else {
                setActiveGame(game.key);
              }
            }}
          >
            <span>{game.name}</span>
            {!game.available && <span className="text-yellow-300 ml-8" style={retroFont}>Coming Soon!</span>}
          </div>
        ))}
      </div>
      {showComingSoon && (
        <div className="mt-12 text-yellow-300 text-3xl animate-bounce" style={retroFont}>
          🚧 Coming Soon!
        </div>
      )}
      <div className="mt-24 text-pink-300 text-2xl opacity-70" style={retroFont}>
        Insert Coin to Continue
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .neon-glow {
          box-shadow: 0 0 16px #ff00cc, 0 0 32px #ff00cc, 0 0 64px #ff00cc;
        }
        .scanlines::before {
          content: '';
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.04) 0px,
            rgba(255,255,255,0.04) 1px,
            transparent 1px,
            transparent 4px
          );
          z-index: 10;
          mix-blend-mode: overlay;
          animation: scanline-move 2s linear infinite;
        }
        @keyframes scanline-move {
          0% { background-position-y: 0; }
          100% { background-position-y: 4px; }
        }
      `}</style>
    </div>
  );
};

export default WaitingRoom; 