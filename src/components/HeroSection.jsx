"use client";

import { motion } from "framer-motion";
import styles from "./HeroSection.module.css";

export default function HeroSection() {
    return (
        <section className={styles.hero} id="hero">
            <div className={styles.content}>
                <motion.div
                    className={styles.badge}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <span className={styles.badgeDot} />
                    Live Monitoring Active
                </motion.div>

                <motion.h1
                    className={styles.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                >
                    Journey Into
                    <br />
                    <span className="gradient-text">Groundwater</span>
                </motion.h1>

                <motion.p
                    className={styles.description}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.7 }}
                >
                    Experience the water cycle from monsoon rainfall through dense
                    jungle canopy, down through soil layers to underground aquifers —
                    visualized with real-time DWLR sensor data.
                </motion.p>

                <motion.div
                    className={styles.actions}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.9 }}
                >
                    <a href="#rainfall" className={styles.primaryBtn}>
                        Explore Journey
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 6 }}>
                            <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </a>
                    <a href="/dashboard" className={styles.secondaryBtn}>
                        View Dashboard
                    </a>
                </motion.div>

                <motion.div
                    className={styles.stats}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.2 }}
                >
                    <div className={styles.stat}>
                        <span className={styles.statValue}>12</span>
                        <span className={styles.statLabel}>Active Sensors</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.stat}>
                        <span className={styles.statValue}>24/7</span>
                        <span className={styles.statLabel}>Monitoring</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.stat}>
                        <span className={styles.statValue}>9</span>
                        <span className={styles.statLabel}>States Covered</span>
                    </div>
                </motion.div>
            </div>

            <motion.div
                className={styles.scrollIndicator}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
            >
                <div className={styles.scrollLine} />
                <span>Scroll</span>
            </motion.div>
        </section>
    );
}
