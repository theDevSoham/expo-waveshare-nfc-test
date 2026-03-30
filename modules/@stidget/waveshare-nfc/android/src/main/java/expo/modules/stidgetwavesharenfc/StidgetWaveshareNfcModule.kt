package expo.modules.stidgetwavesharenfc

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import waveshare.feng.nfctag.activity.WaveshareBridge
import android.nfc.Tag
import android.nfc.NfcAdapter
import android.nfc.tech.NfcA
import android.graphics.BitmapFactory
import android.util.Base64

class StidgetWaveshareNfcModule : Module() {
  private val bridge = WaveshareBridge()

  override fun definition() = ModuleDefinition {
    Name("StidgetWaveshareNfc")

    // Remove mTag from the arguments list
    AsyncFunction("flashImage") { base64Image: String ->
      // 1. Grab the current Activity from the Expo AppContext
      val activity = appContext.currentActivity 
        ?: throw Exception("Activity not found. Cannot access NFC Intent.")

      // 2. Extract the Tag handle from the Intent
      // In Release mode, react-native-nfc-manager ensures this intent is populated
      val mTag = activity.intent?.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
        ?: throw Exception("NFC Tag not found in Intent. Please re-scan.")

      // 3. Initialize SDK state
      bridge.initialize()
      
      val bytes = Base64.decode(base64Image, Base64.DEFAULT)
      val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      
      val nfcA = NfcA.get(mTag)
      
      return@AsyncFunction try {
          // The SDK handles nfcA.connect() internally
          val result = bridge.transfer(nfcA, 6, bitmap)
          
          // Clean up bitmap memory immediately
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