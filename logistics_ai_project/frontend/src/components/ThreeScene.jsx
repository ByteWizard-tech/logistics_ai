import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

/* ── Particle system for ambient atmosphere ── */
function Particles({ count = 80 }) {
  const meshRef = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = Math.random() * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    const pos = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.001;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#818cf8" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/* ── Procedural delivery van ── */
function DeliveryVan() {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.03;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.05, 1.45]} />
        <meshPhysicalMaterial color="#6366f1" metalness={0.35} roughness={0.5} clearcoat={0.4} clearcoatRoughness={0.2} />
      </mesh>
      <mesh position={[1.05, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.75, 1.35]} />
        <meshPhysicalMaterial color="#818cf8" metalness={0.4} roughness={0.4} clearcoat={0.3} />
      </mesh>
      <mesh position={[1.59, 1.15, 0]}>
        <boxGeometry args={[0.04, 0.55, 1.05]} />
        <meshPhysicalMaterial color="#c7d2fe" metalness={0.9} roughness={0.05} transparent opacity={0.45} transmission={0.6} />
      </mesh>
      {[0.69, -0.69].map((z, i) => (
        <mesh key={`win-${i}`} position={[1.05, 1.2, z]}>
          <boxGeometry args={[0.8, 0.45, 0.04]} />
          <meshPhysicalMaterial color="#a5b4fc" transparent opacity={0.35} transmission={0.5} metalness={0.8} roughness={0.05} />
        </mesh>
      ))}
      <mesh position={[-0.3, 1.08, 0]}>
        <boxGeometry args={[1.6, 0.04, 1.2]} />
        <meshStandardMaterial color="#4338ca" metalness={0.5} roughness={0.6} />
      </mesh>
      {[[-0.75, 0.04, 0.78], [-0.75, 0.04, -0.78], [0.75, 0.04, 0.78], [0.75, 0.04, -0.78]].map((pos, i) => (
        <group key={i} position={pos}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.08, 12, 24]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {[0.42, -0.42].map((z, i) => (
        <group key={`hl-${i}`} position={[1.62, 0.55, z]}>
          <mesh>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={3} />
          </mesh>
          <pointLight color="#fbbf24" intensity={0.3} distance={2} decay={2} />
        </group>
      ))}
      {[0.42, -0.42].map((z, i) => (
        <mesh key={`tl-${i}`} position={[-1.32, 0.55, z]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#fca5a5" emissive="#ef4444" emissiveIntensity={2} />
        </mesh>
      ))}
      <mesh position={[-0.3, 1.03, 0.735]}>
        <planeGeometry args={[1.3, 0.28]} />
        <meshPhysicalMaterial color="#4f46e5" metalness={0.6} roughness={0.3} clearcoat={0.8} />
      </mesh>
    </group>
  );
}

/* ── Loading fallback ── */
function LoadingFallback() {
  return (
    <Html center>
      <div style={{ color: '#8b949e', fontFamily: 'Inter, sans-serif', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Loading 3D scene…
      </div>
    </Html>
  );
}

/* ── Main ThreeScene component ── */
export default function ThreeScene() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  // Responsive scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="three-wrapper" id="three-scene" ref={containerRef}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [5, 3.5, 5], fov: 35 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => (e.target.style.cursor = 'grabbing')}
        onPointerUp={(e) => (e.target.style.cursor = 'grab')}
      >
        <color attach="background" args={['#060912']} />
        <fog attach="fog" args={['#060912', 12, 28]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[6, 10, 5]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={50} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0001} />
        <directionalLight position={[-4, 6, -3]} intensity={0.5} color="#c084fc" />
        <pointLight position={[-5, 3, 5]} intensity={0.7} color="#818cf8" decay={2} distance={15} />
        <pointLight position={[0, -1, 0]} intensity={0.2} color="#6366f1" decay={2} distance={6} />
        <spotLight position={[3, 8, -2]} angle={0.3} penumbra={0.8} intensity={0.4} color="#a855f7" castShadow={false} />

        <Suspense fallback={<LoadingFallback />}>
          <DeliveryVan />
          <Particles />
        </Suspense>

        <OrbitControls enablePan={false} enableZoom enableRotate autoRotate autoRotateSpeed={0.8} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={12} dampingFactor={0.05} enableDamping />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <circleGeometry args={[14, 64]} />
          <meshStandardMaterial color="#0d1117" metalness={0.1} roughness={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <ringGeometry args={[2.5, 3.2, 64]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.05} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]}>
          <ringGeometry args={[4.5, 5, 64]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.025} />
        </mesh>
      </Canvas>
    </div>
  );
}
