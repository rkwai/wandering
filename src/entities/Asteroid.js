import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import debugHelper from '../utils/DebugHelper.js';

/**
 * Class representing an asteroid in the game
 */
export class Asteroid {
    /**
     * Create a new asteroid
     * @param {THREE.Scene} scene - The scene to add the asteroid to
     * @param {THREE.Vector3} position - Initial position (optional)
     * @param {THREE.Vector3} velocity - Initial velocity (optional)
     * @param {number} pattern - Movement pattern (0-3, optional)
     */
    constructor(scene, position = null, velocity = null, pattern = 0) {
        this.scene = scene;
        
        // For side-scrolling, position asteroids to the right of the screen
        this.position = position || new THREE.Vector3(
            Math.random() * 300 + 100, // Start from right side of screen
            (Math.random() - 0.5) * 60, // Vertical position
            (Math.random() - 0.5) * 20  // Small Z variation for depth
        );
        
        // For side-scrolling, asteroids move from right to left
        this.velocity = velocity || new THREE.Vector3(
            -Math.random() * 15 - 5, // Move left at varying speeds
            (Math.random() - 0.5) * 2, // Small vertical drift
            0 // No Z movement in side-scroller
        );
        
        // Gradius-style movement pattern
        this.movementPattern = pattern;
        this.initialY = this.position.y; // Store initial Y for sine wave pattern
        this.sineAmplitude = Math.random() * 20 + 10; // Amplitude for sine wave movement
        this.sineFrequency = Math.random() * 2 + 1; // Frequency for sine wave movement
        this.moveTime = Math.random() * Math.PI * 2; // Random starting phase
        
        // Random rotation
        this.rotation = new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        // Random rotation speed
        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        
        // Physical properties
        this.mass = Math.random() * 50 + 10; // Random mass between 10 and 60
        this.scale = (this.mass / 10) * (Math.random() * 0.5 + 0.75); // Scale based on mass with some randomness
        
        // Create container for the asteroid model
        this.asteroidGroup = new THREE.Group();
        this.asteroidGroup.position.copy(this.position);
        
        // Add userData for collision handling
        this.asteroidGroup.userData = {
            debrisType: 'asteroid',
            mass: this.mass,
            parent: this  // Reference to this asteroid instance
        };
        
        this.scene.add(this.asteroidGroup);
        
        // Load the asteroid model
        this.loadModel();
        
        // For collision detection
        this.boundingBox = new THREE.Box3();
        
        // Flag to mark for removal if needed (e.g., after destruction)
        this.markedForRemoval = false;
        
        // Add a light to the asteroid
        this.addAsteroidLight();
    }
    
    /**
     * Load the GLB model for this asteroid
     */
    loadModel() {
        debugHelper.log("Loading asteroid model...");
        
        this.modelLoader = new ModelLoader();
        
        this.modelLoader.loadModel(
            'models/asteroids/asteroid_0304124602.glb', // Use the specific path in asteroids directory
            (model) => {
                // Success callback
                this.model = model;
                
                // Set model properties
                this.model.scale.set(this.scale, this.scale, this.scale);
                this.model.rotation.copy(this.rotation);
                
                // Add emissive properties to make it glow more brightly
                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Add a stronger emissive glow to the asteroid
                        child.material.emissive = new THREE.Color(0xff5500);
                        child.material.emissiveIntensity = 0.5; // Increased intensity
                    }
                });
                
                // Add to the asteroid group
                this.asteroidGroup.add(this.model);
                
                // Update the bounding box
                this.boundingBox.setFromObject(this.asteroidGroup);
                
                // Mark this as an asteroid for collision handling
                this.asteroidGroup.userData.isAsteroid = true;
                this.asteroidGroup.userData.asteroidRef = this;
                
