import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class EnvironmentalObjects {
    constructor(scene) {
        this.scene = scene;
        this.objectsCache = new Map(); // Map to store objects by chunk key
        this.noise2D = createNoise2D(); // For distribution of objects
        
        // Store models for reuse
        this.models = {
            trees: [],
            rocks: [],
            shrubs: [],
            flowers: []
        };
        
        // Default biomes if not set from WorldGenerator
        this.biomes = {
            forest: {
                // ... existing code ...
            }
        };
        
        // ... existing code ...
    }
    
    // ... existing code ...
} 