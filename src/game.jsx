import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Scoring Constants ---
const POINTS_PER_CORRECT_LETTER = 10;
const POINTS_PER_WORD_GUESS = 100;
const PENALTY_PER_WRONG_LETTER = -5;
const PENALTY_PER_WRONG_WORD = -25;
const COMMON_LETTERS = new Set(['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R']);

// --- Helper Functions ---
const pickRandomWord = (words) => {
  if (!words || words.length === 0) return "LOADING";
  return words[Math.floor(Math.random() * words.length)];
};

const calculateWordDifficulty = (word) => {
  let difficulty = 1;
  if (word.length > 10) difficulty += 1;
  if (!word.includes(' ')) difficulty += 1; // Single word is harder
  
  const uniqueLetters = new Set(word.replace(' ', ''));
  let uncommonLetters = 0;
  uniqueLetters.forEach(letter => {
    if (!COMMON_LETTERS.has(letter)) {
      uncommonLetters++;
    }
  });
  // Avoid division by zero if word is just spaces (though wordlist shouldn't have this)
  if (uniqueLetters.size > 0 && (uncommonLetters / uniqueLetters.size > 0.5)) {
    difficulty += 1;
  }
  
  return difficulty;
};

// --- React Components ---

/**
 * 1. LetterDisplay Component
 * Renders the individual letter boxes for the word to guess.
 */
