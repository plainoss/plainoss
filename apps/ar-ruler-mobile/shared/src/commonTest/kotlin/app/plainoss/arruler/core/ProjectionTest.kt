package app.plainoss.arruler.core

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProjectionTest {
    @Test
    fun worldTransformUsesColumnMajorMatrixIncludingTranslationAndW() {
        val matrix = FloatArray(16) { (it + 1).toFloat() }
        assertEquals(
            ClipPoint(51.0, 58.0, 65.0, 72.0),
            clipSpacePoint(Point3D(1.0, 2.0, 3.0), matrix),
        )
    }

    @Test
    fun transformPreservesOffscreenAndBehindCameraPointsForLineClipping() {
        val offscreen = assertNotNull(clipSpacePoint(Point3D(4.0, 0.0, -2.0), perspective()))
        val behind = assertNotNull(clipSpacePoint(Point3D(0.0, 0.0, 2.0), perspective()))
        assertEquals(4.0, offscreen.x)
        assertEquals(-2.0, behind.w)
        assertNull(projectToViewport(offscreen, 1000, 1000))
        assertNull(projectToViewport(behind, 1000, 1000))
    }

    @Test
    fun viewportMappingHasTopLeftOriginAndIncludesAllClipBoundaries() {
        assertPoint(0.0, 0.0, projectToViewport(ClipPoint(-2.0, 2.0, -2.0, 2.0), 800, 600))
        assertPoint(800.0, 600.0, projectToViewport(ClipPoint(2.0, -2.0, 2.0, 2.0), 800, 600))
        assertPoint(400.0, 300.0, projectToViewport(ClipPoint(0.0, 0.0, 0.0, 2.0), 800, 600))
        for (outside in
            listOf(
                ClipPoint(-1.01, 0.0, 0.0, 1.0),
                ClipPoint(1.01, 0.0, 0.0, 1.0),
                ClipPoint(0.0, -1.01, 0.0, 1.0),
                ClipPoint(0.0, 1.01, 0.0, 1.0),
                ClipPoint(0.0, 0.0, -1.01, 1.0),
                ClipPoint(0.0, 0.0, 1.01, 1.0),
            )) assertNull(projectToViewport(outside, 800, 600))
    }

    @Test
    fun regressionDistanceLineRemainsWhenBothEndpointMarkersAreOffscreen() {
        val a = assertNotNull(clipSpacePoint(Point3D(-4.0, 0.0, -2.0), perspective()))
        val b = assertNotNull(clipSpacePoint(Point3D(4.0, 0.0, -2.0), perspective()))
        assertNull(projectToViewport(a, 1000, 1000))
        assertNull(projectToViewport(b, 1000, 1000))
        val segment = assertNotNull(clipSegmentToViewport(a, b, 1000, 1000))
        assertPoint(0.0, 500.0, segment.start)
        assertPoint(1000.0, 500.0, segment.end)
    }

    @Test
    fun oneOffscreenEndpointIsClippedWithoutDroppingTheVisiblePortion() {
        val segment =
            assertNotNull(
                clipSegmentToViewport(
                    ClipPoint(-4.0, 0.0, 0.0, 2.0),
                    ClipPoint(1.0, 1.0, 0.0, 1.0),
                    600,
                    300,
                )
            )
        assertPoint(0.0, 100.0, segment.start)
        assertPoint(600.0, 0.0, segment.end)
    }

    @Test
    fun verticalAndDiagonalCrossingsClipAgainstScreenEdges() {
        val vertical =
            assertNotNull(
                clipSegmentToViewport(
                    ClipPoint(0.0, -3.0, 0.0, 1.0),
                    ClipPoint(0.0, 3.0, 0.0, 1.0),
                    800,
                    600,
                )
            )
        assertPoint(400.0, 600.0, vertical.start)
        assertPoint(400.0, 0.0, vertical.end)
        val diagonal =
            assertNotNull(
                clipSegmentToViewport(
                    ClipPoint(-3.0, -3.0, 0.0, 1.0),
                    ClipPoint(3.0, 3.0, 0.0, 1.0),
                    800,
                    600,
                )
            )
        assertPoint(0.0, 600.0, diagonal.start)
        assertPoint(800.0, 0.0, diagonal.end)
    }

    @Test
    fun nearPlaneCrossingUses3DIntersectionBeforePerspectiveDivision() {
        val a = assertNotNull(clipSpacePoint(Point3D(-1.0, 0.0, -0.5), perspective()))
        val b = assertNotNull(clipSpacePoint(Point3D(1.0, 0.0, -2.0), perspective()))
        val segment = assertNotNull(clipSegmentToViewport(a, b, 1000, 1000))
        // At z=-1 the segment's x is -1/3; the original endpoint is before the near plane.
        assertPoint(1000.0 / 3.0, 500.0, segment.start, 1e-4)
        assertPoint(750.0, 500.0, segment.end)
    }

    @Test
    fun endpointBehindCameraClipsToNearPlaneWithoutMirroring() {
        val a = assertNotNull(clipSpacePoint(Point3D(-1.0, 0.0, 1.0), perspective()))
        val b = assertNotNull(clipSpacePoint(Point3D(1.0, 0.0, -3.0), perspective()))
        val segment = assertNotNull(clipSegmentToViewport(a, b, 1000, 1000))
        assertPoint(500.0, 500.0, segment.start, 1e-4)
        assertPoint(2000.0 / 3.0, 500.0, segment.end)
        assertNull(
            clipSegmentToViewport(
                assertNotNull(clipSpacePoint(Point3D(-1.0, 0.0, 2.0), perspective())),
                assertNotNull(clipSpacePoint(Point3D(1.0, 0.0, 3.0), perspective())),
                1000,
                1000,
            )
        )
    }

    @Test
    fun farPlaneCrossingIsClippedAndSegmentsOutsideDepthAreRejected() {
        val segment =
            assertNotNull(
                clipSegmentToViewport(
                    ClipPoint(0.0, 0.0, 0.0, 1.0),
                    ClipPoint(0.8, 0.4, 3.0, 1.0),
                    600,
                    300,
                )
            )
        assertPoint(300.0, 150.0, segment.start)
        assertPoint(380.0, 130.0, segment.end)
        assertNull(
            clipSegmentToViewport(
                ClipPoint(0.0, 0.0, 2.0, 1.0),
                ClipPoint(0.5, 0.5, 3.0, 1.0),
                600,
                300,
            )
        )
        assertNull(
            clipSegmentToViewport(
                ClipPoint(0.0, 0.0, -2.0, 1.0),
                ClipPoint(0.5, 0.5, -3.0, 1.0),
                600,
                300,
            )
        )
    }

    @Test
    fun outsideSegmentsDoNotCreateFalseConnectionsAcrossViewportCorners() {
        assertNull(
            clipSegmentToViewport(
                ClipPoint(-2.0, 0.5, 0.0, 1.0),
                ClipPoint(0.5, 2.0, 0.0, 1.0),
                800,
                600,
            )
        )
        assertNull(
            clipSegmentToViewport(
                ClipPoint(-2.0, -0.5, 0.0, 1.0),
                ClipPoint(-2.0, 0.5, 0.0, 1.0),
                800,
                600,
            )
        )
    }

    @Test
    fun reversingEndpointsReversesVisibleSegmentWithoutMovingIt() {
        val a = ClipPoint(-4.0, -0.5, -2.0, 2.0)
        val b = ClipPoint(3.0, 2.0, 1.0, 1.0)
        val forward = assertNotNull(clipSegmentToViewport(a, b, 800, 600))
        val reversed = assertNotNull(clipSegmentToViewport(b, a, 800, 600))
        assertPoint(forward.start.x, forward.start.y, reversed.end)
        assertPoint(forward.end.x, forward.end.y, reversed.start)
    }

    @Test
    fun boundaryAndDegenerateVisibleSegmentsRemainWellDefined() {
        val point = ClipPoint(0.5, -0.5, 1.0, 1.0)
        val degenerate = assertNotNull(clipSegmentToViewport(point, point, 800, 600))
        assertPoint(600.0, 450.0, degenerate.start)
        assertEquals(degenerate.start, degenerate.end)
        val tangent =
            assertNotNull(
                clipSegmentToViewport(
                    ClipPoint(-2.0, 0.0, 0.0, 1.0),
                    ClipPoint(0.0, 2.0, 0.0, 1.0),
                    800,
                    600,
                )
            )
        assertPoint(0.0, 0.0, tangent.start)
        assertPoint(0.0, 0.0, tangent.end)
        assertNull(
            clipSegmentToViewport(
                ClipPoint(2.0, 0.0, 0.0, 1.0),
                ClipPoint(2.0, 0.0, 0.0, 1.0),
                800,
                600,
            )
        )
    }

    @Test
    fun homogeneousScalingDoesNotChangeProjectionOrOverflowPlaneDistances() {
        for (scale in listOf(1e-300, 1.0, 1e300)) {
            val segment =
                assertNotNull(
                    clipSegmentToViewport(
                        ClipPoint(-2.0 * scale, 0.0, 0.0, scale),
                        ClipPoint(2.0 * scale, 0.0, 0.0, scale),
                        800,
                        600,
                    )
                )
            assertPoint(0.0, 300.0, segment.start)
            assertPoint(800.0, 300.0, segment.end)
        }
    }

    @Test
    fun invalidMatricesCoordinatesViewportsAndZeroWAreRejected() {
        assertNull(clipSpacePoint(Point3D.ZERO, FloatArray(15)))
        assertNull(clipSpacePoint(Point3D(Double.NaN, 0.0, 0.0), perspective()))
        assertNull(
            clipSpacePoint(Point3D.ZERO, perspective().apply { this[5] = Float.POSITIVE_INFINITY })
        )
        val inside = ClipPoint(0.0, 0.0, 0.0, 1.0)
        for (invalid in
            listOf(
                ClipPoint(Double.NaN, 0.0, 0.0, 1.0),
                ClipPoint(0.0, Double.POSITIVE_INFINITY, 0.0, 1.0),
                ClipPoint(0.0, 0.0, Double.NEGATIVE_INFINITY, 1.0),
                ClipPoint(0.0, 0.0, 0.0, Double.NaN),
                ClipPoint(0.0, 0.0, 0.0, 0.0),
                ClipPoint(0.0, 0.0, 0.0, -1.0),
            )) {
            assertNull(projectToViewport(invalid, 800, 600))
            assertNull(clipSegmentToViewport(invalid, invalid, 800, 600))
        }
        assertNull(projectToViewport(inside, 0, 600))
        assertNull(projectToViewport(inside, 800, -1))
        assertNull(clipSegmentToViewport(inside, inside, 0, 600))
        assertNull(clipSegmentToViewport(inside, inside, 800, -1))
    }

    @Test
    fun polygonSurroundingTheViewportFillsItEvenWhenNoOriginalEdgeIsVisible() {
        val polygon =
            listOf(
                ClipPoint(-2.0, -2.0, 0.0, 1.0),
                ClipPoint(2.0, -2.0, 0.0, 1.0),
                ClipPoint(2.0, 2.0, 0.0, 1.0),
                ClipPoint(-2.0, 2.0, 0.0, 1.0),
            )
        assertPolygonVertices(
            listOf(
                ViewportPoint(0.0, 0.0),
                ViewportPoint(800.0, 0.0),
                ViewportPoint(800.0, 600.0),
                ViewportPoint(0.0, 600.0),
            ),
            clipPolygonToViewport(polygon, 800, 600),
        )
    }

    @Test
    fun offscreenPolygonVerticesAreReplacedByFrustumIntersections() {
        val result =
            clipPolygonToViewport(
                listOf(
                    ClipPoint(-2.0, -0.5, 0.0, 1.0),
                    ClipPoint(0.5, -0.5, 0.0, 1.0),
                    ClipPoint(0.5, 0.5, 0.0, 1.0),
                    ClipPoint(-2.0, 0.5, 0.0, 1.0),
                ),
                800,
                600,
            )
        assertPolygonVertices(
            listOf(
                ViewportPoint(0.0, 150.0),
                ViewportPoint(600.0, 150.0),
                ViewportPoint(600.0, 450.0),
                ViewportPoint(0.0, 450.0),
            ),
            result,
        )
    }

    @Test
    fun polygonCrossingBehindCameraClipsAtNearPlaneBeforePerspectiveDivide() {
        val polygon =
            listOf(Point3D(-1.0, -1.0, -2.0), Point3D(1.0, -1.0, -2.0), Point3D(0.0, 1.0, 1.0))
                .map { assertNotNull(clipSpacePoint(it, perspective())) }
        val result = clipPolygonToViewport(polygon, 1000, 1000)
        assertEquals(4, result.size)
        assertEquals(1000.0 / 6.0, result.minOf { it.x }, 1e-4)
        assertEquals(5000.0 / 6.0, result.maxOf { it.x }, 1e-4)
        assertEquals(2000.0 / 3.0, result.minOf { it.y }, 1e-4)
        assertEquals(750.0, result.maxOf { it.y }, 1e-8)
        val behind =
            listOf(Point3D(-1.0, -1.0, 2.0), Point3D(1.0, -1.0, 2.0), Point3D(0.0, 1.0, 3.0)).map {
                assertNotNull(clipSpacePoint(it, perspective()))
            }
        assertEquals(emptyList(), clipPolygonToViewport(behind, 1000, 1000))
    }

    @Test
    fun concavePolygonKeepsItsMissingCornerAfterViewportClipping() {
        val result =
            clipPolygonToViewport(
                listOf(
                    ClipPoint(-2.0, -2.0, 0.0, 1.0),
                    ClipPoint(2.0, -2.0, 0.0, 1.0),
                    ClipPoint(2.0, 0.0, 0.0, 1.0),
                    ClipPoint(0.0, 0.0, 0.0, 1.0),
                    ClipPoint(0.0, 2.0, 0.0, 1.0),
                    ClipPoint(-2.0, 2.0, 0.0, 1.0),
                ),
                800,
                600,
            )
        assertPolygonVertices(
            listOf(
                ViewportPoint(0.0, 600.0),
                ViewportPoint(800.0, 600.0),
                ViewportPoint(800.0, 300.0),
                ViewportPoint(400.0, 300.0),
                ViewportPoint(400.0, 0.0),
                ViewportPoint(0.0, 0.0),
            ),
            result,
        )
    }

    @Test
    fun polygonScalingPreservesFillWithoutOverflowAndClosingVertexIsNotDuplicated() {
        for (scale in listOf(1e-300, 1.0, 1e300)) {
            val first = ClipPoint(-0.5 * scale, -0.5 * scale, 0.0, scale)
            val result =
                clipPolygonToViewport(
                    listOf(
                        first,
                        ClipPoint(0.5 * scale, -0.5 * scale, 0.0, scale),
                        ClipPoint(0.0, 0.5 * scale, 0.0, scale),
                        first,
                    ),
                    800,
                    600,
                )
            assertEquals(3, result.size)
            assertPoint(200.0, 450.0, result[0])
            assertPoint(600.0, 450.0, result[1])
            assertPoint(400.0, 150.0, result[2])
        }
    }

    @Test
    fun invalidPolygonDoesNotSilentlyConnectRemainingVertices() {
        val triangle =
            listOf(
                ClipPoint(-0.5, -0.5, 0.0, 1.0),
                ClipPoint(0.5, -0.5, 0.0, 1.0),
                ClipPoint(0.0, 0.5, 0.0, 1.0),
            )
        assertEquals(
            emptyList(),
            clipPolygonToViewport(triangle + ClipPoint(Double.NaN, 0.0, 0.0, 1.0), 800, 600),
        )
        assertEquals(emptyList(), clipPolygonToViewport(triangle, 0, 600))
        assertEquals(emptyList(), clipPolygonToViewport(triangle.take(2), 800, 600))
        for (z in listOf(-2.0, 2.0)) {
            assertEquals(
                emptyList(),
                clipPolygonToViewport(triangle.map { it.copy(z = z) }, 800, 600),
            )
        }
    }

    /** 90° vertical FOV, square aspect, near=1, far=10; camera looks toward negative Z. */
    private fun perspective(): FloatArray =
        floatArrayOf(
            1f,
            0f,
            0f,
            0f,
            0f,
            1f,
            0f,
            0f,
            0f,
            0f,
            -11f / 9f,
            -1f,
            0f,
            0f,
            -20f / 9f,
            0f,
        )

    private fun assertPolygonVertices(expected: List<ViewportPoint>, actual: List<ViewportPoint>) {
        assertEquals(expected.size, actual.size)
        val unmatched = actual.toMutableList()
        for (point in expected) {
            val index = unmatched.indexOfFirst {
                abs(it.x - point.x) <= 1e-8 && abs(it.y - point.y) <= 1e-8
            }
            assertTrue(index >= 0, "Expected polygon vertex $point in $unmatched")
            unmatched.removeAt(index)
        }
    }

    private fun assertPoint(
        x: Double,
        y: Double,
        actual: ViewportPoint?,
        tolerance: Double = 1e-9,
    ) {
        val point = assertNotNull(actual)
        assertEquals(x, point.x, tolerance)
        assertEquals(y, point.y, tolerance)
    }
}
