"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import styles from "./SensorMap.module.css";

const sensorLocations = [
    { name: "DWLR-DL-001", lat: 28.6139, lng: 77.209, district: "New Delhi", state: "Delhi", status: "Good" },
    { name: "DWLR-DL-002", lat: 28.6353, lng: 77.225, district: "Civil Lines", state: "Delhi", status: "Moderate" },
    { name: "DWLR-MH-001", lat: 19.076, lng: 72.8777, district: "Mumbai", state: "Maharashtra", status: "Good" },
    { name: "DWLR-MH-002", lat: 18.5204, lng: 73.8567, district: "Pune", state: "Maharashtra", status: "Critical" },
    { name: "DWLR-KA-001", lat: 12.9716, lng: 77.5946, district: "Bangalore", state: "Karnataka", status: "Good" },
    { name: "DWLR-TN-001", lat: 13.0827, lng: 80.2707, district: "Chennai", state: "Tamil Nadu", status: "Moderate" },
    { name: "DWLR-RJ-001", lat: 26.9124, lng: 75.7873, district: "Jaipur", state: "Rajasthan", status: "Critical" },
    { name: "DWLR-UP-001", lat: 26.8467, lng: 80.9462, district: "Lucknow", state: "Uttar Pradesh", status: "Good" },
    { name: "DWLR-GJ-001", lat: 23.0225, lng: 72.5714, district: "Ahmedabad", state: "Gujarat", status: "Good" },
];

export default function SensorMap() {
    const ref = useRef(null);
    const mapContainer = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-20% 0px" });
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (!isInView || mapLoaded) return;

        const loadMap = async () => {
            // Dynamically load Leaflet CSS
            if (!document.querySelector('link[href*="leaflet"]')) {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }

            // Dynamically load Leaflet JS
            const L = await import("leaflet");

            if (!mapContainer.current) return;

            const map = L.map(mapContainer.current, {
                center: [22.5, 78.9],
                zoom: 5,
                zoomControl: true,
                scrollWheelZoom: false,
            });

            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: "&copy; OSM &copy; CARTO",
                subdomains: "abcd",
                maxZoom: 19,
            }).addTo(map);

            sensorLocations.forEach((s) => {
                const color =
                    s.status === "Good" ? "#3dd68c" : s.status === "Moderate" ? "#e5a035" : "#d94f4f";

                const icon = L.divIcon({
                    className: "sensor-map-marker",
                    html: `<div style="width:28px;height:28px;position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0.25;animation:marker-pulse 2.5s ease-in-out infinite;"></div>
            <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);"></div>
          </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                });

                L.marker([s.lat, s.lng], { icon })
                    .addTo(map)
                    .bindPopup(
                        `<div style="font-family:Inter,sans-serif;padding:4px;">
              <strong>${s.name}</strong><br>
              <span style="color:#888;font-size:0.8rem;">${s.district}, ${s.state}</span><br>
              <span style="color:${color};font-weight:600;font-size:0.85rem;">${s.status}</span>
            </div>`
                    );
            });

            setTimeout(() => map.invalidateSize(), 300);
            setMapLoaded(true);
        };

        loadMap();
    }, [isInView, mapLoaded]);

    return (
        <section className={styles.section} id="map-section" ref={ref}>
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7 }}
            >
                <div className={styles.tag}>
                    <span className={styles.tagDot} />
                    Sensor Network
                </div>
                <h2 className={styles.title}>
                    <span className="gradient-text">Sensor Map</span>
                </h2>
                <p className={styles.subtitle}>
                    DWLR sensors deployed across India for continuous groundwater monitoring
                </p>
            </motion.div>

            <motion.div
                className={styles.mapWrapper}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.2 }}
            >
                <div className={styles.mapContainer} ref={mapContainer} />

                {/* Legend */}
                <div className={styles.legend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: "#3dd68c" }} />
                        Good
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: "#e5a035" }} />
                        Moderate
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: "#d94f4f" }} />
                        Critical
                    </div>
                </div>
            </motion.div>

            <motion.div
                style={{ textAlign: "center", marginTop: "24px" }}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                <Link
                    href="/groundwater-map"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 28px",
                        background: "linear-gradient(135deg, rgba(61,214,140,0.15), rgba(77,184,219,0.15))",
                        border: "1px solid rgba(61,214,140,0.25)",
                        borderRadius: "12px",
                        color: "#3dd68c",
                        fontSize: "14px",
                        fontWeight: 600,
                        textDecoration: "none",
                        transition: "all 0.3s ease",
                    }}
                >
                    🗺️ View Full India WRIS Map — 90,000+ Live Stations
                </Link>
            </motion.div>
        </section>
    );
}
