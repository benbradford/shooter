# SOP: Measure Performance Impact

## Purpose

Validate that a proposed approach meets performance requirements before committing to design.

## When to Use

- Feature involves many entities (100+)
- Feature runs every frame
- Feature involves heavy computation
- Feature loads large assets
- Uncertain about performance

## Process

### 1. Create Stress Test

```typescript
// src/poc/{feature}/test-performance.ts

export function stressTest(scene: Phaser.Scene): void {
  console.log('[POC] Starting stress test...');
  
  const startTime = performance.now();
  
  // Create many instances
  for (let i = 0; i < 1000; i++) {
    // Your feature logic
  }
  
  const endTime = performance.now();
  console.log(`✅ Created 1000 instances in ${endTime - startTime}ms`);
}

export function frameRateTest(scene: Phaser.Scene): void {
  let frameCount = 0;
  let totalTime = 0;
  
  scene.events.on('update', (time: number, delta: number) => {
    frameCount++;
    totalTime += delta;
    
    // Your feature logic
    
    if (frameCount === 600) { // 10 seconds at 60fps
      const avgFps = 1000 / (totalTime / frameCount);
      console.log(`✅ Average FPS: ${avgFps.toFixed(1)}`);
    }
  });
}
```

### 2. Test with Realistic Load

Don't just test empty scene:
- Add 50 enemies
- Add 100 bullets
- Add particle effects
- Add pathfinding
- Add collision detection

### 3. Measure Key Metrics

- **Frame rate**: Must stay above 50 FPS
- **Memory usage**: Check browser DevTools
- **Load time**: Time to initialize
- **Bundle size**: Impact on download

### 4. Test on Low-End Devices

- Old Android phone
- Raspberry Pi
- Low-end laptop

### 5. Document Results

```markdown
## Performance Test: {Feature}

### Test Scenario
- 100 entities with feature enabled
- 50 enemies active
- 100 bullets in flight

### Results
- **Frame rate**: 58 FPS (target: 50+)
- **Memory**: +15MB (acceptable)
- **Load time**: +200ms (acceptable)
- **Bundle size**: +50kb (acceptable)

### Bottlenecks
- None detected

### Recommendation
PROCEED - Performance acceptable
```

## Success Criteria

- ✅ Frame rate stays above 50 FPS
- ✅ Memory usage reasonable (<100MB increase)
- ✅ Load time acceptable (<1s increase)
- ✅ Works on low-end devices

## Common Issues

### Frame Rate Drops
- Profile with browser DevTools
- Identify hot spots
- Consider object pooling
- Consider spatial partitioning

### Memory Leaks
- Check for unreleased references
- Check for event listeners not removed
- Check for textures not destroyed

### Slow Load Times
- Consider lazy loading
- Consider asset compression
- Consider code splitting
