import { NativeModule, requireNativeModule } from "expo";
import { EPaperType } from "./Constants";
import { StidgetWaveshareNfcModuleEvents } from "./StidgetWaveshareNfc.types";

declare class StidgetWaveshareNfcModule extends NativeModule<StidgetWaveshareNfcModuleEvents> {
  /**
   * Initiates the NFC reader mode and flashes the provided image to the badge.
   * * @param chipType The integer ID for the specific Waveshare module (e.g., 1 for 2.13").
   * @param base64Image The image data. The native module will automatically crop/resize
   * this to the correct dimensions based on the chipType.
   * @returns A promise that resolves to true if the flash was successful.
   */
  startScanAndFlash(
    chipType: EPaperType,
    base64Image: string,
  ): Promise<boolean>;

  /**
   * Returns the current transfer progress (0-100).
   * Note: It is recommended to use the 'onProgressUpdate' event listener instead
   * for real-time UI updates.
   */
  getProgress(): number;
}

export default requireNativeModule<StidgetWaveshareNfcModule>(
  "StidgetWaveshareNfc",
);
