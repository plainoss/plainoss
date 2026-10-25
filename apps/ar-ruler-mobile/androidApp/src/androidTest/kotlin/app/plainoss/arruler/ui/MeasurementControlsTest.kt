package app.plainoss.arruler.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.LocalContentColor
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.test.captureToImage
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import app.plainoss.arruler.core.AngleUnit
import app.plainoss.arruler.core.DistanceUnit
import app.plainoss.arruler.core.MeasurementMode
import app.plainoss.arruler.core.MeasurementSnapshot
import app.plainoss.arruler.core.Point3D
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class MeasurementControlsTest {
    @get:Rule val compose = createComposeRule()

    private val distance = MeasurementSnapshot(
        points = listOf(Point3D(0.0, 0.0, 0.0), Point3D(1.0, 0.0, 0.0))
    )

    @Test
    fun sheetHeadingRemainsReadableWhenParentContentColorIsBlack() {
        compose.setContent {
            MaterialTheme(colorScheme = RulerColors) {
                CompositionLocalProvider(LocalContentColor provides Color.Black) {
                    Column(Modifier.background(Panel)) {
                        SheetTitle("Your measurements", "Saved on this device")
                    }
                }
            }
        }
        val pixels = compose.onNodeWithText("Your measurements").captureToImage().toPixelMap()
        val hasReadableText = (0 until pixels.height).any { y ->
            (0 until pixels.width).any { x ->
                val pixel = pixels[x, y]
                pixel.red > .8f && pixel.green > .8f && pixel.blue > .8f
            }
        }
        assertTrue("Heading must render light text on the dark panel", hasReadableText)
    }

    @Test
    fun compactResultKeepsSaveVisibleAndRevealsModesAndCopyOnTap() {
        var selectedMode: MeasurementMode? = null
        var saves = 0
        var copies = 0
        compose.setContent {
            var expanded by remember { mutableStateOf(false) }
            MaterialTheme(colorScheme = RulerColors) {
                MetricCard(
                    distance, distance, DistanceUnit.METERS, AngleUnit.DEGREES,
                    hasPreview = false, tracking = true, editing = false,
                    copy = { copies++ }, save = { saves++ }, closeArea = {},
                    selectPoint = {}, cancelMove = {}, expanded = expanded,
                    toggleExpanded = { expanded = !expanded },
                    onModeChange = { selectedMode = it },
                )
            }
        }
        compose.onNodeWithText("Save").assertIsEnabled().performClick()
        compose.onNodeWithText("Path").assertDoesNotExist()
        compose.onNodeWithContentDescription("Copy measurement").assertDoesNotExist()
        compose.onNodeWithText("Distance · Details ▾").performClick()
        compose.onNodeWithContentDescription("Copy measurement").assertIsEnabled().performClick()
        compose.onNodeWithText("Path").performClick()
        compose.runOnIdle {
            assertEquals(1, saves)
            assertEquals(1, copies)
            assertEquals(MeasurementMode.PATH, selectedMode)
        }
        compose.onNodeWithText("Distance · Hide details ▴").performClick()
        compose.onNodeWithText("Path").assertDoesNotExist()
    }

    @Test
    fun selectingPointCollapsesDetailsAndKeepsCancelAvailable() {
        compose.setContent {
            var expanded by remember { mutableStateOf(true) }
            var point by remember { mutableStateOf<Int?>(null) }
            MaterialTheme(colorScheme = RulerColors) {
                MetricCard(
                    distance, distance, DistanceUnit.METERS, AngleUnit.DEGREES,
                    hasPreview = false, tracking = true, editing = point != null,
                    copy = {}, save = {}, closeArea = {}, selectedPoint = point,
                    selectPoint = { point = it; expanded = false },
                    cancelMove = { point = null }, expanded = expanded,
                    toggleExpanded = { expanded = !expanded }, onModeChange = {},
                )
            }
        }
        compose.onNodeWithContentDescription("Move point 2").performClick()
        compose.onNodeWithText("Path").assertDoesNotExist()
        compose.onNodeWithText("Save").assertIsNotEnabled()
        compose.onNodeWithText("Cancel").performClick()
        compose.onNodeWithText("Save").assertIsEnabled()
        compose.onNodeWithText("Cancel").assertDoesNotExist()
    }

    @Test
    fun areaCanBeClosedAndSavedWithoutExpandingDetails() {
        var saves = 0
        compose.setContent {
            var area by remember {
                mutableStateOf(MeasurementSnapshot(
                    mode = MeasurementMode.AREA,
                    points = distance.points + Point3D(1.0, 0.0, 1.0),
                ))
            }
            MaterialTheme(colorScheme = RulerColors) {
                MetricCard(
                    area, area, DistanceUnit.METERS, AngleUnit.DEGREES,
                    hasPreview = false, tracking = true, editing = false,
                    copy = {}, save = { saves++ }, closeArea = { area = area.closeArea() },
                    selectPoint = {}, cancelMove = {}, expanded = false,
                    toggleExpanded = {}, onModeChange = {},
                )
            }
        }
        compose.onNodeWithText("Close area").assertIsEnabled().performClick()
        compose.onNodeWithText("Save").assertIsEnabled().performClick()
        compose.runOnIdle { assertEquals(1, saves) }
    }
}
