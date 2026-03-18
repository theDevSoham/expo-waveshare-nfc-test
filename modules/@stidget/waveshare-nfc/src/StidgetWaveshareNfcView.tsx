import { requireNativeView } from "expo";
import * as React from "react";
import { StidgetWaveshareNfcViewProps } from "./StidgetWaveshareNfc.types";

const NativeView: React.ComponentType<StidgetWaveshareNfcViewProps> =
  requireNativeView("StidgetWaveshareNfc");

export default function StidgetWaveshareNfcView(
  props: StidgetWaveshareNfcViewProps,
) {
  return <NativeView {...props} />;
}
