import { NativeModule, requireNativeModule } from "expo";
import { StidgetWaveshareNfcModuleEvents } from "./StidgetWaveshareNfc.types";

declare class StidgetWaveshareNfcModule extends NativeModule<StidgetWaveshareNfcModuleEvents> {
  /**
   * Sends base64 image data to the 2.7" e-paper module.
   * @param base64Image Must be exactly 264x176 pixels.
   */
  startScanAndFlash(base64Image: string): Promise<boolean>;

  /**
   * Returns the current transfer progress (0-100).
   */
  getProgress(): number;
}

export default requireNativeModule<StidgetWaveshareNfcModule>(
  "StidgetWaveshareNfc",
);
