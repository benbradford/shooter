# Level Loading System - Scrutiny

## Purpose

Find ALL ambiguities, edge cases, and unclear behaviors before implementation.

---

## Phase 0: Prerequisite Refactors Questions

### TextureVerifier Questions

### Q1: Verification Timing
**Question**: Should verification happen immediately after 'complete' or wait for GPU upload?
**Why it matters**: Android timing issues
**Answer needed**: Immediate check + polling for Android, or always poll?

### Q2: Verification Failure Recovery
**Question**: If verification fails, do we retry load or fail immediately?
**Why it matters**: Transient failures vs permanent failures
**Answer needed**: Retry logic for verification

### Q3: Partial Frame Verification
**Question**: Should we verify ALL frames or just the first frame?
**Why it matters**: Performance vs thoroughness
**Answer needed**: Verification depth

### Q4: Verification Performance Impact
**Question**: Does 5-step verification add significant delay? Should we show "Verifying..." message?
**Why it matters**: User experience
**Answer needed**: Performance impact and UI feedback

### Q5: GPU Upload Polling Interval
**Question**: Is 50ms the right polling interval for Android? Should it be configurable?
**Why it matters**: Balance between speed and reliability
**Answer needed**: Polling strategy

---

### AssetManifest Questions

### Q6: Asset Type Completeness
**Question**: Does AssetManifest cover ALL asset types (backgrounds, entities, animated, UI, audio)?
**Why it matters**: Missing assets cause failures
**Answer needed**: Complete asset type list

### Q7: Dynamic Asset Loading
**Question**: What about assets loaded dynamically (runtime tilesets, generated textures)?
**Why it matters**: Manifest might be incomplete
**Answer needed**: How to track dynamic assets

### Q8: Asset Key Collisions
**Question**: What if two levels use same key for different assets?
**Why it matters**: Unload/reload logic
**Answer needed**: Key uniqueness strategy

### Q9: Manifest Caching
**Question**: Should we cache manifests between levels or always recalculate?
**Why it matters**: Performance optimization
**Answer needed**: Caching strategy

### Q10: Manifest Validation
**Question**: Should we validate that all assets in manifest actually exist in ASSET_GROUPS?
**Why it matters**: Catches configuration errors early
**Answer needed**: Validation approach

---

### AssetLoadCoordinator Questions

### Q11: Coordinator Error Handling
**Question**: If one asset fails to load, do we continue loading others or abort immediately?
**Why it matters**: Affects error reporting and performance
**Answer needed**: Failure strategy

### Q12: Coordinator Retry Logic
**Question**: Should coordinator automatically retry failed assets before reporting failure?
**Why it matters**: Transient network errors
**Answer needed**: Retry strategy

### Q13: Coordinator Progress Granularity
**Question**: Is per-asset progress sufficient or do we need per-byte progress?
**Why it matters**: User experience on slow connections
**Answer needed**: Progress detail level

### Q14: Coordinator Cleanup on Failure
**Question**: If load fails, should coordinator unload partially loaded assets?
**Why it matters**: Memory management
**Answer needed**: Cleanup strategy

### Q15: Coordinator Cancellation
**Question**: Can user cancel loading? If so, how does coordinator handle it?
**Why it matters**: User control
**Answer needed**: Cancellation support

---

### Migration Questions

### Q16: Backward Compatibility
**Question**: Do existing levels work without changes after refactors?
**Why it matters**: Breaking changes require level updates
**Answer needed**: Compatibility guarantee

### Q17: Migration Path
**Question**: Can we migrate incrementally (one refactor at a time) or must do all at once?
**Why it matters**: Risk management
**Answer needed**: Migration strategy

### Q18: Rollback Plan
**Question**: If refactors cause issues, can we rollback easily?
**Why it matters**: Production stability
**Answer needed**: Rollback procedure

### Q19: Testing Strategy
**Question**: How do we test refactors without breaking existing functionality?
**Why it matters**: Confidence in changes
**Answer needed**: Testing approach

### Q20: Performance Impact
**Question**: Do refactors add overhead compared to current system?
**Why it matters**: User experience
**Answer needed**: Performance benchmarks

---

## LoadingScene Questions

### Q1: Scene Lifecycle
**Question**: When LoadingScene.init() stops GameScene/HudScene, are their states preserved?
**Why it matters**: Need to know if we can return to previous level with same state
**Answer needed**: Yes/No, and how state is preserved

### Q2: Loading UI Details
**Question**: What exactly does the loading UI show? Just progress bar? Level name? Background?
**Why it matters**: Need to know what graphics/text to create
**Answer needed**: Specific UI elements and positioning

### Q3: Progress Calculation
**Question**: How is progress calculated? Asset count? Byte size? Weighted?
**Why it matters**: Affects how we report progress percentage
**Answer needed**: Formula for progress calculation

### Q4: Error UI Interaction
**Question**: Can user press ESC to cancel error UI? What happens?
**Why it matters**: Need to handle all input during error state
**Answer needed**: All possible user actions during error

