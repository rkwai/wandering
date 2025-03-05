import * as THREE from 'three';

export class SpaceEnvironment {
    constructor(scene) {
        this.scene = scene;
        
        // No longer creating background stars
        // The background will be handled by planets only
    }
    
    // Removed createBackgroundStars method as we're not using it anymore
    
    update(delta) {
        // No background stars to update
    }
} 