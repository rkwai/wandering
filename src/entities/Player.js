import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import debugHelper from '../utils/DebugHelper.js';

export class Player {
    constructor(scene, camera, audioListener) {
        this.scene = scene;
        this.camera = camera;
        
        // Initialize ship properties
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.rotationVelocity = new THREE.Vector3(0, 0, 0);
        this.quaternion = new THREE.Quaternion(); // Initialize quaternion for rotation
        
        // Movement settings for side-scrolling
        this.maxAcceleration = 30; // Units per second squared
        this.maxSpeed = 30;        // Maximum speed in units per second
        this.moveSpeed = 20;       // Base movement speed for side-scrolling
        this.dragFactor = 0.9;     // Drag to slow the ship when not accelerating
        
        // Speed limits
        this.normalMaxSpeed = 30;
        
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
        this.missileCooldownTime = 0.3; // Reduced cooldown for side-scroller gameplay
        
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
        // Try to get a ship model from the showcase first (which should be preloaded)
        if (window.game && window.game.modelShowcase) {
            const shipModel = window.game.modelShowcase.getShipModel();
            if (shipModel) {
                debugHelper.log("Using ship model from showcase");
                
                // Clone the model to avoid modifying the original
                this.model = shipModel.clone();
                
                // Scale the model up for side-scrolling view
                this.model.scale.set(3.0, 3.0, 3.0); // Make the ship bigger
                
                // Flip the model on Y axis for side-scrolling
                this.model.rotation.set(0, Math.PI, 0);
                
                // Create a group for the ship
                this.shipGroup = new THREE.Group();
                this.shipGroup.add(this.model);
                this.shipGroup.position.copy(this.position);
                
                // Add to scene
                this.scene.add(this.shipGroup);
                
                // Create bounding box for collision detection
                this.boundingBox = new THREE.Box3().setFromObject(this.model);
                
                // Set up engine effects
                this.setupEngineEffects();
                
                return;
            }
        }
        
        // If no model from showcase, load directly
        this.modelLoader.loadModel(
            'models/spaceships/spaceship_0304124415.glb',
            (model) => {
                debugHelper.log("Ship model loaded successfully");
                
                // Store the model
                this.model = model;
                
                // Scale the model up for side-scrolling view
                this.model.scale.set(3.0, 3.0, 3.0); // Make the ship bigger
                
                // Flip the model on Y axis for side-scrolling
                this.model.rotation.set(0, Math.PI, 0);
                
                // Create a group for the ship
                this.shipGroup = new THREE.Group();
                this.shipGroup.add(this.model);
                this.shipGroup.position.copy(this.position);
                
                // Add to scene
                this.scene.add(this.shipGroup);
                
                // Create bounding box for collision detection
                this.boundingBox = new THREE.Box3().setFromObject(this.model);
                
                // Set up engine effects
                this.setupEngineEffects();
            },
            (error) => {
                debugHelper.log("Failed to load ship model: " + error.message, "error");
                // Do not create a default ship, just log the error
            }
        );
    }
    
    /**
     * Loads the missile model template
     */
    loadMissileModel() {
        // Try to get a missile model from the showcase first
        if (window.game && window.game.modelShowcase) {
            const missileModel = window.game.modelShowcase.getMissileModel();
            if (missileModel) {
                debugHelper.log("Using missile model from showcase");
                this.missileTemplate = missileModel;
                return;
            }
        }
        
        // If no model from showcase, load directly
        this.modelLoader.loadModel(
            'models/spaceships/spaceship_missile_0304125431.glb',
            (model) => {
                debugHelper.log("Missile model loaded successfully");
                this.missileTemplate = model;
            },
            (error) => {
                debugHelper.log("Failed to load missile model: " + error.message, "error");
                // Do not create a default missile, just log the error
            }
        );
    }
    
    setupInputListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.handleKeyDown(event.code));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event.code));
        
        // Mouse controls for rotation with improved sensitivity handling
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement) {
                const sensitivity = this.mouseSensitivity;
                this.handleMouseMove(event.movementX * sensitivity, event.movementY * sensitivity);
            }
        });
        
        // Handle view mode toggle
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyV') {
                this.toggleViewMode();
            }
        });
        
        // Set up pointer lock for mouse control
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('click', () => {
                if (!document.pointerLockElement) {
                    gameContainer.requestPointerLock();
                }
            });
            
            // Show/hide the existing controls display based on pointer lock
            document.addEventListener('pointerlockchange', () => {
                const controlsDisplay = document.getElementById('controls-display');
                if (controlsDisplay) {
                    if (document.pointerLockElement) {
                        controlsDisplay.style.display = 'none';
                    } else {
                        controlsDisplay.style.display = 'block';
                    }
                }
            });
        }
        
        // Remove any existing instructions element we might have added previously
        const oldInstructions = document.getElementById('instructions');
        if (oldInstructions) {
            oldInstructions.remove();
        }
    }
    
    handleMouseMove(movementX, movementY) {
        // Yaw (left/right) rotation - X movement maps to Y axis rotation
        this.rotation.y -= movementX;
        
        // Pitch (up/down) rotation - Y movement maps to X axis rotation
        // Apply Y-axis inversion if set
        const pitchFactor = this.invertYAxis ? 1 : -1;
        this.rotation.x += movementY * pitchFactor;
        
        // Clamp the pitch to prevent flipping over (with more range allowed)
        this.rotation.x = Math.max(-Math.PI * 0.75, Math.min(Math.PI * 0.75, this.rotation.x));
    }
    
    handleKeyDown(code) {
        switch (code) {
            // Side-scroller controls: WASD for movement
            case 'KeyW': 
                this.inputControls.up = true; 
                this.keys.up = true;
                break;
            case 'KeyS': 
                this.inputControls.down = true; 
                this.keys.down = true;
                break;
            case 'KeyA': 
                this.inputControls.left = true; 
                this.keys.left = true;
                break;
            case 'KeyD': 
                this.inputControls.right = true; 
                this.keys.right = true;
                break;
            
            // Space to shoot missiles
            case 'Space': 
                this.inputControls.shoot = true;
                this.keys.shoot = true;
                this.shootMissile();
                break;
                
            // Escape to pause
            case 'Escape':
                // Implement pause functionality if needed
                break;
        }
    }
    
    handleKeyUp(code) {
        switch (code) {
            // Side-scroller controls: WASD for movement
            case 'KeyW': 
                this.inputControls.up = false; 
                this.keys.up = false;
                break;
            case 'KeyS': 
                this.inputControls.down = false; 
                this.keys.down = false;
                break;
            case 'KeyA': 
                this.inputControls.left = false; 
                this.keys.left = false;
                break;
            case 'KeyD': 
                this.inputControls.right = false; 
                this.keys.right = false;
                break;
            
            // Space to shoot missiles
            case 'Space': 
                this.inputControls.shoot = false;
                this.keys.shoot = false;
                break;
        }
    }
    
    toggleViewMode() {
        // Toggle between first and third person views
        this.viewMode = this.viewMode === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';
    }
    
    update(delta) {
        // Adaptive delta clamping to prevent physics issues on lag spikes
        const clampedDelta = Math.min(delta, 0.1);
        
        this.updateMovement(clampedDelta);
        this.updateEngineEffects();
        this.updateCameraPosition();
        
        // Only check collisions if boundingBox is defined
        if (this.boundingBox) {
            this.checkCollisions();
        }
        
        // Update missiles
        this.updateMissiles(clampedDelta);
        
        // Update explosions
        this.updateExplosions(clampedDelta);
        
        // Reduce missile cooldown
        if (this.missileCooldown > 0) {
            this.missileCooldown -= clampedDelta;
        }
        
        // Reduce collision cooldown if active
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= clampedDelta;
        }
    }
    
    updateMovement(delta) {
        // Side-scroller movement
        const moveSpeed = this.moveSpeed * delta;
        
        // Apply movement based on input
        if (this.keys.up) {
            this.position.y += moveSpeed;
        }
        if (this.keys.down) {
            this.position.y -= moveSpeed;
        }
        if (this.keys.left) {
            this.position.x -= moveSpeed;
        }
        if (this.keys.right) {
            this.position.x += moveSpeed;
        }
        
        // Update ship position
        if (this.shipGroup) {
            this.shipGroup.position.copy(this.position);
        }
        
        // Update model position if no ship group
        if (!this.shipGroup && this.model) {
            this.model.position.copy(this.position);
        }
        
        // Update bounding box
        if (this.boundingBox && this.model) {
            this.boundingBox.setFromObject(this.model);
        }
    }
    
    /**
     * Sets up engine visual and audio effects
     */
    setupEngineEffects() {
        // Create engine glow material
        const engineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.7
        });
        
        // Create engine glow mesh
        const engineGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        engineGeometry.rotateX(Math.PI); // Rotate to point backward
        this.engineGlow = new THREE.Mesh(engineGeometry, engineMaterial);
        
        // Position at the back of the ship
        this.engineGlow.position.set(0, 0, 2);
        
        // Add engine glow to ship model
        this.model.add(this.engineGlow);
        
        // Create engine light
        this.engineLight = new THREE.PointLight(0x00ffff, 2, 10);
        this.engineLight.position.copy(this.engineGlow.position);
        this.model.add(this.engineLight);
        
        // Attach engine sound to the ship if available
        if (this.soundsLoaded && this.engineSound) {
            this.model.add(this.engineSound);
        }
        
        // Initial visibility state (off until activated)
        this.engineGlow.visible = false;
        this.engineLight.visible = false;
    }
    
    /**
     * Updates engine visual and audio effects based on player input
     */
    updateEngineEffects() {
        // Default engine state
        let engineActive = this.keys.forward;
        let thrustLevel = 1.0;
        
        // Special effects for boost and afterburner
        if (engineActive) {
            if (this.keys.afterburner) {
                thrustLevel = 3.0; // Intense glow
                
                // Create afterburner effect with larger engine and particle emission
                this.engineGlow.scale.set(1.8, 1.8, 2.5);
                this.engineLight.intensity = thrustLevel * 3;
                this.engineLight.distance = 15;
                
                // Adjust engine colors for afterburner
                this.engineGlow.material.emissive.setHex(0x00ffff);
                this.engineLight.color.setHex(0x33ffff);
                
                // Adjust engine sound for afterburner
                if (this.soundsLoaded && this.engineSound) {
                    this.engineSound.setVolume(0.8);
                    this.engineSound.playbackRate = 1.5;
                }
                
            } else if (this.keys.boost) {
                thrustLevel = 1.8; // Stronger glow than normal
                this.engineGlow.scale.set(1.4, 1.4, 1.8);
                this.engineLight.intensity = thrustLevel * 2;
                this.engineLight.distance = 12;
                
                // Normal boost colors
                this.engineGlow.material.emissive.setHex(0x00ffff);
                this.engineLight.color.setHex(0x00ffff);
                
                // Adjust engine sound for boost
                if (this.soundsLoaded && this.engineSound) {
                    this.engineSound.setVolume(0.6);
                    this.engineSound.playbackRate = 1.2;
                }
                
            } else {
                // Normal engine
                this.engineGlow.scale.set(1, 1, 1);
                this.engineLight.intensity = thrustLevel * 2;
                this.engineLight.distance = 10;
                
                // Normal engine colors
                this.engineGlow.material.emissive.setHex(0x00ffff);
                this.engineLight.color.setHex(0x00ffff);
                
                // Normal engine sound
                if (this.soundsLoaded && this.engineSound) {
                    this.engineSound.setVolume(0.5);
                    this.engineSound.playbackRate = 1.0;
                }
            }
            
            // Start engine sound if not already playing
            if (this.soundsLoaded && this.engineSound && !this.engineSound.isPlaying) {
                this.engineSound.play();
            }
        } else {
            // Stop engine sound when not active
            if (this.soundsLoaded && this.engineSound && this.engineSound.isPlaying) {
                this.engineSound.stop();
            }
        }
        
        // Show/hide engine effects
        if (this.engineGlow) {
            this.engineGlow.visible = engineActive;
        }
        if (this.engineLight) {
            this.engineLight.visible = engineActive;
        }
    }
    
    updateCameraPosition() {
        // For side-scroller, camera stays fixed
        // No need to update camera position
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
        // Get object properties
        const debrisType = object.userData.debrisType || 'asteroid';
        const debrisMass = object.userData.mass || 5.0;
        
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
     * Shoots a missile from the player's ship
     */
    shootMissile() {
        // Check if we can shoot (cooldown and energy)
        if (this.missileCooldown > 0 || this.energy < 10) {
            return;
        }
        
        // Check if we have a missile template
        if (!this.missileTemplate) {
            debugHelper.log("No missile template available", "warning");
            return;
        }
        
        try {
            // Clone the missile template
            const missileModel = this.missileTemplate.clone();
            
            // Set up the missile for side-scrolling
            this.setupSideScrollerMissile(missileModel);
            
            // Set cooldown
            this.missileCooldown = this.missileCooldownTime;
            
            // Use energy
            this.energy -= 10;
            
            // Play sound
            this.playMissileSound();
            
        } catch (error) {
            debugHelper.log("Error creating missile: " + error.message, "error");
        }
    }
    
    /**
     * Sets up a missile for side-scrolling gameplay
     * @param {THREE.Object3D} model - The missile model
     */
    setupSideScrollerMissile(model) {
        // Scale missile
        model.scale.set(0.8, 0.8, 0.8);
        
        // Position missile at the right side of the ship
        const missilePosition = this.position.clone();
        missilePosition.x += 3; // Position to the right of the ship
        
        model.position.copy(missilePosition);
        model.rotation.set(0, Math.PI / 2, 0); // Rotate to point right
        
        // Add to scene
        this.scene.add(model);
        
        // Create missile data object
        const missile = {
            model: model,
            position: missilePosition,
            velocity: new THREE.Vector3(50, 0, 0), // Move right in side-scroller
            timeAlive: 0,
            maxLifetime: 3 // 3 seconds max lifetime
        };
        
        // Add to missiles array
        this.missiles.push(missile);
        
        // Add a point light to the missile for visual effect
        const missileLight = new THREE.PointLight(0xff3300, 1, 10);
        model.add(missileLight);
        
        // Add particle trail effect
        this.createMissileTrail(model);
    }
    
    /**
     * Creates a particle trail for a missile
     * @param {THREE.Object3D} missileModel - The missile model to add a trail to
     */
    createMissileTrail(missileModel) {
        try {
            // Number of particles in the trail
            const trailMaxParticles = 20;
            
            // Create geometry for the trail
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(trailMaxParticles * 3);
            
            // Initialize all positions to the missile's current position
            const pos = missileModel.position.clone();
            for (let i = 0; i < trailMaxParticles; i++) {
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
            }
            
            // Set the positions attribute
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            // Create material for the trail
            const material = new THREE.PointsMaterial({
                color: 0xff4500,
                size: 0.5,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            
            // Create the particle system
            const trailSystem = new THREE.Points(geometry, material);
            this.scene.add(trailSystem);
            
            // Store trail data on the missile model for updates
            missileModel.trailSystem = trailSystem;
            missileModel.trailPositions = positions;
            missileModel.trailMaxParticles = trailMaxParticles;
            missileModel.trailIndex = 0;
        } catch (error) {
            debugHelper.log("Error creating missile trail: " + error.message, "error");
        }
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
        // Update each missile
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            
            // Skip invalid missiles
            if (!missile || !missile.model) {
                this.missiles.splice(i, 1);
                continue;
            }
            
            // Update position based on velocity
            missile.position.add(missile.velocity.clone().multiplyScalar(delta));
            missile.model.position.copy(missile.position);
            
            // Update missile trail
            if (missile.model.trailSystem) {
                this.updateMissileTrailEffect(missile.model, delta);
            }
            
            // Check for collisions
            this.checkMissileCollisions(missile);
            
            // Update lifetime
            missile.timeAlive += delta;
            
            // Remove missile if it's lived too long
            if (missile.timeAlive > missile.maxLifetime) {
                // Remove from scene
                this.scene.remove(missile.model);
                
                // Remove from array
                this.missiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Updates the particle trail effect for a missile
     * @param {THREE.Object3D} missileModel - The missile model with the trail
     * @param {number} delta - Time step in seconds
     */
    updateMissileTrailEffect(missileModel, delta) {
        try {
            if (!missileModel.trailSystem || !missileModel.trailPositions) {
                return;
            }
            
            // Get current missile position
            const pos = missileModel.position;
            
            // Update trail index
            missileModel.trailIndex = (missileModel.trailIndex + 1) % missileModel.trailMaxParticles;
            
            // Move all particles back one position
            for (let i = missileModel.trailMaxParticles - 1; i > 0; i--) {
                missileModel.trailPositions[i * 3] = missileModel.trailPositions[(i - 1) * 3];
                missileModel.trailPositions[i * 3 + 1] = missileModel.trailPositions[(i - 1) * 3 + 1];
                missileModel.trailPositions[i * 3 + 2] = missileModel.trailPositions[(i - 1) * 3 + 2];
            }
            
            // Set first particle to missile position
            missileModel.trailPositions[0] = pos.x;
            missileModel.trailPositions[1] = pos.y;
            missileModel.trailPositions[2] = pos.z;
            
            // Update the buffer
            if (missileModel.trailSystem.geometry && 
                missileModel.trailSystem.geometry.attributes && 
                missileModel.trailSystem.geometry.attributes.position) {
                missileModel.trailSystem.geometry.attributes.position.needsUpdate = true;
            }
        } catch (error) {
            debugHelper.log("Error updating missile trail: " + error.message, "error");
        }
    }
    
    /**
     * Checks if a missile has collided with any entities
     * @param {Object} missile - The missile to check
     */
    checkMissileCollisions(missile) {
        try {
            // Skip if missile or model is invalid
            if (!missile || !missile.model) {
                return;
            }
            
            // Create a bounding box for simple collision checks
            const missileBounds = new THREE.Box3().setFromObject(missile.model);
            
            // Check for collisions with asteroids
            this.scene.traverse((object) => {
                if (object.userData && (object.userData.isAsteroid || object.userData.isDebris)) {
                    try {
                        // Get object's bounding box
                        const objectBounds = new THREE.Box3().setFromObject(object);
                        
                        // Check for intersection
                        if (missileBounds.intersectsBox(objectBounds)) {
                            // Handle the hit
                            this.handleMissileHit(missile, object);
                        }
                    } catch (error) {
                        // Ignore errors from incomplete objects
                    }
                }
            });
        } catch (error) {
            debugHelper.log("Error checking missile collisions: " + error.message, "error");
        }
    }
    
    /**
     * Handles a missile hitting a target
     * @param {Object} missile - The missile that hit
     * @param {Object} target - The object that was hit
     */
    handleMissileHit(missile, target) {
        try {
            debugHelper.log(`Missile hit object: ${target.userData.type || 'unknown'}`);
            
            // Create explosion effect
            this.createExplosion(missile.position);
            
            // Remove missile
            if (missile.model) {
                this.scene.remove(missile.model);
                if (missile.model.trailSystem) {
                    this.scene.remove(missile.model.trailSystem);
                }
            }
            
            // Remove missile from array
            const index = this.missiles.indexOf(missile);
            if (index !== -1) {
                this.missiles.splice(index, 1);
            }
            
            // Handle target destruction if it's an asteroid
            if (target.userData && target.userData.isAsteroid && target.userData.asteroidRef) {
                // Call the asteroid's handleCollision method
                target.userData.asteroidRef.handleCollision(this);
                
                // Add score
                this.score += 100;
            }
        } catch (error) {
            debugHelper.log("Error handling missile hit: " + error.message, "error");
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
        explosionParticles.userData.lifetime = 0;
        explosionParticles.userData.maxLifetime = 1; // 1 second
        
        this.scene.add(explosionParticles);
        
        // Store a reference to animate the explosion
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
                this.scene.remove(explosion.light);
                
                // Remove particles
                this.scene.remove(explosion.particles);
                
                // Remove from array
                this.explosions.splice(i, 1);
                continue;
            }
            
            // Calculate fade factor (1 at start, 0 at end)
            const fadeFactor = 1 - (explosion.lifetime / explosion.maxLifetime);
            
            // Update light intensity
            explosion.light.intensity = 5 * fadeFactor;
            
            // Update particles
            const particles = explosion.particles;
            const positions = particles.geometry.attributes.position.array;
            const velocities = particles.userData.velocities;
            
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
            particles.material.opacity = fadeFactor;
            
            // Update the buffer
            particles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    /**
     * Sets up the camera for side-scrolling view
     */
    setupSideScrollCamera() {
        // Position the camera for a side view
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);
        
        // Make the camera orthographic for true 2D feel
        // Store the original camera to restore if needed
        this.perspectiveCamera = this.camera.clone();
        
        // Create an orthographic camera with similar frustum
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 30;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        
        // Position the orthographic camera
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);
        
        // Rotate the ship to face the camera
        if (this.model) {
            this.model.rotation.set(0, Math.PI, 0);
        }
    }
} 