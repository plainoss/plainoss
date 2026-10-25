package app.plainoss.arruler.ui

import android.content.Context
import android.content.ContextWrapper
import android.graphics.Bitmap
import android.graphics.Color
import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.test.platform.app.InstrumentationRegistry
import app.plainoss.arruler.MeasurementStore
import app.plainoss.arruler.ar.ArController
import app.plainoss.arruler.ar.ArFrame
import app.plainoss.arruler.core.*
import java.io.File
import java.util.UUID
import org.junit.After
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class MultipleMeasurementsTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val target = InstrumentationRegistry.getInstrumentation().targetContext
    private val key = "multiple-test-${UUID.randomUUID()}"
    private val directory = File(target.cacheDir, key)
    private val context = object : ContextWrapper(target) {
        override fun getSharedPreferences(name: String, mode: Int) = target.getSharedPreferences(key, mode)
        override fun getNoBackupFilesDir() = directory
    }
    private val store = MeasurementStore(context)

    @After fun cleanUp() {
        target.getSharedPreferences(key, Context.MODE_PRIVATE).edit().clear().commit()
        directory.deleteRecursively()
    }

    @Test fun addingTwoIndependentDistancesSavesBothAndUndoRestoresThePreviousPair() {
        val controller = ArController(compose.activity)
        try {
            compose.setContent {
                RulerApp(controller, ArFrame(), store, cameraGranted = true, cameraError = null,
                    practiceEnabled = true, onPermissionResult = {}, onPracticeChange = {}, onRetryCamera = {})
            }
            fun place(x: Float, y: Float) {
                compose.onNodeWithContentDescription("Practice measurement canvas").performTouchInput {
                    click(Offset(width * x, height * y))
                }
            }
            place(.25f, .35f)
            place(.75f, .35f)
            compose.onNodeWithText("Save").assertIsEnabled()
            place(.25f, .55f)
            compose.onNodeWithText("Save").assertIsNotEnabled()
            place(.75f, .55f)
            compose.onNodeWithText("2 distances").assertExists()
            compose.onNodeWithText("Save").assertIsEnabled()
            compose.onNodeWithContentDescription("Undo last point").performClick()
            compose.onNodeWithText("Save").assertIsNotEnabled()
            compose.onNodeWithContentDescription("Undo last point").performClick()
            compose.onNodeWithText("Save").assertIsEnabled()
            place(.25f, .55f)
            place(.75f, .55f)
            compose.onNodeWithText("Save").performClick()
            compose.waitUntil(5_000) { store.loadHistory().size == 1 }
            val entry = MeasurementStore(context).loadHistory().single()
            assertEquals(4, entry.points.size)
            assertEquals(2, measuredSegments(entry.mode, entry.points).size)
            assertTrue(entry.formatted.startsWith("1: "))
            assertTrue(entry.formatted.contains(" · 2: "))
            compose.onNodeWithContentDescription("Clear measurement").performClick()
            compose.onNodeWithText("Save").assertIsNotEnabled()
        } finally { compose.runOnIdle { controller.destroy() } }
    }

    @Test fun pathPanelShowsTotalWhileExpandedDetailsShowEachSegment() {
        val path = MeasurementSnapshot(MeasurementMode.PATH,
            listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0), Point3D(3.0, 4.0, 0.0)))
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                MetricCard(path, path, DistanceUnit.METERS, AngleUnit.DEGREES,
                    hasPreview = false, tracking = true, editing = false, copy = {}, save = {},
                    closeArea = {}, selectPoint = {}, cancelMove = {}, expanded = true,
                    toggleExpanded = {}, onModeChange = {})
            }
        }
        compose.onNodeWithText("Path · total", substring = true).assertExists()
        compose.onNodeWithText("7 m").assertExists()
        compose.onNodeWithText("1–2  3 m").assertExists()
        compose.onNodeWithText("2–3  4 m").assertExists()
    }

    @Test fun photosContainEverySegmentLabelWithoutConnectingSeparateDistances() {
        val width = 800
        val height = 600
        val rgba = ByteArray(width * height * 4) { if (it % 4 == 3) 255.toByte() else 20.toByte() }
        val distancePoints = listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0),
            Point3D(10.0, 0.0, 0.0), Point3D(10.0, 4.0, 0.0))
        for (mode in listOf(MeasurementMode.DISTANCE, MeasurementMode.PATH)) {
            val points = if (mode == MeasurementMode.DISTANCE) distancePoints else listOf(
                Point3D.ZERO, Point3D(3.0, 0.0, 0.0), Point3D(3.0, 4.0, 0.0))
            val clipPoints = if (mode == MeasurementMode.DISTANCE) listOf(
                ClipPoint(-.6, .5, 0.0, 1.0), ClipPoint(.6, .5, 0.0, 1.0),
                ClipPoint(-.6, -.3, 0.0, 1.0), ClipPoint(.6, -.3, 0.0, 1.0)) else listOf(
                ClipPoint(-.8, .5, 0.0, 1.0), ClipPoint(-.1, .5, 0.0, 1.0), ClipPoint(.8, .5, 0.0, 1.0))
            val snapshot = MeasurementSnapshot(mode, points)
            val record = MeasurementRecord(UUID.randomUUID().toString(), 1L, mode, snapshot.value,
                DistanceUnit.METERS, AngleUnit.DEGREES, points, hasPhoto = true)
            val frame = ArFrame(points = points, tracking = true, width = width, height = height,
                mode = mode, clipPoints = clipPoints)
            val bitmap = measurementPhoto(ArController.Capture(frame, rgba), record, Density(1f))
            try {
                fun assertWhiteLabel(centerX: Int, baseline: Int) {
                    val pixels = (baseline - 20 until baseline).sumOf { y ->
                        (centerX - 65..centerX + 65).count { x ->
                            val pixel = bitmap.getPixel(x, y)
                            Color.red(pixel) > 220 && Color.green(pixel) > 220 && Color.blue(pixel) > 220
                        }
                    }
                    assertTrue("Expected a readable segment label in $mode at ($centerX,$baseline)", pixels > 20)
                }
                if (mode == MeasurementMode.DISTANCE) {
                    assertWhiteLabel(400, 135)
                    assertWhiteLabel(400, 375)
                    assertEquals("Independent distances must not be joined", Color.rgb(20, 20, 20), bitmap.getPixel(400, 270))
                } else {
                    assertWhiteLabel(220, 135)
                    assertWhiteLabel(540, 135)
                    assertEquals(7.0, record.value, 0.0)
                }
                store.saveMeasurement(record, bitmap, store.loadHistory(), 20)
                assertEquals(points, MeasurementStore(context).loadHistory().first().points)
                val outputDirectory = InstrumentationRegistry.getArguments().getString("additionalTestOutputDir")
                if (outputDirectory != null) {
                    val output = File(outputDirectory, "${mode.name.lowercase()}-segments.png")
                    output.parentFile?.mkdirs()
                    output.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
                }
            } finally { bitmap.recycle() }
        }
    }
}
