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
        
        // Random rotation speed - increased significantly
        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,  // 10x faster than before
            (Math.random() - 0.5) * 0.2,  // 10x faster than before
            (Math.random() - 0.5) * 0.2   // 10x faster than before
        );
        
        // Physical properties
        this.mass = Math.random() * 50 + 10; // Random mass between 10 and 60
        this.scale = (this.mass / 10) * (Math.random() * 0.5 + 1.5); // Increased minimum scale
        
        // Create container for the asteroid model
        this.asteroidGroup = new THREE.Group();
        this.asteroidGroup.position.copy(this.position);
        
        // Add userData for collision handling
        this.asteroidGroup.userData = {
            debrisType: 'asteroid',
            mass: this.mass,
            parent: this,  // Reference to this asteroid instance
            isAsteroid: false // Will be set to true once model is loaded
        };
        
        // For collision detection
        this.boundingBox = new THREE.Box3();
        
        // Flag to mark for removal if needed (e.g., after destruction)
        this.markedForRemoval = false;
        
        // Flag to track if model is loaded and ready
        this.isModelLoaded = false;
        
        // Load the asteroid model
        this.loadModel();
        
        // Add a light to the asteroid - but don't add to scene until model is loaded
        this.createAsteroidLight();
    }
    
    /**
     * Load the GLB model for this asteroid
     */
    loadModel() {
        debugHelper.log("Loading asteroid model...");
        
        this.modelLoader = new ModelLoader();
        
        this.modelLoader.loadModel(
            'models/asteroids/asteroid_0304124602.glb',
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
                        child.material.emissiveIntensity = 0.5;
                        
                        // Store the mesh for collision detection
                        if (!this.collisionMesh) {
                            this.collisionMesh = child;
                        }
                    }
                });
                
                // Add to the asteroid group
                this.asteroidGroup.add(this.model);
                
                // Now that model is loaded, add the group to the scene
                this.scene.add(this.asteroidGroup);
                
                // Add the lights now that the model is loaded
                if (this.lights) {
                    this.asteroidGroup.add(this.lights.main);
                    this.asteroidGroup.add(this.lights.secondary);
                }
                
                // Create initial bounding box
                this.boundingBox = new THREE.Box3();
                this.updateBoundingBox();
                
                // Mark this as an asteroid for collision handling only after model is loaded
                this.asteroidGroup.userData.isAsteroid = true;
                this.asteroidGroup.userData.asteroidRef = this;
                
                // Set loaded flag
                this.isModelLoaded = true;
                
                debugHelper.log("Asteroid model loaded successfully");
            },
            (error) => {
                debugHelper.log("Failed to load asteroid model: " + error.message, "error");
                // Remove the asteroid group if model fails to load
                if (this.asteroidGroup.parent) {
                    this.scene.remove(this.asteroidGroup);
                }
                this.markedForRemoval = true;
            }
        );
    }
    
    /**
     * Update the bounding box to match current position and rotation
     */
    updateBoundingBox() {
        if (this.collisionMesh && this.boundingBox) {
            // Get the world matrix of the collision mesh
            this.collisionMesh.updateMatrixWorld(true);
            
            // Compute the bounding box in world space
            this.boundingBox.setFromObject(this.collisionMesh);
            
            // Add a small padding to the bounding box for more reliable collision
            const padding = 0.1 * this.scale; // 10% of asteroid scale
            this.boundingBox.min.subScalar(padding);
            this.boundingBox.max.addScalar(padding);
        }
    }
    
    /**
     * Create (but don't add) a light source for the asteroid
     */
    createAsteroidLight() {
        // Create a brighter point light
        const lightColor = new THREE.Color(0xff6600);
        const lightIntensity = 2.0 + Math.random() * 1.0;
        const lightRange = this.scale * 20;
        
        const asteroidLight = new THREE.PointLight(lightColor, lightIntensity, lightRange);
        asteroidLight.position.set(0, 0, 0);
        
        const secondLightColor = new THREE.Color(0xffcc00);
        const secondLight = new THREE.PointLight(secondLightColor, lightIntensity * 0.7, lightRange * 0.8);
        secondLight.position.set(0, 0, 0);
        
        // Store references to the lights (but don't add them yet)
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
            this.pulseTime = Math.random() * 10;
        }
        
        // Update pulse time
        this.pulseTime += delta;
        this.moveTime += delta;
        
        // Base velocity (always move left)
        const baseVelocity = this.velocity.clone();
        
        // Apply Gradius-style movement patterns
        if (this.movementPattern === 3) {
            const newY = this.initialY + Math.sin(this.moveTime * this.sineFrequency) * this.sineAmplitude;
            const verticalVelocity = (newY - this.position.y) / delta;
            this.rotationSpeed.z = THREE.MathUtils.lerp(
                this.rotationSpeed.z,
                -verticalVelocity * 0.001,
                0.1
            );
            this.position.y = newY;
        }
        
        // Update position based on velocity
        this.position.add(baseVelocity.clone().multiplyScalar(delta));
        this.asteroidGroup.position.copy(this.position);
        
        // Update rotation speeds
        this.rotationSpeed.x = THREE.MathUtils.lerp(
            this.rotationSpeed.x,
            Math.abs(this.velocity.x) * 0.01,
            0.05
        );
        
        this.rotationSpeed.y = THREE.MathUtils.lerp(
            this.rotationSpeed.y,
            Math.abs(this.velocity.y) * 0.015,
            0.05
        );
        
        // Apply rotation
        this.rotation.x += this.rotationSpeed.x * delta;
        this.rotation.y += this.rotationSpeed.y * delta;
        this.rotation.z += this.rotationSpeed.z * delta;
        this.asteroidGroup.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        
        // Update bounding box every frame
        this.updateBoundingBox();
        
        // Update light intensity with pulsing effect
        if (this.lights) {
            const mainIntensity = 2.0 + Math.sin(this.pulseTime * 3) * 1.0;
            this.lights.main.intensity = mainIntensity;
            
            const secondaryIntensity = 1.5 + Math.sin(this.pulseTime * 3 + Math.PI) * 0.7;
            this.lights.secondary.intensity = secondaryIntensity;
        }
        
        // For side-scrolling, respawn asteroids when they go off the left side
        if (this.position.x < -100) {
            // Reset position to the right side with more variation
            this.position.x = Math.random() * 300 + 200;
            this.position.y = (Math.random() - 0.5) * 100;
            this.position.z = (Math.random() - 0.5) * 20;
            
            this.initialY = this.position.y;
            
            // Randomize velocity for more variety
            this.velocity.x = -Math.random() * 20 - 10;
            this.velocity.y = (Math.random() - 0.5) * 4;
            
            // Reset movement pattern variables
            this.moveTime = Math.random() * Math.PI * 2;
            this.sineAmplitude = Math.random() * 30 + 15;
            this.sineFrequency = Math.random() * 3 + 0.5;
            
            // Add new random rotation speeds
            this.rotationSpeed.x = (Math.random() - 0.5) * 0.2;
            this.rotationSpeed.y = (Math.random() - 0.5) * 0.2;
            this.rotationSpeed.z = (Math.random() - 0.5) * 0.2;
            
            // Update asteroid group position
            this.asteroidGroup.position.copy(this.position);
            
            // Mark as active
            this.markedForRemoval = false;
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