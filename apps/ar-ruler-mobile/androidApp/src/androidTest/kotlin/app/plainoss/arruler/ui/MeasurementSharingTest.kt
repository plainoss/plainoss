package app.plainoss.arruler.ui

import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.core.content.FileProvider
import androidx.test.platform.app.InstrumentationRegistry
import app.plainoss.arruler.ar.ArController
import app.plainoss.arruler.ar.ArFrame
import app.plainoss.arruler.MeasurementStore
import app.plainoss.arruler.measurementImageShareIntent
import app.plainoss.arruler.core.*
import java.io.File
import java.util.UUID
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

class MeasurementSharingTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val target = InstrumentationRegistry.getInstrumentation().targetContext
    private val key = "sharing-test-${UUID.randomUUID()}"
    private val directory = File(target.cacheDir, key)
    private val shares = File(target.cacheDir, "measurement-shares")
    private val context = object : ContextWrapper(target) {
        override fun getSharedPreferences(name: String, mode: Int) = target.getSharedPreferences(key, mode)
        override fun getNoBackupFilesDir() = directory
    }
    private val store = MeasurementStore(context)
    private val record = MeasurementRecord(UUID.randomUUID().toString(), 1L, MeasurementMode.DISTANCE,
        3.0, DistanceUnit.METERS, AngleUnit.DEGREES,
        listOf(Point3D.ZERO, Point3D(3.0, 0.0, 0.0)), "Kitchen counter", hasPhoto = true)

    @After fun cleanUp() {
        target.getSharedPreferences(key, Context.MODE_PRIVATE).edit().clear().commit()
        directory.deleteRecursively()
        shares.deleteRecursively()
    }

    private fun savePhoto() {
        val bitmap = Bitmap.createBitmap(64, 48, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(android.graphics.Color.GREEN)
        try { store.saveMeasurement(record, bitmap, emptyList(), 20) } finally { bitmap.recycle() }
    }

    @Suppress("DEPRECATION")
    @Test fun shareIntentProvidesTheExactSavedJpegWithReadOnlyAccessAndCaption() {
        savePhoto()
        val intent = measurementImageShareIntent(target, store, record)
        assertEquals(Intent.ACTION_SEND, intent.action)
        assertEquals("image/jpeg", intent.type)
        val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)!!
        assertEquals("content", uri.scheme)
        assertEquals("${target.packageName}.measurement-images", uri.authority)
        assertEquals(uri, intent.clipData!!.getItemAt(0).uri)
        assertEquals(Intent.FLAG_GRANT_READ_URI_PERMISSION, intent.flags)
        assertEquals(record.label, intent.getStringExtra(Intent.EXTRA_SUBJECT))
        assertTrue(intent.getStringExtra(Intent.EXTRA_TEXT)!!.contains(record.formatted))
        val savedBytes = File(directory, "measurement-photos/${record.id}.jpg").readBytes()
        val sharedBytes = target.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
        assertArrayEquals("Share the saved overlay image without re-encoding", savedBytes, sharedBytes)
        assertEquals("image/jpeg", target.contentResolver.getType(uri))
        val decoded = BitmapFactory.decodeByteArray(sharedBytes, 0, sharedBytes.size)
        assertEquals(64, decoded.width)
        assertEquals(48, decoded.height)
        decoded.recycle()
        val chooser = Intent.createChooser(intent, "Share measurement photo")
        assertEquals(Intent.ACTION_CHOOSER, chooser.action)
        assertTrue(chooser.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
        assertEquals(uri, chooser.clipData!!.getItemAt(0).uri)
    }

    @Suppress("DEPRECATION")
    @Test fun preparedShareSurvivesHistoryDeletionAndOnlyOldCopiesAreExpired() {
        savePhoto()
        val first = measurementImageShareIntent(target, store, record).getParcelableExtra<Uri>(Intent.EXTRA_STREAM)!!
        val freshFile = shares.listFiles()!!.single()
        val expired = File(shares, "expired.jpg").apply {
            writeText("old shared copy")
            setLastModified(System.currentTimeMillis() - TimeUnit.DAYS.toMillis(2))
        }
        measurementImageShareIntent(target, store, record)
        assertFalse(expired.exists())
        assertTrue("Do not remove a recently prepared share", freshFile.exists())
        store.saveHistory(emptyList())
        assertFalse(File(directory, "measurement-photos/${record.id}.jpg").exists())
        val bytes = target.contentResolver.openInputStream(first)!!.use { it.readBytes() }
        assertTrue("The recipient can finish opening an image after deletion", bytes.isNotEmpty())
    }

    @Suppress("DEPRECATION")
    @Test fun providerExposesOnlyTheDedicatedShareCache() {
        val provider = target.packageManager.resolveContentProvider("${target.packageName}.measurement-images", 0)!!
        assertFalse(provider.exported)
        assertTrue(provider.grantUriPermissions)
        for (unrelated in listOf(File(target.filesDir, "private.txt"), File(target.cacheDir, "unrelated.jpg"))) {
            try {
                FileProvider.getUriForFile(target, "${target.packageName}.measurement-images", unrelated)
                fail("Files outside the share directory must not be exposed")
            } catch (_: IllegalArgumentException) { /* Expected: no provider root covers this file. */ }
        }
    }

    @Test fun missingPhotosFailWithoutLeavingAnEmptyShareAndLegacyRecordsRemainTextOnly() {
        savePhoto()
        File(directory, "measurement-photos/${record.id}.jpg").delete()
        assertTrue(runCatching { measurementImageShareIntent(target, store, record) }.isFailure)
        assertTrue(shares.listFiles().orEmpty().isEmpty())
        val legacy = record.copy(hasPhoto = false)
        assertTrue(runCatching { measurementImageShareIntent(target, store, legacy) }.isFailure)
        var sharedText = ""
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                Surface(color = Panel) {
                    HistorySheet(listOf(legacy), store, 20, { _, _ -> }, {}, { sharedText = it }, {}, {})
                }
            }
        }
        compose.onNodeWithText("Share photo").assertDoesNotExist()
        compose.onNodeWithText("Share text").performClick()
        assertTrue(sharedText.contains(record.formatted))
    }

    @Test fun missingPhotoShowsAnErrorAboveTheHistorySheet() {
        savePhoto()
        File(directory, "measurement-photos/${record.id}.jpg").delete()
        val controller = ArController(compose.activity)
        try {
            compose.setContent {
                RulerApp(controller, ArFrame(), store, cameraGranted = true, cameraError = null,
                    practiceEnabled = true, onPermissionResult = {}, onPracticeChange = {}, onRetryCamera = {})
            }
            compose.onNodeWithContentDescription("Saved measurements").performClick()
            compose.onNodeWithText("Share photo").performClick()
            compose.waitUntil(5_000) {
                compose.onAllNodesWithText("Could not share photo").fetchSemanticsNodes().isNotEmpty()
            }
            compose.onNodeWithText("Could not share photo").assertIsDisplayed()
            compose.onNodeWithText("OK").performClick()
            assertEquals(listOf(record), store.loadHistory())
        } finally { compose.runOnIdle { controller.destroy() } }
    }

    @Test fun photosCanBeSharedFromBothHistoryAndTheEnlargedViewer() {
        savePhoto()
        var shared = 0
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                Surface(color = Panel) {
                    HistorySheet(listOf(record), store, 20, { _, _ -> }, {}, {}, {}, {},
                        sharePhoto = { assertEquals(record, it); shared++ })
                }
            }
        }
        compose.onNodeWithText("Share photo").performClick()
        assertEquals(1, shared)
        compose.waitUntil(5_000) {
            compose.onAllNodesWithContentDescription("${record.label}: ${record.formatted}").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithContentDescription("${record.label}: ${record.formatted}").performClick()
        compose.onAllNodesWithText("Share photo").onLast().performClick()
        assertEquals(2, shared)
        compose.onNodeWithText("Close photo").performClick()
    }
}
