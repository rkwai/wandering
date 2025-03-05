import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';
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
     * @param {Object} resourceManager - The resource manager to get models from
     * @param {Function} onLoaded - Callback function called when the asteroid model is loaded
     */
    constructor(scene, position = null, velocity = null, pattern = 0, resourceManager = null, onLoaded = null) {
        this.scene = scene;
        this.resourceManager = resourceManager;
        this.onLoaded = onLoaded;
        
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
        this.initialY = this.position.y;
        this.sineAmplitude = Math.random() * 20 + 10;
        this.sineFrequency = Math.random() * 2 + 1;
        this.moveTime = Math.random() * Math.PI * 2;
        
        // Random rotation
        this.rotation = new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        // Random rotation speed
        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        // Physical properties
        this.mass = Math.random() * 50 + 10;
        this.scale = (this.mass / 10) * (Math.random() * 0.5 + 1.5);
        
        // Create container for the asteroid model
        this.asteroidGroup = new THREE.Group();
        this.asteroidGroup.position.copy(this.position);
        this.asteroidGroup.rotation.copy(this.rotation);
        
        // Initialize flags and properties
        this.markedForRemoval = false;
        this.isModelLoaded = false;
        this.model = null;
        this.boundingBox = null;
        this.boundingSphere = null;
        this.collisionMesh = null;
        
        // Create lights but don't add them yet (will be added when model is loaded)
        this.createAsteroidLight();
        
        // Load the asteroid model
        this.loadModel();
        
        debugHelper.log(`Asteroid: Created at position (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
    }
    
    /**
     * Load the asteroid model from ResourceManager or directly if ResourceManager is not available
     */
    loadModel() {
        debugHelper.log("Asteroid: Loading asteroid model...");
        
        // Try to get the model from ResourceManager first
        if (this.resourceManager) {
            debugHelper.log("Asteroid: Trying to get model from ResourceManager");
            const model = this.resourceManager.getAsteroidModel();
            if (model) {
                debugHelper.log("Asteroid: Got model from ResourceManager");
                this.setupModel(model);
                return;
            } else {
                debugHelper.log("Asteroid: ResourceManager returned null model", "error");
                // Mark for removal if no model is available
                if (this.asteroidGroup.parent) {
                    this.scene.remove(this.asteroidGroup);
                }
                this.markedForRemoval = true;
                return;
            }
        } else {
            debugHelper.log("Asteroid: No ResourceManager provided", "error");
            // Mark for removal if no ResourceManager is available
            if (this.asteroidGroup.parent) {
                this.scene.remove(this.asteroidGroup);
            }
            this.markedForRemoval = true;
        }
    }
    
    /**
     * Set up the asteroid model with appropriate properties
     * @param {THREE.Object3D} model - The asteroid model
     */
    setupModel(model) {
        debugHelper.log("Asteroid: Setting up model");
        
        // Success callback
        this.model = model;
        
        // Ensure model is visible
        this.model.visible = true;
        
        // Set model properties
        this.model.scale.set(this.scale, this.scale, this.scale);
        this.model.rotation.copy(this.rotation);
        
        // Add emissive properties to make it glow more brightly
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clone the material to avoid shared material issues
                child.material = child.material.clone();
                
                // Add a stronger emissive glow to the asteroid
                child.material.emissive = new THREE.Color(0xff5500);
                child.material.emissiveIntensity = 0.5;
                
                // Ensure material is visible
                child.material.transparent = false;
                child.material.opacity = 1.0;
            }
        });
        
        // Add to the asteroid group
        this.asteroidGroup.add(this.model);
        
        // Set up collision mesh (use the model itself for collision)
        this.collisionMesh = this.model;
        
        // Set up user data for the asteroid group
        this.asteroidGroup.userData = {
            isAsteroid: true,
            asteroidRef: this
        };
        
        // Add the asteroid group to the scene
        this.scene.add(this.asteroidGroup);
        
        // Add the lights now that the model is loaded
        if (this.lights) {
            this.asteroidGroup.add(this.lights.main);
            this.asteroidGroup.add(this.lights.secondary);
        }
        
        // Mark as loaded
        this.isModelLoaded = true;
        
        // Initialize collision detection
        this.initializeCollision();
        
        // Log the asteroid's position for debugging
        debugHelper.log(`Asteroid: Model setup complete at position (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
        
        // Call the onLoaded callback if provided
        if (this.onLoaded) {
            this.onLoaded(this);
        }
    }
    
    /**
     * Initialize or reinitialize the asteroid's collision detection
     */
    initializeCollision() {
        if (!this.collisionMesh) {
            debugHelper.log("Asteroid: Cannot initialize collision - no collision mesh");
            return;
        }

        // Create new bounding box
        this.boundingBox = new THREE.Box3();
        
        // Update the collision mesh's matrix
        this.collisionMesh.updateMatrixWorld(true);
        
        // Compute the bounding box in world space
        this.boundingBox.setFromObject(this.collisionMesh);
        
        // Add minimal padding for more precise collision
        const padding = 0.2 * this.scale; // Reduced padding for more precise hits
        this.boundingBox.min.subScalar(padding);
        this.boundingBox.max.addScalar(padding);
        
        // Create bounding sphere from box
        this.boundingSphere = new THREE.Sphere();
        this.boundingBox.getBoundingSphere(this.boundingSphere);
        
        debugHelper.log(`Asteroid: Collision initialized with box size: ${
            (this.boundingBox.max.x - this.boundingBox.min.x).toFixed(1)} x ${
            (this.boundingBox.max.y - this.boundingBox.min.y).toFixed(1)} x ${
            (this.boundingBox.max.z - this.boundingBox.min.z).toFixed(1)}`);
    }
    
    /**
     * Reset the asteroid's position and properties
     */
    reset() {
        // Reset position to the right side with more variation
        this.position.set(
            Math.random() * 300 + 200,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 20
        );
        
        this.initialY = this.position.y;
        
        // Randomize velocity
        this.velocity.set(
            -Math.random() * 20 - 10,
            (Math.random() - 0.5) * 4,
            0
        );
        
        // Reset movement pattern
        this.moveTime = Math.random() * Math.PI * 2;
        this.sineAmplitude = Math.random() * 30 + 15;
        this.sineFrequency = Math.random() * 3 + 0.5;
        
        // New random rotation speeds
        this.rotationSpeed.set(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        
        // Update group position
        this.asteroidGroup.position.copy(this.position);
        
        // Reinitialize collision detection
        this.initializeCollision();
        
        // Reset flags
        this.markedForRemoval = false;
    }
    
    /**
     * Update the bounding box to match current position and rotation
     */
    updateBoundingBox() {
        if (!this.collisionMesh) {
            debugHelper.log("Asteroid: Cannot update bounding box - no collision mesh");
            return;
        }
        
        if (!this.isModelLoaded) {
            debugHelper.log("Asteroid: Cannot update bounding box - model not loaded");
            return;
        }
        
        // Create bounding box if it doesn't exist
        if (!this.boundingBox) {
            this.boundingBox = new THREE.Box3();
            debugHelper.log("Asteroid: Created new bounding box");
        }
        
        // Update the collision mesh's world matrix
        this.collisionMesh.updateMatrixWorld(true);
        
        // Update the bounding box in world space
        this.boundingBox.setFromObject(this.collisionMesh);
        
        // Use a much smaller padding for more precise collision detection
        // This will make missiles hit closer to the actual visual model
        const padding = 0.2 * this.scale; // Reduced from 1.0 to 0.2
        this.boundingBox.min.subScalar(padding);
        this.boundingBox.max.addScalar(padding);
        
        // Update bounding sphere
        if (!this.boundingSphere) {
            this.boundingSphere = new THREE.Sphere();
            debugHelper.log("Asteroid: Created new bounding sphere");
        }
        
        this.boundingBox.getBoundingSphere(this.boundingSphere);
        
        // Occasionally log bounding box size for debugging
        if (Math.random() < 0.01) {
            debugHelper.log(`Asteroid: Updated bounding box at (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)}) with size: ${
                (this.boundingBox.max.x - this.boundingBox.min.x).toFixed(1)} x ${
                (this.boundingBox.max.y - this.boundingBox.min.y).toFixed(1)} x ${
                (this.boundingBox.max.z - this.boundingBox.min.z).toFixed(1)}`);
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
        if (!this.isModelLoaded) {
            // Log occasionally if model isn't loaded
            if (Math.random() < 0.01) {
                debugHelper.log("Asteroid: Update called but model not loaded yet");
            }
            return;
        }
        
        // Initialize pulseTime if not already set
        if (this.pulseTime === undefined) {
            this.pulseTime = Math.random() * 10;
        }
        
        // Update timers
        this.pulseTime += delta;
        this.moveTime += delta;
        
        // Base velocity
        const baseVelocity = this.velocity.clone();
        
        // Apply movement pattern
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
        
        // Update position
        this.position.add(baseVelocity.clone().multiplyScalar(delta));
        this.asteroidGroup.position.copy(this.position);
        
        // Update rotation
        this.rotation.x += this.rotationSpeed.x * delta;
        this.rotation.y += this.rotationSpeed.y * delta;
        this.rotation.z += this.rotationSpeed.z * delta;
        this.asteroidGroup.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        
        // Update collision detection
        this.updateBoundingBox();
        
        // Update lights
        if (this.lights) {
            const mainIntensity = 2.0 + Math.sin(this.pulseTime * 3) * 1.0;
            this.lights.main.intensity = mainIntensity;
            
            const secondaryIntensity = 1.5 + Math.sin(this.pulseTime * 3 + Math.PI) * 0.7;
            this.lights.secondary.intensity = secondaryIntensity;
        }
        
        // Check if asteroid needs to be reset
        if (this.position.x < -200) {
            // Log when asteroid goes off screen
            debugHelper.log(`Asteroid: Reset triggered at position ${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}`);
            this.reset();
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
     * Handle this asteroid being hit by a missile
     */
    handleHit() {
        debugHelper.log(`Asteroid: Hit at position (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
        
        // Emit game event for scoring and effects
        if (window.gameEvents) {
            window.gameEvents.emit('enemyHit', {
                type: 'asteroid',
                position: this.position.clone(),
                size: this.scale
            });
        }
        
        // Apply visual effect if needed
        if (this.model) {
            // Flash the asteroid with a bright color before removal
            this.model.traverse(child => {
                if (child.isMesh && child.material) {
                    // Save original emissive if needed for reset
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive.clone();
                        child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
                    }
                    
                    // Set to bright white/yellow flash
                    child.material.emissive = new THREE.Color(0xffff00);
                    child.material.emissiveIntensity = 3.0;
                }
            });
        }
        
        // Increase the lights intensity for a flash effect
        if (this.lights) {
            if (this.lights.main) this.lights.main.intensity *= 3;
            if (this.lights.secondary) this.lights.secondary.intensity *= 3;
        }
        
        // Log successful hit
        debugHelper.log("Asteroid: Hit effect applied");
    }
    
    /**
     * Remove this asteroid from the scene
     */
    remove() {
        this.scene.remove(this.asteroidGroup);
        this.markedForRemoval = true;
    }
} 