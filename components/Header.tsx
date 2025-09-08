
import React from 'react';
import { IconPhoto } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <IconPhoto className="w-8 h-8 text-cyan-400 mr-3" />
        <h1 className="text-2xl font-bold text-white tracking-wider">
          Pixel Art <span className="text-cyan-400">FX</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;
