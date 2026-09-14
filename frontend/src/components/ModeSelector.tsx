import React from 'react';

interface ModeSelectorProps {
  onSelectMode: (mode: 'WATCH' | 'EXPOSURE' | 'REPLAY') => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black gap-8 select-none font-mono">
      <div className="text-center mb-8">
        <h1 className="text-cyan-500 text-6xl font-bold tracking-[0.2em] mb-4">NEUROFLY</h1>
        <p className="text-gray-500 text-sm tracking-widest">INTERACTIVE COMPUTATIONAL NEUROSCIENCE</p>
      </div>
      
      <div className="flex flex-col gap-4 w-96">
        <button 
          className="w-full p-6 border border-cyan-800/50 bg-gray-900/40 hover:bg-cyan-900/30 hover:border-cyan-500 transition-all text-left group backdrop-blur-sm"
          onClick={() => onSelectMode('WATCH')}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl text-cyan-400 tracking-widest font-bold group-hover:text-cyan-300">WATCH MODE</h2>
            <span className="text-cyan-800 group-hover:text-cyan-400">→</span>
          </div>
          <p className="text-gray-400 text-xs">The fly watches the world in real-time.</p>
          <p className="text-gray-500 text-[10px] mt-2">Live news ingestion mapped to the MaleCNS connectome.</p>
        </button>
        
        <button 
          className="w-full p-6 border border-purple-800/50 bg-gray-900/40 hover:bg-purple-900/30 hover:border-purple-500 transition-all text-left group backdrop-blur-sm"
          onClick={() => onSelectMode('EXPOSURE')}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl text-purple-400 tracking-widest font-bold group-hover:text-purple-300">EXPOSURE MODE</h2>
            <span className="text-purple-800 group-hover:text-purple-400">→</span>
          </div>
          <p className="text-gray-400 text-xs">Long-term continuous learning experiment.</p>
          <p className="text-gray-500 text-[10px] mt-2">Automated loop testing adaptation and habituation over time.</p>
        </button>

        <button 
          className="w-full p-6 border border-gray-800/50 bg-gray-900/20 hover:bg-gray-800/50 hover:border-gray-500 transition-all text-left group backdrop-blur-sm"
          onClick={() => onSelectMode('REPLAY')}
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl text-gray-400 tracking-widest font-bold group-hover:text-white">MULTI-FLY COMPARISON</h2>
            <span className="text-gray-600 group-hover:text-gray-400">→</span>
          </div>
          <p className="text-gray-500 text-xs">Real-time multi-subject observation and comparison.</p>
        </button>
      </div>

      <div className="mt-16 text-center text-[10px] text-gray-600 max-w-xl px-4">
        NeuroFly uses the real MaleCNS structural connectome. Neural activity and neuromodulatory responses are computational simulations driven by extracted properties of external content. They are not direct measurements of biological neural activity or subjective experience in a living fly.
      </div>
    </div>
  );
};

export default ModeSelector;
