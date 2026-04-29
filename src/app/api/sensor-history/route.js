import { NextResponse } from "next/server";
import { getHistory, getSensorById } from "@/lib/sensorStore";

/**
 * Sensor History API — combines real India WRIS groundwater level data
 * with local pushed readings for comprehensive historical view.
 *
 * Sources:
 *   1. India WRIS Dataset API — real GW level timeseries (90 days)
 *   2. India WRIS ArcGIS — WDO_GWQ water quality stations
 *   3. Local sensorStore — admin-pushed readings
 */

const WRIS_BASE = "https://indiawris.gov.in";
const ARC_BASE = "https://arc.indiawris.gov.in/server/rest/services/NWIC";

// Cache to avoid hammering the government API
const historyCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
    const e = historyCache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
    historyCache.delete(key);
    return null;
}
function setCache(key, data) {
    if (historyCache.size > 30) historyCache.delete(historyCache.keys().next().value);
    historyCache.set(key, { ts: Date.now(), data });
}

// SSL-bypass fetch for India WRIS ArcGIS
function arcFetch(url, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const https = require("https");
        const parsed = new URL(url);
        const req = https.request(
            {
                hostname: parsed.hostname,
                port: 443,
                path: parsed.pathname + parsed.search,
                method: "GET",
                headers: { Accept: "application/json" },
                rejectUnauthorized: false,
                timeout: timeoutMs,
            },
            (res) => {
                let data = "";
                res.on("data", (c) => (data += c));
                res.on("end", () => {
                    try { resolve(JSON.parse(data)); }
                    catch { reject(new Error("Invalid JSON")); }
                });
            }
        );
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.end();
    });
}

// Map sensor states to India WRIS location names
const STATE_MAP = {
    "Delhi": { state: "Delhi", districts: ["Central Delhi", "New Delhi", "South Delhi"] },
    "Maharashtra": { state: "Maharashtra", districts: ["Pune", "Mumbai", "Nagpur"] },
    "Karnataka": { state: "Karnataka", districts: ["Bangalore Urban", "Bangalore Rural", "Mysore"] },
    "Tamil Nadu": { state: "Tamil Nadu", districts: ["Chennai", "Coimbatore", "Madurai"] },
    "Rajasthan": { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Udaipur"] },
    "Uttar Pradesh": { state: "Uttar Pradesh", districts: ["Lucknow", "Varanasi", "Agra"] },
    "Gujarat": { state: "Gujarat", districts: ["Ahmedabad", "Surat", "Vadodara"] },
    "West Bengal": { state: "West Bengal", districts: ["Kolkata", "Howrah", "Bankura"] },
    "Telangana": { state: "Telangana", districts: ["Hyderabad", "Rangareddi", "Medak"] },
    "Kerala": { state: "Kerala", districts: ["Ernakulam", "Thiruvananthapuram", "Thrissur"] },
};

// Fetch real groundwater level timeseries from India WRIS
async function fetchRealGWLevel(stateName, districtHint) {
    const mapping = STATE_MAP[stateName];
    if (!mapping) return null;

    // Try the district hint first, then fallback districts
    const districts = districtHint
        ? [districtHint, ...mapping.districts.filter(d => d !== districtHint)]
        : mapping.districts;

    for (const district of districts.slice(0, 2)) {
        const ck = `gwl-hist:${mapping.state}:${district}`;
        const cached = getCached(ck);
        if (cached) return cached;

        try {
            const end = new Date().toISOString().split("T")[0];
            const start = new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0]; // 1 year

            const url = new URL("/Dataset/Ground Water Level", WRIS_BASE);
            url.searchParams.set("stateName", mapping.state);
            url.searchParams.set("districtName", district);
            url.searchParams.set("agencyName", "CGWB");
            url.searchParams.set("startdate", start);
            url.searchParams.set("enddate", end);
            url.searchParams.set("page", "0");
            url.searchParams.set("size", "200");

            const res = await fetch(url.toString(), {
                method: "POST",
                headers: { Accept: "application/json" },
                signal: AbortSignal.timeout(15000),
            });

            if (!res.ok) continue;
            const json = await res.json();
            const records = json?.data?.content || (Array.isArray(json?.data) ? json.data : []);

            if (records.length > 0) {
                const processed = processGWLRecords(records);
                if (processed.length > 0) {
                    const result = { district, state: mapping.state, readings: processed };
                    setCache(ck, result);
                    return result;
                }
            }
        } catch {
            // Try next district
        }
    }
    return null;
}

