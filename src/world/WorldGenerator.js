import * as THREE from 'three';
import { CelestialBodies } from './CelestialBodies.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        
        // Create celestial bodies (planets, stars, etc.)
        this.celestialBodies = new CelestialBodies(scene);
        
        // Starfield
        this.createStarfield();
    }

    generateTerrain() {
        // Initialize space environment with celestial bodies
        this.celestialBodies.createDistantPlanets();
    }

    createStarfield() {
        // Create a small star texture
        const starCanvas = document.createElement('canvas');
        starCanvas.width = 32;
        starCanvas.height = 32;
        const ctx = starCanvas.getContext('2d');
        
        // Draw a soft gradient for the star
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        // Create the star texture
        const starTexture = new THREE.CanvasTexture(starCanvas);
        
        // Create a material using the texture
        const starMaterial = new THREE.PointsMaterial({
            size: 3,
            map: starTexture,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        // Create a buffer geometry for the stars
        const starCount = 5000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        
        // Generate random star positions on a distant sphere
        for (let i = 0; i < starCount; i++) {
            // Use uniform spherical distribution
            const theta = Math.random() * Math.PI * 2; // Azimuthal angle
            const phi = Math.acos(2 * Math.random() - 1); // Polar angle
            const radius = 10000; // Very distant background
            
            // Convert spherical to Cartesian coordinates
            starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Set star color (mostly white with some colored stars)
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                // White stars
                starColors[i * 3] = 0.9 + Math.random() * 0.1;
                starColors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                starColors[i * 3 + 2] = 1.0;
            } else if (colorChoice < 0.8) {
                // Red stars
                starColors[i * 3] = 0.8 + Math.random() * 0.2;
                starColors[i * 3 + 1] = 0.1 + Math.random() * 0.2;
                starColors[i * 3 + 2] = 0.1 + Math.random() * 0.2;
            } else if (colorChoice < 0.9) {
                // Yellow stars
                starColors[i * 3] = 0.8 + Math.random() * 0.2;
                starColors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
                starColors[i * 3 + 2] = 0.2 + Math.random() * 0.2;
            } else {
                // Blue stars
                starColors[i * 3] = 0.2 + Math.random() * 0.2;
                starColors[i * 3 + 1] = 0.5 + Math.random() * 0.2;
                starColors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            }
        }
        
        // Set geometry attributes
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        
        // Create the star particles
        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.starfield.name = 'starfield';
        
        // Add to scene
        this.scene.add(this.starfield);
    }
} 