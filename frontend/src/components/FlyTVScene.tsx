import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import WorldFeed from './WorldFeed';

interface FlyTVSceneProps {
  newsItem: any;
  isWatching: boolean;
  features: any;
  onLookInside: () => void;
}

const Fly3DModel = ({ features }: { features: any }) => {
  const flyGroup = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const leftAntennaRef = useRef<THREE.Mesh>(null);
  const rightAntennaRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!flyGroup.current || !headRef.current || !leftWingRef.current || !rightWingRef.current || !leftAntennaRef.current || !rightAntennaRef.current) return;

    const time = state.clock.getElapsedTime();
    const salience = features?.semantic_salience || 0.0;
    const novelty = features?.novelty || 0.0;

    // Idle breathing (abdomen/thorax subtle scale)
    const breath = Math.sin(time * 2) * 0.02;
    flyGroup.current.scale.set(1 + breath, 1 + breath, 1 + breath);

    // Antennae twitching
    const twitchSpeed = Math.max(2, 10 * salience);
    leftAntennaRef.current.rotation.x = Math.sin(time * twitchSpeed) * 0.2;
    rightAntennaRef.current.rotation.x = Math.sin(time * twitchSpeed + 1) * 0.2;

    // Head orientation based on novelty
    if (novelty > 0.5) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, Math.sin(time * 5) * 0.3, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.2, 0.1);
    } else {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, 0.05);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, Math.sin(time * 0.5) * 0.1, 0.05);
    }

    // Wings response to salience
    if (salience > 0.7) {
      // Alert posture / vibrating wings
      leftWingRef.current.rotation.y = -0.5 + Math.sin(time * 40) * 0.1;
      rightWingRef.current.rotation.y = 0.5 + Math.sin(time * 40 + Math.PI) * 0.1;
      leftWingRef.current.rotation.x = 0.3;
      rightWingRef.current.rotation.x = 0.3;
    } else {
      // Resting wings
      leftWingRef.current.rotation.y = THREE.MathUtils.lerp(leftWingRef.current.rotation.y, -0.1, 0.1);
      rightWingRef.current.rotation.y = THREE.MathUtils.lerp(rightWingRef.current.rotation.y, 0.1, 0.1);
      leftWingRef.current.rotation.x = THREE.MathUtils.lerp(leftWingRef.current.rotation.x, 0.1, 0.1);
      rightWingRef.current.rotation.x = THREE.MathUtils.lerp(rightWingRef.current.rotation.x, 0.1, 0.1);
    }
  });

  return (
    <group ref={flyGroup} position={[0, -1, 4]} rotation={[0.1, Math.PI, 0]} scale={0.5}>
      {/* Abdomen */}
      <mesh position={[0, -0.2, -1.2]} rotation={[-0.2, 0, 0]}>
        <capsuleGeometry args={[0.4, 0.8, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>

      {/* Thorax */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>

      {/* Head Group */}
      <group ref={headRef} position={[0, 0.3, 0.6]}>
        <mesh>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#222222" roughness={0.6} />
        </mesh>
        
        {/* Compound Eyes */}
        <mesh position={[0.25, 0.1, 0.15]} rotation={[0, 0.3, -0.2]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#880000" roughness={0.3} metalness={0.2} emissive="#330000" />
        </mesh>
        <mesh position={[-0.25, 0.1, 0.15]} rotation={[0, -0.3, 0.2]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#880000" roughness={0.3} metalness={0.2} emissive="#330000" />
        </mesh>

        {/* Antennae */}
        <mesh ref={leftAntennaRef} position={[0.1, 0.2, 0.3]} rotation={[0.5, 0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.01, 0.4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh ref={rightAntennaRef} position={[-0.1, 0.2, 0.3]} rotation={[0.5, -0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.01, 0.4]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      </group>

      {/* Wings */}
      <mesh ref={leftWingRef} position={[0.2, 0.6, -0.2]} rotation={[0.1, -0.1, 0.2]}>
        <planeGeometry args={[0.6, 2.0]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.5} transparent roughness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={rightWingRef} position={[-0.2, 0.6, -0.2]} rotation={[0.1, 0.1, -0.2]}>
        <planeGeometry args={[0.6, 2.0]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.5} transparent roughness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Legs (Simplified) */}
      {[
        [0.4, -0.3, 0.3], [-0.4, -0.3, 0.3],
        [0.5, -0.4, 0], [-0.5, -0.4, 0],
        [0.4, -0.3, -0.5], [-0.4, -0.3, -0.5]
      ].map((pos, i) => (
        <mesh key={i} position={pos as any} rotation={[0, 0, pos[0] > 0 ? -0.5 : 0.5]}>
          <cylinderGeometry args={[0.03, 0.02, 0.8]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
};

const FlyTVScene: React.FC<FlyTVSceneProps> = ({ newsItem, isWatching, features, onLookInside }) => {
  return (
    <div className="flex flex-col items-center w-[320px] h-[360px] relative pointer-events-auto">
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={40} />
          <ambientLight intensity={0.2} />
          {/* TV Screen Illumination */}
          <pointLight position={[0, 0, 2]} intensity={2.0} color="#44aaff" distance={10} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
          
          <Environment preset="night" />

          {/* 3D TV Screen */}
          <group position={[0, 1.5, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4.2, 3.2, 0.2]} />
              <meshStandardMaterial color="#111" roughness={0.8} />
            </mesh>
            
            {/* Screen Html Overlay */}
            <Html center position={[0, 0, 0.15]} zIndexRange={[100, 0]}>
              <div className="w-[300px] h-[225px] bg-black border-4 border-gray-900 rounded overflow-hidden pointer-events-auto shadow-[0_0_20px_#44aaff_inset] scale-100">
                <WorldFeed newsItem={newsItem} isWatching={isWatching} />
              </div>
            </Html>
          </group>

          {/* The Fly */}
          <Fly3DModel features={features} />

        </Canvas>
      </div>

      <div className="absolute bottom-0 z-10">
        <button 
          onClick={onLookInside}
          className="px-6 py-2 text-[10px] text-cyan-400 border border-cyan-800 bg-cyan-900/40 hover:bg-cyan-900/80 hover:border-cyan-400 transition-colors tracking-widest font-bold flex items-center gap-2 group backdrop-blur-md"
        >
          LOOK INSIDE 
          <span className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">→</span>
        </button>
      </div>
    </div>
  );
};

export default FlyTVScene;
