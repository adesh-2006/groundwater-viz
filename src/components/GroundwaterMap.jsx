"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import styles from "./GroundwaterMap.module.css";

/* ─── Constants ────────────────────────────────────────────── */
const INDIA_CENTER = [22.5, 80.0];
const INDIA_ZOOM = 5;

const DEPTH_CLASSES = [
    { min: 0, max: 2, label: "0 – 2 m", color: "#00e5ff", textColor: "#000" },
    { min: 2, max: 5, label: "2 – 5 m", color: "#00c853", textColor: "#000" },
    { min: 5, max: 10, label: "5 – 10 m", color: "#ffd600", textColor: "#000" },
    { min: 10, max: 20, label: "10 – 20 m", color: "#ff6d00", textColor: "#fff" },
    { min: 20, max: 40, label: "20 – 40 m", color: "#d50000", textColor: "#fff" },
    { min: 40, max: Infinity, label: "> 40 m", color: "#4a148c", textColor: "#fff" },
];

const TELEMETRY_LABELS = {
    1: "DWLR (Telemetric)",
    2: "Manual / Non-Telemetric",
};

function getDepthClass(depth) {
    if (depth === null || depth === undefined || isNaN(depth)) return null;
    return DEPTH_CLASSES.find((c) => depth >= c.min && depth < c.max) || DEPTH_CLASSES[DEPTH_CLASSES.length - 1];
}

function getStationColor(station) {
    // Use telemetry type for coloring since individual water level isn't in station data
    if (station.telemetry === 1) return "#00e5ff"; // DWLR 
    return "#ff9100"; // Manual
}

