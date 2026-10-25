package app.plainoss.arruler.ar

import app.plainoss.arruler.core.ClipPoint
import app.plainoss.arruler.core.MeasurementMode
import app.plainoss.arruler.core.Point3D

/** Coordinates in the camera viewport's physical pixels, with the origin at its top left. */
data class ScreenPoint(val x: Float, val y: Float, val visible: Boolean = true)

/** An immutable snapshot; no ARCore or OpenGL objects cross over to the UI thread. */
data class ArFrame(
    val points: List<Point3D> = emptyList(),
    val projectedPoints: List<ScreenPoint> = emptyList(),
    val target: Point3D? = null,
    val targetScreen: ScreenPoint? = null,
    val tracking: Boolean = false,
    val status: String = "Starting camera…",
    val width: Int = 0,
    val height: Int = 0,
    val anchorsTracking: Boolean = true,
    val selectedPointIndex: Int? = null,
    /** The mode when the GL thread produced these points; null before the first camera frame. */
    val mode: MeasurementMode? = null,
    /** Tracked endpoints before perspective divide, including endpoints outside the viewport. */
    val clipPoints: List<ClipPoint?> = emptyList(),
    val targetClipPoint: ClipPoint? = null,
    /** True only after the user explicitly closes an area with at least three tracked corners. */
    val areaClosed: Boolean = false,
)
