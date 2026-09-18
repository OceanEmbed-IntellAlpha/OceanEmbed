'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  TEXTURE_URLS,
  CAMERA,
  EARTH,
  ATMOSPHERE,
} from './GlobeConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroGlobeProps {
  className?: string;
}

// ─── Atmosphere Shaders ───────────────────────────────────────────────────────

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Outer radiating atmospheric glow shader (renders purely OUTWARD into space)
const atmosphereFragmentShader = `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    // -vNormal points towards the center of Earth.
    // Brightest right at the Earth's horizon edge, smoothly fading out into space.
    float intensity = pow(max(dot(-vNormal, viewDir), 0.0), uPower);
    gl_FragColor = vec4(uColor, intensity * uOpacity);
  }
`;

// Inner limb Fresnel horizon shader (renders razor-sharp cyan edge on the Earth disk)
const innerRimFragmentShader = `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    // Fresnel limb grazing angle
    float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
    float intensity = pow(rim, uPower) * uOpacity;
    gl_FragColor = vec4(uColor, intensity);
  }
`;

// ─── Earth Mesh ───────────────────────────────────────────────────────────────

function EarthMesh() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const [earthMap, bumpMap, specMap] = useLoader(THREE.TextureLoader, [
    TEXTURE_URLS.earth,
    TEXTURE_URLS.bump,
    TEXTURE_URLS.specular,
  ]);

  // Set color space for proper gamma
  useMemo(() => {
    earthMap.colorSpace = THREE.SRGBColorSpace;
  }, [earthMap]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH.radius, EARTH.segments, EARTH.segments]} />
      <meshPhongMaterial
        map={earthMap}
        bumpMap={bumpMap}
        bumpScale={EARTH.bumpScale}
        specularMap={specMap}
        specular={new THREE.Color(EARTH.specularColor)}
        shininess={EARTH.specularShininess}
      />
    </mesh>
  );
}

// ─── Atmosphere Glow (Inner Limb + Outer Halo) ───────────────────────────────

function AtmosphereGlow() {
  const outerUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(ATMOSPHERE.color) },
      uPower: { value: ATMOSPHERE.outerPower },
      uOpacity: { value: ATMOSPHERE.outerOpacity },
    }),
    [],
  );

  const coreUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(ATMOSPHERE.coreColor) },
      uPower: { value: ATMOSPHERE.corePower },
      uOpacity: { value: ATMOSPHERE.coreOpacity },
    }),
    [],
  );

  const innerRimUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(ATMOSPHERE.rimColor) },
      uPower: { value: ATMOSPHERE.rimPower },
      uOpacity: { value: ATMOSPHERE.rimOpacity },
    }),
    [],
  );

  return (
    <>
      {/* Layer 0: Inner Limb Fresnel Horizon Glow directly hugging Earth's surface */}
      <mesh>
        <sphereGeometry
          args={[
            EARTH.radius * 1.002,
            ATMOSPHERE.segments,
            ATMOSPHERE.segments,
          ]}
        />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={innerRimFragmentShader}
          uniforms={innerRimUniforms}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Layer 1: Core vibrant horizon rim glow radiating outward into space */}
      <mesh>
        <sphereGeometry
          args={[
            EARTH.radius + ATMOSPHERE.coreRadiusOffset,
            ATMOSPHERE.segments,
            ATMOSPHERE.segments,
          ]}
        />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={coreUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Layer 2: Broad electric cyan atmospheric aura radiating deep into space */}
      <mesh>
        <sphereGeometry
          args={[
            EARTH.radius + ATMOSPHERE.outerRadiusOffset,
            ATMOSPHERE.segments,
            ATMOSPHERE.segments,
          ]}
        />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={outerUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

// ─── Animated Earth Group (Continuous Libration Loop keeping India visible) ───

function AnimatedEarthGroup({ active = true }: { active?: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const lastFrameTime = useRef(0);

  useFrame((state) => {
    if (!active || !groupRef.current) return;

    // Throttle to ~30fps — for a slow decorative globe, imperceptible vs 60fps
    const now = state.clock.getElapsedTime();
    if (now - lastFrameTime.current < 0.033) return;
    lastFrameTime.current = now;

    const t = now;
    const swayY = Math.sin(t * 0.15) * 0.18;
    const swayX = Math.sin(t * 0.10) * 0.028;
    const swayZ = Math.cos(t * 0.12) * 0.014;

    groupRef.current.rotation.y = -2.92 + swayY;
    groupRef.current.rotation.x = -0.95 + swayX;
    groupRef.current.rotation.z = swayZ;
  });

  return (
    <group ref={groupRef} rotation={[-0.95, -2.92, 0]}>
      <EarthMesh />
      <AtmosphereGlow />
    </group>
  );
}

// ─── Lighting ─────────────────────────────────────────────────────────────────

function SceneLighting() {
  return (
    <>
      {/* Rich deep ocean ambient fill so dark areas have deep sapphire clarity */}
      <ambientLight intensity={0.25} color="#0d2847" />

      {/* Key Sunlight — sharp specular brilliance on Arabian Sea, India, Bay of Bengal */}
      <directionalLight
        position={[3.5, 4.2, 3.8]}
        intensity={2.6}
        color="#ffffff"
      />

      {/* Horizon Rim Backlight — vibrant electric cyan outlining the curvature */}
      <directionalLight
        position={[-4.5, 2.2, -1.8]}
        intensity={1.5}
        color="#00e5ff"
      />

      {/* Soft Equatorial Glint — sparkling ocean reflections */}
      <directionalLight
        position={[0.5, 3.0, 2.5]}
        intensity={0.85}
        color="#bae6fd"
      />
    </>
  );
}

// ─── Responsive DPR Hook ──────────────────────────────────────────────────────

function useResponsiveDpr(): [number, number] {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    // Cap at 1.5 on desktop (was 2) — cuts GPU fill work by ~44%
    // Mobile stays at exactly 1
    setDpr(isMobile ? [1, 1] : [1, 1.5]);
  }, []);

  return dpr;
}

