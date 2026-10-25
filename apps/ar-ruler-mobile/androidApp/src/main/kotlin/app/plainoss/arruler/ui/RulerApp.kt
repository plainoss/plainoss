@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package app.plainoss.arruler.ui

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.net.toUri
import app.plainoss.arruler.BuildConfig
import app.plainoss.arruler.MeasurementStore
import app.plainoss.arruler.ar.ArController
import app.plainoss.arruler.ar.ArFrame
import app.plainoss.arruler.core.*
import java.util.UUID
import kotlinx.coroutines.launch

@Composable
fun RulerApp(
    controller: ArController,
    frame: ArFrame,
    store: MeasurementStore,
    cameraGranted: Boolean,
    cameraError: String?,
    practiceEnabled: Boolean,
    onPermissionResult: (Boolean) -> Unit,
    onPracticeChange: (Boolean) -> Unit,
    onRetryCamera: () -> Unit,
) {
    val practice = BuildConfig.DEBUG && practiceEnabled
    MaterialTheme(colorScheme = RulerColors) {
        val context = LocalContext.current
        val haptics = LocalHapticFeedback.current
        val scope = rememberCoroutineScope()
        val snackbar = remember { SnackbarHostState() }
        var mode by rememberSaveable { mutableStateOf(MeasurementMode.DISTANCE) }
        var unit by remember { mutableStateOf(store.unit) }
        var angleUnit by remember { mutableStateOf(store.angleUnit) }
        var history by remember { mutableStateOf(store.loadHistory()) }
        var practiceSnapshot by remember { mutableStateOf(MeasurementSnapshot(mode)) }
        var practiceSelectedPoint by remember { mutableStateOf<Int?>(null) }
        var practiceBounds by remember { mutableStateOf<List<Point3D>>(emptyList()) }
        var practiceTarget by remember { mutableStateOf(Point3D(0.0, 0.0, 0.0)) }
        var snap by rememberSaveable { mutableStateOf(true) }
        var sheet by rememberSaveable { mutableStateOf<String?>(null) }
        var showClearHistory by remember { mutableStateOf(false) }
        var viewportSize by remember { mutableStateOf(IntSize.Zero) }
        var cameraTop by remember { mutableFloatStateOf(0f) }
        var cameraBottom by remember { mutableFloatStateOf(Float.MAX_VALUE) }
        var instructionTop by remember { mutableFloatStateOf(Float.MAX_VALUE) }
        var permissionAttempted by remember { mutableStateOf(store.permissionAsked) }
        val permission =
            rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted
                ->
                permissionAttempted = true
                onPermissionResult(granted)
            }
        fun requestCamera() {
            store.permissionAsked = true
            permission.launch(Manifest.permission.CAMERA)
        }
        LaunchedEffect(Unit) {
            if (!cameraGranted && !store.permissionAsked) requestCamera()
        }
        LaunchedEffect(mode) { controller.mode = mode }
        val snapshot =
            if (practice) practiceSnapshot
            else
                MeasurementSnapshot(
                    mode,
                    if (frame.mode == mode) frame.points else emptyList(),
                    areaClosed = frame.mode == mode && frame.areaClosed,
                )
        val canMeasure =
            practice ||
                (cameraGranted &&
                    cameraError == null &&
                    frame.mode == mode &&
                    frame.tracking &&
                    frame.anchorsTracking)
        val target = if (practice) practiceTarget else frame.target
        val selectedPoint = if (practice) practiceSelectedPoint else frame.selectedPointIndex
        val preview =
            if (!practice && selectedPoint != null && target != null && canMeasure) {
                snapshot.movePoint(selectedPoint, target)
            } else if (
                !practice &&
                    !snapshot.isComplete &&
                    snapshot.points.isNotEmpty() &&
                    target != null &&
                    canMeasure
            ) {
                snapshot.addPoint(target)
            } else snapshot
        val hasPreview = preview != snapshot
        val viewportScaleY =
            if (viewportSize.height > 0) frame.height.toDouble() / viewportSize.height else 1.0
        val portraitGuidanceVisible =
            viewportSize.height >= viewportSize.width &&
                cameraGranted &&
                cameraError == null &&
                !practice
        val unobscuredBottom =
            if (portraitGuidanceVisible) minOf(cameraBottom, instructionTop) else cameraBottom
        // Draw across the full camera viewport, beneath the UI. The exposed camera area is only
        // for guidance, hit testing, and readable label placement; it never shortens drawn lines.
        val viewingArea =
            ViewportRect(
                0.0,
                cameraTop * viewportScaleY,
                frame.width.toDouble(),
                minOf(unobscuredBottom * viewportScaleY, frame.height.toDouble()),
            )
        val minimumLineLength = with(LocalDensity.current) { 6.dp.toPx().toDouble() }
        val overlayProjection =
            remember(frame, mode, hasPreview, minimumLineLength) {
                projectMeasurement(
                    mode = mode,
                    points = if (frame.mode == mode) frame.clipPoints else emptyList(),
                    width = frame.width,
                    height = frame.height,
                    target = if (frame.mode == mode) frame.targetClipPoint else null,
                    preview = hasPreview,
                    selectedPointIndex = selectedPoint,
                    minimumLengthPixels = minimumLineLength,
                    areaClosed = snapshot.areaClosed,
                )
            }
        val cameraProjection =
            remember(frame, mode, hasPreview, viewingArea, minimumLineLength) {
                projectMeasurement(
                    mode = mode,
                    points = if (frame.mode == mode) frame.clipPoints else emptyList(),
                    width = frame.width,
                    height = frame.height,
                    target = if (frame.mode == mode) frame.targetClipPoint else null,
                    preview = hasPreview,
                    selectedPointIndex = selectedPoint,
                    viewingArea = viewingArea,
                    minimumLengthPixels = minimumLineLength,
                    areaClosed = snapshot.areaClosed,
                )
            }
        val measurementNotice =
            when {
                practice || snapshot.points.isEmpty() -> null
                !canMeasure ->
                    if (snapshot.isReady) "Tracking paused · showing last measurement"
                    else "Tracking paused · aim back at the point"
                overlayProjection.isOutsideView -> "Line outside view · aim back at your points"
                cameraProjection.isOutsideView -> "Line behind controls · aim back at your points"
                overlayProjection.isEdgeOn ->
                    if (preview.value == 0.0) "These points overlap · move one point"
                    else "Move sideways to see the measurement line"
                else -> null
            }
        val notify: (String) -> Unit = { message ->
            scope.launch { snackbar.showSnackbar(message) }
        }
        val copy: (String) -> Unit = { text ->
            (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("AR Ruler measurement", text))
            notify("Copied to clipboard")
        }
        val share: (String) -> Unit = { text ->
            context.startActivity(
                Intent.createChooser(
                    Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, text)
                    },
                    "Share measurements",
                )
            )
        }
        val changeMode: (MeasurementMode) -> Unit = { selected ->
            if (selected != mode) {
                mode = selected
                controller.mode = selected
                controller.clear()
                practiceSnapshot = practiceSnapshot.withMode(selected)
                practiceBounds = emptyList()
                practiceSelectedPoint = null
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            }
        }
        val add: () -> Unit = {
            if (practice) {
                practiceSnapshot =
                    if (selectedPoint != null)
                        practiceSnapshot.movePoint(selectedPoint, practiceTarget, snap)
                    else practiceSnapshot.addPoint(practiceTarget, snap)
                practiceSelectedPoint = null
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
            } else controller.requestAddPoint()
        }
        val cancelMove: () -> Unit = {
            if (practice) practiceSelectedPoint = null else controller.requestCancelSelection()
        }
        val selectPoint: (Int) -> Unit = { index ->
            if (selectedPoint == index) cancelMove()
            else {
                if (practice) {
                    practiceSelectedPoint = index
                    practiceTarget = practiceSnapshot.points[index]
                } else controller.requestSelectPoint(index)
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            }
        }
        LaunchedEffect(practice) {
            practiceSelectedPoint = null
            controller.requestCancelSelection()
        }
        val closeArea: () -> Unit = {
            if (snapshot.canCloseArea && canMeasure && selectedPoint == null) {
                if (practice) practiceSnapshot = practiceSnapshot.closeArea()
                else controller.closeArea()
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
            }
        }
        val save: () -> Unit = {
            if (snapshot.canSave && canMeasure && selectedPoint == null) {
                val record =
                    MeasurementRecord(
                        id = UUID.randomUUID().toString(),
                        timestamp = System.currentTimeMillis(),
                        mode = snapshot.mode,
                        value = snapshot.value,
                        unit = unit,
                        angleUnit = angleUnit,
                        points = snapshot.points.toList(),
                        label = if (practice) "Practice" else "AR measurement",
                    )
                history = (listOf(record) + history).take(MeasurementStore.MAX_RECORDS)
                store.saveHistory(history)
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                notify("Saved ${record.formatted}")
            }
        }
        BackHandler(sheet == null && snapshot.points.isNotEmpty()) {
            if (selectedPoint != null) cancelMove()
            else if (practice) practiceSnapshot = practiceSnapshot.undo() else controller.undo()
        }

        BoxWithConstraints(
            Modifier.fillMaxSize().background(Ink).onSizeChanged { viewportSize = it }
        ) {
            val landscape = maxWidth > maxHeight
            // Keep the same SurfaceView attached while practice mode pauses its camera.
            if (cameraGranted)
                AndroidView(
                    factory = { controller.createView() },
                    modifier = Modifier.fillMaxSize(),
                )
            if (practice) {
                PracticeCanvas(
                    snapshot = practiceSnapshot,
                    unit = unit,
                    snap = snap,
                    target = practiceTarget,
                    fittingPoints = practiceBounds,
                    onCloseArea = closeArea,
                    selectedPoint = selectedPoint,
                    onSelect = selectPoint,
                    onTap = { point ->
                        practiceTarget = if (snap) snapToGrid(point) else point
                        practiceSnapshot =
                            if (selectedPoint != null)
                                practiceSnapshot.movePoint(selectedPoint, practiceTarget, snap)
                            else practiceSnapshot.addPoint(practiceTarget, snap)
                        practiceSelectedPoint = null
                        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                )
            } else {
                MeasurementOverlay(
                    frame,
                    mode,
                    overlayProjection,
                    cameraProjection,
                    viewingArea,
                    if (mode == MeasurementMode.DISTANCE && preview.isReady)
                        preview.formatted(unit, angleUnit)
                    else null,
                    areaClosed = snapshot.areaClosed,
                    canCloseArea = snapshot.canCloseArea && selectedPoint == null,
                    modifier = Modifier.fillMaxSize(),
                    onSelect = { index ->
                        if (index == 0 && snapshot.canCloseArea && selectedPoint == null)
                            closeArea()
                        else selectPoint(index)
                    },
                    onPlace = { x, y -> if (canMeasure) controller.requestAddPoint(x, y) },
                )
            }
            Box(
                Modifier.fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Ink.copy(alpha = .8f),
                            .23f to Color.Transparent,
                            .55f to Color.Transparent,
                            1f to Ink.copy(alpha = .8f),
                        )
                    )
            )

            Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing)) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    RulerMark(Modifier.size(30.dp), Lime)
                    Column(Modifier.weight(1f)) {
                        Text(
                            "AR Ruler",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                        )
                        Text("PLAINOSS", fontSize = 10.sp, letterSpacing = 2.sp, color = Muted)
                    }
                    SmallAction("Saved measurements", "history") { sheet = "history" }
                    SmallAction("Settings and help", "more") { sheet = "settings" }
                }
                Row(
                    Modifier.fillMaxWidth()
                        .onGloballyPositioned { cameraTop = it.boundsInRoot().bottom }
                        .padding(horizontal = 20.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Surface(color = Panel.copy(alpha = .94f), shape = CircleShape) {
                        Row(
                            Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                Modifier.size(6.dp)
                                    .background(
                                        if (practice || canMeasure && target != null) Lime
                                        else Muted,
                                        CircleShape,
                                    )
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                when {
                                    practice -> "Practice canvas"
                                    !cameraGranted -> "Camera access needed"
                                    cameraError != null -> "Camera unavailable"
                                    snapshot.points.isNotEmpty() && !canMeasure -> "Tracking paused"
                                    canMeasure && target != null -> "Surface found"
                                    else -> "Finding a surface"
                                },
                                fontSize = 12.sp,
                                color = Muted,
                            )
                        }
                    }
                    TextButton(onClick = { sheet = "units" }) {
                        Text("${unit.symbol}  ▾", color = Lime, fontWeight = FontWeight.SemiBold)
                    }
                }

                Box(Modifier.weight(1f).fillMaxWidth()) {
                    if (!practice && (!cameraGranted || cameraError != null)) {
                        Surface(
                            modifier =
                                Modifier.align(Alignment.Center)
                                    .padding(24.dp)
                                    .widthIn(max = 420.dp)
                                    .verticalScroll(rememberScrollState()),
                            color = Panel,
                            shape = RoundedCornerShape(24.dp),
                        ) {
                            Column(
                                Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Glyph("camera", Modifier.size(36.dp), Lime)
                                Spacer(Modifier.height(16.dp))
                                Text(
                                    if (cameraGranted) "Camera AR is unavailable"
                                    else "Measure with your camera",
                                    style = MaterialTheme.typography.titleLarge,
                                    textAlign = TextAlign.Center,
                                )
                                Spacer(Modifier.height(10.dp))
                                Text(
                                    cameraError
                                        ?: "Allow camera access to place points on real surfaces. Your camera stays on this device.",
                                    color = Muted,
                                    textAlign = TextAlign.Center,
                                )
                                Spacer(Modifier.height(16.dp))
                                Button(
                                    onClick = {
                                        if (cameraGranted) onRetryCamera() else requestCamera()
                                    }
                                ) {
                                    Text(if (cameraGranted) "Retry" else "Allow camera")
                                }
                                if (!cameraGranted && permissionAttempted)
                                    TextButton(
                                        onClick = {
                                            context.startActivity(
                                                Intent(
                                                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                                    "package:${context.packageName}".toUri(),
                                                )
                                            )
                                        }
                                    ) {
                                        Text("Open app settings")
                                    }
                                if (BuildConfig.DEBUG) {
                                    TextButton(onClick = { onPracticeChange(true) }) {
                                        Text("Developer practice canvas")
                                    }
                                }
                            }
                        }
                    } else if (!landscape) {
                        Text(
                            text =
                                if (practice)
                                    if (selectedPoint != null)
                                        "Tap the grid to move point ${selectedPoint + 1}"
                                    else "Tap the grid to place a point"
                                else
                                    measurementNotice?.takeIf { canMeasure }
                                        ?: instruction(snapshot, frame),
                            color = Color.White,
                            textAlign = TextAlign.Center,
                            modifier =
                                Modifier.align(Alignment.BottomCenter)
                                    .onGloballyPositioned { instructionTop = it.boundsInRoot().top }
                                    .padding(24.dp)
                                    .background(Ink.copy(alpha = .8f), RoundedCornerShape(16.dp))
                                    .padding(12.dp),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
                if (landscape) {
                    Row(
                        Modifier.onGloballyPositioned { cameraBottom = it.boundsInRoot().top }
                            .padding(horizontal = 20.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        MetricCard(
                            snapshot,
                            preview,
                            unit,
                            angleUnit,
                            hasPreview,
                            canMeasure,
                            selectedPoint != null,
                            { copy(snapshot.formatted(unit, angleUnit)) },
                            save,
                            closeArea,
                            Modifier.weight(1f),
                            notice = if (landscape || !canMeasure) measurementNotice else null,
                            selectedPoint = selectedPoint,
                            practice = practice,
                            selectPoint = selectPoint,
                            cancelMove = cancelMove,
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.widthIn(max = 310.dp)) {
                            ModeSelector(mode, changeMode)
                            CaptureRow(
                                snapshot,
                                canMeasure && target != null,
                                practice,
                                add,
                                {
                                    if (practice) {
                                        practiceSnapshot = practiceSnapshot.undo()
                                        practiceSelectedPoint = null
                                    } else controller.undo()
                                },
                                {
                                    if (practice) {
                                        practiceSnapshot = practiceSnapshot.clear()
                                        practiceSelectedPoint = null
                                    } else controller.clear()
                                },
                                editing = selectedPoint != null,
                            )
                        }
                    }
                } else {
                    Column(
                        Modifier.fillMaxWidth()
                            .widthIn(max = 600.dp)
                            .align(Alignment.CenterHorizontally)
                            .onGloballyPositioned { cameraBottom = it.boundsInRoot().top }
                            .padding(horizontal = 20.dp)
                    ) {
                        MetricCard(
                            snapshot,
                            preview,
                            unit,
                            angleUnit,
                            hasPreview,
                            canMeasure,
                            selectedPoint != null,
                            { copy(snapshot.formatted(unit, angleUnit)) },
                            save,
                            closeArea,
                            notice = if (landscape || !canMeasure) measurementNotice else null,
                            selectedPoint = selectedPoint,
                            practice = practice,
                            selectPoint = selectPoint,
                            cancelMove = cancelMove,
                        )
                        Spacer(Modifier.height(12.dp))
                        ModeSelector(mode, changeMode)
                        CaptureRow(
                            snapshot,
                            canMeasure && target != null,
                            practice,
                            add,
                            {
                                if (practice) {
                                    practiceSnapshot = practiceSnapshot.undo()
                                    practiceSelectedPoint = null
                                } else controller.undo()
                            },
                            {
                                if (practice) {
                                    practiceSnapshot = practiceSnapshot.clear()
                                    practiceSelectedPoint = null
                                } else controller.clear()
                            },
                            editing = selectedPoint != null,
                        )
                    }
                }
            }
            if (!practice && cameraGranted && cameraError == null) {
                Reticle(canMeasure && target != null, Modifier.align(Alignment.Center))
            }
            SnackbarHost(
                snackbar,
                Modifier.align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(top = 120.dp, start = 20.dp, end = 20.dp),
            )
        }

        if (sheet != null)
            ModalBottomSheet(
                onDismissRequest = { sheet = null },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = Panel,
            ) {
                when (sheet) {
                    "history" ->
                        HistorySheet(
                            history,
                            copy,
                            share,
                            onDelete = { id ->
                                history = history.filterNot { it.id == id }
                                store.saveHistory(history)
                            },
                            onClear = { showClearHistory = true },
                        )
                    "units" ->
                        Column(Modifier.padding(24.dp).verticalScroll(rememberScrollState())) {
                            SheetTitle("Measurement units", "Your choice is saved for next time.")
                            DistanceUnit.entries.forEach { candidate ->
                                ListItem(
                                    headlineContent = { Text(unitName(candidate)) },
                                    supportingContent = { Text(candidate.symbol) },
                                    leadingContent = {
                                        RadioButton(selected = candidate == unit, onClick = null)
                                    },
                                    modifier =
                                        Modifier.clip(RoundedCornerShape(16.dp))
                                            .semantics {
                                                selected = candidate == unit
                                            }
                                            .clickable(role = Role.RadioButton) {
                                                unit = candidate
                                                store.unit = candidate
                                                sheet = null
                                            },
                                    colors =
                                        ListItemDefaults.colors(containerColor = Color.Transparent),
                                )
                            }
                        }
                    else ->
                        Column(
                            Modifier.padding(horizontal = 24.dp)
                                .verticalScroll(rememberScrollState())
                        ) {
                            SheetTitle("Make it yours", "Simple tools. Nothing extra.")
                            Text(
                                "Camera measurements use Google Play Services for AR (ARCore), provided by Google. Google's Privacy Policy governs that service.",
                                color = Muted,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            TextButton(onClick = {
                                context.startActivity(Intent(Intent.ACTION_VIEW, "https://policies.google.com/privacy".toUri()))
                            }) { Text("Google Privacy Policy") }
                            TextButton(onClick = {
                                context.startActivity(Intent(Intent.ACTION_VIEW, "https://github.com/plainoss/plainoss/blob/main/docs/ar-ruler-privacy.md".toUri()))
                            }) { Text("AR Ruler privacy policy") }
                            if (BuildConfig.DEBUG) HorizontalDivider(Modifier.padding(vertical = 16.dp))
                            if (BuildConfig.DEBUG) Row(
                                Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        "Developer practice canvas",
                                        style = MaterialTheme.typography.titleMedium,
                                    )
                                    Text(
                                        "Debug builds only",
                                        color = Muted,
                                        fontSize = 13.sp,
                                    )
                                }
                                Switch(
                                    practice,
                                    modifier =
                                        Modifier.semantics {
                                            contentDescription = "Practice canvas"
                                        },
                                    onCheckedChange = {
                                        onPracticeChange(it)
                                        sheet = null
                                    },
                                )
                            }
                            if (practice)
                                Row(
                                    Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("Snap to 0.5 m grid", Modifier.weight(1f))
                                    Switch(
                                        snap,
                                        onCheckedChange = { snap = it },
                                        modifier =
                                            Modifier.semantics {
                                                contentDescription = "Snap to 0.5 meter grid"
                                            },
                                    )
                                }
                            HorizontalDivider(Modifier.padding(vertical = 16.dp))
                            Text("Angle units", style = MaterialTheme.typography.titleMedium)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                AngleUnit.entries.forEach { candidate ->
                                    FilterChip(
                                        candidate == angleUnit,
                                        onClick = {
                                            angleUnit = candidate
                                            store.angleUnit = candidate
                                        },
                                        label = {
                                            Text(
                                                if (candidate == AngleUnit.DEGREES) "Degrees °"
                                                else "Radians"
                                            )
                                        },
                                    )
                                }
                            }
                            if (BuildConfig.DEBUG) {
                                Spacer(Modifier.height(16.dp))
                                Text("Developer samples", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "Samples open in the practice canvas.",
                                    color = Muted,
                                    fontSize = 13.sp,
                                )
                                MeasurementPresets.all.forEach { preset ->
                                    TextButton(
                                        onClick = {
                                            onPracticeChange(true)
                                            changeMode(preset.mode)
                                            practiceSnapshot = preset.snapshot()
                                            practiceSelectedPoint = null
                                            practiceBounds = preset.points
                                            sheet = null
                                        }
                                    ) {
                                        Text(preset.label)
                                    }
                                }
                            }
                            HorizontalDivider(Modifier.padding(vertical = 16.dp))
                            Text("A little guidance", style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Move your phone slowly over a well-lit, textured floor, table or wall. When the target turns green, aim at your starting point and press +. Move to the next point and repeat.\n\nDistance uses two points. Path adds connected segments. For Area, place at least three corners in order on one flat surface, then tap the first point or Close area. The filled shape remains translucent so you can see the surface. Press + after closing to start a new area. Angle uses three points, with the second as the vertex.\n\nTap a placed point or its number in Move point to select it. Aim at its new position and tap Move. Tap Cancel or the selected point again to cancel. Undo reopens a closed area before removing corners. Otherwise it removes the last point. Clear starts again. Save keeps a measurement in history. Units change the display without changing your points.\n\nAR provides an estimate. Reflective or plain surfaces and lost tracking can reduce accuracy.\n\nAll measurements stay on your device. No account, ads or analytics. History keeps the latest 200 saves. Camera images are never saved.",
                                color = Muted,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(top = 10.dp, bottom = 32.dp),
                            )
                        }
                }
            }
        if (showClearHistory)
            AlertDialog(
                onDismissRequest = { showClearHistory = false },
                title = { Text("Clear saved measurements?") },
                text = {
                    Text("This removes all ${history.size} saved measurements from this device.")
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            history = emptyList()
                            store.saveHistory(history)
                            showClearHistory = false
                        }
                    ) {
                        Text("Clear history")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showClearHistory = false }) { Text("Cancel") }
                },
            )
    }
}

private fun instruction(snapshot: MeasurementSnapshot, frame: ArFrame): String =
    when {
        !frame.tracking || !frame.anchorsTracking -> frame.status
        frame.selectedPointIndex != null ->
            "Move point ${frame.selectedPointIndex + 1}: aim, then tap Move"
        snapshot.mode == MeasurementMode.AREA && snapshot.areaClosed ->
            "Area closed · Save it or press + to start another"
        snapshot.canCloseArea -> "Tap the first point or Close area to finish"
        frame.target == null -> "Move slowly over a textured surface"
        snapshot.isComplete -> "Measurement ready. Save it or start a new one."
        snapshot.points.isEmpty() -> "Aim at your starting point, then press +"
        snapshot.mode == MeasurementMode.ANGLE && snapshot.points.size == 1 ->
            "Place the vertex of your angle"
        snapshot.mode == MeasurementMode.ANGLE -> "Place the end of the second arm"
        snapshot.mode == MeasurementMode.AREA -> "Place the next corner on the same flat surface"
        else -> "Aim at the next point, then press +"
    }
