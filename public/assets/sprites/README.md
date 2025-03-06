# Sprite Assets

This directory contains all 2D sprite assets for the game.

## Directory Structure

- `/characters`: Character sprite sheets (player, enemies)
- `/animations`: General animation sprite sheets
- `/ui`: User interface elements and HUD components
- `/effects`: Visual effects, particles, and decorative elements

## Sprite Sheet Guidelines

- Maintain consistent sprite sizes within categories
- Create uniform grid layouts for animation frames
- Include 1-2px transparent padding around sprites to prevent bleeding
- Use power-of-two dimensions for texture optimization
- Include sprite data JSON files with frame information
- Follow the naming convention: `category-name-action.png`
- For animation sequences, use numbered suffixes: `character-hero-run-01.png`

## Performance Considerations

- Keep individual sprite sheets under 2048x2048px when possible
- Use texture compression (WebP when supported)
- Combine related sprites into atlases
- Minimize the number of unique textures
- Consider providing low-res versions for performance-critical devices

## Animation Standards

- Animation frame rate: 24fps for characters, 12fps for simple effects
- Standard character animations to include:
  - Idle
  - Run
  - Jump (rise, apex, fall)
  - Attack
  - Hurt
  - Death
- Document animation timing in JSON metadata files 