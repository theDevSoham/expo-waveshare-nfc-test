package expo.modules.stidgetwavesharenfc

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import waveshare.feng.nfctag.activity.WaveshareBridge // Import your bridge
import android.nfc.Tag
import android.nfc.tech.NfcA
import android.graphics.BitmapFactory
import android.util.Base64

class StidgetWaveshareNfcModule : Module() {
  private val bridge = WaveshareBridge()

  override fun definition() = ModuleDefinition {
    Name("StidgetWaveshareNfc")

    AsyncFunction("flashImage") { base64Image: String, mTag: Tag ->
      // 1. Initialize SDK state
      bridge.initialize()
      
      // 2. Decode with 'isMutable' set to true if you plan to modify it
      val bytes = Base64.decode(base64Image, Base64.DEFAULT)
      val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      
      val nfcA = NfcA.get(mTag)
      
      return@AsyncFunction try {
          // The SDK handles nfcA.connect() internally in method 'a'
          // We just need to ensure we don't block the main UI thread 
          // since Type 6 has that long 2-pass transfer.
          val result = bridge.transfer(nfcA, 6, bitmap)
          
          // Clean up bitmap memory immediately after transfer
          bitmap.recycle()
          
          result == 1
      } catch (e: Exception) {
          false
      } finally {
          try { nfcA.close() } catch (e: Exception) {}
      }
    }
    
    Function("getProgress") {
      bridge.getProgress()
    }
  }
}