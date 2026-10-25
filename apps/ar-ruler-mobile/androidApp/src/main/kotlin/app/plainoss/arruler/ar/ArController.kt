package app.plainoss.arruler.ar

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import app.plainoss.arruler.core.ClipPoint
import app.plainoss.arruler.core.MeasurementMode
import app.plainoss.arruler.core.Point3D
import app.plainoss.arruler.core.clipSpacePoint
import app.plainoss.arruler.core.projectToViewport
import com.google.ar.core.Anchor
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Camera
import com.google.ar.core.Config
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.HitResult
import com.google.ar.core.Plane
import com.google.ar.core.Point
import com.google.ar.core.Pose
import com.google.ar.core.Session
import com.google.ar.core.TrackingFailureReason
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.CameraNotAvailableException
import com.google.ar.core.exceptions.DeadlineExceededException
import com.google.ar.core.exceptions.NotTrackingException
import com.google.ar.core.exceptions.ResourceExhaustedException
import com.google.ar.core.exceptions.UnavailableApkTooOldException
import com.google.ar.core.exceptions.UnavailableArcoreNotInstalledException
import com.google.ar.core.exceptions.UnavailableDeviceNotCompatibleException
import com.google.ar.core.exceptions.UnavailableSdkTooOldException
import com.google.ar.core.exceptions.UnavailableUserDeclinedInstallationException
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.concurrent.thread

/**
 * Android-only AR adapter. Lifecycle and callbacks belong to the main thread; frame, hit-test, and
 * anchor operations belong exclusively to the GL thread. The shared module stays ARCore-free.
 */
class ArController(private val activity: Activity) : GLSurfaceView.Renderer {
    var onFrame: ((ArFrame) -> Unit)? = null
    var onError: ((String) -> Unit)? = null
    var onPointAdded: (() -> Unit)? = null

    @Volatile var mode: MeasurementMode = MeasurementMode.DISTANCE

    private val main = Handler(Looper.getMainLooper())
    private val commands = ConcurrentLinkedQueue<Command>()
    private val commandRevision = AtomicLong(0L)
    private val anchors = mutableListOf<Anchor>()
    private val background = CameraBackground()
    private val errorPending = AtomicBoolean(false)
    private val projection = FloatArray(16)
    private val view = FloatArray(16)
    private val viewProjection = FloatArray(16)

    @Volatile private var session: Session? = null
    @Volatile private var sessionRunning = false
    @Volatile private var destroyed = false
    private var surface: GLSurfaceView? = null
    private var surfaceRunning = false
    private var activityResumed = false
    private var installRequested = false
    private var availabilityChecks = 0
    private var width = 0
    private var height = 0
    private var displayRotation = -1
    private var displayGeometryDirty = true
    private var textureSession: Session? = null
    private var backgroundReady = false
    private var selectedPointIndex: Int? = null
    private var areaClosed = false
    private var commandMode = MeasurementMode.DISTANCE
    private var lastFrameDelivery = 0L
    private var lastPublished: ArFrame = ArFrame()
    private var forceFrame = true
    private var placementMessage: String? = null
    private var placementMessageUntil = 0L
    private val checkAvailabilityAgain = Runnable {
        if (activityResumed && !destroyed) startSession()
    }

    /** Safe whether Compose creates this before or after the activity's first onResume. */
    fun createView(): GLSurfaceView {
        checkMainThread()
        check(!destroyed) { "The AR controller has been destroyed" }
        surface?.let {
            return it
        }
        return GLSurfaceView(activity).also { cameraView ->
            cameraView.setEGLContextClientVersion(2)
            cameraView.setEGLConfigChooser(8, 8, 8, 8, 16, 0)
            cameraView.preserveEGLContextOnPause = true
            cameraView.setRenderer(this)
            cameraView.renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
            cameraView.contentDescription = "Live AR camera"
            // GLSurfaceView starts unpaused. Explicitly synchronize it with the session before it
            // is attached; update() must never race Session.pause().
            cameraView.onPause()
            surface = cameraView
            if (sessionRunning) {
                cameraView.onResume()
                surfaceRunning = true
            }
        }
    }