/* ─── Main Component ────────────────────────────────────────── */
export default function GroundwaterMap() {
    const mapContainer = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const clusterGroupRef = useRef(null);

    // State  
    const [loading, setLoading] = useState(true);
    const [stationsData, setStationsData] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedState, setSelectedState] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedTelemetry, setSelectedTelemetry] = useState("all");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedStation, setSelectedStation] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState(null);
    const [loadingStations, setLoadingStations] = useState(false);
    const [stats, setStats] = useState({ dwlr: 0, manual: 0, total: 0, statesCount: 0 });
    const [searchQuery, setSearchQuery] = useState("");

    // Initialize Leaflet map
    useEffect(() => {
        if (mapRef.current) return;

        let cancelled = false;

        const initMap = async () => {
            // Load Leaflet CSS
            if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }

            // Import Leaflet and MarkerCluster from npm packages
            const L = (await import("leaflet")).default;
            await import("leaflet.markercluster");
            await import("leaflet.markercluster/dist/MarkerCluster.css");
            await import("leaflet.markercluster/dist/MarkerCluster.Default.css");

            if (cancelled || !mapContainer.current || mapRef.current) return;

            const map = L.map(mapContainer.current, {
                center: INDIA_CENTER,
                zoom: INDIA_ZOOM,
                minZoom: 4,
                maxZoom: 18,
                zoomControl: false,
                attributionControl: false,
            });

            // Add zoom control to top-right  
            L.control.zoom({ position: "topright" }).addTo(map);

            // Attribution
            L.control.attribution({ position: "bottomright", prefix: false })
                .addAttribution('Data: <a href="https://indiawris.gov.in" target="_blank">India WRIS</a> | Map: <a href="https://www.openstreetmap.org" target="_blank">OSM</a>')
                .addTo(map);

            // Dark themed tile layer
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                subdomains: "abcd",
                maxZoom: 19,
            }).addTo(map);

            // India boundary approximate
            map.setMaxBounds([
                [5, 65],
                [38, 100],
            ]);

            mapRef.current = map;

            // Create cluster group with custom styling
            const clusterGroup = L.markerClusterGroup({
                maxClusterRadius: 40,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 12,
                iconCreateFunction: function (cluster) {
                    const count = cluster.getChildCount();
                    let size = "small";
                    let radius = 30;
                    if (count > 100) { size = "large"; radius = 50; }
                    else if (count > 30) { size = "medium"; radius = 40; }

                    return L.divIcon({
                        html: `<div class="gw-cluster gw-cluster-${size}">
                            <span>${count > 999 ? Math.round(count / 1000) + "k" : count}</span>
                        </div>`,
                        className: "gw-cluster-icon",
                        iconSize: L.point(radius, radius),
                    });
                },
            });

            map.addLayer(clusterGroup);
            clusterGroupRef.current = clusterGroup;

            setMapReady(true);

            setTimeout(() => map.invalidateSize(), 300);
        };

        initMap();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            clusterGroupRef.current = null;
        };
    }, []);

    // Load states list
    useEffect(() => {
        async function loadStates() {
            try {
                const res = await fetch("/api/wris/arcgis?action=states");
                const data = await res.json();
                if (data.features) {
                    const stateNames = data.features
                        .map((f) => f.attributes.state_name)
                        .filter(Boolean)
                        .filter((s) => s.trim() !== "");
                    setStates([...new Set(stateNames)].sort());
                }
            } catch (err) {
                console.error("Failed to load states:", err);
            }
        }
        loadStates();
    }, []);

    // Load districts when state changes
    useEffect(() => {
        if (!selectedState) {
            setDistricts([]);
            setSelectedDistrict("");
            return;
        }

        async function loadDistricts() {
            try {
                const res = await fetch(`/api/wris/arcgis?action=districts&state=${encodeURIComponent(selectedState)}`);
                const data = await res.json();
                if (data.features) {
                    const districtNames = data.features
                        .map((f) => f.attributes.district_name)
                        .filter(Boolean)
                        .filter((d) => d.trim() !== "");
                    setDistricts([...new Set(districtNames)].sort());
                }
            } catch (err) {
                console.error("Failed to load districts:", err);
            }
        }
        loadDistricts();
    }, [selectedState]);

    // Load stations data
    const loadStations = useCallback(async () => {
        if (!mapReady) return;

        setLoadingStations(true);
        setError(null);

        try {
            // Build URL params
            const params = new URLSearchParams({ action: "stations", count: "5000" });
            if (selectedState) params.set("state", selectedState);

            const res = await fetch(`/api/wris/arcgis?${params}`);
            const data = await res.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            let features = data.features || [];

            // Filter by district if selected
            if (selectedDistrict) {
                features = features.filter(
                    (f) => f.attributes.district_name?.toUpperCase() === selectedDistrict.toUpperCase()
                );
            }

            // Filter by telemetry type
            if (selectedTelemetry !== "all") {
                const telVal = parseInt(selectedTelemetry);
                features = features.filter((f) => f.attributes.telemetry === telVal);
            }

            // Filter by search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                features = features.filter(
                    (f) =>
                        (f.attributes.station_name || "").toLowerCase().includes(q) ||
                        (f.attributes.station_code || "").toLowerCase().includes(q) ||
                        (f.attributes.district_name || "").toLowerCase().includes(q) ||
                        (f.attributes.block_name || "").toLowerCase().includes(q)
                );
            }

            setStationsData(features);
            setTotalCount(features.length);

            // Calculate stats
            const dwlr = features.filter((f) => f.attributes.telemetry === 1).length;
            const manual = features.filter((f) => f.attributes.telemetry === 2).length;
            const uniqueStates = new Set(features.map((f) => f.attributes.state_name)).size;
            setStats({ dwlr, manual, total: features.length, statesCount: uniqueStates });

            // Update map markers
            updateMapMarkers(features);
        } catch (err) {
            setError(err.message || "Failed to fetch station data");
        } finally {
            setLoadingStations(false);
            setLoading(false);
        }
    }, [mapReady, selectedState, selectedDistrict, selectedTelemetry, searchQuery]);

    useEffect(() => {
        loadStations();
    }, [loadStations]);

    // Update map markers
    const updateMapMarkers = useCallback(
        async (features) => {
            if (!clusterGroupRef.current || !mapRef.current) return;

            const L = (await import("leaflet")).default;
            const clusterGroup = clusterGroupRef.current;

            // Clear existing markers
            clusterGroup.clearLayers();

            const markers = [];

            features.forEach((feature) => {
                const { attributes, geometry } = feature;
                if (!geometry || !geometry.y || !geometry.x) return;

                // Skip outlier coordinates
                if (geometry.y < 5 || geometry.y > 38 || geometry.x < 65 || geometry.x > 100) return;

                const color = getStationColor(attributes);
                const typeBadge = attributes.telemetry === 1 ? "DWLR" : "Manual";
                const typeBadgeColor = attributes.telemetry === 1 ? "#00e5ff" : "#ff9100";

                const icon = L.divIcon({
                    className: "gw-station-marker",
                    html: `<div style="
                        width: 10px; height: 10px; border-radius: 50%;
                        background: ${color}; border: 1.5px solid rgba(255,255,255,0.8);
                        box-shadow: 0 0 6px ${color}80;
                        position: relative;
                    ">
                        <div style="
                            position: absolute; top: -2px; left: -2px;
                            width: 14px; height: 14px; border-radius: 50%;
                            background: ${color}30;
                            animation: marker-pulse 3s ease-in-out infinite;
                        "></div>
                    </div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                });

                const marker = L.marker([geometry.y, geometry.x], { icon });

                marker.bindPopup(
                    `<div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 240px; color: #e4ede8; background: #0a1510; border-radius: 8px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                            <div style="width:8px; height:8px; border-radius:50%; background:${typeBadgeColor};"></div>
                            <span style="font-size:10px; color:${typeBadgeColor}; font-weight:600; text-transform:uppercase; letter-spacing:1px;">${typeBadge}</span>
                        </div>
                        <div style="font-size:14px; font-weight:700; margin-bottom:6px; color:#fff;">
                            ${attributes.station_name || "Unknown Station"}
                        </div>
                        <div style="font-size:11px; color:#8a9e92; margin-bottom:10px;">
                            Code: ${attributes.station_code || "N/A"}
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
                            <div style="background:#162b1f; padding:6px 8px; border-radius:6px;">
                                <div style="font-size:9px; color:#8a9e92; text-transform:uppercase; letter-spacing:0.5px;">State</div>
                                <div style="font-size:11px; color:#e4ede8; font-weight:500;">${attributes.state_name || "—"}</div>
                            </div>
                            <div style="background:#162b1f; padding:6px 8px; border-radius:6px;">
                                <div style="font-size:9px; color:#8a9e92; text-transform:uppercase; letter-spacing:0.5px;">District</div>
                                <div style="font-size:11px; color:#e4ede8; font-weight:500;">${attributes.district_name || "—"}</div>
                            </div>
                            <div style="background:#162b1f; padding:6px 8px; border-radius:6px;">
                                <div style="font-size:9px; color:#8a9e92; text-transform:uppercase; letter-spacing:0.5px;">Block</div>
                                <div style="font-size:11px; color:#e4ede8; font-weight:500;">${attributes.block_name || "—"}</div>
                            </div>
                            <div style="background:#162b1f; padding:6px 8px; border-radius:6px;">
                                <div style="font-size:9px; color:#8a9e92; text-transform:uppercase; letter-spacing:0.5px;">Agency</div>
                                <div style="font-size:11px; color:#e4ede8; font-weight:500;">${attributes.agency_name || "—"}</div>
                            </div>
                        </div>
                        ${attributes.basin_name ? `
                        <div style="background:#162b1f; padding:6px 8px; border-radius:6px; margin-bottom:6px;">
                            <div style="font-size:9px; color:#8a9e92; text-transform:uppercase; letter-spacing:0.5px;">Basin</div>
                            <div style="font-size:11px; color:#e4ede8; font-weight:500;">${attributes.basin_name}</div>
                        </div>` : ""}
                        <div style="font-size:9px; color:#5a7565; margin-top:8px; text-align:right;">
                            📍 ${geometry.y.toFixed(4)}°N, ${geometry.x.toFixed(4)}°E
                        </div>
                    </div>`,
                    {
                        className: "gw-popup",
                        maxWidth: 300,
                    }
                );

                marker.on("click", () => {
                    setSelectedStation(attributes);
                });

                markers.push(marker);
            });

            clusterGroup.addLayers(markers);

            // Fit bounds if we have markers
            if (markers.length > 0 && (selectedState || selectedDistrict)) {
                const group = L.featureGroup(markers);
                mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 10 });
            }
        },
        []
    );

    // Reset to all India view
    const resetView = useCallback(() => {
        setSelectedState("");
        setSelectedDistrict("");
        setSelectedTelemetry("all");
        setSearchQuery("");
        if (mapRef.current) {
            mapRef.current.setView(INDIA_CENTER, INDIA_ZOOM);
        }
    }, []);

    return (
        <div className={styles.mapPage}>
            {/* ── Top Header Bar ──────────────────────────────────── */}
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <button
                        className={styles.sidebarToggle}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title="Toggle sidebar"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div className={styles.topBarLogo}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.logoTitle}>Ground Water Level</div>
                            <div className={styles.logoSub}>India WRIS — Live Monitoring Stations</div>
                        </div>
                    </div>
                </div>
                <div className={styles.topBarRight}>
                    <div className={styles.liveBadge}>
                        <span className={styles.liveDot}></span>
                        LIVE DATA
                    </div>
                    <a
                        href="https://indiawris.gov.in/wris/#/groundWater"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        India WRIS Portal
                    </a>
                </div>
            </div>

            <div className={styles.mainContent}>
                {/* ── Sidebar ──────────────────────────────────────── */}
                <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
                    {/* Search */}
                    <div className={styles.sidebarSection}>
                        <div className={styles.searchBox}>
                            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search stations, districts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className={styles.sidebarSection}>
                        <div className={styles.sectionTitle}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Filters
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>State / UT</label>
                            <select
                                className={styles.filterSelect}
                                value={selectedState}
                                onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(""); }}
                            >
                                <option value="">All States</option>
                                {states.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>District</label>
                            <select
                                className={styles.filterSelect}
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                disabled={!selectedState}
                            >
                                <option value="">All Districts</option>
                                {districts.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Station Type</label>
                            <select
                                className={styles.filterSelect}
                                value={selectedTelemetry}
                                onChange={(e) => setSelectedTelemetry(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="1">DWLR (Telemetric)</option>
                                <option value="2">Manual / Non-Telemetric</option>
                            </select>
                        </div>

                        <button className={styles.resetBtn} onClick={resetView}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="1 4 1 10 7 10" />
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                            Reset All Filters
                        </button>
                    </div>

                    {/* Statistics */}
                    <div className={styles.sidebarSection}>
                        <div className={styles.sectionTitle}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            Statistics
                        </div>

                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{stats.total.toLocaleString()}</div>
                                <div className={styles.statLabel}>Total Stations</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={`${styles.statValue} ${styles.statDwlr}`}>{stats.dwlr.toLocaleString()}</div>
                                <div className={styles.statLabel}>DWLR</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={`${styles.statValue} ${styles.statManual}`}>{stats.manual.toLocaleString()}</div>
                                <div className={styles.statLabel}>Manual</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{stats.statesCount}</div>
                                <div className={styles.statLabel}>States / UTs</div>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className={styles.sidebarSection}>
                        <div className={styles.sectionTitle}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                                <line x1="9" y1="21" x2="9" y2="9" />
                            </svg>
                            Legend
                        </div>

                        <div className={styles.legendItems}>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: "#00e5ff", boxShadow: "0 0 6px #00e5ff80" }}></span>
                                <span>DWLR (Telemetric)</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: "#ff9100", boxShadow: "0 0 6px #ff910080" }}></span>
                                <span>Manual / Non-Telemetric</span>
                            </div>
                        </div>

                        <div className={styles.legendDivider}></div>

                        <div className={styles.legendSubtitle}>Cluster Size</div>
                        <div className={styles.legendItems}>
                            <div className={styles.legendItem}>
                                <span className={styles.legendCluster} style={{ width: 16, height: 16, fontSize: 8 }}>5</span>
                                <span>Small (&lt; 30)</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendCluster} style={{ width: 20, height: 20, fontSize: 9 }}>50</span>
                                <span>Medium (30 – 100)</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendCluster} style={{ width: 24, height: 24, fontSize: 10 }}>1k</span>
                                <span>Large (&gt; 100)</span>
                            </div>
                        </div>
                    </div>

                    {/* Selected Station Detail */}
                    {selectedStation && (
                        <div className={styles.sidebarSection}>
                            <div className={styles.sectionTitle}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                Selected Station
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setSelectedStation(null)}
                                >×</button>
                            </div>
                            <div className={styles.stationDetail}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Name</span>
                                    <span className={styles.detailValue}>{selectedStation.station_name || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Code</span>
                                    <span className={styles.detailValue}>{selectedStation.station_code || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Type</span>
                                    <span className={styles.detailValue}>{TELEMETRY_LABELS[selectedStation.telemetry] || "Unknown"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>State</span>
                                    <span className={styles.detailValue}>{selectedStation.state_name || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>District</span>
                                    <span className={styles.detailValue}>{selectedStation.district_name || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Block</span>
                                    <span className={styles.detailValue}>{selectedStation.block_name || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Agency</span>
                                    <span className={styles.detailValue}>{selectedStation.agency_name || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Basin</span>
                                    <span className={styles.detailValue}>{selectedStation.basin_name || "—"}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Location</span>
                                    <span className={styles.detailValue}>{selectedStation.lat?.toFixed(4)}°N, {selectedStation.long?.toFixed(4)}°E</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Source Info */}
                    <div className={styles.sourceInfo}>
                        <div className={styles.sourceInfoTitle}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                            </svg>
                            Official Government Data
                        </div>
                        <div className={styles.sourceInfoText}>
                            Data sourced from India Water Resources Information System (India WRIS),
                            Ministry of Jal Shakti, Government of India via ArcGIS REST Services.
                        </div>
                    </div>
                </div>

                {/* ── Map Container ───────────────────────────────── */}
                <div className={styles.mapArea}>
                    <div className={styles.mapContainer} ref={mapContainer}></div>

                    {/* Loading overlay */}
                    {(loading || loadingStations) && (
                        <div className={styles.loadingOverlay}>
                            <div className={styles.loadingSpinner}></div>
                            <div className={styles.loadingText}>
                                Fetching live data from India WRIS...
                            </div>
                            <div className={styles.loadingSubtext}>
                                arc.indiawris.gov.in — ArcGIS REST Services
                            </div>
                        </div>
                    )}

                    {/* Error overlay */}
                    {error && (
                        <div className={styles.errorOverlay}>
                            <div className={styles.errorIcon}>⚠️</div>
                            <div className={styles.errorText}>{error}</div>
                            <button className={styles.retryBtn} onClick={loadStations}>
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Mini info bar at bottom of map */}
                    <div className={styles.mapInfoBar}>
                        <div className={styles.mapInfoItem}>
                            <span className={styles.mapInfoDot} style={{ background: "#3dd68c" }}></span>
                            {totalCount.toLocaleString()} stations loaded
                        </div>
                        <div className={styles.mapInfoItem}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                            </svg>
                            Source: India WRIS (indiawris.gov.in)
                        </div>
                        <div className={styles.mapInfoItem}>
                            {selectedState || "All India"}
                            {selectedDistrict ? ` → ${selectedDistrict}` : ""}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
