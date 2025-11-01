import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './game.css'; // <-- 1. IMPORT YOUR NEW CSS FILE

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
  if (!word.includes(' ')) difficulty += 1; 
  
  const uniqueLetters = new Set(word.replace(' ', ''));
  let uncommonLetters = 0;
  uniqueLetters.forEach(letter => {
    if (!COMMON_LETTERS.has(letter)) {
      uncommonLetters++;
    }
  });
  if (uniqueLetters.size > 0 && (uncommonLetters / uniqueLetters.size > 0.5)) {
    difficulty += 1;
  }
  
  return difficulty;
};

// --- React Components ---

/**
 * 1. LetterDisplay Component
 */
const LetterDisplay = ({ word, guessedLetters }) => {
  const letters = useMemo(() => word.split(''), [word]);

  return (
    <div className="letter-display">
      {letters.map((letter, index) => {
        if (letter === ' ') {
          return <div key={index} className="letter-space" />;
        }
        
        const isGuessed = guessedLetters.has(letter);
        
        return (
          <div key={index} className="letter-box">
            {/* The fill-up animation div */}
            <div 
              className="letter-fill"
              style={{ height: isGuessed ? '100%' : '0%' }}
            />
            {/* The letter, visible only when guessed */}
            <span className={`letter-text ${isGuessed ? 'is-guessed' : ''}`}>
              {letter}
            </span>
            {/* The hidden letter for layout calculation */}
            <span className="letter-hidden">
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
 */
const Keyboard = ({ onGuess, guessedLetters }) => {
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="keyboard">
      {keys.map(key => {
        const isGuessed = guessedLetters.has(key);
        return (
          <button
            key={key}
            onClick={() => onGuess(key)}
            disabled={isGuessed}
            className="key"
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
    <form onSubmit={handleSubmit} className="guess-form">
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Guess the tree!"
        className="guess-input"
      />
      <button 
        type="submit"
        className="guess-button"
      >
        Guess
      </button>
    </form>
  );
};

/**
 * 5. Main App Component
 */
export default function App() {
  const [wordList, setWordList] = useState([]);
  const [currentWord, setCurrentWord] = useState("LOADING");
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [inputMode, setInputMode] = useState('letter'); // 'letter' or 'word'
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [message, setMessage] = useState(''); // For win/lose/error messages

  const MAX_WRONG_GUESSES = 6;

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
  
  // Effect 2: Start Game (when wordlist is ready)
  useEffect(() => {
    if (wordList.length > 0) {
      startNewGame();
    }
  }, [wordList]); 

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
    }
    
    // Check for Loss
    else if (wrongGuesses >= MAX_WRONG_GUESSES) {
      setGameState('lost');
      setMessage(`Game over! The tree was: ${currentWord}`);
    }
  }, [guessedLetters, wrongGuesses, gameState, currentWord]);

  // --- Event Handlers ---

  const handleGuessLetter = (letter) => {
    if (gameState !== 'playing' || guessedLetters.has(letter)) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    if (currentWord.includes(letter)) {
      let letterPoints = COMMON_LETTERS.has(letter) 
        ? POINTS_PER_CORRECT_LETTER 
        : POINTS_PER_CORRECT_LETTER * 2;
      setScore(score + letterPoints);
    } else {
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
      setGuessedLetters(new Set([...guessedLetters, ...uniqueLettersInWord]));
    } else {
      // Lose!
      setScore(score + PENALTY_PER_WRONG_WORD);
      setGameState('lost');
      setMessage(`Sorry, that's not it! The tree was: ${currentWord}`);
    }
  };

  if (currentWord === "LOADING") {
    return (
      <div className="loading-screen">
        <h1 className="loading-title">Loading Treeguessr...</h1>
      </div>
    );
  }

  return (
    <div className="game-app">
      {/* Header */}
      <header className="game-header">
        <div className="header-spacer"></div>
        <h1 className="header-title">
          <span className="header-title-span">Tree</span>guessr
        </h1>
        <div className="header-spacer"></div>
      </header>

      {/* Main Game Area */}
      <main className="game-main">
        {/* Game State Message */}
        {gameState !== 'playing' && (
          <div className="game-message-box">
            <h2 className="game-message-text">{message}</h2>
            <button
              onClick={startNewGame}
              className="play-again-button"
            >
              Play Again
            </button>
          </div>
        )}
        
        {/* Score & Difficulty */}
        <div className="score-bar">
          <div className="score-box">
            Score: <span className="score-box-score">{score}</span>
          </div>
          <div className="score-box">
            Wrong Guesses: <span className="score-box-wrong">{wrongGuesses} / {MAX_WRONG_GUESSES}</span>
          </div>
        </div>

        {/* Letter Display */}
        <LetterDisplay word={currentWord} guessedLetters={guessedLetters} />

        {/* Input Mode Tabs */}
        <div className="input-tabs">
          <button
            onClick={() => setInputMode('letter')}
            className={`input-tab ${inputMode === 'letter' ? 'active' : ''}`}
          >
            Guess A Letter
          </button>
          <button
            onClick={() => setInputMode('word')}
            className={`input-tab ${inputMode === 'word' ? 'active' : ''}`}
          >
            Guess The Tree!
          </button>
        </div>

        {/* Keyboard or Word Input */}
        <div className="input-area">
          {inputMode === 'letter' ? (
            <Keyboard onGuess={handleGuessLetter} guessedLetters={guessedLetters} />
          ) : (
            <GuessWordInput onGuessWord={handleGuessWord} />
          )}
        </div>
      </main>
    </div>
  );
}