# Special Effects Models

This directory contains 3D models for special effects in the game, such as:
- Explosions
- Impact effects
- Particle systems
- Energy effects
- Shield effects

## Models
- `impact_explosion.glb` - Explosion effect for missile impacts and collisions

## Guidelines
1. Effects models should be optimized for quick loading and performance
2. Use appropriate scale (standard size is 1 unit = 1 meter)
3. Center the effect's origin point appropriately
4. Include any necessary animations in the GLB file
5. Keep file sizes minimal since effects may be instantiated frequently

## Usage
Effects models are typically instantiated temporarily and removed after their animation completes.
See the `Player.js` class for examples of how these models are used in the game. 