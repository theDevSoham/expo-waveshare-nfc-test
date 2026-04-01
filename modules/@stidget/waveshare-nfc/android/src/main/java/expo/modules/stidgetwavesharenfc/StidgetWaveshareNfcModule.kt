package expo.modules.stidgetwavesharenfc

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.NfcA
import android.graphics.BitmapFactory
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import waveshare.feng.nfctag.activity.WaveshareBridge
import kotlinx.coroutines.runBlocking

class StidgetWaveshareNfcModule : Module() {
    private val bridge = WaveshareBridge()

    override fun definition() = ModuleDefinition {
        Name("StidgetWaveshareNfc")

        // New consolidated function: Handles the scan AND the flash
        AsyncFunction("startScanAndFlash") { base64Image: String ->
            val activity = appContext.currentActivity 
                ?: throw Exception("Activity not found. Cannot start NFC scanner.")
            
            val nfcAdapter = NfcAdapter.getDefaultAdapter(activity) 
                ?: throw Exception("NFC hardware not available on this device.")

            // We use a Deferred value to wait for the callback to finish
            val resultPromise = CompletableDeferred<Boolean>()

            // 1. Enable Reader Mode
            // This gives us low-level, exclusive access to the NFC radio
            nfcAdapter.enableReaderMode(activity, { tag ->
                try {
                    val nfcA = NfcA.get(tag) ?: throw Exception("Tag does not support NfcA")
                    
                    // CRITICAL: Connect immediately to power the induction coil
                    nfcA.connect()
                    nfcA.timeout = 10000 // 10s timeout for the heavy 2.7" e-paper refresh

                    // 2. Initialize and Process
                    bridge.initialize()
                    
                    val bytes = Base64.decode(base64Image, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        ?: throw Exception("Failed to decode image bitmap")

                    // 3. Transfer to Hardware (Type 6 = 2.7 inch)
                    val result = bridge.transfer(nfcA, 6, bitmap)
                    
                    bitmap.recycle()
                    nfcA.close()
                    
                    // Resolve the promise with the success state
                    resultPromise.complete(result == 1)
                } catch (e: Exception) {
                    // Pass the specific hardware error up
                    resultPromise.completeExceptionally(e)
                }
            }, NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)

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