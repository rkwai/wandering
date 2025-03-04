import * as THREE from 'three';

export class Sky {
    constructor(scene) {
        this.scene = scene;
        this.dayDuration = 600; // 10 minutes for a full day/night cycle
        this.time = 0; // 0-1 representing time of day (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
        
        this.createSky();
        this.createSun();
        this.createMoon();
        this.createStars();
        
        // Start at mid-morning
        this.time = 0.3;
        this.updateCelestialPositions();
    }
    
    createSky() {
        // Create a large sphere for the sky
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        // Flip the geometry inside out
        skyGeometry.scale(-1, 1, 1);
        
        // Create a shader material for the sky
        this.skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 },
                time: { value: this.time }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float time;
                
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    float t = time * 2.0 * 3.14159265359; // Convert time to angle
                    
                    // Day-night cycle
                    float dayFactor = pow(max(sin(t), 0.0), 0.25); // Day brightness
                    
                    // Calculate sky color
                    vec3 dayColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    vec3 nightColor = vec3(0.05, 0.05, 0.1); // Dark blue for night
                    
                    // Transition between day and night
                    vec3 skyColor = mix(nightColor, dayColor, dayFactor);
                    
                    // Add sunset/sunrise
                    float sunsetFactor = pow(max(sin(t - 0.2) * sin(t + 0.2), 0.0), 3.0);
                    vec3 sunsetColor = vec3(0.8, 0.3, 0.1);
                    skyColor = mix(skyColor, sunsetColor, sunsetFactor);
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        // Create and add the sky mesh
        this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
        this.scene.add(this.skyMesh);
    }
    
    createSun() {
        // Sun geometry and material
        const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffcc,
            transparent: true,
            opacity: 0.8
        });
        
        // Create sun mesh
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(0, 0, 0);
        
        // Add sunlight (directional light)
        this.sunLight = new THREE.DirectionalLight(0xffffcc, 1);
        this.sunLight.castShadow = true;
        
        // Configure shadow properties
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        
        // Add to scene
        this.scene.add(this.sun);
        this.scene.add(this.sunLight);
    }
    
    createMoon() {
        // Moon geometry and material
        const moonGeometry = new THREE.SphereGeometry(5, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            transparent: true,
            opacity: 0.8
        });
        
        // Create moon mesh
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.set(0, 0, 0);
        
        // Add moonlight (dimmer directional light)
        this.moonLight = new THREE.DirectionalLight(0xccccff, 0.2);
        this.moonLight.castShadow = true;
        
        // Add to scene
        this.scene.add(this.moon);
        this.scene.add(this.moonLight);
    }
    
    createStars() {
        // Create star particles
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 2000;
        const positions = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        // Generate random stars at large distances
        for (let i = 0; i < starsCount; i++) {
            const i3 = i * 3;
            const radius = 450; // Just inside the sky sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Star material
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        // Create and add stars
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }
    
    update(delta) {
        // Update time (progress through day/night cycle)
        this.time += delta / this.dayDuration;
        if (this.time >= 1) this.time -= 1;
        
        // Update sky shader with new time
        this.skyMaterial.uniforms.time.value = this.time;
        
        // Update positions of celestial bodies
        this.updateCelestialPositions();
        
        // Update star visibility based on time of day
        this.updateStarVisibility();
    }
    
    updateCelestialPositions() {
        // Calculate positions for sun and moon
        const sunAngle = this.time * Math.PI * 2;
        const moonAngle = sunAngle + Math.PI; // Moon is opposite the sun
        
        const distance = 400;
        const height = Math.sin(sunAngle) * distance;
        const depth = Math.cos(sunAngle) * distance;
        
        // Update sun position and light
        this.sun.position.set(0, height, depth);
        this.sunLight.position.copy(this.sun.position);
        this.sunLight.intensity = Math.max(Math.sin(sunAngle), 0); // Only shine during day
        
        // Update moon position and light
        this.moon.position.set(0, Math.sin(moonAngle) * distance, Math.cos(moonAngle) * distance);
        this.moonLight.position.copy(this.moon.position);
        this.moonLight.intensity = Math.max(Math.sin(moonAngle), 0) * 0.2; // Dimmer light at night
    }
    
    updateStarVisibility() {
        // Stars are visible at night (time around 0 or 1)
        const isDaytime = this.time > 0.25 && this.time < 0.75;
        
        // Fade stars based on time of day
        if (isDaytime) {
            this.stars.material.opacity = 0;
        } else {
            // Calculate star opacity based on how far into night we are
            const midnightFactor = 1 - 2 * Math.abs(this.time - 0) % 1;
            this.stars.material.opacity = Math.min(midnightFactor * 2, 0.8);
        }
    }
} 