// Fetch real water quality data from India WRIS ArcGIS
async function fetchRealWaterQuality(stateName) {
    const ck = `wq-hist:${stateName}`;
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        const url = `${ARC_BASE}/WDO_GWQ/MapServer/0/query?` + new URLSearchParams({
            where: `state_name='${stateName}'`,
            outFields: "station_name,district_name,lat,long,class,year,param",
            returnGeometry: "false",
            f: "json",
            resultRecordCount: "50",
        });
        const data = await arcFetch(url, 15000);
        const stations = (data.features || []).map(f => f.attributes);

        // Parse quality parameters
        const quality = stations.map(s => {
            let params = {};
            if (s.param) {
                try { params = JSON.parse(s.param); } catch { /* ignore */ }
            }
            return {
                station: s.station_name,
                district: s.district_name,
                classification: s.class || "Unknown",
                year: s.year,
                ph: params.pH || params.ph || null,
                tds: params.TDS || params.tds || null,
                fluoride: params.Fluoride || params.fluoride || null,
                nitrate: params.Nitrate || params.nitrate || null,
                chloride: params.Chloride || params.chloride || null,
                iron: params.Iron || params.iron || null,
            };
        }).filter(s => s.ph || s.tds);

        setCache(ck, quality);
        return quality;
    } catch {
        return [];
    }
}

// Process raw India WRIS GWL records into chart-friendly format
function processGWLRecords(records) {
    const levelKeys = ["gw_level", "gwLevel", "waterLevel", "water_level", "level", "value", "gwl"];
    const dateKeys = ["date", "observationDate", "observation_date", "obsDate", "dateOfObservation", "measuredOn"];

    return records
        .map(r => {
            // Find water level value
            let wl = null;
            for (const k of levelKeys) {
                if (r[k] !== undefined && r[k] !== null && typeof r[k] === "number") {
                    wl = r[k];
                    break;
                }
            }

            // Try any numeric field that looks like a water level
            if (wl === null) {
                for (const [k, v] of Object.entries(r)) {
                    if (typeof v === "number" && v > 0 && v < 200 && !k.includes("id") && !k.includes("code") && !k.includes("lat") && !k.includes("lon")) {
                        wl = v;
                        break;
                    }
                }
            }

            // Find date
            let ts = null;
            for (const k of dateKeys) {
                if (r[k]) {
                    ts = r[k];
                    break;
                }
            }
            // Try any date-like field
            if (!ts) {
                for (const [k, v] of Object.entries(r)) {
                    if (typeof v === "string" && v.match(/\d{4}-\d{2}/)) {
                        ts = v;
                        break;
                    }
                    if (typeof v === "number" && v > 1500000000000) {
                        ts = new Date(v).toISOString();
                        break;
                    }
                }
            }

            if (wl === null) return null;

            return {
                timestamp: ts || new Date().toISOString(),
                water_level: Math.round(wl * 100) / 100,
                ph: null,
                tds: null,
                temperature: null,
                turbidity: null,
                source: "India WRIS",
            };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sensorId = searchParams.get("sensor_id");
        const limit = parseInt(searchParams.get("limit") || "50");

        if (!sensorId) {
            return NextResponse.json({ error: "sensor_id is required" }, { status: 400 });
        }

        const sensor = getSensorById(sensorId);
        if (!sensor) {
            return NextResponse.json({ error: `Sensor '${sensorId}' not found` }, { status: 404 });
        }

        // Fetch real data + local data in parallel
        const [realGWL, realWQ, localReadings] = await Promise.all([
            fetchRealGWLevel(sensor.state, sensor.district).catch(() => null),
            fetchRealWaterQuality(sensor.state).catch(() => []),
            Promise.resolve(getHistory(sensorId, limit)),
        ]);

        // Merge real WRIS water level data with quality data
        let wrisReadings = [];
        if (realGWL && realGWL.readings.length > 0) {
            wrisReadings = realGWL.readings.map(r => {
                // Try to enrich with quality data from nearest station
                const qStation = (realWQ || []).find(q =>
                    q.district && sensor.district &&
                    q.district.toLowerCase().includes(sensor.district.toLowerCase().substring(0, 4))
                );

                return {
                    ...r,
                    ph: qStation?.ph ?? r.ph,
                    tds: qStation?.tds ?? r.tds,
                    source: "India WRIS (Official)",
                };
            });
        }

        // Combine: WRIS real data + local admin-pushed data
        const combined = [...wrisReadings, ...localReadings.map(r => ({
            ...r,
            source: "Admin Push (Local)",
        }))].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Deduplicate by date (keep latest)
        const seen = new Set();
        const deduped = combined.filter(r => {
            const dayKey = r.timestamp.substring(0, 10);
            if (seen.has(dayKey)) return false;
            seen.add(dayKey);
            return true;
        }).slice(-limit);

        return NextResponse.json({
            sensor_id: sensor.sensor_id,
            name: sensor.name,
            district: sensor.district,
            state: sensor.state,
            total_readings: deduped.length,
            readings: deduped,
            data_sources: {
                wris: wrisReadings.length > 0 ? `${wrisReadings.length} readings from India WRIS` : "Unavailable",
                wris_location: realGWL ? `${realGWL.state}, ${realGWL.district}` : null,
                quality_stations: (realWQ || []).length,
                local: localReadings.length,
            },
            _source: wrisReadings.length > 0
                ? "India WRIS (indiawris.gov.in) + Local DWLR Network"
                : "Local DWLR Network (seeded + admin)",
            _timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("History API error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
