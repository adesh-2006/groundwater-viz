"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./GroundwaterLayers.module.css";

const layers = [
    {
        id: "rainfall",
        tag: "01 — Atmosphere",
        title: "Rainfall",
        description:
            "Monsoon clouds gather over the dense jungle canopy. Rain cascades at rates of 50–200 mm/hr, each droplet beginning a journey that may take years to reach the water table below.",
        metric: "150mm",
        metricLabel: "avg monsoon rainfall",
        color: "#4db8db",
    },
    {
        id: "infiltration",
        tag: "02 — Vadose Zone",
        title: "Infiltration",
        description:
            "Water seeps through the forest floor, filtering through layers of topsoil, sand, and fractured rock. The vadose zone serves as nature's purification system — cleansing each drop as it descends.",
        metric: "12m",
        metricLabel: "avg infiltration depth",
        color: "#3dd68c",
    },
    {
        id: "aquifer",
        tag: "03 — Saturated Zone",
        title: "Aquifer Storage",
        description:
            "Water accumulates in porous rock formations deep beneath the surface. DWLR sensors monitor these hidden reserves continuously — capturing real-time changes in water level, pH, and TDS.",
        metric: "24/7",
        metricLabel: "DWLR monitoring",
        color: "#4db8db",
    },
];

function LayerSection({ layer, index }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: "-20% 0px -20% 0px" });

    return (
        <section
            ref={ref}
            className={styles.section}
            id={layer.id}
            style={{ minHeight: "80vh" }}
        >
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className={styles.tag}>{layer.tag}</div>
                <h2 className={styles.title}>
                    <span className="gradient-text">{layer.title}</span>
                </h2>
                <p className={styles.desc}>{layer.description}</p>

                {/* Metric */}
                <div className={styles.metricRow}>
                    <span className={styles.metricValue} style={{ color: layer.color }}>{layer.metric}</span>
                    <span className={styles.metricLabel}>{layer.metricLabel}</span>
                </div>

                {/* Progress bar */}
                <motion.div
                    className={styles.progressBar}
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                >
                    <div className={styles.progressFill} style={{ background: layer.color }} />
                </motion.div>
            </motion.div>
        </section>
    );
}

export default function GroundwaterLayers() {
    return (
        <div className={styles.container}>
            {layers.map((layer, i) => (
                <LayerSection key={layer.id} layer={layer} index={i} />
            ))}
        </div>
    );
}
