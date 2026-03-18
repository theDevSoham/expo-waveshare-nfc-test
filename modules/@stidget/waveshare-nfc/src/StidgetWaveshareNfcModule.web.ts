import { NativeModule, registerWebModule } from "expo";
import { ProgressEventPayload } from "./StidgetWaveshareNfc.types";

type StidgetWaveshareNfcModuleEvents = {
  onProgress: (params: ProgressEventPayload) => void;
};

class StidgetWaveshareNfcModule extends NativeModule<StidgetWaveshareNfcModuleEvents> {
  async flashImage(base64Image: string, nfcTag: any): Promise<boolean> {
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
