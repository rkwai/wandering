import { GameManager } from './core/GameManager.js';

// Create and start the game
document.addEventListener('DOMContentLoaded', () => {
    // Create game manager
    const game = new GameManager();
    
    // Start the game
    game.start();
    
    // Export to window for debugging
    window.game = game;
}); 