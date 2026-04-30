/**
 * Shared In-Memory Sensor Data Store
 * Uses globalThis to ensure a SINGLE instance across all Next.js API routes.
 * Without globalThis, Turbopack/Webpack may create separate module instances
 * for each route, causing admin changes to not reflect on the dashboard.
 */

const DEFAULT_SENSORS = [
    { id: 1, sensor_id: "DWLR-DL-001", name: "New Delhi Station", lat: 28.6139, lng: 77.209, district: "New Delhi", state: "Delhi", depth: 45, status: "active", water_level: 14.2, ph: 7.2, tds: 340, temperature: 25.1, turbidity: 1.8, quality_status: "Good", lastUpdated: new Date().toISOString() },
    { id: 2, sensor_id: "DWLR-DL-002", name: "Civil Lines Station", lat: 28.6353, lng: 77.225, district: "Civil Lines", state: "Delhi", depth: 38, status: "active", water_level: 18.3, ph: 8.1, tds: 580, temperature: 24.5, turbidity: 3.2, quality_status: "Moderate", lastUpdated: new Date().toISOString() },
    { id: 3, sensor_id: "DWLR-MH-001", name: "Mumbai Station", lat: 19.076, lng: 72.8777, district: "Mumbai", state: "Maharashtra", depth: 55, status: "active", water_level: 8.7, ph: 7.0, tds: 280, temperature: 27.3, turbidity: 1.1, quality_status: "Good", lastUpdated: new Date().toISOString() },
    { id: 4, sensor_id: "DWLR-MH-002", name: "Pune Station", lat: 18.5204, lng: 73.8567, district: "Pune", state: "Maharashtra", depth: 60, status: "active", water_level: 28.5, ph: 5.9, tds: 820, temperature: 23.8, turbidity: 5.6, quality_status: "Critical", lastUpdated: new Date().toISOString() },
    { id: 5, sensor_id: "DWLR-KA-001", name: "Bangalore Station", lat: 12.9716, lng: 77.5946, district: "Bangalore", state: "Karnataka", depth: 42, status: "active", water_level: 14.2, ph: 7.5, tds: 390, temperature: 26.0, turbidity: 1.5, quality_status: "Good", lastUpdated: new Date().toISOString() },
    { id: 6, sensor_id: "DWLR-TN-001", name: "Chennai Station", lat: 13.0827, lng: 80.2707, district: "Chennai", state: "Tamil Nadu", depth: 50, status: "active", water_level: 19.8, ph: 7.8, tds: 510, temperature: 28.2, turbidity: 2.9, quality_status: "Moderate", lastUpdated: new Date().toISOString() },
    { id: 7, sensor_id: "DWLR-RJ-001", name: "Jaipur Station", lat: 26.9124, lng: 75.7873, district: "Jaipur", state: "Rajasthan", depth: 70, status: "active", water_level: 35.2, ph: 8.8, tds: 950, temperature: 22.1, turbidity: 6.1, quality_status: "Critical", lastUpdated: new Date().toISOString() },
    { id: 8, sensor_id: "DWLR-UP-001", name: "Lucknow Station", lat: 26.8467, lng: 80.9462, district: "Lucknow", state: "Uttar Pradesh", depth: 48, status: "active", water_level: 11.5, ph: 7.1, tds: 310, temperature: 25.5, turbidity: 1.3, quality_status: "Good", lastUpdated: new Date().toISOString() },
    { id: 9, sensor_id: "DWLR-GJ-001", name: "Ahmedabad Station", lat: 23.0225, lng: 72.5714, district: "Ahmedabad", state: "Gujarat", depth: 52, status: "active", water_level: 16.4, ph: 7.3, tds: 420, temperature: 26.8, turbidity: 2.0, quality_status: "Good", lastUpdated: new Date().toISOString() },
    { id: 10, sensor_id: "DWLR-WB-001", name: "Kolkata Station", lat: 22.5726, lng: 88.3639, district: "Kolkata", state: "West Bengal", depth: 35, status: "active", water_level: 6.8, ph: 6.9, tds: 260, temperature: 27.0, turbidity: 1.6, quality_status: "Good", lastUpdated: new Date().toISOString() },
    { id: 11, sensor_id: "DWLR-TS-001", name: "Hyderabad Station", lat: 17.3850, lng: 78.4867, district: "Hyderabad", state: "Telangana", depth: 58, status: "active", water_level: 22.1, ph: 8.0, tds: 620, temperature: 26.5, turbidity: 3.8, quality_status: "Moderate", lastUpdated: new Date().toISOString() },
    { id: 12, sensor_id: "DWLR-KL-001", name: "Kochi Station", lat: 9.9312, lng: 76.2673, district: "Kochi", state: "Kerala", depth: 30, status: "active", water_level: 4.5, ph: 6.8, tds: 180, temperature: 28.5, turbidity: 0.8, quality_status: "Good", lastUpdated: new Date().toISOString() },
];

