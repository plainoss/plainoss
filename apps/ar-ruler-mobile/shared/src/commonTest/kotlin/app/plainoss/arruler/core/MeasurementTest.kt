package app.plainoss.arruler.core

import kotlin.math.PI
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MeasurementTest {
    @Test
    fun unitConversionsPreserveLengthsAreasAndAngles() {
        assertEquals(
            100.0,
            convertDistance(1.0, DistanceUnit.METERS, DistanceUnit.CENTIMETERS),
            1e-9,
        )
        assertEquals(12.0, convertDistance(1.0, DistanceUnit.FEET, DistanceUnit.INCHES), 1e-9)
        assertEquals(3.0, convertDistance(1.0, DistanceUnit.YARDS, DistanceUnit.FEET), 1e-9)
        assertEquals(10000.0, convertAreaFromMeters(1.0, DistanceUnit.CENTIMETERS), 1e-9)
        assertEquals(9.0, convertArea(1.0, DistanceUnit.YARDS, DistanceUnit.FEET), 1e-9)
        assertEquals(PI, convertAngle(180.0, AngleUnit.DEGREES, AngleUnit.RADIANS), 1e-9)
        assertEquals(180.0, convertAngle(PI, AngleUnit.RADIANS, AngleUnit.DEGREES), 1e-9)
    }

    @Test
    fun formattingMatchesExistingUnitsWithoutTrailingZeroesOrNegativeZero() {
        assertEquals("1.85 m", formatDistance(1.854, DistanceUnit.METERS))
        assertEquals("185.4 cm", formatDistance(1.854, DistanceUnit.CENTIMETERS, 1))
        assertEquals("1 in", formatDistance(0.0254, DistanceUnit.INCHES))
        assertEquals("1 ft²", formatArea(0.09290304, DistanceUnit.FEET))
        assertEquals("45.7°", formatAngle(45.678))
        assertEquals("1.571 rad", formatAngle(90.0, AngleUnit.RADIANS, 2))
        assertEquals("0 m", formatDistance(-0.001, DistanceUnit.METERS))
        assertEquals("0.000001 m", formatDistance(0.000001, DistanceUnit.METERS, 6))
    }

    @Test
    fun distanceKeepsCompletedPairsAndUndoReturnsToIncompleteState() {
        val initial = MeasurementSnapshot()
        assertFalse(initial.isReady)
        assertFalse(initial.canSave)
        val first = initial.addPoint(Point3D.ZERO)
        val complete = first.addPoint(Point3D(2.0, 0.0, 0.0))
        assertTrue(complete.isReady)
        assertTrue(complete.isComplete)
        assertTrue(complete.canSave)
        assertEquals(2.0, complete.value)
        assertEquals("200 cm", complete.formatted(DistanceUnit.CENTIMETERS))
        assertEquals(first, complete.undo())
        assertFalse(complete.undo().isReady)
        assertEquals(
            complete.points + Point3D(5.0, 0.0, 0.0),
            complete.addPoint(Point3D(5.0, 0.0, 0.0)).points,
        )
        assertEquals(initial, complete.clear())
        assertEquals(initial, initial.undo())
    }

    @Test
    fun independentDistancesKeepTheirValuesWhenEditingUndoingAndSavingTogether() {
        val first = MeasurementSnapshot().addPoint(Point3D.ZERO).addPoint(Point3D(2.0, 0.0, 0.0))
        val pending = first.addPoint(Point3D(10.0, 0.0, 0.0))
        assertFalse(pending.canSave)
        assertFalse(pending.isComplete)
        assertEquals(listOf(2.0), pending.segments.map { it.length })
        val group = pending.addPoint(Point3D(10.0, 3.0, 0.0))
        assertTrue(group.canSave)
        assertEquals(listOf(2.0, 3.0), group.segments.map { it.length })
        assertEquals(listOf(0, 2), group.segments.map { it.startIndex })
        assertEquals(3.0, group.value)
        assertEquals("1: 2 m · 2: 3 m", group.formatted())
        assertEquals("1: 200 cm · 2: 300 cm", group.formatted(DistanceUnit.CENTIMETERS))
        assertEquals(listOf(4.0, 3.0), group.movePoint(1, Point3D(4.0, 0.0, 0.0)).segments.map { it.length })
        assertEquals(pending, group.undo())
        assertEquals(first, group.undo().undo())
        assertEquals(MeasurementSnapshot(), group.clear())
        val record = MeasurementRecord("group", 1L, group.mode, group.value,
            DistanceUnit.METERS, AngleUnit.DEGREES, group.points)
        assertEquals(group.formatted(), record.formatted)
    }

    @Test
    fun pathSegmentsKeepTheirIndividualLengthsAndTotal() {
        val path = MeasurementSnapshot(MeasurementMode.PATH,
            listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0), Point3D(3.0, 4.0, 0.0)))
        assertEquals(listOf(3.0, 4.0), path.segments.map { it.length })
        assertEquals(7.0, path.value)
        assertEquals("7 m", path.formatted())
        assertEquals(listOf(1, 2), path.segments.map { it.endIndex })
    }

    @Test
    fun changingModeClearsCoordinatesAndSelectingSameModeKeepsThem() {
        val distance = MeasurementSnapshot().addPoint(Point3D.ZERO)
        assertEquals(distance, distance.withMode(MeasurementMode.DISTANCE))
        val area = distance.withMode(MeasurementMode.AREA)
        assertEquals(MeasurementMode.AREA, area.mode)
        assertTrue(area.points.isEmpty())
    }

    @Test
    fun pathAndAreaContinueAfterBecomingReady() {
        val path =
            MeasurementSnapshot(MeasurementMode.PATH)
                .addPoint(Point3D.ZERO)
                .addPoint(Point3D(3.0, 0.0, 0.0))
                .addPoint(Point3D(3.0, 4.0, 0.0))
        assertTrue(path.isReady)
        assertTrue(path.canSave)
        assertFalse(path.isComplete)
        assertEquals(7.0, path.value)
        assertEquals(4, path.addPoint(Point3D(3.0, 4.0, 12.0)).points.size)
        val area = MeasurementSnapshot(MeasurementMode.AREA, MeasurementPresets.room.points)
        assertEquals(12.0, area.value)
        assertEquals(14.0, area.perimeter)
        assertEquals("12 m²", area.formatted())
        assertFalse(area.isComplete)
        assertTrue(area.canCloseArea)
        assertFalse(area.canSave)
        assertEquals(5, area.addPoint(Point3D(-1.0, 0.0, 1.5)).points.size)
    }

    @Test
    fun areaRequiresThreeFiniteCornersBeforeItCanCloseOrSave() {
        val corners = MeasurementPresets.triangle.points
        for (count in 0..2) {
            val incomplete = MeasurementSnapshot(MeasurementMode.AREA, corners.take(count))
            assertFalse(incomplete.isReady)
            assertFalse(incomplete.canCloseArea)
            assertFalse(incomplete.canSave)
            assertEquals(incomplete, incomplete.closeArea())
        }
        val invalid =
            MeasurementSnapshot(
                MeasurementMode.AREA,
                corners.take(2) + Point3D(Double.NaN, 0.0, 0.0),
            )
        assertFalse(invalid.isReady)
        assertFalse(invalid.canCloseArea)
        assertFalse(invalid.canSave)
        assertEquals(invalid, invalid.closeArea())
    }

    @Test
    fun closingAreaPreservesGeometryAndValueAndEnablesSaving() {
        val open = MeasurementSnapshot(MeasurementMode.AREA, MeasurementPresets.triangle.points)
        assertTrue(open.isReady)
        assertTrue(open.canCloseArea)
        assertFalse(open.canSave)
        val closed = open.closeArea()
        assertTrue(closed.areaClosed)
        assertTrue(closed.isComplete)
        assertTrue(closed.canSave)
        assertFalse(closed.canCloseArea)
        assertEquals(open.points, closed.points)
        assertEquals(3, closed.points.size)
        assertEquals(6.0, closed.value, 1e-9)
        assertEquals(open.value, closed.value)
        assertEquals(open.perimeter, closed.perimeter)
        assertEquals(closed, closed.closeArea())
    }

    @Test
    fun firstUndoReopensClosedAreaAndSecondUndoRemovesLastCorner() {
        val closed = MeasurementPresets.room.snapshot()
        val reopened = closed.undo()
        assertEquals(closed.points, reopened.points)
        assertFalse(reopened.areaClosed)
        assertFalse(reopened.isComplete)
        assertFalse(reopened.canSave)
        assertTrue(reopened.canCloseArea)
        assertEquals(12.0, reopened.value)
        assertEquals(closed.points.dropLast(1), reopened.undo().points)
        assertEquals(closed, reopened.closeArea())
        val continued = reopened.addPoint(Point3D(-1.0, 0.0, 1.5))
        assertEquals(5, continued.points.size)
        assertFalse(continued.areaClosed)
    }

    @Test
    fun addingAfterClosedAreaStartsANewOpenPolygonAndInvalidPoseDoesNotEraseIt() {
        val closed = MeasurementPresets.room.snapshot()
        assertEquals(closed, closed.addPoint(Point3D(Double.NaN, 0.0, 0.0)))
        val next = closed.addPoint(Point3D(0.36, 0.0, 1.49), snapToGrid = true)
        assertEquals(MeasurementMode.AREA, next.mode)
        assertEquals(listOf(Point3D(0.5, 0.0, 1.5)), next.points)
        assertFalse(next.areaClosed)
        assertFalse(next.isReady)
        assertFalse(next.isComplete)
        assertFalse(next.canCloseArea)
        assertFalse(next.canSave)
    }

    @Test
    fun clearAndModeChangesResetClosureWhileOtherMeasurementModesKeepTheirSemantics() {
        val closed = MeasurementPresets.room.snapshot()
        assertEquals(MeasurementSnapshot(MeasurementMode.AREA), closed.clear())
        assertEquals(closed, closed.withMode(MeasurementMode.AREA))
        assertEquals(
            MeasurementSnapshot(MeasurementMode.DISTANCE),
            closed.withMode(MeasurementMode.DISTANCE),
        )
        for (mode in
            listOf(MeasurementMode.DISTANCE, MeasurementMode.PATH, MeasurementMode.ANGLE)) {
            val points = MeasurementPresets.triangle.points.take(mode.minimumPoints)
            val snapshot = MeasurementSnapshot(mode, points)
            assertTrue(snapshot.canSave)
            assertFalse(snapshot.canCloseArea)
            assertFalse(snapshot.areaClosed)
            assertEquals(snapshot, snapshot.closeArea())
            assertEquals(points.dropLast(1), snapshot.undo().points)
            assertEquals(mode != MeasurementMode.PATH, snapshot.isComplete)
        }
    }

    @Test
    fun angleValuesStayInDegreesWhenDisplayUnitChanges() {
        val angle = MeasurementPresets.sloped.snapshot()
        assertEquals(45.0, angle.value, 1e-9)
        assertEquals("45°", angle.formatted())
        assertEquals("0.79 rad", angle.formatted(angleUnit = AngleUnit.RADIANS))
        assertTrue(angle.isComplete)
        assertEquals(1, angle.addPoint(Point3D.ZERO).points.size)
        val record =
            MeasurementRecord(
                "saved",
                123L,
                angle.mode,
                angle.value,
                DistanceUnit.FEET,
                AngleUnit.RADIANS,
                angle.points,
            )
        assertEquals("0.79 rad", record.formatted)
        assertEquals(45.0, record.value, 1e-9)
    }

    @Test
    fun physicalCoordinatesAreNeverSnappedUnlessExplicitlyRequested() {
        val point = Point3D(0.36, -0.8, 1.49)
        assertEquals(point, MeasurementSnapshot().addPoint(point).points.single())
        assertEquals(
            Point3D(0.5, -1.0, 1.5),
            MeasurementSnapshot().addPoint(point, snapToGrid = true).points.single(),
        )
        val current = MeasurementSnapshot().addPoint(point)
        assertEquals(current, current.addPoint(Point3D(Double.NaN, 0.0, 0.0)))
    }

    @Test
    fun movingAPointKeepsTheMeasurementAndRecalculatesEveryMode() {
        val points = listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0), Point3D(0.0, 0.0, 4.0))
        val expected =
            mapOf(
                MeasurementMode.DISTANCE to 6.0,
                MeasurementMode.PATH to (6.0 + kotlin.math.sqrt(52.0)),
                MeasurementMode.AREA to 12.0,
                MeasurementMode.ANGLE to kotlin.math.atan2(4.0, 6.0) * 180.0 / PI,
            )
        for (mode in MeasurementMode.entries) {
            val original =
                MeasurementSnapshot(mode, points.take(mode.maximumPoints ?: 3)).closeArea()
            val moved = original.movePoint(1, Point3D(6.0, 0.0, 0.0))
            assertEquals(expected.getValue(mode), moved.value, 1e-9)
            assertEquals(original.points.size, moved.points.size)
            assertEquals(original.points.first(), moved.points.first())
            assertEquals(original.areaClosed, moved.areaClosed)
            assertEquals(original.canSave, moved.canSave)
            assertEquals(Point3D(3.0, 0.0, 0.0), original.points[1])
        }
    }

    @Test
    fun movingPreservesOpenAreasAndRejectsInvalidIndicesAndPoses() {
        val open = MeasurementPresets.room.snapshot().undo()
        val moved = open.movePoint(0, Point3D(.36, 0.0, 1.49), snapToGrid = true)
        assertFalse(moved.areaClosed)
        assertFalse(moved.canSave)
        assertTrue(moved.canCloseArea)
        assertEquals(Point3D(.5, 0.0, 1.5), moved.points.first())
        assertEquals(open.points.drop(1), moved.points.drop(1))
        assertEquals(open, open.movePoint(-1, Point3D.ZERO))
        assertEquals(open, open.movePoint(open.points.size, Point3D.ZERO))
        assertEquals(open, open.movePoint(0, Point3D(Double.NaN, 0.0, 0.0)))
        assertEquals(open, open.movePoint(0, Point3D(0.0, Double.POSITIVE_INFINITY, 0.0)))
    }

    @Test
    fun presetsHaveKnownGeometryAndReadiness() {
        assertEquals(4, MeasurementPresets.all.size)
        assertTrue(MeasurementPresets.all.all { it.snapshot().isReady })
        assertTrue(MeasurementPresets.all.all { it.snapshot().canSave })
        assertTrue(
            MeasurementPresets.all
                .filter { it.mode == MeasurementMode.AREA }
                .all { it.snapshot().areaClosed }
        )
        assertFalse(MeasurementPresets.sloped.snapshot().areaClosed)
        assertEquals(1.28, MeasurementPresets.desk.snapshot().value, 1e-9)
        assertEquals(6.0, MeasurementPresets.triangle.snapshot().value, 1e-9)
        assertEquals(12.0, MeasurementPresets.triangle.snapshot().perimeter, 1e-9)
    }
}
