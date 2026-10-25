package app.plainoss.arruler.core

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.pow

enum class DistanceUnit(val symbol: String, val metersPerUnit: Double) {
    METERS("m", 1.0),
    CENTIMETERS("cm", 0.01),
    MILLIMETERS("mm", 0.001),
    INCHES("in", 0.0254),
    FEET("ft", 0.3048),
    YARDS("yd", 0.9144),
}

enum class AngleUnit(val symbol: String) {
    DEGREES("°"),
    RADIANS("rad"),
}

fun convertDistance(value: Double, fromUnit: DistanceUnit, toUnit: DistanceUnit): Double =
    value * fromUnit.metersPerUnit / toUnit.metersPerUnit

fun convertAreaFromMeters(squareMeters: Double, toUnit: DistanceUnit): Double =
    squareMeters / (toUnit.metersPerUnit * toUnit.metersPerUnit)

fun convertArea(value: Double, fromUnit: DistanceUnit, toUnit: DistanceUnit): Double =
    convertAreaFromMeters(value * fromUnit.metersPerUnit * fromUnit.metersPerUnit, toUnit)

fun convertAngle(value: Double, fromUnit: AngleUnit, toUnit: AngleUnit): Double =
    when {
        fromUnit == toUnit -> value
        toUnit == AngleUnit.RADIANS -> value * kotlin.math.PI / 180.0
        else -> value * 180.0 / kotlin.math.PI
    }

fun formatDistance(meters: Double, unit: DistanceUnit, decimals: Int = 2): String =
    "${decimalString(meters / unit.metersPerUnit, decimals)} ${unit.symbol}"

fun formatArea(squareMeters: Double, unit: DistanceUnit, decimals: Int = 2): String =
    "${decimalString(convertAreaFromMeters(squareMeters, unit), decimals)} ${unit.symbol}²"

/** Input is always degrees, including when the requested display is radians. */
fun formatAngle(degrees: Double, unit: AngleUnit = AngleUnit.DEGREES, decimals: Int = 1): String =
    if (unit == AngleUnit.RADIANS) {
        "${decimalString(convertAngle(degrees, AngleUnit.DEGREES, unit), decimals + 1)} rad"
    } else {
        "${decimalString(degrees, decimals)}°"
    }

/** Locale independent without a JVM-only number formatter; suppresses trailing zeroes. */
private fun decimalString(value: Double, decimals: Int): String {
    require(decimals in 0..9) { "Decimal places must be between 0 and 9" }
    if (!value.isFinite()) return "—"
    val factor = 10.0.pow(decimals)
    val scaled = floor(abs(value) * factor + 0.5)
    if (scaled == 0.0) return "0"
    if (scaled >= Long.MAX_VALUE.toDouble()) return value.toString()
    val digits = scaled.toLong().toString().padStart(decimals + 1, '0')
    val unsigned =
        if (decimals == 0) digits
        else {
            val decimalPosition = digits.length - decimals
            "${digits.substring(0, decimalPosition)}.${digits.substring(decimalPosition)}"
                .trimEnd('0')
                .trimEnd('.')
        }
    return if (value < 0.0) "-$unsigned" else unsigned
}
