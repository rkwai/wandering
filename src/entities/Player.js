import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import debugHelper from '../utils/DebugHelper.js';

export class Player {
    constructor(scene, camera, audioListener) {
        this.scene = scene;
        this.camera = camera;
        
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
        this.loadMissileModel();
        
        // Explosion tracker
        this.explosions = [];
        
        // Set up the camera for side-scrolling
        this.setupSideScrollCamera();
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
            
            // Make the ship bigger
            this.model.scale.set(5.0, 5.0, 5.0); // Increased size for visibility
            
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
     * Load the missile model
     */
    loadMissileModel() {
        console.log("Loading missile GLB model...");
        
        this.modelLoader.loadModel('models/spaceships/spaceship_missile_0304125431.glb', (model) => {
            console.log("Missile GLB model loaded successfully");
            
            // Make materials brighter
            model.traverse((child) => {
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
            
            this.missileModel = model;
            
            // Hide the original model - we'll clone it for each missile
            model.visible = false;
            this.scene.add(model);
        }, (error) => {
            console.error("Failed to load missile GLB model:", error);
            // Fallback to default missile model if loading fails
            this.createDefaultMissileModel();
        });
    }
    
    /**
     * Create a simple default missile model as fallback
     */
    createDefaultMissileModel() {
        console.log("Creating 100% guaranteed visible missile model");
        
        // Create a fresh group for the missile
        const missileGroup = new THREE.Group();
        
        // Create a SIMPLE missile body using MeshBasicMaterial - always visible regardless of lighting
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4.0, 8);
        const bodyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, // Bright red
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2; // Rotate to point along X axis
        missileGroup.add(body);
        
        // Add a nose cone
        const noseGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const noseMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00 // Bright yellow
        });
        
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(2.5, 0, 0); // Position at the front
        nose.rotation.z = -Math.PI / 2; // Orient correctly
        missileGroup.add(nose);
        
        // Add visible fins
        const finGeometry = new THREE.BoxGeometry(1.0, 0.1, 1.0);
        const finMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff // White
        });
        
        // Add four fins for better visibility from all angles
        const positions = [
            [0, 0, 0.5],  // Top
            [0, 0, -0.5], // Bottom
            [0, 0.5, 0],  // Right
            [0, -0.5, 0]  // Left
        ];
        
        for (const [x, y, z] of positions) {
            const fin = new THREE.Mesh(finGeometry, finMaterial);
            fin.position.set(-1.0, y, z);
            missileGroup.add(fin);
        }
        
        // Set the missile model to this simplified group
        this.missileModel = missileGroup;
        
        console.log("Created simple, guaranteed visible missile model");
        return missileGroup;
    }
    
    /**
     * Set up input event listeners
     */
    setupInputListeners() {
        // Store references to bound methods to be able to remove them later
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        
        // Add event listeners
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        document.addEventListener('mousemove', this.boundMouseMove);
        
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
     * Handle mouse movement
     * @param {number} movementX - Mouse X movement
     * @param {number} movementY - Mouse Y movement
     */
    handleMouseMove(movementX, movementY) {
        // Not used in side-scroller mode
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
            case 'KeyV':
                this.toggleViewMode();
                break;
        }
    }
    
    toggleViewMode() {
        // Toggle between first and third person views
        this.viewMode = this.viewMode === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';
    }
    
    /**
     * Update player state
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
        
        // Update movement
        this.updateMovement(delta);
        
        // Update engine effects based on movement
        this.updateEngineEffects();
        
        // Update missiles
        this.updateMissiles(delta);
        
        // Update explosions
        this.updateExplosions(delta);
        
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
        
        // Update ship model position if available
        if (this.shipGroup) {
            this.shipGroup.position.copy(this.position);
        }
        
        // Update bounding box
        if (this.boundingBox) {
            this.boundingBox.setFromObject(this.shipGroup);
        }
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
            let missileModel;
            
            if (this.missileModel) {
                // Clone the loaded GLB model
                missileModel = this.missileModel.clone();
                missileModel.visible = true;
            } else {
                // Fallback to default model if GLB hasn't loaded yet
                missileModel = this.createDefaultMissileModel();
            }
            
            // Set up the missile for side-scrolling
            this.setupSideScrollerMissile(missileModel);
            
            // Play missile sound
            this.playMissileSound();
            
            console.log("Missile fired successfully");
        } catch (error) {
            console.error("Error shooting missile:", error);
        }
    }
    
    /**
     * Sets up a missile for side-scrolling gameplay
     * @param {THREE.Object3D} model - The missile model
     */
    setupSideScrollerMissile(model) {
        console.log("Setting up missile");
        
        // Scale the missile up for visibility
        model.scale.set(5.0, 5.0, 5.0);
        
        // Position the missile at the front of the ship
        const missilePosition = new THREE.Vector3().copy(this.position);
        missilePosition.x += 20; // Position in front of the ship
        model.position.copy(missilePosition);
        
        // Add to scene
        this.scene.add(model);
        
        // Set missile properties
        const missileVelocity = new THREE.Vector3(200, 0, 0); // Horizontal movement
        
        // Add to missiles array for tracking
        this.missiles.push({
            model: model,
            velocity: missileVelocity,
            lifeTime: 0,
            maxLifeTime: 5 // 5 seconds before disappearing
        });
        
        // Debug log
        console.log("Missile deployed at position:", missilePosition);
        
        // Play sound effect
        this.playMissileSound();
    }
    
    /**
     * Plays a missile launch sound
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
     * Updates all active missiles
     * @param {number} delta - Time step in seconds
     */
    updateMissiles(delta) {
        // Process each missile
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            
            // Update missile position based on velocity
            missile.model.position.x += missile.velocity.x * delta;
            missile.model.position.y += missile.velocity.y * delta;
            missile.model.position.z += missile.velocity.z * delta;
            
            // Update missile lifetime
            missile.lifeTime += delta;
            
            // Remove missile if it's gone too far or lived too long
            if (missile.lifeTime > missile.maxLifeTime || 
                missile.model.position.x > 1000 || 
                missile.model.position.x < -1000) {
                
                // Remove from scene
                this.scene.remove(missile.model);
                
                // Remove from array
                this.missiles.splice(i, 1);
                console.log("Missile removed, remaining:", this.missiles.length);
            }
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
     * Updates all active explosions
     * @param {number} delta - Time step in seconds
     */
    updateExplosions(delta) {
        if (!this.explosions || this.explosions.length === 0) {
            return;
        }
        
        // Process each explosion from end to start to safely remove
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            
            // Update lifetime
            explosion.lifetime += delta;
            
            // Check if explosion has completed
            if (explosion.lifetime >= explosion.maxLifetime) {
                // Remove light
                if (explosion.light) {
                    this.scene.remove(explosion.light);
                }
                
                // Remove particles
                if (explosion.particles) {
                    this.scene.remove(explosion.particles);
                }
                
                // Remove from array
                this.explosions.splice(i, 1);
                continue;
            }
            
            // Calculate fade factor (1 at start, 0 at end)
            const fadeFactor = 1 - (explosion.lifetime / explosion.maxLifetime);
            
            // Update light intensity
            if (explosion.light) {
                explosion.light.intensity = 5 * fadeFactor;
            }
            
            // Update particles
            if (explosion.particles) {
                const positions = explosion.particles.geometry.attributes.position.array;
                const velocities = explosion.particles.userData.velocities;
                
                // Update particle positions
                for (let j = 0; j < velocities.length; j++) {
                    // Apply velocity
                    positions[j * 3] += velocities[j].x * delta;
                    positions[j * 3 + 1] += velocities[j].y * delta;
                    positions[j * 3 + 2] += velocities[j].z * delta;
                    
                    // Slow down velocity (simulate air resistance)
                    velocities[j].multiplyScalar(0.95);
                }
                
                // Update opacity
                explosion.particles.material.opacity = fadeFactor;
                
                // Update the buffer
                explosion.particles.geometry.attributes.position.needsUpdate = true;
            }
        }
    }
    
    /**
     * Creates an explosion effect at the specified position
     * @param {THREE.Vector3} position - Position for the explosion
     */
    createExplosion(position) {
        // Create light flash
        const explosionLight = new THREE.PointLight(0xff7700, 5, 20);
        explosionLight.position.copy(position);
        this.scene.add(explosionLight);
        
        // Create particle burst
        const particleCount = 30;
        const particles = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];
        
        // Initialize particles at explosion center
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            // Random direction
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            
            // Random speed
            const speed = Math.random() * 5 + 5;
            velocities.push(direction.multiplyScalar(speed));
            
            // Orange/yellow colors
            colors[i * 3] = 1; // Red
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // Green (orange to yellow)
            colors[i * 3 + 2] = 0; // Blue
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create material
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1
        });
        
        // Create particle system
        const explosionParticles = new THREE.Points(particles, particleMaterial);
        explosionParticles.userData.velocities = velocities;
        
        this.scene.add(explosionParticles);
        
        // Add to explosions array
        if (!this.explosions) {
            this.explosions = [];
        }
        
        this.explosions.push({
            light: explosionLight,
            particles: explosionParticles,
            lifetime: 0,
            maxLifetime: 1 // 1 second
        });
    }
} 