"use client";

import { useState, useEffect, useRef } from "react";
import { useScroll } from "framer-motion";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import GroundwaterLayers from "@/components/GroundwaterLayers";
import Dashboard from "@/components/Dashboard";
import ScrollProgress from "@/components/ScrollProgress";
import CTASection from "@/components/CTASection";

const LiveMonitor = dynamic(() => import("@/components/LiveMonitor"), {
  ssr: false,
  loading: () => (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading real-time groundwater data...</div>
    </section>
  ),
});

const WRISExplorer = dynamic(() => import("@/components/WRISExplorer"), {
  ssr: false,
  loading: () => (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading India WRIS data...</div>
    </section>
  ),
});

// Dynamic imports for heavy components (no SSR)
const VideoBackground = dynamic(() => import("@/components/VideoBackground"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#040a07", zIndex: 0 }} />,
});

const RainScene = dynamic(() => import("@/components/RainScene"), {
  ssr: false,
  loading: () => null,
});

const SensorMap = dynamic(() => import("@/components/SensorMap"), {
  ssr: false,
  loading: () => (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading map...</div>
    </section>
  ),
});

export default function HomePage() {
  const scrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      setScrollProgress(v);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <main ref={scrollRef}>
      {/* Layer 0: Cinematic Video Background */}
      <VideoBackground scrollProgress={scrollProgress} />

      {/* Layer 1: Three.js Rain Particles (overlay on video) */}
      <RainScene scrollProgress={scrollProgress} />

      {/* Navigation */}
      <Navbar />

      {/* Scroll Progress Dots */}
      <ScrollProgress scrollProgress={scrollProgress} />

      {/* Scroll Sections */}
      <div style={{ position: "relative", zIndex: 10 }}>
        {/* Hero */}
        <HeroSection />

        {/* Groundwater Story Sections */}
        <GroundwaterLayers />

        {/* Dashboard */}
        <Dashboard />

        {/* Real-Time Groundwater Quality & Level Monitor */}
        <LiveMonitor />

        {/* India WRIS Government Data Explorer */}
        <WRISExplorer />

        {/* Map */}
        <SensorMap />

        {/* CTA + Footer */}
        <CTASection />
      </div>
    </main>
  );
}
