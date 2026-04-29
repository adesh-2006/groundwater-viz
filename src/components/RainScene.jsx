"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Cinematic Rain Streaks ─────────────────────────────── */
function CinematicRain({ count = 6000, scrollProgress = 0 }) {
    const ref = useRef();
    const speeds = useRef(new Float32Array(count));

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 100;
            pos[i * 3 + 1] = Math.random() * 60;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
            speeds.current[i] = 0.4 + Math.random() * 0.6;
        }
        return pos;
    }, [count]);

    useFrame(() => {
        if (!ref.current) return;
        const pos = ref.current.geometry.attributes.position.array;
        const intensity = 0.6 + Math.min(scrollProgress * 2, 1) * 0.4;

        for (let i = 0; i < count; i++) {
            pos[i * 3 + 1] -= speeds.current[i] * intensity;
            pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.08) * 0.002;
            if (pos[i * 3 + 1] < -5) {
                pos[i * 3 + 1] = 45 + Math.random() * 15;
                pos[i * 3] = (Math.random() - 0.5) * 100;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                color="#b8d4e8"
                size={0.05}
                transparent
                opacity={0.3}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation
            />
        </points>
    );
}

/* ── Floating Mist ──────────────────────────────────────── */
function MistParticles() {
    const ref = useRef();
    const count = 40;

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 60;
            pos[i * 3 + 1] = Math.random() * 10 + 2;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        return pos;
    }, []);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime();
        const pos = ref.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            pos[i * 3] += Math.sin(t * 0.06 + i * 0.3) * 0.01;
            pos[i * 3 + 1] += Math.cos(t * 0.04 + i * 0.2) * 0.003;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
        ref.current.material.opacity = 0.06 + Math.sin(t * 0.2) * 0.02;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                color="#88aa99"
                size={3.5}
                transparent
                opacity={0.06}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation
            />
        </points>
    );
}

/* ── Main Export — Rain + Mist only (no underground meshes) */
export default function RainScene({ scrollProgress = 0 }) {
    return (
        <div
            className="canvas-container"
            style={{
                opacity: scrollProgress > 0.7 ? 0.1 : 0.8,
                transition: "opacity 1s ease",
            }}
        >
            <Canvas
                camera={{ position: [0, 15, 25], fov: 50, near: 0.1, far: 200 }}
                gl={{ antialias: false, alpha: true }}
                dpr={[1, 1.5]}
                style={{ background: "transparent" }}
            >
                <CinematicRain count={6000} scrollProgress={scrollProgress} />
                <MistParticles />
            </Canvas>
        </div>
    );
}