                debugHelper.log("Asteroid model loaded successfully");
            },
            (error) => {
                // Error callback
                debugHelper.log("Failed to load asteroid model: " + error.message, "error");
                // Do not create a basic asteroid, just log the error
            }
        );
    }
    
    /**
     * Add a light source to the asteroid
     */
    addAsteroidLight() {
        // Create a brighter point light
        const lightColor = new THREE.Color(0xff6600);
        const lightIntensity = 2.0 + Math.random() * 1.0; // Increased random intensity
        const lightRange = this.scale * 20; // Increased light range
        
        const asteroidLight = new THREE.PointLight(lightColor, lightIntensity, lightRange);
        asteroidLight.position.set(0, 0, 0); // Center of the asteroid
        
        // Add a second light with a different color for visual interest
        const secondLightColor = new THREE.Color(0xffcc00);
        const secondLight = new THREE.PointLight(secondLightColor, lightIntensity * 0.7, lightRange * 0.8);
        secondLight.position.set(0, 0, 0);
        
        // Add the lights to the asteroid group
        this.asteroidGroup.add(asteroidLight);
        this.asteroidGroup.add(secondLight);
        
        // Store references to the lights
        this.lights = {
            main: asteroidLight,
            secondary: secondLight
        };
    }
    
    /**
     * Update the asteroid position and rotation
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Initialize pulseTime if not already set
        if (this.pulseTime === undefined) {
            this.pulseTime = Math.random() * 10; // Random starting phase
        }
        
        // Update pulse time
        this.pulseTime += delta;
        this.moveTime += delta;
        
        // Base velocity (always move left)
        const baseVelocity = this.velocity.clone();
        
        // Apply Gradius-style movement patterns
        if (this.movementPattern === 3) { // Sine wave pattern
            // Override Y velocity with sine wave
            this.position.y = this.initialY + Math.sin(this.moveTime * this.sineFrequency) * this.sineAmplitude;
        }
        
        // Update position based on velocity
        this.position.add(baseVelocity.clone().multiplyScalar(delta));
        this.asteroidGroup.position.copy(this.position);
        
        // Update rotation
        this.rotation.x += this.rotationSpeed.x * delta;
        this.rotation.y += this.rotationSpeed.y * delta;
        this.rotation.z += this.rotationSpeed.z * delta;
        this.asteroidGroup.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        
        // Update light intensity with pulsing effect
        if (this.lights) {
            // Main light pulsing
            const mainIntensity = 2.0 + Math.sin(this.pulseTime * 3) * 1.0;
            this.lights.main.intensity = mainIntensity;
            
            // Secondary light pulsing (opposite phase)
            const secondaryIntensity = 1.5 + Math.sin(this.pulseTime * 3 + Math.PI) * 0.7;
            this.lights.secondary.intensity = secondaryIntensity;
        }
        
        // Only update bounding box every few frames for performance
        if (Math.random() < 0.2) { // 20% chance each frame
            try {
                if (this.asteroidGroup && this.asteroidGroup.children.length > 0) {
                    this.boundingBox.setFromObject(this.asteroidGroup);
                }
            } catch (error) {
                // If there's an error updating the bounding box, log it but don't crash
                console.error("Error updating asteroid bounding box:", error);
            }
        }
        
        // For side-scrolling, respawn asteroids when they go off the left side
        if (this.position.x < -100) {
            // Reset position to the right side
            this.position.x = Math.random() * 100 + 100;
            this.position.y = (Math.random() - 0.5) * 60;
            
            // Randomize velocity slightly
            this.velocity.x = -Math.random() * 15 - 5;
            this.velocity.y = (Math.random() - 0.5) * 2;
        }
    }
    
    /**
     * Handle collision with another object
     * @param {Object} object - The object this asteroid collided with
     */
    handleCollision(object) {
        // Simple physics response - change velocity based on collision
        if (object.velocity) {
            // Calculate impulse
            const relativeVelocity = object.velocity.clone().sub(this.velocity);
            const impulse = relativeVelocity.clone().multiplyScalar(object.mass / (object.mass + this.mass));
            
            // Apply impulse
            this.velocity.add(impulse);
            
            // Add some random rotation for visual effect
            this.rotationSpeed.x += (Math.random() - 0.5) * 0.01;
            this.rotationSpeed.y += (Math.random() - 0.5) * 0.01;
            this.rotationSpeed.z += (Math.random() - 0.5) * 0.01;
        }
    }
    
    /**
     * Remove this asteroid from the scene
     */
    remove() {
        this.scene.remove(this.asteroidGroup);
        this.markedForRemoval = true;
    }

    /**
     * Creates a bounding sphere for collision detection
     */
    createBoundingSphere() {
        if (this.asteroidGroup) {
            this.boundingSphere = new THREE.Sphere();
            this.boundingBox.getBoundingSphere(this.boundingSphere);
        }
    }
} 