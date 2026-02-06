"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    MeshTransmissionMaterial,
    Environment,
    Float,
    Center,
    Stars,
    Sparkles,
    Text3D,
    Instance,
    Instances
} from "@react-three/drei";
import * as THREE from "three";

/* 
 * THE NEURAL PRISM
 * A High-Fidelity 3D Composition.
 * 
 * Core: Icosahedron (The AI Brain) - Emissive Teal.
 * Shell: Rounded Box (The Interface) - Thick Refractive Glass.
 * Orbitals: Floating particles.
 */

const NeuralCore = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.y = t * 0.2;
        meshRef.current.rotation.z = t * 0.1;
        // Pulse effect
        const scale = 1 + Math.sin(t * 2) * 0.05;
        meshRef.current.scale.set(scale, scale, scale);
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[0.8, 1]} />
            <meshStandardMaterial
                color="#2dd4bf"
                emissive="#13b8a6"
                emissiveIntensity={2}
                toneMapped={false}
                wireframe
            />
        </mesh>
    );
};

const GlassShell = () => {
    const boxRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!boxRef.current) return;
        const t = state.clock.getElapsedTime();
        boxRef.current.rotation.x = Math.sin(t / 4) * 0.2;
        boxRef.current.rotation.y = Math.cos(t / 4) * 0.2;
    });

    return (
        <mesh ref={boxRef}>
            <torusKnotGeometry args={[1.2, 0.4, 128, 32]} />
            {/* The "Holy Grail" Material for Glass */}
            <MeshTransmissionMaterial
                backside
                samples={4} // Quality of refraction (higher = better but slower)
                thickness={2} // Thickness of glass
                chromaticAberration={0.5} // The "Rainbow" edge effect (Premium Look)
                anisotropy={1}
                distortion={0.5} // Warps background
                distortionScale={0.5}
                temporalDistortion={0.5}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
                roughness={0}
                clearcoat={1}
                metalness={0.1}
                color="#ffffff" // Base tint
                background={new THREE.Color("#ffffff")} // Helps refraction
                resolution={1024}
            />
        </mesh>
    );
};

const FloatingParticles = () => {
    return (
        <Sparkles
            count={100}
            scale={[12, 12, 12]}
            size={4}
            speed={0.4}
            opacity={0.5}
            color="#2dd4bf"
        />
    )
}

const SceneContent = () => {
    return (
        <>
            {/* 1. Lighting Environment (Studio Quality) */}
            <Environment preset="city" />

            <ambientLight intensity={0.5} color="#ffffff" />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} color="#2dd4bf" />

            {/* 2. Composition */}
            <Float
                speed={2} // Animation speed
                rotationIntensity={1} // XYZ rotation intensity
                floatIntensity={1} // Up/down float intensity
                floatingRange={[-0.5, 0.5]} // Range of y-axis values
            >
                <Center>
                    {/* Inner Brain */}
                    <NeuralCore />
                    {/* Outer Shield */}
                    <GlassShell />
                </Center>
            </Float>

            {/* 3. Atmosphere */}
            <FloatingParticles />
        </>
    );
};

const HeroScene = ({ className }: { className?: string }) => {
    return (
        <div className={`w-full h-full ${className || ""}`}>
            <Canvas
                dpr={[1, 2]} // Crisp rendering on high-DPI screens
                camera={{ position: [0, 0, 8], fov: 35 }}
                gl={{ antialias: true, alpha: true }}
            >
                <SceneContent />
            </Canvas>
        </div>
    );
};

export default HeroScene;
