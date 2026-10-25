package app.plainoss.arruler.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.plainoss.arruler.core.*

@Composable
internal fun MetricCard(
    snapshot: MeasurementSnapshot,
    preview: MeasurementSnapshot,
    unit: DistanceUnit,
    angleUnit: AngleUnit,
    hasPreview: Boolean,
    tracking: Boolean,
    editing: Boolean,
    copy: () -> Unit,
    save: () -> Unit,
    closeArea: () -> Unit,
    modifier: Modifier = Modifier,
    notice: String? = null,
    selectedPoint: Int? = null,
    practice: Boolean = false,
    selectPoint: (Int) -> Unit,
    cancelMove: () -> Unit,
    expanded: Boolean,
    toggleExpanded: () -> Unit,
    onModeChange: (MeasurementMode) -> Unit,
    guidance: String? = null,
    detailsMaxHeight: Dp = 240.dp,
) {
    val drawingArea = snapshot.mode == MeasurementMode.AREA && !snapshot.areaClosed
    val showPreview = hasPreview && (!snapshot.isReady || editing || drawingArea)
    Surface(
        modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Panel.copy(alpha = .8f),
    ) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(
                    Modifier.weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .semantics { stateDescription = if (expanded) "Expanded" else "Collapsed" }
                        .clickable(
                            role = Role.Button,
                            onClickLabel =
                                if (expanded) "Collapse measurement details"
                                else "Expand measurement details",
                            onClick = toggleExpanded,
                        )
                        .heightIn(min = 52.dp)
                        .padding(horizontal = 2.dp),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        when {
                            showPreview -> "${snapshot.mode.label} · preview"
                            snapshot.mode == MeasurementMode.AREA && snapshot.areaClosed ->
                                "Area · closed"
                            drawingArea -> "Area · drawing"
                            else -> snapshot.mode.label
                        } + if (expanded) " · Hide details ▴" else " · Details ▾",
                        fontSize = 12.sp,
                        color = Muted,
                    )
                    Text(
                        (if (showPreview) preview else snapshot).formatted(unit, angleUnit),
                        fontSize = 26.sp,
                        lineHeight = 32.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (tracking) Lime else Muted,
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        maxLines = 1,
                    )
                }
                FilledTonalButton(
                    onClick = if (drawingArea) closeArea else save,
                    enabled =
                        (if (drawingArea) snapshot.canCloseArea else snapshot.canSave) &&
                            tracking &&
                            !editing,
                    contentPadding = PaddingValues(horizontal = 16.dp),
                ) {
                    Text(if (drawingArea) "Close area" else "Save")
                }
            }
            val hint = notice ?: when {
                editing ->
                    if (practice) "Tap the grid to move point ${selectedPoint!! + 1}"
                    else "Aim at the new position, then tap Move"
                drawingArea ->
                    if (snapshot.canCloseArea) "Tap the first point or Close area to finish"
                    else "Place at least 3 corners to close an area"
                else -> guidance
            }
            if (hint != null || editing) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    if (hint != null)
                        Text(
                            hint,
                            fontSize = 12.sp,
                            color = Muted,
                            modifier = Modifier.weight(1f),
                        )
                    if (editing) TextButton(onClick = cancelMove) { Text("Cancel") }
                }
            }
            if (expanded) Column(
                Modifier.heightIn(max = detailsMaxHeight).verticalScroll(rememberScrollState())
            ) {
                HorizontalDivider(Modifier.padding(vertical = 8.dp), color = Muted.copy(alpha = .2f))
                ModeSelector(snapshot.mode, onModeChange)
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${snapshot.points.size} points",
                        fontSize = 12.sp,
                        color = Muted,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(
                        onClick = copy,
                        enabled = snapshot.canSave && !editing,
                        modifier = Modifier.semantics { contentDescription = "Copy measurement" },
                    ) {
                        Glyph(
                            "copy",
                            Modifier.size(18.dp),
                            if (snapshot.canSave && !editing) Muted else Muted.copy(alpha = .3f),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text("Copy")
                    }
                }
                if (snapshot.mode == MeasurementMode.AREA && snapshot.areaClosed) {
                    Text("Area closed · press + to start another", fontSize = 12.sp, color = Muted)
                } else if (hasPreview && snapshot.isReady && !editing) {
                    Text(
                        "With next point  ${preview.formatted(unit, angleUnit)}",
                        fontSize = 12.sp,
                        color = Muted,
                    )
                }
                if (snapshot.mode == MeasurementMode.AREA && snapshot.points.size >= 3) {
                    Text(
                        "${if (snapshot.areaClosed) "Perimeter" else "Placed perimeter"}  ${formatDistance(snapshot.perimeter, unit)}",
                        fontSize = 12.sp,
                        color = Muted,
                    )
                } else if (snapshot.mode == MeasurementMode.PATH && snapshot.points.size >= 2) {
                    Text(
                        "${snapshot.points.size - 1} connected segments",
                        fontSize = 12.sp,
                        color = Muted,
                    )
                } else if (snapshot.mode == MeasurementMode.ANGLE) {
                    Text("The second point is the vertex", fontSize = 12.sp, color = Muted)
                }
                if (snapshot.points.isNotEmpty()) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("Move point", fontSize = 12.sp, color = Muted)
                        Spacer(Modifier.width(8.dp))
                        Row(
                            Modifier.weight(1f).horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            snapshot.points.indices.forEach { index ->
                                FilterChip(
                                    selected = selectedPoint == index,
                                    onClick = { selectPoint(index) },
                                    label = { Text("${index + 1}") },
                                    modifier =
                                        Modifier.semantics {
                                            contentDescription = "Move point ${index + 1}"
                                        },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun ModeSelector(mode: MeasurementMode, onSelect: (MeasurementMode) -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(CircleShape).background(Panel.copy(alpha = .35f)).padding(4.dp)
    ) {
        MeasurementMode.entries.forEach { candidate ->
            Box(
                Modifier.weight(1f)
                    .clip(CircleShape)
                    .background(if (candidate == mode) Lime.copy(alpha = .2f) else Color.Transparent)
                    .semantics { selected = candidate == mode }
                    .clickable(role = Role.RadioButton) { onSelect(candidate) }
                    .heightIn(min = 48.dp)
                    .padding(horizontal = 4.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    candidate.label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (candidate == mode) Lime else Muted,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
internal fun CaptureRow(
    snapshot: MeasurementSnapshot,
    canAdd: Boolean,
    practice: Boolean,
    add: () -> Unit,
    undo: () -> Unit,
    clear: () -> Unit,
    editing: Boolean = false,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            FilledTonalIconButton(
                onClick = undo,
                enabled = snapshot.points.isNotEmpty(),
                modifier =
                    Modifier.size(48.dp).semantics {
                        contentDescription =
                            if (snapshot.mode == MeasurementMode.AREA && snapshot.areaClosed)
                                "Reopen area"
                            else "Undo last point"
                    },
            ) {
                Glyph("undo", Modifier.size(22.dp), Muted)
            }
            Text("Undo", fontSize = 11.sp, color = Muted)
        }
        Button(
            onClick = add,
            enabled = canAdd,
            shape = CircleShape,
            contentPadding = PaddingValues(0.dp),
            modifier =
                Modifier.size(64.dp)
                    .semantics {
                        contentDescription =
                            if (editing) "Move selected point to target"
                            else if (snapshot.mode == MeasurementMode.AREA && snapshot.areaClosed)
                                "Start a new area at target"
                            else if (practice) "Place practice point at target"
                            else "Place point at target"
                    }
                    .border(2.dp, if (canAdd) Lime else Muted.copy(alpha = .4f), CircleShape)
                    .padding(5.dp),
        ) {
            if (editing) Text("Move", color = if (canAdd) Ink else Muted, fontSize = 14.sp)
            else Glyph("plus", Modifier.size(28.dp), if (canAdd) Ink else Muted)
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            FilledTonalIconButton(
                onClick = clear,
                enabled = snapshot.points.isNotEmpty(),
                modifier =
                    Modifier.size(48.dp).semantics { contentDescription = "Clear measurement" },
            ) {
                Glyph("clear", Modifier.size(22.dp), Muted)
            }
            Text("Clear", fontSize = 11.sp, color = Muted)
        }
    }
}

@Composable
internal fun SmallAction(description: String, icon: String, onClick: () -> Unit) {
    IconButton(
        onClick,
        modifier =
            Modifier.background(Panel.copy(alpha = .88f), CircleShape).semantics {
                contentDescription = description
            },
    ) {
        Glyph(icon, Modifier.size(21.dp), Color.White)
    }
}

@Composable
internal fun SheetTitle(title: String, subtitle: String) {
    Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
    Text(subtitle, color = Muted, modifier = Modifier.padding(top = 6.dp, bottom = 20.dp))
}

internal fun unitName(unit: DistanceUnit): String =
    when (unit) {
        DistanceUnit.METERS -> "Meters"
        DistanceUnit.CENTIMETERS -> "Centimeters"
        DistanceUnit.MILLIMETERS -> "Millimeters"
        DistanceUnit.INCHES -> "Inches"
        DistanceUnit.FEET -> "Feet"
        DistanceUnit.YARDS -> "Yards"
    }
