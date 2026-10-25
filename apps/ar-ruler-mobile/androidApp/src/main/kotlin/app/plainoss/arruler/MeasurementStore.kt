package app.plainoss.arruler

import android.content.Context
import androidx.core.content.edit
import app.plainoss.arruler.core.AngleUnit
import app.plainoss.arruler.core.DistanceUnit
import app.plainoss.arruler.core.MeasurementMode
import app.plainoss.arruler.core.MeasurementRecord
import app.plainoss.arruler.core.Point3D
import org.json.JSONArray
import org.json.JSONObject

/** App-private storage. Camera images and AR sessions are never persisted. */
class MeasurementStore(context: Context) {
    private val preferences = context.getSharedPreferences("ar-ruler", Context.MODE_PRIVATE)

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

    fun loadHistory(): List<MeasurementRecord> = runCatching {
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
                    )
                }
                    .getOrNull()
            }
            .take(MAX_RECORDS)
    }
        .getOrDefault(emptyList())

    fun saveHistory(records: List<MeasurementRecord>) {
        val array = JSONArray()
        records.take(MAX_RECORDS).forEach { record ->
            array.put(
                JSONObject().apply {
                    put("id", record.id)
                    put("timestamp", record.timestamp)
                    put("mode", record.mode.name)
                    put("value", record.value)
                    put("unit", record.unit.name)
                    put("angleUnit", record.angleUnit.name)
                    put("label", record.label)
                    put(
                        "points",
                        JSONArray().apply {
                            record.points.forEach { put(JSONArray(listOf(it.x, it.y, it.z))) }
                        },
                    )
                }
            )
        }
        preferences.edit { putString("history", array.toString()) }
    }

    private inline fun <reified T : Enum<T>> enumValue(value: String?, fallback: T): T =
        enumValues<T>().firstOrNull { it.name == value } ?: fallback

    companion object {
        const val MAX_RECORDS = 200
    }
}
