import React from 'react';

interface ExposureData {
  timestamp: number;
  newsItem?: any;
  neuroState?: any;
  features?: any;
  simulation?: any;
  adaptation: number;
  habituation: number;
  dopamine: number;
  novelty: number;
  salience: number;
  spikes: number;
}

interface MultiExposurePanelProps {
  exposures: ExposureData[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const MultiExposurePanel: React.FC<MultiExposurePanelProps> = ({ exposures, activeIndex, onSelect }) => {
  if (!exposures || exposures.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[800px] bg-black/90 border border-gray-800 backdrop-blur-md p-4 flex flex-col font-mono z-10 pointer-events-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cyan-500 font-bold tracking-widest text-sm">REPLAY — MULTI-EXPOSURE COMPARISON</h2>
        <div className="text-gray-500 text-[10px] font-bold tracking-widest">
          {exposures.length} / 3 EXPOSURES AVAILABLE
        </div>
      </div>
      
      {/* Exposure Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {exposures.map((exp, idx) => (
          <div 
            key={idx}
            onClick={() => onSelect(idx)}
            className={`p-3 border cursor-pointer transition-colors ${
              activeIndex === idx 
                ? 'border-cyan-500 bg-cyan-900/20' 
                : 'border-gray-800 hover:border-gray-600 bg-black/50'
            }`}
          >
            <div className={`text-[10px] font-bold tracking-widest mb-1 ${activeIndex === idx ? 'text-cyan-400' : 'text-gray-500'}`}>
              EXPOSURE 0{idx + 1}
            </div>
            <div className="text-white text-xs truncate mb-2" title={exp.newsItem?.title || 'Unknown Topic'}>
              {exp.newsItem?.title || 'Unknown Topic'}
            </div>
            <div className="text-gray-400 text-[9px] flex justify-between">
              <span>{new Date(exp.timestamp * 1000).toLocaleTimeString()}</span>
              <span>{exp.newsItem?.source || 'Unknown'}</span>
            </div>
          </div>
        ))}
        {/* Fill empty slots if < 3 */}
        {Array.from({ length: 3 - exposures.length }).map((_, idx) => (
          <div key={`empty-${idx}`} className="p-3 border border-gray-900 bg-black/30 flex items-center justify-center">
            <span className="text-gray-700 text-[10px] tracking-widest">NO DATA</span>
          </div>
        ))}
      </div>

      {/* Comparative Metrics Table */}
      <div className="w-full border border-gray-800 rounded bg-[#050505]">
        <table className="w-full text-[10px] text-left">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 tracking-widest">
              <th className="p-2 font-normal">METRIC</th>
              {exposures.map((_, idx) => (
                <th key={idx} className={`p-2 font-normal ${activeIndex === idx ? 'text-cyan-500' : ''}`}>
                  EXP 0{idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-gray-900">
              <td className="p-2 text-gray-500">Spike Count</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 font-bold ${activeIndex === idx ? 'text-cyan-400' : ''}`}>
                  {exp.spikes.toLocaleString()}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-900">
              <td className="p-2 text-gray-500">Active Neurons</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 font-bold ${activeIndex === idx ? 'text-cyan-400' : ''}`}>
                  {exp.simulation?.active_neurons || 0}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-900">
              <td className="p-2 text-gray-500">Novelty</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 ${activeIndex === idx ? 'text-white' : ''}`}>
                  {exp.novelty.toFixed(3)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-900">
              <td className="p-2 text-gray-500">Salience</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 ${activeIndex === idx ? 'text-white' : ''}`}>
                  {exp.salience.toFixed(3)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-900">
              <td className="p-2 text-gray-500">Adaptation</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 text-green-500 ${activeIndex === idx ? 'brightness-125' : 'opacity-70'}`}>
                  {exp.adaptation.toFixed(3)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-900">
              <td className="p-2 text-gray-500">Habituation</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 text-orange-500 ${activeIndex === idx ? 'brightness-125' : 'opacity-70'}`}>
                  {exp.habituation.toFixed(3)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-2 text-gray-500">Dopamine State</td>
              {exposures.map((exp, idx) => (
                <td key={idx} className={`p-2 text-pink-500 ${activeIndex === idx ? 'brightness-125' : 'opacity-70'}`}>
                  {exp.dopamine.toFixed(3)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MultiExposurePanel;