    /** Call after camera permission is granted, from onResume and from an explicit Retry action. */
    fun resume() {
        checkMainThread()
        if (destroyed) return
        activityResumed = true
        availabilityChecks = 0
        main.removeCallbacks(checkAvailabilityAgain)
        startSession()
    }

    fun pause() {
        checkMainThread()
        activityResumed = false
        main.removeCallbacks(checkAvailabilityAgain)
        stopSession()
    }

    fun destroy() {
        checkMainThread()
        if (destroyed) return
        pause()
        destroyed = true
        onFrame = null
        onError = null
        onPointAdded = null
        commands.clear()
        val closing = session
        session = null
        // pause has joined the renderer. No ARCore object can be accessed after this point.
        // ARCore documents that close can take seconds, so do not block activity teardown.
        if (closing != null)
            thread(name = "arcore-close") {
                runCatching { closing.close() }
                    .onFailure { Log.w(TAG, "Unable to close the AR session", it) }
            }
    }

    /** Add the surface currently under the center crosshair. Re-hit-tested on the next frame. */
    fun requestAddPoint() {
        if (sessionRunning) enqueue(Command.Add(null, null))
    }

    /** x and y are physical pixels relative to the GLSurfaceView, not the whole activity. */
    fun requestAddPoint(x: Float, y: Float) {
        if (sessionRunning && x.isFinite() && y.isFinite()) enqueue(Command.Add(x, y))
    }

    /** Close the current polygon without adding a duplicate anchor at its first corner. */
    fun closeArea() {
        if (sessionRunning) enqueue(Command.CloseArea)
    }

    fun undo() {
        if (destroyed) return
        val revision = enqueue(Command.Undo)
        publishCommandState(revision) {
            val reopening = mode == MeasurementMode.AREA && it.areaClosed
            // Queued placements may not be published yet. Treat this optimistic UI update as
            // pending until the GL frame confirms the exact resulting geometry; saving it early
            // could otherwise save one point too few after a rapid Add → Undo sequence.
            it.copy(
                points = if (reopening) it.points else it.points.dropLast(1),
                projectedPoints =
                    if (reopening) it.projectedPoints else it.projectedPoints.dropLast(1),
                clipPoints = if (reopening) it.clipPoints else it.clipPoints.dropLast(1),
                targetScreen = null,
                targetClipPoint = null,
                selectedPointIndex = null,
                tracking = false,
                anchorsTracking = false,
                status = "Updating measurement…",
                mode = mode,
                areaClosed = false,
            )
        }
    }

    fun clear() {
        if (destroyed) return
        val revision = enqueue(Command.Clear)
        publishCommandState(revision) {
            it.copy(
                points = emptyList(),
                projectedPoints = emptyList(),
                clipPoints = emptyList(),
                targetScreen = null,
                targetClipPoint = null,
                selectedPointIndex = null,
                anchorsTracking = true,
                mode = mode,
                areaClosed = false,
            )
        }
    }

    fun requestSelectPoint(index: Int) {
        if (!destroyed) enqueue(Command.Select(index))
    }

    fun requestCancelSelection() {
        if (!destroyed) enqueue(Command.CancelSelection)
    }

    private fun enqueue(command: Command): Long {
        // Publish the queue entry before its revision. The GL thread captures a revision BEFORE
        // consuming the queue, so a snapshot can never claim to include an unprocessed command.
        commands.add(command)
        return commandRevision.incrementAndGet()
    }

    private fun publishCommandState(revision: Long, transform: (ArFrame) -> ArFrame) {
        val publish = {
            if (!destroyed && revision == commandRevision.get()) {
                lastPublished = transform(lastPublished)
                onFrame?.invoke(lastPublished)
            }
        }
        if (Looper.myLooper() == Looper.getMainLooper()) publish() else main.post { publish() }
    }

