import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EffectType, Effect, EffectParamsState, EffectParam } from '../types';
import { EFFECTS } from '../constants';
import { IconUpload, IconDownload, IconWand } from './Icons';
import Button from './Button';
import { Slider, ToggleSwitch, ColorPicker, TextInput, SelectButtons } from './Slider';

const ImageProcessor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [activeEffect, setActiveEffect] = useState<EffectType>(EffectType.PIXELATE);
  const [effectParams, setEffectParams] = useState<EffectParamsState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedEffect = EFFECTS.find(e => e.id === activeEffect) || EFFECTS[0];

  useEffect(() => {
    const initialParams: EffectParamsState = {};
    selectedEffect.params.forEach(p => {
      initialParams[p.id] = p.defaultValue;
    });
    setEffectParams(initialParams);
  }, [activeEffect, selectedEffect]);

  const processImage = useCallback(() => {
    if (!originalImage || !processedCanvasRef.current || !originalCanvasRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    // Use setTimeout to allow the UI to update (show loader) before the heavy processing starts
    setTimeout(() => {
        try {
            const originalCtx = originalCanvasRef.current?.getContext('2d', { willReadFrequently: true });
            const processedCtx = processedCanvasRef.current?.getContext('2d', { willReadFrequently: true });
            
            if (!originalCtx || !processedCtx) {
                throw new Error("Could not get canvas context.");
            }

            const { width, height } = originalImage;
            originalCanvasRef.current!.width = width;
            originalCanvasRef.current!.height = height;
            processedCanvasRef.current!.width = width;
            processedCanvasRef.current!.height = height;

            // Draw original image to both canvases initially
            originalCtx.drawImage(originalImage, 0, 0);
            processedCtx.drawImage(originalImage, 0, 0);
            
            // Apply effect to the processed canvas
            selectedEffect.processor(processedCtx, width, height, effectParams);
        } catch (e) {
            console.error("Processing failed:", e);
            setError("Sorry, an error occurred while applying the effect.");
        } finally {
            setIsLoading(false);
        }
    }, 50);
  }, [originalImage, selectedEffect, effectParams]);

  useEffect(() => {
    processImage();
  }, [processImage]);


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
        };
        img.onerror = () => {
            setError("Could not load the image file. It might be corrupted or in an unsupported format.");
        }
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setError("Failed to read the selected file.");
      }
      reader.readAsDataURL(file);
    } else if (file) {
        setError("Please select a valid image file (e.g., JPG, PNG, GIF).");
    }
  };

  const handleDownload = () => {
    if (!processedCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `pixel-art-fx-${Date.now()}.png`;
    link.href = processedCanvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  const handleParamChange = (paramId: string, value: number | string | boolean) => {
    setEffectParams(prev => ({ ...prev, [paramId]: value }));
  };

  const renderParamControl = (param: EffectParam) => {
    const value = effectParams[param.id];

    switch (param.type) {
      case 'slider':
        return (
          <Slider 
            key={param.id}
            label={param.name}
            min={param.min}
            max={param.max}
            step={param.step}
            value={typeof value === 'number' ? value : param.defaultValue}
            onChange={(val) => handleParamChange(param.id, val)}
          />
        );
      case 'toggle':
        return (
          <ToggleSwitch
            key={param.id}
            label={param.name}
            checked={typeof value === 'boolean' ? value : param.defaultValue}
            onChange={(val) => handleParamChange(param.id, val)}
          />
        );
      case 'color':
        return (
          <ColorPicker
            key={param.id}
            label={param.name}
            value={typeof value === 'string' ? value : param.defaultValue}
            onChange={(val) => handleParamChange(param.id, val)}
          />
        );
      case 'string':
        return (
            <TextInput
                key={param.id}
                label={param.name}
                value={typeof value === 'string' ? value : param.defaultValue}
                onChange={(val) => handleParamChange(param.id, val)}
                placeholder={param.placeholder}
            />
        );
      case 'select':
        return (
          <SelectButtons
            key={param.id}
            label={param.name}
            options={param.options}
            value={typeof value === 'string' ? value : param.defaultValue}
            onChange={(val) => handleParamChange(param.id, val)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {!originalImage ? (
        <div 
          className="w-full h-80 border-4 border-dashed border-gray-600 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer hover:border-cyan-400 hover:bg-gray-800 transition-all duration-300"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload className="w-16 h-16 text-gray-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-300">Click to Upload Image</h2>
          <p className="text-gray-400 mt-2">or drag and drop here</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-400">Original</h3>
              <canvas ref={originalCanvasRef} className="w-full h-auto rounded-lg shadow-lg bg-gray-800" />
            </div>
            <div className="relative">
              <h3 className="text-xl font-semibold mb-3 text-gray-400">Processed</h3>
              <canvas ref={processedCanvasRef} className="w-full h-auto rounded-lg shadow-lg bg-gray-800" />
              {isLoading && (
                 <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center rounded-lg">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin" style={{'borderTopColor': '#22d3ee'}}></div>
                 </div>
              )}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                 <IconWand className="w-8 h-8 text-cyan-400" />
                 <h2 className="text-3xl font-bold">Effect Controls</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                {EFFECTS.map(effect => (
                  <button
                    key={effect.id}
                    onClick={() => setActiveEffect(effect.id)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${
                      activeEffect === effect.id 
                        ? 'bg-cyan-500 text-white shadow-md' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {effect.name}
                  </button>
                ))}
              </div>

              <div className="space-y-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {selectedEffect.params.map(renderParamControl)}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                 <Button onClick={handleDownload} icon={<IconDownload className="w-5 h-5 mr-2"/>}>
                   Download Image
                 </Button>
                 <Button onClick={() => fileInputRef.current?.click()} variant="secondary" icon={<IconUpload className="w-5 h-5 mr-2"/>}>
                   Upload New Image
                 </Button>
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
              </div>
          </div>
        </>
      )}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageProcessor;