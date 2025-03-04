import * as THREE from 'three';

export class CelestialBodies {
    constructor(scene) {
        this.scene = scene;
        
        // Planet materials
        this.planetMaterials = {
            earth: new THREE.MeshStandardMaterial({
                color: 0x2233ff,
                roughness: 0.7,
                metalness: 0.1
            }),
            
            mars: new THREE.MeshStandardMaterial({
                color: 0xdd5500,
                roughness: 0.8,
                metalness: 0.1
            }),
            
            gas: new THREE.MeshStandardMaterial({
                color: 0xffbb66,
                roughness: 0.5,
                metalness: 0.2
            }),
            
            ice: new THREE.MeshStandardMaterial({
                color: 0x99ccff,
                roughness: 0.4,
                metalness: 0.3
            }),
            
            lava: new THREE.MeshStandardMaterial({
                color: 0xff5500,
                roughness: 0.7,
                metalness: 0.3,
                emissive: 0xff2200,
                emissiveIntensity: 0.2
            })
        };
        
        // Star materials
        this.starMaterials = {
            sun: new THREE.MeshBasicMaterial({
                color: 0xffff99,
                emissive: 0xffff00,
                emissiveIntensity: 1.0
            }),
            
            redGiant: new THREE.MeshBasicMaterial({
                color: 0xff6644,
                emissive: 0xff2200,
                emissiveIntensity: 1.0
            }),
            
            blueGiant: new THREE.MeshBasicMaterial({
                color: 0x99ccff,
                emissive: 0x0066ff,
                emissiveIntensity: 1.0
            })
        };
    }
    
    createDistantPlanets() {
        // Create several distant planets at fixed positions
        const planets = [
            {
                type: 'earth',
                position: new THREE.Vector3(2000, 500, -3000),
                size: 200,
                rotation: 0.0001
            },
            {
                type: 'gas',
                position: new THREE.Vector3(-3000, -800, -2000),
                size: 350,
                rotation: 0.00015
            },
            {
                type: 'mars',
                position: new THREE.Vector3(3500, 200, -1500),
                size: 150,
                rotation: 0.0002
            },
            {
                type: 'ice',
                position: new THREE.Vector3(-2500, 1200, -2800),
                size: 180,
                rotation: 0.00013
            },
            {
                type: 'lava',
                position: new THREE.Vector3(1800, -700, -4000),
                size: 220,
                rotation: 0.00018
            }
        ];
        
        planets.forEach(planet => {
            this.createPlanet(planet.type, planet.position, planet.size, planet.rotation);
        });
        
        // Create a distant star (small sun)
        const sunPosition = new THREE.Vector3(-5000, 3000, -8000);
        this.createStar('sun', sunPosition, 800);
        
        // Add a point light at the sun position
        const sunLight = new THREE.PointLight(0xffffcc, 1, 15000);
        sunLight.position.copy(sunPosition);
        this.scene.add(sunLight);
    }
    
    createPlanet(type, position, size, rotationSpeed) {
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = this.planetMaterials[type] || this.planetMaterials.earth;
        
        const planet = new THREE.Mesh(geometry, material);
        planet.position.copy(position);
        
        // Set random initial rotation
        planet.rotation.x = Math.random() * Math.PI * 2;
        planet.rotation.y = Math.random() * Math.PI * 2;
        planet.rotation.z = Math.random() * Math.PI * 2;
        
        // Store rotation speed
        planet.userData.rotationSpeed = {
            y: rotationSpeed
        };
        
        // Add to scene
        planet.name = `planet-${type}`;
        this.scene.add(planet);
        
        // If gas planet, add rings
        if (type === 'gas') {
            this.addPlanetRings(planet, size);
        }
        
        // Maybe add moons
        if (Math.random() > 0.5) {
            const moonCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < moonCount; i++) {
                this.addMoon(planet, size);
            }
        }
        
        return planet;
    }
    
    addPlanetRings(planet, planetSize) {
        const innerRadius = planetSize * 1.2;
        const outerRadius = planetSize * 2.0;
        
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccaa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2;
        rings.rotation.y = Math.random() * Math.PI / 4;
        
        planet.add(rings);
    }
    
    addMoon(planet, planetSize) {
        const moonSize = planetSize * (0.1 + Math.random() * 0.2);
        const moonDistance = planetSize * (2.5 + Math.random() * 2);
        
        const moonGeometry = new THREE.SphereGeometry(moonSize, 16, 16);
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        
        // Position in random orbit
        const angle = Math.random() * Math.PI * 2;
        moon.position.set(
            Math.cos(angle) * moonDistance,
            (Math.random() - 0.5) * moonDistance * 0.3,
            Math.sin(angle) * moonDistance
        );
        
        // Add orbit animation
        moon.userData.orbitSpeed = 0.001 + Math.random() * 0.003;
        moon.userData.orbitRadius = moonDistance;
        moon.userData.orbitCenter = new THREE.Vector3(0, moon.position.y, 0);
        moon.userData.orbitAngle = angle;
        
        planet.add(moon);
    }
    
    createStar(type, position, size) {
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = this.starMaterials[type] || this.starMaterials.sun;
        
        const star = new THREE.Mesh(geometry, material);
        star.position.copy(position);
        
        // Add glow effect
        this.addStarGlow(star, size, type);
        
        // Add to scene
        star.name = `star-${type}`;
        this.scene.add(star);
        
        return star;
    }
    
    addStarGlow(star, size, type) {
        // Add a larger transparent sphere for the glow effect
        const glowSize = size * 1.5;
        const glowGeometry = new THREE.SphereGeometry(glowSize, 32, 32);
        
        let glowColor;
        switch (type) {
            case 'redGiant':
                glowColor = 0xff5533;
                break;
            case 'blueGiant':
                glowColor = 0x6699ff;
                break;
            default:
                glowColor = 0xffffaa;
        }
        
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        star.add(glow);
    }
    
    createDistantGalaxy() {
        // Create a spiral galaxy using particles
        const galaxyParticles = 10000;
        const galaxyGeometry = new THREE.BufferGeometry();
        const galaxyPositions = new Float32Array(galaxyParticles * 3);
        const galaxyColors = new Float32Array(galaxyParticles * 3);
        
        // Spiral parameters
        const arms = 3; // Number of spiral arms
        const armWidth = 0.6; // Width of the arms
        const revolutions = 2.5; // Number of revolutions around the center
        const randomness = 0.4; // Random offset from the perfect spiral
        const flatness = 0.3; // How flat the galaxy is (z-compression)
        
        // Galaxy position - very far away
        const galaxyPosition = new THREE.Vector3(8000, 2000, -10000);
        
        // Generate particle positions in a spiral pattern
        for (let i = 0; i < galaxyParticles; i++) {
            // Distance from center (0 to 1)
            const distance = Math.random();
            
            // Angle based on distance (more revolutions as we go out)
            // Add arm offset to create spiral arms
            const armOffset = Math.floor(Math.random() * arms) / arms;
            const angle = (revolutions * Math.PI * 2 * distance) + (Math.PI * 2 * armOffset);
            
            // Add some randomness to the angle to make the arms less perfect
            const angleRandom = (Math.random() - 0.5) * randomness;
            const finalAngle = angle + angleRandom;
            
            // Calculate spiral coordinates
            const x = Math.cos(finalAngle) * distance * 2000;
            const z = Math.sin(finalAngle) * distance * 2000;
            
            // Add some height variation (thicker in the center)
            const scaleHeight = 1 - (distance * flatness);
            const y = (Math.random() - 0.5) * 200 * scaleHeight;
            
            // Set position
            galaxyPositions[i * 3] = x;
            galaxyPositions[i * 3 + 1] = y;
            galaxyPositions[i * 3 + 2] = z;
            
            // Color based on distance from center
            if (distance < 0.3) {
                // Center: yellowish
                galaxyColors[i * 3] = 1.0; // R
                galaxyColors[i * 3 + 1] = 0.9; // G
                galaxyColors[i * 3 + 2] = 0.7; // B
            } else if (distance < 0.6) {
                // Mid: blueish
                galaxyColors[i * 3] = 0.7; // R
                galaxyColors[i * 3 + 1] = 0.8; // G
                galaxyColors[i * 3 + 2] = 1.0; // B
            } else {
                // Outer: purplish
                galaxyColors[i * 3] = 0.8; // R
                galaxyColors[i * 3 + 1] = 0.5; // G
                galaxyColors[i * 3 + 2] = 1.0; // B
            }
        }
        
        galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
        galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(galaxyColors, 3));
        
        const galaxyMaterial = new THREE.PointsMaterial({
            size: 10,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
        galaxy.position.copy(galaxyPosition);
        galaxy.name = 'distant-galaxy';
        this.scene.add(galaxy);
    }
    
    createNebula() {
        // Create a colorful nebula using particles
        const nebulaParticles = 5000;
        const nebulaGeometry = new THREE.BufferGeometry();
        const nebulaPositions = new Float32Array(nebulaParticles * 3);
        const nebulaColors = new Float32Array(nebulaParticles * 3);
        const nebulaSizes = new Float32Array(nebulaParticles);
        
        // Nebula position - far away but visible
        const nebulaPosition = new THREE.Vector3(-7000, -1000, -5000);
        const nebulaSize = 2000;
        
        // Choose a nebula type
        const nebulaType = Math.floor(Math.random() * 3);
        let primaryColor, secondaryColor;
        
        switch (nebulaType) {
            case 0: // Blue/purple nebula
                primaryColor = {r: 0.4, g: 0.6, b: 1.0};
                secondaryColor = {r: 0.8, g: 0.3, b: 0.9};
                break;
            case 1: // Red/orange nebula
                primaryColor = {r: 1.0, g: 0.5, b: 0.2};
                secondaryColor = {r: 0.9, g: 0.2, b: 0.3};
                break;
            case 2: // Green/teal nebula
                primaryColor = {r: 0.3, g: 0.9, b: 0.6};
                secondaryColor = {r: 0.2, g: 0.8, b: 0.9};
                break;
        }
        
        // Create cloud-like distribution of particles
        for (let i = 0; i < nebulaParticles; i++) {
            // Create a cloud-like blob using multiple noise functions
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = Math.random() * nebulaSize;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            nebulaPositions[i * 3] = x;
            nebulaPositions[i * 3 + 1] = y;
            nebulaPositions[i * 3 + 2] = z;
            
            // Color interpolation based on position
            const distanceRatio = Math.sqrt(x*x + y*y + z*z) / nebulaSize;
            const colorMix = Math.sin(distanceRatio * Math.PI);
            
            // Mix between primary and secondary colors
            nebulaColors[i * 3] = primaryColor.r * (1 - colorMix) + secondaryColor.r * colorMix; // R
            nebulaColors[i * 3 + 1] = primaryColor.g * (1 - colorMix) + secondaryColor.g * colorMix; // G
            nebulaColors[i * 3 + 2] = primaryColor.b * (1 - colorMix) + secondaryColor.b * colorMix; // B
            
            // Vary particle sizes
            nebulaSizes[i] = 10 + Math.random() * 20;
        }
        
        nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
        nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
        nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(nebulaSizes, 1));
        
        const nebulaMaterial = new THREE.PointsMaterial({
            size: 30,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
        nebula.position.copy(nebulaPosition);
        nebula.name = 'nebula';
        this.scene.add(nebula);
    }
    
    update(delta) {
        // Animate planet rotations
        this.scene.traverse((object) => {
            if (object.userData.rotationSpeed) {
                // Apply rotation
                object.rotation.y += object.userData.rotationSpeed.y || 0;
                object.rotation.x += object.userData.rotationSpeed.x || 0;
                object.rotation.z += object.userData.rotationSpeed.z || 0;
            }
            
            // Animate moons around planets
            if (object.userData.orbitSpeed) {
                // Update orbit position
                object.userData.orbitAngle += object.userData.orbitSpeed;
                
                // Calculate new position
                object.position.x = Math.cos(object.userData.orbitAngle) * object.userData.orbitRadius;
                object.position.z = Math.sin(object.userData.orbitAngle) * object.userData.orbitRadius;
            }
        });
    }
} 