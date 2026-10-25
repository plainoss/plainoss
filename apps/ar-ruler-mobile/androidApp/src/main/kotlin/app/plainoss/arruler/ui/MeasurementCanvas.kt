package app.plainoss.arruler.ui

import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.plainoss.arruler.ar.ArFrame
import app.plainoss.arruler.core.*

@Composable
internal fun Reticle(ready: Boolean, modifier: Modifier = Modifier) {
    Canvas(modifier.size(42.dp)) {
        val color = if (ready) Lime else Color.White.copy(alpha = .7f)
        drawCircle(Ink.copy(alpha = .5f), radius = size.width / 2)
        drawCircle(color, radius = size.width * .35f, style = Stroke(2.dp.toPx()))
        drawCircle(color, radius = 3.dp.toPx())
    }
}

@Composable
internal fun MeasurementOverlay(
    frame: ArFrame,
    mode: MeasurementMode,
    projection: MeasurementProjection,
    cameraProjection: MeasurementProjection,
    viewingArea: ViewportRect,
    segmentTexts: Map<Int, String>,
    areaClosed: Boolean,
    canCloseArea: Boolean,
    modifier: Modifier,
    onSelect: (Int) -> Unit,
    onPlace: (Float, Float) -> Unit,
) {
    val currentFrame by rememberUpdatedState(frame)
    val currentProjection by rememberUpdatedState(projection)
    val currentMode by rememberUpdatedState(mode)
    val currentArea by rememberUpdatedState(viewingArea)
    val currentSelect by rememberUpdatedState(onSelect)
    val currentPlace by rememberUpdatedState(onPlace)
    val paint = remember {
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface =
                android.graphics.Typeface.create(
                    "sans-serif-medium",
                    android.graphics.Typeface.NORMAL,
                )
        }
    }
    Canvas(
        modifier.pointerInput(Unit) {
            detectTapGestures { tap ->
                val current = currentFrame
                if (current.width <= 0 || current.height <= 0 || current.mode != currentMode)
                    return@detectTapGestures
                val x = tap.x * current.width / size.width
                val y = tap.y * current.height / size.height
                if (!currentArea.contains(ViewportPoint(x.toDouble(), y.toDouble())))
                    return@detectTapGestures
                val hit =
                    currentProjection.points.indices.lastOrNull { index ->
                        val point = currentProjection.points[index]
                        point != null && kotlin.math.hypot(point.x - x, point.y - y) < 28.dp.toPx()
                    }
                if (hit != null) currentSelect(hit) else currentPlace(x, y)
            }
        }
    ) {
        drawMeasurement(frame, mode, projection, cameraProjection, viewingArea, segmentTexts,
            areaClosed, canCloseArea, paint)
    }
}

internal fun DrawScope.drawMeasurement(
    frame: ArFrame,
    mode: MeasurementMode,
    projection: MeasurementProjection,
    cameraProjection: MeasurementProjection,
    viewingArea: ViewportRect,
    segmentTexts: Map<Int, String>,
    areaClosed: Boolean,
    canCloseArea: Boolean,
    paint: Paint,
) {
    if (frame.width <= 0 || frame.height <= 0 || frame.mode != mode) return
    val scaleX = size.width / frame.width
    val scaleY = size.height / frame.height
    fun position(point: ViewportPoint) =
        Offset((point.x * scaleX).toFloat(), (point.y * scaleY).toFloat())
    val top = (viewingArea.top * scaleY).toFloat()
    val bottom = (viewingArea.bottom * scaleY).toFloat()
    val color = if (frame.tracking && frame.anchorsTracking) Lime else Muted
    // The UI is drawn above this canvas. Keep the stroke continuous beneath its panels
    // and padding; only the physical camera viewport clips the rendered geometry.
    clipRect {
        val points = projection.points
        if (mode == MeasurementMode.AREA && projection.fillPolygon.size >= 3) {
            val polygon = projection.fillPolygon.map(::position)
            val path =
                Path().apply {
                    moveTo(polygon.first().x, polygon.first().y)
                    polygon.drop(1).forEach { lineTo(it.x, it.y) }
                    close()
                }
            drawPath(path, color.copy(alpha = if (areaClosed) .26f else .18f))
        }
        // Segment visibility is independent of endpoint marker visibility. The shared
        // projector clips in 3D before perspective division, only at the camera frustum.
        projection.segments.forEach { segment ->
            drawLine(
                color = if (segment.isPreview) color.copy(alpha = .8f) else color,
                start = position(segment.start),
                end = position(segment.end),
                strokeWidth = (if (segment.isPreview) 2.dp else 3.dp).toPx(),
                cap = StrokeCap.Round,
                pathEffect =
                    if (segment.isPreview)
                        PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 5.dp.toPx()))
                    else null,
            )
        }
        points.forEachIndexed { index, point ->
            if (point != null) {
                val p = position(point)
                drawCircle(Ink, 8.dp.toPx(), p)
                drawCircle(color, 5.dp.toPx(), p)
                if (index == 0 && canCloseArea)
                    drawCircle(color, 18.dp.toPx(), p, style = Stroke(2.dp.toPx()))
                if (frame.selectedPointIndex == index)
                    drawCircle(color, 14.dp.toPx(), p, style = Stroke(2.dp.toPx()))
                paint.textSize = 12.sp.toPx()
                paint.color = android.graphics.Color.WHITE
                paint.setShadowLayer(4.dp.toPx(), 0f, 1f, android.graphics.Color.BLACK)
                drawContext.canvas.nativeCanvas.drawText(
                    "${index + 1}",
                    p.x,
                    p.y - 14.dp.toPx(),
                    paint,
                )
            }
        }
        if (viewingArea.isValid && bottom - top >= 30.dp.toPx()) {
            cameraProjection.segments.forEach { segment ->
                val text = segmentTexts[segment.startIndex] ?: return@forEach
                val mid = (position(segment.start) + position(segment.end)) / 2f
                paint.textSize = 16.sp.toPx()
                paint.color = android.graphics.Color.WHITE
                paint.setShadowLayer(6.dp.toPx(), 0f, 1f, android.graphics.Color.BLACK)
                // Position the label on the visible portion, but retain the complete world
                // length of each segment, including a live/moving-point preview.
                drawContext.canvas.nativeCanvas.drawText(
                    text,
                    mid.x.coerceIn(paint.measureText(text).coerceAtMost(size.width) / 2f,
                        size.width - paint.measureText(text).coerceAtMost(size.width) / 2f),
                    (mid.y - 16.dp.toPx())
                        .coerceAtLeast(top + 22.dp.toPx())
                        .coerceAtMost(bottom - 8.dp.toPx()),
                    paint,
                )
            }
        }
    }
}

