export enum EffectType {
  PIXELATE = 'PIXELATE',
  DITHER_BW = 'DITHER_BW',
  DITHER_PALETTE = 'DITHER_PALETTE',
  GRAYSCALE = 'GRAYSCALE',
  ASCII_ART = 'ASCII_ART',
  NEON_SILHOUETTE = 'NEON_SILHOUETTE',
  THRESHOLD = 'THRESHOLD',
}

export type SliderParam = {
  id: string;
  name: string;
  type: 'slider';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

export type ToggleParam = {
    id: string;
    name: string;
    type: 'toggle';
    defaultValue: boolean;
};

export type ColorParam = {
    id: string;
    name: string;
    type: 'color';
    defaultValue: string; // hex string e.g. #RRGGBB
};

export type StringParam = {
    id: string;
    name: string;
    type: 'string';
    defaultValue: string;
    placeholder?: string;
};

export type SelectOption = {
    value: string;
    label: string;
};

export type SelectParam = {
    id: string;
    name: string;
    type: 'select';
    options: SelectOption[];
    defaultValue: string;
};

export type EffectParam = SliderParam | ToggleParam | ColorParam | StringParam | SelectParam;

export interface Effect {
  id: EffectType;
  name: string;
  description: string;
  params: EffectParam[];
  processor: (context: CanvasRenderingContext2D, width: number, height: number, params: EffectParamsState) => void;
}

export type EffectParamsState = {
  [key: string]: number | boolean | string;
};

// Represents an RGB color
export type Color = [number, number, number];