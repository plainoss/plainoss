package app.plainoss.arruler.ui

import android.content.Context
import android.content.ContextWrapper
import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.material3.Surface
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.*
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import androidx.test.platform.app.InstrumentationRegistry
import app.plainoss.arruler.MeasurementStore
import app.plainoss.arruler.ar.ArController
import app.plainoss.arruler.ar.ArFrame
import app.plainoss.arruler.core.*
import java.io.File
import java.util.UUID
import org.json.JSONArray
import org.junit.After
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class MeasurementHistoryTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val target = InstrumentationRegistry.getInstrumentation().targetContext
    private val key = "history-test-${UUID.randomUUID()}"
    private val directory = File(target.cacheDir, key)
    private val context = object : ContextWrapper(target) {
        override fun getSharedPreferences(name: String, mode: Int) = target.getSharedPreferences(key, mode)
        override fun getNoBackupFilesDir() = directory
    }
    private val store = MeasurementStore(context)
    private fun record(id: String = UUID.randomUUID().toString(), photo: Boolean = false) = MeasurementRecord(
        id, 1234L, MeasurementMode.DISTANCE, 1.0, DistanceUnit.METERS, AngleUnit.DEGREES,
        listOf(Point3D(0.0, 0.0, 0.0), Point3D(1.0, 0.0, 0.0)), "Desk", photo)

    @After fun cleanUp() {
        target.getSharedPreferences(key, Context.MODE_PRIVATE).edit().clear().commit()
        directory.deleteRecursively()
    }

    @Test fun defaultLimitEvictsOldestAndDeletesItsPhoto() {
        assertEquals(20, store.historyLimit)
        val old = record(photo = true)
        val bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888)
        try { store.writePhoto(old.id, bitmap) } finally { bitmap.recycle() }
        store.saveHistory(listOf(old))
        assertNotNull(store.loadPhoto(old.id, 32))
        val latest = List(20) { record() }
        assertEquals(latest, store.saveHistory(latest + old))
        assertNull(store.loadPhoto(old.id, 32))
        assertEquals(latest, MeasurementStore(context).loadHistory())
    }

    @Test fun renameRetainsPhotoAndClearKeepsSettings() {
        val entry = record(photo = true)
        val bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888)
        try { store.writePhoto(entry.id, bitmap) } finally { bitmap.recycle() }
        store.saveHistory(listOf(entry), 50)
        store.unit = DistanceUnit.FEET
        store.saveHistory(listOf(entry.copy(label = "Dining table")))
        assertEquals("Dining table", MeasurementStore(context).loadHistory().single().label)
        assertNotNull(store.loadPhoto(entry.id, 32))
        store.saveHistory(emptyList())
        assertTrue(store.loadHistory().isEmpty())
        assertNull(store.loadPhoto(entry.id, 32))
        assertEquals(50, MeasurementStore(context).historyLimit)
        assertEquals(DistanceUnit.FEET, store.unit)
    }

    @Test fun legacyHistoryIsPreservedUntilLimitChosenAndMissingPhotoDefaultsFalse() {
        val entries = List(30) { record() }
        store.saveHistory(entries, 50)
        val preferences = context.getSharedPreferences("ar-ruler", Context.MODE_PRIVATE)
        val json = JSONArray(preferences.getString("history", "[]"))
        for (index in 0 until json.length()) json.getJSONObject(index).remove("hasPhoto")
        preferences.edit().remove("historyLimit").putString("history", json.toString()).commit()
        val migrated = MeasurementStore(context)
        assertTrue(migrated.needsHistoryLimitChoice)
        assertEquals(30, migrated.loadHistory().size)
        assertFalse(migrated.loadHistory().first().hasPhoto)
        val renamed = migrated.loadHistory().mapIndexed { index, entry ->
            if (index == 0) entry.copy(label = "Legacy desk") else entry
        }
        assertEquals(30, migrated.saveHistory(renamed).size)
        assertTrue(migrated.needsHistoryLimitChoice)
        assertEquals(renamed.take(20), migrated.saveHistory(migrated.loadHistory(), 20))
        assertFalse(migrated.needsHistoryLimitChoice)
    }

    @Test fun changingCapacityRetainsOnlyLatestAndCleansOrphans() {
        val entries = List(55) { record() }
        store.saveHistory(entries, 100)
        val orphanDirectory = File(directory, "measurement-photos").apply { mkdirs() }
        File(orphanDirectory, "interrupted.tmp").writeText("partial")
        assertEquals(entries.take(50), store.saveHistory(entries, 50))
        assertFalse(File(orphanDirectory, "interrupted.tmp").exists())
        assertEquals(50, MeasurementStore(context).historyLimit)
    }

    @Test fun photoCorrectsGlOrientationAndDrawsProjectedMarkersForEveryMode() {
        val width = 320
        val height = 480
        val bytes = ByteArray(width * height * 4)
        for (y in 0 until height) for (x in 0 until width) {
            val offset = (y * width + x) * 4
            bytes[offset + if (y >= height / 2) 0 else 2] = 255.toByte()
            bytes[offset + 3] = 255.toByte()
        }
        MeasurementMode.entries.forEach { mode ->
            val frame = ArFrame(width = width, height = height, tracking = true, mode = mode,
                clipPoints = listOf(ClipPoint(-.5, .5, 0.0, 1.0), ClipPoint(.5, .5, 0.0, 1.0),
                    ClipPoint(0.0, -.25, 0.0, 1.0)), areaClosed = mode == MeasurementMode.AREA)
            val bitmap = measurementPhoto(ArController.Capture(frame, bytes), record().copy(mode = mode), Density(1f))
            try {
                assertEquals("Top should be red, not GL's bottom blue", Color.RED, bitmap.getPixel(10, 10))
                assertEquals(Color.BLUE, bitmap.getPixel(10, 300))
                val marker = bitmap.getPixel(80, 120)
                assertTrue("Projected marker should align at (80,120) in $mode", Color.green(marker) > 220 && Color.blue(marker) > 100)
                assertNotEquals("Result footer must be drawn", Color.BLUE, bitmap.getPixel(10, 470))
            } finally { bitmap.recycle() }
        }
    }

    @Test fun photoPreviewOpensAnEnlargedImage() {
        val entry = record(photo = true)
        val bitmap = Bitmap.createBitmap(320, 480, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(Color.rgb(70, 90, 110))
        android.graphics.Canvas(bitmap).drawLine(60f, 160f, 260f, 160f,
            android.graphics.Paint().apply { color = Color.GREEN; strokeWidth = 5f })
        try { store.writePhoto(entry.id, bitmap) } finally { bitmap.recycle() }
        store.saveHistory(listOf(entry))
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                Surface(color = Panel, contentColor = MaterialTheme.colorScheme.onSurface) {
                    HistorySheet(listOf(entry), store, 20, { _, _ -> }, {}, {}, {}, {})
                }
            }
        }
        compose.waitUntil(5_000) {
            compose.onAllNodesWithContentDescription("Desk: ${entry.formatted}").fetchSemanticsNodes().isNotEmpty()
        }
        val outputDirectory = InstrumentationRegistry.getArguments().getString("additionalTestOutputDir")
        val output = File(outputDirectory?.let { File(it).apply { mkdirs() } } ?: target.getExternalFilesDir(null), "history-preview.png")
        output.outputStream().use {
            compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG, 100, it)
        }
        compose.onNodeWithContentDescription("Desk: ${entry.formatted}").performClick()
        compose.onNodeWithText("Close photo").assertExists().performClick()
        compose.onNodeWithText("Close photo").assertDoesNotExist()
    }

    @Test fun loweringLimitRequiresConfirmationAndClearRemovesAllRecords() {
        store.saveHistory(List(30) { record() }, 50)
        val controller = ArController(compose.activity)
        compose.setContent {
            RulerApp(controller, ArFrame(), store, cameraGranted = true, cameraError = null,
                practiceEnabled = true, onPermissionResult = {}, onPracticeChange = {}, onRetryCamera = {})
        }
        compose.onNodeWithContentDescription("Settings and help").performClick()
        compose.onNodeWithText("20", useUnmergedTree = true).performScrollTo().performClick()
        compose.onNodeWithText("Keep the latest 20 measurements?").assertExists()
        compose.onNodeWithText("Cancel").performClick()
        assertEquals(30, store.loadHistory().size)
        compose.onNodeWithText("20", useUnmergedTree = true).performClick()
        compose.onNodeWithText("Delete older records").performClick()
        compose.waitUntil(5_000) { store.loadHistory().size == 20 }
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(android.view.KeyEvent.KEYCODE_BACK)
        compose.onNodeWithContentDescription("Saved measurements").performClick()
        compose.onNodeWithText("Clear history").performClick()
        compose.onNodeWithText("Clear saved measurements?").assertExists()
        compose.onNodeWithText("Cancel").performClick()
        assertEquals(20, store.loadHistory().size)
        compose.onNodeWithText("Clear history").performClick()
        compose.onAllNodesWithText("Clear history").onLast().performClick()
        compose.waitUntil(5_000) { store.loadHistory().isEmpty() }
        assertEquals(20, store.historyLimit)
        compose.runOnIdle { controller.destroy() }
    }

    @Test fun historyRenameDialogAndClearActionAreAvailable() {
        var renamed = ""
        var cleared = false
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                HistorySheet(listOf(record()), store, 20, { _, name -> renamed = name }, {}, {}, {}, { cleared = true })
            }
        }
        compose.onNodeWithText("No photo saved").assertExists()
        compose.onNodeWithText("Rename").performClick()
        compose.onNodeWithText("Name").performTextReplacement("Kitchen counter")
        compose.onNodeWithText("Save name").performClick()
        assertEquals("Kitchen counter", renamed)
        compose.onNodeWithText("Clear history").performClick()
        assertTrue(cleared)
    }
}
