package app.plainoss.arruler.core

import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.round

/** Coordinates in meters in the platform AR session's world coordinate system. */
data class Point3D(val x: Double, val y: Double, val z: Double) {
    val isFinite: Boolean
        get() = x.isFinite() && y.isFinite() && z.isFinite()

    companion object {
        val ZERO = Point3D(0.0, 0.0, 0.0)
    }
}

data class BoundingBox3D(val min: Point3D, val max: Point3D, val dimensions: Point3D)

fun distance3D(a: Point3D, b: Point3D): Double {
    requireFinite(a, b)
    return hypot(hypot(b.x - a.x, b.y - a.y), b.z - a.z)
}

fun pathLength3D(points: List<Point3D>): Double {
    require(points.all { it.isFinite }) { "Coordinates must be finite" }
    val sum = CompensatedSum()
    for (index in 1 until points.size) sum.add(distance3D(points[index - 1], points[index]))
    return sum.value
}

/** Includes the closing segment from the last point to the first point. */
fun perimeter3D(points: List<Point3D>): Double =
    when {
        points.size < 2 -> 0.0
        else -> pathLength3D(points) + distance3D(points.last(), points.first())
    }

/**
 * Vector area of an ordered, planar polygon, in square meters. Works in every orientation,
 * including concave polygons. Nonplanar polygons return their vector area; crossing edges cancel
 * rather than forming a surface.
 */
fun polygonArea3D(points: List<Point3D>): Double {
    require(points.all { it.isFinite }) { "Coordinates must be finite" }
    if (points.size < 3) return 0.0
    // Translate before taking cross products to avoid cancellation far from origin.
    val origin = points.first()
    val x = CompensatedSum()
    val y = CompensatedSum()
    val z = CompensatedSum()
    for (index in 1 until points.lastIndex) {
        val a = vectorSubtract(points[index], origin)
        val b = vectorSubtract(points[index + 1], origin)
        val cross = crossProduct3D(a, b)
        x.add(cross.x)
        y.add(cross.y)
        z.add(cross.z)
    }
    return hypot(hypot(x.value, y.value), z.value) / 2.0
}

/** Angle A–B–C, with vertex B. Coincident endpoints produce a zero angle. */
fun angleBetween3D(
    a: Point3D,
    b: Point3D,
    c: Point3D,
    unit: AngleUnit = AngleUnit.DEGREES,
): Double {
    requireFinite(a, b, c)
    val first = vectorSubtract(a, b)
    val second = vectorSubtract(c, b)
    val firstMagnitude = vectorMagnitude3D(first)
    val secondMagnitude = vectorMagnitude3D(second)
    if (firstMagnitude == 0.0 || secondMagnitude == 0.0) return 0.0
    // Normalize first so the dot product cannot overflow for long vectors.
    val firstUnit =
        Point3D(first.x / firstMagnitude, first.y / firstMagnitude, first.z / firstMagnitude)
    val secondUnit =
        Point3D(second.x / secondMagnitude, second.y / secondMagnitude, second.z / secondMagnitude)
    val cosine = dotProduct3D(firstUnit, secondUnit).coerceIn(-1.0, 1.0)
    val sine = vectorMagnitude3D(crossProduct3D(firstUnit, secondUnit))
    val radians = atan2(sine, cosine)
    return if (unit == AngleUnit.RADIANS) radians else radians * 180.0 / kotlin.math.PI
}

fun vectorSubtract(a: Point3D, b: Point3D) = Point3D(a.x - b.x, a.y - b.y, a.z - b.z)

fun vectorAdd(a: Point3D, b: Point3D) = Point3D(a.x + b.x, a.y + b.y, a.z + b.z)

fun vectorScale(vector: Point3D, scale: Double) =
    Point3D(vector.x * scale, vector.y * scale, vector.z * scale)

fun dotProduct3D(a: Point3D, b: Point3D): Double = a.x * b.x + a.y * b.y + a.z * b.z

fun crossProduct3D(a: Point3D, b: Point3D) =
    Point3D(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x,
    )

fun vectorMagnitude3D(vector: Point3D): Double = hypot(hypot(vector.x, vector.y), vector.z)

fun vectorNormalize3D(vector: Point3D): Point3D {
    requireFinite(vector)
    val magnitude = vectorMagnitude3D(vector)
    return if (magnitude == 0.0) Point3D.ZERO
    else Point3D(vector.x / magnitude, vector.y / magnitude, vector.z / magnitude)
}

fun midpoint3D(a: Point3D, b: Point3D) =
    Point3D(
        a.x / 2.0 + b.x / 2.0,
        a.y / 2.0 + b.y / 2.0,
        a.z / 2.0 + b.z / 2.0,
    )

fun centroid3D(points: List<Point3D>): Point3D {
    require(points.all { it.isFinite }) { "Coordinates must be finite" }
    if (points.isEmpty()) return Point3D.ZERO
    val x = CompensatedSum()
    val y = CompensatedSum()
    val z = CompensatedSum()
    for (point in points) {
        x.add(point.x / points.size)
        y.add(point.y / points.size)
        z.add(point.z / points.size)
    }
    return Point3D(x.value, y.value, z.value)
}

fun boundingBox3D(points: List<Point3D>): BoundingBox3D {
    require(points.all { it.isFinite }) { "Coordinates must be finite" }
    if (points.isEmpty()) return BoundingBox3D(Point3D.ZERO, Point3D.ZERO, Point3D.ZERO)
    val min = Point3D(points.minOf { it.x }, points.minOf { it.y }, points.minOf { it.z })
    val max = Point3D(points.maxOf { it.x }, points.maxOf { it.y }, points.maxOf { it.z })
    return BoundingBox3D(min, max, vectorSubtract(max, min))
}

/** Optional manual/sandbox grid aid; physical AR anchors should retain their measured position. */
fun snapToGrid(point: Point3D, spacingMeters: Double = 0.5): Point3D {
    requireFinite(point)
    require(spacingMeters.isFinite() && spacingMeters > 0.0) {
        "Grid spacing must be positive and finite"
    }
    return Point3D(
        round(point.x / spacingMeters) * spacingMeters,
        round(point.y / spacingMeters) * spacingMeters,
        round(point.z / spacingMeters) * spacingMeters,
    )
}

private fun requireFinite(vararg points: Point3D) {
    require(points.all { it.isFinite }) { "Coordinates must be finite" }
}

/** Kahan accumulation preserves small segments when measuring long paths. */
private class CompensatedSum {
    var value: Double = 0.0
        private set

    private var correction = 0.0

    fun add(value: Double) {
        val adjusted = value - correction
        val sum = this.value + adjusted
        correction = (sum - this.value) - adjusted
        this.value = sum
    }
}
