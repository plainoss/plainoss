package app.plainoss.arruler.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.foundation.clickable
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.plainoss.arruler.MeasurementStore
import app.plainoss.arruler.core.*
import java.text.DateFormat
import java.util.Date

@Composable
internal fun HistorySheet(
    records: List<MeasurementRecord>,
    store: MeasurementStore,
    limit: Int?,
    onRename: (String, String) -> Unit,
    copy: (String) -> Unit,
    share: (String) -> Unit,
    onDelete: (String) -> Unit,
    onClear: () -> Unit,
    sharePhoto: (MeasurementRecord) -> Unit = {},
) {
    var renaming by remember { mutableStateOf<MeasurementRecord?>(null) }
    var name by remember { mutableStateOf("") }
    var viewing by remember { mutableStateOf<String?>(null) }
    records.firstOrNull { it.id == viewing }?.let { record ->
        HistoryPhotoDialog(store, record, onShare = { sharePhoto(record) }) { viewing = null }
    }
    renaming?.let { record ->
        AlertDialog(
            onDismissRequest = { renaming = null },
            title = { Text("Rename measurement") },
            text = {
                OutlinedTextField(value = name, onValueChange = { name = it.take(80) },
                    label = { Text("Name") }, singleLine = true)
            },
            confirmButton = {
                TextButton(enabled = name.isNotBlank(), onClick = {
                    onRename(record.id, name.trim())
                    renaming = null
                }) { Text("Save name") }
            },
            dismissButton = { TextButton(onClick = { renaming = null }) { Text("Cancel") } },
        )
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
        SheetTitle(
            "Your measurements",
            if (limit == null) "Saved on this device · ${records.size} · choose a limit in settings"
            else "Saved on this device · ${records.size} of $limit",
        )
        if (records.isEmpty()) {
            Column(
                Modifier.fillMaxWidth().padding(vertical = 36.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                RulerMark(Modifier.size(48.dp), Lime)
                Text(
                    "A clean slate",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 20.dp),
                )
                Text(
                    "Save a measurement and you’ll find it here.",
                    color = Muted,
                    modifier = Modifier.padding(top = 8.dp, bottom = 32.dp),
                )
            }
        } else {
            val allText =
                records.joinToString("\n") { "${it.mode.label}: ${it.formatted} (${it.label})" }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = { share(allText) }) { Text("Share all text") }
                TextButton(onClick = { copy(allText) }) { Text("Copy all") }
                TextButton(onClick = onClear) {
                    Text("Clear history", color = MaterialTheme.colorScheme.error)
                }
            }
            LazyColumn(
                Modifier.fillMaxWidth().heightIn(max = 520.dp),
                contentPadding = PaddingValues(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(records, key = { it.id }) { record ->
                    Surface(shape = RoundedCornerShape(20.dp), color = Ink) {
                        Column(Modifier.fillMaxWidth().padding(16.dp)) {
                            Box(Modifier.fillMaxWidth().clickable(enabled = record.hasPhoto,
                                onClickLabel = "Open measurement photo", onClick = { viewing = record.id })) {
                                HistoryPhoto(store, record)
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    record.label,
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.weight(1f).padding(end = 8.dp),
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    DateFormat.getDateTimeInstance(
                                            DateFormat.SHORT,
                                            DateFormat.SHORT,
                                        )
                                        .format(Date(record.timestamp)),
                                    color = Muted,
                                    fontSize = 10.sp,
                                )
                            }
                            Text(
                                record.formatted,
                                color = Lime,
                                style = MaterialTheme.typography.headlineMedium,
                            )
                            Row {
                                TextButton(onClick = { renaming = record; name = record.label }) { Text("Rename") }
                                if (record.hasPhoto) TextButton(onClick = { sharePhoto(record) }) { Text("Share photo") }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "${record.mode.label} · ${record.points.size} points",
                                    color = Muted,
                                    fontSize = 12.sp,
                                    modifier = Modifier.weight(1f),
                                )
                                TextButton(onClick = { copy(record.formatted) }) { Text("Copy") }
                                TextButton(
                                    onClick = {
                                        share(
                                            "${record.mode.label}: ${record.formatted} (${record.label})"
                                        )
                                    }
                                ) {
                                    Text("Share text")
                                }
                                IconButton(
                                    onClick = { onDelete(record.id) },
                                    modifier =
                                        Modifier.semantics {
                                            contentDescription = "Delete ${record.formatted}"
                                        },
                                ) {
                                    Glyph("clear", Modifier.size(18.dp), Muted)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
