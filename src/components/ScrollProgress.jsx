"use client";

import { useState, useEffect } from "react";
import styles from "./ScrollProgress.module.css";

const sections = [
    { label: "Sky", id: "hero" },
    { label: "Rain", id: "rainfall" },
    { label: "Soil", id: "infiltration" },
    { label: "Aquifer", id: "aquifer" },
    { label: "Data", id: "dashboard" },
    { label: "Map", id: "map-section" },
];

export default function ScrollProgress({ scrollProgress = 0 }) {
    const activeIndex = Math.min(
        Math.floor(scrollProgress * sections.length),
        sections.length - 1
    );

    const handleClick = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className={styles.container}>
            {sections.map((section, i) => (
                <div key={section.id}>
                    <div
                        className={`${styles.dot} ${i <= activeIndex ? styles.active : ""}`}
                        onClick={() => handleClick(section.id)}
                        title={section.label}
                    >
                        <span className={styles.label}>{section.label}</span>
                    </div>
                    {i < sections.length - 1 && <div className={styles.line} />}
                </div>
            ))}
        </div>
    );
}
