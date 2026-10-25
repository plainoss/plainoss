package app.plainoss.arruler.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.plainoss.arruler.MeasurementStore

@Composable
internal fun HistoryLimitSettings(limit: Int, count: Int, needsChoice: Boolean, onSelect: (Int) -> Unit) {
    Text("History limit", style = MaterialTheme.typography.titleMedium)
    Text(if (needsChoice) "You have $count saved measurements. Choose a limit before saving again."
        else "Keep the latest $limit measurements and their photos. Older saves are removed when full.",
        color = Muted)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        MeasurementStore.HISTORY_LIMITS.forEach { candidate ->
            FilterChip(selected = !needsChoice && limit == candidate,
                onClick = { onSelect(candidate) }, label = { Text("$candidate") })
        }
    }
}
