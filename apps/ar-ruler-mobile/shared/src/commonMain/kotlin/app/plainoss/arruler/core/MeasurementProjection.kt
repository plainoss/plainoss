package app.plainoss.arruler.core

import kotlin.math.hypot

/** Unobscured camera region in the original viewport's pixel coordinates. */
data class ViewportRect(
    val left: Double,
    val top: Double,
    val right: Double,
    val bottom: Double,
) {
    val isValid: Boolean
        get() =
            left.isFinite() &&
                top.isFinite() &&
                right.isFinite() &&
                bottom.isFinite() &&
                right > left &&
                bottom > top &&
                (right - left).isFinite() &&
                (bottom - top).isFinite()

    fun contains(point: ViewportPoint): Boolean =
        isValid &&
            point.x.isFinite() &&
            point.y.isFinite() &&
            point.x in left..right &&
            point.y in top..bottom
}

data class MeasurementSegment(
    val start: ViewportPoint,
    val end: ViewportPoint,
    val isPreview: Boolean = false,
    val startIndex: Int = 0,
    val endIndex: Int = 1,
)

data class MeasurementProjection(
    /** One entry per committed point; a live append target never becomes a numbered marker. */
    val points: List<ViewportPoint?>,
    val segments: List<MeasurementSegment>,
    val isOutsideView: Boolean,
    val isEdgeOn: Boolean,
    val fillPolygon: List<ViewportPoint> = emptyList(),
)

/**
 * Projects markers and edges from the same effective measurement geometry. Frustum clipping
 * precedes clipping to the unobscured camera region, without moving or scaling camera alignment.
 * Null anchors retain their indices and never create connections across missing geometry.
 */
fun projectMeasurement(
    mode: MeasurementMode,
    points: List<ClipPoint?>,
    width: Int,
    height: Int,
    target: ClipPoint? = null,
    preview: Boolean = false,
    selectedPointIndex: Int? = null,
    viewingArea: ViewportRect = ViewportRect(0.0, 0.0, width.toDouble(), height.toDouble()),
    minimumLengthPixels: Double = 4.0,
    areaClosed: Boolean = false,
): MeasurementProjection {
    val effectivePoints = points.toMutableList()
    val selected = selectedPointIndex?.takeIf { it in points.indices }
    val replacing = preview && selected != null && target != null
    if (replacing) effectivePoints[selected!!] = target

    val complete =
        (mode == MeasurementMode.DISTANCE && points.size % 2 == 0) ||
            (mode == MeasurementMode.AREA && areaClosed) ||
            (mode.maximumPoints?.let { points.size >= it } ?: false)
    val appending =
        preview && selectedPointIndex == null && target != null && points.isNotEmpty() && !complete

    val edges = mutableListOf<ProjectionEdge>()
    val step = if (mode == MeasurementMode.DISTANCE) 2 else 1
    for (index in 0 until points.lastIndex step step) {
        edges +=
            ProjectionEdge(
                index,
                index + 1,
                replacing && (selected == index || selected == index + 1),
            )
    }
    if (mode == MeasurementMode.AREA && points.size >= 3 && !appending) {
        edges +=
            ProjectionEdge(
                points.lastIndex,
                0,
                !areaClosed || (replacing && (selected == 0 || selected == points.lastIndex)),
            )
    }

    if (appending) {
        effectivePoints += target
        val targetIndex = effectivePoints.lastIndex
        edges += ProjectionEdge(points.lastIndex, targetIndex, true)
        if (mode == MeasurementMode.AREA && points.size >= 2) {
            edges += ProjectionEdge(targetIndex, 0, true)
        }
    }

    if (width <= 0 || height <= 0 || !viewingArea.isValid) {
        return MeasurementProjection(
            List(points.size) { null },
            emptyList(),
            edges.isNotEmpty(),
            false,
        )
    }

    val projected = effectivePoints.map { point ->
        point?.let { projectToViewport(it, width, height) }?.takeIf(viewingArea::contains)
    }
    val segments = edges.mapNotNull { edge ->
        val a = effectivePoints[edge.start] ?: return@mapNotNull null
        val b = effectivePoints[edge.end] ?: return@mapNotNull null
        val frustumSegment = clipSegmentToViewport(a, b, width, height) ?: return@mapNotNull null
        val visible = clipToViewingArea(frustumSegment, viewingArea) ?: return@mapNotNull null
        MeasurementSegment(visible.start, visible.end, edge.preview, edge.start, edge.end)
    }
    val fill =
        if (
            mode == MeasurementMode.AREA &&
                effectivePoints.size >= 3 &&
                effectivePoints.all { it != null }
        ) {
            clipPolygonToViewingArea(
                clipPolygonToViewport(effectivePoints.filterNotNull(), width, height),
                viewingArea,
            )
        } else emptyList()
    val edgeOn = mode == MeasurementMode.DISTANCE && edges.any { edge ->
        val a = projected[edge.start]
        val b = projected[edge.end]
        a != null && b != null && minimumLengthPixels.isFinite() && minimumLengthPixels >= 0.0 &&
            hypot(b.x - a.x, b.y - a.y) <= minimumLengthPixels
    }

    return MeasurementProjection(
        points = projected.take(points.size),
        segments = segments,
        isOutsideView = edges.isNotEmpty() && segments.isEmpty() && fill.isEmpty(),
        isEdgeOn = edgeOn,
        fillPolygon = fill,
    )
}

private data class ProjectionEdge(val start: Int, val end: Int, val preview: Boolean = false)

/** Reuse the homogeneous clipper in a normalized rectangle instead of a second line algorithm. */
private fun clipToViewingArea(segment: ViewportSegment, area: ViewportRect): ViewportSegment? {
    val width = area.right - area.left
    val height = area.bottom - area.top
    fun normalized(point: ViewportPoint) =
        ClipPoint(
            2.0 * ((point.x - area.left) / width) - 1.0,
            1.0 - 2.0 * ((point.y - area.top) / height),
            0.0,
            1.0,
        )
    val clipped =
        clipSegmentToViewport(normalized(segment.start), normalized(segment.end), 1, 1)
            ?: return null
    fun original(point: ViewportPoint) =
        ViewportPoint(
            area.left + point.x * width,
            area.top + point.y * height,
        )
    return ViewportSegment(original(clipped.start), original(clipped.end))
}

private fun clipPolygonToViewingArea(
    points: List<ViewportPoint>,
    area: ViewportRect,
): List<ViewportPoint> {
    val width = area.right - area.left
    val height = area.bottom - area.top
    val normalized = points.map { point ->
        ClipPoint(
            2.0 * ((point.x - area.left) / width) - 1.0,
            1.0 - 2.0 * ((point.y - area.top) / height),
            0.0,
            1.0,
        )
    }
    return clipPolygonToViewport(normalized, 1, 1).map { point ->
        ViewportPoint(area.left + point.x * width, area.top + point.y * height)
    }
}
