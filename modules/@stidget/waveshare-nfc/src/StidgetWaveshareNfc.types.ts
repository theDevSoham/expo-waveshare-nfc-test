import type { StyleProp, ViewStyle } from "react-native";

export type ProgressEventPayload = {
  progress: number;
};

export type TagInfo = {
  sn: string;
  pid: string;
  firmwareVersion: string;
};

export type StidgetWaveshareNfcModuleEvents = {
  onProgressUpdate: (event: ProgressEventPayload) => void;
};

export type StidgetWaveshareNfcViewProps = {
  style?: StyleProp<ViewStyle>;
};
