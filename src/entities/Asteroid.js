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
     */
    constructor(scene, position = null, velocity = null) {
        this.scene = scene;
        this.position = position || new THREE.Vector3(
            (Math.random() - 0.5) * 300, 
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 300
        );
        
        this.velocity = velocity || new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );
        
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
        this.scene.add(this.asteroidGroup);
        
        // Load the asteroid model
        this.loadModel();
        
        // For collision detection
        this.boundingBox = new THREE.Box3();
        
        // Flag to mark for removal if needed (e.g., after destruction)
        this.markedForRemoval = false;
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
     * Update the asteroid position and rotation
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.asteroidGroup.position.copy(this.position);
        
        // Update rotation
        this.rotation.x += this.rotationSpeed.x * delta;
        this.rotation.y += this.rotationSpeed.y * delta;
        this.rotation.z += this.rotationSpeed.z * delta;
        this.asteroidGroup.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        
        // Update bounding box for collision detection - safely
        try {
            if (this.asteroidGroup && this.asteroidGroup.children.length > 0) {
                this.boundingBox.setFromObject(this.asteroidGroup);
            }
        } catch (error) {
            // If there's an error updating the bounding box, log it but don't crash
            console.error("Error updating asteroid bounding box:", error);
        }
        
        // Wrap around if too far from origin (simple space wrapping)
        const wrapDistance = 500;
        if (Math.abs(this.position.x) > wrapDistance) {
            this.position.x = -Math.sign(this.position.x) * wrapDistance;
        }
        if (Math.abs(this.position.y) > wrapDistance) {
            this.position.y = -Math.sign(this.position.y) * wrapDistance;
        }
        if (Math.abs(this.position.z) > wrapDistance) {
            this.position.z = -Math.sign(this.position.z) * wrapDistance;
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