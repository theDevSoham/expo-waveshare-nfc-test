export enum EPaperType {
  INCH_1_54 = 0, // Added: Common NFC entry model
  INCH_2_13 = 1,
  INCH_2_9 = 2,
  INCH_4_2 = 3,
  INCH_7_5 = 4, // Updated to 800x480 (V2/NFC Standard)
  INCH_7_5_HD = 5,
  INCH_2_7 = 6,
  INCH_2_9_B = 7, // Red/Black/White
}

export interface EPaperConfig {
  width: number;
  height: number;
  label: string;
  specialty: string;
}

export const EPaperDimensions: Record<EPaperType, EPaperConfig> = {
  [EPaperType.INCH_1_54]: {
    width: 200,
    height: 200,
    label: '1.54" E-Paper',
    specialty: "Square format, Red/Black/White support.",
  },
  [EPaperType.INCH_2_13]: {
    width: 250,
    height: 122,
    label: '2.13" E-Paper',
    specialty: "Standard badge size, very fast refresh.",
  },
  [EPaperType.INCH_2_7]: {
    width: 264,
    height: 176,
    label: '2.7" E-Paper',
    specialty: "Higher resolution mid-size, B/W only.",
  },
  [EPaperType.INCH_2_9]: {
    width: 296,
    height: 128,
    label: '2.9" E-Paper',
    specialty: "Standard ESL (Electronic Shelf Label) format.",
  },
  [EPaperType.INCH_2_9_B]: {
    width: 296,
    height: 128,
    label: '2.9" E-Paper (B)',
    specialty: 'Tri-color (Red/Black/White) version of 2.9".',
  },
  [EPaperType.INCH_4_2]: {
    width: 400,
    height: 300,
    label: '4.2" E-Paper',
    specialty: "Large information display, high stability.",
  },
  [EPaperType.INCH_7_5]: {
    width: 800,
    height: 480, // Updated from 640x384
    label: '7.5" E-Paper',
    specialty: "Large scale signage. Requires stable NFC connection.",
  },
  [EPaperType.INCH_7_5_HD]: {
    width: 880,
    height: 528,
    label: '7.5" E-Paper (HD)',
    specialty: "Ultra-high resolution. Best for detailed QR codes.",
  },
} as const;
