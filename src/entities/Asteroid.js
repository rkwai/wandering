import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';
import debugHelper from '../utils/DebugHelper.js';
import debugVisualizer from '../utils/DebugVisualizer.js';

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
        
        // Generate a unique ID for this asteroid
        this.id = 'asteroid_' + Math.random().toString(36).substring(2, 10);
        
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
        
        // Recenter the model geometry to account for the off-screen spawn position
        const modelBox = new THREE.Box3().setFromObject(this.model);
        const modelCenter = new THREE.Vector3();
        modelBox.getCenter(modelCenter);
        this.model.position.sub(modelCenter);
        
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
            asteroidRef: this,
            mass: this.mass,
            debrisType: 'asteroid'
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

        // Update the asteroidGroup's world matrix to ensure correct transforms
        this.asteroidGroup.updateMatrixWorld(true);
        // Create a temporary bounding box from the asteroidGroup
        const tempBox = new THREE.Box3().setFromObject(this.asteroidGroup);
        
        // Create bounding sphere directly (our primary collision shape)
        this.boundingSphere = new THREE.Sphere();
        tempBox.getBoundingSphere(this.boundingSphere);
        
        // Shrink the sphere significantly for more precise collisions
        this.boundingSphere.radius *= 0.4; // Reduce radius to 40% of original size
        
        // We'll keep a bounding box too for compatibility, but derived from the sphere
        this.boundingBox = new THREE.Box3(
            new THREE.Vector3(
                this.boundingSphere.center.x - this.boundingSphere.radius,
                this.boundingSphere.center.y - this.boundingSphere.radius,
                this.boundingSphere.center.z - this.boundingSphere.radius
            ),
            new THREE.Vector3(
                this.boundingSphere.center.x + this.boundingSphere.radius,
                this.boundingSphere.center.y + this.boundingSphere.radius,
                this.boundingSphere.center.z + this.boundingSphere.radius
            )
        );
        
        // Update visualization for debugging
        const visualizer = debugVisualizer.getInstance();
        if (visualizer) {
            // Use the enhanced asteroid visualization
            visualizer.visualizeAsteroid(this);
        }
        
        debugHelper.log(`Asteroid: Collision initialized with sphere radius: ${
            this.boundingSphere.radius.toFixed(1)} at center (${
            this.boundingSphere.center.x.toFixed(1)}, ${
            this.boundingSphere.center.y.toFixed(1)}, ${
            this.boundingSphere.center.z.toFixed(1)})`);
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
     * Update the bounding sphere and box to match current position and rotation
     */
    updateBoundingBox() {
        if (!this.collisionMesh) {
            debugHelper.log("Asteroid: Cannot update collision - no collision mesh");
            return;
        }
        
        if (!this.isModelLoaded) {
            debugHelper.log("Asteroid: Cannot update collision - model not loaded");
            return;
        }
        
        // Update the collision mesh's world matrix
        this.collisionMesh.updateMatrixWorld(true);
        
        // First create a temporary bounding box to help calculate the sphere
        const tempBox = new THREE.Box3().setFromObject(this.collisionMesh);
        
        // Create or update bounding sphere
        if (!this.boundingSphere) {
            this.boundingSphere = new THREE.Sphere();
            debugHelper.log("Asteroid: Created new bounding sphere");
        }
        
        // Update the bounding sphere from the temp box
        tempBox.getBoundingSphere(this.boundingSphere);
        
        // Shrink the sphere significantly for more precise collisions
        this.boundingSphere.radius *= 0.4; // Reduce radius to 40% of original size
        
        // Update or create the bounding box based on the sphere
        if (!this.boundingBox) {
            this.boundingBox = new THREE.Box3();
            debugHelper.log("Asteroid: Created new bounding box from sphere");
        }
        
        // Set the box from the sphere for compatibility
        this.boundingBox.set(
            new THREE.Vector3(
                this.boundingSphere.center.x - this.boundingSphere.radius,
                this.boundingSphere.center.y - this.boundingSphere.radius,
                this.boundingSphere.center.z - this.boundingSphere.radius
            ),
            new THREE.Vector3(
                this.boundingSphere.center.x + this.boundingSphere.radius,
                this.boundingSphere.center.y + this.boundingSphere.radius,
                this.boundingSphere.center.z + this.boundingSphere.radius
            )
        );
        
        // Update visualization for debugging
        const visualizer = debugVisualizer.getInstance();
        if (visualizer) {
            // Use the enhanced asteroid visualization
            visualizer.visualizeAsteroid(this);
        }
        
        // Occasionally log collision shape info for debugging
        if (Math.random() < 0.01) {
            debugHelper.log(`Asteroid: Updated collision at (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)}) with sphere radius: ${this.boundingSphere.radius.toFixed(1)}`);
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
        // Clear debug visualizations
        const visualizer = debugVisualizer.getInstance();
        if (visualizer && this.id) {
            visualizer.removeVisualization(this.id);
        }
        
        // Remove the asteroid group from the scene
        if (this.asteroidGroup.parent) {
            this.scene.remove(this.asteroidGroup);
        }
        
        this.markedForRemoval = true;
    }
    
    /**
     * Check if this asteroid collides with the given bounding box
     * @param {THREE.Box3} boundingBox - The bounding box to check collision with
     * @returns {boolean} - Whether there's a collision
     */
    checkCollision(boundingBox) {
        if (!this.isModelLoaded || !this.boundingSphere || !boundingBox) {
            return false;
        }
        
        // For collision detection purposes, we'll use a slightly larger radius than what's visualized
        // This helps prevent visual artifacts while keeping collisions nearly pixel-perfect
        const collisionRadius = this.boundingSphere.radius * 1.1; // Reduced from 2.5x to 1.1x for pixel-perfect collisions
        
        // First, do a quick check if the box is entirely outside the expanded sphere
        const sphereBox = new THREE.Box3(
            new THREE.Vector3(
                this.boundingSphere.center.x - collisionRadius,
                this.boundingSphere.center.y - collisionRadius,
                this.boundingSphere.center.z - collisionRadius
            ),
            new THREE.Vector3(
                this.boundingSphere.center.x + collisionRadius,
                this.boundingSphere.center.y + collisionRadius,
                this.boundingSphere.center.z + collisionRadius
            )
        );
        
        // Quick rejection test - if boxes don't intersect, there's no collision
        if (!boundingBox.intersectsBox(sphereBox)) {
            return false;
        }
        
        // For more precise sphere collision, check if the closest point on the box is within the expanded sphere
        const closestPoint = new THREE.Vector3();
        boundingBox.clampPoint(this.boundingSphere.center, closestPoint);
        
        const distanceSquared = this.boundingSphere.center.distanceToSquared(closestPoint);
        const radiusSquared = collisionRadius * collisionRadius;
        
        // If the closest point on the box is within the expanded sphere's radius, we have a collision
        return distanceSquared <= radiusSquared;
    }
} 