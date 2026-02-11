import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;
const MIN_SPEED = 50;

const SnakeGame = () => {
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 15, y: 15 });
    const [direction, setDirection] = useState('RIGHT');
    const [nextDirection, setNextDirection] = useState('RIGHT');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(
        parseInt(localStorage.getItem('snakeHighScore') || '0', 10)
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [isMuted, setIsMuted] = useState(false);

    const gameLoopRef = useRef(null);
    const boardRef = useRef(null);
    const touchStartRef = useRef(null);
    const lastMoveDirection = useRef('RIGHT');

    // Sound Effect helper using AudioContext
    const playSound = useCallback((type) => {
        if (isMuted) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'eat') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'die') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'move') {
                // Subtle click sound
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [isMuted]);

    const generateFood = useCallback((currentSnake) => {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            // Check if food is on snake
            const onSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
            if (!onSnake) break;
        }
        return newFood;
    }, []);

    const resetGame = () => {
        setSnake([{ x: 10, y: 10 }]);
        setFood(generateFood([{ x: 10, y: 10 }]));
        setDirection('RIGHT');
        setNextDirection('RIGHT');
        setScore(0);
        setSpeed(INITIAL_SPEED);
        setIsGameOver(false);
        setIsPlaying(true);
        playSound('move');
    };

    const handleCreateFood = useCallback(() => {
        setFood(prev => generateFood(snake));
    }, [snake, generateFood]);



    const moveSnake = useCallback(() => {
        if (isGameOver || !isPlaying) return;

        setDirection(nextDirection);
        lastMoveDirection.current = nextDirection;
        const head = { ...snake[0] };

        switch (nextDirection) {
            case 'UP': head.y -= 1; break;
            case 'DOWN': head.y += 1; break;
            case 'LEFT': head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
            default: break;
        }

        // Check collision with walls
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            gameOver();
            return;
        }

        // Check collision with self
        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            gameOver();
            return;
        }

        const newSnake = [head, ...snake];

        // Check if food eaten
        if (head.x === food.x && head.y === food.y) {
            setScore(s => {
                const newScore = s + 10;
                if (newScore > highScore) {
                    setHighScore(newScore);
                    localStorage.setItem('snakeHighScore', newScore.toString());
                }
                return newScore;
            });
            setFood(generateFood(newSnake));
            setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
            playSound('eat');
        } else {
            newSnake.pop(); // Remove tail
        }

        setSnake(newSnake);
    }, [snake, nextDirection, food, isGameOver, isPlaying, highScore, generateFood, playSound]);

    const gameOver = () => {
        setIsGameOver(true);
        setIsPlaying(false);
        playSound('die');
    };

    // Game Loop
    useEffect(() => {
        if (isPlaying && !isGameOver) {
            gameLoopRef.current = setInterval(moveSnake, speed);
        } else {
            clearInterval(gameLoopRef.current);
        }
        return () => clearInterval(gameLoopRef.current);
    }, [isPlaying, isGameOver, speed, moveSnake]);

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Prevent scrolling with arrows
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (isGameOver && e.key === 'Enter') {
                resetGame();
                return;
            }

            if (e.key === ' ' && !isGameOver) {
                setIsPlaying(prev => !prev);
                return;
            }

            if (!isPlaying) return;

            const currentDir = lastMoveDirection.current;
            switch (e.key) {
                case 'ArrowUp':
                    if (currentDir !== 'DOWN') setNextDirection('UP');
                    break;
                case 'ArrowDown':
                    if (currentDir !== 'UP') setNextDirection('DOWN');
                    break;
                case 'ArrowLeft':
                    if (currentDir !== 'RIGHT') setNextDirection('LEFT');
                    break;
                case 'ArrowRight':
                    if (currentDir !== 'LEFT') setNextDirection('RIGHT');
                    break;
                default: break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [direction, isPlaying, isGameOver]);

    // Touch Controls
    const handleTouchStart = (e) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchEnd = (e) => {
        if (!touchStartRef.current || !isPlaying) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - touchStartRef.current.x;
        const diffY = endY - touchStartRef.current.y;

        const currentDir = lastMoveDirection.current;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal
            if (Math.abs(diffX) > 30) { // Threshold
                if (diffX > 0 && currentDir !== 'LEFT') setNextDirection('RIGHT');
                else if (diffX < 0 && currentDir !== 'RIGHT') setNextDirection('LEFT');
            }
        } else {
            // Vertical
            if (Math.abs(diffY) > 30) {
                if (diffY > 0 && currentDir !== 'UP') setNextDirection('DOWN');
                else if (diffY < 0 && currentDir !== 'DOWN') setNextDirection('UP');
            }
        }
        touchStartRef.current = null;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white font-sans p-4 touch-none">
            <div className="mb-4 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
                    Neon Snake
                </h1>
                <div className="flex gap-6 justify-center text-sm md:text-base">
                    <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-gray-400">Best:</span>
                        <span className="font-bold text-white">{highScore}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                        <span className="text-gray-400">Score:</span>
                        <span className="font-bold text-white">{score}</span>
                    </div>
                </div>
            </div>

            <div
                className="relative bg-gray-800 rounded-xl border-4 border-gray-700 shadow-2xl overflow-hidden"
                style={{
                    width: 'min(90vw, 400px)',
                    height: 'min(90vw, 400px)',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Render Grid Cells (optional for visual effect) */}

                {/* Render Snake */}
                {snake.map((segment, index) => {
                    const isHead = index === 0;
                    return (
                        <div
                            key={`${segment.x}-${segment.y}-${index}`}
                            className={`${isHead ? 'bg-green-400 z-10' : 'bg-green-600 z-0'} rounded-sm transition-all duration-100`}
                            style={{
                                gridColumnStart: segment.x + 1,
                                gridRowStart: segment.y + 1,
                                boxShadow: isHead ? '0 0 10px #4ade80' : 'none'
                            }}
                        >
                            {isHead && (
                                <div className="relative w-full h-full">
                                    <div className={`absolute w-1.5 h-1.5 bg-black rounded-full 
                        ${direction === 'UP' ? 'top-0 left-0.5' :
                                            direction === 'DOWN' ? 'bottom-0 left-0.5' :
                                                direction === 'LEFT' ? 'top-0.5 left-0' :
                                                    'top-0.5 right-0'}`} />
                                    <div className={`absolute w-1.5 h-1.5 bg-black rounded-full
                        ${direction === 'UP' ? 'top-0 right-0.5' :
                                            direction === 'DOWN' ? 'bottom-0 right-0.5' :
                                                direction === 'LEFT' ? 'bottom-0.5 left-0' :
                                                    'bottom-0.5 right-0'}`} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Render Food */}
                <div
                    className="bg-red-500 rounded-full animate-pulse z-10"
                    style={{
                        gridColumnStart: food.x + 1,
                        gridRowStart: food.y + 1,
                        boxShadow: '0 0 15px #ef4444'
                    }}
                />

                {/* Overlays */}
                {!isPlaying && !isGameOver && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
                        >
                            <Play className="w-6 h-6" /> Start Game
                        </button>
                        <p className="mt-4 text-gray-300 text-sm">Use arrow keys or swipe (mobile)</p>
                    </div>
                )}

                {isGameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in duration-300">
                        <h2 className="text-3xl font-bold text-red-500 mb-2">Game Over!</h2>
                        <p className="text-white mb-6">Score: {score}</p>
                        <button
                            onClick={resetGame}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
                        >
                            <RotateCcw className="w-5 h-5" /> Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="mt-6 flex gap-4">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition"
                >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                <button
                    onClick={resetGame}
                    className="p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition"
                    title="Restart"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>
                <button
                    onClick={() => !isGameOver && setIsPlaying(!isPlaying)}
                    className="p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition"
                >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile D-Pad (Visible only on small screens maybe, or always for touch users if swipe is hard) */}
            <div className="mt-8 grid grid-cols-3 gap-2 md:hidden">
                <div />
                <button
                    className="p-4 bg-gray-800 rounded-lg active:bg-gray-700"
                    onClick={() => lastMoveDirection.current !== 'DOWN' && setNextDirection('UP')}
                >
                    <ChevronUp className="w-6 h-6" />
                </button>
                <div />
                <button
                    className="p-4 bg-gray-800 rounded-lg active:bg-gray-700"
                    onClick={() => lastMoveDirection.current !== 'RIGHT' && setNextDirection('LEFT')}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    className="p-4 bg-gray-800 rounded-lg active:bg-gray-700"
                    onClick={() => lastMoveDirection.current !== 'UP' && setNextDirection('DOWN')}
                >
                    <ChevronDown className="w-6 h-6" />
                </button>
                <button
                    className="p-4 bg-gray-800 rounded-lg active:bg-gray-700"
                    onClick={() => lastMoveDirection.current !== 'LEFT' && setNextDirection('RIGHT')}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default SnakeGame;
