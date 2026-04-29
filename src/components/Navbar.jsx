"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { scrollY } = useScroll();
    const bgOpacity = useTransform(scrollY, [0, 100], [0, 0.85]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.nav
            className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}
            style={{ "--bg-opacity": bgOpacity }}
        >
            <Link href="/" className={styles.logo}>
                <div className={styles.logoIcon}>🌿</div>
                <span className={styles.logoText}>AquaViz</span>
            </Link>

            <div className={`${styles.links} ${mobileOpen ? styles.open : ""}`}>
                <a href="#rainfall" className={styles.link} onClick={() => setMobileOpen(false)}>
                    Rainfall
                </a>
                <a href="#infiltration" className={styles.link} onClick={() => setMobileOpen(false)}>
                    Infiltration
                </a>
                <a href="#aquifer" className={styles.link} onClick={() => setMobileOpen(false)}>
                    Aquifer
                </a>
                <a href="#dashboard" className={styles.link} onClick={() => setMobileOpen(false)}>
                    Dashboard
                </a>
                <a href="#live-monitor" className={styles.link} onClick={() => setMobileOpen(false)}>
                    Live Data 🔴
                </a>
                <a href="#wris-explorer" className={styles.link} onClick={() => setMobileOpen(false)}>
                    India WRIS
                </a>
                <Link href="/groundwater-map" className={styles.link} onClick={() => setMobileOpen(false)}>
                    GW Map 🗺️
                </Link>
                <Link href="/admin" className={styles.link} onClick={() => setMobileOpen(false)}>
                    Admin
                </Link>
                <Link href="/login" className={styles.cta} onClick={() => setMobileOpen(false)}>
                    Sign In →
                </Link>
            </div>

            <button
                className={styles.burger}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                <span className={`${styles.burgerLine} ${mobileOpen ? styles.open : ""}`} />
                <span className={`${styles.burgerLine} ${mobileOpen ? styles.open : ""}`} />
                <span className={`${styles.burgerLine} ${mobileOpen ? styles.open : ""}`} />
            </button>
        </motion.nav>
    );
}
