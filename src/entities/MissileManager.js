import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader.js';
import { ObjectPool } from '../core/ObjectPool.js';
import debugHelper from '../utils/DebugHelper.js';

/**
 * Class responsible for managing all missile-related functionality
 */
export class MissileManager {
    /**
     * Create a new missile manager
     * @param {THREE.Scene} scene - The scene to add missiles to
     * @param {THREE.AudioListener} audioListener - Audio listener for missile sounds
     */
    constructor(scene, audioListener) {
        this.scene = scene;
        this.audioListener = audioListener;
        this.modelLoader = new ModelLoader();
        
        // Missile properties
        this.missileSpeed = 200;
        this.missileLifetime = 5.0;
        this.shootDelay = 0.25; // 4 shots per second
        this.lastShotTime = 0;
        
        // Collections
        this.missileModel = null;
        this.missiles = [];
        this.missilePool = null;
        
        // Sounds
        this.soundsLoaded = false;
        this.missileSound = null;
        this.collisionSound = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the missile manager
     */
    init() {
        // Load missile model
        this.loadMissileModel();
        
        // Load explosion model
        this.loadExplosionModel();
        
        // Load sounds
        this.loadSounds();
    }
    
    /**
     * Load the missile model
     */
    loadMissileModel() {
        debugHelper.log("Loading missile model...");
        this.modelLoader.loadModel('models/spaceships/spaceship_missile_0304125431.glb', (model) => {
            // Ensure model is properly set up
            model.traverse(child => {
                if (child.isMesh) {
                    // Ensure materials are properly set
                    if (child.material) {
                        // Clone the material to avoid shared material issues
                        child.material = child.material.clone();
                        
                        // Make materials much brighter with strong emissive glow
                        child.material.emissive = new THREE.Color(0xfffffff); // white glow
                        child.material.emissiveIntensity = 0.25;
                                                
                        // Ensure material is visible
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                        
                        // Increase shininess for metallic look
                        if (child.material.shininess !== undefined) {
                            child.material.shininess = 100;
                        }
                    }
                }
            });
            
            // Store the model
            this.missileModel = model;
            
            // Hide the model - we're just using it as a template
            model.visible = false;
            
            // Initialize the missile pool
            this.initMissilePool();
            
            debugHelper.log("Missile model loaded successfully");
        }, (error) => {
            debugHelper.log("Failed to load missile model: " + error, "error");
            // Do not create a fallback model
            this.missileModel = null;
        });
    }
    
    /**
     * Initialize the missile object pool
     */
    initMissilePool() {
        // Check if we have a missile model
        if (!this.missileModel) {
            debugHelper.log("Cannot initialize missile pool: No missile model available", "error");
            return;
        }
        
        // Create a pool of 20 missiles (should be enough for most gameplay)
        this.missilePool = new ObjectPool(
            // Creation function
            () => {
                const missile = this.missileModel.clone();
                
                // Ensure missile is visible
                missile.visible = false;
                
                // Reset any existing rotation
                missile.rotation.set(0, 0, 0);
                
                // Ensure missile points right (towards positive X)
                missile.rotation.y = Math.PI; // 180 degree rotation around Y axis
                
                // Scale the missile up for visibility
                missile.scale.set(5.0, 5.0, 5.0);
                
                // Add user data for tracking
                missile.userData = {
                    velocity: new THREE.Vector3(this.missileSpeed, 0, 0),
                    lifeTime: 0,
                    maxLifeTime: this.missileLifetime,
                    boundingBox: new THREE.Box3()
                };
                
                return missile;
            },
            // Reset function
            (missile) => {
                missile.visible = false;
                missile.userData.lifeTime = 0;
                
                // Remove from scene if it's in the scene
                if (missile.parent) {
                    this.scene.remove(missile);
                }
            },
            20 // Pool size
        );
        
        debugHelper.log("Missile pool initialized with 20 missiles");
    }
    
    /**
     * Load missile sounds
     */
    loadSounds() {
        if (!this.audioListener) {
            debugHelper.log("No audio listener provided, skipping sound loading");
            return;
        }
        
        // Create sound for missile launch
        this.missileSound = new THREE.Audio(this.audioListener);
        
        // Load missile launch sound
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('sounds/missile_launch.mp3', (buffer) => {
            this.missileSound.setBuffer(buffer);
            this.missileSound.setVolume(0.5);
            
            // Create sound for missile hit
            this.collisionSound = new THREE.Audio(this.audioListener);
            
            // Load missile hit sound
            audioLoader.load('sounds/missile_hit.mp3', (buffer) => {
                this.collisionSound.setBuffer(buffer);
                this.collisionSound.setVolume(0.7);
                
                this.soundsLoaded = true;
                debugHelper.log("Missile sounds loaded successfully");
            }, undefined, (error) => {
                debugHelper.log("Failed to load missile hit sound: " + error, "error");
            });
        }, undefined, (error) => {
            debugHelper.log("Failed to load missile launch sound: " + error, "error");
        });
    }
    
    /**
     * Shoot a missile from the specified position
     * @param {THREE.Vector3} position - The position to shoot from
     * @returns {boolean} Whether the missile was successfully shot
     */
    shootMissile(position) {
        // Check if we have a missile model
        if (!this.missileModel) {
            debugHelper.log("Cannot shoot missile: No missile model available", "error");
            return false;
        }
        
        // Check if enough time has passed since the last shot
        const currentTime = performance.now() / 1000; // Convert to seconds
        if (currentTime - this.lastShotTime < this.shootDelay) {
            return false;
        }
        
        // Update last shot time
        this.lastShotTime = currentTime;
        
        // Get a missile from the pool
        const missile = this.missilePool.get();
        if (!missile) {
            debugHelper.log("No missiles available in pool");
            return false;
        }
        
        debugHelper.log("Firing missile");
        
        // Set up the missile
        missile.visible = true;
        
        // Position the missile
        missile.position.copy(position);
        missile.position.x += 20; // Position in front of the ship
        
        // Reset rotation and ensure missile points right
        missile.rotation.set(0, 0, 0);
        missile.rotation.y = Math.PI; // 180 degree rotation around Y axis
        
        // Reset missile properties
        missile.userData.lifeTime = 0;
        missile.userData.velocity.set(this.missileSpeed, 0, 0);
        
        // Add to scene
        this.scene.add(missile);
        
        // Add to active missiles array
        this.missiles.push(missile);
        
        // Play sound
        this.playMissileSound();
        
        return true;
    }
    
    /**
     * Play missile launch sound
     */
    playMissileSound() {
        if (this.soundsLoaded && this.missileSound && this.missileSound.buffer) {
            // Clone the sound for overlapping effects
            if (this.missileSound.isPlaying) {
                this.missileSound.stop();
            }
            this.missileSound.play();
            debugHelper.log("Missile launch sound played");
        } else {
            debugHelper.log("Missile sound not loaded or unavailable");
        }
    }
    
    /**
     * Play missile collision sound
     */
    playCollisionSound() {
        if (this.soundsLoaded && this.collisionSound && this.collisionSound.buffer) {
            if (this.collisionSound.isPlaying) {
                this.collisionSound.stop();
            }
            this.collisionSound.play();
        }
    }
    
    /**
     * Load the explosion model
     */
    loadExplosionModel() {
        // We no longer create a fallback explosion model
        this.explosionModel = null;
        debugHelper.log("Explosion model loading skipped - no fallbacks used");
    }
    
    /**
     * Create an explosion at the specified position
     * @param {THREE.Vector3} position - The position to create the explosion at
     */
    createExplosion(position) {
        // Just play the sound, no visual effect
        this.playCollisionSound();
        debugHelper.log("Explosion created at position: " + position.x.toFixed(2) + ", " + position.y.toFixed(2) + ", " + position.z.toFixed(2));
    }
    
    /**
     * Update all active missiles
     * @param {number} delta - Time step in seconds
     * @param {Function} collisionCallback - Callback when a missile collides with something
     */
    update(delta, collisionCallback) {
        // Process each missile
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            
            // Update missile position based on velocity
            missile.position.x += missile.userData.velocity.x * delta;
            missile.position.y += missile.userData.velocity.y * delta;
            missile.position.z += missile.userData.velocity.z * delta;
            
            // Ensure missile maintains correct orientation (pointing right)
            // Reset rotation and then apply the correct orientation
            missile.rotation.set(0, 0, 0);
            missile.rotation.y = Math.PI; // 180 degree rotation around Y axis
            
            // Update missile lifetime
            missile.userData.lifeTime += delta;
            
            // Create or update missile bounding box
            missile.userData.boundingBox.setFromObject(missile);
            
            // Add a small padding to the missile bounding box for better collision detection
            const missilePadding = 0.5; // Fixed padding for missiles
            missile.userData.boundingBox.min.subScalar(missilePadding);
            missile.userData.boundingBox.max.addScalar(missilePadding);
            
            // Check if missile has lived too long or gone too far
            if (missile.userData.lifeTime > missile.userData.maxLifeTime || 
                missile.position.x > 1000 || 
                missile.position.x < -1000) {
                
                // Remove missile
                this.missiles.splice(i, 1);
                this.missilePool.release(missile);
                continue;
            }
            
            // If a collision callback is provided, let the caller handle collisions
            if (collisionCallback) {
                const collisionResult = collisionCallback(missile, missile.userData.boundingBox);
                if (collisionResult) {
                    // Missile hit something, remove it
                    this.missiles.splice(i, 1);
                    this.missilePool.release(missile);
                    
                    // Create explosion at impact point
                    this.createExplosion(collisionResult.position);
                }
            }
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Clean up all missiles
        for (const missile of this.missiles) {
            this.scene.remove(missile);
        }
        this.missiles = [];
        
        // Clean up pool
        if (this.missilePool) {
            this.missilePool.clear();
        }
        
        // Clean up sounds
        if (this.missileSound) {
            this.missileSound.stop();
        }
        if (this.collisionSound) {
            this.collisionSound.stop();
        }
    }
} 