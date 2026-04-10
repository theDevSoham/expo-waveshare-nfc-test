package expo.modules.stidgetwavesharenfc

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.nfc.NfcAdapter
import android.nfc.tech.NfcA
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking

/**
 * Expo native module — Waveshare 2.13" B&W NFC e-paper tag.
 *
 * JavaScript API
 * ──────────────
 *   import { StidgetWaveshareNfc } from 'expo-modules-core';
 *
 *   // Listen for live progress (0–100)
 *   const sub = StidgetWaveshareNfc.addListener('onProgressUpdate', ({ progress }) => {
 *     console.log('Progress:', progress);
 *   });
 *
 *   // base64Image must be a 250×122 B&W PNG/JPEG encoded as base64
 *   const success = await StidgetWaveshareNfc.flashImage(base64Image);
 *   sub.remove();
 *
 * The function blocks until the flash is complete (or throws on error).
 * It automatically enables/disables NFC reader mode around the operation.
 */
class StidgetWaveshareNfcModule : Module() {

    // Dedicated scope for the progress-emission coroutine
    private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun definition() = ModuleDefinition {
        Name("StidgetWaveshareNfc")

        // ── Events ──────────────────────────────────────────────────────────
        Events("onProgressUpdate")

        // ── flashImage ──────────────────────────────────────────────────────
        /**
         * Scans for the tag, flashes the image, and returns true on success.
         *
         * @param base64Image  Base64-encoded image. Must be 250×122 px after decode.
         *                     If a different size is passed it will be centre-cropped /
         *                     letterboxed to 250×122 automatically.
         */
        AsyncFunction("flashImage") { base64Image: String ->

            val activity = appContext.currentActivity
                ?: throw Exception("No active Android Activity found.")

            val nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
                ?: throw Exception("This device does not have NFC hardware.")

            if (!nfcAdapter.isEnabled) {
                throw Exception("NFC is disabled. Please enable it in system settings.")
            }

            // We complete this deferred from inside the NFC reader callback.
            val resultDeferred = CompletableDeferred<Boolean>()

            val readerFlags =
                NfcAdapter.FLAG_READER_NFC_A or          // this tag uses NFC-A
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK or // skip NDEF; we use raw APDUs
                NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS // suppress the system "boing"

            // ── Enable NFC reader mode ─────────────────────────────────────
            nfcAdapter.enableReaderMode(activity, { tag ->

                val nfcA = NfcA.get(tag)
                if (nfcA == null) {
                    resultDeferred.completeExceptionally(
                        Exception("Tag is not NFC-A. Wrong tag type or tag moved too fast.")
                    )
                    return@enableReaderMode
                }

                val protocol = EpaperProtocol(nfcA)
                try {
                    // 1. Connect
                    protocol.open()

                    // 2. Decode + normalise the input image
                    val bitmap = decodeAndNormaliseBitmap(base64Image)

                    // 3. Convert to e-paper byte format (rotation + dithering)
                    val imageBytes = ImageConverter.convert(bitmap)
                    bitmap.recycle()

                    // 4. Initialise display
                    emitProgress(0)
                    protocol.initialize()

                    // 5. Transfer image with live progress
                    protocol.transferImage(imageBytes) { progress ->
                        emitProgress(progress)
                    }

                    resultDeferred.complete(true)

                } catch (e: Exception) {
                    resultDeferred.completeExceptionally(e)
                } finally {
                    protocol.close()
                }

            }, readerFlags, null)

            // ── Wait for the NFC callback to finish ────────────────────────
            try {
                runBlocking { resultDeferred.await() }
            } catch (e: Exception) {
                throw Exception("Flash failed: ${e.message}")
            } finally {
                // CRITICAL: always release the NFC radio
                nfcAdapter.disableReaderMode(activity)
            }
        }

        // ── readTagInfo ─────────────────────────────────────────────────────
        /**
         * Tap the tag and return its product info as a hex string.
         * Useful for debugging / verifying connectivity before a full flash.
         * Returns a map: { sn: String, pid: String, firmwareVersion: String }
         */
        AsyncFunction("readTagInfo") {

            val activity = appContext.currentActivity
                ?: throw Exception("No active Android Activity found.")

            val nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
                ?: throw Exception("NFC not available.")

            val resultDeferred = CompletableDeferred<Map<String, String>>()

            nfcAdapter.enableReaderMode(activity, { tag ->
                val nfcA = NfcA.get(tag)
                if (nfcA == null) {
                    resultDeferred.completeExceptionally(Exception("Not an NFC-A tag."))
                    return@enableReaderMode
                }
                val protocol = EpaperProtocol(nfcA)
                try {
                    protocol.open()
                    val info = protocol.readProductInfo()
                    // info = [8 bytes SN | 1 byte PID | 1 byte FW version]
                    val sn  = info.take(8).joinToString("") { "%02X".format(it) }
                    val pid = "%02X".format(info[8])
                    val fw  = "%02X".format(info[9])
                    resultDeferred.complete(mapOf("sn" to sn, "pid" to pid, "firmwareVersion" to fw))
                } catch (e: Exception) {
                    resultDeferred.completeExceptionally(e)
                } finally {
                    protocol.close()
                }
            }, NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)

            try {
                runBlocking { resultDeferred.await() }
            } catch (e: Exception) {
                throw Exception("readTagInfo failed: ${e.message}")
            } finally {
                nfcAdapter.disableReaderMode(activity)
            }
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Decodes a base64 image and returns a correctly-sized
     * [ImageConverter.DISPLAY_LANDSCAPE_W] × [ImageConverter.DISPLAY_LANDSCAPE_H]
     * RGB_565 bitmap.
     *
     * If the source image is a different size, it is drawn (with white letterbox)
     * into the target dimensions. RGB_565 is used intentionally — it is a flat
     * 2-byte-per-pixel format that prevents the index overflow bugs seen with
     * ARGB_8888 in some older Waveshare SDK versions.
     */
    private fun decodeAndNormaliseBitmap(base64Image: String): Bitmap {
        val bytes = Base64.decode(base64Image, Base64.DEFAULT)
        val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            ?: throw Exception("Failed to decode base64 image. Is it a valid PNG or JPEG?")

        val targetW = ImageConverter.DISPLAY_LANDSCAPE_W  // 250
        val targetH = ImageConverter.DISPLAY_LANDSCAPE_H  // 122

        return if (decoded.width == targetW && decoded.height == targetH) {
            // Already the right size; just ensure RGB_565
            decoded.copy(Bitmap.Config.RGB_565, false).also { decoded.recycle() }
        } else {
            // Letterbox / centre-crop into target dimensions
            val out = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.RGB_565)
            val canvas = Canvas(out)
            canvas.drawColor(Color.WHITE)
            canvas.drawBitmap(decoded, null, Rect(0, 0, targetW, targetH), null)
            decoded.recycle()
            out
        }
    }

    /** Emits a progress event to the JavaScript listener. */
    private fun emitProgress(value: Int) {
        sendEvent("onProgressUpdate", mapOf("progress" to value))
    }

    // override fun onDestroy() {
    //     moduleScope.cancel()
    // }
}
