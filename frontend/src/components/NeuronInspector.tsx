export default function NeuronInspector({ neuron, onClose }: { neuron: any, onClose: () => void }) {
  if (!neuron) return null;

  const prov = neuron.provenance || {};

  return (
    <div className="absolute left-6 top-6 w-80 bg-gray-900/90 border border-gray-700 backdrop-blur-md text-sm p-4 z-50 text-gray-300 flex flex-col pointer-events-auto shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-white font-bold tracking-wider">NEURON INSPECTOR</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-gray-500 text-xs">ID</div>
          <div className="text-cyan-400 font-mono">{neuron.neuron_id || 'UNKNOWN'}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-gray-500 text-xs">CELL TYPE</div>
            <div className="text-white">{neuron.cell_type || 'UNKNOWN'}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">REGION</div>
            <div className="text-white">{neuron.region || 'UNKNOWN'}</div>
          </div>
        </div>

        <div>
          <div className="text-gray-500 text-xs">COORDINATES (x, y, z)</div>
          <div className="font-mono text-xs">
            {neuron.x?.toFixed(1)}, {neuron.y?.toFixed(1)}, {neuron.z?.toFixed(1)}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="text-gray-500 text-xs mb-1">DATA CONTRACT & PROVENANCE</div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">Dataset</span>
            <span className="text-right text-gray-200 truncate w-32" title={prov.dataset_name}>
              {prov.dataset_name || 'UNKNOWN'}
            </span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">Biological Status</span>
            <span className={`text-right ${prov.biological_status === 'DEVELOPMENT_FIXTURE' ? 'text-red-400' : 'text-green-400'}`}>
              {prov.biological_status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex justify-between mb-1">
            <span className="text-gray-400">Confidence</span>
            <span className="text-right text-yellow-400">
              {prov.confidence || 'UNKNOWN'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
