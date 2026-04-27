package com.markerdetector

import android.graphics.BitmapFactory
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

@RunWith(AndroidJUnit4::class)
class MarkerDetectorPipelineInstrumentedTest {

  @Before
  fun setupOpenCv() {
    val ok = OpenCVLoader.initLocal()
    if (!ok) {
      fail("OpenCV initLocal() failed on device/emulator")
    }
  }

  @Test
  fun testImage1Correct_detected() {
    assertTrue(runDetectionPipeline(loadAssetImage("Marker2-TestImage1-Correct.jpg")))
  }

  @Test
  fun testImage2Correct_detected() {
    assertTrue(runDetectionPipeline(loadAssetImage("Marker2-TestImage2-Correct.jpg")))
  }

  @Test
  fun testImage3Correct_detected() {
    assertTrue(runDetectionPipeline(loadAssetImage("Marker2-TestImage3-Correct.jpg")))
  }

  @Test
  fun testImage4Incorrect_notDetected() {
    assertFalse(runDetectionPipeline(loadAssetImage("Marker2-TestImage4-Incorrect.jpg")))
  }

  @Test
  fun testImage5Incorrect_notDetected() {
    assertFalse(runDetectionPipeline(loadAssetImage("Marker2-TestImage5-Incorrect.jpg")))
  }

  @Test
  fun testImage6Incorrect_notDetected() {
    assertFalse(runDetectionPipeline(loadAssetImage("Marker2-TestImage6-Incorrect.jpg")))
  }

  @Test
  fun testImage7Incorrect_notDetected() {
    assertFalse(runDetectionPipeline(loadAssetImage("Marker2-TestImage7-Incorrect.jpg")))
  }

  private fun loadAssetImage(fileName: String): Mat {
    val context = InstrumentationRegistry.getInstrumentation().context
    try {
      context.assets.open(fileName).use { stream ->
        val bitmap = BitmapFactory.decodeStream(stream)
          ?: throw IllegalStateException("Failed to decode bitmap: $fileName")

        val rgba = Mat(bitmap.height, bitmap.width, CvType.CV_8UC4)
        Utils.bitmapToMat(bitmap, rgba)

        val rgb = Mat()
        Imgproc.cvtColor(rgba, rgb, Imgproc.COLOR_RGBA2RGB)
        rgba.release()
        return rgb
      }
    } catch (e: Exception) {
      throw IllegalStateException(
        "Missing/invalid test asset '$fileName'. Place it under src/androidTest/assets/ with exact name.",
        e,
      )
    }
  }

  private fun runDetectionPipeline(fullResRgb: Mat): Boolean {
    val downMat = Mat()
    val grayMat = Mat()
    val threshMat = Mat()
    val hierarchy = Mat()

    return try {
      // 1) Downscale to 25%
      val downW = (fullResRgb.cols() * 0.25).toInt().coerceAtLeast(1)
      val downH = (fullResRgb.rows() * 0.25).toInt().coerceAtLeast(1)
      Imgproc.resize(fullResRgb, downMat, Size(downW.toDouble(), downH.toDouble()), 0.0, 0.0, Imgproc.INTER_AREA)

      // 2) Grayscale + adaptive threshold
      Imgproc.cvtColor(downMat, grayMat, Imgproc.COLOR_RGB2GRAY)
      Imgproc.adaptiveThreshold(
        grayMat,
        threshMat,
        255.0,
        Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C,
        Imgproc.THRESH_BINARY_INV,
        51,
        10.0,
      )

      // 3) Contours
      val contours = mutableListOf<MatOfPoint>()
      Imgproc.findContours(threshMat, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

      for (contour in contours) {
        // Area filter: keep in sync with Day 2 threshold
        val area = Imgproc.contourArea(contour)
        if (area < 800.0 || area > 80000.0) {
          continue
        }

        val c2f = MatOfPoint2f(*contour.toArray())
        val peri = Imgproc.arcLength(c2f, true)
        val approx = MatOfPoint2f()
        Imgproc.approxPolyDP(c2f, approx, 0.04 * peri, true)

        if (approx.total().toInt() != 4) {
          c2f.release()
          approx.release()
          continue
        }

        val approxPoints = approx.toArray()
        val approxMat = MatOfPoint(*approxPoints)

        val rect = Imgproc.boundingRect(approxMat)
        val ratio = rect.width.toDouble() / rect.height.toDouble()
        if (ratio < 0.75 || ratio > 1.33) {
          approxMat.release()
          c2f.release()
          approx.release()
          continue
        }

        if (!Imgproc.isContourConvex(approxMat)) {
          approxMat.release()
          c2f.release()
          approx.release()
          continue
        }

        // 4) Pattern validation (thresholded image + approx contour)
        val isMarker = PatternValidator.validateMarker2Pattern(threshMat, approx, false)

        approxMat.release()
        c2f.release()
        approx.release()

        if (isMarker) {
          return true
        }
      }

      false
    } finally {
      try { downMat.release() } catch (_: Throwable) {}
      try { grayMat.release() } catch (_: Throwable) {}
      try { threshMat.release() } catch (_: Throwable) {}
      try { hierarchy.release() } catch (_: Throwable) {}
      try { fullResRgb.release() } catch (_: Throwable) {}
    }
  }
}
