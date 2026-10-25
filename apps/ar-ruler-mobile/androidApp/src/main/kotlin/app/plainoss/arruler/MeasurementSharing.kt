package app.plainoss.arruler

import android.content.ClipData
import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import app.plainoss.arruler.core.MeasurementRecord
import java.io.File
import java.util.concurrent.TimeUnit

/** Only the dedicated share cache is exposed; the provider remains private without a URI grant. */
class MeasurementImageProvider : FileProvider()

/** Called on IO. A separate copy stays readable if history is cleared while the recipient opens it. */
internal fun measurementImageShareIntent(context: Context, store: MeasurementStore, record: MeasurementRecord): Intent {
    require(record.hasPhoto) { "This measurement has no photo" }
    val directory = File(context.cacheDir, "measurement-shares")
    check(directory.isDirectory || directory.mkdirs()) { "Could not prepare photo sharing" }
    val expiredBefore = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(1)
    directory.listFiles()?.filter { it.lastModified() < expiredBefore }?.forEach { it.delete() }
    val copy = File.createTempFile("measurement-", ".jpg", directory)
    try {
        store.copyPhotoForSharing(record.id, copy)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.measurement-images", copy)
        return Intent(Intent.ACTION_SEND).apply {
            type = "image/jpeg"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, record.label)
            putExtra(Intent.EXTRA_TITLE, record.label)
            putExtra(Intent.EXTRA_TEXT, "${record.label} · ${record.mode.label}: ${record.formatted}")
            clipData = ClipData.newRawUri("Measurement photo", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    } catch (error: Exception) {
        copy.delete()
        throw error
    }
}
