package com.localmodules.audiomode

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AudioModeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager =
        reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val handler = Handler(Looper.getMainLooper())
    private var cleanupRunnable: Runnable? = null
    private var isMonitoring = false
    private val tag = "AudioModeModule"

    override fun getName(): String = "AudioModeModule"

    @ReactMethod
    fun setModeNormal() {
        audioManager.mode = AudioManager.MODE_NORMAL
    }

    @ReactMethod
    fun setModeInCall() {
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
    }

    @ReactMethod
    fun setSpeakerOn(on: Boolean) {
        audioManager.isSpeakerphoneOn = on
    }

    @ReactMethod
    fun resetAudioState() {
        try {
            // Reset completo del estado de audio
            audioManager.mode = AudioManager.MODE_NORMAL
            audioManager.isSpeakerphoneOn = false
            audioManager.abandonAudioFocus(null)
        } catch (e: Exception) {
            // Log error pero no fallar
        }
    }

    @ReactMethod
    fun startAudioMonitoring() {
        handler.post {
            if (isMonitoring) return@post
            isMonitoring = true

            val monitorRunnable = Runnable {
                try {
                    audioManager.mode = AudioManager.MODE_NORMAL
                } catch (e: Exception) {
                    Log.w(tag, "Error updating audio mode during monitoring", e)
                }

                val currentRunnable = cleanupRunnable
                if (isMonitoring && currentRunnable != null) {
                    handler.postDelayed(currentRunnable, 2000)
                }
            }

            cleanupRunnable = monitorRunnable
            handler.postDelayed(monitorRunnable, 2000)
        }
    }

    @ReactMethod
    fun stopAudioMonitoring() {
        handler.post {
            isMonitoring = false
            cleanupRunnable?.let { handler.removeCallbacks(it) }
            cleanupRunnable = null
        }
    }

    @ReactMethod
    fun startCleanupService() {
        try {
            val intent = Intent(reactApplicationContext, AudioCleanupService::class.java)
            reactApplicationContext.startService(intent)
        } catch (e: Exception) {
            // Log error pero no fallar
        }
    }

    @ReactMethod
    fun stopCleanupService() {
        try {
            val intent = Intent(reactApplicationContext, AudioCleanupService::class.java)
            reactApplicationContext.stopService(intent)
        } catch (e: Exception) {
            // Log error pero no fallar
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopAudioMonitoring()
        resetAudioState()
    }
}
