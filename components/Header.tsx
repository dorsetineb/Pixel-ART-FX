import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <h1 className="text-2xl font-bold text-white tracking-wider">
          Fotif-<span className="text-cyan-400">AI</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;