import { NativeModule, registerWebModule } from "expo";
import {
  StidgetWaveshareNfcModuleEvents,
  TagInfo,
} from "./StidgetWaveshareNfc.types";

class StidgetWaveshareNfcModule extends NativeModule<StidgetWaveshareNfcModuleEvents> {
  async flashImage(base64Image: string): Promise<boolean> {
    console.warn("NFC flashing is not supported on Web.");
    return false;
  }

  async readTagInfo(): Promise<TagInfo> {
    throw new Error("NFC not supported on web");
  }
}

export default registerWebModule(
  StidgetWaveshareNfcModule,
  "StidgetWaveshareNfc",
);
