import { Effect, EffectType, Color, EffectParamsState } from './types';

// --- Utility Functions for Image Processing ---

const hexToRgb = (hex: string): Color | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
};

const findClosestColor = (color: Color, palette: Color[]): Color => {
  let closestColor = palette[0];
  let minDistance = Infinity;

  for (const paletteColor of palette) {
    const distance =
      Math.pow(color[0] - paletteColor[0], 2) +
      Math.pow(color[1] - paletteColor[1], 2) +
      Math.pow(color[2] - paletteColor[2], 2);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = paletteColor;
    }
  }
  return closestColor;
};

// Improved color dithering algorithm (Floyd-Steinberg)
const applyDitheringColor = (
  imageData: ImageData,
  width: number,
  height: number,
  palette: Color[],
  factor: number
) => {
  const d = imageData.data;
  const pixelData = new Float32Array(width * height * 3);

  // Initialize float array with original image data for processing
  for (let i = 0; i < width * height; i++) {
    pixelData[i * 3]     = d[i * 4];
    pixelData[i * 3 + 1] = d[i * 4 + 1];
    pixelData[i * 3 + 2] = d[i * 4 + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const oldR = pixelData[i];
      const oldG = pixelData[i + 1];
      const oldB = pixelData[i + 2];

      const oldColor: Color = [oldR, oldG, oldB];
      const newColor = findClosestColor(oldColor, palette);
      
      const outIdx = (y * width + x) * 4;
      d[outIdx]     = newColor[0];
      d[outIdx + 1] = newColor[1];
      d[outIdx + 2] = newColor[2];

      const errR = oldR - newColor[0];
      const errG = oldG - newColor[1];
      const errB = oldB - newColor[2];
      
      const diffusionFactor = factor / 16.0;

      let neighborIndex;
      // Right: (x+1, y)
      if (x + 1 < width) {
        neighborIndex = i + 3;
        pixelData[neighborIndex]     += errR * 7 * diffusionFactor;
        pixelData[neighborIndex + 1] += errG * 7 * diffusionFactor;
        pixelData[neighborIndex + 2] += errB * 7 * diffusionFactor;
      }
      // Bottom-left: (x-1, y+1)
      if (y + 1 < height && x > 0) {
        neighborIndex = i + (width * 3) - 3;
        pixelData[neighborIndex]     += errR * 3 * diffusionFactor;
        pixelData[neighborIndex + 1] += errG * 3 * diffusionFactor;
        pixelData[neighborIndex + 2] += errB * 3 * diffusionFactor;
      }
      // Bottom: (x, y+1)
      if (y + 1 < height) {
        neighborIndex = i + (width * 3);
        pixelData[neighborIndex]     += errR * 5 * diffusionFactor;
        pixelData[neighborIndex + 1] += errG * 5 * diffusionFactor;
        pixelData[neighborIndex + 2] += errB * 5 * diffusionFactor;
      }
      // Bottom-right: (x+1, y+1)
      if (y + 1 < height && x + 1 < width) {
        neighborIndex = i + (width * 3) + 3;
        pixelData[neighborIndex]     += errR * 1 * diffusionFactor;
        pixelData[neighborIndex + 1] += errG * 1 * diffusionFactor;
        pixelData[neighborIndex + 2] += errB * 1 * diffusionFactor;
      }
    }
  }
};

// B&W dithering function with custom color support
const applyDitheringBW = (
  imageData: ImageData,
  width: number,
  height: number,
  factor: number,
  darkColor: Color,
  lightColor: Color
) => {
  const d = imageData.data;
  const grayscale = new Float32Array(width * height);

  // Convert image to grayscale first for proper dithering
  for (let i = 0; i < d.length; i += 4) {
    const index = i / 4;
    const brightness = 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2];
    grayscale[index] = brightness;
  }
  
  const [darkR, darkG, darkB] = darkColor;
  const [lightR, lightG, lightB] = lightColor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldPixel = grayscale[i];
      const useLightColor = oldPixel > 127.5;
      
      const newPixelValue = useLightColor ? 255 : 0;
      
      const outIdx = i * 4;
      d[outIdx]     = useLightColor ? lightR : darkR;
      d[outIdx + 1] = useLightColor ? lightG : darkG;
      d[outIdx + 2] = useLightColor ? lightB : darkB;

      const quantError = oldPixel - newPixelValue;
      const diffusionError = quantError * factor / 16.0;

      // Propagate error to neighbors
      if (x + 1 < width) {
        grayscale[i + 1] += diffusionError * 7;
      }
      if (y + 1 < height) {
        if (x > 0) {
          grayscale[i + width - 1] += diffusionError * 3;
        }
        grayscale[i + width] += diffusionError * 5;
        if (x + 1 < width) {
          grayscale[i + width + 1] += diffusionError * 1;
        }
      }
    }
  }
}

