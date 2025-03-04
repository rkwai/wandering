import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createNoise2D } from 'simplex-noise';

import { WorldGenerator } from './world/WorldGenerator.js';
import { Player } from './entities/Player.js';
import { Sky } from './environment/Sky.js';

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
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 10, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(100, 100, 50);
        this.directionalLight.castShadow = true;
        
        // Optimize shadow settings
        this.directionalLight.shadow.mapSize.width = 2048; 
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(this.directionalLight);
        
        // Add beautiful sky
        this.sky = new Sky(this.scene);
    }

    initWorld() {
        this.worldGenerator = new WorldGenerator(this.scene);
        this.worldGenerator.generateTerrain();
    }

    initPlayer() {
        this.player = new Player(this.camera, this.scene);
        
        // Set initial player position
        this.player.position.y = 10; // Start slightly above ground
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
        
        // Update sky
        if (this.sky) {
            this.sky.update(delta);
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page is loaded
window.addEventListener('load', () => {
    new Game();
}); 