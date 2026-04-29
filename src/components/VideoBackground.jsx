"use client";

import { useRef, useEffect } from "react";
import styles from "./VideoBackground.module.css";

export default function VideoBackground({ scrollProgress = 0 }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 0.8; // Slightly slow for cinematic feel
        }
    }, []);

    return (
        <div
            className={styles.container}
            style={{
                opacity: scrollProgress > 0.75 ? 0.15 : 1,
                transition: "opacity 1s ease",
            }}
        >
            <video
                ref={videoRef}
                className={styles.video}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/images/jungle-bg.png"
            >
                <source src="/images/jungle-fog.mp4" type="video/mp4" />
            </video>

            {/* Cinematic overlays */}
            <div className={styles.colorGrade} />
            <div className={styles.vignette} />
            <div className={styles.scanlines} />

            {/* Darkening gradient based on scroll */}
            <div
                className={styles.scrollDarken}
                style={{
                    opacity: Math.min(scrollProgress * 0.9, 0.6),
                }}
            />
        </div>
    );
}
