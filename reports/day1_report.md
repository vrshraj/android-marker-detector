# Day 1 Report — MarkerDetector

Date: 2026-04-26

Summary
- Goal: Define Day 1 architecture and scaffold the app to prepare for Day 2 algorithm work. See the plan in [ARCHITECTURE.md](ARCHITECTURE.md#L1).

Completed (what was implemented on Day 1)
- VisionCamera integration and frame-processor plumbing (JS + native registration).
  - Frame processor hook: [src/hooks/useMarkerDetectorFrameProcessor.ts](src/hooks/useMarkerDetectorFrameProcessor.ts#L1)
  - Native plugin registration: [android/app/src/main/java/com/markerdetector/MainApplication.kt](android/app/src/main/java/com/markerdetector/MainApplication.kt#L1)
  - Frame processor plugin stub: [android/app/src/main/java/com/markerdetector/MarkerDetectorFrameProcessorPlugin.kt](android/app/src/main/java/com/markerdetector/MarkerDetectorFrameProcessorPlugin.kt#L1)
- Thin React Native UI and UX scaffolding for detection preview and results.
  - Camera view and permission flow: [src/components/CameraView.tsx](src/components/CameraView.tsx#L1)
  - Detection screen + history: [src/screens/DetectionScreen.tsx](src/screens/DetectionScreen.tsx#L1)
  - Detection overlay: [src/components/MarkerOverlay.tsx](src/components/MarkerOverlay.tsx#L1)
- Camera format selection + environment logging implemented to pick a high-res format: [App.tsx](App.tsx#L1)
- JS↔native data flow validated end-to-end (frameProcessor -> native plugin -> JS result publish), with stubbed detection result visible in the app overlay.

Partially completed
- Native plugin scaffold exists and logs frame sizes, but the OpenCV-based detection pipeline is not implemented yet. The plugin currently returns a stubbed result (detected: false).
- Basic duplicate suppression for scanned codes exists in JS UI (prevents immediate duplicate display in `DetectionScreen`), but the planned native 1.5s cooldown deduplication is not implemented.

Not started / Outstanding (high priority for Day 2)
- Implement CV pipeline in Kotlin + OpenCV: Grayscale → Threshold → Contours → Pattern Validation → Homography → Orientation fix (see planned pipeline in [ARCHITECTURE.md](ARCHITECTURE.md#L1)).
- Deduplication: add deterministic 1.5s cooldown (native or coordinated native+JS) to avoid repeated triggers.
- Resolution strategy: run detection on a downscaled frame and perform final warpPerspective on full-res mapped corners.
- False-positive rejection gates (border continuity, dash periodicity, semantic checks for Marker 2).
- Performance measurement and validation vs. 3000 ms latency target and device profiling toggles.

Low-priority / Nice-to-have
- Per-device profiling toggles and adaptive threshold fallback for harsh lighting.
- Export confidence and rejection reasons in the frame-processor result payload for UI debugging.

Recommendations / Next actions
1. Implement core OpenCV steps inside `MarkerDetectorFrameProcessorPlugin.callback` (start with grayscale + adaptive threshold + contour finding). Put a small unit test harness or debug flag to verify candidate contours before adding full validation.
2. Add the homography/warpPerspective step and return normalized patch corners to JS for a quick visual validation step in `App.tsx` overlay.
3. Implement the 1.5s cooldown in native plugin (or return timestamped detections so JS can enforce cooldown reliably). Measure detection-to-result latency and log per-stage durations.
4. Add simple automated smoke tests (unit/integration) for the native pipeline if feasible.

Conclusion
Day 1 successfully established the architecture, RN UI, and native frame-processor plumbing. The highest-value remaining work is implementing the OpenCV-based detection pipeline and deduplication, which are required to meet the Day 1 functional goals (actual marker detection and reliable false-positive rejection).

Files changed/created
- Created: `reports/day1_report.md`

If you want, I can now:
- Implement the initial OpenCV grayscale+threshold+contour steps in the Kotlin plugin as a next patch.
- Or produce a shorter executive summary formatted for sharing.