    private fun startSession() {
        if (!activityResumed || destroyed || sessionRunning) return
        if (
            activity.checkSelfPermission(Manifest.permission.CAMERA) !=
                PackageManager.PERMISSION_GRANTED
        ) {
            publishUnavailable("Camera permission is needed to measure in AR.")
            return
        }
        try {
            val current =
                session
                    ?: run {
                        val apk = ArCoreApk.getInstance()
                        val availability = apk.checkAvailability(activity)
                        when {
                            availability.isUnsupported -> {
                                reportError(
                                    "This device does not support ARCore. You can still explore the sample measurements."
                                )
                                return
                            }
                            availability.isTransient -> {
                                publishUnavailable("Checking AR support…")
                                if (++availabilityChecks <= MAX_AVAILABILITY_CHECKS) {
                                    main.postDelayed(checkAvailabilityAgain, 250L)
                                } else {
                                    reportError(
                                        "Could not check AR support. Check your connection and retry."
                                    )
                                }
                                return
                            }
                            availability.isUnknown -> {
                                reportError(
                                    "Could not check AR support. Check your connection and retry."
                                )
                                return
                            }
                        }
                        when (apk.requestInstall(activity, !installRequested)) {
                            ArCoreApk.InstallStatus.INSTALL_REQUESTED -> {
                                installRequested = true
                                publishUnavailable(
                                    "Install Google Play Services for AR to start measuring."
                                )
                                return
                            }
                            ArCoreApk.InstallStatus.INSTALLED -> Unit
                        }
                        Session(activity).also { newSession ->
                            try {
                                val config =
                                    Config(newSession).apply {
                                        planeFindingMode =
                                            Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                                        focusMode = Config.FocusMode.AUTO
                                        lightEstimationMode = Config.LightEstimationMode.DISABLED
                                        instantPlacementMode = Config.InstantPlacementMode.DISABLED
                                        depthMode =
                                            if (
                                                newSession.isDepthModeSupported(
                                                    Config.DepthMode.AUTOMATIC
                                                )
                                            ) {
                                                Config.DepthMode.AUTOMATIC
                                            } else Config.DepthMode.DISABLED
                                    }
                                newSession.configure(config)
                            } catch (error: Exception) {
                                thread(name = "arcore-close") { newSession.close() }
                                throw error
                            }
                            session = newSession
                        }
                    }
            current.resume()
            errorPending.set(false)
            sessionRunning = true
            surface?.let {
                if (!surfaceRunning) {
                    it.onResume()
                    surfaceRunning = true
                }
            }
            publishUnavailable("Move your phone slowly to find a surface.")
        } catch (error: Exception) {
            Log.e(TAG, "Could not resume the AR session", error)
            if (error is UnavailableUserDeclinedInstallationException) installRequested = false
            reportError(
                when (error) {
                    is UnavailableUserDeclinedInstallationException ->
                        "Google Play Services for AR is required. Tap Retry to install it."
                    is UnavailableArcoreNotInstalledException,
                    is UnavailableApkTooOldException ->
                        "Install or update Google Play Services for AR, then retry."
                    is UnavailableSdkTooOldException ->
                        "This app needs an update to work with Google Play Services for AR."
                    is UnavailableDeviceNotCompatibleException ->
                        "This device does not support ARCore. You can still explore the sample measurements."
                    is CameraNotAvailableException ->
                        "The camera is unavailable. Close other camera apps and tap Retry."
                    is SecurityException ->
                        "Camera access is disabled. Allow camera access in Android settings, then retry."
                    else -> "Could not start AR. Tap Retry to try again."
                }
            )
        }
    }

