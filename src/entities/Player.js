import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import debugHelper from '../utils/DebugHelper.js';
import { MissileManager } from './MissileManager.js';

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
        
        // Health and energy
        this.health = 100;
        this.energy = 100;
        this.energyRechargeRate = 5; // Per second
        
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
    }
    
    /**
     * Loads audio assets for the player
     */
    loadSounds() {
        // Check if the audioListener is available
        if (!this.audioListener) {
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
                debugHelper.log("Engine sound loaded");
            }, null, (error) => {
                debugHelper.log("Error loading engine sound: " + error.message, "error");
            });
            
            // Load missile sound
            audioLoader.load('assets/sounds/missile_launch.mp3', (buffer) => {
                this.missileSound.setBuffer(buffer);
                debugHelper.log("Missile sound loaded");
            }, null, (error) => {
                debugHelper.log("Error loading missile sound: " + error.message, "error");
            });
            
            // Load collision sound
            audioLoader.load('assets/sounds/impact.mp3', (buffer) => {
                this.collisionSound.setBuffer(buffer);
                debugHelper.log("Collision sound loaded");
            }, null, (error) => {
                debugHelper.log("Error loading collision sound: " + error.message, "error");
            });
            
            // Add sounds to the model when it's created
            this.soundsLoaded = true;
            
            debugHelper.log("Player sounds initialized");
        } catch (error) {
            debugHelper.log("Error initializing sounds: " + error.message, "error");
            // Game can continue without sounds
            this.soundsLoaded = false;
        }
    }
    
    /**
     * Loads the ship GLB model
     */
    loadShipModel() {
        debugHelper.log("Loading spaceship model...");
        
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
            
            debugHelper.log("Spaceship model loaded successfully!");
        }, (error) => {
            // Error callback
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
        
        console.log("Input listeners set up successfully");
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
     * Update the player
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Process input first for maximum responsiveness
        
        // Auto-fire if enabled, or handle manual shooting
        if (this.autoFire || this.inputControls.shoot) {
            if (this.missileCooldown <= 0) {
                this.shootMissile();
                this.missileCooldown = this.missileCooldownTime;
            }
        }
        
        // Update missile cooldown
        if (this.missileCooldown > 0) {
            this.missileCooldown -= delta;
        }
        
        // Update player movement
        this.updateMovement(delta);
        
        // Update missiles
        this.updateMissiles(delta);
        
        // Update engine effects
        this.updateEngineEffects();
        
        // Update camera position
        this.updateCameraPosition();
        
        // Check for collisions
        this.checkCollisions();
        
        // Update collision cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
        }
        
        // Recharge energy
        if (this.energy < 100) {
            this.energy += this.energyRechargeRate * delta;
            if (this.energy > 100) this.energy = 100;
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
    
    checkCollisions() {
        // Only check collisions if cooldown is inactive and boundingBox exists
        if (this.collisionCooldown <= 0 && this.boundingBox) {
            // We'll implement more sophisticated collision logic here
            // For debris, asteroids, etc.
            
            // Check if our bounding box intersects with any debris
            this.scene.traverse((object) => {
                if (object.userData && object.userData.isDebris) {
                    try {
                        // Calculate object's bounding box
                        const debrisBoundingBox = new THREE.Box3().setFromObject(object);
                        
                        // Check for intersection
                        if (this.boundingBox.intersectsBox(debrisBoundingBox)) {
                            // Handle collision
                            this.handleCollision(object);
                        }
                    } catch (error) {
                        // Silently ignore errors during collision detection
                        // This can happen if objects are being removed or not fully loaded
                        debugHelper.log("Collision detection error: " + error.message, "error");
                    }
                }
            });
        }
    }
    
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
        const debrisMass = userData.mass || (object.mass || 5.0);
        
        // Calculate impact based on relative velocity and mass
        const relativeVelocity = this.velocity.length();
        const impactForce = relativeVelocity * debrisMass * 0.05;
        
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
            debugHelper.log("Collision sound played");
        }
        
        // Set collision cooldown to prevent multiple impacts from same object
        this.collisionCooldown = 0.5; // seconds
    }
    
    /**
     * Shoot a missile
     */
    shootMissile() {
        console.log("Attempting to fire missile");
        
        try {
            // Use the missile manager to shoot a missile from the player's position
            const success = this.missileManager.shootMissile(this.position);
            
            if (success) {
                console.log("Missile fired successfully");
            } else {
                console.log("Failed to fire missile (cooldown or not ready)");
            }
        } catch (error) {
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
                            // Ensure bounding box is up to date
                            if (!asteroid.boundingBox) {
                                asteroid.updateBoundingBox();
                            }
                            
                            if (asteroid.boundingBox) {
                                // Use the asteroid's bounding box as is, without expansion
                                // This will make missiles hit closer to the visual model
                                const asteroidBox = asteroid.boundingBox;
                                
                                // Shrink missile bounding box slightly for more precision
                                const missileBox = boundingBox.clone();
                                // No expansion of missile box for precise collision
                                
                                // Check for intersection with asteroid box
                                if (missileBox.intersectsBox(asteroidBox)) {
                                    collisionFound = true;
                                    
                                    // Calculate impact point at the center of the intersection
                                    const impactPoint = new THREE.Vector3();
                                    
                                    // Calculate intersection of the two boxes
                                    const intersection = new THREE.Box3();
                                    intersection.copy(missileBox).intersect(asteroidBox);
                                    intersection.getCenter(impactPoint);
                                    
                                    // Log the collision
                                    debugHelper.log(`Player: COLLISION! Missile hit asteroid at position (${impactPoint.x.toFixed(1)}, ${impactPoint.y.toFixed(1)}, ${impactPoint.z.toFixed(1)})`);
                                    
                                    // Call the asteroid's handleHit method if it exists
                                    if (typeof asteroid.handleHit === 'function') {
                                        asteroid.handleHit();
                                    }
                                    
                                    // Remove the asteroid
                                    asteroid.remove();
                                    
                                    debugHelper.log("Player: Asteroid destroyed by missile");
                                    
                                    // Set collision result to return to the missile manager
                                    collisionResult = {
                                        position: impactPoint,
                                        object: asteroid
                                    };
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error in missile collision detection:", error);
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
        
        console.log("Side-scroller camera set up");
    }
    
    /**
     * Load the impact explosion model
     */
    loadImpactExplosionModel() {
        // Use the MissileManager for explosions instead of loading our own
        this.impactExplosionModel = null;
        console.log("Impact explosion model loading skipped - using MissileManager for explosions");
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