// Use globalThis to ensure single instance across all API routes
if (!globalThis.__aquaviz_sensors) {
    globalThis.__aquaviz_sensors = [...DEFAULT_SENSORS];
    globalThis.__aquaviz_nextId = 13;
}

// Initialize history separately (may have been added after sensors were already created)
if (!globalThis.__aquaviz_history) {
    globalThis.__aquaviz_history = {};

    // Seed 30 days of historical data for each sensor
    for (const s of globalThis.__aquaviz_sensors) {
        const hist = [];
        const now = Date.now();
        for (let d = 30; d >= 0; d--) {
            const ts = new Date(now - d * 86400000).toISOString();
            const jitter = (Math.random() - 0.5) * 4;
            const phJitter = (Math.random() - 0.5) * 0.6;
            const tdsJitter = Math.round((Math.random() - 0.5) * 80);
            const tempJitter = (Math.random() - 0.5) * 2;
            hist.push({
                timestamp: ts,
                water_level: Math.round((s.water_level + jitter) * 100) / 100,
                ph: Math.round((s.ph + phJitter) * 100) / 100,
                tds: Math.max(50, s.tds + tdsJitter),
                temperature: Math.round((s.temperature + tempJitter) * 10) / 10,
                turbidity: Math.round((s.turbidity + (Math.random() - 0.5) * 1) * 10) / 10,
            });
        }
        globalThis.__aquaviz_history[s.sensor_id] = hist;
    }
}

const sensors = globalThis.__aquaviz_sensors;
const history = globalThis.__aquaviz_history;

let nextId = globalThis.__aquaviz_nextId || 13;

// ── Helpers to determine quality status ─────────────────
function computeQualityStatus(water_level, ph) {
    if (ph < 6.0 || ph > 9.0 || water_level > 25) return "Critical";
    if (ph < 6.5 || ph > 8.5 || water_level > 15) return "Moderate";
    return "Good";
}

function computeSensorStatus(water_level) {
    return water_level > 20 ? "critical" : "active";
}

// ── Public API ─────────────────────────────────────────
export function getAllSensors() {
    return [...sensors];
}

export function getSensorById(sensorId) {
    return sensors.find(s => s.sensor_id === sensorId || s.id === sensorId);
}

export function addSensor(data) {
    const newSensor = {
        id: nextId++,
        sensor_id: data.sensor_id || data.id || `DWLR-${Date.now()}`,
        name: data.name || "New Station",
        lat: parseFloat(data.lat) || 0,
        lng: parseFloat(data.lng) || 0,
        district: data.district || "",
        state: data.state || "",
        depth: parseFloat(data.depth) || 0,
        status: data.status || "active",
        water_level: parseFloat(data.water_level) || 0,
        ph: parseFloat(data.ph) || 7.0,
        tds: parseInt(data.tds) || 0,
        temperature: parseFloat(data.temperature) || 25.0,
        turbidity: parseFloat(data.turbidity) || 0,
        quality_status: data.quality_status || "Good",
        lastUpdated: new Date().toISOString(),
    };
    globalThis.__aquaviz_nextId = nextId; // sync back
    sensors.unshift(newSensor);
    return newSensor;
}

export function updateSensor(sensorId, data) {
    const idx = sensors.findIndex(s => s.sensor_id === sensorId || s.id === sensorId);
    if (idx === -1) return null;

    const updated = { ...sensors[idx], ...data, lastUpdated: new Date().toISOString() };

    // Recompute quality status if water level or pH changed
    if (data.water_level !== undefined || data.ph !== undefined) {
        const wl = data.water_level !== undefined ? parseFloat(data.water_level) : sensors[idx].water_level;
        const ph = data.ph !== undefined ? parseFloat(data.ph) : sensors[idx].ph;
        updated.water_level = wl;
        updated.ph = ph;
        updated.quality_status = computeQualityStatus(wl, ph);
        updated.status = computeSensorStatus(wl);
    }

    sensors[idx] = updated;
    return updated;
}