    private fun stopSession() {
        val wasRunning = sessionRunning
        sessionRunning = false
        commandRevision.incrementAndGet()
        // This order is required by ARCore: first stop calls to update(), then pause the session.
        if (surfaceRunning) {
            surface?.onPause()
            surfaceRunning = false
        }
        if (wasRunning)
            runCatching { session?.pause() }
                .onFailure { Log.w(TAG, "Unable to pause the AR session", it) }
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        try {
            GLES20.glClearColor(0.025f, 0.035f, 0.05f, 1f)
            backgroundReady = false
            background.create()
            backgroundReady = true
            textureSession = null
            displayGeometryDirty = true
            forceFrame = true
        } catch (error: RuntimeException) {
            failRendering("Could not initialize the camera display. Tap Retry to try again.", error)
        }
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        this.width = width
        this.height = height
        GLES20.glViewport(0, 0, width, height)
        displayGeometryDirty = true
        forceFrame = true
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
        val current = session ?: return
        if (!sessionRunning || destroyed || errorPending.get() || width <= 0 || height <= 0) return
        try {
            if (!backgroundReady) {
                background.create()
                backgroundReady = true
                textureSession = null
            }
            if (textureSession !== current) {
                current.setCameraTextureName(background.textureId)
                textureSession = current
            }
            @Suppress("DEPRECATION") val rotation = activity.windowManager.defaultDisplay.rotation
            if (displayGeometryDirty || displayRotation != rotation) {
                current.setDisplayGeometry(rotation, width, height)
                displayRotation = rotation
                displayGeometryDirty = false
            }
            val frame = current.update()
            background.draw(frame)
            val camera = frame.camera
            val cameraTracking = camera.trackingState == TrackingState.TRACKING
            if (
                !cameraTracking && camera.trackingFailureReason == TrackingFailureReason.BAD_STATE
            ) {
                failRendering(
                    "Tracking could not recover. Tap Retry to start a new measurement.",
                    IllegalStateException("ARCore reported a bad tracking state"),
                    resetSession = true,
                )
                return
            }
            val frameRevision = commandRevision.get()
            processCommands(frame, cameraTracking)
            val anchorsTracking = anchors.all { it.trackingState == TrackingState.TRACKING }
            val now = SystemClock.uptimeMillis()
            if (!forceFrame && now - lastFrameDelivery < FRAME_INTERVAL_MS) return
            forceFrame = false
            lastFrameDelivery = now
            val points = anchors.map { it.pose.toPoint() }
            val target =
                if (cameraTracking) findHit(frame, width / 2f, height / 2f)?.hitPose?.toPoint()
                else null
            camera.getProjectionMatrix(projection, 0, 0.05f, 100f)
            camera.getViewMatrix(view, 0)
            Matrix.multiplyMM(viewProjection, 0, projection, 0, view, 0)
            // Keep finite homogeneous coordinates even when an endpoint is outside the viewport
            // or behind the camera. The overlay clips the complete segment before dividing by w;
            // requiring both endpoint markers to be visible would erase an otherwise visible line.
            val clipPoints = points.mapIndexed { index, point ->
                if (cameraTracking && anchors[index].trackingState == TrackingState.TRACKING) {
                    clipSpacePoint(point, viewProjection)
                } else null
            }
            val targetClipPoint = target?.let { clipSpacePoint(it, viewProjection) }
            val status =
                when {
                    !cameraTracking -> trackingMessage(camera)
                    !anchorsTracking ->
                        "Tracking a placed point was lost. Move back toward it, or undo it."
                    placementMessage != null && now < placementMessageUntil -> placementMessage!!
                    target == null -> "Aim at a textured surface and move slowly."
                    selectedPointIndex != null ->
                        "Point ${selectedPointIndex!! + 1} selected · aim and tap Move"
                    else -> "Surface found · tap + to place a point"
                }
            val snapshot =
                ArFrame(
                    points = points,
                    projectedPoints = clipPoints.map(::project),
                    target = target,
                    targetScreen = targetClipPoint?.let(::project),
                    tracking = cameraTracking,
                    status = status,
                    width = width,
                    height = height,
                    anchorsTracking = anchorsTracking,
                    selectedPointIndex = selectedPointIndex,
                    mode = mode,
                    clipPoints = clipPoints,
                    targetClipPoint = targetClipPoint,
                    areaClosed = areaClosed,
                )
            main.post {
                if (
                    !destroyed &&
                        sessionRunning &&
                        !errorPending.get() &&
                        frameRevision == commandRevision.get()
                ) {
                    lastPublished = snapshot
                    onFrame?.invoke(snapshot)
                }
            }
        } catch (error: CameraNotAvailableException) {
            failRendering(
                "The camera is unavailable. Close other camera apps and tap Retry.",
                error,
            )
        } catch (error: Exception) {
            failRendering(
                "AR tracking was interrupted. Tap Retry to start a new measurement.",
                error,
                resetSession = true,
            )
        }
    }

