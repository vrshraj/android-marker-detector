# Architecture Decision Record - MarkerDetector (Day 1)

## System Overview
MarkerDetector is an Android-first mobile vision system built with a thin React Native UI layer and a native Kotlin/OpenCV processing core. The camera stream is captured through VisionCamera v3 and delivered directly to a native frame processor plugin, where detection runs without crossing the JS bridge. The current architecture prioritizes deterministic detection behavior, low overhead under repeated frame callbacks, and a clear path to production hardening (faster rejection, better confidence scoring, and frame-rate-aware scheduling).

## Decisions Summary

| Area | Chosen Option | Alternatives Considered | Why This Choice Won |
|---|---|---|---|
| Marker design | Marker 2: L-shape, solid left+bottom, dashed top+right, 160x160 | QR/ArUco style markers, fully solid frame, random custom glyphs | Fast geometric validation, orientation cues built into border style, easy to reject impostors |
| Processing location | Kotlin + OpenCV Android SDK | JavaScript-only image processing, server-side processing | Native performance, low latency, direct frame access, no JS bridge overhead |
| Camera stack | VisionCamera v3 + native frame processor plugin | CameraX via custom RN module, VisionCamera v4, JS camera libs | Stable plugin model for custom Kotlin processing, proven RN integration |
| UI role | React Native UI only (state/rendering) | JS-heavy processing pipeline | Keeps UI responsive and isolates compute-heavy logic in native layer |
| Deduplication | 1.5 second cooldown | Perceptual hash, feature-vector dedupe | Simpler, deterministic, cheaper CPU cost, sufficient for Day 1 |
| Resolution strategy | Downscale for detection; rescale corners to full-res before warpPerspective | Full-res detection on every frame | Large speedup with negligible geometry loss when corner mapping is done correctly |

## Decision 1: Marker Specification
### Chosen
Marker 2 with asymmetric border semantics:
- Solid border on left and bottom
- Dashed border on top and right
- Canonical template size: 160x160

### Alternatives
- Generic square markers with uniform borders
- Off-the-shelf marker systems (e.g., ArUco/AprilTag)
- Symbol-heavy custom marker

### Why
This marker encodes orientation in the border pattern, reducing ambiguity during pose/orientation recovery. The mixed solid/dashed edges give strong, testable constraints for false-positive rejection while keeping implementation simple enough for mobile real-time processing.

## Decision 2: Processing in Kotlin + OpenCV
### Chosen
All frame analysis is done in Kotlin using OpenCV Android SDK modules (core, imgproc, Mat APIs).

### Alternatives
- JavaScript image processing in React Native
- Hybrid JS + native split for core operations
- Cloud/off-device processing

### Why
Native processing avoids JS bridge overhead, gives direct access to camera frame memory models, and provides mature computer-vision primitives. This is the most reliable path to stable throughput and predictable latency on mid-range Android devices.

## Decision 3: Camera and Frame Processor Integration
### Chosen
react-native-vision-camera v3 with native Frame Processor Plugin registration.

### Alternatives
- VisionCamera v4+
- Custom CameraX bridge module
- JS-only camera feed handling

### Why
v3 provides a stable plugin interface for Kotlin-native frame processing in this project context. The plugin callback model is straightforward for Day 1 and scales naturally to OpenCV-heavy logic on Day 2.

## Decision 4: Thin React Native UI Layer
### Chosen
React Native is used only for:
- Permission flow
- Camera preview rendering
- Displaying detection state/result

### Alternatives
- JS-side frame processing and decision logic
- Mixed processing where native does preprocessing and JS does validation

### Why
A thin UI layer minimizes app-layer jitter and decouples rendering from CV compute. This separation keeps the architecture clean: UI is declarative; detection is deterministic and native.

## Decision 5: Deduplication Strategy
### Chosen
A fixed 1.5 second cooldown after a successful detection event.

### Alternatives
- Perceptual hashing of warped marker patches
- Tracking-based deduplication across frame history
- Feature descriptor matching

### Why
Cooldown is deterministic, easy to reason about, and almost free computationally. For internship scope, it solves repeated-trigger spam without introducing tuning complexity or extra memory/CPU costs.

## Decision 6: Multi-Resolution Strategy
### Chosen
Run detection on a downscaled frame; once corners are found, map corners back to the original frame and run warpPerspective at full resolution.

### Alternatives
- Full-resolution detection and warp on every frame
- Downscale both detection and final extraction

