import { Entity, TransformComponent, RenderComponent, PhysicsComponent } from '../core/Component.js';
import { gameEvents, GameEvents } from '../core/EventSystem.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import * as THREE from 'three';
import { debugHelper } from '../utils/DebugHelper.js';

/**
 * Asteroid entity using the component-based architecture
 */
export class AsteroidEntity extends Entity {
    /**
     * Create a new asteroid entity
     * @param {THREE.Scene} scene - Scene to add this asteroid to
     * @param {THREE.Vector3} position - Initial position (null for random)
     * @param {THREE.Vector3} velocity - Initial velocity (null for random)
     * @param {number} pattern - Movement pattern (0=random, 3=sine wave)
     * @param {Object} resourceManager - The resource manager to get models from
     */
    constructor(scene, position = null, velocity = null, pattern = 0, resourceManager = null) {
        super(scene);
        
        this.resourceManager = resourceManager;
        
        // Set up initial positions
        this.initialPosition = position || new THREE.Vector3(
            Math.random() * 300 + 100, // Start from right side of screen
            (Math.random() - 0.5) * 60, // Vertical position
            (Math.random() - 0.5) * 20  // Small Z variation for depth
        );
        
        // Initial velocity
        this.initialVelocity = velocity || new THREE.Vector3(
            -Math.random() * 15 - 5, // Move left at varying speeds
            (Math.random() - 0.5) * 2, // Small vertical drift
            0 // No Z movement in side-scroller
        );
        
        // Get transform component
        this.transform = this.getComponent(TransformComponent);
        this.transform.position.copy(this.initialPosition);
        
        // Add physics component
        this.physics = this.addComponent(PhysicsComponent);
        this.physics.velocity.copy(this.initialVelocity);
        this.physics.angularVelocity.set(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        this.physics.mass = Math.random() * 50 + 10; // Random mass between 10 and 60
        
        // Add render component (mesh will be set when loaded)
        this.render = this.addComponent(RenderComponent);
        
        // Store asteroid-specific properties
        this.movementPattern = pattern;
        this.initialY = this.initialPosition.y;
        this.sineAmplitude = Math.random() * 20 + 10;
        this.sineFrequency = Math.random() * 2 + 1;
        this.moveTime = Math.random() * Math.PI * 2;
        this.pulseTime = Math.random() * 10;
        this.scale = (this.physics.mass / 10) * (Math.random() * 0.5 + 1.5);
        
        // Add metadata for game logic
        this.userData = {
            isAsteroid: false, // Will be set to true once model is loaded
            asteroidRef: this,
            mass: this.physics.mass,
            debrisType: 'asteroid'
        };
        
        // Add model loader if resourceManager is not available
        if (!this.resourceManager) {
            this.modelLoader = new ModelLoader();
        }
        
        // Load the model
        this.loadModel();
    }
    
    /**
     * Load the asteroid model
     */
    loadModel() {
        debugHelper.log("AsteroidEntity: Loading asteroid model...");
        
        // Try to get the model from ResourceManager
        if (this.resourceManager) {
            debugHelper.log("AsteroidEntity: Trying to get model from ResourceManager");
            const model = this.resourceManager.getAsteroidModel();
            if (model) {
                debugHelper.log("AsteroidEntity: Got model from ResourceManager");
                this.setupModel(model);
                return;
            } else {
                debugHelper.log("AsteroidEntity: ResourceManager returned null model");
                
                // Emit failure event
                gameEvents.emit(GameEvents.ENTITY_DESTROYED, {
                    type: 'asteroid',
                    entity: this,
                    reason: 'load_failure'
                });
                
                // Mark for removal
                this.remove();
            }
        } else {
            debugHelper.log("AsteroidEntity: No ResourceManager provided");
            
            // Emit failure event
            gameEvents.emit(GameEvents.ENTITY_DESTROYED, {
                type: 'asteroid',
                entity: this,
                reason: 'no_resource_manager'
            });
            
            // Mark for removal
            this.remove();
        }
    }
    
    /**
     * Set up the asteroid model with appropriate properties
     * @param {THREE.Object3D} model - The asteroid model
     */
    setupModel(model) {
        // Success callback
        this.model = model;
        
        // Set model properties
        this.model.scale.set(this.scale, this.scale, this.scale);
        
        // Add emissive properties to make it glow more brightly
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clone the material to avoid shared material issues
                child.material = child.material.clone();
                
                // Add a stronger emissive glow to the asteroid
                child.material.emissive = new THREE.Color(0xff5500);
                child.material.emissiveIntensity = 0.5;
                
                // Store the mesh for collision detection
                if (!this.collisionMesh) {
                    this.collisionMesh = child;
                }
            }
        });
        
        // Add the model to the render component
        this.render.setMesh(this.model);
        
        // Create lights for the asteroid
        this.createLights();
        
        // Update colliders now that the model is loaded
        this.updateColliders();
        
        // Mark this as an asteroid for collision handling
        this.userData.isAsteroid = true;
        
        debugHelper.log("Asteroid model loaded successfully");
        
        // Emit asteroid spawn event
        gameEvents.emit(GameEvents.ENTITY_SPAWNED, {
            type: 'asteroid',
            entity: this
        });
    }
    
    /**
     * Create lights for the asteroid
     */
    createLights() {
        // Create a brighter point light
        const lightColor = new THREE.Color(0xff6600);
        const lightIntensity = 2.0 + Math.random() * 1.0;
        const lightRange = this.scale * 20;
        
        const asteroidLight = new THREE.PointLight(lightColor, lightIntensity, lightRange);
        asteroidLight.position.set(0, 0, 0);
        
        const secondLightColor = new THREE.Color(0xffcc00);
        const secondLight = new THREE.PointLight(secondLightColor, lightIntensity * 0.7, lightRange * 0.8);
        secondLight.position.set(0, 0, 0);
        
        // Add lights to the model
        if (this.model) {
            this.model.add(asteroidLight);
            this.model.add(secondLight);
            
            // Store references to the lights
            this.lights = {
                main: asteroidLight,
                secondary: secondLight
            };
        }
    }
    
    /**
     * Update the colliders for this asteroid
     */
    updateColliders() {
        if (!this.model) return;
        
        // Create bounding box if it doesn't exist
        if (!this.physics.boundingBox) {
            this.physics.boundingBox = new THREE.Box3();
        }
        
        // Update the bounding box from the model
        this.physics.boundingBox.setFromObject(this.model);
        
        // Add a small padding to the bounding box for better collision detection
        const padding = 0.8;
        this.physics.boundingBox.min.subScalar(padding);
        this.physics.boundingBox.max.addScalar(padding);
    }
    
    /**
     * Reset the asteroid position and properties
     */
    reset() {
        // Reset position to the right side with more variation
        this.transform.position.set(
            Math.random() * 300 + 200,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 20
        );
        
        this.initialY = this.transform.position.y;
        
        // Randomize velocity
        this.physics.velocity.set(
            -Math.random() * 20 - 10,
            (Math.random() - 0.5) * 4,
            0
        );
        
        // Reset movement pattern variables
        this.moveTime = Math.random() * Math.PI * 2;
        this.sineAmplitude = Math.random() * 30 + 15;
        this.sineFrequency = Math.random() * 3 + 0.5;
        
        // New random rotation speeds
        this.physics.angularVelocity.set(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
        );
    }
    
    /**
     * Handle this asteroid being hit
     */
    handleHit() {
        gameEvents.emit(GameEvents.ENEMY_HIT, {
            type: 'asteroid',
            entity: this,
            mass: this.physics.mass
        });
    }
    
    /**
     * Remove this asteroid
     */
    remove() {
        gameEvents.emit(GameEvents.ENEMY_DESTROYED, {
            type: 'asteroid',
            entity: this,
            position: this.transform.position.clone()
        });
        
        this.destroy();
    }
    
    /**
     * Update the asteroid
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        if (!this.model) return;
        
        // Update core entity components
        super.update(delta);
        
        // Update timers
        this.pulseTime += delta;
        this.moveTime += delta;
        
        // Apply movement pattern
        if (this.movementPattern === 3) {
            const newY = this.initialY + Math.sin(this.moveTime * this.sineFrequency) * this.sineAmplitude;
            const verticalVelocity = (newY - this.transform.position.y) / delta;
            this.physics.angularVelocity.z = THREE.MathUtils.lerp(
                this.physics.angularVelocity.z,
                -verticalVelocity * 0.001,
                0.1
            );
            this.transform.position.y = newY;
        }
        
        // Update collision detection
        this.updateColliders();
        
        // Update lights
        if (this.lights) {
            const mainIntensity = 2.0 + Math.sin(this.pulseTime * 3) * 1.0;
            this.lights.main.intensity = mainIntensity;
            
            const secondaryIntensity = 1.5 + Math.sin(this.pulseTime * 3 + Math.PI) * 0.7;
            this.lights.secondary.intensity = secondaryIntensity;
        }
        
        // Check if asteroid needs to be reset (went off screen)
        if (this.transform.position.x < -100) {
            this.reset();
        }
    }
} 