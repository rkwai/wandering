import * as THREE from 'three';
import debugHelper from '../utils/DebugHelper.js';
import { HealthBar } from './HealthBar.js';
import { ScoreDisplay } from './ScoreDisplay.js';

/**
 * Manages all UI elements in the game
 */
export class UIManager {
    /**
     * Create a new UI manager
     */
    constructor() {
        this.elements = {};
        debugHelper.log("UI Manager initialized");
    }
    
    /**
     * Create a health bar for the player
     * @param {number} maxHealth - The maximum health value
     * @returns {HealthBar} The created health bar
     */
    createHealthBar(maxHealth = 100) {
        this.elements.healthBar = new HealthBar(maxHealth);
        return this.elements.healthBar;
    }
    
    /**
     * Create a score display
     * @param {number} initialScore - The initial score value
     * @returns {ScoreDisplay} The created score display
     */
    createScoreDisplay(initialScore = 0) {
        this.elements.scoreDisplay = new ScoreDisplay(initialScore);
        return this.elements.scoreDisplay;
    }
    
    /**
     * Update the health bar
     * @param {number} health - The current health value
     */
    updateHealthBar(health) {
        if (this.elements.healthBar) {
            this.elements.healthBar.update(health);
        }
    }
    
    /**
     * Update the score display
     * @param {number} score - The current score value
     */
    updateScore(score) {
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.update(score);
        }
    }
    
    /**
     * Clean up all UI elements
     */
    cleanup() {
        // Remove health bar if it exists
        if (this.elements.healthBar) {
            this.elements.healthBar.remove();
        }
        
        // Remove score display if it exists
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.remove();
        }
        
        // Clear all elements
        this.elements = {};
    }
} 