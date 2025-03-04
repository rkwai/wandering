import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';

import { WorldGenerator } from './world/WorldGenerator.js';
import { Player } from './entities/Player.js';
import { SpaceEnvironment } from './environment/SpaceEnvironment.js';

class Game {
    constructor() {
        this.initThree();
        this.initWorld();
        this.initPlayer();
        this.initEventListeners();
        this.animate();

        // Hide loading screen once everything is initialized
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 1000);
    }

    initThree() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Black background for space
        
        // No fog in space
        this.scene.fog = null;

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            20000 // Much larger far plane for space distances
        );
        this.camera.position.set(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Add ambient light (dim for space)
        const ambientLight = new THREE.AmbientLight(0x202040, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light (distant sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffcc, 0.8);
        this.directionalLight.position.set(-5000, 3000, -8000);
        this.directionalLight.castShadow = true;
        
        // Set up shadow properties
        this.directionalLight.shadow.mapSize.width = 2048; 
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 15000;
        this.directionalLight.shadow.camera.left = -1000;
        this.directionalLight.shadow.camera.right = 1000;
        this.directionalLight.shadow.camera.top = 1000;
        this.directionalLight.shadow.camera.bottom = -1000;
        
        this.scene.add(this.directionalLight);
        
        // Add space environment effects (stars, nebulae, etc.)
        this.spaceEnvironment = new SpaceEnvironment(this.scene);
    }

    initWorld() {
        this.worldGenerator = new WorldGenerator(this.scene);
        this.worldGenerator.generateTerrain();
    }

    initPlayer() {
        this.player = new Player(this.camera, this.scene);
    }

    initEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Handle pointer lock for immersive first-person experience
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock ? this.clock.getDelta() : 0;
        if (!this.clock) {
            this.clock = new THREE.Clock();
        }
        
        // Update player
        if (this.player) {
            this.player.update(delta);
        }
        
        // Check for world updates based on player position
        if (this.worldGenerator && this.player) {
            this.worldGenerator.updateChunks(this.player.position);
        }
        
        // Update space environment
        if (this.spaceEnvironment) {
            this.spaceEnvironment.update(delta);
        }
        
        // Update celestial bodies
        if (this.worldGenerator && this.worldGenerator.celestialBodies) {
            this.worldGenerator.celestialBodies.update(delta);
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page is loaded
window.addEventListener('load', () => {
    new Game();
}); 