const LetterDisplay = ({ word, guessedLetters }) => {
  const letters = useMemo(() => word.split(''), [word]);

  return (
    <div className="flex flex-wrap justify-center gap-2 p-4">
      {letters.map((letter, index) => {
        if (letter === ' ') {
          return <div key={index} className="w-8 h-10 md:w-12 md:h-14" />;
        }
        
        const isGuessed = guessedLetters.has(letter);
        
        return (
          <div 
            key={index} 
            className="relative flex items-center justify-center w-8 h-10 text-2xl font-bold uppercase transition-all duration-300 bg-gray-200 border-2 border-gray-400 rounded-md md:w-12 md:h-14 md:text-4xl"
          >
            {/* The fill-up animation div */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-500 ease-out"
              style={{ height: isGuessed ? '100%' : '0%' }}
            />
            {/* The letter, visible only when guessed */}
            <span className={`relative transition-opacity duration-300 ${isGuessed ? 'opacity-100 text-white' : 'opacity-0'}`}>
              {letter}
            </span>
            {/* The hidden letter for layout calculation (optional but good) */}
            <span className="absolute text-transparent">
              {letter}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * 2. Keyboard Component
 * Renders the A-Z keyboard for guessing letters.
 */
const Keyboard = ({ onGuess, guessedLetters }) => {
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="flex flex-wrap justify-center gap-2 p-2 md:p-4">
      {keys.map(key => {
        const isGuessed = guessedLetters.has(key);
        return (
          <button
            key={key}
            onClick={() => onGuess(key)}
            disabled={isGuessed}
            className={`
              w-9 h-11 md:w-12 md:h-14 text-lg md:text-xl font-semibold rounded-md 
              transition-all duration-200
              ${isGuessed 
                ? 'bg-gray-400 text-gray-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600 active:transform active:scale-95'
              }
            `}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};

/**
 * 3. GuessWordInput Component
 * Renders the input field for guessing the whole word.
 */
const GuessWordInput = ({ onGuessWord }) => {
  const [guess, setGuess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (guess.trim()) {
      onGuessWord(guess.trim().toUpperCase());
      setGuess('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2 p-4">
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Guess the tree!"
        className="flex-grow p-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
      />
      <button 
        type="submit"
        className="px-6 py-3 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 active:transform active:scale-95"
      >
        Guess
      </button>
    </form>
  );
};

// --- Removed StatsModal Component ---

/**
 * 5. Main App Component
 * Manages all game logic and state.
 */
export default function App() {
  const [wordList, setWordList] = useState([]);
  const [currentWord, setCurrentWord] = useState("LOADING");
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [inputMode, setInputMode] = useState('letter'); // 'letter' or 'word'
  
  // --- Removed Firebase & Stats State ---
  
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [message, setMessage] = useState(''); // For win/lose/error messages

  const MAX_WRONG_GUESSES = 6;

  // --- Data Loading Effects ---

  // --- Removed Firebase Auth Effect ---

  // Effect 1: Load Word List
  useEffect(() => {
    fetch('wordlist.txt')
      .then(response => response.text())
      .then(text => {
        const words = text.split('\n').filter(Boolean);
        setWordList(words);
      })
      .catch(error => {
        console.error("Error loading wordlist:", error);
        setMessage("Could not load tree list.");
      });
  }, []);
  
  // --- Removed Stats & Leaderboard Load Effect ---

  // Effect 2: Start Game (when wordlist is ready)
  useEffect(() => {
    if (wordList.length > 0) {
      startNewGame();
    }
  }, [wordList]); // Only depends on wordList now

  // --- Game Logic Functions ---

  const startNewGame = useCallback(() => {
    const newWord = pickRandomWord(wordList);
    setCurrentWord(newWord);
    setDifficulty(calculateWordDifficulty(newWord));
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setScore(0);
    setGameState('playing');
    setMessage('');
    setInputMode('letter');
  }, [wordList]);

  // Check for Win/Loss condition
  const uniqueLettersInWord = useMemo(() => {
    return new Set(currentWord.replace(/ /g, ''));
  }, [currentWord]);

  useEffect(() => {
    if (gameState !== 'playing' || currentWord === "LOADING") return;

    // Check for Win
    if (uniqueLettersInWord.size > 0 && 
        [...uniqueLettersInWord].every(letter => guessedLetters.has(letter))) {
      setGameState('won');
      const finalScore = score + (POINTS_PER_WORD_GUESS * difficulty);
      setScore(finalScore);
      setMessage(`You got it! It was ${currentWord}. Final Score: ${finalScore}`);
      // Removed call to updateUserStats()
    }
    
    // Check for Loss
    else if (wrongGuesses >= MAX_WRONG_GUESSES) {
      setGameState('lost');
      setMessage(`Game over! The tree was: ${currentWord}`);
      // Removed call to updateUserStats()
    }
  }, [guessedLetters, wrongGuesses, gameState, currentWord]);

  // --- Removed Database Update Function ---

  // --- Event Handlers ---

  const handleGuessLetter = (letter) => {
    if (gameState !== 'playing' || guessedLetters.has(letter)) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    if (currentWord.includes(letter)) {
      // Correct guess
      let letterPoints = COMMON_LETTERS.has(letter) 
        ? POINTS_PER_CORRECT_LETTER 
        : POINTS_PER_CORRECT_LETTER * 2;
      setScore(score + letterPoints);
    } else {
      // Wrong guess
      setWrongGuesses(wrongGuesses + 1);
      setScore(score + PENALTY_PER_WRONG_LETTER);
    }
  };

  const handleGuessWord = (wordGuess) => {
    if (gameState !== 'playing') return;

    if (wordGuess === currentWord) {
      // Win!
      const finalScore = score + (POINTS_PER_WORD_GUESS * difficulty) + (POINTS_PER_CORRECT_LETTER * uniqueLettersInWord.size);
      setScore(finalScore);
      setGameState('won');
      setMessage(`You got it! It was ${currentWord}. Final Score: ${finalScore}`);
      // Mark all letters as guessed for visual feedback
      setGuessedLetters(new Set([...guessedLetters, ...uniqueLettersInWord]));
      // Removed call to updateUserStats()
    } else {
      // Lose!
      setScore(score + PENALTY_PER_WRONG_WORD);
      setGameState('lost');
      setMessage(`Sorry, that's not it! The tree was: ${currentWord}`);
      // Removed call to updateUserStats()
    }
  };

  if (currentWord === "LOADING") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-4xl font-bold text-green-800 animate-pulse">Loading Treeguessr...</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between p-4 text-white bg-green-800 shadow-md">
        {/* Removed Stats Button, added placeholder for spacing */}
        <div className="w-8 h-8"></div>
        <h1 className="text-3xl font-bold">
          <span className="text-green-300">Tree</span>guessr
        </h1>
        {/* Placeholder for settings icon */}
        <div className="w-8 h-8"></div>
      </header>

      {/* Main Game Area */}
      <main className="flex flex-col items-center flex-grow w-full max-w-2xl p-4 mx-auto">
        {/* Game State Message */}
        {gameState !== 'playing' && (
          <div className="flex flex-col items-center w-full p-4 mb-4 text-center text-white bg-blue-600 rounded-lg shadow-lg">
            <h2 className="mb-2 text-2xl font-bold">{message}</h2>
            <button
              onClick={startNewGame}
              className="px-6 py-2 font-semibold text-blue-700 bg-white rounded-full hover:bg-gray-100"
            >
              Play Again
            </button>
          </div>
        )}
        
        {/* Score & Difficulty */}
        <div className="flex justify-between w-full mb-4">
          <div className="p-3 text-lg font-semibold text-white bg-gray-700 rounded-lg">
            Score: <span className="font-bold text-green-300">{score}</span>
          </div>
          <div className="p-3 text-lg font-semibold text-white bg-gray-700 rounded-lg">
            Wrong Guesses: <span className="font-bold text-red-400">{wrongGuesses} / {MAX_WRONG_GUESSES}</span>
          </div>
        </div>

        {/* Letter Display */}
        <LetterDisplay word={currentWord} guessedLetters={guessedLetters} />

        {/* Input Mode Tabs */}
        <div className="flex w-full mt-4 border-b-2 border-gray-300">
          <button
            onClick={() => setInputMode('letter')}
            className={`flex-1 p-3 text-lg font-semibold text-center ${inputMode === 'letter' ? 'text-green-700 border-b-4 border-green-700' : 'text-gray-500'}`}
          >
            Guess A Letter
          </button>
          <button
            onClick={() => setInputMode('word')}
            className={`flex-1 p-3 text-lg font-semibold text-center ${inputMode === 'word' ? 'text-green-700 border-b-4 border-green-700' : 'text-gray-500'}`}
          >
            Guess The Tree!
          </button>
        </div>

        {/* Keyboard or Word Input */}
        <div className="w-full mt-2">
          {inputMode === 'letter' ? (
            <Keyboard onGuess={handleGuessLetter} guessedLetters={guessedLetters} />
          ) : (
            <GuessWordInput onGuessWord={handleGuessWord} />
          )}
        </div>
      </main>

      {/* --- Removed Stats Modal --- */}
    </div>
  );
}

