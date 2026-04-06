package waveshare.feng.nfctag.activity;

import android.graphics.Bitmap;

/**
 * This is a shim class to replace the missing 'b.class' in the Waveshare JAR.
 * It prevents the NoClassDefFoundError.
 */
public class b {
    private Bitmap bitmap;

    public b(Bitmap var1) {
        this.bitmap = var1;
    }

    public Bitmap a() {
        // We return the bitmap as-is. 
        // This bypasses Waveshare's internal dithering.
        return this.bitmap;
    }
}