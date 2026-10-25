package app.plainoss.arruler.core

import kotlin.math.PI
import kotlin.math.sqrt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class GeometryTest {
    @Test
    fun distanceAndPathIncludeAllThreeDimensions() {
        assertNear(13.0, distance3D(Point3D.ZERO, Point3D(3.0, 4.0, 12.0)))
        val points =
            listOf(
                Point3D.ZERO,
                Point3D(3.0, 0.0, 0.0),
                Point3D(3.0, 4.0, 0.0),
                Point3D(3.0, 4.0, 12.0),
            )
        assertNear(19.0, pathLength3D(points))
        assertNear(0.0, pathLength3D(emptyList()))
        assertNear(0.0, pathLength3D(listOf(Point3D.ZERO)))
    }

    @Test
    fun distanceDoesNotOverflowWhenSquaringLargeCoordinates() {
        val distance = distance3D(Point3D.ZERO, Point3D(3e150, 4e150, 0.0))
        assertTrue(distance.isFinite())
        assertNear(5.0, distance / 1e150)
    }

    @Test
    fun perimeterClosesLastSegmentIncludingTwoPointReturnJourney() {
        val triangle = listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0), Point3D(0.0, 4.0, 0.0))
        assertNear(12.0, perimeter3D(triangle))
        assertNear(6.0, perimeter3D(triangle.take(2)))
        assertNear(0.0, perimeter3D(emptyList()))
    }

    @Test
    fun areaWorksForTiltedPolygonsAndEitherWinding() {
        val tilted =
            listOf(
                Point3D.ZERO,
                Point3D(1.0, 0.0, 1.0),
                Point3D(1.0, 3.0, 1.0),
                Point3D(0.0, 3.0, 0.0),
            )
        assertNear(3.0 * sqrt(2.0), polygonArea3D(tilted))
        assertNear(polygonArea3D(tilted), polygonArea3D(tilted.reversed()))
        assertNear(0.0, polygonArea3D(tilted.take(2)))
    }

    @Test
    fun concaveAreaRemainsStableFarFromWorldOrigin() {
        val concave =
            listOf(
                Point3D(0.0, 0.0, 0.0),
                Point3D(3.0, 0.0, 0.0),
                Point3D(3.0, 1.0, 0.0),
                Point3D(1.0, 1.0, 0.0),
                Point3D(1.0, 3.0, 0.0),
                Point3D(0.0, 3.0, 0.0),
            )
        val translated = concave.map { vectorAdd(it, Point3D(1e9, -1e9, 2e9)) }
        assertNear(5.0, polygonArea3D(concave))
        assertNear(5.0, polygonArea3D(translated))
        assertNear(5.0, polygonArea3D(concave + concave.first()))
    }

    @Test
    fun anglesUseMiddlePointAndHandleDegenerateAndExtremeRays() {
        val a = Point3D(1.0, 0.0, 0.0)
        val b = Point3D.ZERO
        assertNear(90.0, angleBetween3D(a, b, Point3D(0.0, 3.0, 0.0)))
        assertNear(PI / 2, angleBetween3D(a, b, Point3D(0.0, 3.0, 0.0), AngleUnit.RADIANS))
        assertNear(180.0, angleBetween3D(a, b, Point3D(-3.0, 0.0, 0.0)))
        assertNear(0.0, angleBetween3D(a, b, Point3D(3.0, 0.0, 0.0)))
        assertNear(0.0, angleBetween3D(b, b, a))
        assertNear(45.0, angleBetween3D(Point3D(1e150, 0.0, 0.0), b, Point3D(1e150, 1e150, 0.0)))
        assertNear(90.0, angleBetween3D(Point3D(1e-300, 0.0, 0.0), b, Point3D(0.0, 1e-300, 0.0)))
    }

    @Test
    fun boundingBoxIncludesNegativeCoordinatesAndEmptyInput() {
        val box =
            boundingBox3D(
                listOf(Point3D(-2.0, 10.0, 5.0), Point3D(8.0, -4.0, 12.0), Point3D(3.0, 6.0, -1.0))
            )
        assertEquals(Point3D(-2.0, -4.0, -1.0), box.min)
        assertEquals(Point3D(8.0, 10.0, 12.0), box.max)
        assertEquals(Point3D(10.0, 14.0, 13.0), box.dimensions)
        assertEquals(Point3D.ZERO, boundingBox3D(emptyList()).dimensions)
    }

    @Test
    fun vectorHelpersAndOptionalGridPreserveSpatialCoordinates() {
        assertEquals(
            Point3D(3.0, 2.0, 0.0),
            vectorSubtract(Point3D(5.0, 3.0, 1.0), Point3D(2.0, 1.0, 1.0)),
        )
        assertEquals(
            Point3D(0.0, 0.0, 1.0),
            crossProduct3D(Point3D(1.0, 0.0, 0.0), Point3D(0.0, 1.0, 0.0)),
        )
        assertNear(1.0, vectorMagnitude3D(vectorNormalize3D(Point3D(3.0, 0.0, 4.0))))
        assertEquals(Point3D.ZERO, vectorNormalize3D(Point3D.ZERO))
        assertEquals(Point3D(1.0, 0.0, 0.0), vectorNormalize3D(Point3D(1e-320, 0.0, 0.0)))
        assertEquals(
            Point3D(5.0, 5.0, 5.0),
            midpoint3D(Point3D(0.0, 10.0, 2.0), Point3D(10.0, 0.0, 8.0)),
        )
        assertEquals(
            Point3D(3.0, 3.0, 3.0),
            centroid3D(listOf(Point3D.ZERO, Point3D(3.0, 6.0, 9.0), Point3D(6.0, 3.0, 0.0))),
        )
        assertEquals(Point3D(0.5, -1.0, 1.5), snapToGrid(Point3D(0.36, -0.8, 1.49)))
    }

    @Test
    fun invalidCoordinatesAndGridSpacingFailExplicitly() {
        assertFailsWith<IllegalArgumentException> {
            distance3D(Point3D(Double.NaN, 0.0, 0.0), Point3D.ZERO)
        }
        assertFailsWith<IllegalArgumentException> { snapToGrid(Point3D.ZERO, 0.0) }
        assertFailsWith<IllegalArgumentException> {
            snapToGrid(Point3D.ZERO, Double.POSITIVE_INFINITY)
        }
    }

    private fun assertNear(expected: Double, actual: Double) = assertEquals(expected, actual, 1e-9)
}
