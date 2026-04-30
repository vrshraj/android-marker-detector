# System Architecture - MarkerDetector

## System Overview
MarkerDetector is a high-performance Android application designed for real-time identification of custom marker patterns. The system follows a "Native Core, Hybrid UI" architecture, using **React Native** for the application lifecycle and **Kotlin/OpenCV** for the heavy-duty computer vision pipeline.

By executing the detection logic within a native **VisionCamera Frame Processor Plugin**, the app avoids the latency associated with the JavaScript bridge, achieving near-real-time performance even on mid-range hardware.

## Key Architectural Decisions

| Component | Choice | Rationale |
|---|---|---|
| **Core Engine** | Kotlin + OpenCV Android SDK | Direct memory access to camera frames and mature CV primitives for low-latency detection. |
| **Marker Design** | Asymmetric Pattern (Solid/Dashed) | Encodes orientation into the border style, allowing for deterministic pose recovery and fast rejection of noise. |
| **Camera Integration** | VisionCamera v4 | Provides a high-performance worklet-based plugin model for native frame processing. |
| **UI State** | React Native (Zustand-like pattern) | Keeps the UI declarative and decoupled from the high-frequency detection loop. |
| **Deduplication** | Manual Capture + Cooldown | Shifts the final "save" decision to the user while preventing rapid-fire duplicate captures in the background. |

## Detection Pipeline Logic

The pipeline is staged to maximize early rejection, ensuring CPU cycles are only spent on valid candidates:

1.  **Adaptive Thresholding**: Converts frames to binary (black/white) to isolate strong border structures across varying lighting conditions.
2.  **Geometric Filtering**: Extracts external contours and filters them based on area, aspect ratio, and quadrilateral approximation (4-side check).
3.  **Pattern Signature Validation**: Analyzes the density and variance of border segments to ensure they match the specific "2-Dashed, 2-Solid" signature of the Alemeno marker.
4.  **Perspective Correction**: Computes a homography matrix to warp the candidate quadrilateral into a canonical 300x300 pixel patch.
5.  **Orientation Correction**: Detects the anchor corner and rotates the final patch to a standardized upright position before returning it to the UI.

## Performance Strategy

To maintain a responsive UI and consistent frame rates:
*   **Multi-Resolution Processing**: Detection runs on a downsampled frame (0.25x scale) for speed. Once a valid marker is found, its corners are projected back to full resolution for the final high-quality warp.
*   **Frame Skipping**: The engine processes every 2nd frame to reduce battery drain and thermal throttling without affecting the perceived responsiveness of the scanner.
*   **Native Memory Management**: OpenCV `Mat` objects are released immediately after use to prevent memory leaks and GC pressure.

## Repository Hygiene

This repository is optimized for professional review:
*   **Clean Root**: All temporary debug artifacts, screenshots, and logs are excluded.
*   **Structured Source**: Clear separation between `android` (native) and `src` (hybrid) components.
*   **Type Safety**: Full TypeScript coverage for the React Native layer.
*   **Self-Documenting Code**: Core detection logic is documented with Javadoc-style comments explaining the CV methodology.

---
© 2026 MarkerDetector Team
