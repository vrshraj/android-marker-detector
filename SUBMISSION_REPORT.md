Subject: Project Submission: MarkerDetector Android Application

Hi Team,

I'm happy to share the final version of the MarkerDetector application. I've spent the last few sessions stabilizing the core pipeline and refining the computer vision logic to ensure it’s reliable for real-world use.

Here’s a summary of what’s been accomplished:

### Core Stability & Bug Fixes
Initially, I ran into some critical initialization issues where the app was crashing due to a missing grayscale conversion step in the OpenCV pipeline. I’ve fixed that and also resolved the "FrameInvalidError" that was happening during camera stream processing. I discovered that the VisionCamera framework handles its own image buffer lifecycle, so I optimized the Kotlin plugin to respect that, which completely stopped the crashes and memory leaks (maxImages errors).

### Computer Vision Improvements
To make the detection feel more "pro," I implemented two specific features:
- **Sharpness Gate:** I added a Laplacian-based sharpness check. This prevents the app from saving blurry frames, which was a bit of an issue in earlier tests. Now, if a frame isn't clear enough, the app simply waits for a better one.
- **Clean Border Cropping:** I noticed the captured images often had fragments of the marker's black/dashed border. I’ve updated the warping logic to inset the corners by 15% towards the center, which gives a nice, clean extraction of just the animal illustration without any "edge noise."

### Technical Details
- **Thresholding:** I’ve loosened the area and aspect ratio constraints. The app is now much better at detecting markers even when the camera is at a sharp angle or in dim lighting.
- **Performance:** Heavy processing stays in the native Kotlin layer using OpenCV, while the React Native side handles the UI and permissions, keeping the frame rate smooth.

### Deliverables
- **GitHub Repository:** [https://github.com/vrshraj/android-marker-detector](https://github.com/vrshraj/android-marker-detector)
- **Built APK:** You can find the latest build in the project at: `android/app/build/outputs/apk/debug/Marker Detector.apk`

The project is now clean, documented, and ready for review. Please let me know if you have any questions or need a walkthrough of the code!

Best regards,
Varsh Raj
