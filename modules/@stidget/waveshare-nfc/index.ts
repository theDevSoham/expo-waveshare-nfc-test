// Reexport the native module. On web, it will be resolved to StidgetWaveshareNfcModule.web.ts
// and on native platforms to StidgetWaveshareNfcModule.ts
export { default } from './src/StidgetWaveshareNfcModule';
export { default as StidgetWaveshareNfcView } from './src/StidgetWaveshareNfcView';
export * from  './src/StidgetWaveshareNfc.types';
