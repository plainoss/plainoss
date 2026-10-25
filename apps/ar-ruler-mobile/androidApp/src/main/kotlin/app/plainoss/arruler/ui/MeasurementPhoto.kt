package app.plainoss.arruler.ui

import android.graphics.Bitmap
import androidx.core.graphics.createBitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Canvas as ComposeCanvas
import androidx.compose.ui.graphics.drawscope.CanvasDrawScope
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import app.plainoss.arruler.ar.ArController
import app.plainoss.arruler.core.*
import kotlin.math.roundToInt

/** Convert GL's bottom-up RGBA buffer, then draw exactly the same geometry as the live overlay. */
internal fun measurementPhoto(capture: ArController.Capture, record: MeasurementRecord, density: Density): Bitmap {
    val frame = capture.frame
    val scale = minOf(1f, 1600f / maxOf(frame.width, frame.height))
    val width = (frame.width * scale).roundToInt().coerceAtLeast(1)
    val height = (frame.height * scale).roundToInt().coerceAtLeast(1)
    val bitmap = createBitmap(width, height)
    try {
        val row = IntArray(width)
        for (y in 0 until height) {
            val sourceY = frame.height - 1 - (y / scale).toInt().coerceAtMost(frame.height - 1)
            for (x in 0 until width) {
                val offset = (sourceY * frame.width + (x / scale).toInt().coerceAtMost(frame.width - 1)) * 4
                val bytes = capture.rgba
                row[x] = Color.rgb(bytes[offset].toInt() and 255,
                    bytes[offset + 1].toInt() and 255, bytes[offset + 2].toInt() and 255)
            }
            bitmap.setPixels(row, 0, width, 0, y, width, 1)
        }
        val projection = projectMeasurement(record.mode, frame.clipPoints, frame.width, frame.height,
            areaClosed = frame.areaClosed)
        val area = ViewportRect(0.0, 0.0, frame.width.toDouble(), frame.height.toDouble())
        CanvasDrawScope().draw(Density(density.density * scale, density.fontScale), LayoutDirection.Ltr,
            ComposeCanvas(Canvas(bitmap)), Size(width.toFloat(), height.toFloat())) {
            drawMeasurement(frame, record.mode, projection, projection, area,
                if (record.mode == MeasurementMode.DISTANCE) record.formatted else null,
                frame.areaClosed, false, Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER })
        }
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.textSize = (width * .045f).coerceIn(18f, 48f)
        val footer = paint.textSize * 2.5f
        paint.color = Color.argb(200, 10, 20, 15)
        canvas.drawRect(0f, height - footer, width.toFloat(), height.toFloat(), paint)
        paint.color = Color.WHITE
        canvas.drawText("${record.mode.label}: ${record.formatted}", paint.textSize * .5f,
            height - paint.textSize * .8f, paint)
        return bitmap
    } catch (error: Throwable) {
        bitmap.recycle()
        throw error
    }
}
