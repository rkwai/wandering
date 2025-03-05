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
        debugHelper.log("MissileManager: Loading explosion model");
        
        // Define potential model paths to try
        const explosionModelPaths = [
            'models/spaceships/impact_explosion_no__0305031045.glb',
            'models/effects/impact_explosion_no__0305031045.glb',
            'models/effects/explosion.glb'
        ];
        
        // Try to load from the first path
        this.tryLoadExplosionModel(explosionModelPaths, 0);
    }
    
    /**
     * Try to load the explosion model from a list of paths
     * @param {Array} paths - List of paths to try
     * @param {number} index - Current path index
     */
    tryLoadExplosionModel(paths, index) {
        if (index >= paths.length) {
            debugHelper.log("MissileManager: Failed to load explosion model from all paths", "error");
            return;
        }
        
        const path = paths[index];
        debugHelper.log(`MissileManager: Trying to load explosion model from path: ${path}`);
        
        this.modelLoader.loadModel(path, 
            (model) => {
                debugHelper.log(`MissileManager: Explosion model loaded successfully from ${path}`);
                this.explosionModel = model;
                
                // Check if model is null or empty
                if (!model) {
                    debugHelper.log("MissileManager: Loaded explosion model is null", "error");
                    this.tryLoadExplosionModel(paths, index + 1);
                    return;
                }
                
                // Log model structure
                debugHelper.log(`MissileManager: Explosion model structure: ${model.children.length} children`);
                
                // Set up the explosion model
                model.visible = false; // Hide the template model
                
                // Make explosion materials emissive and bright
                model.traverse(child => {
                    if (child.isMesh && child.material) {
                        // Log mesh found
                        debugHelper.log(`MissileManager: Found mesh in explosion model: ${child.name}`);
                        
                        // Clone the material to avoid sharing
                        child.material = child.material.clone();
                        
                        // Make it bright and glowing
                        child.material.emissive = new THREE.Color(0xffaa00);
                        child.material.emissiveIntensity = 2.0;
                        
                        // Enable transparency for fading
                        child.material.transparent = true;
                        child.material.opacity = 1.0;
                        
                        // Add blending for better visual effect
                        child.material.blending = THREE.AdditiveBlending;
                    }
                });
                
                // Add model to scene (invisible) to ensure it's loaded properly
                this.scene.add(model);
                
                // Create object pool for explosions
                this.explosionPool = new ObjectPool(
                    // Factory function to create new explosions
                    () => {
                        const explosion = this.explosionModel.clone();
                        explosion.userData = {
                            lifetime: 0,
                            maxLifetime: 1.0, // 1 second explosion
                            scale: 2.0 // Larger base scale
                        };
                        return explosion;
                    },
                    // Reset function
                    (explosion) => {
                        explosion.visible = false;
                        explosion.userData.lifetime = 0;
                        explosion.position.set(0, 0, 0);
                        explosion.scale.set(1, 1, 1);
                        // Reset materials
                        explosion.traverse(child => {
                            if (child.isMesh && child.material) {
                                child.material.opacity = 1.0;
                                child.material.transparent = false;
                                child.material.emissiveIntensity = 2.0;
                            }
                        });
                    },
                    // Initial pool size
                    10 // Pre-create 10 explosions
                );
                
                // Initialize explosions array
                this.activeExplosions = [];
                
                debugHelper.log("MissileManager: Explosion system initialized");
            }, 
            (error) => {
                debugHelper.log(`MissileManager: Failed to load explosion model from ${path}: ${error}`, "error");
                // Try the next path
                this.tryLoadExplosionModel(paths, index + 1);
            }
        );
    }
    
    /**
     * Create an explosion at the specified position
     * @param {THREE.Vector3} position - The position to create the explosion at
     */
    createExplosion(position) {
        // Play the sound effect
        this.playCollisionSound();
        
        debugHelper.log(`MissileManager: Creating explosion at position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
        
        // If we have an explosion model and pool, create a visual explosion
        if (this.explosionModel && this.explosionPool) {
            try {
                // Get an explosion from the pool
                const explosion = this.explosionPool.get();
                
                // Position the explosion
                explosion.position.copy(position);
                
                // Random size variation
                const scale = 3.0 + Math.random() * 1.0; // Much larger explosion for visibility
                explosion.scale.set(scale, scale, scale);
                
                // Store original scale for animation
                explosion.userData.scale = scale;
                
                // Reset lifetime
                explosion.userData.lifetime = 0;
                
                // Make it visible
                explosion.visible = true;
                
                // Ensure all materials are visible and bright
                explosion.traverse(child => {
                    if (child.isMesh && child.material) {
                        // Make it fully opaque
                        child.material.opacity = 1.0;
                        child.material.transparent = true;
                        
                        // Make it extra bright
                        child.material.emissiveIntensity = 3.0;
                        
                        // Use additive blending for better effect
                        child.material.blending = THREE.AdditiveBlending;
                    }
                });
                
                // Add to scene
                this.scene.add(explosion);
                
                // Add to active explosions
                this.activeExplosions.push(explosion);
                
                debugHelper.log(`MissileManager: Visual explosion created, ${this.activeExplosions.length} active explosions`);
            } catch (error) {
                debugHelper.log(`MissileManager: Error creating explosion: ${error}`, "error");
            }
        } else {
            debugHelper.log("MissileManager: No explosion model available, skipping visual effect");
        }
    }
    
    /**
     * Update all active explosions
     * @param {number} delta - Time step in seconds
     */
    updateExplosions(delta) {
        if (!this.activeExplosions || this.activeExplosions.length === 0) return;
        
        // Debug logging for active explosions (limit frequency)
        if (Math.random() < 0.01) {
            debugHelper.log(`MissileManager: Updating ${this.activeExplosions.length} active explosions`);
        }
        
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const explosion = this.activeExplosions[i];
            
            // Update lifetime
            explosion.userData.lifetime += delta;
            
            // Check if explosion is finished
            if (explosion.userData.lifetime >= explosion.userData.maxLifetime) {
                // Remove from scene
                this.scene.remove(explosion);
                
                // Return to pool
                this.explosionPool.release(explosion);
                
                // Remove from active list
                this.activeExplosions.splice(i, 1);
                debugHelper.log(`MissileManager: Explosion removed, ${this.activeExplosions.length} remaining`);
                continue;
            }
            
            // Calculate progress (0 to 1)
            const progress = explosion.userData.lifetime / explosion.userData.maxLifetime;
            
            // Scale up as explosion progresses
            const scaleMultiplier = 1.0 + progress * 1.0; // More dramatic scaling
            const currentScale = explosion.userData.scale * scaleMultiplier;
            explosion.scale.set(currentScale, currentScale, currentScale);
            
            // Fade out towards the end
            explosion.traverse(child => {
                if (child.isMesh && child.material) {
                    // Ensure transparency is enabled when we start fading
                    if (progress > 0.5) {
                        child.material.transparent = true;
                        child.material.opacity = 1.0 - ((progress - 0.5) * 2); // Start fading at 50% lifetime
                    }
                    
                    // Adjust emission intensity to create pulsing effect
                    const pulseRate = 10; // Higher number = faster pulse
                    const pulseAmount = 0.5; // Amount of pulsing (0-1)
                    const basePulse = 1.0 - (progress * 0.5); // Gradually reduce base intensity
                    const pulseFactor = basePulse * (1.0 + Math.sin(progress * pulseRate) * pulseAmount);
                    
                    child.material.emissiveIntensity = pulseFactor * 2.0;
                }
            });
        }
    }
    
    /**
     * Update all missiles and check for collisions
     * @param {number} delta - Time step in seconds
     * @param {Function} collisionCallback - Callback for collision detection
     */
    update(delta, collisionCallback) {
        // Debug logging for missile count (occasionally)
        if (Math.random() < 0.01) {
            debugHelper.log(`MissileManager: Updating ${this.missiles.length} missiles`);
        }
        
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
            const missilePadding = 1.0; // Increased padding for missiles
            missile.userData.boundingBox.min.subScalar(missilePadding);
            missile.userData.boundingBox.max.addScalar(missilePadding);
            
            // Check if missile has lived too long or gone too far
            if (missile.userData.lifeTime > missile.userData.maxLifeTime || 
                missile.position.x > 1000 || 
                missile.position.x < -1000) {
                
                // Remove missile
                this.scene.remove(missile);
                this.missiles.splice(i, 1);
                this.missilePool.release(missile);
                continue;
            }
            
            // If a collision callback is provided, let the caller handle collisions
            if (collisionCallback) {
                const collisionResult = collisionCallback(missile, missile.userData.boundingBox);
                if (collisionResult) {
                    // Missile hit something, remove it
                    debugHelper.log(`MissileManager: Missile collision detected, removing missile`);
                    this.scene.remove(missile);
                    this.missiles.splice(i, 1);
                    this.missilePool.release(missile);
                    
                    // Create explosion at impact point
                    if (collisionResult.position) {
                        debugHelper.log(`MissileManager: Creating explosion at impact point (${collisionResult.position.x.toFixed(1)}, ${collisionResult.position.y.toFixed(1)}, ${collisionResult.position.z.toFixed(1)})`);
                        this.createExplosion(collisionResult.position);
                    } else {
                        // Fallback to missile position if no impact point provided
                        debugHelper.log(`MissileManager: No impact point provided, using missile position for explosion`);
                        this.createExplosion(missile.position.clone());
                    }
                }
            }
        }
        
        // Update active explosions
        this.updateExplosions(delta);
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