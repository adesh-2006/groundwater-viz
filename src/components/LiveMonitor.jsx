"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import styles from "./LiveMonitor.module.css";

/* ── Category colors ────────────────────────────────────── */
const CAT_COLORS = {
    Safe: "#51cf66",
    "Semi Critical": "#ffd43b",
    Critical: "#ff922b",
    "Over Exploited": "#ff6b6b",
    Saline: "#4db8db",
    "Hilly Area": "#b197fc",
    Lake: "#74c0fc",
};

/* ── Animated counter ───────────────────────────────────── */
function Counter({ end, duration = 1800, decimals = 0, suffix = "" }) {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });

    useEffect(() => {
        if (!inView || !end) return;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) { setVal(end); clearInterval(timer); }
            else setVal(start);
        }, 16);
        return () => clearInterval(timer);
    }, [inView, end, duration]);

    return (
        <span ref={ref}>
            {decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-IN")}
            {suffix}
        </span>
    );
}

/* ── Status color helper ────────────────────────────────── */
function devColor(pct) {
    if (pct > 100) return "#ff6b6b";
    if (pct > 90) return "#ff922b";
    if (pct > 70) return "#ffd43b";
    return "#51cf66";
}

/* ── Main LiveMonitor Component ─────────────────────────── */
export default function LiveMonitor() {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: false, margin: "-8% 0px" });

    const [data, setData] = useState(null);
    const [waterLevels, setWaterLevels] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // Fetch overview + water levels in parallel
            const [overviewRes, levelRes] = await Promise.all([
                fetch("/api/wris/realtime?action=overview"),
                fetch("/api/wris/realtime?action=water-level"),
            ]);

            const overview = await overviewRes.json();
            const levels = await levelRes.json();

            if (overview.error) throw new Error(overview.error);
            setData(overview);
            setWaterLevels(levels);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error("LiveMonitor fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.97 },
        visible: {
            opacity: 1, y: 0, scale: 1,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
    };

    return (
        <section className={styles.section} id="live-monitor" ref={sectionRef}>
            {/* Ambient background */}
            <div className={styles.ambientBg}>
                <div className={styles.ambientOrb} />
                <div className={styles.ambientOrb} />
                <div className={styles.ambientOrb} />
            </div>

            {/* Header */}
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7 }}
            >
                <div className={styles.tag}>
                    <span className={styles.liveIndicator} />
                    Live Groundwater Intel
                </div>
                <h2 className={styles.title}>
                    <span className="gradient-text">Real-Time Water Monitor</span>
                </h2>
                <p className={styles.subtitle}>
                    Live groundwater quality, water levels, and resource data sourced directly from India WRIS & CGWB official government databases
                </p>
                <div className={styles.sourceTag}>
                    🏛️ Source: Central Ground Water Board (CGWB) &bull; India WRIS &bull; GWR-2024
                </div>
            </motion.div>

            {/* Loading State */}
            {loading && (
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <span className={styles.loadingText}>
                        Fetching live data from India WRIS government servers…
                    </span>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className={styles.error}>
                    <p>⚠️ Failed to fetch live data: {error}</p>
                    <button className={styles.refreshBtn} onClick={() => fetchData()} style={{ marginTop: 12 }}>
                        Retry
                    </button>
                </div>
            )}

            {/* DATA LOADED */}
            {data && !loading && (
                <motion.div
                    className={styles.content}
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                >
                    {/* ── National Headline Stats ── */}
                    <motion.div className={styles.headlineRow} variants={itemVariants}>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>💧</div>
                            <div className={styles.headlineValue} style={{ color: "var(--water)" }}>
                                <Counter end={data.national?.totalAvailability || 0} decimals={1} />
                            </div>
                            <div className={styles.headlineLabel}>Net Availability</div>
                            <div className={styles.headlineUnit}>BCM/year</div>
                        </div>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>🔄</div>
                            <div className={styles.headlineValue} style={{ color: "var(--accent)" }}>
                                <Counter end={data.national?.totalRecharge || 0} decimals={1} />
                            </div>
                            <div className={styles.headlineLabel}>Annual Recharge</div>
                            <div className={styles.headlineUnit}>BCM/year</div>
                        </div>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>🏭</div>
                            <div className={styles.headlineValue} style={{ color: "#ff922b" }}>
                                <Counter end={data.national?.totalDraft || 0} decimals={1} />
                            </div>
                            <div className={styles.headlineLabel}>Total Extraction</div>
                            <div className={styles.headlineUnit}>BCM/year</div>
                        </div>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>📊</div>
                            <div className={styles.headlineValue} style={{ color: devColor(data.national?.avgDevelopmentPct || 0) }}>
                                <Counter end={data.national?.avgDevelopmentPct || 0} decimals={1} suffix="%" />
                            </div>
                            <div className={styles.headlineLabel}>Avg Development</div>
                            <div className={styles.headlineUnit}>{data.national?.statesAssessed || 0} states assessed</div>
                        </div>
                    </motion.div>

                    {/* ── Station Monitoring Counts ── */}
                    <motion.div className={styles.stationBar} variants={itemVariants}>
                        <div className={styles.stationItem}>
                            <div className={styles.stationValue} style={{ color: "var(--accent)" }}>
                                <Counter end={data.stations?.total || 0} />
                            </div>
                            <div className={styles.stationLabel}>Total Monitoring Stations</div>
                        </div>
                        <div className={styles.stationItem}>
                            <div className={styles.stationValue} style={{ color: "var(--water)" }}>
                                <Counter end={data.stations?.dwlr || 0} />
                            </div>
                            <div className={styles.stationLabel}>DWLR (Telemetric)</div>
                        </div>
                        <div className={styles.stationItem}>
                            <div className={styles.stationValue} style={{ color: "#b197fc" }}>
                                <Counter end={data.stations?.manual || 0} />
                            </div>
                            <div className={styles.stationLabel}>Manual / Key Stations</div>
                        </div>
                    </motion.div>

                    {/* ── Two Column: Categories + Top States ── */}
                    <motion.div className={styles.twoCol} variants={itemVariants}>
                        {/* Block Categories Panel */}
                        <div className={styles.panel}>
                            <div className={styles.panelTitle}>
                                <span className={styles.panelIcon}>🗂️</span>
                                Block-Level Groundwater Status
                            </div>
                            <div className={styles.categoryGrid}>
                                {Object.entries(data.blockCategories || {})
                                    .filter(([k]) => k !== "Unknown")
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([cat, count]) => {
                                        const total = Object.values(data.blockCategories).reduce((s, v) => s + v, 0);
                                        const pct = total > 0 ? (count / total) * 100 : 0;
                                        return (
                                            <div key={cat} className={styles.categoryItem}>
                                                <div className={styles.catDot} style={{ background: CAT_COLORS[cat] || "#888" }} />
                                                <div className={styles.catInfo}>
                                                    <div className={styles.catLabel}>{cat}</div>
                                                    <div className={styles.catCount} style={{ color: CAT_COLORS[cat] || "#fff" }}>
                                                        <Counter end={count} />
                                                    </div>
                                                    <div className={styles.catBar}>
                                                        <div
                                                            className={styles.catBarFill}
                                                            style={{
                                                                width: `${pct}%`,
                                                                background: CAT_COLORS[cat] || "#888",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Top Over-Exploited States */}
                        <div className={styles.panel}>
                            <div className={styles.panelTitle}>
                                <span className={styles.panelIcon}>🏴</span>
                                Highest Groundwater Extraction
                            </div>
                            <div className={styles.stateTable}>
                                {(data.topOverexploited || []).map((st, i) => (
                                    <div key={st.stateCode} className={styles.stateRow}>
                                        <div className={styles.stateRank}>{i + 1}</div>
                                        <div className={styles.stateName}>{st.state}</div>
                                        <div className={styles.stateDraft}>{st.totalDraft} BCM</div>
                                        <div className={styles.stateDevBar}>
                                            <div className={styles.devBarBg}>
                                                <div
                                                    className={styles.devBarFill}
                                                    style={{
                                                        width: `${Math.min(st.developmentPct, 100)}%`,
                                                        background: devColor(st.developmentPct),
                                                    }}
                                                />
                                            </div>
                                            <span className={styles.devPct} style={{ color: devColor(st.developmentPct) }}>
                                                {st.developmentPct}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Live Water Level Cards ── */}
                    {waterLevels && waterLevels.locations && waterLevels.locations.length > 0 && (
                        <motion.div className={styles.fullPanel} variants={itemVariants}>
                            <div className={styles.panelTitle}>
                                <span className={styles.panelIcon}>📏</span>
                                Live Water Level Readings
                                <span style={{ marginLeft: "auto", fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                                    Last 90 days from India WRIS
                                </span>
                            </div>
                            <div className={styles.waterLevelGrid}>
                                {waterLevels.locations.map((loc, i) => (
                                    <motion.div
                                        key={`${loc.state}-${loc.district}`}
                                        className={styles.levelCard}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ delay: i * 0.08 + 0.3 }}
                                    >
                                        <div className={styles.levelLocation}>{loc.state}</div>
                                        <div className={styles.levelDistrict}>{loc.district} • {loc.recordCount} readings</div>
                                        {loc.summary && loc.summary.avg !== undefined ? (
                                            <>
                                                <div className={styles.levelValueRow}>
                                                    <span className={styles.levelValue} style={{ color: "var(--water)" }}>
                                                        {loc.summary.avg}
                                                    </span>
                                                    <span className={styles.levelUnit}>m bgl (avg)</span>
                                                </div>
                                                <div className={styles.levelMeta}>
                                                    <span>Min: {loc.summary.min}m</span>
                                                    <span>•</span>
                                                    <span>Max: {loc.summary.max}m</span>
                                                    {loc.summary.trend && (
                                                        <>
                                                            <span>•</span>
                                                            <span className={
                                                                loc.summary.trend === "rising" ? styles.trendUp :
                                                                    loc.summary.trend === "falling" ? styles.trendDown :
                                                                        styles.trendStable
                                                            }>
                                                                <span className={styles.trendIcon}>
                                                                    {loc.summary.trend === "rising" ? "↑" : loc.summary.trend === "falling" ? "↓" : "→"}
                                                                </span>
                                                                {" "}{loc.summary.trend}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className={styles.levelMeta}>
                                                {loc.recordCount} records • processing
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Draft Breakdown Row ── */}
                    <motion.div className={styles.headlineRow} variants={itemVariants}>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>🌾</div>
                            <div className={styles.headlineValue} style={{ color: "#fcc419" }}>
                                <Counter end={data.national?.irrigationDraft || 0} decimals={1} />
                            </div>
                            <div className={styles.headlineLabel}>Irrigation Draft</div>
                            <div className={styles.headlineUnit}>BCM/year</div>
                        </div>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>🏠</div>
                            <div className={styles.headlineValue} style={{ color: "#74c0fc" }}>
                                <Counter end={data.national?.domesticDraft || 0} decimals={1} />
                            </div>
                            <div className={styles.headlineLabel}>Domestic & Industrial</div>
                            <div className={styles.headlineUnit}>BCM/year</div>
                        </div>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>⚖️</div>
                            <div className={styles.headlineValue} style={{ color: data.national?.totalDraft > data.national?.totalAvailability ? "#ff6b6b" : "#51cf66" }}>
                                <Counter
                                    end={Math.abs((data.national?.totalAvailability || 0) - (data.national?.totalDraft || 0))}
                                    decimals={1}
                                />
                            </div>
                            <div className={styles.headlineLabel}>
                                {(data.national?.totalDraft || 0) > (data.national?.totalAvailability || 0) ? "Deficit" : "Surplus"}
                            </div>
                            <div className={styles.headlineUnit}>BCM/year</div>
                        </div>
                        <div className={styles.headlineStat}>
                            <div className={styles.headlineIcon}>📅</div>
                            <div className={styles.headlineValue} style={{ color: "#b197fc" }}>
                                2024
                            </div>
                            <div className={styles.headlineLabel}>Assessment Year</div>
                            <div className={styles.headlineUnit}>CGWB Official</div>
                        </div>
                    </motion.div>

                    {/* ── Refresh Bar ── */}
                    <motion.div className={styles.refreshBar} variants={itemVariants}>
                        <span>
                            {lastUpdated
                                ? `Updated ${lastUpdated.toLocaleTimeString("en-IN")} IST`
                                : "Fetching..."}
                        </span>
                        <span>•</span>
                        <span>Auto-refreshes every 5 minutes</span>
                        <button
                            className={styles.refreshBtn}
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                        >
                            {refreshing ? "Refreshing…" : "↻ Refresh Now"}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </section>
    );
}
