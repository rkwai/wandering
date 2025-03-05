/**
 * Base Component class for the Entity Component System
 */
export class Component {
    /**
     * @param {Entity} entity - The entity this component belongs to
     */
    constructor(entity) {
        this.entity = entity;
        this.enabled = true;
    }
    
    /**
     * Initialize the component
     * Called when the component is first added to an entity
     */
    init() {}
    
    /**
     * Update method called each frame
     * @param {number} delta - Time in seconds since the last update
     */
    update(delta) {}
    
    /**
     * Clean up method called when component is removed
     */
    onRemove() {}
}

/**
 * Transform component for position, rotation, and scale
 */
export class TransformComponent extends Component {
    constructor(entity) {
        super(entity);
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.scale = new THREE.Vector3(1, 1, 1);
        this.matrix = new THREE.Matrix4();
        this.quaternion = new THREE.Quaternion();
    }
    
    /**
     * Update the world matrix
     */
    updateMatrix() {
        this.matrix.compose(this.position, this.quaternion, this.scale);
    }
    
    /**
     * Set position of the entity
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateMatrix();
    }
    
    /**
     * Set rotation of the entity
     * @param {number} x - X rotation in radians
     * @param {number} y - Y rotation in radians
     * @param {number} z - Z rotation in radians
     */
    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        this.quaternion.setFromEuler(this.rotation);
        this.updateMatrix();
    }
    
    /**
     * Set scale of the entity
     * @param {number} x - X scale
     * @param {number} y - Y scale
     * @param {number} z - Z scale
     */
    setScale(x, y, z) {
        this.scale.set(x, y, z);
        this.updateMatrix();
    }
}

/**
 * Render component for visual representation
 */
export class RenderComponent extends Component {
    constructor(entity) {
        super(entity);
        this.mesh = null;
        this.visible = true;
    }
    
    /**
     * Set the mesh for this component
     * @param {THREE.Object3D} mesh - The mesh to render
     */
    setMesh(mesh) {
        this.mesh = mesh;
        
        // Update transform to match entity
        const transform = this.entity.getComponent(TransformComponent);
        if (transform && this.mesh) {
            this.mesh.position.copy(transform.position);
            this.mesh.rotation.copy(transform.rotation);
            this.mesh.scale.copy(transform.scale);
        }
    }
    
    /**
     * Initialize the render component
     */
    init() {
        // Add mesh to scene if it exists
        if (this.mesh && this.entity.scene) {
            this.entity.scene.add(this.mesh);
        }
    }
    
    /**
     * Update the visual representation
     */
    update(delta) {
        if (!this.mesh) return;
        
        // Update mesh transform from entity transform
        const transform = this.entity.getComponent(TransformComponent);
        if (transform) {
            this.mesh.position.copy(transform.position);
            this.mesh.rotation.copy(transform.rotation);
            this.mesh.scale.copy(transform.scale);
        }
        
        // Update visibility
        this.mesh.visible = this.visible;
    }
    
    /**
     * Clean up when component is removed
     */
    onRemove() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

/**
 * Physics component for movement and collision
 */
export class PhysicsComponent extends Component {
    constructor(entity) {
        super(entity);
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();
        this.mass = 1;
        this.drag = 0.01;
        this.useGravity = false;
        this.boundingBox = null;
        this.boundingSphere = null;
    }
    
    /**
     * Apply a force to the entity
     * @param {THREE.Vector3} force - Force vector to apply
     */
    applyForce(force) {
        // F = ma, so a = F/m
        const acceleration = force.clone().divideScalar(this.mass);
        this.acceleration.add(acceleration);
    }
    
    /**
     * Update physics simulation
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Skip if disabled
        if (!this.enabled) return;
        
        // Get transform component
        const transform = this.entity.getComponent(TransformComponent);
        if (!transform) return;
        
        // Apply gravity if enabled
        if (this.useGravity) {
            this.acceleration.y -= 9.8; // Simplified gravity
        }
        
        // Update velocity with acceleration
        this.velocity.add(this.acceleration.clone().multiplyScalar(delta));
        
        // Apply drag/friction
        this.velocity.multiplyScalar(1 - this.drag);
        
        // Update position
        transform.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Update rotation with angular velocity
        transform.rotation.x += this.angularVelocity.x * delta;
        transform.rotation.y += this.angularVelocity.y * delta;
        transform.rotation.z += this.angularVelocity.z * delta;
        transform.quaternion.setFromEuler(transform.rotation);
        
        // Reset acceleration for next frame
        this.acceleration.set(0, 0, 0);
        
        // Update transform matrix
        transform.updateMatrix();
        
        // Update collision geometry
        this.updateColliders();
    }
    
    /**
     * Update collision geometry to match current transform
     */
    updateColliders() {
        const transform = this.entity.getComponent(TransformComponent);
        if (!transform) return;
        
        // Update bounding box if it exists
        if (this.boundingBox) {
            // Create a new bounding box around the object
            const renderComponent = this.entity.getComponent(RenderComponent);
            if (renderComponent && renderComponent.mesh) {
                this.boundingBox.setFromObject(renderComponent.mesh);
            }
        }
        
        // Update bounding sphere if it exists
        if (this.boundingSphere && this.boundingBox) {
            this.boundingBox.getBoundingSphere(this.boundingSphere);
        }
    }
    
