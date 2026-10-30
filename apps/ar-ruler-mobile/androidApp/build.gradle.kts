import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.play.publisher)
}

val releaseCode = providers.environmentVariable("ANDROID_VERSION_CODE").orElse("1").get().toInt()
require(releaseCode in 1..2100000000) { "ANDROID_VERSION_CODE must be between 1 and 2100000000" }
val releaseName = providers.environmentVariable("ANDROID_VERSION_NAME").orElse("0.1.0").get()
require(releaseName.isNotBlank()) { "ANDROID_VERSION_NAME must not be blank" }
val signingVariables = listOf("ANDROID_KEYSTORE_PATH", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD")
val signingValues = signingVariables.associateWith { providers.environmentVariable(it).orNull }
val hasReleaseSigning = signingValues.values.all { !it.isNullOrBlank() }
val validateReleaseCredentials = tasks.register("validateReleaseCredentials") {
    doLast {
        check(hasReleaseSigning) { "Release signing requires: ${signingVariables.joinToString()}" }
    }
}

android {
    namespace = "app.plainoss.arruler"
    compileSdk = 37

    defaultConfig {
        applicationId = "app.plainoss.arruler"
        minSdk = 26
        targetSdk = 36
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        versionCode = releaseCode
        versionName = releaseName
        manifestPlaceholders["arCoreRequired"] = "true"
        manifestPlaceholders["arCoreMode"] = "required"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("upload") {
                storeFile = file(signingValues.getValue("ANDROID_KEYSTORE_PATH")!!)
                storePassword = signingValues.getValue("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = signingValues.getValue("ANDROID_KEY_ALIAS")
                keyPassword = signingValues.getValue("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            manifestPlaceholders["arCoreRequired"] = "false"
            manifestPlaceholders["arCoreMode"] = "optional"
        }
        release {
            isMinifyEnabled = false
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("upload")
            ndk.debugSymbolLevel = "FULL"
        }
    }
}

tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn(validateReleaseCredentials)
}

play {
    useApplicationDefaultCredentials.set(true)
    defaultToAppBundles.set(true)
    track.set("internal")
    // New apps may need draft releases until their Console setup is complete.
    releaseStatus.set(
        providers.environmentVariable("PLAY_RELEASE_STATUS").orElse("completed").map {
            com.github.triplet.gradle.androidpublisher.ReleaseStatus.valueOf(it.uppercase())
        }
    )
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    // Compose still pulls Espresso 3.5, whose input injection fails on Android 17.
    androidTestImplementation(libs.androidx.test.espresso.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.junit)
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.google.arcore)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
