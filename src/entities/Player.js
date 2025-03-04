import * as THREE from 'three';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.position = new THREE.Vector3(0, 10, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.gravity = 9.8;
        this.jumpForce = 5;
        this.isOnGround = false;
        this.height = 1.8; // Player height in meters
        this.speed = 5; // Movement speed
        this.runMultiplier = 1.5; // Speed multiplier when running
        
        // Camera rotation values
        this.rotationX = 0; // Horizontal rotation (left/right)
        this.rotationY = 0; // Vertical rotation (up/down)
        this.rotationSpeed = 0.03; // Speed of rotation with arrow keys
        
        // Player model
        this.createPlayerModel();
        
        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            run: false,
            // Add arrow keys for camera rotation
            lookUp: false,
            lookDown: false,
            lookLeft: false,
            lookRight: false
        };
        
        // Setup input listeners
        this.setupInputListeners();
    }
    
    createPlayerModel() {
        // Create a simple player model (visible in third-person view if implemented)
        const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x3366ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        
        // Set the camera to be at the head position
        this.camera.position.copy(this.position);
        this.camera.position.y += this.height * 0.8; // Put camera near the top of player model
        
        this.scene.add(this.mesh);
    }
    
    setupInputListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event.code);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event.code);
        });
        
        // Trackpad/mouse controls
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement) {
                // Only handle mouse movements when pointer is locked
                this.handleMouseMove(event.movementX, event.movementY);
            }
        });
        
        // Add trackpad touch events for mobile/trackpad support
        document.addEventListener('touchmove', (event) => {
            event.preventDefault();
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                if (this.lastTouch) {
                    const movementX = touch.clientX - this.lastTouch.clientX;
                    const movementY = touch.clientY - this.lastTouch.clientY;
                    this.handleMouseMove(movementX, movementY);
                }
                this.lastTouch = {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };
            }
        });
        
        document.addEventListener('touchend', () => {
            this.lastTouch = null;
        });
    }
    
    handleMouseMove(movementX, movementY) {
        // Adjust sensitivity for trackpad
        const sensitivity = 0.002;
        this.rotationX -= movementX * sensitivity;
        this.rotationY -= movementY * sensitivity;
        
        // Limit vertical rotation to avoid camera flipping
        this.rotationY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationY));
        
        // Apply rotation to camera
        this.updateCameraRotation();
    }
    
    handleKeyDown(code) {
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                if (this.isOnGround) {
                    this.jump();
                }
                break;
            case 'ShiftLeft':
                this.keys.run = true;
                break;
            // Add arrow keys for camera rotation (when not used for movement)
            case 'ArrowLeft':
                this.keys.lookLeft = true;
                break;
            case 'ArrowRight':
                this.keys.lookRight = true;
                break;
            case 'ArrowUp':
                // Handle this only if we're not using arrows for movement
                if (!this.keys.forward) {
                    this.keys.lookUp = true;
                }
                break;
            case 'ArrowDown':
                // Handle this only if we're not using arrows for movement
                if (!this.keys.backward) {
                    this.keys.lookDown = true;
                }
                break;
        }
    }
    
    handleKeyUp(code) {
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'ShiftLeft':
                this.keys.run = false;
                break;
            // Arrow keys for camera
            case 'ArrowLeft':
                this.keys.lookLeft = false;
                break;
            case 'ArrowRight':
                this.keys.lookRight = false;
                break;
            case 'ArrowUp':
                this.keys.lookUp = false;
                break;
            case 'ArrowDown':
                this.keys.lookDown = false;
                break;
        }
    }
    
    jump() {
        if (this.isOnGround) {
            this.velocity.y = this.jumpForce;
            this.isOnGround = false;
        }
    }
    
    update(delta) {
        this.updateMovement(delta);
        this.updatePhysics(delta);
        this.updateCameraPosition();
        this.updateArrowKeyRotation(delta);
    }
    
    updateMovement(delta) {
        // Calculate movement speed
        const currentSpeed = this.keys.run ? this.speed * this.runMultiplier : this.speed;
        
        // Get camera direction for movement relative to where we're looking
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement on the xz plane
        cameraDirection.normalize();
        
        // Calculate movement vectors
        const forward = cameraDirection.clone().multiplyScalar(currentSpeed * delta);
        const right = new THREE.Vector3();
        right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(currentSpeed * delta);
        
        // Apply movement based on keys pressed
        if (this.keys.forward) {
            this.position.add(forward);
        }
        if (this.keys.backward) {
            this.position.sub(forward);
        }
        if (this.keys.right) {
            this.position.add(right);
        }
        if (this.keys.left) {
            this.position.sub(right);
        }
    }
    
    updatePhysics(delta) {
        // Apply gravity
        if (!this.isOnGround) {
            this.velocity.y -= this.gravity * delta;
        }
        
        // Update position based on velocity
        this.position.y += this.velocity.y * delta;
        
        // Simplified ground collision
        // In a real game, you'd use raycasting to detect collisions with terrain
        if (this.position.y <= 2) { // Arbitrary ground level
            this.position.y = 2;
            this.velocity.y = 0;
            this.isOnGround = true;
        }
        
        // Update player mesh position
        this.mesh.position.copy(this.position);
    }
    
    updateCameraPosition() {
        // Update camera position to follow player
        this.camera.position.x = this.position.x;
        this.camera.position.z = this.position.z;
        
        // Keep camera at head height
        this.camera.position.y = this.position.y + this.height * 0.8;
    }
    
    updateCameraRotation() {
        // Apply rotation to camera based on rotationX and rotationY values
        this.camera.rotation.order = 'YXZ'; // Important for preventing gimbal lock
        this.camera.rotation.y = this.rotationX;
        this.camera.rotation.x = this.rotationY;
    }
    
    updateArrowKeyRotation(delta) {
        // Apply camera rotation based on arrow keys
        if (this.keys.lookLeft) {
            this.rotationX += this.rotationSpeed * delta;
        }
        if (this.keys.lookRight) {
            this.rotationX -= this.rotationSpeed * delta;
        }
        if (this.keys.lookUp) {
            this.rotationY += this.rotationSpeed * delta;
        }
        if (this.keys.lookDown) {
            this.rotationY -= this.rotationSpeed * delta;
        }
        
        // Limit vertical rotation to avoid camera flipping
        this.rotationY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationY));
        
        // Apply rotation to camera
        this.updateCameraRotation();
    }
} 