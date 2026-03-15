# SOP: Test Browser API

## Purpose

Validate that a browser API works as expected before designing around it.

## When to Use

- Using Web Audio API
- Using Canvas/WebGL features
- Using Storage APIs
- Using Gamepad API
- Any browser-specific feature

## Process

### 1. Create Test File

```typescript
// src/poc/{feature}/test-{api}.ts

export function testBrowserAPI(): void {
  console.log('[POC] Testing {API}...');
  
  // Check if API exists
  if (!('API' in window)) {
    console.log('❌ API not available');
    return;
  }
  
  try {
    // Test basic usage
    console.log('✅ API available and works');
  } catch (e) {
    console.log('❌ API failed:', e);
  }
}
```

### 2. Test in Multiple Browsers

- Chrome (desktop)
- Firefox (desktop)
- Safari (desktop)
- Chrome (Android)
- Safari (iOS)

### 3. Test Edge Cases

- What happens when API is blocked?
- What happens when user denies permission?
- What happens on slow devices?
- What happens with large data?

### 4. Document Compatibility

```markdown
## Browser API: {API Name}

### Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ⚠️ Safari 14+ (with limitations)
- ❌ IE11 (not supported)

### Limitations
- Requires user permission
- Only works over HTTPS
- Performance varies by device

### Fallback Strategy
What to do when API unavailable
```

## Success Criteria

- ✅ API works in target browsers
- ✅ Edge cases handled
- ✅ Fallback strategy defined
- ✅ Performance acceptable

## Common Issues

### API Not Available
- Check browser version requirements
- Check if HTTPS required
- Check if feature flag needed

### Permission Denied
- Design fallback behavior
- Show user-friendly error message
- Don't break game if API unavailable

### Performance Issues
- Test on low-end devices
- Consider throttling/debouncing
- Measure impact on frame rate
