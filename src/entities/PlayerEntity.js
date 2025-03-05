import { Entity, TransformComponent, RenderComponent, PhysicsComponent, InputComponent } from '../core/Component.js';
import { gameEvents, GameEvents } from '../core/EventSystem.js';
import { ObjectPool } from '../core/ObjectPool.js';
import { ModelLoader } from '../utils/ModelLoader.js';
import * as THREE from 'three';
import { debugHelper } from '../utils/DebugHelper.js';

/**
 * Custom component for player weapons
 */
export class WeaponComponent extends PhysicsComponent {
    constructor(entity) {
        super(entity);
        this.shootDelay = 0.25; // 4 shots per second
        this.lastShotTime = 0;
        this.missileSpeed = 80;
        this.missileLifetime = 5.0;
        this.missileModel = null;
        this.missiles = [];
        this.soundsLoaded = false;
        this.missileLaunchSound = null;
        this.missileHitSound = null;
        
        // Create missile pool
        this.missilePool = null; // Will be initialized once model is loaded
    }
    
    /**
     * Initialize the weapon system
     */
    init() {
        super.init();
        
        // Load missile model
        this.loadMissileModel();
        
        // Load sounds
        this.loadSounds();
    }
    
    /**
     * Load missile model
     */
    loadMissileModel() {
        const modelLoader = new ModelLoader();
        
        modelLoader.loadModel('models/spaceships/missile_0305024558.glb', (model) => {
            debugHelper.log("Missile model loaded successfully");
            
            // Set up the missile model
            this.missileModel = model;
            this.setupMissileModel(model);
            
            // Now create object pool for missiles
            this.missilePool = new ObjectPool(
                // Factory function to create new missiles
                () => {
                    const missile = this.missileModel.clone();
                    missile.userData = {
                        velocity: new THREE.Vector3(),
                        lifeTime: 0,
                        maxLifeTime: this.missileLifetime,
                        boundingBox: new THREE.Box3()
                    };
                    return missile;
                },
                // Reset function to reset missile properties
                (missile) => {
                    missile.visible = false;
                    missile.userData.lifeTime = 0;
                    missile.position.set(0, 0, 0);
                    missile.userData.velocity.set(0, 0, 0);
                }
            );
        }, (error) => {
            debugHelper.log("Failed to load missile model: " + error.message, "error");
            this.createDefaultMissileModel();
        });
    }
    
