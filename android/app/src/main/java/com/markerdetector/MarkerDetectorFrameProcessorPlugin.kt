package com.markerdetector

import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy

class MarkerDetectorFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {

  private var frameCount = 0

  override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
    frameCount++
    if (frameCount % 30 == 0) {
      android.util.Log.d("MarkerDetector", 
        "Frame received: ${frame.width}x${frame.height}")
    }
    // Stub result — OpenCV pipeline goes here Day 2
    return mapOf("detected" to false, "corners" to null)
  }
}