    private fun processCommands(frame: Frame, cameraTracking: Boolean) {
        val currentMode = mode
        if (commandMode != currentMode) {
            areaClosed = false
            commandMode = currentMode
        }
        while (true) {
            when (val command = commands.poll() ?: return) {
                Command.Clear -> detachAnchors()
                Command.Undo -> {
                    selectedPointIndex = null
                    if (currentMode == MeasurementMode.AREA && areaClosed) {
                        areaClosed = false
                    } else if (anchors.isNotEmpty()) {
                        anchors.removeAt(anchors.lastIndex).detach()
                    }
                }
                Command.CloseArea -> {
                    if (
                        currentMode == MeasurementMode.AREA &&
                            !areaClosed &&
                            anchors.size >= 3 &&
                            cameraTracking &&
                            anchors.all { it.trackingState == TrackingState.TRACKING } &&
                            selectedPointIndex == null
                    ) {
                        areaClosed = true
                        placementMessage = null
                    }
                }
                is Command.Select ->
                    if (command.index in anchors.indices) selectedPointIndex = command.index
                Command.CancelSelection -> selectedPointIndex = null
                is Command.Add -> {
                    if (
                        !cameraTracking ||
                            anchors.any { it.trackingState != TrackingState.TRACKING }
                    ) {
                        showPlacementMessage("Wait for tracking to recover before placing a point.")
                        continue
                    }
                    val x = command.x ?: (width / 2f)
                    val y = command.y ?: (height / 2f)
                    if (x !in 0f..width.toFloat() || y !in 0f..height.toFloat()) continue
                    val hit = findHit(frame, x, y)
                    if (hit == null) {
                        showPlacementMessage("No surface here yet. Move slowly and try again.")
                        continue
                    }
                    if (!hit.hitPose.toPoint().isFinite) continue
                    // Create first: a transient failure must not erase a completed measurement.
                    val anchor =
                        try {
                            hit.createAnchor()
                        } catch (_: NotTrackingException) {
                            showPlacementMessage(
                                "The surface moved out of tracking. Hold steady and try again."
                            )
                            continue
                        } catch (_: ResourceExhaustedException) {
                            showPlacementMessage(
                                "AR has reached its point limit. Save this measurement, then clear it."
                            )
                            continue
                        } catch (_: DeadlineExceededException) {
                            showPlacementMessage("The surface changed. Hold steady and try again.")
                            continue
                        }
                    val replacingIndex = selectedPointIndex
                    if (replacingIndex != null && replacingIndex in anchors.indices) {
                        val previous = anchors.set(replacingIndex, anchor)
                        previous.detach()
                        selectedPointIndex = null
                        placementMessage = null
                        forceFrame = true
                        main.post { if (!destroyed && sessionRunning) onPointAdded?.invoke() }
                        continue
                    }
                    if (
                        (currentMode == MeasurementMode.AREA && areaClosed) ||
                            currentMode.maximumPoints?.let { anchors.size >= it } == true
                    )
                        detachAnchors()
                    if (anchors.size >= MAX_ANCHORS) {
                        anchor.detach()
                        showPlacementMessage(
                            "This measurement has $MAX_ANCHORS points. Save it, then start a new one."
                        )
                        continue
                    }
                    anchors.add(anchor)
                    placementMessage = null
                    main.post { if (!destroyed && sessionRunning) onPointAdded?.invoke() }
                }
            }
            forceFrame = true
        }
    }

    /**
     * All hits have real estimated geometry; approximate Instant Placement is deliberately absent.
     */
    private fun findHit(frame: Frame, x: Float, y: Float): HitResult? =
        frame.hitTest(x, y).firstOrNull { hit ->
            if (hit.trackable.trackingState != TrackingState.TRACKING || !hit.distance.isFinite())
                return@firstOrNull false
            when (val trackable = hit.trackable) {
                is Plane ->
                    trackable.isPoseInPolygon(hit.hitPose) &&
                        isInFrontOfPlane(hit.hitPose, frame.camera.pose)
                is Point ->
                    trackable.orientationMode == Point.OrientationMode.ESTIMATED_SURFACE_NORMAL
                is DepthPoint -> true
                else -> false
            }
        }

