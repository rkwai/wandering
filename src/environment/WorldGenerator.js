import * as THREE from 'three';
import { CelestialBodies } from './CelestialBodies.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        
        // Create celestial bodies (planets, stars, etc.)
        this.celestialBodies = new CelestialBodies(scene);
        
        // No longer creating a starfield
    }

    generateTerrain() {
        // Initialize space environment with celestial bodies
        this.celestialBodies.createDistantPlanets();
    }

    // Removed createStarfield method as we're not using it anymore
} 