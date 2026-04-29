"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./Dashboard.module.css";

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.7,
            delay: i * 0.15,
            ease: [0.16, 1, 0.3, 1],
        },
    }),
};

function AnimatedCounter({ end, duration = 2000, suffix = "", prefix = "" }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (!isInView) return;
        let start = 0;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.round(start * 10) / 10);
            }
        }, 16);
        return () => clearInterval(timer);
    }, [isInView, end, duration]);

    return (
        <span ref={ref}>
            {prefix}
            {typeof end === "number" && end % 1 !== 0 ? count.toFixed(1) : Math.round(count)}
            {suffix}
        </span>
    );
}

export default function Dashboard() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: "-10% 0px" });
    const [data, setData] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/groundwater");
                const json = await res.json();
                setData(json);
            } catch {
                setData({
                    active_sensors: 12,
                    avg_water_level: 14.3,
                    avg_ph: 7.4,
                    total_sensors: 15,
                    rainfall_today: 23.5,
                    groundwater_recharge: 8.2,
                });
            }
        }
        fetchData();
    }, []);

    const cards = data
        ? [
            {
                icon: "SN",
                label: "Active Sensors",
                value: data.active_sensors,
                sub: `of ${data.total_sensors} total`,
                barWidth: `${Math.min((data.active_sensors / 20) * 100, 100)}%`,
                barColor: "#3dd68c",
            },
            {
                icon: "WL",
                label: "Avg Water Level",
                value: data.avg_water_level,
                suffix: " m",
                sub: "Below ground surface",
                barWidth: `${Math.min((data.avg_water_level / 30) * 100, 100)}%`,
                barColor: "#4db8db",
            },
            {
                icon: "pH",
                label: "Avg pH Level",
                value: data.avg_ph,
                sub:
                    data.avg_ph >= 6.5 && data.avg_ph <= 8.5
                        ? "Within safe range"
                        : "Outside safe range",
                barWidth: `${(data.avg_ph / 14) * 100}%`,
                barColor:
                    data.avg_ph >= 6.5 && data.avg_ph <= 8.5 ? "#3dd68c" : "#d94f4f",
            },
            {
                icon: "RF",
                label: "Rainfall Today",
                value: data.rainfall_today,
                suffix: " mm",
                sub: "Monsoon season",
                barWidth: `${Math.min((data.rainfall_today / 100) * 100, 100)}%`,
                barColor: "#4db8db",
            },
            {
                icon: "RC",
                label: "Recharge Rate",
                value: data.groundwater_recharge,
                suffix: "%",
                sub: "Annual efficiency",
                barWidth: `${data.groundwater_recharge}%`,
                barColor: "#3dd68c",
            },
            {
                icon: "TP",
                label: "Water Temp",
                value: 24.6,
                suffix: "°C",
                sub: "Avg aquifer temp",
                barWidth: "49%",
                barColor: "#e5a035",
            },
        ]
        : [];

    return (
        <section className={styles.section} id="dashboard" ref={ref}>
            <div className={styles.header}>
                <motion.div
                    className={styles.tag}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    <span className={styles.tagDot} />
                    Real-Time Data
                </motion.div>
                <motion.h2
                    className={styles.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.1 }}
                >
                    <span className="gradient-text">Live Dashboard</span>
                </motion.h2>
                <motion.p
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    Real-time groundwater metrics from DWLR sensors across the monitoring network
                </motion.p>
            </div>

            <div className={styles.grid}>
                {cards.map((card, i) => (
                    <motion.div
                        key={i}
                        className={styles.card}
                        variants={cardVariants}
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                        custom={i}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardIcon}>{card.icon}</div>
                            <div className={styles.cardLabel}>{card.label}</div>
                        </div>
                        <div className={styles.cardValue}>
                            <AnimatedCounter end={card.value} suffix={card.suffix || ""} />
                        </div>
                        <div className={styles.cardSub}>{card.sub}</div>
                        <div className={styles.bar}>
                            <motion.div
                                className={styles.barFill}
                                style={{ background: card.barColor }}
                                initial={{ width: 0 }}
                                animate={isInView ? { width: card.barWidth } : { width: 0 }}
                                transition={{ duration: 1.2, delay: i * 0.1 + 0.3 }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
