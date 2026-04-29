"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import styles from "./WRISExplorer.module.css";

/* ─── dataset config ─────────────────────────────────────────────── */
const DATASETS = [
    { key: "groundwater-level", label: "Ground Water Level", icon: "💧", agency: "CGWB" },
    { key: "rainfall", label: "Rainfall", icon: "🌧️", agency: "CWC" },
    { key: "river-water-level", label: "River Water Level", icon: "🌊", agency: "CWC" },
    { key: "river-discharge", label: "River Discharge", icon: "🏞️", agency: "CWC" },
    { key: "temperature", label: "Temperature", icon: "🌡️", agency: "CWC" },
    { key: "humidity", label: "Humidity", icon: "💨", agency: "CWC" },
];

/* ─── predefined state-district-agency combos that have data ─────── */
const PRESETS = [
    { state: "Odisha", district: "Baleshwar", agency: "CGWB", label: "Odisha — Baleshwar" },
    { state: "Andhra Pradesh", district: "Kadapa", agency: "CWC", label: "Andhra Pradesh — Kadapa" },
    { state: "Karnataka", district: "Bagalkot", agency: "CWC", label: "Karnataka — Bagalkot" },
    { state: "Maharashtra", district: "Pune", agency: "CWC", label: "Maharashtra — Pune" },
    { state: "Tamil Nadu", district: "Chennai", agency: "CWC", label: "Tamil Nadu — Chennai" },
    { state: "Rajasthan", district: "Jaipur", agency: "CGWB", label: "Rajasthan — Jaipur" },
    { state: "Uttar Pradesh", district: "Lucknow", agency: "CGWB", label: "Uttar Pradesh — Lucknow" },
    { state: "Gujarat", district: "Ahmedabad", agency: "CGWB", label: "Gujarat — Ahmedabad" },
    { state: "Delhi", district: "New Delhi", agency: "CGWB", label: "Delhi — New Delhi" },
    { state: "West Bengal", district: "Kolkata", agency: "CGWB", label: "West Bengal — Kolkata" },
    { state: "Telangana", district: "Nirmal", agency: "Telangana SW", label: "Telangana — Nirmal" },
    { state: "Jharkhand", district: "Godda", agency: "Jharkhand", label: "Jharkhand — Godda" },
];

function getDefaultDates() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return {
        startdate: start.toISOString().split("T")[0],
        enddate: end.toISOString().split("T")[0],
    };
}

