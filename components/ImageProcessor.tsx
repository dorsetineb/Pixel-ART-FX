import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EffectType, Effect, EffectParamsState, EffectParam, Preset } from '../types';
import { EFFECTS } from '../constants';
import { IconUpload, IconDownload, IconSave, IconTrash } from './Icons';
import Button from './Button';
import { Slider, ToggleSwitch, ColorPicker, TextInput, SelectButtons } from './Slider';

const PRESET_STORAGE_KEY = 'fotif-ai-presets';

const ImageProcessor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [activeEffect, setActiveEffect] = useState<EffectType>(EffectType.DUOTONE_PIXELATE);
  const [effectParams, setEffectParams] = useState<EffectParamsState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalViewportRef = useRef<HTMLDivElement>(null);

  const selectedEffect = EFFECTS.find(e => e.id === activeEffect) || EFFECTS[0];

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem(PRESET_STORAGE_KEY);
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    } catch (e) {
      console.error("Failed to load presets from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
        console.error("Failed to save presets to localStorage", e);
    }
  }, [presets]);


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

            originalCtx.drawImage(originalImage, 0, 0);
            processedCtx.drawImage(originalImage, 0, 0);
            
            selectedEffect.processor(processedCtx, width, height, effectParams);
        } catch (e) {
            console.error("Processing failed:", e);
            setError("Desculpe, ocorreu um erro ao aplicar o efeito.");
        } finally {
            setIsLoading(false);
        }
    }, 50);
  }, [originalImage, selectedEffect, effectParams]);

  useEffect(() => {
    processImage();
  }, [processImage]);

  useEffect(() => {
    if (originalImage) {
      setPan({ x: 0, y: 0 });
    }
  }, [originalImage]);

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
            setError("Não foi possível carregar o arquivo de imagem. Pode estar corrompido ou em um formato não suportado.");
        }
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        setError("Falha ao ler o arquivo selecionado.");
      }
      reader.readAsDataURL(file);
    } else if (file) {
        setError("Por favor, selecione um arquivo de imagem válido (ex: JPG, PNG, GIF).");
    }
  };

  const handleDownload = () => {
    if (!processedCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `fotif-ai-${Date.now()}.png`;
    link.href = processedCanvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  const handleParamChange = (paramId: string, value: number | string | boolean) => {
    setEffectParams(prev => ({ ...prev, [paramId]: value }));
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      setError("O nome da predefinição não pode estar vazio.");
      return;
    }
    const newPreset: Preset = {
      name: newPresetName.trim(),
      effectId: activeEffect,
      params: { ...effectParams },
    };
    setPresets(prev => {
        const existingIndex = prev.findIndex(p => p.name === newPreset.name);
        if (existingIndex > -1) {
            const updatedPresets = [...prev];
            updatedPresets[existingIndex] = newPreset;
            return updatedPresets;
        }
        return [...prev, newPreset];
    });
    setNewPresetName('');
    setIsSavingPreset(false);
    setError(null);
  };

  const handleApplyPreset = (preset: Preset) => {
    setActiveEffect(preset.effectId);
    setEffectParams(preset.params);
  };

  const handleDeletePreset = (presetName: string) => {
    setPresets(prev => prev.filter(p => p.name !== presetName));
  };

  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!originalImage || !originalViewportRef.current) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    originalViewportRef.current.style.cursor = 'grabbing';
  };

  const handlePanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !originalImage || !originalViewportRef.current) return;
    e.preventDefault();
    const viewport = originalViewportRef.current.getBoundingClientRect();
    const imageWidth = originalImage.width;
    const imageHeight = originalImage.height;

    const maxX = Math.max(0, imageWidth - viewport.width);
    const maxY = Math.max(0, imageHeight - viewport.height);

    const nextX = e.clientX - panStartRef.current.x;
    const nextY = e.clientY - panStartRef.current.y;

    const clampedX = Math.max(-maxX, Math.min(0, nextX));
    const clampedY = Math.max(-maxY, Math.min(0, nextY));

    setPan({ x: clampedX, y: clampedY });
  };

  const handlePanEnd = () => {
    if (originalViewportRef.current) {
        originalViewportRef.current.style.cursor = 'grab';
    }
    setIsPanning(false);
  };

  const renderParamControl = (param: EffectParam) => {
    const value = effectParams[param.id];

    switch (param.type) {
      case 'slider':
        return <Slider key={param.id} label={param.name} min={param.min} max={param.max} step={param.step} value={typeof value === 'number' ? value : param.defaultValue} onChange={(val) => handleParamChange(param.id, val)} />;
      case 'toggle':
        return <ToggleSwitch key={param.id} label={param.name} checked={typeof value === 'boolean' ? value : param.defaultValue} onChange={(val) => handleParamChange(param.id, val)} />;
      case 'color':
        return <ColorPicker key={param.id} label={param.name} value={typeof value === 'string' ? value : param.defaultValue} onChange={(val) => handleParamChange(param.id, val)} />;
      case 'string':
        return <TextInput key={param.id} label={param.name} value={typeof value === 'string' ? value : param.defaultValue} onChange={(val) => handleParamChange(param.id, val)} placeholder={param.placeholder}/>;
      case 'select':
        return <SelectButtons key={param.id} label={param.name} options={param.options} value={typeof value === 'string' ? value : param.defaultValue} onChange={(val) => handleParamChange(param.id, val)} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {!originalImage ? (
        <div 
          className="w-full h-80 border-4 border-dashed border-gray-600 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer hover:border-cyan-400 hover:bg-gray-800 transition-all duration-300"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload className="w-16 h-16 text-gray-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-300">Clique para Enviar uma Imagem</h2>
          <p className="text-gray-400 mt-2">ou arraste e solte aqui</p>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-x-8 items-start">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-4rem)]">
                {/* Original Image Viewport */}
                <div
                    ref={originalViewportRef}
                    className="h-full rounded-lg overflow-hidden cursor-grab bg-gray-900/50 relative"
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    aria-label="Original image viewport. Click and drag to pan."
                >
                    <canvas
                        ref={originalCanvasRef}
                        className="block max-w-none absolute top-0 left-0"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px)`,
                            transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                        }}
                    />
                </div>
    
                {/* Processed Image Viewport */}
                <div className="h-full rounded-lg overflow-hidden bg-gray-900/50 relative" aria-label="Processed image viewport.">
                     <canvas
                        ref={processedCanvasRef}
                        className="block max-w-none absolute top-0 left-0"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px)`,
                            transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                        }}
                    />
                    {isLoading && (
                       <div className="absolute inset-0 bg-black bg-opacity-70 flex justify-center items-center rounded-lg">
                          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin" style={{borderTopColor: '#22d3ee'}}></div>
                       </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl lg:sticky lg:top-8 self-start flex flex-col gap-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
              
              {presets.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Predefinições</label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <div key={preset.name} className="group relative">
                        <button onClick={() => handleApplyPreset(preset)} className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500">
                          {preset.name}
                        </button>
                        <button onClick={() => handleDeletePreset(preset.name)} className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500" aria-label={`Excluir predefinição ${preset.name}`}>
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Efeitos</label>
                <div className="grid grid-cols-2 gap-3">
                    {EFFECTS.map(effect => (
                    <button key={effect.id} onClick={() => setActiveEffect(effect.id)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${ activeEffect === effect.id ? 'bg-cyan-500 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {effect.name}
                    </button>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                {selectedEffect.params.map(renderParamControl)}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-700 flex flex-col gap-4">
                {isSavingPreset && (
                  <div className="bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:flex-grow">
                          <TextInput label="Nome da Predefinição" value={newPresetName} onChange={setNewPresetName} placeholder="ex., Clima Retrô"/>
                      </div>
                      <div className="flex gap-2">
                          <Button onClick={handleSavePreset}>Confirmar</Button>
                          <Button onClick={() => { setIsSavingPreset(false); setError(null); }} variant="secondary">Cancelar</Button>
                      </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 justify-end">
                    {!isSavingPreset && (
                        <Button onClick={() => setIsSavingPreset(true)} variant="secondary" icon={<IconSave className="w-5 h-5 mr-2" />}>
                            Salvar Predefinição
                        </Button>
                    )}
                    <Button onClick={handleDownload} icon={<IconDownload className="w-5 h-5 mr-2"/>}>
                        Baixar Imagem
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" icon={<IconUpload className="w-5 h-5 mr-2"/>}>
                        Nova Imagem
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
                </div>
              </div>
            </div>
        </div>
      )}
      {error && (
        <div className="mt-8 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline">{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageProcessor;