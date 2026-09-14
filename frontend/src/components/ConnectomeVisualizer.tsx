import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ChunkManager } from '../utils/ChunkManager';

interface ConnectomeVisualizerProps {
  experimentId: string | null;
  currentEpoch: number;
  onSelectNeuron: (neuron: any) => void;
  visualMode: 'WEB' | 'LOCAL';
  targetBodyId?: string | null;
  edgeAblation?: { source: string; target: string } | null;
  lookInsideTrigger?: number;
  activityLevel?: number;
  positionOffset?: [number, number, number];
  activeNeuronIds?: number[];
}

const SCALE = 0.001; // NeuPrint coordinates are in nm/voxels and very large

export default function ConnectomeVisualizer({ experimentId, currentEpoch, onSelectNeuron, visualMode, targetBodyId, edgeAblation, lookInsideTrigger = 0, fitViewTrigger = 0, activityLevel = 0, positionOffset = [0, 0, 0], activeNeuronIds = [] }: ConnectomeVisualizerProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [binaryChunks, setBinaryChunks] = useState<any[]>([]);
  const chunkManager = useMemo(() => new ChunkManager(), []);

  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 45));

  const [isLerping, setIsLerping] = useState(false);

  useEffect(() => {
    if (lookInsideTrigger > 0) {
      targetCamPos.current.set(0, 0, 15); // Zoom in
      setIsLerping(true);
      setTimeout(() => {
         targetCamPos.current.set(0, 0, 45); // Zoom back out
         setIsLerping(true);
         setTimeout(() => setIsLerping(false), 2000);
      }, 5000);
    }
  }, [lookInsideTrigger]);

  useEffect(() => {
    if (fitViewTrigger > 0 && binaryChunks.length > 0) {
      // Find bounds
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      binaryChunks.forEach(c => {
        for (let i = 0; i < c.vertices.length; i += 3) {
          if (c.vertices[i] < minX) minX = c.vertices[i];
          if (c.vertices[i] > maxX) maxX = c.vertices[i];
          if (c.vertices[i+1] < minY) minY = c.vertices[i+1];
          if (c.vertices[i+1] > maxY) maxY = c.vertices[i+1];
          if (c.vertices[i+2] < minZ) minZ = c.vertices[i+2];
          if (c.vertices[i+2] > maxZ) maxZ = c.vertices[i+2];
        }
      });
      // The vertices are translated by 'center' in the render loop.
      // So the mesh is centered at 0,0,0. We just need max extent.
      const maxExtent = Math.max((maxX - minX), (maxY - minY), (maxZ - minZ)) * SCALE;
      // Position camera isometrically
      targetCamPos.current.set(maxExtent * 0.4, maxExtent * 0.3, maxExtent * 0.8);
      setIsLerping(true);
      setTimeout(() => setIsLerping(false), 2000);
    }
  }, [fitViewTrigger, binaryChunks]);

  useFrame(() => {
    if (isLerping) {
      camera.position.lerp(targetCamPos.current, 0.05);
    }
  });

  // Fetch true spatial coordinates and graph data from the backend
  useEffect(() => {
    if (visualMode === 'WEB' && experimentId) {
      setBinaryChunks([]); // clear local chunks
      Promise.all([
        fetch(`http://localhost:3001/api/graph/nodes?experiment_id=${experimentId}`).then(r => r.json()),
        fetch(`http://localhost:3001/api/graph/edges?experiment_id=${experimentId}`).then(r => r.json())
      ])
        .then(([nodesData, edgesData]) => {
          if (Array.isArray(nodesData)) {
            setNodes(nodesData.filter(n => n && n.x !== undefined));
          }
          if (Array.isArray(edgesData)) {
            setEdges(edgesData);
          }
        })
        .catch(console.error);

      fetch(`http://localhost:3001/api/metrics?experiment_id=${experimentId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMetrics(data);
        })
        .catch(console.error);
    } else if (visualMode === 'LOCAL') {
      setNodes([]); setEdges([]); setMetrics([]);
      fetch(`http://localhost:3001/api/local/chunks`)
        .then(res => res.json())
        .then(chunkIds => {
          if (!Array.isArray(chunkIds)) return;
          const loadProgressively = async () => {
            for (const id of chunkIds) {
              const decoded = await chunkManager.fetchChunk(id);
              if (decoded) {
                setBinaryChunks(prev => {
                  if (!prev.find(p => p.header.chunk_id === decoded.header.chunk_id)) {
                    return [...prev, decoded];
                  }
                  return prev;
                });
              }
              // Slight delay to yield to React renderer
              await new Promise(r => setTimeout(r, 20));
            }
          };
          loadProgressively();
        })
        .catch(console.error);
    }
  }, [experimentId, visualMode, chunkManager]);

  const currentMetric = useMemo(() => {
    return metrics.find(m => m.epoch === currentEpoch) || null;
  }, [metrics, currentEpoch]);

  // Compute Center to normalize camera view
  const center = useMemo(() => {
    if (visualMode === 'WEB' && nodes.length > 0) {
      let cx = 0, cy = 0, cz = 0;
      nodes.forEach(n => {
        cx += (n.x || 0); cy += (n.y || 0); cz += (n.z || 0);
      });
      return new THREE.Vector3(cx / nodes.length, cy / nodes.length, cz / nodes.length);
    } else if (visualMode === 'LOCAL' && binaryChunks.length > 0) {
      // Use the first soma of the first chunk to center roughly
      const firstChunk = binaryChunks[0];
      if (firstChunk.header.neurons && firstChunk.header.neurons.length > 0) {
        const soma = firstChunk.header.neurons[0].soma;
        if (soma) return new THREE.Vector3(soma[0], soma[1], soma[2]);
      }
      return new THREE.Vector3(10000, 10000, 10000); // Approximate CNS center fallback
    }
    return new THREE.Vector3(0,0,0);
  }, [nodes, binaryChunks, visualMode]);

  // 1. Construct Soma Buffers
  const [positions, colors] = useMemo(() => {
    if (nodes.length === 0) {
      return [new Float32Array(), new Float32Array()];
    }

    const pos = new Float32Array(nodes.length * 3);
    const col = new Float32Array(nodes.length * 3);
    
    nodes.forEach((node, i) => {
      // Map true coordinates relative to center
      pos[i * 3] = ((node.x || 0) - center.x) * SCALE;
      pos[i * 3 + 1] = ((node.y || 0) - center.y) * SCALE;
      pos[i * 3 + 2] = ((node.z || 0) - center.z) * SCALE;
      
      const type = (node.cell_type || '').toUpperCase();
      let r = 0.1, g = 0.8, b = 0.7; // Default KC
      
      const isActive = activeNeuronIds.includes(i);
      
      if (isActive) {
        r = 0.4; g = 1.0; b = 1.0; // Bright cyan flash for active neurons
      } else if (targetBodyId && node.body_id === targetBodyId) {
        // Highlight research target
        r = 0.2; g = 1.0; b = 0.2; // Bright green
      } else if (type.includes('DAN') || type.includes('PAM')) {
        r = 1.0; g = 0.7; b = 0.0;
        // Pulse if PAM is highly active
        if (currentMetric && currentMetric.pam_hz > 10) {
           r = 1.0; g = 1.0; b = 0.5; // Bright flash
        }
      } else if (type.includes('PPL1')) {
        r = 1.0; g = 0.2; b = 0.2;
        // Pulse if PPL1 is highly active
        if (currentMetric && currentMetric.ppl1_hz > 10) {
           r = 1.0; g = 0.5; b = 0.5; // Bright flash
        }
      } else if (type.includes('MBON')) {
        r = 0.9; g = 0.3; b = 0.1;
      }
      
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    });
    
    return [pos, col];
  }, [nodes, center, currentMetric, activeNeuronIds]);

  // 2. Construct Skeleton (LineSegments) Buffer
  const skeletonGeometry = useMemo(() => {
    const vertices: number[] = [];
    const colorArr: number[] = [];
    
    nodes.forEach(node => {
      if (!node.skeleton || !Array.isArray(node.skeleton)) return;
      
      const type = (node.cell_type || '').toUpperCase();
      let r=0.1, g=0.8, b=0.7;
      if (type.includes('DAN') || type.includes('PAM') || type.includes('PPL1')) { r=1.0; g=0.7; b=0.0; }
      else if (type.includes('MBON')) { r=0.9; g=0.3; b=0.1; }

      const indexMap = new Map();
      node.skeleton.forEach((sk: any, i: number) => {
        indexMap.set(sk.rowId || (i+1), sk);
      });
      
      node.skeleton.forEach((sk: any) => {
        const link = sk.link;
        if (link && indexMap.has(link)) {
          const parent = indexMap.get(link);
          vertices.push(((sk.x || 0) - center.x) * SCALE, ((sk.y || 0) - center.y) * SCALE, ((sk.z || 0) - center.z) * SCALE);
          vertices.push(((parent.x || 0) - center.x) * SCALE, ((parent.y || 0) - center.y) * SCALE, ((parent.z || 0) - center.z) * SCALE);
          colorArr.push(r, g, b, r, g, b);
        }
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
    return geo;
  }, [nodes, center]);

  // 3. Construct Synapses
  const [synapsePos, synapseCol] = useMemo(() => {
    if (edges.length === 0) return [new Float32Array(), new Float32Array()];
    
    const pos: number[] = [];
    const col: number[] = [];
    const ablatedPos: number[] = [];
    
    edges.forEach(edge => {
      const isAblated = edgeAblation && edge.source === edgeAblation.source && edge.target === edgeAblation.target;
      if (edge.synapse_locations && Array.isArray(edge.synapse_locations)) {
        edge.synapse_locations.forEach((syn: any) => {
          const sx = ((syn.x || 0) - center.x) * SCALE;
          const sy = ((syn.y || 0) - center.y) * SCALE;
          const sz = ((syn.z || 0) - center.z) * SCALE;
          if (isAblated) {
            ablatedPos.push(sx, sy, sz);
          } else {
            pos.push(sx, sy, sz);
            col.push(0.3, 0.4, 0.6); // Dim blue/white for synapses
          }
        });
      }
    });

    return [new Float32Array(pos), new Float32Array(col), new Float32Array(ablatedPos)];
  }, [edges, center, edgeAblation]);

  const handleClick = (event: any) => {
    if (event.index !== undefined && nodes[event.index]) {
      onSelectNeuron(nodes[event.index]);
    }
  };

  return (
    <group position={positionOffset}>
      {/* Somas */}
      <Points ref={pointsRef} positions={positions} colors={colors} onClick={handleClick}>
        <PointMaterial transparent vertexColors size={0.3} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
      </Points>

      {/* WEB Skeletons */}
      {visualMode === 'WEB' && skeletonGeometry.attributes.position && skeletonGeometry.attributes.position.count > 0 && (
        <lineSegments geometry={skeletonGeometry}>
          <lineBasicMaterial vertexColors transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </lineSegments>
      )}

      {/* LOCAL Binary Skeletons */}
      {visualMode === 'LOCAL' && binaryChunks.map((chunk, idx) => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(chunk.vertices.length);
        
        // Translate vertices around the center point and scale
        for (let i = 0; i < chunk.vertices.length; i += 3) {
          positions[i] = (chunk.vertices[i] - center.x) * SCALE;
          positions[i+1] = (chunk.vertices[i+1] - center.y) * SCALE;
          positions[i+2] = (chunk.vertices[i+2] - center.z) * SCALE;
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setIndex(new THREE.BufferAttribute(chunk.indices, 1));
        
        return (
          <lineSegments key={`chunk-${chunk.header.chunk_id}-${idx}`} geometry={geo}>
            <lineBasicMaterial color={0x44aaff} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
          </lineSegments>
        );
      })}

      {/* Synapses */}
      {synapsePos.length > 0 && (
        <Points positions={synapsePos} colors={synapseCol}>
          <PointMaterial transparent vertexColors size={0.1} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
        </Points>
      )}

      {/* Ablated Synapses */}
      {/* {ablatedSynapsePos && ablatedSynapsePos.length > 0 && (
        <Points positions={ablatedSynapsePos}>
          <PointMaterial color={0xff0000} transparent size={0.3} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
        </Points>
      )} */}

      {/* Activity Status Overlay */}
      {activityLevel === 0 && (
        <Html center position={[0, 0, 0]}>
          <div className="bg-black/80 border border-gray-700 px-4 py-2 text-gray-500 font-mono text-[10px] tracking-widest whitespace-nowrap shadow-lg">
            MODEL STATUS: REQUIRES CALIBRATION<br/>
            <span className="text-gray-600">(ZERO SPIKES)</span>
          </div>
        </Html>
      )}
      {activityLevel > 0 && (
        <Html center position={[0, 0, 0]}>
          <div className="bg-black/50 border border-cyan-700 px-4 py-2 text-cyan-400 font-mono text-[10px] tracking-widest whitespace-nowrap shadow-[0_0_15px_rgba(0,255,255,0.3)] animate-pulse">
            MODEL STATUS: ACTIVE<br/>
            <span className="text-white">({activityLevel} SPIKES)</span>
          </div>
        </Html>
      )}
    </group>
  );
}