    /**
     * Check collision with another physics component
     * @param {PhysicsComponent} other - The other physics component to check
     * @returns {boolean} True if colliding
     */
    checkCollision(other) {
        // Skip if either is disabled
        if (!this.enabled || !other.enabled) return false;
        
        // First do a quick sphere test if available
        if (this.boundingSphere && other.boundingSphere) {
            const distance = this.boundingSphere.center.distanceTo(other.boundingSphere.center);
            if (distance > this.boundingSphere.radius + other.boundingSphere.radius) {
                return false; // Definitely not colliding
            }
        }
        
        // Then do a more precise box test if available
        if (this.boundingBox && other.boundingBox) {
            return this.boundingBox.intersectsBox(other.boundingBox);
        }
        
        return false;
    }
}

/**
 * Input component for handling user input
 */
export class InputComponent extends Component {
    constructor(entity) {
        super(entity);
        this.keys = {};
        this.mousePosX = 0;
        this.mousePosY = 0;
        this.mouseButtons = {};
        this.gamepadData = null;
    }
    
    /**
     * Initialize and set up event listeners
     */
    init() {
        // Set up keyboard listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Set up mouse listeners
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Set up gamepad listeners
        window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
    }
    
    /**
     * Handle keyboard down events
     */
    handleKeyDown(event) {
        this.keys[event.code] = true;
    }
    
    /**
     * Handle keyboard up events
     */
    handleKeyUp(event) {
        this.keys[event.code] = false;
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(event) {
        this.mousePosX = event.clientX;
        this.mousePosY = event.clientY;
    }
    
    /**
     * Handle mouse button down
     */
    handleMouseDown(event) {
        this.mouseButtons[event.button] = true;
    }
    
    /**
     * Handle mouse button up
     */
    handleMouseUp(event) {
        this.mouseButtons[event.button] = false;
    }
    
    /**
     * Handle gamepad connection
     */
    handleGamepadConnected(event) {
        console.log(`Gamepad connected: ${event.gamepad.id}`);
        this.gamepadData = event.gamepad;
    }
    
    /**
     * Handle gamepad disconnection
     */
    handleGamepadDisconnected(event) {
        console.log(`Gamepad disconnected: ${event.gamepad.id}`);
        this.gamepadData = null;
    }
    
    /**
     * Check if a key is currently pressed
     * @param {string} keyCode - The key code to check
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(keyCode) {
        return this.keys[keyCode] === true;
    }
    
    /**
     * Check if a mouse button is currently pressed
     * @param {number} button - The mouse button to check (0=left, 1=middle, 2=right)
     * @returns {boolean} True if button is pressed
     */
    isMouseButtonPressed(button) {
        return this.mouseButtons[button] === true;
    }
    
    /**
     * Update the input state
     */
    update(delta) {
        // Update gamepad state if available
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            if (gamepads[0]) {
                this.gamepadData = gamepads[0];
            }
        }
    }
    
    /**
     * Clean up by removing event listeners
     */
    onRemove() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    }
}

/**
 * Base entity class for the Entity Component System
 */
export class Entity {
    constructor(scene) {
        this.id = Math.random().toString(36).substring(2, 15);
        this.components = new Map();
        this.scene = scene;
        this.active = true;
        
        // Add transform component by default
        this.addComponent(TransformComponent);
    }
    
    /**
     * Add a component to this entity
     * @param {typeof Component} ComponentClass - The component class to add
     * @returns {Component} The newly created component
     */
    addComponent(ComponentClass) {
        // Check if component of this type already exists
        if (this.components.has(ComponentClass.name)) {
            console.warn(`Entity already has a ${ComponentClass.name}`);
            return this.components.get(ComponentClass.name);
        }
        
        // Create new component
        const component = new ComponentClass(this);
        this.components.set(ComponentClass.name, component);
        
        // Initialize it
        component.init();
        
        return component;
    }
    
    /**
     * Get a component by type
     * @param {typeof Component} ComponentClass - The component class to get
     * @returns {Component|null} The component or null if not found
     */
    getComponent(ComponentClass) {
        return this.components.get(ComponentClass.name) || null;
    }
    
    /**
     * Remove a component by type
     * @param {typeof Component} ComponentClass - The component class to remove
     * @returns {boolean} True if component was removed
     */
    removeComponent(ComponentClass) {
        if (!this.components.has(ComponentClass.name)) {
            return false;
        }
        
        // Get the component
        const component = this.components.get(ComponentClass.name);
        
        // Call cleanup method
        component.onRemove();
        
        // Remove from map
        this.components.delete(ComponentClass.name);
        
        return true;
    }
    
    /**
     * Update all components
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        if (!this.active) return;
        
        // Update all components
        for (const component of this.components.values()) {
            if (component.enabled) {
                component.update(delta);
            }
        }
    }
    
    /**
     * Destroy this entity and all its components
     */
    destroy() {
        // Call onRemove for all components
        for (const component of this.components.values()) {
            component.onRemove();
        }
        
        // Clear components
        this.components.clear();
        this.active = false;
    }
} 