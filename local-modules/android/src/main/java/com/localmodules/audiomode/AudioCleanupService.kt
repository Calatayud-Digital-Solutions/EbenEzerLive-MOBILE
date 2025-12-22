package com.localmodules.audiomode

import android.app.ActivityManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

class AudioCleanupService : Service() {

    private val TAG = "AudioCleanupService"
    private lateinit var audioManager: AudioManager
    override fun onCreate() {
        super.onCreate()
        try {
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            Log.d(TAG, "AudioCleanupService created.")
        } catch (e: Exception) {
            Log.e(TAG, "Error in onCreate: ${e.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "AudioCleanupService started (Lifecycle Guard).")
        // Start explicit sticky service to ensure it stays alive until explicitly stopped or task removed
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "App task removed. Forcing audio cleanup.")
        resetAudioState()
        super.onTaskRemoved(rootIntent)
        stopSelf()
    }

    override fun onDestroy() {
        Log.d(TAG, "AudioCleanupService destroyed.")
        resetAudioState()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun resetAudioState() {
        try {
            // 1. Reset AudioManager state
            audioManager.mode = AudioManager.MODE_NORMAL
            audioManager.isSpeakerphoneOn = false
            audioManager.abandonAudioFocus(null)
            
            // 2. Stop InCallManager (which maintains its own audio routing)
            stopInCallManager()
            
            Log.d(TAG, "✅ Audio state successfully reset by service.")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error resetting audio state in service: ${e.message}")
        }
    }
    
    private fun stopInCallManager() {
        try {
            // Use reflection to access InCallManager and stop it
            val incallManagerClass = Class.forName("com.zxcpoiu.incallmanager.InCallManagerModule")
            
            // Get the static instance or create method
            val instanceField = try {
                incallManagerClass.getDeclaredField("instance")
            } catch (e: Exception) {
                null
            }
            
            if (instanceField != null) {
                instanceField.isAccessible = true
                val instance = instanceField.get(null)
                
                if (instance != null) {
                    // Call stop method
                    val stopMethod = incallManagerClass.getDeclaredMethod("stop", String::class.java)
                    stopMethod.invoke(instance, "")
                    Log.d(TAG, "✅ InCallManager stopped via reflection")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Could not stop InCallManager via reflection: ${e.message}")
            // Not critical - continue with AudioManager cleanup
        }
    }
}