/* ────────────────────────────────────────────────────────────────── */
export default function WRISExplorer() {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: false, margin: "-10% 0px" });

    // filters
    const [activeDataset, setActiveDataset] = useState("groundwater-level");
    const [preset, setPreset] = useState(0);
    const [dates, setDates] = useState(getDefaultDates);
    const [page, setPage] = useState(0);
    const [viewMode, setViewMode] = useState("cards"); // cards | table

    // data
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const p = PRESETS[preset];
        const ds = DATASETS.find((d) => d.key === activeDataset);
        const agency = activeDataset === "groundwater-level" ? "CGWB" : (p.agency || ds.agency);

        const params = new URLSearchParams({
            endpoint: activeDataset,
            state: p.state,
            district: p.district,
            agency,
            startdate: dates.startdate,
            enddate: dates.enddate,
            page: String(page),
            size: "100",
        });

        try {
            const res = await fetch(`/api/wris?${params}`);
            const json = await res.json();
            if (json.error) {
                setError(json.error);
                setData(null);
            } else {
                setData(json);
            }
        } catch (err) {
            setError(err.message || "Failed to connect to India WRIS");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [activeDataset, preset, dates, page]);

    // Auto-fetch on mount and when filters change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Extract records from WRIS response
    const records = data?.data
        ? Array.isArray(data.data)
            ? data.data
            : data.data.content
                ? data.data.content
                : []
        : [];

    const totalRecords = data?.data?.totalElements || records.length;
    const totalPages = data?.data?.totalPages || Math.ceil(totalRecords / 100) || 1;

    // Detect data columns dynamically
    const columns = records.length > 0 ? Object.keys(records[0]).filter(
        (k) => !["id", "createdAt", "updatedAt", "deletedAt"].includes(k)
    ) : [];

    // Calculate summary stats
    const summaryStats = computeSummary(records, activeDataset);

    return (
        <section className={styles.section} id="wris-explorer" ref={sectionRef}>
            {/* ── Header ──────────────────────────────────────────── */}
            <div className={styles.header}>
                <motion.div
                    className={styles.badge}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    <span className={styles.badgeDot} />
                    Official Government Data
                </motion.div>

                <motion.h2
                    className={styles.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.1 }}
                >
                    <span className="gradient-text">India WRIS Explorer</span>
                </motion.h2>

                <motion.p
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    Real-time hydrological data from India Water Resources Information
                    System — powered by the Ministry of Jal Shakti, Government of India
                </motion.p>

                <motion.div
                    className={styles.govBadge}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <svg className={styles.govIcon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                    Verified Government Source — indiawris.gov.in
                </motion.div>
            </div>

            {/* ── Dataset Tabs ────────────────────────────────────── */}
            <motion.div
                className={styles.tabs}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.25 }}
            >
                {DATASETS.map((ds) => (
                    <button
                        key={ds.key}
                        className={activeDataset === ds.key ? styles.tabActive : styles.tab}
                        onClick={() => { setActiveDataset(ds.key); setPage(0); }}
                    >
                        {ds.icon} {ds.label}
                    </button>
                ))}
            </motion.div>

            {/* ── Controls ────────────────────────────────────────── */}
            <motion.div
                className={styles.controls}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Region</label>
                    <select
                        className={styles.select}
                        value={preset}
                        onChange={(e) => { setPreset(Number(e.target.value)); setPage(0); }}
                    >
                        {PRESETS.map((p, i) => (
                            <option key={i} value={i}>{p.label}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>Start Date</label>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={dates.startdate}
                        onChange={(e) => setDates((d) => ({ ...d, startdate: e.target.value }))}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>End Date</label>
                    <input
                        type="date"
                        className={styles.dateInput}
                        value={dates.enddate}
                        onChange={(e) => setDates((d) => ({ ...d, enddate: e.target.value }))}
                    />
                </div>

                <button
                    className={styles.fetchBtn}
                    onClick={fetchData}
                    disabled={loading}
                >
                    {loading ? "Fetching…" : "Fetch Data"}
                </button>
            </motion.div>

            {/* ── Status Bar ──────────────────────────────────────── */}
            <div className={styles.statusBar}>
                <div className={styles.statusItem}>
                    <span className={`${styles.statusDot} ${styles.dotGreen}`} />
                    Source: India WRIS
                </div>
                <div className={styles.statusItem}>
                    <span className={`${styles.statusDot} ${styles.dotBlue}`} />
                    {PRESETS[preset].state} — {PRESETS[preset].district}
                </div>
                <div className={styles.statusItem}>
                    <span className={`${styles.statusDot} ${styles.dotAmber}`} />
                    {totalRecords} Records
                </div>
                {data?._cached && (
                    <div className={styles.statusItem}>
                        <span className={`${styles.statusDot} ${styles.dotGreen}`} />
                        Cached
                    </div>
                )}
            </div>

            {/* ── Loading ─────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        className={styles.loading}
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.spinner} />
                        <div className={styles.loadingText}>
                            Fetching data from India WRIS…
                        </div>
                        <div className={styles.loadingSub}>
                            indiawris.gov.in — Ministry of Jal Shakti
                        </div>
                    </motion.div>
                )}

                {/* ── Error ───────────────────────────────────────── */}
                {!loading && error && (
                    <motion.div
                        className={styles.error}
                        key="error"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.errorIcon}>⚠️</div>
                        <div className={styles.errorText}>{error}</div>
                        <div className={styles.errorHint}>
                            The India WRIS server may be temporarily unavailable.
                            Try again or select a different region / date range.
                        </div>
                    </motion.div>
                )}

                {/* ── Data ────────────────────────────────────────── */}
                {!loading && !error && data && (
                    <motion.div
                        key="data"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Summary Stats */}
                        {summaryStats.length > 0 && (
                            <div className={styles.summaryGrid}>
                                {summaryStats.map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        className={styles.summaryCard}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                    >
                                        <div className={styles.summaryIcon}>{stat.icon}</div>
                                        <div className={styles.summaryValue}>{stat.value}</div>
                                        <div className={styles.summaryLabel}>{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* View Toggle */}
                        {records.length > 0 && (
                            <div className={styles.viewToggle}>
                                <button
                                    className={viewMode === "cards" ? styles.viewBtnActive : styles.viewBtn}
                                    onClick={() => setViewMode("cards")}
                                >
                                    ◻ Cards
                                </button>
                                <button
                                    className={viewMode === "table" ? styles.viewBtnActive : styles.viewBtn}
                                    onClick={() => setViewMode("table")}
                                >
                                    ≡ Table
                                </button>
                            </div>
                        )}

                        {/* Cards View */}
                        {viewMode === "cards" && records.length > 0 && (
                            <div className={styles.dataGrid}>
                                {records.slice(0, 20).map((record, i) => (
                                    <motion.div
                                        key={i}
                                        className={styles.dataCard}
                                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{
                                            duration: 0.5,
                                            delay: i * 0.04,
                                            ease: [0.16, 1, 0.3, 1],
                                        }}
                                    >
                                        <div className={styles.cardStation}>
                                            <div className={styles.stationIcon}>
                                                {DATASETS.find((d) => d.key === activeDataset)?.icon}
                                            </div>
                                            <div>
                                                <div className={styles.stationName}>
                                                    {record.stationName || record.station_name || record.StationName || `Station ${i + 1}`}
                                                </div>
                                                <div className={styles.stationMeta}>
                                                    {record.districtName || record.district || record.DistrictName || PRESETS[preset].district}
                                                    {" • "}
                                                    {record.stateName || record.state || record.StateName || PRESETS[preset].state}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.cardMetrics}>
                                            {getMetricEntries(record, activeDataset).map((m, j) => (
                                                <div key={j} className={styles.metric}>
                                                    <div className={styles.metricLabel}>{m.label}</div>
                                                    <div className={styles.metricValue}>
                                                        {m.value}
                                                        <span className={styles.metricUnit}>{m.unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {(record.dateTime || record.date || record.Date) && (
                                            <div className={styles.metricTimestamp}>
                                                📅  {record.dateTime || record.date || record.Date}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Table View */}
                        {viewMode === "table" && records.length > 0 && (
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            {columns.slice(0, 8).map((col) => (
                                                <th key={col}>{formatColumnName(col)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.slice(0, 50).map((row, i) => (
                                            <tr key={i}>
                                                <td>{page * 100 + i + 1}</td>
                                                {columns.slice(0, 8).map((col) => (
                                                    <td key={col}>{formatCellValue(row[col])}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Empty state */}
                        {records.length === 0 && (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}>📭</div>
                                <div className={styles.emptyTitle}>No data available</div>
                                <div className={styles.emptyDesc}>
                                    No records found for the selected region & date range.
                                    Try selecting a different state/district or expand the date range.
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    className={styles.pageBtn}
                                    disabled={page === 0}
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                >
                                    ← Previous
                                </button>
                                <span className={styles.pageInfo}>
                                    Page {page + 1} of {totalPages}
                                </span>
                                <button
                                    className={styles.pageBtn}
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

/* ─── helpers ────────────────────────────────────────────────────── */
function getMetricEntries(record, dataset) {
    const entries = [];
    const numericKeys = Object.entries(record).filter(
        ([k, v]) => typeof v === "number" && !["id", "srNo", "srno", "sno"].includes(k.toLowerCase())
    );

    // Try to pick the most relevant metrics
    const priorityKeys = {
        "groundwater-level": ["waterLevel", "water_level", "WaterLevel", "gwl", "groundwaterLevel", "value"],
        "rainfall": ["rainfall", "rainFall", "RainFall", "value", "rain"],
        "river-water-level": ["waterLevel", "water_level", "WaterLevel", "level", "value"],
        "river-discharge": ["discharge", "Discharge", "dischargeValue", "value"],
        "temperature": ["temperature", "Temperature", "temp", "value", "maxTemp", "minTemp"],
        "humidity": ["humidity", "Humidity", "relativeHumidity", "value"],
    };

    const priority = priorityKeys[dataset] || [];
    const shown = new Set();

    // First add priority keys
    for (const pk of priority) {
        const match = Object.entries(record).find(
            ([k]) => k.toLowerCase() === pk.toLowerCase() && typeof record[k] === "number"
        );
        if (match && !shown.has(match[0])) {
            entries.push({
                label: formatColumnName(match[0]),
                value: typeof match[1] === "number" ? Math.round(match[1] * 100) / 100 : match[1],
                unit: getUnit(match[0], dataset),
            });
            shown.add(match[0]);
        }
    }

    // Fill up to 4 metrics
    for (const [k, v] of numericKeys) {
        if (entries.length >= 4) break;
        if (!shown.has(k) && v !== null && v !== undefined) {
            entries.push({
                label: formatColumnName(k),
                value: typeof v === "number" ? Math.round(v * 100) / 100 : v,
                unit: getUnit(k, dataset),
            });
            shown.add(k);
        }
    }

    // If still empty, show string fields
    if (entries.length === 0) {
        const stringKeys = Object.entries(record).filter(
            ([k, v]) => typeof v === "string" && v.length < 30 &&
                !["id", "createdAt", "updatedAt"].includes(k)
        );
        for (const [k, v] of stringKeys.slice(0, 4)) {
            entries.push({ label: formatColumnName(k), value: v, unit: "" });
        }
    }

    return entries;
}

function getUnit(key, dataset) {
    const k = key.toLowerCase();
    if (k.includes("level") || k.includes("depth") || k.includes("gwl")) return "m";
    if (k.includes("rain") || k.includes("rainfall")) return "mm";
    if (k.includes("temp")) return "°C";
    if (k.includes("humid")) return "%";
    if (k.includes("discharge")) return "m³/s";
    if (k.includes("pressure")) return "hPa";
    if (k.includes("speed") || k.includes("wind")) return "km/h";
    if (k.includes("radiation")) return "W/m²";
    return "";
}

function formatColumnName(name) {
    return name
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .trim()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function formatCellValue(val) {
    if (val === null || val === undefined) return "—";
    if (typeof val === "number") return Math.round(val * 100) / 100;
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "string" && val.length > 40) return val.slice(0, 37) + "…";
    return String(val);
}

function computeSummary(records, dataset) {
    if (!records || records.length === 0) return [];

    const stats = [];
    stats.push({ icon: "📊", value: records.length, label: "Records Found" });

    // Find primary numeric field
    const numFields = {};
    for (const r of records) {
        for (const [k, v] of Object.entries(r)) {
            if (typeof v === "number" && !["id", "srNo", "srno", "sno"].includes(k.toLowerCase())) {
                if (!numFields[k]) numFields[k] = [];
                numFields[k].push(v);
            }
        }
    }

    // Pick top 3 numeric fields
    const sorted = Object.entries(numFields)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 3);

    for (const [key, values] of sorted) {
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);

        stats.push({
            icon: "📈",
            value: (Math.round(avg * 100) / 100).toString(),
            label: `Avg ${formatColumnName(key)}`,
        });

        if (values.length > 2) {
            stats.push({
                icon: "⬆️",
                value: (Math.round(max * 100) / 100).toString(),
                label: `Max ${formatColumnName(key)}`,
            });
        }
    }

    // Unique stations
    const stationField = Object.keys(records[0] || {}).find(
        (k) => k.toLowerCase().includes("station")
    );
    if (stationField) {
        const uniqueStations = new Set(records.map((r) => r[stationField])).size;
        stats.push({ icon: "📍", value: uniqueStations, label: "Stations" });
    }

    return stats.slice(0, 6);
}
