import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './game.css'; 

// --- Scoring Constants (Fix 3) ---
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const COST_PER_VOWEL = 15;
const COST_PER_CONSONANT = 5;
const STARTING_SCORE = 100;
const MIN_SCORE = 5;
const STARTING_WORD_GUESSES = 5;

// --- Helper Functions ---
const pickRandomWord = (words) => {
  if (!words || words.length === 0) return "LOADING";
  return words[Math.floor(Math.random() * words.length)];
};

// (calculateWordDifficulty is no longer used for scoring, but we can keep it)
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
 * 1. LetterDisplay Component (Fix 2: Word wrapping)
 */
const LetterDisplay = ({ word, guessedLetters }) => {
  // Split by space to get words
  const words = useMemo(() => word.split(' '), [word]);

  return (
    <div className="letter-display">
      {words.map((wordString, wordIndex) => (
        // Use a Fragment to group the word and the space after it
        <React.Fragment key={wordIndex}>
          {/* Container for letters in a single word */}
          <div className="word-container">
            {wordString.split('').map((letter, letterIndex) => {
              const isGuessed = guessedLetters.has(letter);
              return (
                <div key={`${wordIndex}-${letterIndex}`} className="letter-box">
                  <div 
                    className="letter-fill"
                    style={{ height: isGuessed ? '100%' : '0%' }}
                  />
                  <span className={`letter-text ${isGuessed ? 'is-guessed' : ''}`}>
                    {letter}
                  </span>
                  <span className="letter-hidden">
                    {letter}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Add a space element if it's not the last word */}
          {wordIndex < words.length - 1 && <div className="letter-space" />}
        </React.Fragment>
      ))}
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
  
  // --- State for new Game Logic (Fix 3) ---
  const [score, setScore] = useState(STARTING_SCORE);
  const [wordGuessesLeft, setWordGuessesLeft] = useState(STARTING_WORD_GUESSES);
  // --- Removed wrongGuesses state ---

  const [inputMode, setInputMode] = useState('letter');
  const [gameState, setGameState] = useState('playing');
  const [message, setMessage] = useState('');

  // Effect 1: Load Word List
  useEffect(() => {
    fetch('wordlist.txt')
      .then(response => response.text())
      .then(text => {
        // (Fix 1: Clean up words)
        const words = text.split('\n')
                          .map(word => word.trim()) // Removes \r and other whitespace
                          .filter(Boolean); // Removes empty strings
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

  // --- Game Logic Functions (Fix 3) ---

  const startNewGame = useCallback(() => {
    const newWord = pickRandomWord(wordList);
    setCurrentWord(newWord);
    setGuessedLetters(new Set());
    setScore(STARTING_SCORE); // Reset score to 100
    setWordGuessesLeft(STARTING_WORD_GUESSES); // Reset word guesses
    setGameState('playing');
    setMessage('');
    setInputMode('letter');
  }, [wordList]);

  // Check for Win condition
  const uniqueLettersInWord = useMemo(() => {
    return new Set(currentWord.replace(/ /g, ''));
  }, [currentWord]);

  useEffect(() => {
    if (gameState !== 'playing' || currentWord === "LOADING") return;

    // Check for Win by guessing all letters
    if (uniqueLettersInWord.size > 0 && 
        [...uniqueLettersInWord].every(letter => guessedLetters.has(letter))) {
      setGameState('won');
      setMessage(`You got it! It was ${currentWord}. Final Score: ${score}`);
    }
    
    // Loss conditions are now handled *inside* the guess handlers

  }, [guessedLetters, gameState, currentWord, uniqueLettersInWord, score]); // Added score to deps

  // --- Event Handlers (Fix 3) ---

  const handleGuessLetter = (letter) => {
    if (gameState !== 'playing' || guessedLetters.has(letter)) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    // Calculate cost of the guess
    const cost = VOWELS.has(letter) ? COST_PER_VOWEL : COST_PER_CONSONANT;
    const newScore = score - cost;

    // Check for game loss
    if (newScore <= MIN_SCORE) {
      setScore(MIN_SCORE); // Clamp score at min
      setGameState('lost');
      setMessage(`You ran out of points! The tree was: ${currentWord}`);
    } else {
      setScore(newScore);
    }
  };

  const handleGuessWord = (wordGuess) => {
    if (gameState !== 'playing') return;

    if (wordGuess === currentWord) {
      // Win!
      setGameState('won');
      setMessage(`You got it! It was ${currentWord}. Final Score: ${score}`);
      // Mark all letters as guessed for visual feedback
      setGuessedLetters(new Set([...guessedLetters, ...uniqueLettersInWord]));
    } else {
      // Wrong guess
      const newGuessesLeft = wordGuessesLeft - 1;
      setWordGuessesLeft(newGuessesLeft);

      if (newGuessesLeft <= 0) {
        // Lose!
        setGameState('lost');
        setMessage(`You're out of tree guesses! The tree was: ${currentWord}`);
      } else {
        // You still have guesses left, just notify the user
        // (We can add a temporary message here later if we want)
      }
    }
  };

  // --- Render Logic ---

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
        
        {/* Score & Difficulty (Fix 3) */}
        <div className="score-bar">
          <div className="score-box">
            Score: <span className="score-box-score">{score}</span>
          </div>
          <div className="score-box">
            Tree Guesses: <span className="score-box-wrong">{wordGuessesLeft} / {STARTING_WORD_GUESSES}</span>
          </div>
        </div>

        {/* Letter Display */}
        <LetterDisplay word={currentWord} guessedLetters={guessedLetters} />

        {/* Input Mode Tabs */}
        <div className="input-tabs">
          <button
            onClick={() => setInputMode('letter')}
            disabled={gameState !== 'playing'} // Disable buttons when game is over
            className={`input-tab ${inputMode === 'letter' ? 'active' : ''}`}
          >
            Guess A Letter
          </button>
          <button
            onClick={() => setInputMode('word')}
            disabled={gameState !== 'playing'} // Disable buttons when game is over
            className={`input-tab ${inputMode === 'word' ? 'active' : ''}`}
          >
            Guess The Tree!
          </button>
        </div>

        {/* Keyboard or Word Input */}
        {/* (Fix 3: Disable input when game is over) */}
        {gameState === 'playing' && (
          <div className="input-area">
            {inputMode === 'letter' ? (
              <Keyboard onGuess={handleGuessLetter} guessedLetters={guessedLetters} />
            ) : (
              <GuessWordInput onGuessWord={handleGuessWord} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}