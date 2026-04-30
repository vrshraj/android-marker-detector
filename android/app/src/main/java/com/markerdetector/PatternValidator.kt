package com.markerdetector

import android.util.Log
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.imgproc.Imgproc
import kotlin.math.pow
import kotlin.math.sqrt

private const val TAG = "PatternValidator"

fun validateMarker2Pattern(
    thresholdedMat: Mat,
    contour: MatOfPoint2f,
    debugLogEnabled: Boolean = false
): Boolean = PatternValidator.validateMarker2Pattern(thresholdedMat, contour, debugLogEnabled)

object PatternValidator {

/**
 * Analyzes a 4-point contour to determine if it matches the Marker 2 pattern.
 *
 * @param thresholdedMat The binary image (THRESH_BINARY_INV) where marker lines are white (255).
 * @param contour A MatOfPoint2f with exactly 4 points representing the candidate contour.
 * @param debugLogEnabled If true, logs the mean and variance for each border strip.
 * @return True if the contour matches the Marker 2 pattern, false otherwise.
 */
@JvmStatic
fun validateMarker2Pattern(
    thresholdedMat: Mat,
    contour: MatOfPoint2f,
    debugLogEnabled: Boolean = false
): Boolean {
    if (contour.total().toInt() != 4) {
        return false
    }

    // 1. Order corners: TL, TR, BR, BL
    val orderedCorners = orderCorners(contour.toArray())

    val (tl, tr, br, bl) = orderedCorners

    // 2. Extract and analyze each border strip (Clockwise: Top, Right, Bottom, Left)
    val topStats = analyzeStrip(thresholdedMat, tl, tr)
    val rightStats = analyzeStrip(thresholdedMat, tr, br)
    val bottomStats = analyzeStrip(thresholdedMat, br, bl)
    val leftStats = analyzeStrip(thresholdedMat, bl, tl)

    // 3. Define thresholds for solid vs. dashed lines
    val solidDensityThreshold = 0.35 * 255
    val dashedVarianceThreshold = 0.02 * 255 * 255 
    val dashedMeanMin = 0.15 * 255
    val dashedMeanMax = 0.85 * 255

    // 4. Validate each border against its expectation
    // Sequence: Top, Right, Bottom, Left (Clockwise from TL)
    val stats = listOf(topStats, rightStats, bottomStats, leftStats)
    val sideResults = stats.map { s ->
        val solid = s.mean > solidDensityThreshold && s.variance < dashedVarianceThreshold
        val dashed = s.variance > dashedVarianceThreshold && s.mean in dashedMeanMin..dashedMeanMax
        Pair(solid, dashed)
    }

    if (debugLogEnabled) {
        Log.d(TAG, "--- Candidate ---")
        sideResults.forEachIndexed { i, res ->
            val name = listOf("TOP", "RIGHT", "BOTTOM", "LEFT")[i]
            val s = stats[i]
            Log.d(TAG, "$name: mean=${"%.2f".format(s.mean)}, var=${"%.2f".format(s.variance)} -> S:${res.first} D:${res.second}")
        }
    }

    // Expected pattern: Dashed, Dashed, Solid, Solid
    val expected = listOf(false, false, true, true) // true if Solid expected

    // Check all 4 possible rotations
    for (i in 0 until 4) {
        val shifted = sideResults.indices.map { sideResults[(it + i) % 4] }
        val matches = shifted.zip(expected).all { (actual, isSolidExpected) ->
            if (isSolidExpected) actual.first else actual.second
        }
        if (matches) {
            if (debugLogEnabled) Log.d(TAG, "Match found at rotation $i")
            return true
        }
    }

    return false
}

private data class StripStats(val mean: Double, val variance: Double)

/**
 * Orders the 4 corners of a quadrilateral contour into a consistent
 * TL, TR, BR, BL sequence. It leverages the sum and difference of coordinates.
 */
private fun orderCorners(points: Array<Point>): Array<Point> {
    // Sort points by Y-coordinate
    val sortedByY = points.sortedBy { it.y }
    
    // Split into top and bottom pairs, then sort each by X-coordinate
    val topTwo = sortedByY.take(2).sortedBy { it.x }
    val bottomTwo = sortedByY.drop(2).sortedBy { it.x }
    
    val tl = topTwo[0]
    val tr = topTwo[1]
    val bl = bottomTwo[0]
    val br = bottomTwo[1]

    // Clockwise: TL, TR, BR, BL
    return arrayOf(tl, tr, br, bl)
}

/**
 * Extracts a border strip between two points, divides it into segments,
 * and calculates the mean and variance of the average pixel intensity of these segments.
 */
private fun analyzeStrip(mat: Mat, p1: Point, p2: Point): StripStats {
    val numSegments = 40
    val stripWidthRatio = 0.08 // 8% of side length

    val sideVec = Point(p2.x - p1.x, p2.y - p1.y)
    val sideLength = sqrt(sideVec.x.pow(2) + sideVec.y.pow(2))
    val stripWidth = (sideLength * stripWidthRatio).toInt().coerceAtLeast(1)

    // Perpendicular vector for inset (Left normal for CW winding to go INWARDS)
    val perpVec = Point(-sideVec.y / sideLength, sideVec.x / sideLength)

    val segmentIntensities = DoubleArray(numSegments)

    for (i in 0 until numSegments) {
        // Midpoint of the segment along the main side
        val t = (i + 0.5) / numSegments
        val midX = p1.x + t * sideVec.x
        val midY = p1.y + t * sideVec.y

        // Create a small ROI centered at the inset midpoint of the segment
        val insetMidX = midX + perpVec.x * stripWidth * 0.5
        val insetMidY = midY + perpVec.y * stripWidth * 0.5
        
        val roiSize = stripWidth.coerceAtLeast(1)
        val roi = Mat(mat, org.opencv.core.Rect(
            (insetMidX - roiSize / 2).toInt().coerceIn(0, mat.cols() - 1),
            (insetMidY - roiSize / 2).toInt().coerceIn(0, mat.rows() - 1),
            roiSize.coerceAtMost(mat.cols() - (insetMidX - roiSize / 2).toInt()),
            roiSize.coerceAtMost(mat.rows() - (insetMidY - roiSize / 2).toInt())
        ))

        // Calculate the mean intensity of this small ROI
        val meanScalar = Core.mean(roi)
        segmentIntensities[i] = meanScalar.`val`[0]
        roi.release()
    }

    // Calculate mean and variance of the segment intensities
    val mean = segmentIntensities.average()
    val variance = segmentIntensities.map { (it - mean).pow(2) }.average()

    return StripStats(mean, variance)
}
}
