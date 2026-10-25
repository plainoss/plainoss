package app.plainoss.arruler.core

enum class MeasurementMode(val label: String, val minimumPoints: Int, val maximumPoints: Int?) {
    DISTANCE("Distance", 2, null),
    PATH("Path", 2, null),
    AREA("Area", 3, null),
    ANGLE("Angle", 3, 3),
}

/** Values use meters, square meters, or degrees. For grouped distances, value is the latest pair. */
data class MeasurementRecord(
    val id: String,
    val timestamp: Long,
    val mode: MeasurementMode,
    val value: Double,
    val unit: DistanceUnit,
    val angleUnit: AngleUnit,
    val points: List<Point3D>,
    val label: String = "",
    val hasPhoto: Boolean = false,
) {
    val formatted: String
        get() = formatMeasurements(mode, points, value, unit, angleUnit)
}

/** Pure measurement state shared by Android and future iOS presentation layers. */
data class MeasurementSnapshot(
    val mode: MeasurementMode = MeasurementMode.DISTANCE,
    val points: List<Point3D> = emptyList(),
    val areaClosed: Boolean = false,
) {
    val isReady: Boolean
        get() = points.size >= mode.minimumPoints && points.all { it.isFinite }

    val isComplete: Boolean
        get() =
            (mode == MeasurementMode.DISTANCE && points.size >= 2 && points.size % 2 == 0) ||
                (mode == MeasurementMode.AREA && areaClosed) ||
                (mode.maximumPoints?.let { points.size >= it } ?: false)

    val canCloseArea: Boolean
        get() = mode == MeasurementMode.AREA && isReady && !areaClosed

    val canSave: Boolean
        get() = isReady && (mode != MeasurementMode.AREA || areaClosed) &&
            (mode != MeasurementMode.DISTANCE || points.size % 2 == 0)

    val value: Double
        get() =
            if (!isReady) 0.0
            else
                when (mode) {
                    MeasurementMode.DISTANCE -> segments.lastOrNull()?.length ?: 0.0
                    MeasurementMode.PATH -> pathLength3D(points)
                    MeasurementMode.AREA -> polygonArea3D(points)
                    MeasurementMode.ANGLE -> angleBetween3D(points[0], points[1], points[2])
                }

    val segments: List<MeasuredSegment>
        get() = measuredSegments(mode, points)

    val perimeter: Double
        get() = perimeter3D(points)

    fun formatted(
        unit: DistanceUnit = DistanceUnit.METERS,
        angleUnit: AngleUnit = AngleUnit.DEGREES,
    ): String = formatMeasurements(mode, points, value, unit, angleUnit)

    fun withMode(mode: MeasurementMode): MeasurementSnapshot =
        if (this.mode == mode) this else MeasurementSnapshot(mode)

    fun addPoint(point: Point3D, snapToGrid: Boolean = false): MeasurementSnapshot {
        // Tracking can briefly produce an invalid pose. It must never enter a saved measurement.
        if (!point.isFinite) return this
        val nextPoint = if (snapToGrid) app.plainoss.arruler.core.snapToGrid(point) else point
        return copy(
            points = if (isComplete && mode != MeasurementMode.DISTANCE) listOf(nextPoint) else points + nextPoint,
            areaClosed = false,
        )
    }

    /** Complete the polygon without inserting a duplicate corner into its geometry. */
    fun closeArea(): MeasurementSnapshot = if (canCloseArea) copy(areaClosed = true) else this

    /** Move one corner without changing point order, count, or polygon closure. */
    fun movePoint(index: Int, point: Point3D, snapToGrid: Boolean = false): MeasurementSnapshot {
        if (index !in points.indices || !point.isFinite) return this
        val moved = if (snapToGrid) app.plainoss.arruler.core.snapToGrid(point) else point
        return copy(
            points = points.mapIndexed { i, existing -> if (i == index) moved else existing }
        )
    }

    /** The first undo reopens a closed polygon; the next undo removes its last corner. */
    fun undo(): MeasurementSnapshot =
        if (mode == MeasurementMode.AREA && areaClosed) copy(areaClosed = false)
        else copy(points = points.dropLast(1))

    fun clear(): MeasurementSnapshot =
        if (points.isEmpty() && !areaClosed) this
        else copy(points = emptyList(), areaClosed = false)
}

/** Original endpoint indices survive projection clipping, so labels keep the correct world length. */
data class MeasuredSegment(val startIndex: Int, val endIndex: Int, val length: Double)

fun measuredSegments(mode: MeasurementMode, points: List<Point3D>): List<MeasuredSegment> {
    if (mode != MeasurementMode.DISTANCE && mode != MeasurementMode.PATH) return emptyList()
    val step = if (mode == MeasurementMode.DISTANCE) 2 else 1
    return (0 until points.lastIndex step step).map { index ->
        MeasuredSegment(index, index + 1, distance3D(points[index], points[index + 1]))
    }
}

private fun formatMeasurements(
    mode: MeasurementMode,
    points: List<Point3D>,
    value: Double,
    unit: DistanceUnit,
    angleUnit: AngleUnit,
): String {
    val distances = if (mode == MeasurementMode.DISTANCE) measuredSegments(mode, points) else emptyList()
    return if (distances.size > 1) distances.mapIndexed { index, segment ->
        "${index + 1}: ${formatDistance(segment.length, unit)}"
    }.joinToString(" · ") else formatMeasurement(mode, value, unit, angleUnit)
}

private fun formatMeasurement(
    mode: MeasurementMode,
    value: Double,
    unit: DistanceUnit,
    angleUnit: AngleUnit,
): String =
    when (mode) {
        MeasurementMode.DISTANCE,
        MeasurementMode.PATH -> formatDistance(value, unit)
        MeasurementMode.AREA -> formatArea(value, unit)
        MeasurementMode.ANGLE -> formatAngle(value, angleUnit)
    }

data class MeasurementPreset(
    val id: String,
    val label: String,
    val mode: MeasurementMode,
    val points: List<Point3D>,
) {
    fun snapshot(): MeasurementSnapshot = MeasurementSnapshot(mode, points.toList()).closeArea()
}

/** Explicit sample geometry for learning the tools without an AR-capable device. */
object MeasurementPresets {
    val room =
        MeasurementPreset(
            "room",
            "Room · 4 × 3 m",
            MeasurementMode.AREA,
            listOf(
                Point3D.ZERO,
                Point3D(4.0, 0.0, 0.0),
                Point3D(4.0, 0.0, 3.0),
                Point3D(0.0, 0.0, 3.0),
            ),
        )
    val desk =
        MeasurementPreset(
            "desk",
            "Desk · 1.6 × 0.8 m",
            MeasurementMode.AREA,
            listOf(
                Point3D.ZERO,
                Point3D(1.6, 0.0, 0.0),
                Point3D(1.6, 0.0, 0.8),
                Point3D(0.0, 0.0, 0.8),
            ),
        )
    val triangle =
        MeasurementPreset(
            "triangle",
            "Triangle · 3–4–5 m",
            MeasurementMode.AREA,
            listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0), Point3D(0.0, 0.0, 4.0)),
        )
    val sloped =
        MeasurementPreset(
            "sloped",
            "Roof slope · 45°",
            MeasurementMode.ANGLE,
            listOf(Point3D(3.0, 0.0, 0.0), Point3D.ZERO, Point3D(3.0, 3.0, 0.0)),
        )
    val all: List<MeasurementPreset> = listOf(room, desk, triangle, sloped)
}