// --- Palettes ---

const JUSTICE_PALETTE: Color[] = [
  [13, 33, 108],   // Dark Blue
  [255, 147, 0],   // Orange
  [215, 235, 188], // Light Green
  [0, 0, 0],       // Black
];

// --- Effect Definitions ---

export const EFFECTS: Effect[] = [
  {
    id: EffectType.PIXELATE,
    name: 'Pixelate',
    description: 'Group pixels into solid colored blocks.',
    params: [
      { id: 'pixelSize', name: 'Pixel Size', type: 'slider', min: 2, max: 50, step: 1, defaultValue: 10 },
    ],
    processor: (ctx, width, height, params) => {
        const pixelSize = Math.max(1, params.pixelSize as number);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        ctx.clearRect(0, 0, width, height);

        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                let totalR = 0;
                let totalG = 0;
                let totalB = 0;
                let count = 0;

                // Iterate over the block to calculate the average color
                for (let blockY = y; blockY < y + pixelSize; blockY++) {
                    for (let blockX = x; blockX < x + pixelSize; blockX++) {
                        if (blockX < width && blockY < height) {
                            const i = (blockY * width + blockX) * 4;
                            totalR += data[i];
                            totalG += data[i + 1];
                            totalB += data[i + 2];
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    const avgR = Math.floor(totalR / count);
                    const avgG = Math.floor(totalG / count);
                    const avgB = Math.floor(totalB / count);

                    ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }
    },
  },
  {
    id: EffectType.DITHER_BW,
    name: 'Dither (Custom)',
    description: 'Create a 1-bit look using two custom colors.',
    params: [
        { id: 'factor', name: 'Diffusion', type: 'slider', min: 0.1, max: 1.0, step: 0.05, defaultValue: 1.0 },
        { id: 'darkColor', name: 'Dark Color', type: 'color', defaultValue: '#000000' },
        { id: 'lightColor', name: 'Light Color', type: 'color', defaultValue: '#FFFFFF' },
    ],
    processor: (ctx, width, height, params) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const darkColor = hexToRgb(params.darkColor as string) || [0, 0, 0];
        const lightColor = hexToRgb(params.lightColor as string) || [255, 255, 255];
        applyDitheringBW(imageData, width, height, params.factor as number, darkColor, lightColor);
        ctx.putImageData(imageData, 0, 0);
    },
  },
  {
    id: EffectType.DITHER_PALETTE,
    name: 'Dither (Justice Palette)',
    description: 'Dither with a specific retro color palette.',
    params: [
        { id: 'factor', name: 'Diffusion', type: 'slider', min: 0.1, max: 1.0, step: 0.05, defaultValue: 1.0 },
    ],
    processor: (ctx, width, height, params) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        applyDitheringColor(imageData, width, height, JUSTICE_PALETTE, params.factor as number);
        ctx.putImageData(imageData, 0, 0);
    },
  },
  {
    id: EffectType.GRAYSCALE,
    name: 'Grayscale',
    description: 'Convert image to grayscale. Pixels darker than the threshold become black.',
    params: [
      { id: 'level', name: 'Threshold Level', type: 'slider', min: 1, max: 254, step: 1, defaultValue: 1 },
    ],
    processor: (ctx, width, height, params) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const level = params.level as number;

      for (let i = 0; i < data.length; i += 4) {
        // Using standard luminance calculation
        const brightness = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
        const color = brightness > level ? brightness : 0;
        
        data[i] = color;     // Red
        data[i + 1] = color; // Green
        data[i + 2] = color; // Blue
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },
  {
    id: EffectType.THRESHOLD,
    name: 'Threshold',
    description: 'Convert image to high-contrast black and white.',
    params: [
      { id: 'level', name: 'Threshold Level', type: 'slider', min: 1, max: 254, step: 1, defaultValue: 128 },
    ],
    processor: (ctx, width, height, params) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const level = params.level as number;

      for (let i = 0; i < data.length; i += 4) {
        // Using standard luminance calculation
        const brightness = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
        const color = brightness > level ? 255 : 0;
        
        data[i] = color;     // Red
        data[i + 1] = color; // Green
        data[i + 2] = color; // Blue
        // Alpha channel (data[i + 3]) remains untouched
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },
  {
    id: EffectType.ASCII_ART,
    name: 'ASCII Art',
    description: 'Create stylized art with custom symbols, colors, and quantization.',
    params: [
      { id: 'charSize', name: 'Character Size', type: 'slider', min: 4, max: 20, step: 1, defaultValue: 8 },
      { id: 'brightnessSteps', name: 'Brightness Steps', type: 'slider', min: 2, max: 15, step: 1, defaultValue: 7 },
      { id: 'textColor', name: 'Text Color', type: 'color', defaultValue: '#E5E7EB' },
      { id: 'bgColor', name: 'Background Color', type: 'color', defaultValue: '#111827' },
      { id: 'boldFont', name: 'Bold Font', type: 'toggle', defaultValue: false },
      {
        id: 'symbols',
        name: 'Symbol Set',
        type: 'select',
        defaultValue: ' .:-=+*#%@',
        options: [
          { value: ' .:-=+*#%@', label: 'Standard' },
          { value: '░▒▓█', label: 'Blocks' },
          { value: '▤▥▦▧▨▩█', label: 'Shades' },
          { value: 'アイルオ', label: 'Matrix' },
        ]
      },
    ],
    processor: (ctx, width, height, params) => {
      const charSize = Math.max(1, params.charSize as number);
      const brightnessSteps = params.brightnessSteps as number;
      const textColor = params.textColor as string;
      const bgColor = params.bgColor as string;
      const boldFont = params.boldFont as boolean;
      const userChars = params.symbols as string;
      const chars = userChars && userChars.length > 0 ? userChars : ' ';

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Clear and set background color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = textColor;
      ctx.font = `${boldFont ? 'bold' : 'normal'} ${charSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let y = 0; y < height; y += charSize) {
        for (let x = 0; x < width; x += charSize) {
          let totalBrightness = 0;
          let count = 0;

          // Calculate average brightness of the block
          for (let j = 0; j < charSize; j++) {
            for (let i = 0; i < charSize; i++) {
              if (x + i < width && y + j < height) {
                const idx = ((y + j) * width + (x + i)) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                // Standard luminance calculation
                const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                totalBrightness += brightness;
                count++;
              }
            }
          }

          if (count > 0) {
            const avgBrightness = totalBrightness / count;
            // Quantize brightness into steps
            const step = Math.floor(avgBrightness * brightnessSteps / 256);
            // Map step to character, ensuring index is within bounds
            const charIndex = Math.min(step, chars.length - 1);
            const char = chars[charIndex];
            
            ctx.fillText(char, x + charSize / 2, y + charSize / 2);
          }
        }
      }
    },
  },
  {
    id: EffectType.NEON_SILHOUETTE,
    name: 'Neon Silhouette',
    description: 'Create a glowing silhouette effect.',
    params: [
      { id: 'invert', name: 'Invert Source', type: 'toggle', defaultValue: false },
      { id: 'threshold', name: 'Threshold', type: 'slider', min: 1, max: 254, step: 1, defaultValue: 128 },
      { id: 'dotSize', name: 'Dot Size', type: 'slider', min: 1, max: 10, step: 1, defaultValue: 3 },
    ],
    processor: (ctx, width, height, params) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const threshold = params.threshold as number;
      const dotSize = params.dotSize as number;
      const invert = params.invert as boolean;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      for (let y = 0; y < height; y += dotSize) {
          for (let x = 0; x < width; x += dotSize) {
              const i = (y * width + x) * 4;
              const brightness = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
              
              const isTarget = invert ? (brightness < threshold) : (brightness > threshold);

              if (isTarget) {
                  // Use fixed opacity and size for a high-contrast threshold effect
                  ctx.fillStyle = `rgba(230, 255, 255, 0.9)`;
                  ctx.shadowColor = `rgba(150, 220, 255, 0.7)`;
                  ctx.shadowBlur = dotSize * 2;
                  
                  ctx.beginPath();
                  ctx.arc(x, y, dotSize * 0.5, 0, Math.PI * 2);
                  ctx.fill();
              }
          }
      }
      ctx.shadowBlur = 0; // Reset shadow
    }
  }
];