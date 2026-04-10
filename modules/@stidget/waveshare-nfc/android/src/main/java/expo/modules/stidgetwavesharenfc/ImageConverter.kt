package expo.modules.stidgetwavesharenfc

import android.graphics.Bitmap
import android.graphics.Color

/**
 * Converts a 250×122 landscape Bitmap into the 4,000-byte packed format
 * expected by the 2.13" Waveshare NFC e-paper display.
 *
 * Display RAM layout (from init commands in the protocol doc):
 *   - CMD 0x44 (RAM X address): 0x00 → 0x0F  → 16 bytes per row (128 bits, 122 px used)
 *   - CMD 0x45 (RAM Y address): 0x0000 → 0x00F9 → 250 rows
 *   - Total: 16 × 250 = 4,000 bytes
 *
 * The RAM is addressed in portrait orientation (122 wide × 250 tall), but the
 * physical display is landscape (250 wide × 122 tall). The input bitmap must
 * therefore be rotated 90° before packing.
 *
 * Rotation used (90° clockwise, landscape → portrait):
 *   portrait pixel (col=y_src, row=249−x_src) = landscape pixel (x_src, y_src)
 *
 * If the image appears upside-down or mirrored on your specific board revision,
 * toggle ROTATE_CCW or MIRROR_X below.
 *
 * Bit polarity: 0 = black, 1 = white (standard SSD1680 convention).
 * MSB of each byte corresponds to the left-most pixel in that byte group.
 */
object ImageConverter {

    // ---------- tuneable constants ----------

    /** Flip to true if image appears rotated the wrong way on your board. */
    private const val ROTATE_CCW = false

    /** Flip to true if image appears horizontally mirrored. */
    private const val MIRROR_X = false

    /** Threshold (0–255) below which a greyscale pixel is considered black. */
    private const val BLACK_THRESHOLD = 128

    // ---------- display geometry ----------
    const val DISPLAY_LANDSCAPE_W = 250
    const val DISPLAY_LANDSCAPE_H = 122

    private const val PORTRAIT_COLS = DISPLAY_LANDSCAPE_H   // 122
    private const val PORTRAIT_ROWS = DISPLAY_LANDSCAPE_W   // 250
    private const val BYTES_PER_ROW = 16                    // ceil(128/8); only 122 bits used
    const val TOTAL_BYTES = PORTRAIT_ROWS * BYTES_PER_ROW   // 4,000

    // ----------------------------------------

    /**
     * Main entry point. Pass in a 250×122 Bitmap (any colour depth).
     * Returns a 4,000-byte array ready to be chunked and sent over NFC.
     *
     * Throws IllegalArgumentException if the bitmap dimensions are wrong.
     */
    fun convert(bitmap: Bitmap): ByteArray {
        require(bitmap.width == DISPLAY_LANDSCAPE_W && bitmap.height == DISPLAY_LANDSCAPE_H) {
            "Bitmap must be ${DISPLAY_LANDSCAPE_W}×${DISPLAY_LANDSCAPE_H} px " +
            "(got ${bitmap.width}×${bitmap.height})"
        }

        // 1. Read all pixels into a flat IntArray for fast access
        val pixels = IntArray(DISPLAY_LANDSCAPE_W * DISPLAY_LANDSCAPE_H)
        bitmap.getPixels(pixels, 0, DISPLAY_LANDSCAPE_W, 0, 0,
                         DISPLAY_LANDSCAPE_W, DISPLAY_LANDSCAPE_H)

        // 2. Convert to greyscale float array and apply Floyd-Steinberg dithering
        val grey = toGreyscale(pixels, DISPLAY_LANDSCAPE_W, DISPLAY_LANDSCAPE_H)
        floydSteinberg(grey, DISPLAY_LANDSCAPE_W, DISPLAY_LANDSCAPE_H)

        // 3. Pack into portrait-oriented byte array
        return packToPortrait(grey, DISPLAY_LANDSCAPE_W, DISPLAY_LANDSCAPE_H)
    }

    // ---- Step 1: ARGB → greyscale (linear luminance) ----

    private fun toGreyscale(pixels: IntArray, w: Int, h: Int): FloatArray {
        return FloatArray(w * h) { i ->
            val c = pixels[i]
            // Standard luminance weights (sRGB)
            0.299f * Color.red(c) + 0.587f * Color.green(c) + 0.114f * Color.blue(c)
        }
    }

    // ---- Step 2: Floyd-Steinberg dithering (in-place on grey[]) ----
    //
    //   Error distribution (right, bottom-left, bottom, bottom-right):
    //         * 7/16
    //   3/16  5/16  1/16

    private fun floydSteinberg(grey: FloatArray, w: Int, h: Int) {
        for (y in 0 until h) {
            for (x in 0 until w) {
                val idx = y * w + x
                val old = grey[idx].coerceIn(0f, 255f)
                val new = if (old < BLACK_THRESHOLD) 0f else 255f
                grey[idx] = new
                val err = old - new

                if (x + 1 < w)             grey[idx + 1]         += err * 7f / 16f
                if (y + 1 < h) {
                    if (x - 1 >= 0)        grey[idx + w - 1]     += err * 3f / 16f
                                           grey[idx + w]          += err * 5f / 16f
                    if (x + 1 < w)         grey[idx + w + 1]     += err * 1f / 16f
                }
            }
        }
    }

    // ---- Step 3: Rotate 90° and pack bits ----

    private fun packToPortrait(grey: FloatArray, srcW: Int, srcH: Int): ByteArray {
        // All 1 bits = white (0xFF per byte is the "all white" default)
        val result = ByteArray(TOTAL_BYTES) { 0xFF.toByte() }

        for (portraitRow in 0 until PORTRAIT_ROWS) {        // 0..249
            for (portraitCol in 0 until PORTRAIT_COLS) {    // 0..121

                // Map portrait (col, row) back to landscape (srcX, srcY)
                val (srcX, srcY) = if (!ROTATE_CCW) {
                    // 90° CW: portrait row = landscape x, portrait col = landscape y (bottom→top)
                    val lx = if (MIRROR_X) (srcW - 1 - portraitRow) else portraitRow
                    val ly = srcH - 1 - portraitCol
                    Pair(lx, ly)
                } else {
                    // 90° CCW: portrait row = (srcW-1-landscape x), portrait col = landscape y
                    val lx = if (MIRROR_X) portraitRow else (srcW - 1 - portraitRow)
                    val ly = portraitCol
                    Pair(lx, ly)
                }

                val isBlack = grey[srcY * srcW + srcX] < BLACK_THRESHOLD

                if (isBlack) {
                    // Clear the bit for this pixel (0 = black in SSD1680)
                    val byteOffset = portraitRow * BYTES_PER_ROW + (portraitCol / 8)
                    val bitPosition = 7 - (portraitCol % 8)   // MSB = leftmost pixel
                    result[byteOffset] = (result[byteOffset].toInt() and (1 shl bitPosition).inv()).toByte()
                }
                // White pixels: leave the bit as 1 (already set by default)
            }
        }

        return result
    }
}
