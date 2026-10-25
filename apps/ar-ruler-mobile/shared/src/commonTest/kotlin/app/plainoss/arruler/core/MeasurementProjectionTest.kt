package app.plainoss.arruler.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MeasurementProjectionTest {
    @Test
    fun distanceRemainsVisibleWhenBothEndpointMarkersAreOutsideViewport() {
        val result =
            projectMeasurement(MeasurementMode.DISTANCE, listOf(point(-2.0), point(2.0)), 800, 600)
        assertEquals(listOf(null, null), result.points)
        assertEquals(1, result.segments.size)
        assertSegment(result.segments.single(), 0.0, 300.0, 800.0, 300.0)
        assertFalse(result.isOutsideView)
        assertFalse(result.isEdgeOn)
    }

    @Test
    fun clipsToUnobscuredCameraAreaWithoutRescalingWorldProjection() {
        val result =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                listOf(point(-0.8), point(0.8)),
                800,
                600,
                viewingArea = ViewportRect(200.0, 100.0, 600.0, 400.0),
            )
        assertEquals(listOf(null, null), result.points)
        assertSegment(result.segments.single(), 200.0, 300.0, 600.0, 300.0)
        assertFalse(result.isOutsideView)
    }

    @Test
    fun drawingStrokeContinuesBehindBothPanelsWhileGuidanceUsesExposedCameraArea() {
        val points = listOf(point(0.0, -2.0), point(0.0, 2.0))
        val drawing = projectMeasurement(MeasurementMode.DISTANCE, points, 800, 600)
        val guidance =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                points,
                800,
                600,
                viewingArea = ViewportRect(0.0, 100.0, 800.0, 450.0),
            )

        // Screen-frustum clipping still applies; panel boundaries do not shorten drawing geometry.
        assertSegment(drawing.segments.single(), 400.0, 600.0, 400.0, 0.0)
        assertSegment(guidance.segments.single(), 400.0, 450.0, 400.0, 100.0)
        assertEquals(listOf(null, null), drawing.points)
        assertFalse(drawing.isOutsideView)
        assertFalse(guidance.isOutsideView)
    }

    @Test
    fun selectedEndpointPreviewKeepsFullStrokeAndMarkerBehindLowerPanel() {
        val points = listOf(point(-0.5, 0.5), point(0.5))
        val target = point(-0.5, -0.8)
        val drawing =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                points,
                800,
                600,
                target = target,
                preview = true,
                selectedPointIndex = 0,
            )
        val guidance =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                points,
                800,
                600,
                target = target,
                preview = true,
                selectedPointIndex = 0,
                viewingArea = ViewportRect(0.0, 100.0, 800.0, 450.0),
            )

        assertPoint(200.0, 540.0, drawing.points[0])
        assertNull(guidance.points[0])
        assertSegment(drawing.segments.single(), 200.0, 540.0, 600.0, 300.0)
        assertSegment(guidance.segments.single(), 350.0, 450.0, 600.0, 300.0)
        assertTrue(drawing.segments.single().isPreview)
        assertTrue(guidance.segments.single().isPreview)
    }

    @Test
    fun guidanceReportsHiddenStrokeWhileDrawingRetainsGeometryUnderPanel() {
        val points = listOf(point(-0.5, -0.8), point(0.5, -0.8))
        val drawing = projectMeasurement(MeasurementMode.DISTANCE, points, 800, 600)
        assertSegment(drawing.segments.single(), 200.0, 540.0, 600.0, 540.0)
        assertTrue(drawing.points.all { it != null })
        assertFalse(drawing.isOutsideView)

        val result =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                points,
                800,
                600,
                viewingArea = ViewportRect(0.0, 100.0, 800.0, 450.0),
            )
        assertTrue(result.segments.isEmpty())
        assertEquals(listOf(null, null), result.points)
        assertTrue(result.isOutsideView)
        assertFalse(result.isEdgeOn)
    }

    @Test
    fun nullAnchorKeepsItsIndexAndNeverBridgesDisconnectedPoints() {
        val result =
            projectMeasurement(
                MeasurementMode.PATH,
                listOf(point(-0.8), null, point(0.2), point(0.8)),
                800,
                600,
            )
        assertEquals(4, result.points.size)
        assertNull(result.points[1])
        assertNotNull(result.points[0])
        assertEquals(1, result.segments.size)
        assertSegment(result.segments.single(), 480.0, 300.0, 720.0, 300.0)
        val onlyMissingEdge =
            projectMeasurement(MeasurementMode.DISTANCE, listOf(point(0.0), null), 800, 600)
        assertTrue(onlyMissingEdge.segments.isEmpty())
        assertTrue(onlyMissingEdge.isOutsideView)
    }

    @Test
    fun selectedFirstEndpointUsesTargetGeometryAndOnlyIncidentEdgesArePreview() {
        val result =
            projectMeasurement(
                MeasurementMode.PATH,
                listOf(point(-0.8), point(0.0), point(0.8)),
                800,
                600,
                target = point(-0.4, 0.5),
                preview = true,
                selectedPointIndex = 0,
            )
        assertEquals(3, result.points.size)
        assertPoint(240.0, 150.0, result.points[0])
        assertEquals(2, result.segments.size)
        assertSegment(result.segments[0], 240.0, 150.0, 400.0, 300.0)
        assertTrue(result.segments[0].isPreview)
        assertFalse(result.segments[1].isPreview)
    }

    @Test
    fun selectedAreaEndpointDashesBothConnectedEdgesButLeavesOthersCommitted() {
        val result =
            projectMeasurement(
                MeasurementMode.AREA,
                listOf(point(-0.5, 0.5), point(0.5, 0.5), point(0.5, -0.5)),
                800,
                600,
                target = point(-0.8, 0.8),
                preview = true,
                selectedPointIndex = 0,
                areaClosed = true,
            )
        assertEquals(listOf(true, false, true), result.segments.map { it.isPreview })
        assertSegment(result.segments.last(), 600.0, 450.0, 80.0, 60.0)
    }

    @Test
    fun onePointDistancePreviewAddsAnEdgeWithoutAddingANumberedMarker() {
        val result =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                listOf(point(-0.5)),
                800,
                600,
                target = point(0.5),
                preview = true,
            )
        assertEquals(1, result.points.size)
        assertSegment(result.segments.single(), 200.0, 300.0, 600.0, 300.0)
        assertTrue(result.segments.single().isPreview)
    }

    @Test
    fun completedDistanceAndAngleDoNotAppendAnotherPreviewPoint() {
        for (mode in listOf(MeasurementMode.DISTANCE, MeasurementMode.ANGLE)) {
            val count = mode.maximumPoints!!
            val result =
                projectMeasurement(
                    mode,
                    listOf(point(-0.5), point(0.0), point(0.5)).take(count),
                    800,
                    600,
                    target = point(0.8),
                    preview = true,
                )
            assertEquals(count - 1, result.segments.size)
            assertTrue(result.segments.none { it.isPreview })
        }
    }

    @Test
    fun pathAndAngleNeverCloseTheirLastPointToTheFirst() {
        val points = listOf(point(-0.5, 0.5), point(0.5, 0.5), point(0.5, -0.5))
        for (mode in listOf(MeasurementMode.PATH, MeasurementMode.ANGLE)) {
            assertEquals(2, projectMeasurement(mode, points, 800, 600).segments.size)
        }
        assertEquals(
            3,
            projectMeasurement(MeasurementMode.AREA, points, 800, 600, areaClosed = true)
                .segments
                .size,
        )
    }

    @Test
    fun areaPreviewClosesTheNewCornerWithDashedEdges() {
        val result =
            projectMeasurement(
                MeasurementMode.AREA,
                listOf(point(-0.5, 0.5), point(0.5, 0.5)),
                800,
                600,
                target = point(0.0, -0.5),
                preview = true,
            )
        assertEquals(listOf(false, true, true), result.segments.map { it.isPreview })
        assertSegment(result.segments[1], 600.0, 150.0, 400.0, 450.0)
        assertSegment(result.segments[2], 400.0, 450.0, 200.0, 150.0)
        assertEquals(3, result.fillPolygon.size)
    }

    @Test
    fun openAreaShowsDraftClosingEdgeAndFillUntilExplicitlyClosed() {
        val points = listOf(point(-0.5, 0.5), point(0.5, 0.5), point(0.5, -0.5))
        val open = projectMeasurement(MeasurementMode.AREA, points, 800, 600)
        assertEquals(listOf(false, false, true), open.segments.map { it.isPreview })
        assertEquals(3, open.fillPolygon.size)
        val closed = projectMeasurement(MeasurementMode.AREA, points, 800, 600, areaClosed = true)
        assertEquals(listOf(false, false, false), closed.segments.map { it.isPreview })
        assertEquals(3, closed.points.size)
        assertEquals(open.fillPolygon, closed.fillPolygon)
        assertFalse(closed.fillPolygon.first() == closed.fillPolygon.last())
    }

    @Test
    fun closedAreaIgnoresLiveCursorButCanPreviewMovingOneOfItsVertices() {
        val points = listOf(point(-0.5, 0.5), point(0.5, 0.5), point(0.5, -0.5))
        val baseline = projectMeasurement(MeasurementMode.AREA, points, 800, 600, areaClosed = true)
        val cursor =
            projectMeasurement(
                MeasurementMode.AREA,
                points,
                800,
                600,
                target = point(-0.8, -0.8),
                preview = true,
                areaClosed = true,
            )
        assertEquals(baseline, cursor)
        val moving =
            projectMeasurement(
                MeasurementMode.AREA,
                points,
                800,
                600,
                target = point(-0.8, -0.8),
                preview = true,
                selectedPointIndex = 0,
                areaClosed = true,
            )
        assertEquals(3, moving.points.size)
        assertEquals(3, moving.fillPolygon.size)
        assertPoint(80.0, 540.0, moving.points[0])
        assertEquals(listOf(true, false, true), moving.segments.map { it.isPreview })
    }

    @Test
    fun liveOpenAreaFillFollowsTargetWithoutDrawingOldClosingDiagonal() {
        val result =
            projectMeasurement(
                MeasurementMode.AREA,
                listOf(point(-0.5, 0.5), point(0.5, 0.5), point(0.5, -0.5)),
                800,
                600,
                target = point(-0.5, -0.5),
                preview = true,
            )
        assertEquals(listOf(false, false, true, true), result.segments.map { it.isPreview })
        assertEquals(3, result.points.size)
        assertEquals(4, result.fillPolygon.size)
        assertSegment(result.segments.last(), 200.0, 450.0, 200.0, 150.0)
    }

    @Test
    fun missingAnchorSuppressesFillInsteadOfInventingAnUnknownPolygon() {
        val result =
            projectMeasurement(
                MeasurementMode.AREA,
                listOf(point(-0.5, 0.5), null, point(0.5, -0.5), point(-0.5, -0.5)),
                800,
                600,
                areaClosed = true,
            )
        assertEquals(4, result.points.size)
        assertNull(result.points[1])
        assertTrue(result.fillPolygon.isEmpty())
        assertEquals(2, result.segments.size)
    }

    @Test
    fun fullDrawingFillContinuesUnderControlsWhileGuidanceUsesExposedCameraRegion() {
        val points = listOf(point(-0.8, 0.8), point(0.8, 0.8), point(0.8, -0.8), point(-0.8, -0.8))
        val drawing = projectMeasurement(MeasurementMode.AREA, points, 800, 600, areaClosed = true)
        val guidance =
            projectMeasurement(
                MeasurementMode.AREA,
                points,
                800,
                600,
                viewingArea = ViewportRect(0.0, 100.0, 800.0, 450.0),
                areaClosed = true,
            )
        assertEquals(60.0, drawing.fillPolygon.minOf { it.y }, 1e-8)
        assertEquals(540.0, drawing.fillPolygon.maxOf { it.y }, 1e-8)
        assertEquals(100.0, guidance.fillPolygon.minOf { it.y }, 1e-8)
        assertEquals(450.0, guidance.fillPolygon.maxOf { it.y }, 1e-8)
    }

    @Test
    fun polygonCoveringViewportIsVisibleEvenWhenEveryMarkerAndEdgeIsOffscreen() {
        val result =
            projectMeasurement(
                MeasurementMode.AREA,
                listOf(point(-2.0, 2.0), point(2.0, 2.0), point(2.0, -2.0), point(-2.0, -2.0)),
                800,
                600,
                areaClosed = true,
            )
        assertTrue(result.points.all { it == null })
        assertTrue(result.segments.isEmpty())
        assertEquals(4, result.fillPolygon.size)
        assertFalse(result.isOutsideView)
    }

    @Test
    fun physicalDepthAlignedDistanceRetainsDegenerateSegmentAndReportsEdgeOn() {
        val result =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                listOf(ClipPoint(0.0, 0.0, 0.0, 1.0), ClipPoint(0.0, 0.0, 0.5, 2.0)),
                800,
                600,
            )
        assertTrue(result.isEdgeOn)
        assertFalse(result.isOutsideView)
        assertSegment(result.segments.single(), 400.0, 300.0, 400.0, 300.0)
        assertTrue(result.points.all { it != null })
        val preview =
            projectMeasurement(
                MeasurementMode.DISTANCE,
                listOf(point(0.0)),
                800,
                600,
                target = point(0.005),
                preview = true,
            )
        assertTrue(preview.isEdgeOn)
        assertFalse(
            projectMeasurement(MeasurementMode.PATH, listOf(point(0.0), point(0.0)), 800, 600)
                .isEdgeOn
        )
    }

    @Test
    fun edgeOnRequiresBothMarkersInsideAndRespectsPixelThreshold() {
        val points = listOf(point(0.0), point(0.02))
        assertFalse(projectMeasurement(MeasurementMode.DISTANCE, points, 800, 600).isEdgeOn)
        assertTrue(
            projectMeasurement(
                    MeasurementMode.DISTANCE,
                    points,
                    800,
                    600,
                    minimumLengthPixels = 8.0,
                )
                .isEdgeOn
        )
        assertFalse(
            projectMeasurement(
                    MeasurementMode.DISTANCE,
                    listOf(point(1.001), point(1.002)),
                    800,
                    600,
                )
                .isEdgeOn
        )
    }

    @Test
    fun emptyAndSinglePointMeasurementsAreNotReportedOutsideTheView() {
        for (points in listOf(emptyList(), listOf(point(2.0)))) {
            val result = projectMeasurement(MeasurementMode.DISTANCE, points, 800, 600)
            assertTrue(result.segments.isEmpty())
            assertFalse(result.isOutsideView)
        }
    }

    @Test
    fun rectangleContainsInclusiveBoundariesAndRejectsInvalidGeometry() {
        val area = ViewportRect(20.0, 30.0, 100.0, 200.0)
        assertTrue(area.isValid)
        assertTrue(area.contains(ViewportPoint(20.0, 30.0)))
        assertTrue(area.contains(ViewportPoint(100.0, 200.0)))
        assertFalse(area.contains(ViewportPoint(19.99, 30.0)))
        assertFalse(area.contains(ViewportPoint(Double.NaN, 30.0)))
        for (invalid in
            listOf(
                ViewportRect(0.0, 0.0, 0.0, 10.0),
                ViewportRect(10.0, 0.0, 0.0, 10.0),
                ViewportRect(0.0, 10.0, 10.0, 0.0),
                ViewportRect(Double.NaN, 0.0, 10.0, 10.0),
                ViewportRect(0.0, 0.0, Double.POSITIVE_INFINITY, 10.0),
            )) {
            assertFalse(invalid.isValid)
            assertFalse(invalid.contains(ViewportPoint(1.0, 1.0)))
            val result =
                projectMeasurement(
                    MeasurementMode.DISTANCE,
                    listOf(point(-0.5), point(0.5)),
                    800,
                    600,
                    viewingArea = invalid,
                )
            assertEquals(listOf(null, null), result.points)
            assertTrue(result.segments.isEmpty())
            assertTrue(result.isOutsideView)
            assertFalse(result.isEdgeOn)
        }
    }

    private fun point(x: Double, y: Double = 0.0) = ClipPoint(x, y, 0.0, 1.0)

    private fun assertPoint(x: Double, y: Double, actual: ViewportPoint?) {
        val point = assertNotNull(actual)
        assertEquals(x, point.x, 1e-8)
        assertEquals(y, point.y, 1e-8)
    }

    private fun assertSegment(
        segment: MeasurementSegment,
        x1: Double,
        y1: Double,
        x2: Double,
        y2: Double,
    ) {
        assertPoint(x1, y1, segment.start)
        assertPoint(x2, y2, segment.end)
    }
}
