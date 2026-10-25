package app.plainoss.arruler

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import app.plainoss.arruler.ar.ArController
import app.plainoss.arruler.ar.ArFrame
import app.plainoss.arruler.ui.RulerApp

class MainActivity : ComponentActivity() {
    private lateinit var controller: ArController
    private var frame by mutableStateOf(ArFrame())
    private var cameraGranted by mutableStateOf(false)
    private var practice by mutableStateOf(false)
    private var activityResumed = false
    private var cameraError by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        cameraGranted = hasCameraPermission()
        controller =
            ArController(this).apply {
                onFrame = { frame = it }
                onError = { cameraError = it }
                onPointAdded = {
                    window.decorView.performHapticFeedback(
                        android.view.HapticFeedbackConstants.CONTEXT_CLICK
                    )
                }
            }
        val store = MeasurementStore(this)
        setContent {
            RulerApp(
                controller = controller,
                frame = frame,
                store = store,
                cameraGranted = cameraGranted,
                cameraError = cameraError,
                practiceEnabled = practice,
                onPermissionResult = { granted ->
                    cameraGranted = granted
                    if (granted) startCamera(retry = true)
                },
                onPracticeChange = { enabled ->
                    val developerPractice = BuildConfig.DEBUG && enabled
                    if (developerPractice != practice) {
                        controller.clear()
                        frame = ArFrame()
                        practice = developerPractice
                        if (developerPractice) controller.pause() else startCamera(retry = true)
                    }
                },
                onRetryCamera = { startCamera(retry = true) },
            )
        }
    }

    private fun hasCameraPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED

    private fun startCamera(retry: Boolean = false) {
        if (cameraGranted && !practice && activityResumed && (cameraError == null || retry)) {
            cameraError = null
            controller.resume()
        }
    }

    override fun onResume() {
        super.onResume()
        activityResumed = true
        val previouslyGranted = cameraGranted
        cameraGranted = hasCameraPermission()
        startCamera(retry = cameraGranted && !previouslyGranted)
    }

    override fun onPause() {
        activityResumed = false
        controller.pause()
        super.onPause()
    }

    override fun onDestroy() {
        controller.destroy()
        super.onDestroy()
    }
}
