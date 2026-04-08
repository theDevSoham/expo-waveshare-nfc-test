import type { StyleProp, ViewStyle } from "react-native";

export type ProgressEventPayload = {
  progress: number;
};

export type StidgetWaveshareNfcModuleEvents = {
  /**
   * The listener must be a function that receives the payload.
   */
  onProgressUpdate: (event: ProgressEventPayload) => void;
};

export type StidgetWaveshareNfcViewProps = {
  style?: StyleProp<ViewStyle>;
};
