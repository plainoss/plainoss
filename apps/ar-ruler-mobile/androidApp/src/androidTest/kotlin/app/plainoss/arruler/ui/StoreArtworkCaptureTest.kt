package app.plainoss.arruler.ui

import android.graphics.Bitmap
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import app.plainoss.arruler.core.*
import java.io.File
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test

/** Opt-in artwork capture of production composables; fixtures are labelled as examples in the artwork. */
class StoreArtworkCaptureTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun captureNativeComponents() {
        assumeTrue(InstrumentationRegistry.getArguments().getString("storeArtwork") == "true")
        val distance = MeasurementSnapshot(points = listOf(Point3D(0.0, 0.0, 0.0), Point3D(0.91, 0.0, 0.0)))
        val area = MeasurementSnapshot(MeasurementMode.AREA, listOf(
            Point3D(0.0, 0.0, 0.0), Point3D(3.0, 0.0, 0.0),
            Point3D(3.0, 0.0, 4.0), Point3D(0.0, 0.0, 4.0),
        ), areaClosed = true)
        var screen by mutableIntStateOf(0)
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                Surface(Modifier.fillMaxWidth().wrapContentHeight().testTag("artwork"), color = Panel) {
                    when (screen) {
                        0, 1 -> Column(Modifier.padding(16.dp)) {
                            val snapshot = if (screen == 0) distance else area
                            MetricCard(snapshot, snapshot, DistanceUnit.METERS, AngleUnit.DEGREES,
                                hasPreview = false, tracking = true, editing = false,
                                copy = {}, save = {}, closeArea = {}, selectPoint = {}, cancelMove = {},
                                expanded = screen == 1, toggleExpanded = {}, onModeChange = {},
                                detailsMaxHeight = 500.dp)
                            CaptureRow(snapshot, canAdd = true, practice = false, add = {}, undo = {}, clear = {})
                        }
                        2 -> Column(Modifier.padding(vertical = 24.dp)) {
                            HistorySheet(listOf(
                                record("1", MeasurementMode.DISTANCE, 0.91, distance.points, "Example · window"),
                                record("2", MeasurementMode.AREA, 12.0, area.points, "Example · room"),
                                record("3", MeasurementMode.ANGLE, 90.0, listOf(
                                    Point3D(1.0, 0.0, 0.0), Point3D(0.0, 0.0, 0.0), Point3D(0.0, 0.0, 1.0)
                                ), "Example · corner"),
                            ), copy = {}, share = {}, onDelete = {}, onClear = {})
                        }
                        3 -> MeasurementUnitsSheet(DistanceUnit.METERS) {}
                    }
                }
            }
        }
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "store-artwork").apply { mkdirs() }
        listOf("compact", "area", "history", "units").forEachIndexed { index, name ->
            compose.runOnIdle { screen = index }
            compose.waitForIdle()
            val bitmap = compose.onNodeWithTag("artwork").captureToImage().asAndroidBitmap()
            File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        }
    }

    private fun record(id: String, mode: MeasurementMode, value: Double, points: List<Point3D>, label: String) =
        MeasurementRecord(id, 1792918800000L, mode, value, DistanceUnit.METERS, AngleUnit.DEGREES, points, label)
}
