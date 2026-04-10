package expo.modules.stidgetwavesharenfc

import android.nfc.tech.NfcA

/**
 * Pure NFC protocol implementation for the Waveshare 2.13" Black & White
 * NFC-powered e-paper tag, based on the official command description V1.1.
 *
 * All APDU frames are built from the document's hex sequences:
 *
 *   SEND CMD  → 74 99 00 0D <len> <cmd_byte>
 *   SEND DATA → 74 9A 00 0E <len> <data...>
 *   CHECK BUSY→ 74 9B 00 0F 01
 *   RST LOW   → 74 97 00 08 00
 *   RST HIGH  → 74 97 00 08 01   (doc has a typo; last byte is the level)
 *   READ INFO → ED 05 AC AF 0A
 *
 * Every transceive response must end with [0x90, 0x00] to indicate success.
 * Any other status word is treated as a protocol error.
 *
 * Usage:
 *   val protocol = EpaperProtocol(nfcA)
 *   protocol.open()
 *   try {
 *       protocol.initialize()
 *       protocol.transferImage(imageBytes) { progress -> ... }
 *   } finally {
 *       protocol.close()
 *   }
 */
class EpaperProtocol(private val nfcA: NfcA) {

    companion object {
        // NFC transceive timeout (ms). Must be long enough to cover the full transfer.
        // At ~250-byte chunks × 16 chunks plus refresh wait, 30 s is conservative.
        private const val TRANSCEIVE_TIMEOUT_MS = 30_000

        // Max time to wait for BUSY to de-assert after a refresh command.
        private const val BUSY_POLL_TIMEOUT_MS = 30_000L
        private const val BUSY_POLL_INTERVAL_MS = 100L

        // Image data chunk size in bytes (0xFA as shown in the protocol doc).
        private const val CHUNK_SIZE = 0xFA  // 250 bytes

        // ---- APDU frame builders ----

        /** 74 99 00 0D <len=1> <cmd> */
        private fun sendCmd(cmd: Int): ByteArray =
            byteArrayOf(0x74, 0x99.toByte(), 0x00, 0x0D, 0x01, cmd.toByte())

        /** 74 9A 00 0E <len> <data...> */
        private fun sendData(vararg data: Int): ByteArray {
            val header = byteArrayOf(0x74, 0x9A.toByte(), 0x00, 0x0E, data.size.toByte())
            return header + data.map { it.toByte() }.toByteArray()
        }

        /** 74 9A 00 0E <len> <chunk> — overload for raw ByteArray chunks */
        private fun sendDataBytes(chunk: ByteArray): ByteArray {
            val header = byteArrayOf(0x74, 0x9A.toByte(), 0x00, 0x0E, chunk.size.toByte())
            return header + chunk
        }

        /** 74 9B 00 0F 01 */
        private val CHECK_BUSY = byteArrayOf(0x74, 0x9B.toByte(), 0x00, 0x0F, 0x01)

        /** 74 97 00 08 00  (RST pin LOW) */
        private val RST_LOW = byteArrayOf(0x74, 0x97.toByte(), 0x00, 0x08, 0x00)

        /**
         * 74 97 00 08 01  (RST pin HIGH)
         * Note: the official doc lists identical bytes for both RST states —
         * that is a typo. The last byte is the pin level (0 = low, 1 = high).
         */
        private val RST_HIGH = byteArrayOf(0x74, 0x97.toByte(), 0x00, 0x08, 0x01)

        /** ED 05 AC AF 0A  (Read product info) */
        private val READ_INFO = byteArrayOf(0xED.toByte(), 0x05, 0xAC.toByte(), 0xAF.toByte(), 0x0A)
    }

    // ---- Public API ----

    /**
     * Connect to the tag and set the transceive timeout.
     * Must be called before any other method.
     */
    fun open() {
        nfcA.connect()
        nfcA.timeout = TRANSCEIVE_TIMEOUT_MS
    }

    /**
     * Disconnect from the tag.
     * Safe to call even if open() was never reached (e.g. in a finally block).
     */
    fun close() {
        try { nfcA.close() } catch (_: Exception) {}
    }

    /**
     * Read the 10-byte product info block (8-byte SN + 1-byte PID + 1-byte FW version).
     * Useful for verifying the tag is reachable before a flash.
     */
    fun readProductInfo(): ByteArray {
        val response = transceive(READ_INFO, "readProductInfo")
        // Strip the trailing 90 00 status word
        return response.copyOf(response.size - 2)
    }

