package app.plainoss.arruler.ui

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

internal val Ink = Color(0xFF101512)
internal val Panel = Color(0xFF1A231E)
internal val Lime = Color(0xFFD3F88B)
internal val Muted = Color(0xFFB2BDB5)
internal val RulerColors =
    darkColorScheme(
        primary = Lime,
        onPrimary = Ink,
        primaryContainer = Color(0xFF33472A),
        background = Ink,
        surface = Panel,
        surfaceContainer = Color(0xFF263029),
        onSurface = Color(0xFFF4F7F1),
        onSurfaceVariant = Muted,
        secondary = Lime,
        onSecondary = Ink,
        secondaryContainer = Color(0xFF34452C),
        onSecondaryContainer = Lime,
        outline = Color(0xFF4C5B50),
    )
