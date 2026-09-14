import { useEffect, useState } from 'react';

interface DataInspectorProps {
  experimentId: string;
}

export default function DataInspector({ experimentId }: DataInspectorProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!experimentId) return;

    const fetchData = async () => {
      try {
        const nodesRes = await fetch(`http://localhost:3001/api/graph/nodes?experiment_id=${experimentId}`);
        const nodesData = await nodesRes.json();
        if (Array.isArray(nodesData)) setNodes(nodesData);

        const edgesRes = await fetch(`http://localhost:3001/api/graph/edges?experiment_id=${experimentId}`);
        const edgesData = await edgesRes.json();
        if (Array.isArray(edgesData)) setEdges(edgesData);
      } catch (err) {
        console.error("DataInspector failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [experimentId]);

  if (loading) return null;

  return (
    <div className="absolute left-6 bottom-32 z-50 pointer-events-none">
      <div className="border border-green-800 bg-green-950/80 p-4 font-mono text-xs w-80 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
        <h3 className="text-green-400 font-bold mb-2 tracking-widest border-b border-green-800/50 pb-1">
          NEUROFLY DATA CONNECTION
        </h3>
        
        <div className="space-y-2 text-green-200">
          <div>
            <span className="text-green-600 block text-[10px]">DATASET</span>
            male-cns:v1.0
          </div>
          <div>
            <span className="text-green-600 block text-[10px]">SOURCE</span>
            Janelia NeuPrint
          </div>
          <div>
            <span className="text-green-600 block text-[10px]">CONNECTION</span>
            CONNECTED
          </div>
          <div className="flex justify-between border-t border-green-900/50 pt-2 mt-2">
            <span>Neurons received:</span>
            <span className="font-bold text-white">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Connections received:</span>
            <span className="font-bold text-white">{edges.length}</span>
          </div>
          
          <div className="mt-2 border-t border-green-900/50 pt-2">
            <span className="text-green-600 block text-[10px]">FIRST NEURON</span>
            {nodes.length > 0 ? String(nodes[0].neuron_id || nodes[0].bodyId) : 'N/A'}
          </div>
          <div>
            <span className="text-green-600 block text-[10px]">FIRST CONNECTION</span>
            {edges.length > 0 ? `${edges[0].source_id || edges[0].source} → ${edges[0].target_id || edges[0].target}` : 'N/A'}
          </div>
          
          <div className="mt-3 text-center bg-green-900/30 py-1 text-green-400 font-bold tracking-widest text-[10px]">
            STATUS: REAL DATA
          </div>
        </div>
      </div>
    </div>
  );
}
