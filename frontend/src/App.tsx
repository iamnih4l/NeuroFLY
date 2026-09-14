import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ConnectomeVisualizer from './components/ConnectomeVisualizer';
import NeuronInspector from './components/NeuronInspector';
import ModeSelector from './components/ModeSelector';
import FlyTVScene from './components/FlyTVScene';
import LiveSignalsPanel from './components/LiveSignalsPanel';
import AnalyticsRail from './components/AnalyticsRail';
import LiveSignalStrip from './components/LiveSignalStrip';
import ExposureTimeline from './components/ExposureTimeline';
import MultiFlyComparison from './components/MultiFlyComparison';

function App() {
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [selectedNeuron, setSelectedNeuron] = useState<any>(null);
  
  const [appState, setAppState] = useState<'MODE_SELECT' | 'WATCH_MODE' | 'EXPOSURE_MODE' | 'REPLAY' | 'ERROR'>('MODE_SELECT');
  
  // Watch Mode State
  const [newsItem, setNewsItem] = useState<any>(null);
  const [neuroState, setNeuroState] = useState<any>(null);
  const [features, setFeatures] = useState<any>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const watchIntervalRef = useRef<any>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [multiflyState, setMultiflyState] = useState<any[]>([]);

  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [lookInsideTrigger, setLookInsideTrigger] = useState<number>(0);

  // Unified function to fetch a single step
  const fetchWatchStep = async () => {
    setIsWatching(true);
    try {
      const res = await fetch('http://localhost:3001/api/watch/step');
      const data = await res.json();
      if (data && data.news_item) {
        setNewsItem({
          ...data.news_item,
          publishedAt: data.news_item.published_at || new Date().toISOString(),
          imageUrl: data.news_item.image_url,
          isDemo: data.news_item.is_demo === 1
        });
        setNeuroState(data.neuro_state);
        setFeatures(data.features);
        
        // Append to history
        setHistory(prev => {
          const newPoint = {
            timestamp: data.features.timestamp,
            adaptation: data.neuro_state.adaptation,
            habituation: data.neuro_state.habituation,
            dopamine: data.neuro_state.last_dopamine_level,
            novelty: data.features.novelty || 0,
            salience: data.features.semantic_salience || 0,
            spikes: data.simulation?.total_spikes || 0,
          };
          return [...prev, newPoint].slice(-200);
        });
        
        // Force visual update on connectome?
        // Set an experiment ID to trigger visualizer to load the circuit
        if (!experimentId) {
          setExperimentId('watch_mode_live');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWatching(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/watch/history');
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map((d: any) => ({
          timestamp: d.timestamp,
          newsItem: d.news_item,
          neuroState: d.state_after,
          features: d.sensory_features,
          simulation: d.simulation_result,
          adaptation: d.state_after?.adaptation || 0,
          habituation: d.state_after?.habituation || 0,
          dopamine: d.state_after?.last_dopamine_level || 0,
          novelty: d.sensory_features?.novelty || 0,
          salience: d.sensory_features?.semantic_salience || 0,
          spikes: d.simulation_result?.total_spikes || 0,
        }));
        setHistory(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMultiFlyStep = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/watch/multifly_step');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMultiflyState(data);
        if (!experimentId) {
          setExperimentId('multifly_mode_live');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (appState === 'WATCH_MODE') {
      fetchHistory();
      fetchWatchStep();
      watchIntervalRef.current = setInterval(fetchWatchStep, 15000); // Poll every 15s
    } else if (appState === 'EXPOSURE_MODE') {
      fetchHistory();
    } else if (appState === 'REPLAY') {
      setMultiflyState([]); // Clear old state
      fetchMultiFlyStep();
      watchIntervalRef.current = setInterval(fetchMultiFlyStep, 15000);
    }

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
  }, [appState]);

  const showScientificUI = appState !== 'MODE_SELECT' && appState !== 'ERROR';

  // Determine active view variables based on mode
  const currentNewsItem = newsItem;
  const currentFeatures = features;
  const currentNeuroState = neuroState;
  
  let currentSpikes = history.length > 0 ? history[history.length - 1].spikes : 0;
  let currentActiveNeurons = currentSpikes > 0 ? Math.floor(currentSpikes / 2) : 0;

  return (
    <div className="w-screen h-screen relative bg-[#020406] overflow-hidden select-none font-mono">
      
      {/* Mode Selection Layer */}
      {appState === 'MODE_SELECT' && (
        <ModeSelector onSelectMode={(mode) => setAppState(mode === 'WATCH' ? 'WATCH_MODE' : (mode === 'EXPOSURE' ? 'EXPOSURE_MODE' : 'REPLAY'))} />
      )}

      {/* Main Observation Experience */}
      {showScientificUI && appState === 'REPLAY' ? (
        <MultiFlyComparison 
          multiflyState={multiflyState} 
          experimentId={experimentId} 
          fitViewTrigger={fitViewTrigger} 
          onFitView={() => setFitViewTrigger(prev => prev + 1)} 
        />
      ) : showScientificUI && (
        <div className="absolute inset-0 grid grid-cols-[320px_minmax(0,1fr)_360px] overflow-hidden">
          
          {/* Left Column (Input & FlyTV) */}
          <div className="relative h-full flex flex-col items-center justify-center border-r border-gray-800 bg-[#020406]/90 z-10 p-4">
             {/* Header */}
             <div className="absolute top-4 left-4 z-10 text-[10px] font-bold tracking-widest pointer-events-none text-gray-500">
               NEUROFLY <span className="text-cyan-500 mx-2">|</span> WATCH
             </div>

             <FlyTVScene 
                newsItem={currentNewsItem} 
                isWatching={appState === 'WATCH_MODE' && isWatching} 
                features={currentFeatures}
                onLookInside={() => setLookInsideTrigger(prev => prev + 1)}
             />
          </div>

          {/* Main Hero (Connectome + Strip) */}
          <div className="relative h-full flex flex-col overflow-hidden min-h-0">
            
            {/* Hero Overlay Info */}
            <div className="absolute top-4 left-4 z-10 text-[10px] font-bold tracking-widest pointer-events-none text-gray-500">
              COMPLETE MALECNS CONNECTOME
            </div>

            <div className="absolute top-4 right-4 text-right z-10 opacity-70 pointer-events-none">
               <div className="text-cyan-400 text-[10px] font-bold tracking-widest">STRUCTURE: REAL DATA (MaleCNS)</div>
               <div className="text-purple-400 text-[10px] font-bold tracking-widest">ACTIVITY: SIMULATED (Brian2)</div>
            </div>

            {/* 3D Canvas Connectome */}
            <div className="absolute inset-0 z-0">
              <Canvas camera={{ position: [0, 0, 45], fov: 45 }}>
                <color attach="background" args={['#020406']} />
                <OrbitControls 
                  enablePan={true} 
                  maxDistance={100} 
                  minDistance={5}
                  autoRotate={false}
                />
                <ConnectomeVisualizer 
                  experimentId={experimentId} 
                  currentEpoch={0}
                  onSelectNeuron={setSelectedNeuron} 
                  visualMode="LOCAL"
                  targetBodyId={"125080"}
                  edgeAblation={null}
                  lookInsideTrigger={lookInsideTrigger}
                  fitViewTrigger={fitViewTrigger}
                  activityLevel={currentSpikes}
                />
              </Canvas>
            </div>

             {/* Bottom Overlay Controls & Legend */}
             <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => setFitViewTrigger(prev => prev + 1)} className="px-3 py-1 bg-gray-900/80 border border-gray-700 text-cyan-400 text-[10px] font-bold tracking-widest hover:bg-gray-800 transition-colors pointer-events-auto">FIT ENTIRE CONNECTOME</button>
                  <button onClick={() => setFitViewTrigger(prev => prev + 1)} className="px-3 py-1 bg-gray-900/80 border border-gray-700 text-gray-400 text-[10px] font-bold tracking-widest hover:bg-gray-800 transition-colors pointer-events-auto">RESET VIEW</button>
                </div>
                <div className="bg-black/60 border-l-2 border-gray-800 pl-3 py-2 mt-2 pointer-events-none">
                   <div className="text-gray-400 text-[9px] font-bold tracking-widest mb-1">LEGEND</div>
                   <div className="text-gray-400 text-[9px] font-bold tracking-widest"><span className="text-[#44aaff] mr-2">■</span> REAL STRUCTURE</div>
                   <div className="text-gray-400 text-[9px] font-bold tracking-widest"><span className="text-white mr-2">■</span> MODELED ACTIVITY</div>
                   <div className="text-gray-400 text-[9px] font-bold tracking-widest"><span className="text-orange-500 mr-2">■</span> DOPAMINERGIC POPULATION</div>
                   <div className="text-gray-400 text-[9px] font-bold tracking-widest"><span className="text-green-500 mr-2">■</span> ACTIVE PATHWAY</div>
                </div>
             </div>
             
             {/* Removed FlyTVScene from here */}

            {/* Bottom Signal Strip or Timeline depending on mode */}
            {appState === 'EXPOSURE_MODE' ? (
               <ExposureTimeline history={history} />
            ) : (
               <LiveSignalStrip history={history} />
            )}
          </div>

          {/* Right Rail (Signals & Analytics) */}
          <div className="w-full h-full border-l border-gray-800 bg-[#020406]/90 backdrop-blur-md flex flex-col z-10 pointer-events-auto overflow-y-auto min-h-0 relative shadow-[-10px_0_30px_rgba(0,0,0,0.8)]">
              <div className="p-4 flex flex-col gap-4">
                <LiveSignalsPanel history={history} />
                <AnalyticsRail 
                  newsItem={currentNewsItem} 
                  state={currentNeuroState} 
                  features={currentFeatures} 
                  simulation={{
                     total_spikes: currentSpikes, 
                     active_neurons: currentActiveNeurons
                  }}
                />
             </div>
          </div>
          
          <NeuronInspector neuron={selectedNeuron} onClose={() => setSelectedNeuron(null)} />
          
          {appState === 'EXPOSURE_MODE' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 text-[10px] animate-pulse tracking-widest font-bold z-20 pointer-events-none">
              CONTINUOUS EXPOSURE MODE
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
