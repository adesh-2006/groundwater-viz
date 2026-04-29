"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import styles from "./CTASection.module.css";

export default function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-20% 0px" });

    return (
        <section className={styles.section} ref={ref}>
            <motion.div
                className={styles.content}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7 }}
            >
                <h2 className={styles.title}>
                    Ready to <span className="gradient-text">Monitor</span>?
                </h2>
                <p className={styles.desc}>
                    Access real-time groundwater data from DWLR sensors deployed across
                    India. Join the monitoring network and protect our water resources.
                </p>
                <div className={styles.actions}>
                    <Link href="/dashboard" className={styles.primaryBtn}>
                        Launch Dashboard
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 6 }}>
                            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <a href="#hero" className={styles.secondaryBtn}>
                        Back to Top
                    </a>
                </div>
            </motion.div>

            <div className={styles.footer}>
                <p>© 2025 AquaViz — Groundwater Visualization Platform</p>
            </div>
        </section>
    );
}
