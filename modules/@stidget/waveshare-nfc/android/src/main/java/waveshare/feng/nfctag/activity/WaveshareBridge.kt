package waveshare.feng.nfctag.activity

import android.graphics.Bitmap
import android.nfc.tech.NfcA

/**
 * This class acts as a "Public Gateway" to the obfuscated Waveshare SDK.
 * Since it lives in the same package, no reflection is required.
 */
class WaveshareBridge {
    // Accessing the package-private class 'a' and its constructor 
    private val sdk = a()

    fun initialize() {
        // Accessing the package-private init method 'a()' 
        sdk.a()
    }

    fun getProgress(): Int {
        // Accessing the public progress method 'b()' 
        return sdk.b()
    }

    fun transfer(nfcA: NfcA, type: Int, bitmap: Bitmap): Int {
        // Accessing the package-private send method 'a(NfcA, int, Bitmap)' 
        // Note: For your 2.7-inch screen, 'type' should be 6 
        return sdk.a(nfcA, type, bitmap)
    }
}