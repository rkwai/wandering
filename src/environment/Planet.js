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
            emissive: options.emissive !== undefined ? options.emissive : true, // Default to true now
            emissiveColor: options.emissiveColor || 0x113355,
            emissiveIntensity: options.emissiveIntensity || 0.4, // Increased intensity
            addAtmosphericGlow: options.addAtmosphericGlow !== undefined ? options.addAtmosphericGlow : true,
            lightColor: options.lightColor || 0xffffcc,
            lightIntensity: options.lightIntensity || 1.0
        };
        
        // Create container for the planet
        this.planetGroup = new THREE.Group();
        this.planetGroup.position.copy(this.options.position);
        this.scene.add(this.planetGroup);
        
        // Load the model
        this.loadPlanetModel();
        
        // Always add a planet light now
        this.addPlanetLight();
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
            
            // Add a point light inside the planet for enhanced glow
            this.addPlanetInnerLight();
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
            side: THREE.BackSide, // Render inside of the sphere
            emissive: this.options.atmosphereColor,
            emissiveIntensity: 0.5 // Make atmosphere self-illuminating
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphere.scale.set(
            this.options.scale, 
            this.options.scale, 
            this.options.scale
        );
        
        this.planetGroup.add(atmosphere);
        
        // Add a stronger point light inside the planet for glow effect
        const atmosphereLight = new THREE.PointLight(
            this.options.atmosphereColor, 
            1.0, // Increased intensity
            this.options.scale * 5 // Increased range
        );
        atmosphereLight.position.set(0, 0, 0);
        this.planetGroup.add(atmosphereLight);
    }
    
    /**
     * Add a point light inside the planet for enhanced glow
     */
    addPlanetInnerLight() {
        const innerLight = new THREE.PointLight(
            this.options.emissiveColor,
            0.8,
            this.options.scale * 2
        );
        innerLight.position.set(0, 0, 0);
        this.planetGroup.add(innerLight);
    }
    
    /**
     * Add a distant point light to simulate sunlight
     */
    addPlanetLight() {
        // Position light at the planet to illuminate surroundings
        const lightPosition = new THREE.Vector3(0, 0, 0);
        
        // Create a bright point light
        const planetLight = new THREE.PointLight(
            this.options.lightColor, 
            this.options.lightIntensity, 
            this.options.scale * 20
        );
        planetLight.position.copy(lightPosition);
        planetLight.castShadow = true;
        
        // Configure shadow properties
        planetLight.shadow.mapSize.width = 1024;
        planetLight.shadow.mapSize.height = 1024;
        planetLight.shadow.camera.near = 0.5;
        planetLight.shadow.camera.far = this.options.scale * 20;
        
        this.planetGroup.add(planetLight);
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