import type { StyleProp, ViewStyle } from "react-native";

export type ProgressEventPayload = {
  progress: number;
};

export type StidgetWaveshareNfcModuleEvents = {
  onProgress: (params: ProgressEventPayload) => void;
};

export type StidgetWaveshareNfcViewProps = {
  style?: StyleProp<ViewStyle>;
};
