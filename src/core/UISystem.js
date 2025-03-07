import { gameEvents, GameEvents } from './EventSystem.js';

/**
 * Manages game UI elements
 */
export class UISystem {
    constructor() {
        // Create UI container
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '1000';
        document.body.appendChild(this.container);
        
        // Create UI elements
        this.createScoreElement();
        this.createLivesElement();
        this.createMessageElement();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize values
        this.score = 0;
        this.lives = 3;
        this.updateScore(0);
        this.updateLives(3);
    }
    
    /**
     * Create the score display element
     */
    createScoreElement() {
        this.scoreElement = document.createElement('div');
        this.scoreElement.className = 'score-display';
        
        // Create label
        const scoreLabel = document.createElement('span');
        scoreLabel.textContent = 'SCORE:';
        
        // Create value element
        this.scoreValueElement = document.createElement('span');
        this.scoreValueElement.className = 'score-value';
        this.scoreValueElement.textContent = '0';
        
        // Add to DOM
        this.scoreElement.appendChild(scoreLabel);
        this.scoreElement.appendChild(this.scoreValueElement);
        this.container.appendChild(this.scoreElement);
    }
    
    /**
     * Create the lives display element
     */
    createLivesElement() {
        this.livesElement = document.createElement('div');
        this.livesElement.className = 'lives-display';
        
        // Create label
        const livesLabel = document.createElement('span');
        livesLabel.textContent = 'LIVES:';
        
        // Create value element
        this.livesValueElement = document.createElement('span');
        this.livesValueElement.className = 'lives-value';
        this.livesValueElement.textContent = '3';
        
        // Add to DOM
        this.livesElement.appendChild(livesLabel);
        this.livesElement.appendChild(this.livesValueElement);
        this.container.appendChild(this.livesElement);
    }
    
    /**
     * Create the message display element
     */
    createMessageElement() {
        this.messageElement = document.createElement('div');
        this.messageElement.style.position = 'absolute';
        this.messageElement.style.top = '50%';
        this.messageElement.style.left = '50%';
        this.messageElement.style.transform = 'translate(-50%, -50%)';
        this.messageElement.style.fontSize = '36px';
        this.messageElement.style.fontFamily = 'Arial, sans-serif';
        this.messageElement.style.color = 'var(--ui-text-color)';
        this.messageElement.style.textShadow = 'var(--ui-glow) var(--accent-color)';
        this.messageElement.style.textAlign = 'center';
        this.messageElement.style.display = 'none';
        this.messageElement.style.padding = '20px 40px';
        this.messageElement.style.backgroundColor = 'var(--ui-bg-color)';
        this.messageElement.style.borderRadius = '10px';
        this.messageElement.style.border = '2px solid var(--accent-color)';
        this.messageElement.style.boxShadow = 'var(--ui-glow) var(--accent-color)';
        this.messageElement.style.zIndex = '2000';
        this.container.appendChild(this.messageElement);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Update score
        gameEvents.on(GameEvents.SCORE_CHANGED, (data) => {
            this.updateScore(data.score);
        });
        
        // Update lives
        gameEvents.on(GameEvents.PLAYER_HIT, (data) => {
            this.updateLives(data.livesRemaining);
        });
        
        // Display messages
        gameEvents.on(GameEvents.SHOW_MESSAGE, (data) => {
            this.showMessage(data.text, data.duration);
        });
        
        // Game state changes
        gameEvents.on(GameEvents.GAME_START, () => {
            this.resetUI();
        });
        
        gameEvents.on(GameEvents.GAME_OVER, () => {
            this.showMessage('GAME OVER', 0);
        });
        
        gameEvents.on(GameEvents.PLAYER_SPAWN, () => {
            this.updateLives(3); // Reset lives
        });
    }
    
    /**
     * Update the score display
     * @param {number} score - Current score
     */
    updateScore(score) {
        this.score = score;
        // Format score with commas for thousands
        const formattedScore = score.toLocaleString();
        this.scoreValueElement.textContent = formattedScore;
    }
    
    /**
     * Update the lives display
     * @param {number} lives - Current lives remaining
     */
    updateLives(lives) {
        this.lives = lives;
        this.livesValueElement.textContent = lives;
    }
    
    /**
     * Show a temporary message
     * @param {string} text - Message text
     * @param {number} duration - How long to show the message (0 for indefinite)
     */
    showMessage(text, duration = 3) {
        // Clear any existing message timers
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }
        
        // Set message text
        this.messageElement.textContent = text;
        this.messageElement.style.display = 'block';
        
        // Hide after duration if specified
        if (duration > 0) {
            this.messageTimer = setTimeout(() => {
                this.messageElement.style.display = 'none';
                this.messageTimer = null;
            }, duration * 1000);
        }
    }
    
    /**
     * Reset UI to initial state
     */
    resetUI() {
        this.updateScore(0);
        this.updateLives(3);
        this.messageElement.style.display = 'none';
        
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
            this.messageTimer = null;
        }
    }
} 