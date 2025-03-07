import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import debugHelper from '../utils/DebugHelper.js';
import { MissileManager } from './MissileManager.js';
import { HealthBar } from '../ui/HealthBar.js';
import debugVisualizer from '../utils/DebugVisualizer.js';

export class Player {
    constructor(scene, camera, audioListener, resourceManager) {
        this.scene = scene;
        this.camera = camera;
        this.resourceManager = resourceManager; // Store reference to ResourceManager
        
        // Initialize ship properties
        this.position = new THREE.Vector3(-40, 0, 0); // Start more to the left
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.rotationVelocity = new THREE.Vector3(0, 0, 0);
        this.quaternion = new THREE.Quaternion(); // Initialize quaternion for rotation
        
        // Initialize player score
        this.score = 0;
        
        // Gradius-style side-scroller settings
        this.autoScrollSpeed = 30;       // Automatic scroll speed (how fast the world moves)
        this.verticalSpeed = 100;        // Vertical movement speed
        this.horizontalAdjustSpeed = 40; // Speed for minor horizontal adjustments
        this.maxForwardSpeed = 60;       // Max additional forward speed
        this.maxBackwardSpeed = -15;     // Max backward speed (negative)
        this.dragFactor = 0.92;          // Slight drag for arcade feel
        
        // Auto-fire settings
        this.autoFire = false;            // Disable auto-fire - only shoot when space is pressed
        this.missileCooldownTime = 0.2;  // Gradius-like fire rate
        
        // Default position boundaries
        this.minY = -45;                 // Bottom screen boundary
        this.maxY = 45;                  // Top screen boundary
        this.minX = -45;                 // Left screen boundary 
        this.maxX = 45;                  // Right screen boundary
        
        // Speed limits
        this.normalMaxSpeed = 120;
        
        // Ship model placeholder until GLB is loaded
        this.model = null;
        this.shipGroup = null; // Ship group for movement
        this.boundingBox = null;
        this.size = new THREE.Vector3(2, 1, 4); // Default approximate size
        
        // Camera settings for side-scrolling
        this.cameraOffset = new THREE.Vector3(0, 0, 50); // Position camera in front of the scene
        this.cameraDampingFactor = 0.05; // Lower value = smoother but slower camera
        
        // Game mode
        this.gameMode = 'sideScroller'; // Set game mode to side-scroller
        
        // Game state
        this.disableControls = false; // Flag to disable controls on game over
        
        // Input state
        this.inputControls = {
            up: false,
            down: false,
            left: false,
            right: false,
            shoot: false
        };
        
        // Initialize keys object for backward compatibility
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            shoot: false
        };
        
        // Collision detection
        this.collisionCooldown = 0;
        this.collisionCooldownTime = 0.5; // Half a second
        
        // Engine effects
        this.engineParticles = null;
        this.engineLights = [];
        
        // Health and energy - health is now a property we'll modify based on collisions
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.energy = 100;
        this.energyRechargeRate = 5; // Per second
        this.healthBar = new HealthBar(this.maxHealth);
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.invulnerableDuration = 1.0; // One second of invulnerability after being hit
        
        // Weapon systems
        this.missiles = [];
        this.missileCooldown = 0;
        this.missileCooldownTime = 0.1; // Reduced from 0.15 to 0.1 for even faster firing
        
        // Audio
        this.audioListener = audioListener;
        this.engineSound = null;
        this.loadSounds();
        
        // Create model loader
        this.modelLoader = new ModelLoader();
        
        // Start listening for keyboard inputs
        this.setupInputListeners();
        
        // Load models
        this.loadShipModel();
        // No longer loading our own missile model - using ResourceManager instead
        this.loadImpactExplosionModel();
        
        // Explosion tracker
        this.explosions = [];
        
        // Set up the camera for side-scrolling
        this.setupSideScrollCamera();
        
        // Create missile manager
        this.missileManager = new MissileManager(scene, audioListener);
        
