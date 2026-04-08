export enum EPaperType {
  INCH_2_13 = 1,
  INCH_2_9 = 2,
  INCH_4_2 = 3,
  INCH_7_5 = 4,
  INCH_7_5_HD = 5,
  INCH_2_7 = 6,
  INCH_2_9_B = 7,
}

export interface EPaperConfig {
  width: number;
  height: number;
  label: string;
}

export const EPaperDimensions: Record<EPaperType, EPaperConfig> = {
  [EPaperType.INCH_2_13]: {
    width: 250,
    height: 122,
    label: '2.13" E-Paper (B/W)',
  },
  [EPaperType.INCH_2_7]: {
    width: 264,
    height: 176,
    label: '2.7" E-Paper (B/W)',
  },
  [EPaperType.INCH_2_9]: {
    width: 296,
    height: 128,
    label: '2.9" E-Paper (B/W)',
  },
  [EPaperType.INCH_4_2]: {
    width: 400,
    height: 300,
    label: '4.2" E-Paper',
  },
  [EPaperType.INCH_7_5]: {
    width: 640,
    height: 384,
    label: '7.5" E-Paper',
  },
  [EPaperType.INCH_7_5_HD]: {
    width: 880,
    height: 528,
    label: '7.5" E-Paper (HD)',
  },
  [EPaperType.INCH_2_9_B]: {
    width: 296,
    height: 128,
    label: '2.9" E-Paper (Type B)',
  },
} as const;
