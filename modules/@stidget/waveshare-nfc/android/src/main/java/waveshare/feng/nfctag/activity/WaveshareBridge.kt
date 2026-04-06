package waveshare.feng.nfctag.activity

import android.graphics.Bitmap
import android.nfc.tech.NfcA

class WaveshareBridge {
    // The decompiled code shows the class name is 'a'
    private val sdk = a()

    /**
     * Corresponds to void a().
     * Resets the progress counter (c) to 0.
     */
    fun initialize() {
        sdk.a()
    }

    /**
     * Corresponds to public int b().
     * Returns the current progress (c).
     */
    fun getProgress(): Int {
        return sdk.c;
    }

    /**
     * The decompiled code reveals that the main entry point for transfer
     * is actually: int a(NfcA var1, int var2, Bitmap var3)
     * * This single method handles:
     * 1. var1.connect()
     * 2. var1.setTimeout(1000)
     * 3. Header verification ("WSDZ10m")
     * 4. Initializing the tag
     * 5. The actual bitmap transfer (b method)
     */
    fun transfer(nfcA: NfcA, type: Int, bitmap: Bitmap): Int {
        // Based on the decompiled code, this method returns 1 on success, 0 on failure.
        return sdk.a(nfcA, type, bitmap)
    }
}