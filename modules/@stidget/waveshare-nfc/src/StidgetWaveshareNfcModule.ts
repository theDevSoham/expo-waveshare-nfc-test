import { NativeModule, requireNativeModule } from "expo";
import {
  StidgetWaveshareNfcModuleEvents,
  TagInfo,
} from "./StidgetWaveshareNfc.types";

declare class StidgetWaveshareNfcModule extends NativeModule<StidgetWaveshareNfcModuleEvents> {
  /**
   * Scans for the tag, flashes the image, and returns true on success.
   */
  flashImage(base64Image: string): Promise<boolean>;

  /**
   * Returns hardware info from the tag.
   */
  readTagInfo(): Promise<TagInfo>;
}

export default requireNativeModule<StidgetWaveshareNfcModule>(
  "StidgetWaveshareNfc",
);
