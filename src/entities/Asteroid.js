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
        
        // Add userData for collision handling
        this.asteroidGroup.userData = {
            debrisType: 'asteroid',
            mass: this.mass,
            parent: this,
            isAsteroid: false // Will be set to true once model is loaded
        };
        
        // Initialize flags and properties
        this.markedForRemoval = false;
        this.isModelLoaded = false;
        this.boundingBox = null; // Will be created when model is loaded
        this.collisionMesh = null;
        
        // Load the asteroid model
        this.loadModel();
        
        // Create lights but don't add them yet
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
     * Initialize or reinitialize the asteroid's collision detection
     */
    initializeCollision() {
        if (!this.collisionMesh) return;

        // Create new bounding box
        this.boundingBox = new THREE.Box3();
        
        // Update the collision mesh's matrix
        this.collisionMesh.updateMatrixWorld(true);
        
        // Compute the bounding box in world space
        this.boundingBox.setFromObject(this.collisionMesh);
        
        // Add padding for more reliable collision
        const padding = 0.1 * this.scale;
        this.boundingBox.min.subScalar(padding);
        this.boundingBox.max.addScalar(padding);
        
        // Create bounding sphere from box
        this.boundingSphere = new THREE.Sphere();
        this.boundingBox.getBoundingSphere(this.boundingSphere);
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
        if (!this.collisionMesh || !this.boundingBox || !this.isModelLoaded) return;
        
        // Update the collision mesh's world matrix
        this.collisionMesh.updateMatrixWorld(true);
        
        // Update the bounding box in world space
        this.boundingBox.setFromObject(this.collisionMesh);
        
        // Maintain padding
        const padding = 0.1 * this.scale;
        this.boundingBox.min.subScalar(padding);
        this.boundingBox.max.addScalar(padding);
        
        // Update bounding sphere
        if (this.boundingSphere) {
            this.boundingBox.getBoundingSphere(this.boundingSphere);
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
        if (!this.isModelLoaded) return;
        
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
        if (this.position.x < -100) {
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
     * Remove this asteroid from the scene
     */
    remove() {
        this.scene.remove(this.asteroidGroup);
        this.markedForRemoval = true;
    }
} 