    /**
     * Set up the missile model
     */
    setupMissileModel(model) {
        // Make missile materials emissive and bright
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clone the material to avoid sharing
                child.material = child.material.clone();
                
                // Make it bright and glowing
                child.material.emissive = new THREE.Color(0x66ccff);
                child.material.emissiveIntensity = 2.0;
                child.material.color.set(0x00ffff);
            }
        });
        
        // Scale the missile
        model.scale.set(3.0, 3.0, 3.0);
        
        // Orient for side-scroller
        model.rotation.y = 0;
        model.visible = false;
    }
    
    /**
     * Create a simple missile model as a fallback
     */
    createDefaultMissileModel() {
        // Create a simple glowing cylinder
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x66ccff,
            emissiveIntensity: 2.0,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Rotate to point forward
        mesh.rotation.z = Math.PI / 2;
        
        // Create a group for the missile
        const group = new THREE.Group();
        group.add(mesh);
        
        // Add a point light
        const light = new THREE.PointLight(0x66ccff, 4, 10);
        light.position.set(0, 0, 0);
        group.add(light);
        
        this.missileModel = group;
        this.missileModel.visible = false;
        
        // Create object pool
        this.missilePool = new ObjectPool(
            // Factory function to create new missiles
            () => {
                const missile = this.missileModel.clone();
                missile.userData = {
                    velocity: new THREE.Vector3(),
                    lifeTime: 0,
                    maxLifeTime: this.missileLifetime,
                    boundingBox: new THREE.Box3()
                };
                return missile;
            },
            // Reset function to reset missile properties
            (missile) => {
                missile.visible = false;
                missile.userData.lifeTime = 0;
                missile.position.set(0, 0, 0);
                missile.userData.velocity.set(0, 0, 0);
            }
        );
    }
    
    /**
     * Load sound effects for weapons
     */
    loadSounds() {
        // Check if audio listener is available
        if (!this.entity.audioListener) {
            debugHelper.log("No audio listener available for weapon sounds", "warning");
            return;
        }
        
        // Create audio objects
        this.missileLaunchSound = new THREE.Audio(this.entity.audioListener);
        this.missileHitSound = new THREE.Audio(this.entity.audioListener);
        
        // Create audio loader
        const audioLoader = new THREE.AudioLoader();
        
        // Load missile launch sound
        audioLoader.load('sounds/missile_launch.wav', (buffer) => {
            this.missileLaunchSound.setBuffer(buffer);
            this.missileLaunchSound.setVolume(0.5);
            debugHelper.log("Missile launch sound loaded");
            
            // Check if all sounds are loaded
            if (this.missileHitSound.buffer) {
                this.soundsLoaded = true;
            }
        }, undefined, (error) => {
            debugHelper.log("Failed to load missile launch sound: " + error.message, "error");
        });
        
        // Load missile hit sound
        audioLoader.load('sounds/explosion.wav', (buffer) => {
            this.missileHitSound.setBuffer(buffer);
            this.missileHitSound.setVolume(0.6);
            debugHelper.log("Missile hit sound loaded");
            
            // Check if all sounds are loaded
            if (this.missileLaunchSound.buffer) {
                this.soundsLoaded = true;
            }
        }, undefined, (error) => {
            debugHelper.log("Failed to load missile hit sound: " + error.message, "error");
        });
    }
    
    /**
     * Shoot a missile from the player ship
     */
    shootMissile() {
        if (!this.missilePool) return;
        
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastShotTime < this.shootDelay) {
            return; // Can't shoot yet
        }
        
        this.lastShotTime = currentTime;
        
        // Get a missile from the pool
        const missile = this.missilePool.get();
        
        // Get the player's position from the transform component
        const transform = this.entity.getComponent(TransformComponent);
        if (!transform) return;
        
        // Set up missile properties
        missile.visible = true;
        missile.position.copy(transform.position);
        missile.position.x += 10; // Spawn in front of ship
        
        // Set velocity - fixed for side-scroller
        missile.userData.velocity.set(this.missileSpeed, 0, 0);
        missile.userData.lifeTime = 0;
        
        // Add to scene if not already
        if (!missile.parent) {
            this.entity.scene.add(missile);
        }
        
        // Add to active missiles array
        this.missiles.push(missile);
        
        // Play sound if loaded
        this.playMissileSound();
        
        // Emit weapon fired event
        gameEvents.emit(GameEvents.WEAPON_FIRED, {
            type: 'missile',
            position: missile.position.clone()
        });
    }
    
    /**
     * Play missile launch sound
     */
    playMissileSound() {
        if (this.soundsLoaded && this.missileLaunchSound && this.missileLaunchSound.buffer) {
            if (this.missileLaunchSound.isPlaying) {
                this.missileLaunchSound.stop();
            }
            this.missileLaunchSound.play();
        }
    }
    
    /**
     * Update missiles
     */
    update(delta) {
        super.update(delta);
        
        // Process each missile
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            
            // Update missile position based on velocity
            missile.position.x += missile.userData.velocity.x * delta;
            missile.position.y += missile.userData.velocity.y * delta;
            missile.position.z += missile.userData.velocity.z * delta;
            
            // Update missile lifetime
            missile.userData.lifeTime += delta;
            
            // Update missile bounding box
            missile.userData.boundingBox.setFromObject(missile);
            
            // Add a small padding to the missile bounding box for better collision detection
            const missilePadding = 0.5; // Fixed padding for missiles
            missile.userData.boundingBox.min.subScalar(missilePadding);
            missile.userData.boundingBox.max.addScalar(missilePadding);
            
            // Check for collisions with asteroids
            let collisionFound = false;
            this.entity.scene.traverse((object) => {
                if (!collisionFound && object.userData && object.userData.isAsteroid === true) {
                    try {
                        // Get the asteroid reference
                        const asteroid = object.userData.asteroidRef;
                        
                        // Check collision if asteroid is fully loaded
                        if (asteroid && asteroid.physics && asteroid.physics.boundingBox) {
                            // Check for intersection
                            if (missile.userData.boundingBox.intersectsBox(asteroid.physics.boundingBox)) {
                                collisionFound = true;
                                
                                // Calculate impact point at the center of the intersection
                                const impactPoint = new THREE.Vector3();
                                missile.userData.boundingBox.getCenter(impactPoint);
                                
                                // Create explosion at impact point
                                this.createExplosion(impactPoint);
                                
                                // Release the missile back to the pool
                                this.missiles.splice(i, 1);
                                this.missilePool.release(missile);
                                
                                // Handle asteroid hit
                                if (asteroid.handleHit) {
                                    asteroid.handleHit();
                                }
                                
                                if (asteroid.remove) {
                                    asteroid.remove();
                                }
                                
                                // Play hit sound
                                this.playHitSound();
                                
                                // Emit weapon hit event
                                gameEvents.emit(GameEvents.WEAPON_HIT, {
                                    type: 'missile',
                                    target: 'asteroid',
                                    position: impactPoint.clone()
                                });
                            }
                        }
                    } catch (error) {
                        console.error("Error in missile collision detection:", error);
                    }
                }
            });
            
            // Remove missile if it's gone too far or lived too long
            if (!collisionFound && (
                missile.userData.lifeTime > missile.userData.maxLifeTime || 
                missile.position.x > 1000 || 
                missile.position.x < -1000
            )) {
                this.missiles.splice(i, 1);
                this.missilePool.release(missile);
            }
        }
    }
    
    /**
     * Play missile hit sound
     */
    playHitSound() {
        if (this.soundsLoaded && this.missileHitSound && this.missileHitSound.buffer) {
            if (this.missileHitSound.isPlaying) {
                this.missileHitSound.stop();
            }
            this.missileHitSound.play();
        }
    }
    
    /**
     * Create explosion at position
     */
    createExplosion(position) {
        // TODO: Create particle explosion here
        // For now, we'll emit an event for the explosion
        gameEvents.emit(GameEvents.SHOW_EXPLOSION, {
            position: position.clone(),
            scale: 3.0
        });
    }
    
    /**
     * Clean up weapon component
     */
    onRemove() {
        super.onRemove();
        
        // Release all missiles back to the pool
        for (const missile of this.missiles) {
            this.missilePool.release(missile);
        }
        this.missiles = [];
        
        // Clear missile pool
        if (this.missilePool) {
            this.missilePool.clear();
        }
    }
}

