import * as THREE from 'three';
import debugHelper from '../utils/DebugHelper.js';
import { HealthBar } from './HealthBar.js';

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
     * Update the health bar
     * @param {number} health - The current health value
     */
    updateHealthBar(health) {
        if (this.elements.healthBar) {
            this.elements.healthBar.update(health);
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
        
        // Clear all elements
        this.elements = {};
    }
} 