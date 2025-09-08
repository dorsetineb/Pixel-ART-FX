import React from 'react';
import { SelectOption } from '../types';

// --- Slider Control ---

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ label, min, max, step, value, onChange }) => {
  return (
    <div className="flex flex-col justify-center">
      <label className="flex justify-between items-center text-sm font-medium text-gray-300 mb-2">
        <span>{label}</span>
        <span className="px-2 py-1 bg-gray-600 text-cyan-300 rounded-md text-xs font-mono">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
    </div>
  );
};

// --- Toggle Switch Control ---

interface ToggleSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => (
    <label className="flex justify-between items-center text-sm font-medium text-gray-300 cursor-pointer h-full">
      <span>{label}</span>
      <div className="relative inline-flex items-center">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
      </div>
    </label>
);

// --- Color Picker Control ---

interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
    <div>
        <label className="flex justify-between items-center text-sm font-medium text-gray-300 mb-2">
            <span>{label}</span>
            <span className="px-2 py-1 bg-gray-600 text-cyan-300 rounded-md text-xs font-mono uppercase">{value}</span>
        </label>
        <div className="relative h-10 w-full cursor-pointer">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div 
                className="w-full h-full rounded-lg border-2 border-gray-500 pointer-events-none" 
                style={{ backgroundColor: value }}
            ></div>
        </div>
    </div>
);

// --- Text Input Control ---
interface TextInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ label, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-gray-300 mb-2">
            {label}
        </label>
        <input
            id={label}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg p-2.5 focus:ring-cyan-500 focus:border-cyan-500 transition"
        />
    </div>
);

// --- Select Buttons Control ---
interface SelectButtonsProps {
    label: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
}

export const SelectButtons: React.FC<SelectButtonsProps> = ({ label, options, value, onChange }) => {
    return (
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${
                            value === option.value
                                ? 'bg-cyan-500 text-white shadow-md'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
