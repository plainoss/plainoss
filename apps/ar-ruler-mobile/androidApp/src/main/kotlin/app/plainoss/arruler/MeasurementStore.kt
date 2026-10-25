package app.plainoss.arruler

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File
import android.content.Context
import androidx.core.content.edit
import app.plainoss.arruler.core.AngleUnit
import app.plainoss.arruler.core.DistanceUnit
import app.plainoss.arruler.core.MeasurementMode
import app.plainoss.arruler.core.MeasurementRecord
import app.plainoss.arruler.core.Point3D
import org.json.JSONArray
import org.json.JSONObject

/** App-private metadata and photos. AR sessions are never persisted. */
class MeasurementStore(context: Context) {
    private val preferences = context.getSharedPreferences("ar-ruler", Context.MODE_PRIVATE)

    private val photos = File(context.noBackupFilesDir, "measurement-photos")

    init {
        // Activities can recreate this store while a previous instance is still saving.
        synchronized(storageLock) { cleanupPhotos(loadHistory()) }
    }

    val needsHistoryLimitChoice: Boolean
        get() = !preferences.contains("historyLimit") && loadHistory().size > DEFAULT_RECORDS

    val historyLimit: Int
        get() = preferences.getInt("historyLimit", DEFAULT_RECORDS).takeIf { it in HISTORY_LIMITS }
            ?: DEFAULT_RECORDS

    /** The photo and its reference are one transaction, including rollback and orphan cleanup. */
    fun saveMeasurement(
        record: MeasurementRecord,
        photo: Bitmap?,
        history: List<MeasurementRecord>,
        limit: Int,
    ): List<MeasurementRecord> = synchronized(storageLock) {
        require(record.hasPhoto == (photo != null))
        try {
            if (photo != null) writePhoto(record.id, photo)
            saveHistory(listOf(record) + history, limit)
        } catch (error: Exception) {
            if (photo != null) deletePhoto(record.id)
            throw error
        }
    }

    private fun writePhoto(id: String, bitmap: Bitmap) {
        check(photos.isDirectory || photos.mkdirs()) { "Could not create photo storage" }
        val destination = photoFile(id)
        val temporary = File(photos, "$id.tmp")
        try {
            temporary.outputStream().use {
                check(bitmap.compress(Bitmap.CompressFormat.JPEG, 88, it)) { "Could not encode photo" }
            }
            check(temporary.renameTo(destination)) { "Could not save photo" }
        } finally {
            temporary.delete()
        }
    }