// ─── Exported Component ───────────────────────────────────────────────────────

export default function HeroGlobe({
  className = '',
}: HeroGlobeProps) {
  const dpr = useResponsiveDpr();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const isModalOpen = false; // device viewer no longer exists

  // Strictly pause animation when scrolled out of view or modal is open
  const shouldAnimate = isVisible && !isModalOpen;

  useEffect(() => {
    if (!containerRef.current) return;

    // Observe the enclosing section (e.g. #hero-section or parent section) rather than the oversized child
    const targetSection =
      containerRef.current.closest('section') ||
      document.getElementById('hero-section') ||
      containerRef.current.parentElement;

    if (!targetSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '50px 0px 50px 0px',
        threshold: 0,
      }
    );
    observer.observe(targetSection);

    // Backup passive scroll listener to immediately stop rendering when scrolled past
    const checkVisibility = () => {
      const rect = targetSection.getBoundingClientRect();
      const inView = rect.bottom > -40 && rect.top < window.innerHeight + 40;
      setIsVisible(inView);
    };

    window.addEventListener('scroll', checkVisibility, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', checkVisibility);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none select-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        visibility: shouldAnimate ? 'visible' : 'hidden',
      }}
    >
      <Canvas
        frameloop={shouldAnimate ? 'always' : 'never'}
        dpr={dpr}
        gl={{
          antialias: false,          // was true — huge GPU win, imperceptible at this size
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'mediump',      // mediump vs highp saves ~20% GPU on fragment shaders
        }}
        camera={{
          fov: CAMERA.fov,
          near: CAMERA.near,
          far: CAMERA.far,
          position: CAMERA.position,
        }}
        style={{
          background: 'transparent',
          pointerEvents: 'none',
          display: shouldAnimate ? 'block' : 'none',
        }}
      >
        <SceneLighting />

        {/* Animated Earth group — paused when modal is open or scrolled away */}
        <AnimatedEarthGroup active={shouldAnimate} />
      </Canvas>
    </div>
  );
}
