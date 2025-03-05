import { gameEvents, GameEvents } from './EventSystem.js';

/**
 * Base class for game states
 */
export class GameState {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * Called when entering this state
     */
    enter() {}
    
    /**
     * Called when exiting this state
     */
    exit() {}
    
    /**
     * Update logic for this state
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {}
    
    /**
     * Handle input in this state
     * @param {Object} inputState - Current input state
     */
    handleInput(inputState) {}
}

/**
 * Menu state for title screen, options, etc.
 */
export class MenuState extends GameState {
    enter() {
        console.log('Entering menu state');
        // Show menu UI
        gameEvents.emit(GameEvents.SHOW_MESSAGE, { text: 'SPACE SHOOTER', duration: 0 });
    }
    
    exit() {
        // Hide menu UI
    }
    
    handleInput(inputState) {
        // Check for menu navigation and selection
        if (inputState.enterPressed) {
            this.game.changeState('playing');
        }
    }
}

/**
 * Playing state for active gameplay
 */
export class PlayingState extends GameState {
    enter() {
        console.log('Starting game');
        gameEvents.emit(GameEvents.GAME_START);
        gameEvents.emit(GameEvents.LEVEL_START, { level: 1 });
    }
    
    exit() {
        // Clean up gameplay elements
    }
    
    update(delta) {
        // Update all game entities
        this.game.updateEntities(delta);
        
        // Check game over conditions
        if (this.game.player.lives <= 0) {
            this.game.changeState('gameOver');
        }
    }
    
    handleInput(inputState) {
        // Pass input to player
        if (inputState.pausePressed) {
            this.game.changeState('paused');
        }
    }
}

/**
 * Paused state when game is temporarily halted
 */
export class PausedState extends GameState {
    enter() {
        console.log('Game paused');
        gameEvents.emit(GameEvents.GAME_PAUSE);
        gameEvents.emit(GameEvents.SHOW_MESSAGE, { text: 'PAUSED', duration: 0 });
    }
    
    exit() {
        gameEvents.emit(GameEvents.GAME_RESUME);
    }
    
    handleInput(inputState) {
        if (inputState.pausePressed) {
            this.game.changeState('playing');
        }
    }
}

/**
 * Game over state after player loses
 */
export class GameOverState extends GameState {
    enter() {
        console.log('Game over');
        gameEvents.emit(GameEvents.GAME_OVER);
        gameEvents.emit(GameEvents.SHOW_MESSAGE, { text: 'GAME OVER', duration: 0 });
    }
    
    handleInput(inputState) {
        if (inputState.enterPressed) {
            this.game.changeState('menu');
        }
    }
}

/**
 * State manager to handle different game states
 */
export class GameStateManager {
    constructor(game) {
        this.game = game;
        this.states = {
            menu: new MenuState(game),
            playing: new PlayingState(game),
            paused: new PausedState(game),
            gameOver: new GameOverState(game)
        };
        
        this.currentState = null;
    }
    
    /**
     * Initialize with default state
     * @param {string} initialState - Name of the initial state
     */
    init(initialState = 'menu') {
        this.changeState(initialState);
    }
    
    /**
     * Change to a new state
     * @param {string} newStateName - Name of the state to change to
     */
    changeState(newStateName) {
        if (!this.states[newStateName]) {
            console.error(`State "${newStateName}" does not exist`);
            return;
        }
        
        // Exit current state if it exists
        if (this.currentState) {
            this.currentState.exit();
        }
        
        // Enter new state
        this.currentState = this.states[newStateName];
        this.currentState.enter();
    }
    
    /**
     * Update the current state
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        if (this.currentState) {
            this.currentState.update(delta);
        }
    }
    
    /**
     * Handle input in the current state
     * @param {Object} inputState - Current input state
     */
    handleInput(inputState) {
        if (this.currentState) {
            this.currentState.handleInput(inputState);
        }
    }
} 