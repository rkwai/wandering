import * as THREE from 'three';
import { ModelLoader } from '../utils/ModelLoader';
import debugHelper from '../utils/DebugHelper.js';

/**
 * Class representing a planet in the space environment
 */
export class Planet {
    /**
     * Create a new planet
     * @param {THREE.Scene} scene - The scene to add the planet to
     * @param {Object} options - Configuration options for the planet
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        
        // Apply default options or use provided ones
        this.options = {
            position: options.position || new THREE.Vector3(500, 0, -1000),
            scale: options.scale || 100,
            rotationSpeed: options.rotationSpeed || 0.005,
            atmosphereColor: options.atmosphereColor || 0x4ca7ff,
            atmosphereOpacity: options.atmosphereOpacity || 0.3,
            emissive: options.emissive || false,
            emissiveColor: options.emissiveColor || 0x113355,
            emissiveIntensity: options.emissiveIntensity || 0.2,
            addAtmosphericGlow: options.addAtmosphericGlow !== undefined ? options.addAtmosphericGlow : true
        };
        
        // Create container for the planet
        this.planetGroup = new THREE.Group();
        this.planetGroup.position.copy(this.options.position);
        this.scene.add(this.planetGroup);
        
        // Load the model
        this.loadPlanetModel();
        
        // Add a distant point light to simulate sunlight on the planet
        if (options.addLight) {
            this.addPlanetLight();
        }
    }
    
    /**
     * Load the GLB model for this planet
     */
    loadPlanetModel() {
        // Create a model loader
        this.modelLoader = new ModelLoader();
        
        debugHelper.log("Loading planet model...");
        
        // Load the planet model from the environment directory
        this.modelLoader.loadModel('models/environment/planet_0304124746.glb', (model) => {
            // Add the loaded model to the planet group
            this.planetGroup.add(model);
            
            // Scale the model 
            model.scale.set(
                this.options.scale, 
                this.options.scale, 
                this.options.scale
            );
            
            // Apply any additional rendering options to all meshes
            model.traverse((child) => {
                if (child.isMesh) {
                    // Ensure shadow casting and receiving
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // If the model should be emissive
                    if (this.options.emissive && child.material) {
                        child.material.emissive = new THREE.Color(this.options.emissiveColor);
                        child.material.emissiveIntensity = this.options.emissiveIntensity;
                    }
                }
            });
            
            debugHelper.log("Planet model loaded successfully!");
            
            // Add atmospheric glow if enabled
            if (this.options.addAtmosphericGlow) {
                this.addAtmosphere();
            }
        }, (error) => {
            debugHelper.log("Failed to load planet model: " + error.message, "error");
            // Do not create a basic planet, just log the error
        });
    }
    
    /**
     * Add an atmospheric glow effect around the planet
     */
    addAtmosphere() {
        // Create a slightly larger sphere for the atmosphere
        const atmosphereGeometry = new THREE.SphereGeometry(1.05, 64, 48); // 5% larger than the planet
        const atmosphereMaterial = new THREE.MeshStandardMaterial({
            color: this.options.atmosphereColor,
            transparent: true,
            opacity: this.options.atmosphereOpacity,
            side: THREE.BackSide // Render inside of the sphere
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphere.scale.set(
            this.options.scale, 
            this.options.scale, 
            this.options.scale
        );
        
        this.planetGroup.add(atmosphere);
        
        // Add a subtle point light inside the planet for glow effect
        const atmosphereLight = new THREE.PointLight(
            this.options.atmosphereColor, 
            0.5, 
            this.options.scale * 3
        );
        atmosphereLight.position.set(0, 0, 0);
        this.planetGroup.add(atmosphereLight);
    }
    
    /**
     * Add a distant point light to simulate sunlight
     */
    addPlanetLight() {
        // Position light far away to simulate directional sunlight
        const lightPosition = this.options.position.clone().add(new THREE.Vector3(500, 300, 100));
        
        // Create a bright point light
        const sunlight = new THREE.PointLight(0xffffcc, 2, 2000);
        sunlight.position.copy(lightPosition);
        this.scene.add(sunlight);
        
        // Create a subtle ambient light
        const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
        this.scene.add(ambientLight);
    }
    
    /**
     * Update the planet rotation
     * @param {number} delta - Time step in seconds
     */
    update(delta) {
        // Rotate the planet
        this.planetGroup.rotation.y += this.options.rotationSpeed * delta;
    }
    
    /**
     * Remove the planet from the scene
     */
    remove() {
        this.scene.remove(this.planetGroup);
    }
} 