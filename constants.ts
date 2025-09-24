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

// Helper to get pixel from source data, handling boundaries
const getPixel = (data: Uint8ClampedArray, width: number, x: number, y: number): Color => {
    x = Math.round(x);
    y = Math.round(y);
    // Clamp coordinates to be within bounds
    x = Math.max(0, Math.min(x, width - 1));
    const i = (y * width + x) * 4;
    return [data[i], data[i+1], data[i+2]];
};


const rgbToCmyk = (r: number, g: number, b: number): [number, number, number, number] => {
    let c = 1 - (r / 255);
    let m = 1 - (g / 255);
    let y = 1 - (b / 255);
    const k = Math.min(c, m, y);

    if (k === 1) { // black
        return [0, 0, 0, 1];
    }

    c = (c - k) / (1 - k);
    m = (m - k) / (1 - k);
    y = (y - k) / (1 - k);

    return [c, m, y, k];
};


// --- Effect Definitions ---

export const EFFECTS: Effect[] = [
  {
    id: EffectType.DUOTONE_PIXELATE,
    name: 'Pixelado Duotônico',
    description: 'Transforma a imagem em arte pixelada de 2 cores com base em um limiar de brilho.',
    params: [
      { id: 'pixelSize', name: 'Tamanho do Pixel', type: 'slider', min: 2, max: 50, step: 1, defaultValue: 10 },
      { id: 'threshold', name: 'Limiar de Brilho', type: 'slider', min: 1, max: 254, step: 1, defaultValue: 128 },
      { id: 'darkColor', name: 'Cor Escura', type: 'color', defaultValue: '#1f2e69' },
      { id: 'lightColor', name: 'Cor Clara', type: 'color', defaultValue: '#d3e099' },
    ],
    processor: (ctx, width, height, params) => {
        const pixelSize = Math.max(1, params.pixelSize as number);
        const threshold = params.threshold as number;
        const darkColor = params.darkColor as string;
        const lightColor = params.lightColor as string;
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        ctx.clearRect(0, 0, width, height);

        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                let totalBrightness = 0;
                let count = 0;

                // Iterate over the block to calculate the average brightness
                for (let blockY = y; blockY < y + pixelSize; blockY++) {
                    for (let blockX = x; blockX < x + pixelSize; blockX++) {
                        if (blockX < width && blockY < height) {
                            const i = (blockY * width + blockX) * 4;
                            const brightness = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                            totalBrightness += brightness;
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    const avgBrightness = totalBrightness / count;
                    
                    ctx.fillStyle = avgBrightness < threshold ? darkColor : lightColor;
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }
    },
  },
  {
    id: EffectType.HALFTONE_SQUARES,
    name: 'Meio-tom (Quadrados)',
    description: 'Recria a imagem usando quadrados de tamanhos variados, como em impressões antigas.',
    params: [
        { id: 'gridSize', name: 'Tamanho da Grade', type: 'slider', min: 2, max: 40, step: 1, defaultValue: 10 },
        { id: 'invert', name: 'Inverter', type: 'toggle', defaultValue: false },
        { id: 'squareColor', name: 'Cor do Quadrado', type: 'color', defaultValue: '#000000' },
        { id: 'bgColor', name: 'Cor de Fundo', type: 'color', defaultValue: '#FFFFFF' },
    ],
    processor: (ctx, width, height, params) => {
        const gridSize = Math.max(1, params.gridSize as number);
        const invert = params.invert as boolean;
        const squareColor = params.squareColor as string;
        const bgColor = params.bgColor as string;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = squareColor;

        for (let y = 0; y < height; y += gridSize) {
            for (let x = 0; x < width; x += gridSize) {
                let totalBrightness = 0;
                let count = 0;

                for (let blockY = y; blockY < y + gridSize; blockY++) {
                    for (let blockX = x; blockX < x + gridSize; blockX++) {
                        if (blockX < width && blockY < height) {
                            const i = (blockY * width + blockX) * 4;
                            const brightness = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                            totalBrightness += brightness;
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    const avgBrightness = totalBrightness / count;
                    let size = (avgBrightness / 255) * gridSize;
                    if (invert) {
                        size = gridSize - size;
                    }

                    const centeredX = x + (gridSize - size) / 2;
                    const centeredY = y + (gridSize - size) / 2;
                    ctx.fillRect(centeredX, centeredY, size, size);
                }
            }
        }
    }
  },
  {
    id: EffectType.HALFTONE_CIRCLES,
    name: 'Meio-tom (Círculos)',
    description: 'Recria a imagem usando círculos de tamanhos variados.',
    params: [
        { id: 'gridSize', name: 'Tamanho da Grade', type: 'slider', min: 2, max: 40, step: 1, defaultValue: 10 },
        { id: 'invert', name: 'Inverter', type: 'toggle', defaultValue: false },
        { id: 'dotColor', name: 'Cor do Ponto', type: 'color', defaultValue: '#000000' },
        { id: 'bgColor', name: 'Cor de Fundo', type: 'color', defaultValue: '#FFFFFF' },
    ],
    processor: (ctx, width, height, params) => {
        const gridSize = Math.max(1, params.gridSize as number);
        const invert = params.invert as boolean;
        const dotColor = params.dotColor as string;
        const bgColor = params.bgColor as string;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = dotColor;

        for (let y = 0; y < height; y += gridSize) {
            for (let x = 0; x < width; x += gridSize) {
                let totalBrightness = 0;
                let count = 0;

                for (let blockY = y; blockY < y + gridSize; blockY++) {
                    for (let blockX = x; blockX < x + gridSize; blockX++) {
                        if (blockX < width && blockY < height) {
                            const i = (blockY * width + blockX) * 4;
                            const brightness = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                            totalBrightness += brightness;
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    const avgBrightness = totalBrightness / count;
                    let radius = (avgBrightness / 255) * (gridSize / 2);
                    if (invert) {
                        radius = (gridSize / 2) - radius;
                    }

                    const centerX = x + gridSize / 2;
                    const centerY = y + gridSize / 2;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
    }
  },
  {
    id: EffectType.HALFTONE_LINES,
    name: 'Meio-tom (Linhas)',
    description: 'Usa linhas de espessura variável para simular tons.',
    params: [
        { id: 'gridSize', name: 'Espaçamento', type: 'slider', min: 2, max: 40, step: 1, defaultValue: 8 },
        { 
            id: 'orientation', name: 'Orientação', type: 'select', 
            defaultValue: 'vertical', 
            options: [ { value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' } ]
        },
        { id: 'invert', name: 'Inverter', type: 'toggle', defaultValue: false },
        { id: 'lineColor', name: 'Cor da Linha', type: 'color', defaultValue: '#000000' },
        { id: 'bgColor', name: 'Cor de Fundo', type: 'color', defaultValue: '#FFFFFF' },
    ],
    processor: (ctx, width, height, params) => {
        const gridSize = Math.max(1, params.gridSize as number);
        const invert = params.invert as boolean;
        const lineColor = params.lineColor as string;
        const bgColor = params.bgColor as string;
        const orientation = params.orientation as string;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = lineColor;
        
        const processBlock = (x: number, y: number) => {
            let totalBrightness = 0;
            let count = 0;
            for (let blockY = y; blockY < y + gridSize; blockY++) {
                for (let blockX = x; blockX < x + gridSize; blockX++) {
                    if (blockX < width && blockY < height) {
                        const i = (blockY * width + blockX) * 4;
                        const brightness = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                        totalBrightness += brightness;
                        count++;
                    }
                }
            }
            if (count > 0) {
                const avgBrightness = totalBrightness / count;
                let thickness = (avgBrightness / 255) * gridSize;
                if (invert) thickness = gridSize - thickness;

                if (orientation === 'vertical') {
                    const centeredX = x + (gridSize - thickness) / 2;
                    ctx.fillRect(centeredX, y, thickness, gridSize);
                } else { // Horizontal
                    const centeredY = y + (gridSize - thickness) / 2;
                    ctx.fillRect(x, centeredY, gridSize, thickness);
                }
            }
        };

        for (let y = 0; y < height; y += gridSize) {
            for (let x = 0; x < width; x += gridSize) {
                processBlock(x,y);
            }
        }
    }
  },
  {
    id: EffectType.HALFTONE_COLOR,
    name: 'Meio-tom (Cores)',
    description: 'Simula separação de cores com pontos CMYK.',
    params: [
        { id: 'gridSize', name: 'Tamanho da Grade', type: 'slider', min: 4, max: 40, step: 2, defaultValue: 12 },
        { id: 'bgColor', name: 'Cor de Fundo', type: 'color', defaultValue: '#FFFFFF' },
    ],
    processor: (ctx, width, height, params) => {
        const gridSize = Math.max(2, params.gridSize as number);
        const bgColor = params.bgColor as string;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        // FIX: 'darker' is not a valid globalCompositeOperation. Changed to 'darken'.
        ctx.globalCompositeOperation = 'darken';

        for (let y = 0; y < height; y += gridSize) {
            for (let x = 0; x < width; x += gridSize) {
                let totalR = 0, totalG = 0, totalB = 0, count = 0;

                for (let blockY = y; blockY < y + gridSize; blockY++) {
                    for (let blockX = x; blockX < x + gridSize; blockX++) {
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
                    const avgR = totalR / count;
                    const avgG = totalG / count;
                    const avgB = totalB / count;
                    
                    const [c, m, y_cmyk, k] = rgbToCmyk(avgR, avgG, avgB);

                    const halfGrid = gridSize / 2;
                    const quarterGrid = gridSize / 4;
                    const maxRadius = quarterGrid; 

                    const centerX = x + halfGrid;
                    const centerY = y + halfGrid;

                    const cmy_k_factor = 1 - k;

                    ctx.fillStyle = 'cyan';
                    ctx.beginPath();
                    ctx.arc(centerX - quarterGrid, centerY - quarterGrid, (c * cmy_k_factor) * maxRadius, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = 'magenta';
                    ctx.beginPath();
                    ctx.arc(centerX + quarterGrid, centerY - quarterGrid, (m * cmy_k_factor) * maxRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    ctx.fillStyle = 'yellow';
                    ctx.beginPath();
                    ctx.arc(centerX - quarterGrid, centerY + quarterGrid, (y_cmyk * cmy_k_factor) * maxRadius, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(centerX + quarterGrid, centerY + quarterGrid, k * maxRadius, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }
  },
  {
    id: EffectType.ASCII_ART,
    name: 'Arte ASCII',
    description: 'Crie arte estilizada com símbolos, cores e quantização personalizados.',
    params: [
      { id: 'charSize', name: 'Tamanho do Caractere', type: 'slider', min: 4, max: 20, step: 1, defaultValue: 8 },
      { id: 'brightnessSteps', name: 'Níveis de Brilho', type: 'slider', min: 2, max: 15, step: 1, defaultValue: 7 },
      { id: 'textColor', name: 'Cor do Texto', type: 'color', defaultValue: '#E5E7EB' },
      { id: 'bgColor', name: 'Cor de Fundo', type: 'color', defaultValue: '#111827' },
      { id: 'boldFont', name: 'Fonte em Negrito', type: 'toggle', defaultValue: false },
      {
        id: 'symbols',
        name: 'Conjunto de Símbolos',
        type: 'select',
        defaultValue: ' .:-=+*#%@',
        options: [
          { value: ' .:-=+*#%@', label: 'Padrão' },
          { value: '░▒▓█', label: 'Blocos' },
          { value: '▤▥▦▧▨▩█', label: 'Sombras' },
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
    name: 'Silhueta Neon',
    description: 'Crie um efeito de silhueta brilhante.',
    params: [
      { id: 'invert', name: 'Inverter Original', type: 'toggle', defaultValue: false },
      { id: 'threshold', name: 'Limiar', type: 'slider', min: 1, max: 254, step: 1, defaultValue: 128 },
      { id: 'dotSize', name: 'Tamanho do Ponto', type: 'slider', min: 1, max: 10, step: 1, defaultValue: 3 },
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
  },
  {
    id: EffectType.CRT_MODULATION,
    name: 'Modulação CRT',
    description: 'Distorção de tela CRT com aberração cromática e scanlines.',
    params: [
        { id: 'amplitude', name: 'Amplitude', type: 'slider', min: 0, max: 50, step: 1, defaultValue: 5 },
        { id: 'frequency', name: 'Frequência', type: 'slider', min: 0.01, max: 0.5, step: 0.01, defaultValue: 0.1 },
        { id: 'aberration', name: 'Aberração', type: 'slider', min: 0, max: 20, step: 1, defaultValue: 2 },
        { id: 'scanlineOpacity', name: 'Scanlines', type: 'slider', min: 0, max: 0.5, step: 0.01, defaultValue: 0.15 },
        { id: 'glow', name: 'Brilho', type: 'slider', min: 0, max: 20, step: 1, defaultValue: 10 },
        { id: 'glowColor', name: 'Cor do Brilho', type: 'color', defaultValue: '#818cf8' },
    ],
    processor: (ctx, width, height, params) => {
        const originalImageData = ctx.getImageData(0, 0, width, height);
        const originalData = originalImageData.data;
        const processedImageData = ctx.createImageData(width, height);
        const processedData = processedImageData.data;

        const amplitude = params.amplitude as number;
        const frequency = params.frequency as number;
        const aberration = params.aberration as number;

        for (let y = 0; y < height; y++) {
            const offsetY = Math.sin(y * frequency) * amplitude;
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                
                // Get displaced R, G, B channels
                const [r] = getPixel(originalData, width, x - (offsetY + aberration), y);
                const [g] = getPixel(originalData, width, x - offsetY, y);
                const [b] = getPixel(originalData, width, x - (offsetY - aberration), y);

                processedData[i]     = r;
                processedData[i + 1] = g;
                processedData[i + 2] = b;
                processedData[i + 3] = 255;
            }
        }

        // Apply scanlines
        const scanlineOpacity = params.scanlineOpacity as number;
        if (scanlineOpacity > 0) {
            for (let y = 0; y < height; y += 2) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    processedData[i]   *= (1 - scanlineOpacity);
                    processedData[i+1] *= (1 - scanlineOpacity);
                    processedData[i+2] *= (1 - scanlineOpacity);
                }
            }
        }
        
        ctx.clearRect(0, 0, width, height);
        
        // Apply glow
        const glow = params.glow as number;
        const glowColor = params.glowColor as string;
        if (glow > 0) {
            ctx.shadowBlur = glow;
            ctx.shadowColor = glowColor;
        }

        ctx.putImageData(processedImageData, 0, 0);

        // Reset glow for subsequent draws
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }
  }
];