        debugHelper.log("Player initialized with health system");
    }
    
    /**
     * Loads audio assets for the player
     */
    loadSounds() {
        // Check if the audioListener is available
        if (!this.audioListener) {
            // Keep this warning
            debugHelper.log("Audio listener not available, skipping sound loading", "warning");
            return;
        }
        
        try {
            // Create an audio loader
            const audioLoader = new THREE.AudioLoader();
            
            // Create engine sound
            this.engineSound = new THREE.PositionalAudio(this.audioListener);
            
            // Set engine sound properties
            this.engineSound.setLoop(true);
            this.engineSound.setVolume(0.5);
            this.engineSound.setRefDistance(20);
            
            // Create missile sound
            this.missileSound = new THREE.PositionalAudio(this.audioListener);
            this.missileSound.setVolume(0.7);
            this.missileSound.setRefDistance(20);
            
            // Create collision sound
            this.collisionSound = new THREE.PositionalAudio(this.audioListener);
            this.collisionSound.setVolume(0.8);
            this.collisionSound.setRefDistance(20);
            
            // Load engine sound
            audioLoader.load('assets/sounds/engine_hum.mp3', (buffer) => {
                this.engineSound.setBuffer(buffer);
                // Remove verbose log
            }, null, (error) => {
                // Keep error logs
                debugHelper.log("Error loading engine sound: " + error.message, "error");
            });
            
            // Load missile sound
            audioLoader.load('assets/sounds/missile_launch.mp3', (buffer) => {
                this.missileSound.setBuffer(buffer);
                // Remove verbose log
            }, null, (error) => {
                // Keep error logs
                debugHelper.log("Error loading missile sound: " + error.message, "error");
            });
            
            // Load collision sound
            audioLoader.load('assets/sounds/impact.mp3', (buffer) => {
                this.collisionSound.setBuffer(buffer);
                // Remove verbose log
            }, null, (error) => {
                // Keep error logs
                debugHelper.log("Error loading collision sound: " + error.message, "error");
            });
            
            // Add sounds to the model when it's created
            this.soundsLoaded = true;
            
            // Remove verbose log
        } catch (error) {
            // Keep error logs
            debugHelper.log("Error initializing sounds: " + error.message, "error");
            // Game can continue without sounds
            this.soundsLoaded = false;
        }
    }
    
    /**
     * Loads the ship GLB model
     */
    loadShipModel() {
        // Remove verbose log
        
        // Load the spaceship model
        this.modelLoader.loadModel('models/spaceships/spaceship_0304124415.glb', (model) => {
            // Success callback
            this.model = model;
            
            // Make materials brighter
            this.model.traverse((child) => {
                if (child.isMesh && child.material) {
                    // If it's an array of materials, process each one
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.emissive = new THREE.Color(0x666666);
                            mat.emissiveIntensity = 0.5;
                            mat.color.multiplyScalar(1.5); // Make colors brighter
                        });
                    } else {
                        // Single material
                        child.material.emissive = new THREE.Color(0x666666);
                        child.material.emissiveIntensity = 0.5;
                        child.material.color.multiplyScalar(1.5); // Make colors brighter
                    }
                }
            });
            
            // Create a group for the ship and add the model to it
            this.shipGroup = new THREE.Group();
            this.shipGroup.add(this.model);
            
            // Make the ship bigger - increased by 15%
            this.model.scale.set(5.75, 5.75, 5.75); // Increased from 5.0 to 5.75 (15% increase)
            
            // Clear existing rotations
            this.model.rotation.set(0, 0, 0);
            this.shipGroup.rotation.set(0, 0, 0);
            
            // First rotate the ship to determine its main direction
            this.model.rotation.y = Math.PI; // 180 degrees - point opposite of default
            
            // Then apply the side-scroller orientation 
            this.shipGroup.rotation.y = 0;  // Align with X axis
            this.shipGroup.rotation.z = 0;  // No roll
            this.shipGroup.rotation.x = 0;  // No pitch
            
            // Position the ship on the left side of the screen
            this.position.set(-40, 0, 0); // Start from left side
            this.shipGroup.position.copy(this.position);
            
            // Add to scene
            this.scene.add(this.shipGroup);
            
            // Create bounding box for collision detection
            this.boundingBox = new THREE.Box3().setFromObject(this.shipGroup);
            
            // Visualize bounding box for debugging
            const visualizer = debugVisualizer.getInstance();
            if (visualizer) {
                visualizer.visualizeBox(this.boundingBox, 'player', 'player');
            }
            
            // Remove verbose log
        }, (error) => {
            // Keep error logs
            debugHelper.log("Failed to load spaceship model: " + error.message, "error");
            
            // Create a simple placeholder ship
            this.createPlaceholderShip();
        });
    }
    
    /**
     * Set up input event listeners
     */
    setupInputListeners() {
        // Store references to bound methods to be able to remove them later
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        
        // Add event listeners
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        
        // Initialize input state
        this.inputControls = {
            up: false,
            down: false,
            left: false,
            right: false,
            shoot: false
        };
        
        // Make sure keys object is synchronized with inputControls
        this.keys = this.inputControls;
        
        // Remove console log
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        // Prevent default behavior for game controls to avoid browser scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
        
        const code = event.code;
        
        switch (code) {
            case 'ArrowUp':
            case 'KeyW':
                this.inputControls.up = true;
                this.keys.up = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.inputControls.down = true;
                this.keys.down = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.inputControls.left = true;
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.inputControls.right = true;
                this.keys.right = true;
                break;
            case 'Space':
                this.inputControls.shoot = true;
                this.keys.shoot = true;
                
                // For immediate response, try to shoot right away if cooldown is ready
                if (this.missileCooldown <= 0) {
                    this.shootMissile();
                    this.missileCooldown = this.missileCooldownTime;
                }
                break;
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyUp(event) {
        // Prevent default behavior for game controls
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
        
        const code = event.code;
        
        switch (code) {
            case 'ArrowUp':
            case 'KeyW':
                this.inputControls.up = false;
                this.keys.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.inputControls.down = false;
                this.keys.down = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.inputControls.left = false;
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.inputControls.right = false;
                this.keys.right = false;
                break;
            case 'Space':
                this.inputControls.shoot = false;
                this.keys.shoot = false;
                break;
        }
    }
    
    /**
     * Update the player state
     * @param {number} delta - The time in seconds since the last update
     */
    update(delta) {
        // If controls are disabled (game over), only update animations
        if (this.disableControls) {
            // Update explosions if any
            if (this.explosions.length > 0) {
                this.explosions.forEach((explosion, index) => {
                    explosion.update(delta);
                    if (explosion.isDone) {
                        this.scene.remove(explosion.mesh);
                        this.explosions.splice(index, 1);
                    }
                });
            }
            return;
        }

        // Process cooldowns
        this.missileCooldown = Math.max(0, this.missileCooldown - delta);
        this.collisionCooldown = Math.max(0, this.collisionCooldown - delta);
        
        // Update invulnerability status
        if (this.invulnerable) {
            this.invulnerableTime -= delta;
            
            // Make ship blink when invulnerable
            if (this.model) {
                this.model.visible = Math.floor(this.invulnerableTime * 10) % 2 === 0;
            }
            
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
                if (this.model) {
                    this.model.visible = true;
                }
            }
        }
        
        // Perform movement update
        this.updateMovement(delta);
        
        // Update visual effects
        if (this.engineParticles) {
            this.updateEngineEffects();
        }
        
        // Update camera position
        this.updateCameraPosition();
        
        // Auto-fire missiles if enabled
        if (this.autoFire && this.missileCooldown <= 0) {
            this.shootMissile();
        }
        
        // Manual fire missiles if space is pressed
        if (this.inputControls.shoot && this.missileCooldown <= 0) {
            this.shootMissile();
        }
        
        // Update missiles with collision detection
        this.updateMissiles(delta);
        
        // Check for collisions
        if (this.collisionCooldown <= 0 && this.boundingBox && !this.invulnerable) {
            this.checkCollisions();
        }
        
        // Update the bounding box to match the ship's current position
        if (this.boundingBox && this.shipGroup) {
            this.boundingBox.setFromObject(this.shipGroup);
            
            // Update visualization for debugging
            const visualizer = debugVisualizer.getInstance();
            if (visualizer) {
                visualizer.visualizeBox(this.boundingBox, 'player', 'player');
            }
        }
    }
    
    updateMovement(delta) {
        // Always apply a small forward velocity for classic side-scroller feel
        this.velocity.set(0, 0, 0);
        
        // In Gradius-style games, UP/DOWN are the primary controls
        if (this.inputControls.up) {
            this.velocity.y = this.verticalSpeed;
        }
        if (this.inputControls.down) {
            this.velocity.y = -this.verticalSpeed;
        }
        
        // LEFT/RIGHT adjust horizontal speed but don't fully control it
        // LEFT slows down slightly, RIGHT speeds up slightly
        let horizontalSpeed = 0;
        
        if (this.inputControls.right) {
            horizontalSpeed = this.horizontalAdjustSpeed;
        } else if (this.inputControls.left) {
            horizontalSpeed = -this.horizontalAdjustSpeed * 0.5; // Slower backward movement
        }
        
        this.velocity.x = horizontalSpeed;
        
        // Update position with delta time
        const fixedDelta = Math.min(delta, 0.016); // Cap at 60fps equivalent
        this.position.add(this.velocity.clone().multiplyScalar(fixedDelta));
        
        // Apply position boundaries for screen limits
        if (this.position.y < this.minY) this.position.y = this.minY;
        if (this.position.y > this.maxY) this.position.y = this.maxY;
        if (this.position.x < this.minX) this.position.x = this.minX;
        if (this.position.x > this.maxX) this.position.x = this.maxX;
        
        // Update ship model position and rotation if available
        if (this.shipGroup) {
            // Update position
            this.shipGroup.position.copy(this.position);
            
            // Calculate target rotation based on vertical movement
            const targetRotationX = this.calculateShipTilt();
            
            // Smoothly interpolate current rotation to target rotation
            const rotationLerpFactor = 0.1; // Adjust this value to change tilt responsiveness
            this.shipGroup.rotation.x = THREE.MathUtils.lerp(
                this.shipGroup.rotation.x,
                targetRotationX,
                rotationLerpFactor
            );
        }
        
        // Update bounding box
        if (this.boundingBox) {
            this.boundingBox.setFromObject(this.shipGroup);
        }
    }
    
    /**
     * Calculate ship tilt based on vertical movement
     * @returns {number} Target rotation in radians
     */
    calculateShipTilt() {
        const maxTiltAngle = Math.PI / 8; // 22.5 degrees maximum tilt (reduced from 30)
        let targetTilt = 0;
        
        if (this.inputControls.up) {
            // Bank left when moving up
            targetTilt = maxTiltAngle;
        } else if (this.inputControls.down) {
            // Bank right when moving down
            targetTilt = -maxTiltAngle;
        }
        
        // Add a slight tilt based on vertical velocity for smooth transitions
        if (!this.inputControls.up && !this.inputControls.down) {
            targetTilt = -(this.velocity.y / this.verticalSpeed) * (maxTiltAngle * 0.5);
        }
        
        return targetTilt;
    }
    
    /**
     * Sets up engine visual and audio effects
     */
    setupEngineEffects() {
        // Create engine glow material - use orange/red for classic Gradius style
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            emissive: 0xff3300,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.7
        });
        
        // Create engine glow mesh
        const engineGeometry = new THREE.ConeGeometry(0.5, 2.0, 8);
        // For Gradius style, engine exhaust points left (negative X axis)
        this.engineGlow = new THREE.Mesh(engineGeometry, engineMaterial);
        
        // Position at the back of the ship for Gradius-style orientation
        // The ship is now rotated to face right, so the back is along the negative X axis
        this.engineGlow.position.set(-3, 0, 0);
        this.engineGlow.rotation.z = -Math.PI / 2; // Point engine exhaust left
        
        // Add engine glow to ship model
        this.model.add(this.engineGlow);
        
        // Create engine light
        this.engineLight = new THREE.PointLight(0xff6600, 4, 15);
        this.engineLight.position.copy(this.engineGlow.position);
        this.model.add(this.engineLight);
        
        // Add a second, smaller engine glow
        const secondaryGlow = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1.2, 8),
            engineMaterial.clone()
        );
        secondaryGlow.position.set(-3, 0.8, 0); // Slightly offset from main engine
        secondaryGlow.rotation.z = -Math.PI / 2; // Point engine exhaust left
        this.model.add(secondaryGlow);
        this.secondaryGlow = secondaryGlow;
        
        // Create a small flickering light for the secondary engine
        const secondaryLight = new THREE.PointLight(0xff3300, 2, 10);
        secondaryLight.position.copy(secondaryGlow.position);
        this.model.add(secondaryLight);
        this.secondaryLight = secondaryLight;
        
        // Attach engine sound to the ship if available
        if (this.soundsLoaded && this.engineSound) {
            this.model.add(this.engineSound);
        }
        
        // Initial visibility - always visible for Gradius style
        this.engineGlow.visible = true;
        this.engineLight.visible = true;
        this.secondaryGlow.visible = true;
        this.secondaryLight.visible = true;
    }
    
    /**
     * Updates engine visual and audio effects based on player input
     */
    updateEngineEffects() {
        // For Gradius style, engines are always on, but vary in intensity
        // Initialize time counter if not already set
        if (!this.engineTime) {
            this.engineTime = 0;
        }
        
        // Update time counter
        this.engineTime += 0.05;
        
        // Create a pulsing effect for the engines
        const basePulse = Math.sin(this.engineTime * 10) * 0.2 + 0.8; // Oscillate between 0.6 and 1.0
        
        // Apply random flicker
        const flicker = Math.random() * 0.2 + 0.9; // Random value between 0.9 and 1.1
        const totalFactor = basePulse * flicker;
        
        // Apply to the main engine
        if (this.engineGlow) {
            this.engineGlow.material.opacity = 0.7 * totalFactor;
            this.engineGlow.scale.set(1, 1 * totalFactor, 1);
        }
        
        if (this.engineLight) {
            this.engineLight.intensity = 4 * totalFactor;
        }
        
        // Apply slightly different effect to secondary engine
        const secondaryFactor = Math.sin(this.engineTime * 12 + 1) * 0.3 + 0.7; // Different phase and amplitude
        
        if (this.secondaryGlow) {
            this.secondaryGlow.material.opacity = 0.6 * secondaryFactor;
            this.secondaryGlow.scale.set(1, 1 * secondaryFactor, 1);
        }
        
        if (this.secondaryLight) {
            this.secondaryLight.intensity = 2 * secondaryFactor;
        }
        
        // Update engine sound if available
        if (this.soundsLoaded && this.engineSound) {
            // Always on for Gradius style but varying in volume
            if (!this.engineSound.isPlaying) {
                this.engineSound.play();
            }
            this.engineSound.setVolume(0.5 * totalFactor);
        }
    }
    
    updateCameraPosition() {
        // For Gradius-style side-scrolling, position the camera to show more of what's ahead
        // Position the camera so the player is about 1/3 from the left edge of the screen
        
        const lookAheadOffset = 20; // How far ahead to look
        
        // Set the camera position
        this.camera.position.set(this.position.x + lookAheadOffset, this.position.y, 100);
        this.camera.lookAt(this.position.x + lookAheadOffset, this.position.y, 0);
    }
    
    /**
     * Check for collisions with other objects
     */
    checkCollisions() {
        try {
            // Only check collisions if cooldown is inactive and boundingBox exists
            if (this.collisionCooldown <= 0 && this.boundingBox) {
                // Check if our bounding box intersects with any debris or asteroids
                this.scene.traverse((object) => {
                    if (object.userData && (object.userData.isDebris || object.userData.isAsteroid)) {
                        try {
                            // Get asteroid reference if available
                            const asteroid = object.userData.asteroidRef;
                            
                            if (asteroid && asteroid.checkCollision) {
                                // Use the asteroid's sphere-based collision detection
                                if (asteroid.checkCollision(this.boundingBox)) {
                                    // Handle collision with the asteroid
                                    this.handleCollision(object);
                                }
                            } else {
                                // Fallback to box-based collision for other objects
                                const debrisBoundingBox = new THREE.Box3().setFromObject(object);
                                
                                // Check for intersection
                                if (this.boundingBox.intersectsBox(debrisBoundingBox)) {
                                    // Handle collision
                                    this.handleCollision(object);
                                }
                            }
                        } catch (error) {
                            // Silently ignore errors during collision detection
                            // This can happen if objects are being removed or not fully loaded
                            debugHelper.log("Collision detection error: " + error.message, "error");
                        }
                    }
                });
            }
        } catch (error) {
            // Keep error logs
            debugHelper.log("Collision detection error: " + error.message, "error");
        }
    }
    
    /**
     * Handle a collision with another object
     * @param {Object} object - The object collided with
     */
    handleCollision(object) {
        // Safety check - if object is null or undefined, return
        if (!object) {
            console.warn("Player.handleCollision called with null or undefined object");
            return;
        }
        
        // Ensure userData exists
        const userData = object.userData || {};
        
        // Get object properties with safe defaults
        const debrisType = userData.debrisType || 'asteroid';
        const isAsteroid = userData.isAsteroid || false;
        
        // Get the mass, with multiple fallback options
        let debrisMass = userData.mass; // First try userData.mass
        
        if (debrisMass === undefined || debrisMass === null) {
            // If there's a direct reference to the asteroid, use its mass
            if (userData.asteroidRef && userData.asteroidRef.mass !== undefined) {
                debrisMass = userData.asteroidRef.mass;
            } else if (object.mass !== undefined) {
                // Try object.mass as fallback
                debrisMass = object.mass;
            } else {
                // Last resort default
                debrisMass = 5.0;
            }
        }
        
        // Only log significant collisions
        if (debrisMass > 100) {
            debugHelper.log(`Collision with ${debrisType} of mass: ${debrisMass.toFixed(1)}`);
        }
        
        // Calculate impact based on relative velocity and mass
        const relativeVelocity = this.velocity.length();
        const impactForce = relativeVelocity * debrisMass * 0.05;
        
        // Calculate damage based on debris mass
        let damage = 0;
        if (isAsteroid || debrisType === 'asteroid') {
            // Damage based on asteroid size/mass
            damage = debrisMass * 2; // Larger asteroids do more damage
            
            // Get the asteroid reference and destroy it
            if (userData.asteroidRef) {
                const asteroid = userData.asteroidRef;
                
                // Create an explosion at the asteroid position
                // Use object position if available, or asteroid position as fallback
                const explosionPosition = object.position ? object.position.clone() : 
                                          (asteroid.position ? asteroid.position.clone() : this.position.clone());
                
                this.createExplosion(explosionPosition);
                
                // Log the asteroid destruction
                debugHelper.log("Player collided with asteroid - destroying it");
                
                // Call handleHit for any additional asteroid destruction effects
                if (typeof asteroid.handleHit === 'function') {
                    debugHelper.log(`Calling asteroid.handleHit for asteroid with mass: ${asteroid.mass || 'undefined'}`);
                    asteroid.handleHit();
                } else {
                    debugHelper.log('Asteroid has no handleHit method');
                }
                                                
                // Remove the asteroid
                asteroid.remove();
            } else if (userData.isAsteroid) {
                // For asteroids without a proper reference, just create an explosion
                const explosionPosition = object.position ? object.position.clone() : this.position.clone();
                this.createExplosion(explosionPosition);
                debugHelper.log("Player collided with asteroid but couldn't get proper reference");
                
                // Try to remove the object directly
                if (object.parent) {
                    object.parent.remove(object);
                } else {
                    this.scene.remove(object);
                }
            }
        } else {
            // Generic damage for other types
            damage = 5;
        }
        
        // Apply calculated damage (capped at 30% of max health per hit for gameplay)
        damage = Math.min(damage, this.maxHealth * 0.3);
        
        // Apply damage to health
        this.health = Math.max(0, this.health - damage);
        
        // Update health bar
        this.healthBar.update(this.health);
        
        // Set invulnerability briefly after being hit
        this.invulnerable = true;
        this.invulnerableTime = this.invulnerableDuration;
        
        // Check for death
        if (this.health <= 0) {
            this.handleDeath();
        }
        
        // Apply collision response - bounce back in approximately opposite direction
        // First get normalized velocity vector
        const bounceDirection = this.velocity.clone().normalize().multiplyScalar(-1);
        
        // Add some randomness to the bounce
        bounceDirection.x += (Math.random() - 0.5) * 0.2;
        bounceDirection.y += (Math.random() - 0.5) * 0.2;
        bounceDirection.z += (Math.random() - 0.5) * 0.2;
        
        // Apply bounce force
        this.velocity.addScaledVector(bounceDirection, impactForce);
        
        // Add some rotation from impact
        this.rotation.x += (Math.random() - 0.5) * 0.1;
        this.rotation.z += (Math.random() - 0.5) * 0.1;
        
        // Play collision sound
        if (this.soundsLoaded && this.collisionSound && this.collisionSound.buffer) {
            // Reset if already playing
            if (this.collisionSound.isPlaying) {
                this.collisionSound.stop();
            }
            this.collisionSound.play();
        }
        
        // Set collision cooldown to prevent multiple impacts from same object
        this.collisionCooldown = 0.5; // seconds
        
        debugHelper.log(`Player took ${damage.toFixed(1)} damage. Health: ${this.health.toFixed(1)}/${this.maxHealth}`);
    }
    
    /**
     * Handle player death
     */
    handleDeath() {
        // Create explosion at player position
        this.createExplosion(this.position);
        
        // Keep important game state log
        debugHelper.log("Player died! Game Over!");
        
        // Hide the player ship
        if (this.model) {
            this.model.visible = false;
        }
        
        // Disable player controls
        this.disableControls = true;
        
        // Create game over UI
        this.showGameOver();
        
        // Stop any playing sounds
        if (this.engineSound && this.engineSound.isPlaying) {
            this.engineSound.stop();
        }
    }
    
    /**
     * Display game over screen
     */
    showGameOver() {
        // Create game over container
        const gameOverContainer = document.createElement('div');
        gameOverContainer.id = 'game-over-container';
        gameOverContainer.style.position = 'absolute';
        gameOverContainer.style.top = '0';
        gameOverContainer.style.left = '0';
        gameOverContainer.style.width = '100%';
        gameOverContainer.style.height = '100%';
        gameOverContainer.style.display = 'flex';
        gameOverContainer.style.flexDirection = 'column';
        gameOverContainer.style.alignItems = 'center';
        gameOverContainer.style.justifyContent = 'center';
        gameOverContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        gameOverContainer.style.zIndex = '1000';
        gameOverContainer.style.transition = 'opacity 1s';
        gameOverContainer.style.opacity = '0';
        
        // Create game over text
        const gameOverText = document.createElement('h1');
        gameOverText.textContent = 'GAME OVER';
        gameOverText.style.color = '#ff0000';
        gameOverText.style.fontFamily = '"Orbitron", sans-serif';
        gameOverText.style.fontSize = '48px';
        gameOverText.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
        gameOverText.style.marginBottom = '30px';
        
        // Create restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'RESTART';
        restartButton.style.backgroundColor = '#222';
        restartButton.style.color = '#fff';
        restartButton.style.border = '2px solid #0ff';
        restartButton.style.borderRadius = '5px';
        restartButton.style.padding = '10px 20px';
        restartButton.style.fontSize = '18px';
        restartButton.style.fontFamily = '"Orbitron", sans-serif';
        restartButton.style.cursor = 'pointer';
        restartButton.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.7)';
        restartButton.style.transition = 'all 0.3s';
        
        // Button hover effect
        restartButton.onmouseover = () => {
            restartButton.style.backgroundColor = '#0ff';
            restartButton.style.color = '#000';
        };
        
        restartButton.onmouseout = () => {
            restartButton.style.backgroundColor = '#222';
            restartButton.style.color = '#fff';
        };
        
        // Button click event
        restartButton.onclick = () => {
            window.location.reload();
        };
        
        // Add elements to container
        gameOverContainer.appendChild(gameOverText);
        gameOverContainer.appendChild(restartButton);
        
        // Add container to document
        document.body.appendChild(gameOverContainer);
        
        // Fade in the game over screen
        setTimeout(() => {
            gameOverContainer.style.opacity = '1';
        }, 100);
    }
    
    /**
     * Shoot a missile
     */
    shootMissile() {
        try {
            // Use the missile manager to shoot a missile from the player's position
            const success = this.missileManager.shootMissile(this.position);
            
            if (success) {
                // Remove console log
            } else {
                // Remove console log
            }
        } catch (error) {
            // Keep error logs
            console.error("Error shooting missile:", error);
        }
    }
    
    /**
     * Update missiles and check for collisions
     * @param {number} delta - Time step in seconds
     */
    updateMissiles(delta) {
        // Use the missile manager to update missiles
        if (this.missileManager) {
            this.missileManager.update(delta, (missile, boundingBox) => {
                // Check for collisions with asteroids
                let collisionFound = false;
                let collisionResult = null;
                
                // Debug logging for missile position (occasionally)
                if (Math.random() < 0.01) {
                    debugHelper.log(`Player: Missile at position (${missile.position.x.toFixed(1)}, ${missile.position.y.toFixed(1)}, ${missile.position.z.toFixed(1)})`);
                }
                
                // Direct check for objects with isAsteroid flag (optimization)
                const potentialTargets = [];
                this.scene.traverse((object) => {
                    if (object.userData && object.userData.isAsteroid) {
                        potentialTargets.push(object);
                    }
                });
                
                // Log the number of potential targets occasionally
                if (Math.random() < 0.01) {
                    debugHelper.log(`Player: Found ${potentialTargets.length} potential asteroid targets`);
                }
                
                // Check each potential target
                for (const object of potentialTargets) {
                    if (collisionFound) break; // Stop if we already found a collision
                    
                    try {
                        // Get the asteroid reference
                        const asteroid = object.userData.asteroidRef;
                        
                        // Only check collision if asteroid is fully loaded
                        if (asteroid && asteroid.isModelLoaded) {
                            // Use the asteroid's sphere-based collision detection
                            if (asteroid.checkCollision && asteroid.checkCollision(boundingBox)) {
                                collisionFound = true;
                                
                                // Calculate the actual impact point - find the closest point on missile bounding box to asteroid center
                                const missileClosestPoint = new THREE.Vector3();
                                boundingBox.clampPoint(asteroid.boundingSphere.center, missileClosestPoint);
                                
                                // Find the direction from asteroid center to missile
                                const impactDirection = new THREE.Vector3().subVectors(missileClosestPoint, asteroid.boundingSphere.center).normalize();
                                
                                // Calculate the actual impact point on the asteroid surface
                                const impactPoint = new THREE.Vector3().addVectors(
                                    asteroid.boundingSphere.center,
                                    impactDirection.multiplyScalar(asteroid.boundingSphere.radius)
                                );
                                
                                // Log the collision
                                debugHelper.log(`Player: COLLISION! Missile hit asteroid at position (${impactPoint.x.toFixed(1)}, ${impactPoint.y.toFixed(1)}, ${impactPoint.z.toFixed(1)})`);
                                
                                // Call the asteroid's handleHit method if it exists
                                if (typeof asteroid.handleHit === 'function') {
                                    debugHelper.log(`Calling asteroid.handleHit for asteroid with mass: ${asteroid.mass || 'undefined'}`);
                                    asteroid.handleHit();
                                } else {
                                    debugHelper.log('Asteroid has no handleHit method');
                                }
                                
                                // Increase player score based on asteroid mass
                                if (this.score !== undefined && asteroid.mass) {
                                    const scoreValue = Math.floor(asteroid.mass); // Double points for shooting vs collision
                                    const oldScore = this.score;
                                    this.score += scoreValue;
                                    debugHelper.log(`Player score increased from ${oldScore} to ${this.score} (+${scoreValue}) for missile hit`);
                                } else {
                                    debugHelper.log(`Could not update score: score=${this.score !== undefined}, asteroid.mass=${asteroid.mass || 'undefined'}`);
                                }
                                
                                // Create explosion at the actual impact point on asteroid surface
                                this.createExplosion(impactPoint);
                                
                                // Create an explosion at the missile's position too
                                this.missileManager.createExplosion(missile.position.clone());
                                
                                // Remove the asteroid
                                asteroid.remove();
                                
                                // Set collision result with impact position for the MissileManager
                                collisionResult = {
                                    position: impactPoint,
                                    object: asteroid
                                };
                            }
                        }
                    } catch (error) {
                        // Log error but continue checking other asteroids
                        debugHelper.log(`Player: Error checking missile collision: ${error.message}`, "error");
                    }
                }
                
                // Return the collision result to the missile manager
                return collisionResult;
            });
        }
    }
    
    /**
     * Set up the side-scroller camera
     */
    setupSideScrollCamera() {
        // Position the camera for a Gradius-style side view
        // Initial position - will be updated in updateCameraPosition
        this.camera.position.set(-20, 0, 100);
        this.camera.lookAt(0, 0, 0);
        
        // Make sure the camera is orthographic for true 2D feel
        if (this.camera instanceof THREE.PerspectiveCamera) {
            // Store the original camera to restore if needed
            this.perspectiveCamera = this.camera.clone();
            
            // Create an orthographic camera with similar frustum
            const aspect = window.innerWidth / window.innerHeight;
            const frustumSize = 100;
            const newCamera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                frustumSize / -2,
                0.1,
                1000
            );
            
            // Position the orthographic camera for Gradius-style view
            newCamera.position.set(-20, 0, 100);
            newCamera.lookAt(0, 0, 0);
            
            // Replace the perspective camera with orthographic
            Object.assign(this.camera, newCamera);
        }
        
        // Remove console log
    }
    
    /**
     * Load the impact explosion model
     */
    loadImpactExplosionModel() {
        // Use the MissileManager for explosions instead of loading our own
        this.impactExplosionModel = null;
        // Remove console.log
    }
    
    /**
     * Plays a missile launch sound
     */
    playMissileSound() {
        // This is now handled by the MissileManager
        // Keeping this method as a no-op for backward compatibility
    }
    
    /**
     * Create an explosion at the specified position
     * This is now a wrapper around the MissileManager's createExplosion method
     * @param {THREE.Vector3} position - The position to create the explosion at
     */
    createExplosion(position) {
        if (this.missileManager) {
            this.missileManager.createExplosion(position);
        }
    }
} 