export function pushReading(sensorId, reading) {
    const idx = sensors.findIndex(s => s.sensor_id === sensorId || s.id === sensorId);
    if (idx === -1) return null;

    const wl = parseFloat(reading.water_level);
    const ph = reading.ph !== undefined ? parseFloat(reading.ph) : sensors[idx].ph;
    const tds = reading.tds !== undefined ? parseInt(reading.tds) : sensors[idx].tds;
    const temp = reading.temperature !== undefined ? parseFloat(reading.temperature) : sensors[idx].temperature;
    const turb = reading.turbidity !== undefined ? parseFloat(reading.turbidity) : sensors[idx].turbidity;

    sensors[idx] = {
        ...sensors[idx],
        water_level: wl,
        ph,
        tds,
        temperature: temp,
        turbidity: turb,
        quality_status: computeQualityStatus(wl, ph),
        status: computeSensorStatus(wl),
        lastUpdated: new Date().toISOString(),
    };

    // Record in history
    const sid = sensors[idx].sensor_id;
    if (!history[sid]) history[sid] = [];
    history[sid].push({
        timestamp: new Date().toISOString(),
        water_level: wl,
        ph,
        tds,
        temperature: temp,
        turbidity: turb,
    });
    // Keep last 200 entries
    if (history[sid].length > 200) history[sid] = history[sid].slice(-200);

    return sensors[idx];
}

export function getHistory(sensorId, limit = 50) {
    return (history[sensorId] || []).slice(-limit);
}

export function deleteSensor(sensorId) {
    const idx = sensors.findIndex(s => s.sensor_id === sensorId || s.id === sensorId);
    if (idx === -1) return false;
    sensors.splice(idx, 1);
    return true;
}

// ── Aggregate stats ────────────────────────────────────
export function getStats() {
    const active = sensors.filter(s => s.status === "active");
    const critical = sensors.filter(s => s.quality_status === "Critical");

    const avgWL = active.length > 0
        ? active.reduce((s, r) => s + r.water_level, 0) / active.length
        : 0;
    const avgPh = active.length > 0
        ? active.reduce((s, r) => s + r.ph, 0) / active.length
        : 0;
    const avgTds = active.length > 0
        ? active.reduce((s, r) => s + r.tds, 0) / active.length
        : 0;
    const avgTemp = active.length > 0
        ? active.reduce((s, r) => s + r.temperature, 0) / active.length
        : 0;

    return {
        total_sensors: sensors.length,
        active_sensors: active.length,
        avg_water_level: Math.round(avgWL * 100) / 100,
        avg_ph: Math.round(avgPh * 100) / 100,
        avg_tds: Math.round(avgTds),
        avg_temperature: Math.round(avgTemp * 10) / 10,
        critical_alerts: critical.length,
        states_covered: [...new Set(sensors.map(s => s.state))].length,
        last_updated: new Date().toISOString(),
    };
}

// ── Automated Real-Time Data Fetcher (5-min interval) ──
if (!globalThis.__aquaviz_simulator_running) {
    globalThis.__aquaviz_simulator_running = true;

    // Auto-update every 5 minutes (300000 ms)
    setInterval(async () => {
        const now = new Date().toISOString();

        for (let i = 0; i < sensors.length; i++) {
            const s = sensors[i];

            // 1. Fetch ACTUAL Real-Time Temperature Data mapped to the station's exact GPS Coordinates using Open-Meteo Live API
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lng}&current=temperature_2m`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.current && data.current.temperature_2m) {
                        s.temperature = data.current.temperature_2m;
                    }
                }
            } catch (err) {
                // Network failure fallback
                s.temperature = Math.round((s.temperature + (Math.random() - 0.5) * 0.2) * 10) / 10;
            }

            // 2. Realistic Ground-Water Live Jitter (Water level moves millimeters in 5 mins)
            s.water_level = Math.round((s.water_level + (Math.random() - 0.5) * 0.05) * 100) / 100;

            // 3. Live Chemical Quality Variance
            s.ph = Math.round((s.ph + (Math.random() - 0.5) * 0.02) * 100) / 100;
            s.tds = Math.max(50, s.tds + Math.round((Math.random() - 0.5) * 5));

            s.lastUpdated = now;

            // Log real-time history
            const sid = s.sensor_id;
            if (!history[sid]) history[sid] = [];
            history[sid].push({
                timestamp: now,
                water_level: s.water_level,
                ph: s.ph,
                tds: s.tds,
                temperature: s.temperature,
                turbidity: s.turbidity,
            });
            if (history[sid].length > 200) history[sid] = history[sid].slice(-200);
        }
    }, 300000); // Trigger every 5 mins
}