    /**
     * Run the full init sequence for the 2.13" B&W display.
     * Mirrors the exact command sequence from the protocol doc, including delays.
     */
    fun initialize() {
        // Hardware reset
        transceive(RST_LOW,  "RST_LOW");  Thread.sleep(10)
        transceive(RST_HIGH, "RST_HIGH"); Thread.sleep(100)

        // ---- Configuration sequence (verbatim from doc) ----

        // 0x18: Border waveform control → 0x80
        transceive(sendCmd(0x18), "cmd 0x18")
        transceive(sendData(0x80), "data 0x80")

        // 0x11: Data entry mode → 0x03 (Y decrement, X increment)
        transceive(sendCmd(0x11), "cmd 0x11")
        transceive(sendData(0x03), "data 0x03")

        // 0x22: Display update control → 0xB1
        transceive(sendCmd(0x22), "cmd 0x22 (init phase 1)")
        transceive(sendData(0xB1), "data 0xB1")

        // 0x20: Master activation (no data) — 100 ms delay required
        transceive(sendCmd(0x20), "cmd 0x20 (activate, phase 1)")
        Thread.sleep(100)

        // 0x1A: Temperature sensor control → 0x64 0x00
        transceive(sendCmd(0x1A), "cmd 0x1A")
        transceive(sendData(0x64, 0x00), "data 0x64 0x00")

        // 0x44: RAM X address start/end → 0x00 .. 0x0F (16 bytes = 128 bits ≥ 122 px)
        transceive(sendCmd(0x44), "cmd 0x44")
        transceive(sendData(0x00, 0x0F), "data 0x00 0x0F")

        // 0x45: RAM Y address start/end → 0x0000 .. 0x00F9 (250 rows)
        transceive(sendCmd(0x45), "cmd 0x45")
        transceive(sendData(0x00, 0x00, 0xF9, 0x00), "data 0x00 0x00 0xF9 0x00")

        // 0x4E: RAM X address counter → 0x00
        transceive(sendCmd(0x4E), "cmd 0x4E")
        transceive(sendData(0x00), "data 0x00")

        // 0x4F: RAM Y address counter → 0x00 0x00
        transceive(sendCmd(0x4F), "cmd 0x4F")
        transceive(sendData(0x00, 0x00), "data 0x00 0x00")

        // 0x22: Display update control → 0x91
        transceive(sendCmd(0x22), "cmd 0x22 (init phase 2)")
        transceive(sendData(0x91), "data 0x91")

        // 0x20: Master activation — another 100 ms delay required
        transceive(sendCmd(0x20), "cmd 0x20 (activate, phase 2)")
        Thread.sleep(100)
    }

    /**
     * Transfer the full 4,000-byte image payload and trigger an e-ink refresh.
     *
     * @param imageBytes  Exactly [ImageConverter.TOTAL_BYTES] bytes (4,000).
     * @param onProgress  Called with values 0..100 as packets are sent.
     */
    fun transferImage(imageBytes: ByteArray, onProgress: (Int) -> Unit) {
        require(imageBytes.size == ImageConverter.TOTAL_BYTES) {
            "imageBytes must be ${ImageConverter.TOTAL_BYTES} bytes (got ${imageBytes.size})"
        }

        // 0x24: Write RAM — signals the start of image data
        transceive(sendCmd(0x24), "cmd 0x24 (write RAM)")

        // Send image data in 250-byte chunks (0xFA as per doc)
        val totalChunks = Math.ceil(imageBytes.size.toDouble() / CHUNK_SIZE).toInt()
        var chunkIndex = 0
        var offset = 0

        while (offset < imageBytes.size) {
            val end = minOf(offset + CHUNK_SIZE, imageBytes.size)
            val chunk = imageBytes.copyOfRange(offset, end)
            transceive(sendDataBytes(chunk), "image chunk ${chunkIndex + 1}/$totalChunks")
            offset = end
            chunkIndex++
            onProgress((chunkIndex * 100) / totalChunks)
        }

        // ---- Trigger e-ink refresh ----

        // 0x22: Display update control → 0xC7 (full refresh)
        transceive(sendCmd(0x22), "cmd 0x22 (refresh)")
        transceive(sendData(0xC7), "data 0xC7")

        // 0x20: Master activation — starts the physical refresh
        transceive(sendCmd(0x20), "cmd 0x20 (refresh activate)")

        // Poll BUSY until display is idle
        waitForIdle()

        onProgress(100)
    }

    // ---- Private helpers ----

    /**
     * Poll the BUSY line until the display reports idle (response byte = 0x00)
     * or the timeout elapses.
     *
     * Protocol: `74 9B 00 0F 01` → returns 1-byte busy status + 90 00
     *   0x00 = idle, 0x01 = busy
     */
    private fun waitForIdle() {
        val deadline = System.currentTimeMillis() + BUSY_POLL_TIMEOUT_MS
        while (System.currentTimeMillis() < deadline) {
            val response = nfcA.transceive(CHECK_BUSY)
            // Expect at least 3 bytes: [busy_status, 0x90, 0x00]
            if (response != null && response.size >= 3) {
                val busyByte = response[0].toInt() and 0xFF
                if (busyByte == 0x00) return   // display is idle
            }
            Thread.sleep(BUSY_POLL_INTERVAL_MS)
        }
        throw Exception("Timeout waiting for display BUSY to clear after refresh")
    }

    /**
     * Wraps [NfcA.transceive] with response validation.
     * Every successful APDU response ends with [0x90, 0x00].
     *
     * @param apdu  The raw command bytes to send.
     * @param label Human-readable label for error messages.
     * @return      The full response including the status word.
     */
    private fun transceive(apdu: ByteArray, label: String): ByteArray {
        val response = nfcA.transceive(apdu)
            ?: throw Exception("Null response from NFC tag during: $label")

        // The status word is the last 2 bytes
        if (response.size < 2) {
            throw Exception("Response too short (${response.size} bytes) during: $label")
        }

        val sw1 = response[response.size - 2].toInt() and 0xFF
        val sw2 = response[response.size - 1].toInt() and 0xFF

        if (sw1 != 0x90 || sw2 != 0x00) {
            throw Exception(
                "APDU error during [$label]: SW=${sw1.toString(16).padStart(2,'0')}" +
                "${sw2.toString(16).padStart(2,'0')} — " +
                when {
                    sw1 == 0x65 && sw2 == 0x87 -> "wrong PIN"
                    sw1 == 0x6A -> "PIN state error (0x6A${sw2.toString(16)})"
                    else -> "unknown error"
                }
            )
        }

        return response
    }
}
