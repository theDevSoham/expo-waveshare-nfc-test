import { NativeModule, registerWebModule } from "expo";
import { ProgressEventPayload } from "./StidgetWaveshareNfc.types";

type StidgetWaveshareNfcModuleEvents = {
  onProgress: (params: ProgressEventPayload) => void;
};

class StidgetWaveshareNfcModule extends NativeModule<StidgetWaveshareNfcModuleEvents> {
  async startScanAndFlash(base64Image: string): Promise<boolean> {
    console.warn("NFC flashing is not supported on Web.");
    return false;
  }

  getProgress() {
    return 0;
  }
}

export default registerWebModule(
  StidgetWaveshareNfcModule,
  "StidgetWaveshareNfcModule",
);