### Q5: Retry Behavior
**Question**: Does retry reload from scratch or resume from failure point?
**Why it matters**: Affects implementation complexity
**Answer needed**: Full reload or resume

### Q6: Return to Previous Level
**Question**: When returning to previous level, do we reload it or restore saved state?
**Why it matters**: Affects state management approach
**Answer needed**: Reload or restore

---

## Asset Loading Questions

### Q7: Asset Priority
**Question**: Should critical assets (player, UI) load first?
**Why it matters**: Could show partial level faster
**Answer needed**: Load order or all-at-once

### Q8: Parallel Loading
**Question**: Can we load multiple assets in parallel or must be sequential?
**Why it matters**: Performance optimization
**Answer needed**: Phaser's loader behavior

### Q9: Failed Asset Retry
**Question**: If one asset fails, do we retry just that asset or all assets?
**Why it matters**: Affects retry logic
**Answer needed**: Individual or batch retry

### Q10: Asset Cache
**Question**: Should we cache assets between levels or always reload?
**Why it matters**: Memory vs speed tradeoff
**Answer needed**: Caching strategy

### Q11: Timeout Duration
**Question**: Is 10 seconds the right timeout? Should it vary by asset count?
**Why it matters**: User experience on slow connections
**Answer needed**: Fixed or dynamic timeout

---

## Texture Verification Questions

### Q12: Verification Timing
**Question**: Do we verify immediately after 'complete' or wait for GPU upload?
**Why it matters**: Android timing issues
**Answer needed**: Immediate or delayed verification

### Q13: Verification Failure Recovery
**Question**: If verification fails, do we retry load or fail immediately?
**Why it matters**: Transient failures vs permanent failures
**Answer needed**: Retry logic for verification

### Q14: Partial Verification
**Question**: If 90% of textures verify, do we proceed or fail?
**Why it matters**: Graceful degradation vs strict validation
**Answer needed**: All-or-nothing or partial success

### Q15: Verification Performance
**Question**: Does verification add significant delay? Should we show "Verifying..." message?
**Why it matters**: User experience
**Answer needed**: Performance impact and UI feedback

---

## Runtime Tileset Questions

### Q16: Tileset Generation Timing
**Question**: Generate tilesets before or after unloading old assets?
**Why it matters**: Memory usage and timing
**Answer needed**: Order of operations

### Q17: Tileset Failure Handling
**Question**: If tileset generation fails, can we use fallback textures?
**Why it matters**: Graceful degradation
**Answer needed**: Fallback strategy

### Q18: Tileset Caching
**Question**: Should generated tilesets be cached between levels?
**Why it matters**: Performance vs memory
**Answer needed**: Cache or regenerate

### Q19: Tileset Dependencies
**Question**: How do we track that tileset depends on source texture?
**Why it matters**: Unloading order
**Answer needed**: Dependency registration

---

## Memory Management Questions

### Q20: Reference Counting Initialization
**Question**: When do we start tracking references? On load or on first use?
**Why it matters**: Affects initial ref counts
**Answer needed**: Tracking start point

### Q21: Reference Counting for Shared Assets
**Question**: If two levels use same texture, how do we handle ref counting?
**Why it matters**: Prevents premature unloading
**Answer needed**: Shared asset strategy

### Q22: Unload Timing
**Question**: When exactly do we unload old assets? Before or after new level starts?
**Why it matters**: Memory spike vs availability
**Answer needed**: Unload timing

### Q23: Dependency Cleanup Order
**Question**: Do we clean up animations before or after unloading textures?
**Why it matters**: Prevents errors
**Answer needed**: Cleanup order

### Q24: Memory Leak Detection Frequency
**Question**: Run leak detection on every transition or periodically?
**Why it matters**: Performance impact
**Answer needed**: Detection frequency

---

## State Management Questions

### Q25: WorldState During Transition
**Question**: Is WorldState accessible during LoadingScene?
**Why it matters**: Need to save/restore state
**Answer needed**: State availability

### Q26: Player Position Persistence
**Question**: How do we ensure player spawns at correct position after load?
**Why it matters**: Core functionality
**Answer needed**: Position passing mechanism

### Q27: Entity State Preservation
**Question**: Do we preserve entity states (health, ammo) across transitions?
**Why it matters**: Game continuity
**Answer needed**: What state persists

### Q28: Event State
**Question**: Do fired events persist across level transitions?
**Why it matters**: Prevents duplicate triggers
**Answer needed**: Event persistence

---

## Error Handling Questions

### Q29: Error Logging
**Question**: Where do errors get logged? Console only or also to file/server?
**Why it matters**: Debugging production issues
**Answer needed**: Logging strategy

### Q30: Error Recovery Limits
**Question**: How many retry attempts before giving up?
**Why it matters**: Prevents infinite loops
**Answer needed**: Retry limit

