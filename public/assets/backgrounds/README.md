# Background Assets

This directory contains all background and parallax layers for the side-scroller game.

## Directory Structure

- `/foreground`: Closest parallax layers (scroll fastest)
- `/midground`: Middle parallax layers (moderate scroll speed)
- `/background`: Distant background layers (slowest scrolling)

## Background Design Guidelines

- All backgrounds should be designed for seamless horizontal tiling
- Standard layer dimensions:
  - Foreground: 1024px width minimum
  - Midground: 2048px width minimum
  - Background: 2048-4096px width minimum
- Design with 16:9 aspect ratio in mind but accommodate other ratios
- Include separated layers to allow for depth and parallax effects
- Consider how layers will interact visually when scrolling at different speeds
- Design with proper contrast to ensure gameplay elements remain visible

## Parallax Configuration

- Recommended scroll speed ratios (relative to camera movement):
  - Foreground: 1.2-1.5x camera speed
  - Midground: 0.5-0.8x camera speed
  - Background: 0.1-0.3x camera speed
- Create smooth transitions between background types/themes
- Consider atmospheric effects (fog, haze) for distant backgrounds

## Performance Considerations

- Use JPEG for backgrounds without transparency
- Use PNG/WebP for layers requiring transparency
- Optimize file size for web delivery
- Consider providing both high and low-resolution versions
- Use compression techniques appropriate for the visual style

## Theme Guidelines

- Create consistent visual language across related backgrounds
- Design environment-specific variations (day/night, weather conditions)
- Include subtle animations in JSON configuration when appropriate (e.g., waving trees)
- Consider level progression and storytelling through background elements 