/**
 * Player entity using component-based architecture
 */
export class PlayerEntity extends Entity {
    /**
     * Create a new player entity
     * @param {THREE.Scene} scene - Scene to add this player to
     * @param {THREE.Camera} camera - Camera to control
     * @param {THREE.AudioListener} audioListener - Audio listener for sounds
     */
    constructor(scene, camera, audioListener) {
        super(scene);
        
        this.camera = camera;
        this.audioListener = audioListener;
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        
        // Get transform component
        this.transform = this.getComponent(TransformComponent);
        this.transform.position.set(-40, 0, 0); // Start from left side
        
        // Add physics component
        this.physics = this.addComponent(PhysicsComponent);
        this.physics.drag = 0.1; // Higher drag for responsive controls
        
        // Add render component (mesh will be set when loaded)
        this.render = this.addComponent(RenderComponent);
        
        // Add input component
        this.input = this.addComponent(InputComponent);
        
        // Add weapon component
        this.weapon = this.addComponent(WeaponComponent);
        
        // Movement speed settings
        this.moveSpeed = {
            forward: 40,
            backward: 30,
            up: 35,
            down: 35,
            tiltFactor: 0.45, // How much the ship tilts during movement
            maxTiltAngle: 0.3  // Maximum tilt angle in radians
        };
        
        // Engine effects
        this.engineLights = [];
        this.engineParticles = [];
        
        // Load ship model
        this.modelLoader = new ModelLoader();
        this.loadShipModel();
        
        // Set up camera
        this.setupCamera();
        
        // Set up bounding box for collision
        this.boundingBox = new THREE.Box3();
        
        // Set up explosion effects
        this.explosions = [];
        this.loadImpactExplosionModel();
    }
    
    /**
     * Load the ship model
     */
    loadShipModel() {
        debugHelper.log("Loading spaceship model...");
        
        this.modelLoader.loadModel('models/spaceships/spaceship_0304124415.glb', (model) => {
            // Success callback
            this.model = model;
            
            // Make materials brighter
            this.model.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Clone the material to avoid sharing
                    child.material = child.material.clone();
                    
                    // Make it brighter and glowing
                    child.material.emissive = new THREE.Color(0x666666);
                    child.material.emissiveIntensity = 0.5;
                    child.material.color.multiplyScalar(1.5);
                }
            });
            