### Q31: Partial Failure Handling
**Question**: If tileset generation fails but assets loaded, do we proceed?
**Why it matters**: Graceful degradation
**Answer needed**: Failure tolerance

### Q32: Network Errors
**Question**: How do we handle network errors (404, timeout, CORS)?
**Why it matters**: Different error types need different handling
**Answer needed**: Error type handling

---

## Platform-Specific Questions

### Q33: Android GPU Upload Delay
**Question**: How long should we wait for GPU upload? 50ms? 100ms? Dynamic?
**Why it matters**: Balance between speed and reliability
**Answer needed**: Wait duration

### Q34: iOS Behavior
**Question**: Does iOS have same GPU upload timing issues as Android?
**Why it matters**: Platform-specific code
**Answer needed**: iOS testing results

### Q35: Web Browser Differences
**Question**: Do different browsers (Chrome, Firefox, Safari) behave differently?
**Why it matters**: Cross-browser compatibility
**Answer needed**: Browser testing results

### Q36: Mobile Memory Limits
**Question**: What's the memory limit on mobile? Should we unload more aggressively?
**Why it matters**: Prevents crashes
**Answer needed**: Memory constraints

---

## Integration Questions

### Q37: LevelExitComponent Changes
**Question**: Does LevelExitComponent need to change beyond calling LoadingScene?
**Why it matters**: Minimal changes preferred
**Answer needed**: Required changes

### Q38: GameScene Initialization
**Question**: How does GameScene.init() change to receive data from LoadingScene?
**Why it matters**: Data passing mechanism
**Answer needed**: Init signature changes

### Q39: HudScene Coordination
**Question**: How does HudScene know when to show/hide during transitions?
**Why it matters**: UI consistency
**Answer needed**: HudScene lifecycle

### Q40: AssetManager Integration
**Question**: Does existing AssetManager need changes or just additions?
**Why it matters**: Breaking changes vs extensions
**Answer needed**: Required modifications

---

## Edge Cases

### Q41: Rapid Level Transitions
**Question**: What happens if user triggers another transition while loading?
**Why it matters**: Race conditions
**Answer needed**: Transition queuing or blocking

### Q42: Same Level Reload
**Question**: What happens if targetLevel === previousLevel?
**Why it matters**: Optimization opportunity
**Answer needed**: Reload or skip

### Q43: Missing Level Data
**Question**: What if level JSON doesn't exist or is malformed?
**Why it matters**: Error handling
**Answer needed**: Validation and fallback

### Q44: Empty Level
**Question**: What if level has no entities or assets?
**Why it matters**: Edge case handling
**Answer needed**: Minimum level requirements

### Q45: Texture Key Collisions
**Question**: What if two levels use same key for different textures?
**Why it matters**: Asset management
**Answer needed**: Key uniqueness strategy

---

## Performance Questions

### Q46: Loading Screen Duration
**Question**: Minimum time to show loading screen? (Prevent flicker)
**Why it matters**: User experience
**Answer needed**: Minimum display time

### Q47: Asset Preloading
**Question**: Should we preload next level in background during gameplay?
**Why it matters**: Faster transitions
**Answer needed**: Preloading strategy

### Q48: Memory Usage Monitoring
**Question**: Should we track and display memory usage?
**Why it matters**: Debugging and optimization
**Answer needed**: Monitoring approach

### Q49: Texture Compression
**Question**: Should we use compressed textures on mobile?
**Why it matters**: Memory and performance
**Answer needed**: Compression strategy

### Q50: Batch Size Limits
**Question**: Is there a limit to how many assets we can load at once?
**Why it matters**: Phaser loader limits
**Answer needed**: Batch size constraints

---

## Testing Questions

### Q51: Test Levels
**Question**: Do we need special test levels for loading system?
**Why it matters**: Comprehensive testing
**Answer needed**: Test level requirements

### Q52: Failure Simulation
**Question**: How do we simulate asset load failures for testing?
**Why it matters**: Error path testing
**Answer needed**: Failure injection method

### Q53: Performance Benchmarks
**Question**: What are acceptable load times? (1s? 5s? 10s?)
**Why it matters**: Performance targets
**Answer needed**: Load time targets

### Q54: Memory Leak Testing
**Question**: How do we test for memory leaks? Repeated transitions?
**Why it matters**: Reliability
**Answer needed**: Leak testing strategy

### Q55: Platform Testing
**Question**: Must we test on real devices or are emulators sufficient?
**Why it matters**: Testing resources
**Answer needed**: Testing requirements

---

## Summary

**Total Questions**: 55

**Critical (must answer before implementation)**: Q1, Q5, Q6, Q12, Q16, Q22, Q23, Q37, Q38, Q41
**Important (affects design)**: Q2, Q7, Q11, Q20, Q21, Q33, Q46
**Nice to know (can decide during implementation)**: All others

**Next Steps**:
1. Get answers to critical questions
2. Update requirements/design based on answers
3. Proceed with task breakdown