@Composable
internal fun PracticeCanvas(
    snapshot: MeasurementSnapshot,
    unit: DistanceUnit,
    snap: Boolean,
    target: Point3D,
    fittingPoints: List<Point3D>,
    onCloseArea: () -> Unit,
    selectedPoint: Int?,
    onSelect: (Int) -> Unit,
    onTap: (Point3D) -> Unit,
) {
    val paint = remember { Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER } }
    BoxWithConstraints(Modifier.fillMaxSize().background(Ink)) {
        val density = androidx.compose.ui.platform.LocalDensity.current
        val widthPx = with(density) { maxWidth.toPx() }
        val heightPx = with(density) { maxHeight.toPx() }
        val bounds = fittingPoints.map { Offset(it.x.toFloat(), (it.z - it.y * .55).toFloat()) }
        val minX = bounds.minOfOrNull { it.x } ?: -2f
        val maxX = bounds.maxOfOrNull { it.x } ?: 2f
        val minY = bounds.minOfOrNull { it.y } ?: -1.5f
        val maxY = bounds.maxOfOrNull { it.y } ?: 1.5f
        val scale =
            minOf(
                widthPx * .76f / (maxX - minX).coerceAtLeast(2f),
                heightPx * .29f / (maxY - minY).coerceAtLeast(2f),
            )
        // The editable plane is XZ; height offsets in samples remain visible in projection.
        val origin =
            Offset(
                widthPx * .5f - (minX + maxX) * .5f * scale,
                heightPx * .405f - (minY + maxY) * .5f * scale,
            )
        fun project(p: Point3D) =
            Offset(origin.x + p.x.toFloat() * scale, origin.y + (p.z - p.y * .55).toFloat() * scale)
        Canvas(
            Modifier.fillMaxSize().semantics { contentDescription = "Practice measurement canvas" }
                .pointerInput(snapshot, snap, scale, selectedPoint) {
                detectTapGestures { tap ->
                    val hit =
                        snapshot.points.indices.lastOrNull { index ->
                            (tap - project(snapshot.points[index])).getDistance() < 28.dp.toPx()
                        }
                    if (hit != null) {
                        if (hit == 0 && snapshot.canCloseArea && selectedPoint == null)
                            onCloseArea()
                        else onSelect(hit)
                        return@detectTapGestures
                    }
                    onTap(
                        Point3D(
                            ((tap.x - origin.x) / scale).toDouble(),
                            0.0,
                            ((tap.y - origin.y) / scale).toDouble(),
                        )
                    )
                }
            }
        ) {
            val spacing = scale * .5f
            for (i in -20..20) {
                val x = origin.x + i * spacing
                val y = origin.y + i * spacing
                drawLine(Color(0xFF26382C), Offset(x, 0f), Offset(x, size.height), 1f)
                drawLine(Color(0xFF26382C), Offset(0f, y), Offset(size.width, y), 1f)
            }
            val points = snapshot.points.map(::project)
            if (snapshot.mode == MeasurementMode.AREA && points.size >= 3) {
                val path =
                    Path().apply {
                        moveTo(points[0].x, points[0].y)
                        points.drop(1).forEach { lineTo(it.x, it.y) }
                        close()
                    }
                drawPath(path, Lime.copy(alpha = if (snapshot.areaClosed) .26f else .18f))
                drawLine(
                    Lime,
                    points.last(),
                    points.first(),
                    3.dp.toPx(),
                    pathEffect =
                        if (snapshot.areaClosed) null
                        else PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 5.dp.toPx())),
                )
            }
            val step = if (snapshot.mode == MeasurementMode.DISTANCE) 2 else 1
            (0 until points.lastIndex step step).forEach { index ->
                drawLine(Lime, points[index], points[index + 1], 3.dp.toPx())
            }
            snapshot.segments.forEach { segment ->
                val mid = (points[segment.startIndex] + points[segment.endIndex]) / 2f
                paint.textSize = 16.sp.toPx()
                paint.color = android.graphics.Color.WHITE
                paint.setShadowLayer(6.dp.toPx(), 0f, 1f, android.graphics.Color.BLACK)
                drawContext.canvas.nativeCanvas.drawText(
                    "${segment.startIndex + 1}–${segment.endIndex + 1}: ${formatDistance(segment.length, unit)}",
                    mid.x, mid.y - 20.dp.toPx(), paint)
            }
            paint.textSize = 12.sp.toPx()
            paint.color = android.graphics.Color.WHITE
            points.forEachIndexed { i, p ->
                drawCircle(Ink, 8.dp.toPx(), p)
                drawCircle(Lime, 5.dp.toPx(), p)
                if (i == 0 && snapshot.canCloseArea && selectedPoint == null)
                    drawCircle(Lime, 18.dp.toPx(), p, style = Stroke(2.dp.toPx()))
                if (i == selectedPoint)
                    drawCircle(Lime, 14.dp.toPx(), p, style = Stroke(3.dp.toPx()))
                drawContext.canvas.nativeCanvas.drawText("${i + 1}", p.x, p.y - 14.dp.toPx(), paint)
            }
            val t = project(target)
            drawCircle(Lime.copy(alpha = .7f), 13.dp.toPx(), t, style = Stroke(1.dp.toPx()))
            paint.color = android.graphics.Color.rgb(178, 189, 181)
            drawContext.canvas.nativeCanvas.drawText(
                "Grid: ${formatDistance(.5, unit)} · ${if (snap) "snap on" else "snap off"}",
                size.width / 2,
                size.height * .24f,
                paint,
            )
        }
    }
}

