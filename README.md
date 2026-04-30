# MarkerDetector

MarkerDetector is an Android-focused React Native application that performs real-time marker detection from camera frames using a native Kotlin + OpenCV processing pipeline.

**Platform:** Android only (as per assignment requirements).  
iOS is not supported.

## Overview

The app streams camera frames through VisionCamera frame processors, runs native image processing in Kotlin/OpenCV, and returns structured detection results to the React Native UI layer.

Primary goals:
- Low-latency marker detection on Android devices
- Clear separation between UI (React Native) and CV pipeline (Kotlin/OpenCV)
- Deterministic, evaluator-friendly architecture and repository hygiene

## Tech Stack

- React Native 0.76.7
- React 18.3.1
- TypeScript
- VisionCamera v4 (`react-native-vision-camera`)
- Worklet runtime (`react-native-worklets-core`)
- Kotlin (Android)
- OpenCV Android SDK

## Latest Improvements

The following refinements were implemented to ensure production-grade reliability:

- **Sharpness Filter:** Added a Laplacian variance-based sharpness gate to reject blurry frames automatically.
- **Precision Cropping:** Corners are now inset by 15% toward the centroid before warping, effectively removing all black/dashed border fragments from the final output.
- **Relaxed Detection Thresholds:** Optimized area and aspect ratio constraints to allow robust detection under variable lighting and extreme camera angles.
- **Lifecycle Stability:** Resolved `FrameInvalidError` and memory leaks by optimizing the interaction between VisionCamera's frame lifecycle and OpenCV's memory management.

## Architecture Summary

High-level data flow:

1. Camera frames are captured in VisionCamera (Android).
2. A frame processor worklet invokes the native plugin (`markerDetector`).
3. Kotlin plugin processes frames with OpenCV.
4. Detection output is surfaced back to the app state/UI.

Key architectural points:
- React Native handles permission flow, preview, and rendering.
- Native Kotlin plugin handles heavy per-frame CV operations.
- OpenCV provides image conversion, contour, and geometric ops.
- JS bridge-heavy processing is avoided for performance.

## Setup

Prerequisites:
- Node.js 18+
- Android Studio with Android SDK
- JDK 17
- ADB available in PATH
- Physical Android device (recommended) or emulator

Install:

```bash
npm install
```

Start Metro:

```bash
npx react-native start --reset-cache
```

Build and run on Android:

```bash
npx react-native run-android
```

Optional clean rebuild:

```powershell
cd android
.\gradlew.bat clean
cd ..
npx react-native run-android
```

## Run On Android Device (Wireless ADB)

1. Pair phone once from Developer Options -> Wireless debugging.
2. Discover endpoint from your machine:

```powershell
adb mdns services
```

3. Connect to the current endpoint:

```powershell
adb connect <ip:port>
adb devices -l
```

4. Reverse Metro port for device -> host JS bundle access:

```powershell
adb -s <serial> reverse tcp:8081 tcp:8081
```

5. Launch app if needed:

```powershell
adb -s <serial> shell monkey -p com.markerdetector -c android.intent.category.LAUNCHER 1
```

Notes:
- Wireless ADB endpoints can change after reconnect/reboot.
- If the device goes offline, reconnect using the new `adb mdns services` endpoint.

## Known Limitations

- Some devices expose high-resolution preview formats, but frame processor input may still run effectively at 1080p (for example, `1920x1080`) due to camera pipeline/device constraints.
- Throughput and thermal behavior vary by chipset and camera HAL implementation.
- Wireless ADB can intermittently disconnect and may need reconnect + port reverse reapply.

## Project Structure

- `App.tsx`: App entry, camera lifecycle, frame processor attachment
- `src/hooks/useMarkerDetectorFrameProcessor.ts`: Frame processor hook and plugin invocation
- `src/components/CameraView.tsx`: Camera wrapper component
- `src/screens/DetectionScreen.tsx`: UI state/render flow for detection UX
- `android/app/src/main/java/com/markerdetector/MarkerDetectorFrameProcessorPlugin.kt`: Native Kotlin frame processor plugin
- `android/opencv/`: OpenCV Android module integration
- `ARCHITECTURE.md`: Architecture decisions and rationale

## Troubleshooting

Metro port conflict (`EADDRINUSE: 8081`):
- Stop previous Metro process, then restart once.

`Failed to connect to localhost/127.0.0.1:8081` in logcat:
- Reconnect device over ADB.
- Re-apply reverse mapping (`adb reverse tcp:8081 tcp:8081`).
- Relaunch app.

Frame processor plugin not called:
- Confirm frame processor hook is attached in `App.tsx`.
- Confirm plugin registration in Android application startup.

## Submission Notes

- Repository is intentionally Android-only per assignment scope.
- Temporary debug artifacts and generated files are excluded via `.gitignore`.
- Project prioritizes a clean, reproducible build path for evaluator review.
