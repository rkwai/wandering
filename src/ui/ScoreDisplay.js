import * as THREE from 'three';
import debugHelper from '../utils/DebugHelper.js';

/**
 * Class representing a score display in the UI
 */
export class ScoreDisplay {
    /**
     * Create a new score display
     * @param {number} initialScore - The initial score value
     */
    constructor(initialScore = 0) {
        this.currentScore = initialScore;
        this.displayedScore = initialScore;
        this.animationTimer = null;
        
        // Define colors directly instead of using CSS variables
        this.primaryColor = '#4f8dff';
        this.accentColor = '#ffcd38';
        this.uiBgColor = 'rgba(0, 12, 40, 0.7)';
        this.textColor = '#ffffff';
        
        // Create the container
        this.container = document.createElement('div');
        this.container.className = 'score-display';
        this.container.style.position = 'absolute';
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        this.container.style.backgroundColor = this.uiBgColor;
        this.container.style.color = this.textColor;
        this.container.style.padding = '10px 15px';
        this.container.style.borderRadius = '5px';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.fontSize = '24px';
        this.container.style.fontWeight = 'bold';
        this.container.style.letterSpacing = '1px';
        this.container.style.textShadow = `0 0 8px ${this.primaryColor}`;
        this.container.style.border = `1px solid ${this.primaryColor}`;
        this.container.style.boxShadow = `0 0 8px ${this.primaryColor}`;
        this.container.style.zIndex = '1000';
        this.container.style.display = 'flex';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.transition = 'transform 0.2s, box-shadow 0.2s';
        
        // Create the label
        const label = document.createElement('span');
        label.textContent = 'SCORE:';
        
        // Create the value display
        this.valueDisplay = document.createElement('span');
        this.valueDisplay.style.color = this.accentColor;
        this.valueDisplay.style.marginLeft = '8px';
        
        // Create the points added display (for animation)
        this.pointsAddedDisplay = document.createElement('div');
        this.pointsAddedDisplay.style.position = 'absolute';
        this.pointsAddedDisplay.style.top = '-20px';
        this.pointsAddedDisplay.style.right = '10px';
        this.pointsAddedDisplay.style.color = this.accentColor;
        this.pointsAddedDisplay.style.fontSize = '18px';
        this.pointsAddedDisplay.style.fontWeight = 'bold';
        this.pointsAddedDisplay.style.opacity = '0';
        this.pointsAddedDisplay.style.transition = 'top 1s, opacity 1s';
        this.pointsAddedDisplay.style.textShadow = `0 0 5px ${this.primaryColor}`;
        
        // Set initial score
        this.update(initialScore);
        
        // Add to DOM
        this.container.appendChild(label);
        this.container.appendChild(this.valueDisplay);
        this.container.appendChild(this.pointsAddedDisplay);
        document.body.appendChild(this.container);
        
        debugHelper.log("Score display UI created");
    }
    
    /**
     * Update the score display
     * @param {number} score - The current score value
     */
    update(score) {
        // If score increased, show the animation
        if (score > this.currentScore) {
            const pointsAdded = score - this.currentScore;
            this.showPointsAddedAnimation(pointsAdded);
        }
        
        this.currentScore = score;
        
        // Format score with commas for thousands
        const formattedScore = score.toLocaleString();
        this.valueDisplay.textContent = formattedScore;
    }
    
    /**
     * Show animation when points are added
     * @param {number} points - Number of points added
     */
    showPointsAddedAnimation(points) {
        // Update points added text
        this.pointsAddedDisplay.textContent = `+${points}`;
        
        // Reset animation
        this.pointsAddedDisplay.style.opacity = '0';
        this.pointsAddedDisplay.style.top = '-20px';
        
        // Force reflow to restart animation
        void this.pointsAddedDisplay.offsetWidth;
        
        // Start animation
        this.pointsAddedDisplay.style.opacity = '1';
        this.pointsAddedDisplay.style.top = '-40px';
        
        // Flash the score container
        this.container.style.transform = 'scale(1.1)';
        this.container.style.boxShadow = `0 0 15px ${this.primaryColor}`;
        
        // Reset container after animation
        setTimeout(() => {
            this.container.style.transform = 'scale(1)';
            this.container.style.boxShadow = `0 0 8px ${this.primaryColor}`;
        }, 200);
        
        // Hide points added after animation
        setTimeout(() => {
            this.pointsAddedDisplay.style.opacity = '0';
        }, 1000);
    }
    
    /**
     * Remove the score display from the DOM
     */
    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 