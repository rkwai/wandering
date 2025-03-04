import * as THREE from 'three';

export class SpaceEnvironment {
    constructor(scene) {
        this.scene = scene;
        
        // Initialize space background effects
        this.createBackgroundStars();
        this.createSpaceParticles();
    }
    
    createBackgroundStars() {
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
        this.backgroundStars = new THREE.Points(starGeometry, starMaterial);
        this.backgroundStars.name = 'background-stars';
        
        // Add to scene
        this.scene.add(this.backgroundStars);
    }
    
    createSpaceParticles() {
        // Create drifting dust particles for the space environment
        const particleCount = 1000;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        
        // Generate random particle positions in a large volume around the origin
        const volume = 300; // Volume side length
        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * volume;
            particlePositions[i * 3 + 1] = (Math.random() - 0.5) * volume;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * volume;
        }
        
        // Set geometry attributes
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        
        // Create a small particle texture
        const particleCanvas = document.createElement('canvas');
        particleCanvas.width = 16;
        particleCanvas.height = 16;
        const ctx = particleCanvas.getContext('2d');
        
        // Draw a soft gradient for the particle
        const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradient.addColorStop(0, 'rgba(200, 200, 255, 0.5)');
        gradient.addColorStop(0.5, 'rgba(150, 150, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 16, 16);
        
        // Create the particle texture
        const particleTexture = new THREE.CanvasTexture(particleCanvas);
        
        // Create the particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: 1.5,
            map: particleTexture,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create the particle system
        this.spaceParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.spaceParticles.name = 'space-particles';
        
        // Store original positions for animation
        this.particlePositions = particlePositions;
        
        // Add to scene
        this.scene.add(this.spaceParticles);
    }
    
    update(delta) {
        // Animate space particles
        if (this.spaceParticles) {
            // Slow drift of particles
            const positions = this.spaceParticles.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Apply a small drift in a random direction
                positions[i] += (Math.random() - 0.5) * 0.1;
                positions[i + 1] += (Math.random() - 0.5) * 0.1;
                positions[i + 2] += (Math.random() - 0.5) * 0.1;
                
                // Keep particles within bounds
                const boundSize = 150;
                if (Math.abs(positions[i]) > boundSize) {
                    positions[i] *= -0.9;
                }
                if (Math.abs(positions[i + 1]) > boundSize) {
                    positions[i + 1] *= -0.9;
                }
                if (Math.abs(positions[i + 2]) > boundSize) {
                    positions[i + 2] *= -0.9;
                }
            }
            
            // Update geometry
            this.spaceParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Very slight rotation of background stars for subtle motion
        if (this.backgroundStars) {
            this.backgroundStars.rotation.y += delta * 0.001;
            this.backgroundStars.rotation.x += delta * 0.0005;
        }
    }
} 