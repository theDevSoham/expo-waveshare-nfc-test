package expo.modules.stidgetwavesharenfc

import android.graphics.Bitmap
import android.nfc.NfcAdapter
import android.nfc.tech.NfcA
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import waveshare.feng.nfctag.activity.WaveshareBridge
import kotlinx.coroutines.runBlocking
import androidx.core.graphics.createBitmap
import kotlinx.coroutines.*

class StidgetWaveshareNfcModule : Module() {
    private val bridge = WaveshareBridge()

    // Define a scope for background tasks (monitoring progress)
    private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun definition() = ModuleDefinition {
        Name("StidgetWaveshareNfc")

        // Register the event that will be sent to JavaScript
        Events("onProgressUpdate")

        // New consolidated function: Handles the scan AND the flash
        AsyncFunction("startScanAndFlash") { chipType: Int, base64Image: String ->
            val activity = appContext.currentActivity
                ?: throw Exception("Activity not found. Cannot start NFC scanner.")

            val nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
                ?: throw Exception("NFC hardware not available on this device.")

            // We use a Deferred value to wait for the callback to finish
            val resultPromise = CompletableDeferred<Boolean>()

            val nfcFlags = NfcAdapter.FLAG_READER_NFC_A or
               NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK or
               NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS

            // 1. Enable Reader Mode
            // This gives us low-level, exclusive access to the NFC radio
            nfcAdapter.enableReaderMode(activity, { tag ->
                try {
                    val nfcA = NfcA.get(tag) ?: throw Exception("Tag mismatch")

                    // IMPORTANT: DO NOT call nfcA.connect() here.
                    // The sdk.a() method inside WaveshareBridge does it for you.

                    bridge.initialize()

                    // --- DECODE & AGGRESSIVE SAFETY CROP ---
                    val bytes = Base64.decode(base64Image, Base64.DEFAULT)
                    val originalBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        ?: throw Exception("Bitmap decode error")

                    // Force dimensions
                    val targetW = if (chipType == 1) 250 else if (chipType == 6) 264 else originalBitmap.width
                    val targetH = if (chipType == 1) 122 else if (chipType == 6) 176 else originalBitmap.height

                    // IMPORTANT: Use RGB_565. It's 2 bytes per pixel and much "flatter"
                    // than ARGB_8888, which often prevents the index overflow.
                    val cleanBitmap = createBitmap(targetW, targetH, Bitmap.Config.RGB_565)
                    val canvas = Canvas(cleanBitmap)
                    canvas.drawColor(Color.WHITE)

                    // Ensure no scaling "fuzziness" by using a strict Rect
                    val destRect = Rect(0, 0, targetW, targetH)
                    canvas.drawBitmap(originalBitmap, null, destRect, null)

                    // FINAL CHECK: If it's Type 1, the SDK is literally looking for 30500 (250 * 122).
                    // Some versions of the Waveshare SDK have a bug where if the Bitmap
                    // density is not default, it miscalculates.
                    cleanBitmap.density = Bitmap.DENSITY_NONE

                    // --- PROGRESS MONITORING ---
                    // Explicitly launch on our moduleScope to avoid scope errors
                    val monitorJob = moduleScope.launch {
                        var lastProgress = -1
                        while (isActive) { // Standard CoroutineScope isActive check
                            val currentProgress = bridge.getProgress()
                            if (currentProgress != lastProgress) {
                                // Emit the event to the JS listener
                                sendEvent("onProgressUpdate", mapOf(
                                    "progress" to currentProgress
                                ))
                                lastProgress = currentProgress
                            }
                            if (currentProgress >= 100 || currentProgress == -1) break
                            delay(50)
                        }
                    }

                    // This one call handles connection, handshake, and transfer
                    val result = bridge.transfer(nfcA, chipType, cleanBitmap)

                    // 3. Cleanup
                    monitorJob.cancel()
                    originalBitmap.recycle()
                    cleanBitmap.recycle()
                    // Note: sdk.a() does NOT call nfcA.close(), so we do it here
                    try { nfcA.close() } catch (e: Exception) {}

                    resultPromise.complete(result == 1)
                } catch (e: Exception) {
                    resultPromise.completeExceptionally(e)
                }
            }, nfcFlags, null)
            // 4. Wait for the process to complete or fail
            try {
                return@AsyncFunction runBlocking {
                    resultPromise.await()
                }
            } catch (e: Exception) {
                throw Exception("Native Flash Failed: ${e.message}")
            } finally {
                // 5. CRITICAL: Always disable reader mode to release the hardware
                nfcAdapter.disableReaderMode(activity)
            }
        }

        Function("getProgress") {
            bridge.getProgress()
        }
    }
}