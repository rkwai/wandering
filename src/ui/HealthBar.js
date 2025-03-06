import * as THREE from 'three';
import debugHelper from '../utils/DebugHelper.js';

/**
 * Class representing a health bar in the UI
 */
export class HealthBar {
    /**
     * Create a new health bar
     * @param {number} maxHealth - The maximum health value
     */
    constructor(maxHealth = 100) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        
        // Create the health bar container
        this.container = document.createElement('div');
        this.container.className = 'health-bar-container';
        this.container.style.position = 'absolute';
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        this.container.style.width = '200px';
        this.container.style.height = '25px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.container.style.border = '2px solid white';
        this.container.style.borderRadius = '5px';
        this.container.style.overflow = 'hidden';
        this.container.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.7)';
        
        // Create the health bar fill
        this.fill = document.createElement('div');
        this.fill.className = 'health-bar-fill';
        this.fill.style.width = '100%';
        this.fill.style.height = '100%';
        this.fill.style.backgroundColor = '#00ff00';
        this.fill.style.transition = 'width 0.3s, background-color 0.3s';
        
        // Create the health text
        this.text = document.createElement('div');
        this.text.className = 'health-bar-text';
        this.text.style.position = 'absolute';
        this.text.style.top = '0';
        this.text.style.left = '0';
        this.text.style.width = '100%';
        this.text.style.height = '100%';
        this.text.style.display = 'flex';
        this.text.style.alignItems = 'center';
        this.text.style.justifyContent = 'center';
        this.text.style.color = 'white';
        this.text.style.fontFamily = '"Orbitron", sans-serif';
        this.text.style.fontSize = '14px';
        this.text.style.fontWeight = 'bold';
        this.text.style.textShadow = '0 0 3px #000';
        this.text.textContent = `SHIELD: ${this.currentHealth}/${this.maxHealth}`;
        
        // Add elements to the DOM
        this.container.appendChild(this.fill);
        this.container.appendChild(this.text);
        document.body.appendChild(this.container);
        
        debugHelper.log("Health bar UI created");
    }
    
    /**
     * Update the health bar
     * @param {number} health - The current health value
     */
    update(health) {
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, health));
        const percentage = (this.currentHealth / this.maxHealth) * 100;
        
        // Update the fill width
        this.fill.style.width = `${percentage}%`;
        
        // Update the text
        this.text.textContent = `SHIELD: ${Math.floor(this.currentHealth)}/${this.maxHealth}`;
        
        // Color changes based on health level
        if (percentage > 60) {
            this.fill.style.backgroundColor = '#00ff00'; // Green
        } else if (percentage > 30) {
            this.fill.style.backgroundColor = '#ffff00'; // Yellow
        } else {
            this.fill.style.backgroundColor = '#ff0000'; // Red
        }
        
        // Make the health bar pulse when health is low
        if (percentage < 20) {
            this.container.style.animation = 'pulse 1s infinite';
        } else {
            this.container.style.animation = '';
        }
    }
    
    /**
     * Remove the health bar from the DOM
     */
    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 