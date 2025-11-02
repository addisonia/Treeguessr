import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './game.css'; 

// --- Scoring Constants ---
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const COST_PER_VOWEL = 15;
const COST_PER_CONSONANT = 5;
const STARTING_SCORE = 100;
const STARTING_WORD_GUESSES = 3;

// --- Helper Functions ---
const pickRandomWord = (words) => {
  if (!words || words.length === 0) return "LOADING";
  return words[Math.floor(Math.random() * words.length)];
};

// --- React Components ---

/**
 * 1. LetterDisplay Component
 */
const LetterDisplay = ({ word, guessedLetters }) => {
  const words = useMemo(() => word.split(' '), [word]);

  return (
    <div className="letter-display">
      {words.map((wordString, wordIndex) => (
        <React.Fragment key={wordIndex}>
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
          {wordIndex < words.length - 1 && <div className="letter-space" />}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * 2. Keyboard Component (Feature 1: Yellow keys)
 */
const Keyboard = ({ onGuess, guessedLetters, currentWord, disabled: allDisabled }) => {
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="keyboard">
      {keys.map(key => {
        const isGuessed = guessedLetters.has(key);
        const isWrong = isGuessed && !currentWord.includes(key);
        const isAvailable = !isGuessed; // New check
        
        let keyClass = 'key';
        if (isWrong) {
          keyClass += ' wrong';
        }
        
        // If the whole keyboard is disabled (in word mode) and this key is available...
        if (allDisabled && isAvailable) {
          keyClass += ' available'; // Add our new class
        }

        return (
          <button
            key={key}
            onClick={() => onGuess(key)}
            disabled={isGuessed || allDisabled}
            className={keyClass}
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
  
  const [score, setScore] =useState(STARTING_SCORE);
  const [wordGuessesLeft, setWordGuessesLeft] = useState(STARTING_WORD_GUESSES);
  
  const [wrongWordGuesses, setWrongWordGuesses] = useState([]);

  const [inputMode, setInputMode] = useState('letter');
  const [gameState, setGameState] = useState('playing');
  const [message, setMessage] = useState('');

  // Effect 1: Load Word List
  useEffect(() => {
    fetch('wordlist.txt')
      .then(response => response.text())
      .then(text => {
        const words = text.split('\n')
                          .map(word => word.trim())
                          .filter(Boolean);
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

  // --- Game Logic Functions ---

  const startNewGame = useCallback(() => {
    const newWord = pickRandomWord(wordList);
    setCurrentWord(newWord);
    setGuessedLetters(new Set());
    setScore(STARTING_SCORE);
    setWordGuessesLeft(STARTING_WORD_GUESSES);
    setWrongWordGuesses([]);
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
    
  }, [guessedLetters, gameState, currentWord, uniqueLettersInWord, score]);

  // --- Event Handlers ---

  const handleGuessLetter = (letter) => {
    if (gameState !== 'playing' || guessedLetters.has(letter)) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    // Apply cost for EVERY guess
    const cost = VOWELS.has(letter) ? COST_PER_VOWEL : COST_PER_CONSONANT;
    const newScore = score - cost;
    
    if (newScore <= 0) {
      setScore(0);
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
      setGuessedLetters(new Set([...guessedLetters, ...uniqueLettersInWord]));
    } else {
      // Wrong guess
      const newGuessesLeft = wordGuessesLeft - 1;
      setWordGuessesLeft(newGuessesLeft);
      setWrongWordGuesses(prev => [...prev, wordGuess]);

      if (newGuessesLeft <= 0) {
        // Lose!
        setGameState('lost');
        setMessage(`You're out of tree guesses! The tree was: ${currentWord}`);
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
        
        {/* Score Bar */}
        <div className="score-bar">
          <div className="score-box">
            Score: <span className="score-box-score">{score}</span>
          </div>
          <div className="score-box">
            Tree Guesses: <span className="score-box-wrong">{wordGuessesLeft} / {STARTING_WORD_GUESSES}</span>
          </div>
        </div>

        {/* Letter Display (Bug Fix 2) */}
        <LetterDisplay 
          key={currentWord} 
          word={currentWord} 
          guessedLetters={guessedLetters} 
        />

        {/* Input Mode Tabs */}
        <div className="input-tabs">
          <button
            onClick={() => setInputMode('letter')}
            disabled={gameState !== 'playing'}
            className={`input-tab ${inputMode === 'letter' ? 'active' : ''}`}
          >
            Guess A Letter
          </button>
          <button
            onClick={() => setInputMode('word')}
            disabled={gameState !== 'playing'}
            className={`input-tab ${inputMode === 'word' ? 'active' : ''}`}
          >
            Guess The Tree!
          </button>
        </div>

        {/* Keyboard and Word Input */}
        {gameState === 'playing' && (
          <div className="input-area">
            
            {inputMode === 'word' && (
              <>
                <GuessWordInput onGuessWord={handleGuessWord} />
                
                {wrongWordGuesses.length > 0 && (
                  <div className="wrong-guesses-container">
                    <h4>Used Guesses:</h4>
                    <ul>
                      {wrongWordGuesses.map((guess, index) => (
                        <li key={index}>{guess}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            
            <Keyboard 
              onGuess={handleGuessLetter} 
              guessedLetters={guessedLetters}
              currentWord={currentWord}
              disabled={inputMode === 'word'}
            />
          </div>
        )}
      </main>
    </div>
  );
}