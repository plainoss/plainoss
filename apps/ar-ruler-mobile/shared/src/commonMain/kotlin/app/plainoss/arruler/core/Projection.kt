package app.plainoss.arruler.core

import kotlin.math.abs

/** Homogeneous OpenGL clip coordinates, before perspective division. */
data class ClipPoint(val x: Double, val y: Double, val z: Double, val w: Double)

/** Pixel coordinates with the origin at the viewport's top-left corner. */
data class ViewportPoint(val x: Double, val y: Double)

data class ViewportSegment(val start: ViewportPoint, val end: ViewportPoint)

/**
 * Applies a column-major 4×4 view-projection matrix to a world-space point. Finite results outside
 * the view, including behind the camera, are retained for segment clipping.
 */
fun clipSpacePoint(point: Point3D, matrix: FloatArray): ClipPoint? {
    if (!point.isFinite || matrix.size != 16 || matrix.any { !it.isFinite() }) return null
    return ClipPoint(
            matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12],
            matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13],
            matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14],
            matrix[3] * point.x + matrix[7] * point.y + matrix[11] * point.z + matrix[15],
        )
        .takeIf { it.isFinite() }
}

/** Strict point visibility for markers: all six clip planes must contain the point. */
fun projectToViewport(point: ClipPoint, width: Int, height: Int): ViewportPoint? {
    if (!point.isFinite() || point.w <= 0.0 || width <= 0 || height <= 0) return null
    if (
        point.x !in -point.w..point.w ||
            point.y !in -point.w..point.w ||
            point.z !in -point.w..point.w
    )
        return null
    return viewportPoint(point, width, height)
}

/**
 * Clips the original 3D segment to -w ≤ x, y, z ≤ w before dividing by w. Endpoint markers may both
 * be offscreen while the segment still crosses the view. Depth clipping prevents behind-camera
 * endpoints from producing mirrored lines.
 */
fun clipSegmentToViewport(
    a: ClipPoint,
    b: ClipPoint,
    width: Int,
    height: Int,
): ViewportSegment? {
    if (!a.isFinite() || !b.isFinite() || width <= 0 || height <= 0) return null
    if (a.w <= 0.0 && b.w <= 0.0) return null

    // A common positive scale leaves the homogeneous segment unchanged and keeps
    // plane distances/interpolation finite even for very large clip coordinates.
    val scale =
        maxOf(abs(a.x), abs(a.y), abs(a.z), abs(a.w), abs(b.x), abs(b.y), abs(b.z), abs(b.w))
    if (scale == 0.0) return null
    val start = a.dividedBy(scale)
    val end = b.dividedBy(scale)
    val startDistances = start.planeDistances()
    val endDistances = end.planeDistances()
    var entering = 0.0
    var leaving = 1.0
    for (index in startDistances.indices) {
        val from = startDistances[index]
        val to = endDistances[index]
        if (from < 0.0 && to < 0.0) return null
        if (from < 0.0) {
            entering = maxOf(entering, from / (from - to))
        } else if (to < 0.0) {
            leaving = minOf(leaving, from / (from - to))
        }
        if (entering > leaving) return null
    }
    val clippedStart = interpolate(start, end, entering)
    val clippedEnd = interpolate(start, end, leaving)
    val viewportStart = viewportPoint(clippedStart, width, height) ?: return null
    val viewportEnd = viewportPoint(clippedEnd, width, height) ?: return null
    return ViewportSegment(viewportStart, viewportEnd)
}

/**
 * Clips an ordered polygon against all six homogeneous frustum planes before perspective divide.
 * This preserves a visible fill even when every original vertex and edge is outside the view.
 * Invalid input is rejected as a whole; vertices are never silently dropped from an unknown shape.
 */
fun clipPolygonToViewport(points: List<ClipPoint>, width: Int, height: Int): List<ViewportPoint> {
    if (points.size < 3 || width <= 0 || height <= 0 || points.any { !it.isFinite() }) {
        return emptyList()
    }
    if (points.all { it.w <= 0.0 }) return emptyList()
    val scale = points.maxOf { maxOf(abs(it.x), abs(it.y), abs(it.z), abs(it.w)) }
    if (scale == 0.0) return emptyList()
    var polygon = points.map { it.dividedBy(scale) }
    for (plane in 0..5) {
        if (polygon.isEmpty()) return emptyList()
        val clipped = mutableListOf<ClipPoint>()
        fun append(point: ClipPoint) {
            if (clipped.lastOrNull() != point) clipped += point
        }
        var previous = polygon.last()
        var previousDistance = previous.planeDistance(plane)
        for (current in polygon) {
            val currentDistance = current.planeDistance(plane)
            val previousInside = previousDistance >= 0.0
            val currentInside = currentDistance >= 0.0
            if (previousInside != currentInside) {
                append(
                    interpolate(
                        previous,
                        current,
                        previousDistance / (previousDistance - currentDistance),
                    )
                )
            }
            if (currentInside) append(current)
            previous = current
            previousDistance = currentDistance
        }
        if (clipped.size > 1 && clipped.first() == clipped.last())
            clipped.removeAt(clipped.lastIndex)
        polygon = clipped
    }
    val result = mutableListOf<ViewportPoint>()
    for (point in polygon) {
        val projected = viewportPoint(point, width, height) ?: return emptyList()
        if (result.lastOrNull() != projected) result += projected
    }
    if (result.size > 1 && result.first() == result.last()) result.removeAt(result.lastIndex)
    return if (result.size >= 3) result else emptyList()
}

private fun ClipPoint.isFinite(): Boolean =
    x.isFinite() && y.isFinite() && z.isFinite() && w.isFinite()

private fun ClipPoint.dividedBy(scale: Double) =
    ClipPoint(x / scale, y / scale, z / scale, w / scale)

/** Signed distances to left, right, bottom, top, near, and far homogeneous planes. */
private fun ClipPoint.planeDistances() = doubleArrayOf(w + x, w - x, w + y, w - y, w + z, w - z)

private fun ClipPoint.planeDistance(plane: Int) =
    when (plane) {
        0 -> w + x
        1 -> w - x
        2 -> w + y
        3 -> w - y
        4 -> w + z
        else -> w - z
    }

private fun interpolate(a: ClipPoint, b: ClipPoint, fraction: Double): ClipPoint {
    val remaining = 1.0 - fraction
    return ClipPoint(
        a.x * remaining + b.x * fraction,
        a.y * remaining + b.y * fraction,
        a.z * remaining + b.z * fraction,
        a.w * remaining + b.w * fraction,
    )
}

/** Used only for known-inside points; clamp roundoff at the clipped screen edges. */
private fun viewportPoint(point: ClipPoint, width: Int, height: Int): ViewportPoint? {
    if (!point.isFinite() || point.w <= 0.0) return null
    val x = point.x / point.w
    val y = point.y / point.w
    if (!x.isFinite() || !y.isFinite()) return null
    return ViewportPoint(
        (x.coerceIn(-1.0, 1.0) + 1.0) * width / 2.0,
        (1.0 - y.coerceIn(-1.0, 1.0)) * height / 2.0,
    )
}
