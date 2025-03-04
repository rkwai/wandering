import * as THREE from 'three';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.position = new THREE.Vector3(0, 0, 0); // Start at the center of space
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.quaternion = new THREE.Quaternion();
        
        // Spaceship properties
        this.thrust = 25;       // Forward acceleration - increased for responsiveness
        this.maxSpeed = 50;     // Maximum speed
        this.rotationSpeed = 2.2; // Increased rotation speed for better responsiveness
        this.brakeForce = 0.9;  // Increased braking power
        this.driftFactor = 0.998; // Reduced drift for better control
        this.rotationDamping = 0.95; // Rotation damping factor when controls are released
        
        // Spaceship performance specs
        this.normalMaxSpeed = 50;     // Maximum speed
        this.boostMaxSpeed = 100;     // Maximum speed when using shift boost - increased
        this.afterburnerMaxSpeed = 150; // Maximum speed with afterburner - increased
        
        // Create the spaceship model
        this.createSpaceshipModel();
        
        // Camera settings for better view
        this.cameraOffset = new THREE.Vector3(0, 3, 12); // Closer to ship for better control
        this.cameraTargetOffset = new THREE.Vector3(0, 0, -15); // Look further ahead
        
        // Input state
        this.keys = {
            forward: false,  // Thrusters forward
            backward: false, // Braking/reverse thrusters
            left: false,     // Roll left
            right: false,    // Roll right
            up: false,       // Pitch up
            down: false,     // Pitch down
            strafeLeft: false,  // Strafe left
            strafeRight: false, // Strafe right
            strafeUp: false,    // Strafe up (new)
            strafeDown: false,  // Strafe down (new)
            boost: false,    // Speed boost
            afterburner: false, // Afterburner (extreme boost with space key)
            stabilize: false,   // Auto-stabilize (added back for convenience)
            firstPerson: false  // Toggle camera view (new)
        };
        
        // Mouse sensitivity and handling
        this.mouseSensitivity = 0.002;
        this.invertYAxis = false;
        
        // Camera view modes
        this.viewMode = 'thirdPerson'; // 'firstPerson' or 'thirdPerson'
        this.firstPersonOffset = new THREE.Vector3(0, 0.8, 0); // Position for cockpit view
        
        // Collision cooldown to prevent rapid collision responses
        this.collisionCooldown = 0;
        
        // Setup input listeners
        this.setupInputListeners();
    }
    
    createSpaceshipModel() {
        // Group to hold all spaceship parts
        this.shipGroup = new THREE.Group();
        this.shipGroup.position.copy(this.position);
        this.scene.add(this.shipGroup);
        
        // Materials
        const shipBodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a7bce,
            metalness: 0.7,
            roughness: 0.2
        });
        
        const cockpitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x88cdff,
            metalness: 0.2,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        const engineGlowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 1.0
        });
        
        // Main ship body
        const bodyGeometry = new THREE.CylinderGeometry(0, 1.5, 6, 8);
        bodyGeometry.rotateX(Math.PI / 2); // Orient along Z axis
        const shipBody = new THREE.Mesh(bodyGeometry, shipBodyMaterial);
        shipBody.position.z = -1;
        shipBody.castShadow = true;
        shipBody.receiveShadow = true;
        this.shipGroup.add(shipBody);
        
        // Cockpit
        const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        cockpitGeometry.rotateX(-Math.PI / 2);
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.z = 1.5;
        cockpit.position.y = 0.4;
        this.shipGroup.add(cockpit);
        
        // Wings
        const wingGeometry = new THREE.BoxGeometry(6, 0.2, 2);
        const leftWing = new THREE.Mesh(wingGeometry, shipBodyMaterial);
        leftWing.position.set(0, 0, -1);
        leftWing.castShadow = true;
        leftWing.receiveShadow = true;
        this.shipGroup.add(leftWing);
        
        // Engine glow
        const engineGlowGeometry = new THREE.CylinderGeometry(0.7, 0.5, 0.5, 16);
        engineGlowGeometry.rotateX(Math.PI / 2);
        this.engineGlow = new THREE.Mesh(engineGlowGeometry, engineGlowMaterial);
        this.engineGlow.position.z = -4;
        this.shipGroup.add(this.engineGlow);
        
        // Set initial engine glow visibility
        this.engineGlow.visible = false;
        
        // Add a point light for the engine
        this.engineLight = new THREE.PointLight(0x00ffff, 2, 10);
        this.engineLight.position.z = -4;
        this.shipGroup.add(this.engineLight);
        this.engineLight.visible = false;
        
        // Create collision box for the spaceship
        this.boundingBox = new THREE.Box3().setFromObject(this.shipGroup);
        this.shipGroup.userData.isSpaceship = true;
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
            // Main movement controls
            case 'KeyW': this.keys.forward = true; break;
            case 'KeyS': this.keys.backward = true; break;
            case 'KeyA': this.keys.left = true; break;
            case 'KeyD': this.keys.right = true; break;
            
            // Strafing controls
            case 'KeyQ': this.keys.strafeLeft = true; break;
            case 'KeyE': this.keys.strafeRight = true; break;
            case 'KeyR': this.keys.strafeUp = true; break;
            case 'KeyF': this.keys.strafeDown = true; break;
            
            // Pitch controls - also map to keyboard for accessibility
            case 'ArrowUp': this.keys.up = true; break;
            case 'ArrowDown': this.keys.down = true; break;
            
            // Yaw controls
            case 'ArrowLeft': this.keys.yawLeft = true; break;
            case 'ArrowRight': this.keys.yawRight = true; break;
            
            // Speed modifiers
            case 'ShiftLeft': 
            case 'ShiftRight': 
                this.keys.boost = true; 
                break;
            case 'Space': this.keys.afterburner = true; break;
            
            // Stabilization
            case 'KeyZ': this.keys.stabilize = true; break;
            
            // Camera toggle is handled in setupInputListeners
        }
    }
    
    handleKeyUp(code) {
        switch (code) {
            // Main movement controls
            case 'KeyW': this.keys.forward = false; break;
            case 'KeyS': this.keys.backward = false; break;
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
            
            // Strafing controls
            case 'KeyQ': this.keys.strafeLeft = false; break;
            case 'KeyE': this.keys.strafeRight = false; break;
            case 'KeyR': this.keys.strafeUp = false; break;
            case 'KeyF': this.keys.strafeDown = false; break;
            
            // Pitch controls
            case 'ArrowUp': this.keys.up = false; break;
            case 'ArrowDown': this.keys.down = false; break;
            
            // Yaw controls
            case 'ArrowLeft': this.keys.yawLeft = false; break;
            case 'ArrowRight': this.keys.yawRight = false; break;
            
            // Speed modifiers
            case 'ShiftLeft': 
            case 'ShiftRight': 
                this.keys.boost = false; 
                break;
            case 'Space': this.keys.afterburner = false; break;
            
            // Stabilization
            case 'KeyZ': this.keys.stabilize = false; break;
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
        this.checkCollisions();
        
        // Reduce collision cooldown if active
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= clampedDelta;
        }
    }
    
    updateMovement(delta) {
        // Create local direction vectors
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        
        // Create quaternion from Euler angles
        this.quaternion.setFromEuler(this.rotation);
        
        // Apply rotations with improved responsiveness
        // Roll (A/D keys)
        if (this.keys.left) {
            this.rotation.z += this.rotationSpeed * delta;
        }
        if (this.keys.right) {
            this.rotation.z -= this.rotationSpeed * delta;
        }
        
        // Pitch (Up/Down arrows)
        if (this.keys.up) {
            this.rotation.x -= this.rotationSpeed * delta;
        }
        if (this.keys.down) {
            this.rotation.x += this.rotationSpeed * delta;
        }
        
        // Yaw (Left/Right arrows)
        if (this.keys.yawLeft) {
            this.rotation.y += this.rotationSpeed * delta;
        }
        if (this.keys.yawRight) {
            this.rotation.y -= this.rotationSpeed * delta;
        }
        
        // Clamp pitch to prevent loops
        this.rotation.x = Math.max(-Math.PI * 0.75, Math.min(Math.PI * 0.75, this.rotation.x));
        
        // Auto-stabilization
        if (this.keys.stabilize) {
            // Quick stabilization
            this.rotation.x *= 0.8;
            this.rotation.z *= 0.8;
        } else {
            // Natural rotation damping when no input
            const shouldDampRoll = !this.keys.left && !this.keys.right;
            const shouldDampPitch = !this.keys.up && !this.keys.down;
            
            if (shouldDampRoll) {
                this.rotation.z *= this.rotationDamping;
            }
            
            if (shouldDampPitch) {
                this.rotation.x *= this.rotationDamping;
            }
        }
        
        // Update quaternion with new rotation
        this.quaternion.setFromEuler(this.rotation);
        
        // Calculate thrust based on input
        let thrustMultiplier = 1;
        let maxSpeed = this.normalMaxSpeed;
        
        if (this.keys.afterburner) {
            thrustMultiplier = 3; // Stronger than regular boost
            maxSpeed = this.afterburnerMaxSpeed;
        } else if (this.keys.boost) {
            thrustMultiplier = 2;
            maxSpeed = this.boostMaxSpeed;
        }
        
        // Apply acceleration in the ship's local directions with improved response
        if (this.keys.forward) {
            // Apply thrust in the local forward direction
            forward.applyQuaternion(this.quaternion);
            this.velocity.addScaledVector(forward, this.thrust * thrustMultiplier * delta);
        }
        
        if (this.keys.backward) {
            // Apply braking or reverse thrust
            forward.applyQuaternion(this.quaternion);
            if (this.velocity.dot(forward) < 0) {
                // If moving forward, apply braking
                this.velocity.multiplyScalar(this.brakeForce);
            } else {
                // If moving backward or stationary, apply reverse thrust
                this.velocity.addScaledVector(forward, -this.thrust * 0.7 * delta);
            }
        }
        
        // Strafing with improved controls
        if (this.keys.strafeLeft) {
            right.applyQuaternion(this.quaternion);
            this.velocity.addScaledVector(right, -this.thrust * 0.8 * delta);
        }
        if (this.keys.strafeRight) {
            right.applyQuaternion(this.quaternion);
            this.velocity.addScaledVector(right, this.thrust * 0.8 * delta);
        }
        
        // Vertical strafing (new)
        if (this.keys.strafeUp) {
            up.applyQuaternion(this.quaternion);
            this.velocity.addScaledVector(up, this.thrust * 0.8 * delta);
        }
        if (this.keys.strafeDown) {
            up.applyQuaternion(this.quaternion);
            this.velocity.addScaledVector(up, -this.thrust * 0.8 * delta);
        }
        
        // Apply very slight drift factor (space has no friction, but a small factor helps gameplay)
        this.velocity.multiplyScalar(this.driftFactor);
        
        // Limit max speed
        const currentSpeed = this.velocity.length();
        if (currentSpeed > maxSpeed) {
            this.velocity.multiplyScalar(maxSpeed / currentSpeed);
        }
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Update the ship model position and rotation
        this.shipGroup.position.copy(this.position);
        this.shipGroup.quaternion.copy(this.quaternion);
        
        // Update bounding box
        this.boundingBox.setFromObject(this.shipGroup);
    }
    
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
                
            } else if (this.keys.boost) {
                thrustLevel = 1.8; // Stronger glow than normal
                this.engineGlow.scale.set(1.4, 1.4, 1.8);
                this.engineLight.intensity = thrustLevel * 2;
                this.engineLight.distance = 12;
                
                // Normal boost colors
                this.engineGlow.material.emissive.setHex(0x00ffff);
                this.engineLight.color.setHex(0x00ffff);
                
            } else {
                // Normal engine
                this.engineGlow.scale.set(1, 1, 1);
                this.engineLight.intensity = thrustLevel * 2;
                this.engineLight.distance = 10;
                
                // Normal engine colors
                this.engineGlow.material.emissive.setHex(0x00ffff);
                this.engineLight.color.setHex(0x00ffff);
            }
        }
        
        // Show/hide engine effects
        this.engineGlow.visible = engineActive;
        this.engineLight.visible = engineActive;
    }
    
    updateCameraPosition() {
        if (this.viewMode === 'firstPerson') {
            // First-person (cockpit) view
            const cockpitPosition = this.firstPersonOffset.clone().applyQuaternion(this.quaternion);
            this.camera.position.copy(this.position).add(cockpitPosition);
            
            // Look in the direction the ship is facing
            const lookAtPoint = new THREE.Vector3(0, 0, -10).applyQuaternion(this.quaternion).add(this.camera.position);
            this.camera.lookAt(lookAtPoint);
        } else {
            // Third-person view with dynamic camera
            // Calculate camera position based on ship velocity
            const speedFactor = Math.min(1, this.velocity.length() / this.normalMaxSpeed);
            
            // Create camera offset with slight adjustment for speed
            const dynamicOffset = this.cameraOffset.clone();
            dynamicOffset.z += speedFactor * 3; // Move camera back slightly at high speeds
            
            // Apply quaternion to get world space offset
            dynamicOffset.applyQuaternion(this.quaternion);
            
            // Position camera relative to ship
            this.camera.position.copy(this.position).add(dynamicOffset);
            
            // Calculate target point ahead of the ship
            const targetOffset = this.cameraTargetOffset.clone().applyQuaternion(this.quaternion);
            const target = this.position.clone().add(targetOffset);
            
            // Look at point ahead of the ship
            this.camera.lookAt(target);
        }
    }
    
    checkCollisions() {
        // Only check collisions if cooldown is inactive
        if (this.collisionCooldown <= 0) {
            // We'll implement more sophisticated collision logic here
            // For debris, asteroids, etc.
            
            // Check if our bounding box intersects with any debris
            this.scene.traverse((object) => {
                if (object.userData && object.userData.isDebris) {
                    // Calculate object's bounding box
                    const debrisBoundingBox = new THREE.Box3().setFromObject(object);
                    
                    // Check for intersection
                    if (this.boundingBox.intersectsBox(debrisBoundingBox)) {
                        // Handle collision
                        this.handleCollision(object);
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
        
        // Set collision cooldown to prevent multiple impacts from same object
        this.collisionCooldown = 0.5; // seconds
    }
} 