            // Set model scale - increased by 15%
            this.model.scale.set(5.75, 5.75, 5.75);
            
            // Orient the ship for side-scrolling
            this.model.rotation.y = Math.PI; // 180 degrees - point opposite of default
            
            // Set the render component's mesh
            this.render.setMesh(this.model);
            
            // Set up engine effects
            this.setupEngineEffects();
            
            // Set up physics colliders
            this.physics.boundingBox = new THREE.Box3();
            this.updateColliders();
            
            debugHelper.log("Spaceship model loaded successfully!");
            
            // Emit player spawn event
            gameEvents.emit(GameEvents.PLAYER_SPAWN, { entity: this });
        }, (error) => {
            debugHelper.log("Failed to load spaceship model: " + error.message, "error");
            this.createPlaceholderShip();
        });
    }
    
    /**
     * Create a placeholder ship if model fails to load
     */
    createPlaceholderShip() {
        // Create a simple spaceship shape
        const geometry = new THREE.ConeGeometry(2, 8, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3366ff,
            emissive: 0x3366ff,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Rotate to point forward
        mesh.rotation.z = -Math.PI / 2;
        
        // Create a group for the ship
        const group = new THREE.Group();
        group.add(mesh);
        
        // Add a point light
        const light = new THREE.PointLight(0x3366ff, 4, 20);
        light.position.set(-2, 0, 0);
        group.add(light);
        
        this.model = group;
        
        // Set the render component's mesh
        this.render.setMesh(this.model);
        
        // Set up physics colliders
        this.physics.boundingBox = new THREE.Box3();
        this.updateColliders();
    }
    
    /**
     * Set up camera for side-scrolling view
     */
    setupCamera() {
        if (!this.camera) return;
        
        // Position camera for side-scrolling view
        this.camera.position.set(0, 0, 80);
        this.camera.lookAt(0, 0, 0);
    }
    
    /**
     * Update collision geometry
     */
    updateColliders() {
        if (!this.model || !this.physics.boundingBox) return;
        
        // Update bounding box
        this.physics.boundingBox.setFromObject(this.model);
        
        // Add padding for more reliable collision
        const padding = 0.8; // Smaller padding for player
        this.physics.boundingBox.min.subScalar(padding);
        this.physics.boundingBox.max.addScalar(padding);
        
        // Create or update bounding sphere
        if (!this.physics.boundingSphere) {
            this.physics.boundingSphere = new THREE.Sphere();
        }
        this.physics.boundingBox.getBoundingSphere(this.physics.boundingSphere);
    }
    
    /**
     * Set up engine effects for the ship
     */
    setupEngineEffects() {
        if (!this.model) return;
        
        // Create engine lights
        const enginePositions = [
            new THREE.Vector3(-6, 0, -2.5),
            new THREE.Vector3(-6, 0, 2.5)
        ];
        
        for (const position of enginePositions) {
            // Create a bright point light for each engine
            const light = new THREE.PointLight(0x33ccff, 2, 15);
            light.position.copy(position);
            this.model.add(light);
            this.engineLights.push(light);
            
            // TODO: Add particle systems for engine thrust
        }
    }
    
    /**
     * Update engine effects based on movement
     */
    updateEngineEffects() {
        if (!this.model || this.engineLights.length === 0) return;
        
        // Calculate base engine power based on movement
        let enginePower = 1.0;
        
        if (this.physics.velocity.lengthSq() > 0.1) {
            enginePower = 1.5;
        }
        
        // Add some random flicker
        const flicker = Math.random() * 0.3 + 0.85;
        
        // Apply to all engine lights
        for (const light of this.engineLights) {
            light.intensity = enginePower * flicker;
        }
        
        // TODO: Update particle systems for engine thrust
    }
    
    /**
     * Calculate ship tilt based on movement
     */
    calculateShipTilt() {
        if (!this.model) return;
        
        // Get current vertical velocity
        const verticalVelocity = this.physics.velocity.y;
        
        // Calculate target tilt angle based on vertical velocity
        const targetTiltX = -verticalVelocity * this.moveSpeed.tiltFactor;
        
        // Clamp the tilt to the maximum angle
        const clampedTiltX = THREE.MathUtils.clamp(
            targetTiltX,
            -this.moveSpeed.maxTiltAngle,
            this.moveSpeed.maxTiltAngle
        );
        
        // Smoothly interpolate current rotation toward the target
        this.model.rotation.z = THREE.MathUtils.lerp(
            this.model.rotation.z,
            clampedTiltX,
            0.1 // Adjust this value for smoother or quicker tilting
        );
    }
    
    /**
     * Update player movement based on input
     */
    handleMovementInput(delta) {
        // Get input component
        if (!this.input) return;
        
        // Calculate movement direction
        let moveX = 0;
        let moveY = 0;
        
        // Keyboard controls
        if (this.input.isKeyPressed('KeyW') || this.input.isKeyPressed('ArrowUp')) {
            moveY += 1;
        }
        if (this.input.isKeyPressed('KeyS') || this.input.isKeyPressed('ArrowDown')) {
            moveY -= 1;
        }
        if (this.input.isKeyPressed('KeyA') || this.input.isKeyPressed('ArrowLeft')) {
            moveX -= 1;
        }
        if (this.input.isKeyPressed('KeyD') || this.input.isKeyPressed('ArrowRight')) {
            moveX += 1;
        }
        
        // Normalize for diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const len = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= len;
            moveY /= len;
        }
        
        // Apply movement forces
        const forceX = moveX * (moveX > 0 ? this.moveSpeed.forward : this.moveSpeed.backward);
        const forceY = moveY * (moveY > 0 ? this.moveSpeed.up : this.moveSpeed.down);
        
        this.physics.applyForce(new THREE.Vector3(forceX, forceY, 0));
        
        // Handle shooting
        if (this.input.isKeyPressed('Space')) {
            this.weapon.shootMissile();
        }
    }
    
    /**
     * Load impact explosion model
     */
    loadImpactExplosionModel() {
        this.modelLoader.loadModel('models/spaceships/impact_explosion_no__0305031045.glb', (model) => {
            console.log("Impact explosion model loaded successfully");
            
            // Make the model's materials emissive and bright
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Clone the material to avoid sharing
                    child.material = child.material.clone();
                    child.material.emissive = new THREE.Color(0xff3300);
                    child.material.emissiveIntensity = 2.0;
                    child.material.transparent = true;
                    child.material.opacity = 1.0;
                    child.material.blending = THREE.AdditiveBlending;
                    child.material.depthWrite = false;
                }
            });
            
            this.impactExplosionModel = model;
            this.impactExplosionModel.visible = false;
            this.scene.add(this.impactExplosionModel);
            
        }, (error) => {
            console.error("Failed to load impact explosion model:", error);
            // Create a fallback explosion model
            this.createFallbackExplosionModel();
        });
    }
    
    /**
     * Create a fallback explosion model
     */
    createFallbackExplosionModel() {
        // Create a simple sphere for the explosion
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff5500,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 1.0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Add a point light
        const light = new THREE.PointLight(0xff5500, 5.0, 20);
        light.position.set(0, 0, 0);
        
        // Create a group
        const group = new THREE.Group();
        group.add(mesh);
        group.add(light);
        
        this.impactExplosionModel = group;
        this.impactExplosionModel.visible = false;
        this.scene.add(this.impactExplosionModel);
    }
    
    /**
     * Create explosion at position
     */
    createExplosion(position) {
        // Create a bright point light at the explosion location
        const explosionLight = new THREE.PointLight(0xff6600, 5.0, 20);
        explosionLight.position.copy(position);
        
        // Create particles for the explosion
        const particleCount = 150;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Velocities for particle animation
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Initial position - small random offset
            positions[i3] = position.x + (Math.random() - 0.5) * 2;
            positions[i3 + 1] = position.y + (Math.random() - 0.5) * 2;
            positions[i3 + 2] = position.z + (Math.random() - 0.5) * 2;
            
            // Random velocity in all directions
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40
            ));
            
            // Random color from yellow to red
            colors[i3] = Math.random() * 0.5 + 0.5; // Red
            colors[i3 + 1] = Math.random() * 0.3; // Green
            colors[i3 + 2] = 0; // Blue
            
            // Random size
            sizes[i] = Math.random() * 3 + 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        const explosionParticles = new THREE.Points(geometry, particleMaterial);
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
            maxLifetime: 0.5 // Short lifetime for a quick explosion
        });
    }
    
    /**
     * Update explosions
     */
    updateExplosions(delta) {
        if (!this.explosions || this.explosions.length === 0) return;
        
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            
            // Update lifetime
            explosion.lifetime += delta;
            
            // Check if explosion is finished
            if (explosion.lifetime > explosion.maxLifetime) {
                // Remove explosion elements from scene
                this.scene.remove(explosion.light);
                this.scene.remove(explosion.particles);
                
                // Remove from array
                this.explosions.splice(i, 1);
                continue;
            }
            
            // Calculate progress (0 to 1)
            const progress = explosion.lifetime / explosion.maxLifetime;
            
            // Update light intensity
            explosion.light.intensity = 5.0 * (1 - progress);
            
            // Update particles
            const particles = explosion.particles;
            const positions = particles.geometry.attributes.position.array;
            const velocities = particles.userData.velocities;
            const sizes = particles.geometry.attributes.size.array;
            
            // Update each particle
            for (let j = 0; j < velocities.length; j++) {
                const j3 = j * 3;
                
                // Update position based on velocity
                positions[j3] += velocities[j].x * delta;
                positions[j3 + 1] += velocities[j].y * delta;
                positions[j3 + 2] += velocities[j].z * delta;
                
                // Reduce size over time
                sizes[j] *= 0.98;
            }
            
            // Mark attributes for update
            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.size.needsUpdate = true;
            
            // Fade out opacity
            particles.material.opacity = 1 - progress;
        }
    }
    
    /**
     * Handle collision with another entity
     */
    handleCollision(entity) {
        // Skip if invulnerable
        if (this.invulnerable) return;
        
        // Make player invulnerable briefly
        this.invulnerable = true;
        this.invulnerableTime = 0;
        
        // Reduce lives
        this.lives--;
        
        // Create explosion effect
        this.createExplosion(this.transform.position);
        
        // Emit player hit event
        gameEvents.emit(GameEvents.PLAYER_HIT, {
            entity: this,
            livesRemaining: this.lives
        });
        
        // Check for game over
        if (this.lives <= 0) {
            // Emit player death event
            gameEvents.emit(GameEvents.PLAYER_DEATH, { entity: this });
        }
    }
    
    /**
     * Update the player
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // Update core entity components
        super.update(delta);
        
        // Handle movement input
        this.handleMovementInput(delta);
        
        // Update ship tilt based on movement
        this.calculateShipTilt();
        
        // Update engine effects
        this.updateEngineEffects();
        
        // Update explosions
        this.updateExplosions(delta);
        
        // Update camera position
        this.updateCameraPosition();
        
        // Update collision detection
        this.updateColliders();
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTime += delta;
            
            // Make ship blink when invulnerable
            if (this.model) {
                this.model.visible = Math.floor(this.invulnerableTime * 10) % 2 === 0;
            }
            
            // End invulnerability after 2 seconds
            if (this.invulnerableTime > 2.0) {
                this.invulnerable = false;
                
                // Ensure ship is visible
                if (this.model) {
                    this.model.visible = true;
                }
            }
        }
        
        // Check for collisions with asteroids
        this.checkCollisions();
    }
    
    /**
     * Update camera position to follow player
     */
    updateCameraPosition() {
        if (!this.camera) return;
        
        // For side-scroller, we keep the camera fixed and centered on the player's height
        this.camera.position.y = THREE.MathUtils.lerp(
            this.camera.position.y,
            this.transform.position.y * 0.5, // Follow with dampening
            0.05 // Smooth follow
        );
    }
    
    /**
     * Check for collisions with other objects
     */
    checkCollisions() {
        if (!this.physics.boundingBox || this.invulnerable) return;
        
        // Check for collisions with asteroids
        this.scene.traverse((object) => {
            if (object.userData && object.userData.isAsteroid === true) {
                try {
                    // Get the asteroid reference
                    const asteroid = object.userData.asteroidRef;
                    
                    // Check collision if asteroid is loaded
                    if (asteroid && asteroid.physics && asteroid.physics.boundingBox) {
                        // Check for intersection
                        if (this.physics.boundingBox.intersectsBox(asteroid.physics.boundingBox)) {
                            // Handle collision
                            this.handleCollision(asteroid);
                            
                            // Handle asteroid collision
                            if (asteroid.handleHit) {
                                asteroid.handleHit();
                            }
                            
                            if (asteroid.remove) {
                                asteroid.remove();
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error in player collision detection:", error);
                }
            }
        });
    }
} 