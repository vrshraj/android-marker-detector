package com.markerdetector

import android.util.Log
import org.opencv.android.OpenCVLoader
import org.opencv.core.Core

object OpenCvBootstrap {
  private const val TAG = "OpenCV"

  fun logOpenCvStatus() {
    try {
      val loaded = OpenCVLoader.initDebug()
      if (loaded) {
        Log.i(TAG, "OpenCV loaded successfully. Version=${Core.VERSION}")
      } else {
        Log.e(TAG, "OpenCV initDebug() returned false")
      }
    } catch (t: Throwable) {
      Log.e(TAG, "OpenCV initialization failed", t)
    }
  }
}