@Composable
internal fun RulerMark(modifier: Modifier, color: Color) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        drawRoundRect(
            color,
            topLeft = Offset(w * .1f, h * .25f),
            size = androidx.compose.ui.geometry.Size(w * .8f, h * .5f),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(3.dp.toPx()),
            style = Stroke(2.dp.toPx()),
        )
        for (i in 1..4) drawLine(
            color,
            Offset(w * (.1f + i * .16f), h * .25f),
            Offset(w * (.1f + i * .16f), h * if (i % 2 == 0) .5f else .42f),
            2.dp.toPx(),
        )
    }
}

@Composable
internal fun Glyph(name: String, modifier: Modifier, color: Color) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        val stroke = 2.dp.toPx()
        fun line(x: Float, y: Float, x2: Float, y2: Float) =
            drawLine(color, Offset(w * x, h * y), Offset(w * x2, h * y2), stroke)
        when (name) {
            "plus" -> {
                line(.5f, .1f, .5f, .9f)
                line(.1f, .5f, .9f, .5f)
            }
            "clear" -> {
                line(.25f, .25f, .75f, .75f)
                line(.25f, .75f, .75f, .25f)
            }
            "undo" -> {
                line(.12f, .4f, .4f, .12f)
                line(.12f, .4f, .4f, .62f)
                drawArc(
                    color,
                    -130f,
                    260f,
                    false,
                    topLeft = Offset(w * .18f, h * .3f),
                    size = androidx.compose.ui.geometry.Size(w * .65f, h * .6f),
                    style = Stroke(stroke),
                )
            }
            "more" ->
                for (i in 0..2) drawCircle(
                    color,
                    1.7.dp.toPx(),
                    Offset(w * .5f, h * (.2f + i * .3f)),
                )
            "copy" -> {
                drawRect(
                    color,
                    Offset(w * .3f, h * .3f),
                    androidx.compose.ui.geometry.Size(w * .55f, h * .6f),
                    style = Stroke(stroke),
                )
                line(.65f, .1f, .1f, .1f)
                line(.1f, .1f, .1f, .7f)
            }
            "camera" -> {
                drawRoundRect(
                    color,
                    Offset(w * .1f, h * .25f),
                    androidx.compose.ui.geometry.Size(w * .8f, h * .6f),
                    androidx.compose.ui.geometry.CornerRadius(3.dp.toPx()),
                    style = Stroke(stroke),
                )
                drawCircle(color, w * .17f, Offset(w * .5f, h * .55f), style = Stroke(stroke))
                line(.3f, .25f, .4f, .1f)
                line(.4f, .1f, .6f, .1f)
                line(.6f, .1f, .7f, .25f)
            }
            else -> {
                drawCircle(color, w * .38f, Offset(w * .5f, h * .5f), style = Stroke(stroke))
                line(.5f, .25f, .5f, .5f)
                line(.5f, .5f, .7f, .6f)
            }
        }
    }
}
