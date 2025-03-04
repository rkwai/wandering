import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import { Asteroid } from '../entities/Asteroid';
import { Planet } from '../environment/Planet';

/**
 * Class that manages and showcases all the custom 3D models in the game
 */
export class ModelShowcase {
    /**
     * Create a new model showcase
     * @param {THREE.Scene} scene - The scene to add models to
     */
    constructor(scene) {
        this.scene = scene;
        this.modelLoader = new ModelLoader();
        this.models = {
            spaceships: [],
            asteroids: [],
            planets: []
        };
        
        // Collection of spawned entities
        this.entities = {
            asteroids: []
        };
        
        // Initialize the showcase
        this.init();
    }
    
    /**
     * Initialize the showcase with all models
     */
    init() {
        // Create a distant planet
        this.planet = new Planet(this.scene, {
            position: new THREE.Vector3(800, 100, -1500),
            scale: 150,
            rotationSpeed: 0.002,
            atmosphereColor: 0x62a0ff,
            emissive: true,
            addLight: true
        });
        
        // Create a collection of asteroids
        this.createAsteroidField(15);
        
        // Set up the missile model 
        this.setupMissileModel();
        
        console.log("Model showcase initialized!");
    }
    
    /**
     * Create an asteroid field with the given number of asteroids
     * @param {number} count - Number of asteroids to create
     */
    createAsteroidField(count) {
        for (let i = 0; i < count; i++) {
            // Create asteroids at varied positions
            const asteroid = new Asteroid(this.scene);
            this.entities.asteroids.push(asteroid);
        }
    }
    
    /**
     * Create a single asteroid and return it
     * @param {THREE.Vector3} position - Optional position for the asteroid
     * @param {THREE.Vector3} velocity - Optional velocity for the asteroid
     * @returns {Asteroid} The created asteroid
     */
    createAsteroid(position = null, velocity = null) {
        const asteroid = new Asteroid(this.scene, position, velocity);
        this.entities.asteroids.push(asteroid);
        return asteroid;
    }
    
    /**
     * Set up the missile model for ship weapons
     */
    setupMissileModel() {
        this.modelLoader.loadModel('models/spaceships/spaceship_missile_0304125431.glb', (model) => {
            // Add the model to our collection for reference
            this.models.spaceships.push({
                name: 'missile',
                model: model
            });
            
            // Hide the model - we're just preloading it
            model.visible = false;
            this.scene.add(model);
        });
        
        // Also load the spaceship model
        this.modelLoader.loadModel('models/spaceships/spaceship_0304124415.glb', (model) => {
            // Add the model to our collection for reference
            this.models.spaceships.push({
                name: 'spaceship',
                model: model
            });
            
            // Hide the model - we're just preloading it
            model.visible = false;
            this.scene.add(model);
        });
    }
    
    /**
     * Update all showcase entities
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Update planet rotation
        if (this.planet) {
            this.planet.update(delta);
        }
        
        // Update all asteroids
        this.entities.asteroids.forEach(asteroid => {
            asteroid.update(delta);
        });
        
        // Remove any entities marked for removal
        this.cleanupEntities();
    }
    
    /**
     * Clean up any entities marked for removal
     */
    cleanupEntities() {
        // Filter out asteroids marked for removal
        this.entities.asteroids = this.entities.asteroids.filter(asteroid => !asteroid.markedForRemoval);
    }
    
    /**
     * Get a missile model for firing
     * @returns {THREE.Object3D} A missile model
     */
    getMissileModel() {
        const missile = this.models.spaceships.find(m => m.name === 'missile');
        if (missile && missile.model) {
            try {
                return missile.model.clone();
            } catch (error) {
                console.error("Error cloning missile model:", error);
                return null;
            }
        }
        return null;
    }
    
    /**
     * Get a spaceship model
     * @returns {THREE.Object3D} A spaceship model
     */
    getShipModel() {
        const ship = this.models.spaceships.find(m => m.name === 'spaceship');
        if (ship && ship.model) {
            try {
                return ship.model.clone();
            } catch (error) {
                console.error("Error cloning spaceship model:", error);
                return null;
            }
        }
        return null;
    }
    
    /**
     * Check for collisions with any showcase entities
     * @param {THREE.Box3} boundingBox - The bounding box to check collisions against
     * @returns {Object|null} The first entity that collided, or null if no collision
     */
    checkCollisions(boundingBox) {
        // Safety check - if no boundingBox is provided, return null
        if (!boundingBox) {
            return null;
        }
        
        // Check collision with each asteroid
        for (const asteroid of this.entities.asteroids) {
            // Only check asteroids that have a valid boundingBox
            if (asteroid.boundingBox && boundingBox.intersectsBox(asteroid.boundingBox)) {
                return asteroid;
            }
        }
        
        return null;
    }
} 