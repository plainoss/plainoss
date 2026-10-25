package app.plainoss.arruler.ui

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.plainoss.arruler.MeasurementStore
import app.plainoss.arruler.core.MeasurementRecord
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
internal fun HistoryPhoto(store: MeasurementStore, record: MeasurementRecord, enlarged: Boolean = false) {
    var loading by remember(record.id, enlarged) { mutableStateOf(record.hasPhoto) }
    val bitmap by produceState<android.graphics.Bitmap?>(null, record.id, enlarged) {
        if (record.hasPhoto) value = withContext(Dispatchers.IO) {
            store.loadPhoto(record.id, if (enlarged) 1600 else 480)
        }
        loading = false
    }
    // Compose owns the loaded bitmap until it leaves the composition; let GC release it after drawing.
    val photo = bitmap
    if (photo != null) {
        Image(photo.asImageBitmap(), "${record.label}: ${record.formatted}",
            Modifier.fillMaxWidth().then(if (enlarged) Modifier.heightIn(max = 600.dp) else Modifier.heightIn(max = 220.dp)),
            contentScale = ContentScale.Fit)
    } else if (loading) {
        CircularProgressIndicator(Modifier.padding(12.dp).size(24.dp))
    } else {
        Text(if (record.hasPhoto) "Photo unavailable" else "No photo saved", color = Muted,
            modifier = Modifier.padding(vertical = 12.dp))
    }
}


@Composable
internal fun HistoryPhotoDialog(store: MeasurementStore, record: MeasurementRecord, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxWidth().padding(12.dp), color = Panel,
            contentColor = MaterialTheme.colorScheme.onSurface) {
            Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                Text(record.label, style = MaterialTheme.typography.titleLarge)
                Text("${record.mode.label} · ${record.formatted}", color = Lime)
                HistoryPhoto(store, record, enlarged = true)
                TextButton(onClick = onDismiss) { Text("Close photo") }
            }
        }
    }
}