### Why
Contour and validation stages dominate compute. Running them on a reduced image cuts cost significantly. Rescaling corners before homography preserves output quality where it matters (the final normalized marker patch).

## Detection Pipeline (Planned Day 2 Runtime Path)
The detection pipeline is intentionally staged to maximize cheap rejection before expensive transforms.

1. **Grayscale**
Convert incoming frame to grayscale to reduce channel complexity.

2. **Threshold**
Apply adaptive or Otsu-style binarization to isolate strong border structure under variable lighting.

3. **Contour**
Extract candidate contours and keep quadrilateral-like candidates by area and polygon approximation.

4. **Pattern Validation**
Validate candidate border semantics against Marker 2 rules (solid-left/bottom and dashed-top/right expectations).

5. **Homography**
Compute perspective transform from candidate corners to canonical marker coordinates.

6. **Orientation Fix**
Resolve canonical orientation using border-type consistency, then output ordered corners and normalized patch.

### Pipeline Sketch
```text
Frame -> Gray -> Threshold -> Contours -> Quad Candidates
      -> Marker Pattern Checks -> Homography -> Orientation Fix -> Detection Result
```

## Performance Strategy and 3000 ms Target
### Target Definition
Detection-to-result latency must remain below 3000 ms in typical conditions.

### Budget Strategy
- Frame ingestion and conversion: low single-digit ms
- Detection pass on downscaled frame: dominant cost, bounded by reduced pixel count
- Pattern validation and corner ordering: low cost per candidate
- Homography and warpPerspective: paid only for validated candidates
- UI state update: lightweight

### Why This Meets Target
- Early rejection reduces candidate count before expensive operations.
- Downscaled detection keeps per-frame cost bounded.
- Native execution removes JS bridge processing overhead.
- Cooldown prevents repeated heavy post-detection work on near-identical consecutive frames.

### Operational Notes
- If CPU load spikes, detection frequency can be throttled without changing architecture.
- Frame processor logging is already rate-limited to avoid log-induced overhead.

## False-Positive Rejection (4 Incorrect Marker Cases)
The validator rejects four known incorrect image classes using deterministic checks in the pattern-validation stage.

### Rejection Rules
1. **Incorrect Image A: all borders solid**
Rejected because top/right must be dashed. Dash-segment count on top/right fails threshold.

2. **Incorrect Image B: all borders dashed**
Rejected because left/bottom must be solid. Continuity metric on left/bottom fails.

3. **Incorrect Image C: solid/dashed sides swapped**
Rejected because expected side semantics are orientation-aware:
- left and bottom must be solid
- top and right must be dashed
If the side mapping is inverted, orientation fix cannot satisfy constraints and candidate is dropped.

4. **Incorrect Image D: quadrilateral-like noise or wrong internal shape**
Rejected by combined gates:
- border thickness/continuity consistency check fails
- dash periodicity check fails
- optional aspect/area sanity window fails

### Practical Effect
Only candidates matching the full border-signature contract survive to homography. This keeps false positives low and protects downstream warp/decode steps from noisy inputs.

## Data Flow and Responsibility Boundaries
```text
React Native UI (preview + state)
    -> VisionCamera v3 Frame Processor callback
        -> Kotlin plugin (OpenCV pipeline)
            -> Structured result { detected, corners, ... }
                -> React state update for rendering
```

## Day 2 Extension Points
No architectural restructuring is required to continue:
- Insert Mat conversion and preprocessing inside the existing plugin callback
- Add confidence score and rejection reasons in result payload
- Add adaptive threshold fallback mode for harsh lighting
- Add per-device profiling toggles for detection scale and cadence

## Risks and Mitigations
- **Risk:** Device-specific camera format constraints below target resolution
  - **Mitigation:** Format enumeration + explicit fallback to max available, recorded in logs/UI.
- **Risk:** Lighting variability increases contour noise
  - **Mitigation:** Adaptive thresholding and stricter border-signature validation gates.
- **Risk:** CPU pressure on low-end devices
  - **Mitigation:** Downscaled detection, candidate pruning, and optional frame-rate throttling.

## Conclusion
Day 1 architecture favors deterministic native processing, clear separation of concerns, and measurable runtime behavior. The chosen stack (VisionCamera v3 + Kotlin/OpenCV plugin + thin RN UI) is deliberately practical for marker detection on Android and is ready for Day 2 algorithm implementation without structural changes.
