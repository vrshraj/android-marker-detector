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

    // 2. Extract and analyze each border strip
    val topStats = analyzeStrip(thresholdedMat, tr, tl)
    val rightStats = analyzeStrip(thresholdedMat, br, tr)
    val bottomStats = analyzeStrip(thresholdedMat, bl, br)
    val leftStats = analyzeStrip(thresholdedMat, tl, bl)

    // 3. Define thresholds for solid vs. dashed lines
    val solidMeanThreshold = 0.7 * 255 // Must be > 70% white
    val dashedVarianceThreshold = 0.05 * 255 * 255 // High variance indicates alternating pattern
    val dashedMeanMin = 0.2 * 255
    val dashedMeanMax = 0.7 * 255

    // 4. Validate each border against its expectation
    val isLeftSolid = leftStats.mean > solidMeanThreshold
    val isBottomSolid = bottomStats.mean > solidMeanThreshold
    val isTopDashed = topStats.variance > dashedVarianceThreshold && topStats.mean in dashedMeanMin..dashedMeanMax
    val isRightDashed = rightStats.variance > dashedVarianceThreshold && rightStats.mean in dashedMeanMin..dashedMeanMax

    if (debugLogEnabled) {
        Log.d(TAG, "--- Candidate ---")
        Log.d(TAG, "LEFT:   mean=${"%.2f".format(leftStats.mean)}, var=${"%.2f".format(leftStats.variance)} -> SOLID? $isLeftSolid")
        Log.d(TAG, "BOTTOM: mean=${"%.2f".format(bottomStats.mean)}, var=${"%.2f".format(bottomStats.variance)} -> SOLID? $isBottomSolid")
        Log.d(TAG, "TOP:    mean=${"%.2f".format(topStats.mean)}, var=${"%.2f".format(topStats.variance)} -> DASHED? $isTopDashed")
        Log.d(TAG, "RIGHT:  mean=${"%.2f".format(rightStats.mean)}, var=${"%.2f".format(rightStats.variance)} -> DASHED? $isRightDashed")
    }

    // 5. Return true only if all conditions are met
    return isLeftSolid && isBottomSolid && isTopDashed && isRightDashed
}

private data class StripStats(val mean: Double, val variance: Double)

/**
 * Orders the 4 corners of a quadrilateral contour into a consistent
 * TL, TR, BR, BL sequence. It leverages the sum and difference of coordinates.
 */
private fun orderCorners(points: Array<Point>): Array<Point> {
    val sums = points.map { it.x + it.y }
    val diffs = points.map { it.y - it.x }

    val tl = points[sums.indexOf(sums.minOrNull()!!)]
    val br = points[sums.indexOf(sums.maxOrNull()!!)]
    val tr = points[diffs.indexOf(diffs.minOrNull()!!)]
    val bl = points[diffs.indexOf(diffs.maxOrNull()!!)]

    return arrayOf(tl, tr, br, bl)
}

/**
 * Extracts a border strip between two points, divides it into segments,
 * and calculates the mean and variance of the average pixel intensity of these segments.
 */
private fun analyzeStrip(mat: Mat, p1: Point, p2: Point): StripStats {
    val numSegments = 10
    val stripWidthRatio = 0.15 // 15% of side length

    val sideVec = Point(p2.x - p1.x, p2.y - p1.y)
    val sideLength = sqrt(sideVec.x.pow(2) + sideVec.y.pow(2))
    val stripWidth = (sideLength * stripWidthRatio).toInt().coerceAtLeast(1)

    // Perpendicular vector for inset
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
