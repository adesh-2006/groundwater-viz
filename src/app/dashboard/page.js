"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./dashboard.module.css";

/* ─── Metric chart config ─────────────────────────────── */
const CHART_METRICS = [
    { key: "water_level", label: "Water Level", unit: "m", color: "#22d3ee", gradient: ["rgba(34,211,238,0.35)", "rgba(34,211,238,0.0)"] },
    { key: "ph", label: "pH", unit: "", color: "#22c55e", gradient: ["rgba(34,197,94,0.35)", "rgba(34,197,94,0.0)"] },
    { key: "tds", label: "TDS", unit: "ppm", color: "#a855f7", gradient: ["rgba(168,85,247,0.35)", "rgba(168,85,247,0.0)"] },
    { key: "temperature", label: "Temperature", unit: "°C", color: "#f59e0b", gradient: ["rgba(245,158,11,0.35)", "rgba(245,158,11,0.0)"] },
];

/* ─── SVG History Chart Component ─────────────────────── */
function HistoryChart({ readings, sensorName }) {
    const [activeMetric, setActiveMetric] = useState(0);
    const [hoverIdx, setHoverIdx] = useState(null);
    const svgRef = useRef(null);

    if (!readings || readings.length < 2) {
        return (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                Not enough data for chart. Push more readings to see trends.
            </div>
        );
    }

    const metric = CHART_METRICS[activeMetric];
    const data = readings.map(r => r[metric.key]).filter(v => v != null);
    const labels = readings.map(r => {
        const d = new Date(r.timestamp);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const min = Math.min(...data);
    const max = Math.max(...data);
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    const range = max - min || 1;
    const padMin = min - range * 0.1;
    const padMax = max + range * 0.1;
    const padRange = padMax - padMin;

    // Chart geometry
    const W = 600, H = 200, PX = 0, PY = 10;
    const cW = W - PX * 2, cH = H - PY * 2;
    const step = cW / (data.length - 1);

    const points = data.map((v, i) => ({
        x: PX + i * step,
        y: PY + cH - ((v - padMin) / padRange) * cH,
        value: v,
        label: labels[i],
    }));

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${PY + cH} L ${PX} ${PY + cH} Z`;

    // Grid lines
    const gridLines = 5;
    const gridY = Array.from({ length: gridLines }, (_, i) => ({
        y: PY + (cH / (gridLines - 1)) * i,
        val: (padMax - (padRange / (gridLines - 1)) * i).toFixed(1),
    }));

    function handleMouseMove(e) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width * W;
        const idx = Math.round((relX - PX) / step);
        setHoverIdx(Math.max(0, Math.min(idx, points.length - 1)));
    }

    return (
        <div style={{ marginTop: 24 }}>
            {/* Metric Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {CHART_METRICS.map((m, i) => (
                    <button
                        key={m.key}
                        onClick={() => { setActiveMetric(i); setHoverIdx(null); }}
                        style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: `1px solid ${i === activeMetric ? m.color + "60" : "rgba(255,255,255,0.06)"}`,
                            background: i === activeMetric ? m.color + "15" : "rgba(255,255,255,0.02)",
                            color: i === activeMetric ? m.color : "#888",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Stats Row */}
            <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: "0.7rem" }}>
                <div>
                    <span style={{ color: "#666" }}>Min </span>
                    <span style={{ color: metric.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{min.toFixed(1)}{metric.unit}</span>
                </div>
                <div>
                    <span style={{ color: "#666" }}>Avg </span>
                    <span style={{ color: "#ddd", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{avg.toFixed(1)}{metric.unit}</span>
                </div>
                <div>
                    <span style={{ color: "#666" }}>Max </span>
                    <span style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{max.toFixed(1)}{metric.unit}</span>
                </div>
                <div style={{ marginLeft: "auto", color: "#555" }}>
                    {readings.length} readings · 30 days
                </div>
            </div>

            {/* SVG Chart */}
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverIdx(null)}
                >
                    <defs>
                        <linearGradient id={`areaGrad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={metric.gradient[0]} />
                            <stop offset="100%" stopColor={metric.gradient[1]} />
                        </linearGradient>
                    </defs>

                    {/* Grid */}
                    {gridY.map((g, i) => (
                        <g key={i}>
                            <line x1={PX} y1={g.y} x2={W - PX} y2={g.y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                            <text x={W - 4} y={g.y - 4} fill="#555" fontSize="8" textAnchor="end" fontFamily="'JetBrains Mono', monospace">{g.val}</text>
                        </g>
                    ))}

                    {/* Area fill */}
                    <path d={areaPath} fill={`url(#areaGrad-${metric.key})`} />

                    {/* Line */}
                    <path d={linePath} fill="none" stroke={metric.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Data points */}
                    {points.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 2}
                            fill={hoverIdx === i ? metric.color : "transparent"}
                            stroke={hoverIdx === i ? metric.color : "transparent"}
                            strokeWidth={2}
                        />
                    ))}

                    {/* Hover vertical line + tooltip */}
                    {hoverIdx !== null && points[hoverIdx] && (
                        <g>
                            <line x1={points[hoverIdx].x} y1={PY} x2={points[hoverIdx].x} y2={PY + cH} stroke={metric.color + "40"} strokeWidth="1" strokeDasharray="3 3" />
                            <rect
                                x={Math.min(points[hoverIdx].x - 40, W - 85)}
                                y={Math.max(points[hoverIdx].y - 36, 2)}
                                width="80" height="28" rx="6"
                                fill="rgba(0,0,0,0.85)" stroke={metric.color + "50"} strokeWidth="1"
                            />
                            <text
                                x={Math.min(points[hoverIdx].x, W - 45)}
                                y={Math.max(points[hoverIdx].y - 22, 14) + 5}
                                fill={metric.color} fontSize="10" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="700"
                            >
                                {points[hoverIdx].value.toFixed(1)} {metric.unit}
                            </text>
                            <text
                                x={Math.min(points[hoverIdx].x, W - 45)}
                                y={PY + cH + 12}
                                fill="#777" fontSize="8" textAnchor="middle" fontFamily="'JetBrains Mono', monospace"
                            >
                                {points[hoverIdx].label}
                            </text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}
function StatusBadge({ status }) {
    const colorMap = { Good: "#22c55e", Moderate: "#eab308", Critical: "#ef4444" };
    return (
        <span
            className={styles.statusBadge}
            style={{
                color: colorMap[status] || "#888",
                background: `${colorMap[status] || "#888"}15`,
                border: `1px solid ${colorMap[status] || "#888"}30`,
            }}
        >
            {status || "N/A"}
        </span>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [rainfall, setRainfall] = useState(null);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [history, setHistory] = useState(null);
    const [histLoading, setHistLoading] = useState(false);
    const [histSources, setHistSources] = useState(null);

    useEffect(() => {
        async function fetchAll() {
            try {
                const [gwRes, rfRes] = await Promise.all([
                    fetch("/api/groundwater"),
                    fetch("/api/rainfall?type=summary"),
                ]);
                const gwData = await gwRes.json();
                const rfData = await rfRes.json();
                setData(gwData);
                setRainfall(rfData);
            } catch (e) {
                console.error("Failed to load data", e);
            }
        }
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch history when sensor is selected
    const selectSensor = useCallback(async (sensor) => {
        setSelectedSensor(sensor);
        setHistory(null);
        setHistSources(null);
        setHistLoading(true);
        try {
            const res = await fetch(`/api/sensor-history?sensor_id=${sensor.sensor_id}&limit=50`);
            const json = await res.json();
            setHistory(json.readings || []);
            setHistSources(json.data_sources || null);
        } catch {
            setHistory([]);
        } finally {
            setHistLoading(false);
        }
    }, []);

    const filteredSensors = data?.sensors?.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
            s.sensor_id.toLowerCase().includes(q) ||
            s.district.toLowerCase().includes(q) ||
            s.state.toLowerCase().includes(q)
        );
    });

    const stats = data
        ? [
            { icon: "📡", label: "Total Sensors", value: data.total_sensors },
            { icon: "✅", label: "Active", value: data.active_sensors, color: "#22c55e" },
            { icon: "💧", label: "Avg Level", value: `${data.avg_water_level}m`, color: "#22d3ee" },
            { icon: "⚗️", label: "Avg pH", value: data.avg_ph, color: data.avg_ph >= 6.5 && data.avg_ph <= 8.5 ? "#22c55e" : "#ef4444" },
            { icon: "🌧️", label: "Rain Today", value: `${Math.round(rainfall?.total_rainfall_today_mm || 0)}mm`, color: "#10b981" },
            { icon: "⚠️", label: "Alerts", value: data.critical_alerts, color: "#ef4444" },
        ]
        : [];

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.logo}>
                        <div className={styles.logoIcon}>🌿</div>
                        <span>AquaViz</span>
                    </Link>
                    <span className={styles.liveTag}>
                        <span className={styles.liveDot} />
                        Live
                    </span>
                </div>
                <div className={styles.headerRight}>
                    <Link href="/" className={styles.backBtn}>
                        ← 3D Experience
                    </Link>
                </div>
            </header>

            {/* Stats Strip */}
            {data && (
                <motion.div
                    className={styles.statsStrip}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {stats.map((stat, i) => (
                        <div key={i} className={styles.statItem}>
                            <div className={styles.statIcon}>{stat.icon}</div>
                            <div>
                                <div className={styles.statValue} style={{ color: stat.color }}>
                                    {stat.value}
                                </div>
                                <div className={styles.statLabel}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Main Content */}
            <div className={styles.main}>
                {/* Sensor List */}
                <div className={styles.sensorPanel}>
                    <div className={styles.searchWrapper}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            className={styles.searchInput}
                            type="text"
                            placeholder="Search sensors, districts, states..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={styles.sensorList}>
                        {!filteredSensors ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={styles.skeleton} />
                            ))
                        ) : filteredSensors.length === 0 ? (
                            <div className={styles.emptyState}>No sensors found</div>
                        ) : (
                            filteredSensors.map((sensor, i) => (
                                <motion.div
                                    key={sensor.id}
                                    className={`${styles.sensorCard} ${selectedSensor?.id === sensor.id ? styles.selected : ""}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => selectSensor(sensor)}
                                >
                                    <div className={styles.sensorHeader}>
                                        <div className={styles.sensorName}>
                                            <span
                                                className={styles.sensorDot}
                                                style={{
                                                    background:
                                                        sensor.quality_status === "Good"
                                                            ? "#22c55e"
                                                            : sensor.quality_status === "Moderate"
                                                                ? "#eab308"
                                                                : "#ef4444",
                                                }}
                                            />
                                            {sensor.sensor_id}
                                        </div>
                                        <StatusBadge status={sensor.quality_status} />
                                    </div>
                                    <div className={styles.sensorMetrics}>
                                        <div className={styles.metric}>
                                            <span className={styles.metricLabel}>Level</span>
                                            <span className={styles.metricValue}>{sensor.water_level}m</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricLabel}>pH</span>
                                            <span className={styles.metricValue}>{sensor.ph}</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricLabel}>TDS</span>
                                            <span className={styles.metricValue}>{sensor.tds}ppm</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricLabel}>Temp</span>
                                            <span className={styles.metricValue}>{sensor.temperature}°C</span>
                                        </div>
                                    </div>
                                    <div className={styles.sensorLocation}>
                                        📍 {sensor.district}, {sensor.state}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Panel */}
                <div className={styles.detailPanel}>
                    {selectedSensor ? (
                        <motion.div
                            key={selectedSensor.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className={styles.detailHeader}>
                                <div>
                                    <h2 className={styles.detailTitle}>{selectedSensor.sensor_id}</h2>
                                    <p className={styles.detailLocation}>
                                        📍 {selectedSensor.district}, {selectedSensor.state} · Depth: {selectedSensor.depth}m
                                    </p>
                                </div>
                                <StatusBadge status={selectedSensor.quality_status} />
                            </div>

                            <div className={styles.detailGrid}>
                                {[
                                    { icon: "💧", label: "Water Level", value: `${selectedSensor.water_level}m`, bar: (selectedSensor.water_level / 40) * 100, color: "#22d3ee" },
                                    { icon: "⚗️", label: "pH Level", value: selectedSensor.ph, bar: (selectedSensor.ph / 14) * 100, color: selectedSensor.ph >= 6.5 && selectedSensor.ph <= 8.5 ? "#22c55e" : "#ef4444" },
                                    { icon: "🌊", label: "Turbidity", value: `${selectedSensor.turbidity} NTU`, bar: (selectedSensor.turbidity / 10) * 100, color: "#3b82f6" },
                                    { icon: "🧪", label: "TDS", value: `${selectedSensor.tds} ppm`, bar: (selectedSensor.tds / 1000) * 100, color: "#a855f7" },
                                    { icon: "🌡️", label: "Temperature", value: `${selectedSensor.temperature}°C`, bar: (selectedSensor.temperature / 50) * 100, color: "#d4a843" },
                                    { icon: "📏", label: "Borewell Depth", value: `${selectedSensor.depth}m`, bar: (selectedSensor.depth / 80) * 100, color: "#10b981" },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        className={styles.detailItem}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                    >
                                        <div className={styles.detailItemHeader}>
                                            <span>{item.icon}</span>
                                            <span className={styles.detailItemLabel}>{item.label}</span>
                                        </div>
                                        <div className={styles.detailItemValue}>{item.value}</div>
                                        <div className={styles.detailBar}>
                                            <motion.div
                                                className={styles.detailBarFill}
                                                style={{ background: item.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(item.bar, 100)}%` }}
                                                transition={{ duration: 0.8, delay: i * 0.08 }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Historical Chart */}
                            <div className={styles.regionsSection}>
                                <h3 className={styles.regionsTitle} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    📈 Historical Readings
                                    {histSources && histSources.wris !== "Unavailable" && (
                                        <span style={{ fontSize: "0.55rem", padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontWeight: 700, letterSpacing: "0.03em" }}>
                                            🏛️ INDIA WRIS LIVE DATA
                                        </span>
                                    )}
                                    {histSources && (
                                        <span style={{ fontSize: "0.52rem", color: "#666", fontWeight: 500, marginLeft: "auto" }}>
                                            {histSources.wris !== "Unavailable" ? histSources.wris : ""}
                                            {histSources.local > 0 ? ` + ${histSources.local} local` : ""}
                                        </span>
                                    )}
                                </h3>
                                {histLoading ? (
                                    <div style={{ padding: "30px 0", textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                        <div style={{ width: 24, height: 24, border: "2px solid rgba(34,211,238,0.15)", borderTopColor: "#22d3ee", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
                                        Fetching real-time data from India WRIS…
                                    </div>
                                ) : (
                                    <HistoryChart readings={history} sensorName={selectedSensor.sensor_id} />
                                )}
                            </div>

                            {/* Regional rainfall */}
                            {rainfall?.regions && (
                                <div className={styles.regionsSection}>
                                    <h3 className={styles.regionsTitle}>🗺️ Regional Rainfall</h3>
                                    <div className={styles.regionsGrid}>
                                        {rainfall.regions.map((region, i) => (
                                            <div key={i} className={styles.regionCard}>
                                                <div className={styles.regionName}>{region.name}</div>
                                                <div className={styles.regionValue}>{region.avg_rainfall} mm</div>
                                                <div
                                                    className={styles.regionTrend}
                                                    style={{
                                                        color: region.trend.startsWith("+") ? "#22c55e" : "#ef4444",
                                                    }}
                                                >
                                                    {region.trend}
                                                </div>
                                                <div className={styles.regionStatus}>{region.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <div className={styles.emptyDetail}>
                            <div className={styles.emptyDetailIcon}>📡</div>
                            <h3>Select a Sensor</h3>
                            <p>Click on a sensor card to view detailed metrics and readings</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