    private fun isInFrontOfPlane(plane: Pose, camera: Pose): Boolean {
        val normal = plane.getTransformedAxis(1, 1f)
        return (camera.tx() - plane.tx()) * normal[0] +
            (camera.ty() - plane.ty()) * normal[1] +
            (camera.tz() - plane.tz()) * normal[2] > 0f
    }

    private fun project(point: ClipPoint?): ScreenPoint {
        val projected =
            point?.let { projectToViewport(it, width, height) } ?: return ScreenPoint(0f, 0f, false)
        return ScreenPoint(projected.x.toFloat(), projected.y.toFloat())
    }

    private fun detachAnchors() {
        anchors.forEach(Anchor::detach)
        anchors.clear()
        selectedPointIndex = null
        areaClosed = false
        placementMessage = null
    }

    private fun showPlacementMessage(message: String) {
        placementMessage = message
        placementMessageUntil = SystemClock.uptimeMillis() + 2_000L
        forceFrame = true
    }

    private fun trackingMessage(camera: Camera): String =
        when (camera.trackingFailureReason) {
            TrackingFailureReason.INSUFFICIENT_LIGHT ->
                "More light is needed. Check that camera access is enabled."
            TrackingFailureReason.EXCESSIVE_MOTION -> "Move your phone more slowly."
            TrackingFailureReason.INSUFFICIENT_FEATURES ->
                "Aim at a surface with more texture or detail."
            TrackingFailureReason.CAMERA_UNAVAILABLE ->
                "Another app is using the camera. Return here to continue."
            TrackingFailureReason.BAD_STATE -> "Tracking was lost. Tap Retry to restart AR."
            else -> "Move your phone slowly to find a surface."
        }

    private fun failRendering(message: String, error: Exception, resetSession: Boolean = false) {
        Log.e(TAG, message, error)
        if (!errorPending.compareAndSet(false, true)) return
        // A fatal session cannot recover by resuming. Invalidate its world coordinates while still
        // on the GL thread, then close it only after rendering has stopped. Camera contention uses
        // the non-resetting path so temporarily switching apps preserves the measurement.
        if (resetSession) {
            anchors.forEach { runCatching { it.detach() } }
            anchors.clear()
            selectedPointIndex = null
            areaClosed = false
            commands.clear()
        }
        main.post {
            if (!destroyed) {
                stopSession()
                if (resetSession) {
                    val closing = session
                    session = null
                    lastPublished = ArFrame()
                    if (closing != null)
                        thread(name = "arcore-close") {
                            runCatching { closing.close() }
                                .onFailure { Log.w(TAG, "Unable to close a failed AR session", it) }
                        }
                }
                reportError(message)
            }
        }
    }

    private fun publishUnavailable(message: String) {
        lastPublished =
            lastPublished.copy(
                target = null,
                targetScreen = null,
                projectedPoints = lastPublished.projectedPoints.map { it.copy(visible = false) },
                clipPoints = List(lastPublished.points.size) { null },
                targetClipPoint = null,
                tracking = false,
                anchorsTracking = false,
                status = message,
            )
        onFrame?.invoke(lastPublished)
    }

    private fun reportError(message: String) {
        publishUnavailable(message)
        onError?.invoke(message)
    }

    private fun checkMainThread() =
        check(Looper.myLooper() == Looper.getMainLooper()) {
            "AR lifecycle methods must be called on the main thread"
        }

    private fun Pose.toPoint() = Point3D(tx().toDouble(), ty().toDouble(), tz().toDouble())

    private sealed interface Command {
        data class Add(val x: Float?, val y: Float?) : Command

        data class Select(val index: Int) : Command

        data object CancelSelection : Command

        data object Undo : Command

        data object Clear : Command

        data object CloseArea : Command
    }

    private companion object {
        const val TAG = "ArRuler"
        const val FRAME_INTERVAL_MS = 50L
        const val MAX_AVAILABILITY_CHECKS = 40
        const val MAX_ANCHORS = 128
    }
}
