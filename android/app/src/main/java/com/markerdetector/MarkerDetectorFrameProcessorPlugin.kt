package com.markerdetector

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.imgproc.Imgproc
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicLong

class MarkerDetectorFrameProcessorPlugin(
  proxy: VisionCameraProxy,
  options: Map<String, Any>?
) : FrameProcessorPlugin() {

  companion object {
    private const val TAG = "MarkerDetector"
    private const val COOLDOWN_MS = 120L
    private const val OUTPUT_SIZE = 300
    private var opencvLoaded = false

    // --- TUNING CONSTANTS ---
    // REAL DATA from logs:
    //   Keyboard keys: area 3000–6000  → blocked by MIN_AREA gate
    //   Markers on laptop screen: area 20000–70000 → pass
    //   Animal photos (whole screen): area 50000–200000 → blocked by border pattern check
    private const val MIN_AREA_DOWN = 8000.0    // lowered: catch smaller/further markers
    private const val MAX_AREA_DOWN = 300000.0   // raised: catch large close-up markers
    private const val MAX_ASPECT = 1.45f          // relaxed: allow slightly non-square views

    // Border pattern thresholds (relaxed for real-world lighting)
    // Real marker: 2 solid sides + 2 dashed sides
    private const val SOLID_DENSITY = 0.45        // lowered from 0.55
    private const val DASH_MEAN_MIN = 0.08        // lowered from 0.15
    private const val DASH_MEAN_MAX = 0.92        // raised from 0.85

    // Adaptive threshold tuning
    private const val BLOCK_SIZE = 31
    private const val THRESH_C = 6.0              // lowered from 8.0: less aggressive thresholding
  }

  private val lastCaptureTime = AtomicLong(0L)
  private var lastCapturedHash: Long = 0L
  private val hashLock = Any()
  private var frameCount = 0

  override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
    if (!ensureOpenCV()) return noDetection()

    frameCount++
    if (frameCount % 2 != 0) return noDetection()

    var fullMat: Mat? = null
    var downMat: Mat? = null
    var gray: Mat? = null
    var thresh: Mat? = null
    var closedThresh: Mat? = null
    var hierarchy: Mat? = null
    val contours = mutableListOf<MatOfPoint>()

    try {
      fullMat = frameToMat(frame) ?: return noDetection()

      val scale = 0.25
      downMat = Mat()
      Imgproc.resize(fullMat, downMat, Size(), scale, scale, Imgproc.INTER_AREA)

      gray = Mat()
      Imgproc.cvtColor(downMat, gray, Imgproc.COLOR_RGBA2GRAY)
      thresh = Mat()
      Imgproc.adaptiveThreshold(
        gray, thresh, 255.0,
        Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C,
        Imgproc.THRESH_BINARY_INV,
        BLOCK_SIZE, THRESH_C
      )

      closedThresh = Mat()
      val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(5.0, 5.0))
      Imgproc.morphologyEx(thresh, closedThresh, Imgproc.MORPH_CLOSE, kernel)
      kernel.release()

      hierarchy = Mat()
      Imgproc.findContours(closedThresh, contours, hierarchy, Imgproc.RETR_LIST, Imgproc.CHAIN_APPROX_SIMPLE)

      var result: Map<String, Any>? = null
      var maxAreaFound = 0.0
      var closestPatternMatch = ""

      for (contour in contours) {
        val area = Imgproc.contourArea(contour)
        if (area > maxAreaFound) maxAreaFound = area
        if (area < 2000.0 || area > 300000.0) continue

        val c2f = MatOfPoint2f(*contour.toArray())
        val peri = Imgproc.arcLength(c2f, true)
        val approx = MatOfPoint2f()
        Imgproc.approxPolyDP(c2f, approx, 0.02 * peri, true)

        if (approx.total() != 4L) {
          c2f.release(); approx.release(); continue
        }

        val pts = approx.toArray()
        val sides = listOf(
          dist(pts[0], pts[1]), dist(pts[1], pts[2]),
          dist(pts[2], pts[3]), dist(pts[3], pts[0])
        )
        val avgSide = sides.average()
        if (sides.any { Math.abs(it - avgSide) / avgSide > 0.45 }) {
          c2f.release(); approx.release(); continue
        }

        val minRect = Imgproc.minAreaRect(c2f)
        val minAspect = if (minRect.size.height > 0) (minRect.size.width / minRect.size.height).toFloat() else 0f
        val normalizedAspect = if (minAspect < 1f) 1f / minAspect else minAspect
        if (normalizedAspect > 2.0f) {
          c2f.release(); approx.release(); continue
        }

        val sortedDown = sortCorners(pts)

        if (!validatePattern(thresh, sortedDown)) {
          closestPatternMatch = "Failed validatePattern"
          c2f.release(); approx.release(); continue
        }

        val now = System.currentTimeMillis()
        if (now - lastCaptureTime.get() < COOLDOWN_MS) {
          c2f.release(); approx.release(); continue
        }

        val fullCorners = sortedDown.map { Point(it.x / scale, it.y / scale) }.toTypedArray()
        
        // --- CROP BORDER ---
        // Move corners 15% towards the center to crop out the black boundary
        val centerX = fullCorners.map { it.x }.average()
        val centerY = fullCorners.map { it.y }.average()
        val insetCorners = fullCorners.map { p ->
          Point(p.x + (centerX - p.x) * 0.15, p.y + (centerY - p.y) * 0.15)
        }.toTypedArray()

        val src = MatOfPoint2f(*insetCorners)
        val dst = MatOfPoint2f(
          Point(0.0, 0.0), Point(OUTPUT_SIZE.toDouble(), 0.0),
          Point(OUTPUT_SIZE.toDouble(), OUTPUT_SIZE.toDouble()), Point(0.0, OUTPUT_SIZE.toDouble())
        )
        val transformMatrix = Imgproc.getPerspectiveTransform(src, dst)
        val warped = Mat()
        Imgproc.warpPerspective(fullMat, warped, transformMatrix, Size(OUTPUT_SIZE.toDouble(), OUTPUT_SIZE.toDouble()))

        if (isDuplicateCapture(warped)) {
          warped.release(); src.release(); dst.release(); transformMatrix.release(); c2f.release(); approx.release()
          continue
        }

        val oriented = fixOrientation(warped)
        val sharpness = getSharpness(oriented)
        
        if (sharpness < 35.0) {
          Log.d(TAG, "Rejected blurry frame: sharpness=$sharpness")
          oriented.release(); warped.release(); src.release(); dst.release(); transformMatrix.release(); c2f.release(); approx.release()
          continue
        }

        lastCaptureTime.set(now)
        val b64 = matToBase64(oriented)

        Log.i(TAG, "✅ CAPTURED (area=$area, sharpness=$sharpness)")
        oriented.release()
        warped.release(); src.release(); dst.release(); transformMatrix.release(); c2f.release(); approx.release()
        
        result = mapOf("detected" to true, "imageBase64" to b64, "timestamp" to now.toDouble())
        break 
      }

      if (result == null && frameCount % 15 == 0) {
        Log.d(TAG, "No detection. maxArea: $maxAreaFound, pattern status: $closestPatternMatch")
      }

      for (contour in contours) contour.release()
      releaseMats(fullMat, downMat, gray, thresh, closedThresh, hierarchy)
      
      return result ?: noDetection()
    } catch (e: Exception) {
      Log.e(TAG, "Exception in FrameProcessor: ${e.message}")
      for (contour in contours) contour.release()
      if (fullMat != null) releaseMats(fullMat)
      if (downMat != null) releaseMats(downMat)
      if (gray != null) releaseMats(gray)
      if (thresh != null) releaseMats(thresh)
      if (closedThresh != null) releaseMats(closedThresh)
      if (hierarchy != null) releaseMats(hierarchy)
      return noDetection()
    }
  }

  private fun getSharpness(mat: Mat): Double {
    val gray = Mat()
    if (mat.channels() == 4) Imgproc.cvtColor(mat, gray, Imgproc.COLOR_RGBA2GRAY)
    else if (mat.channels() == 3) Imgproc.cvtColor(mat, gray, Imgproc.COLOR_RGB2GRAY)
    else mat.copyTo(gray)
    
    val laplacian = Mat()
    Imgproc.Laplacian(gray, laplacian, CvType.CV_64F)
    val mean = MatOfDouble()
    val std = MatOfDouble()
    Core.meanStdDev(laplacian, mean, std)
    val variance = Math.pow(std.get(0,0)[0], 2.0)
    
    gray.release()
    laplacian.release()
    mean.release()
    std.release()
    return variance
  }

  private fun validatePattern(thresh: Mat, corners: Array<Point>): Boolean {
    val cols = thresh.cols()
    val rows = thresh.rows()
    if (cols <= 0 || rows <= 0) return false
    
    val threshData = ByteArray(cols * rows)
    thresh.get(0, 0, threshData)

    val results = (0 until 4).map { i ->
      val p1 = corners[i]; val p2 = corners[(i + 1) % 4]
      val densities = mutableListOf<Double>()
      for (s in 0 until 30) {
        val t = (s + 0.5) / 30.0
        val x = (p1.x + t * (p2.x - p1.x)).toInt()
        val y = (p1.y + t * (p2.y - p1.y)).toInt()
        
        var maxVal = 0.0
        for (dx in -1..1) {
          for (dy in -1..1) {
            val nx = x + dx
            val ny = y + dy
            if (nx in 0 until cols && ny in 0 until rows) {
              val idx = ny * cols + nx
              val pixelVal = threshData[idx].toInt() and 0xFF
              if (pixelVal > 127) maxVal = 1.0
            }
          }
        }
        densities.add(maxVal)
      }
      val m = densities.average()
      val v = densities.map { (it - m) * (it - m) }.average()
      
      val isSolid = m > SOLID_DENSITY && v < 0.15
      val isDashed = v > 0.02 && m in DASH_MEAN_MIN..DASH_MEAN_MAX
      Pair(isSolid, isDashed)
    }
    
    for (r in 0 until 4) {
      val s0 = results[(0 + r) % 4]
      val s1 = results[(1 + r) % 4]
      val s2 = results[(2 + r) % 4]
      val s3 = results[(3 + r) % 4]
      if (s0.first && s1.first && s2.second && s3.second) {
        return true
      }
    }
    return false
  }

  private fun dist(a: Point, b: Point): Double {
    val dx = a.x - b.x; val dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private fun computePerceptualHash(mat: Mat): Long {
    val small = Mat()
    Imgproc.resize(mat, small, Size(8.0, 8.0), 0.0, 0.0, Imgproc.INTER_AREA)
    val gray = Mat(); Imgproc.cvtColor(small, gray, Imgproc.COLOR_RGBA2GRAY)
    val pixels = DoubleArray(64)
    for (row in 0 until 8) for (col in 0 until 8) pixels[row * 8 + col] = gray.get(row, col)[0]
    val mean = pixels.average()
    var hash = 0L
    for (i in pixels.indices) if (pixels[i] > mean) hash = hash or (1L shl i)
    small.release(); gray.release()
    return hash
  }

  private fun isDuplicateCapture(mat: Mat): Boolean {
    val hash = computePerceptualHash(mat)
    val hammingDist = java.lang.Long.bitCount(hash xor lastCapturedHash)
    return if (hammingDist < 10) true
    else { synchronized(hashLock) { lastCapturedHash = hash }; false }
  }

  private fun sortCorners(pts: Array<Point>): Array<Point> {
    val tl = pts.minByOrNull { it.x + it.y } ?: pts[0]
    val br = pts.maxByOrNull { it.x + it.y } ?: pts[2]
    val rem = pts.filter { it != tl && it != br }
    val tr = rem.maxByOrNull { it.x - it.y } ?: rem[0]
    val bl = rem.minByOrNull { it.x - it.y } ?: rem[1]
    return arrayOf(tl, tr, br, bl)
  }

  private fun fixOrientation(mat: Mat): Mat {
    val s = mat.rows(); val cs = (s * 0.15).toInt()
    fun d(x: Int, y: Int): Int {
      val r = mat.submat(y, (y + cs).coerceAtMost(s), x, (x + cs).coerceAtMost(s))
      val g = Mat(); Imgproc.cvtColor(r, g, Imgproc.COLOR_RGBA2GRAY)
      val t = Mat(); Imgproc.threshold(g, t, 128.0, 255.0, Imgproc.THRESH_BINARY_INV)
      val c = Core.countNonZero(t); r.release(); g.release(); t.release(); return c
    }
    val cL = listOf(d(0, 0), d(s - cs, 0), d(s - cs, s - cs), d(0, s - cs))
    val mi = cL.indexOf(cL.maxOrNull() ?: 0)
    if (mi == 3) return mat
    val res = Mat()
    val code = when (mi) { 2 -> Core.ROTATE_90_COUNTERCLOCKWISE; 1 -> Core.ROTATE_180; else -> Core.ROTATE_90_CLOCKWISE }
    Core.rotate(mat, res, code); return res
  }

  private fun ensureOpenCV() = if (!opencvLoaded) { opencvLoaded = OpenCVLoader.initDebug(); opencvLoaded } else true

  private fun frameToMat(frame: Frame): Mat? {
    return try {
      val img = frame.image
      val y = img.planes[0].buffer; val v = img.planes[2].buffer; val u = img.planes[1].buffer
      val yS = y.remaining(); val vS = v.remaining(); val uS = u.remaining()
      val b = ByteArray(yS + vS + uS)
      y.get(b, 0, yS); v.get(b, yS, vS); u.get(b, yS + vS, uS)
      // DO NOT call img.close() — VisionCamera owns the frame lifetime and closes it after callback() returns
      val yuv = Mat(frame.height + frame.height / 2, frame.width, CvType.CV_8UC1)
      yuv.put(0, 0, b)
      val rgba = Mat(); Imgproc.cvtColor(yuv, rgba, Imgproc.COLOR_YUV2RGBA_NV21)
      yuv.release(); rgba
    } catch (e: Exception) { null }
  }

  private fun matToBase64(mat: Mat): String {
    val b = Bitmap.createBitmap(mat.cols(), mat.rows(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(mat, b)
    val s = ByteArrayOutputStream(); b.compress(Bitmap.CompressFormat.JPEG, 85, s)
    return Base64.encodeToString(s.toByteArray(), Base64.NO_WRAP)
  }

  private fun releaseMats(vararg mats: Mat) { for (m in mats) if (!m.empty()) m.release() }
  private fun noDetection() = mapOf("detected" to false)
}