    fun loadPhoto(id: String, maxSize: Int): Bitmap? = runCatching {
        val file = photoFile(id)
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.path, bounds)
        val options = BitmapFactory.Options().apply { inSampleSize = 1 }
        while (maxOf(bounds.outWidth, bounds.outHeight) / options.inSampleSize > maxSize * 2) {
            options.inSampleSize *= 2
        }
        BitmapFactory.decodeFile(file.path, options)
    }.getOrNull()

    /** Copy under the transaction lock so deletion/eviction cannot unlink a photo mid-copy. */
    internal fun copyPhotoForSharing(id: String, destination: File) = synchronized(storageLock) {
        check(readHistory().any { it.id == id && it.hasPhoto }) { "Photo is no longer in history" }
        photoFile(id).inputStream().use { input ->
            destination.outputStream().use { output -> input.copyTo(output) }
        }
        check(destination.length() > 0) { "Photo is unavailable" }
    }

    private fun deletePhoto(id: String) { photoFile(id).delete() }

    private fun photoFile(id: String): File {
        require(id.matches(Regex("[A-Za-z0-9-]+"))) { "Invalid measurement ID" }
        return File(photos, "$id.jpg")
    }

    var unit: DistanceUnit
        get() = enumValue(preferences.getString("unit", null), DistanceUnit.METERS)
        set(value) {
            preferences.edit { putString("unit", value.name) }
        }

    var angleUnit: AngleUnit
        get() = enumValue(preferences.getString("angleUnit", null), AngleUnit.DEGREES)
        set(value) {
            preferences.edit { putString("angleUnit", value.name) }
        }

    var permissionAsked: Boolean
        get() = preferences.getBoolean("permissionAsked", false)
        set(value) {
            preferences.edit { putBoolean("permissionAsked", value) }
        }

    fun loadHistory(): List<MeasurementRecord> = synchronized(storageLock) { readHistory() }

    private fun readHistory(): List<MeasurementRecord> = runCatching {
        val array = JSONArray(preferences.getString("history", "[]"))
        (0 until array.length())
            .mapNotNull { index ->
                runCatching {
                    val item = array.getJSONObject(index)
                    val pointArray = item.getJSONArray("points")
                    val points =
                        (0 until pointArray.length()).map { pointIndex ->
                            val point = pointArray.getJSONArray(pointIndex)
                            Point3D(point.getDouble(0), point.getDouble(1), point.getDouble(2))
                        }
                    require(points.all { it.x.isFinite() && it.y.isFinite() && it.z.isFinite() })
                    MeasurementRecord(
                        id = item.getString("id"),
                        timestamp = item.getLong("timestamp"),
                        mode = MeasurementMode.valueOf(item.getString("mode")),
                        value = item.getDouble("value"),
                        unit = enumValue(item.optString("unit"), DistanceUnit.METERS),
                        angleUnit = enumValue(item.optString("angleUnit"), AngleUnit.DEGREES),
                        points = points,
                        label = item.optString("label"),
                        hasPhoto = item.optBoolean("hasPhoto", false),
                    )
                }
                    .getOrNull()
            }
            .take(MAX_RECORDS)
    }
        .getOrDefault(emptyList())

    /** Commit metadata before deleting unreferenced photos. A failed commit keeps old files intact. */
    @SuppressLint("ApplySharedPref", "UseKtx") // Callers run on IO; the commit result is needed for rollback.
    fun saveHistory(records: List<MeasurementRecord>, limit: Int? = null): List<MeasurementRecord> = synchronized(storageLock) {
        require(limit == null || limit in HISTORY_LIMITS)
        // Renaming or deleting a legacy record must not silently choose a limit or trim history.
        val preserveLegacy = limit == null && needsHistoryLimitChoice
        val retained = records.take(if (preserveLegacy) MAX_RECORDS else limit ?: historyLimit)
        val array = JSONArray()
        retained.forEach { record ->
            array.put(
                JSONObject().apply {
                    put("id", record.id)
                    put("timestamp", record.timestamp)
                    put("mode", record.mode.name)
                    put("value", record.value)
                    put("unit", record.unit.name)
                    put("angleUnit", record.angleUnit.name)
                    put("label", record.label)
                    put("hasPhoto", record.hasPhoto)
                    put(
                        "points",
                        JSONArray().apply {
                            record.points.forEach { put(JSONArray(listOf(it.x, it.y, it.z))) }
                        },
                    )
                }
            )
        }
        val editor = preferences.edit().putString("history", array.toString())
        if (!preserveLegacy) editor.putInt("historyLimit", limit ?: historyLimit)
        val previousHistory = preferences.getString("history", "[]")
        val hadLimit = preferences.contains("historyLimit")
        val previousLimit = historyLimit
        if (!editor.commit()) {
            // SharedPreferences updates its memory even when disk persistence fails.
            val rollback = preferences.edit().putString("history", previousHistory)
            if (hadLimit) rollback.putInt("historyLimit", previousLimit) else rollback.remove("historyLimit")
            rollback.commit()
            error("Could not save history")
        }
        cleanupPhotos(retained)
        retained
    }

    private fun cleanupPhotos(records: List<MeasurementRecord>) {
        val referenced = records.filter { it.hasPhoto }.map { "${it.id}.jpg" }.toSet()
        photos.listFiles()?.filter { it.name !in referenced }?.forEach { it.delete() }
    }

    private inline fun <reified T : Enum<T>> enumValue(value: String?, fallback: T): T =
        enumValues<T>().firstOrNull { it.name == value } ?: fallback

    companion object {
        // Shared by every instance: an instance lock cannot protect activity recreation.
        private val storageLock = Any()
        const val MAX_RECORDS = 200
        const val DEFAULT_RECORDS = 20
        val HISTORY_LIMITS = listOf(20, 50, 100, 200)
    }
}
