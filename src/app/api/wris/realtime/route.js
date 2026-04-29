import { NextResponse } from "next/server";

/**
 * Real-Time Groundwater Quality & Level Data API
 * Sources:
 *   1. India WRIS ArcGIS — GWR2024 state-level resources (CGWB)
 *   2. India WRIS ArcGIS — Block categorization (Safe/Critical/Over-Exploited)
 *   3. India WRIS Dataset API — Live groundwater level timeseries
 *   4. India WRIS ArcGIS — Water quality stations with param data
 *   5. India WRIS ArcGIS — Groundwater monitoring station counts
 */

const ARC_BASE = "https://arc.indiawris.gov.in/server/rest/services/NWIC";
const WRIS_BASE = "https://indiawris.gov.in";

// In-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    cache.delete(key);
    return null;
}
function setCache(key, data) {
    if (cache.size > 50) cache.delete(cache.keys().next().value);
    cache.set(key, { ts: Date.now(), data });
}

// SSL-bypass fetch for India WRIS ArcGIS
async function arcFetch(url, timeoutMs = 20000) {
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

// Fetch state-level groundwater resources from GWR2024
async function fetchStateResources() {
    const ck = "gwr2024-states";
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        const url = `${ARC_BASE}/GWR2024_CGWB/MapServer/4/query?` + new URLSearchParams({
            where: "1=1",
            outFields: "state,stname,ar_gwr_tot,nagwa,agwd_irr,agwd_dom_in,agwd_tot,gw_dev_per,gwa_fut_use,n_dis_nm",
            returnGeometry: "false",
            f: "json",
            resultRecordCount: "40",
        });
        const data = await arcFetch(url);
        const features = (data.features || []).map((f) => f.attributes);
        setCache(ck, features);
        return features;
    } catch {
        return [];
    }
}

// Fetch block-level categorization (Safe/Critical/Over-Exploited counts)
async function fetchBlockCategories() {
    const ck = "gwr2024-blocks-cat";
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        // Use statistics query to count blocks by category
        const url = `${ARC_BASE}/GWR2024_CGWB/MapServer/8/query?` + new URLSearchParams({
            where: "1=1",
            outFields: "class",
            returnGeometry: "false",
            outStatistics: JSON.stringify([
                { statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "count" }
            ]),
            groupByFieldsForStatistics: "class",
            f: "json",
        });
        const data = await arcFetch(url);
        const result = {};
        for (const f of data.features || []) {
            const cls = f.attributes.class || "Unknown";
            result[cls] = f.attributes.count || 0;
        }
        setCache(ck, result);
        return result;
    } catch {
        return {};
    }
}

// Fetch water quality station data (with param field that has quality data)
async function fetchWaterQualityStations(state = "") {
    const ck = `wq-stations:${state}`;
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        let where = "1=1";
        if (state) where = `state_name='${state}'`;

        const url = `${ARC_BASE}/WDO_GWQ/MapServer/0/query?` + new URLSearchParams({
            where,
            outFields: "station_name,station_code,state_name,district_name,agency_name,lat,long,class,year,param",
            returnGeometry: "false",
            outSR: "4326",
            f: "json",
            resultRecordCount: "200",
        });
        const data = await arcFetch(url);
        const features = (data.features || []).map((f) => f.attributes);
        setCache(ck, features);
        return features;
    } catch {
        return [];
    }
}

// Fetch live groundwater level data from India WRIS Dataset API
async function fetchLiveGroundwaterLevel(state, district, agency) {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]; // 90 days
    const ck = `gwl:${state}:${district}:${agency}:${start}`;
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        const url = new URL("/Dataset/Ground Water Level", WRIS_BASE);
        url.searchParams.set("stateName", state);
        url.searchParams.set("districtName", district);
        url.searchParams.set("agencyName", agency);
        url.searchParams.set("startdate", start);
        url.searchParams.set("enddate", end);
        url.searchParams.set("page", "0");
        url.searchParams.set("size", "100");

        const res = await fetch(url.toString(), {
            method: "POST",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const records = json?.data?.content || (Array.isArray(json?.data) ? json.data : []);
        setCache(ck, records);
        return records;
    } catch {
        return null;
    }
}

// Fetch station count from ArcGIS
async function fetchStationCount() {
    const ck = "station-count-total";
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/0/query?` + new URLSearchParams({
            where: "lat > 5",
            returnCountOnly: "true",
            f: "json",
        });
        const data = await arcFetch(url);
        setCache(ck, data.count || 0);
        return data.count || 0;
    } catch {
        return 0;
    }
}

// Count by telemetry type
async function fetchTelemetryCounts() {
    const ck = "telemetry-counts";
    const cached = getCached(ck);
    if (cached) return cached;

    try {
        const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/0/query?` + new URLSearchParams({
            where: "lat > 5",
            outFields: "telemetry",
            returnGeometry: "false",
            outStatistics: JSON.stringify([
                { statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "count" }
            ]),
            groupByFieldsForStatistics: "telemetry",
            f: "json",
        });
        const data = await arcFetch(url);
        const result = { dwlr: 0, manual: 0 };
        for (const f of data.features || []) {
            if (f.attributes.telemetry === 1) result.dwlr = f.attributes.count;
            else result.manual = f.attributes.count;
        }
        setCache(ck, result);
        return result;
    } catch {
        return { dwlr: 0, manual: 0 };
    }
}

// Predefined locations that reliably return data
const LIVE_LOCATIONS = [
    { state: "Odisha", district: "Baleshwar", agency: "CGWB" },
    { state: "Rajasthan", district: "Jaipur", agency: "CGWB" },
    { state: "Andhra Pradesh", district: "Kadapa", agency: "CGWB" },
    { state: "Gujarat", district: "Ahmedabad", agency: "CGWB" },
    { state: "Karnataka", district: "Bangalore Urban", agency: "CGWB" },
    { state: "Tamil Nadu", district: "Chennai", agency: "CGWB" },
    { state: "Maharashtra", district: "Pune", agency: "CGWB" },
    { state: "Uttar Pradesh", district: "Lucknow", agency: "CGWB" },
    { state: "West Bengal", district: "Kolkata", agency: "CGWB" },
    { state: "Madhya Pradesh", district: "Bhopal", agency: "CGWB" },
];

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "overview";

    try {
        switch (action) {
            // ──────────────── Full Overview Dashboard ────────────────
            case "overview": {
                // Run all fetches in parallel
                const [
                    stateResources,
                    blockCategories,
                    totalStations,
                    telemetry,
                ] = await Promise.all([
                    fetchStateResources(),
                    fetchBlockCategories(),
                    fetchStationCount(),
                    fetchTelemetryCounts(),
                ]);

                // Compute national aggregates
                const totalRecharge = stateResources.reduce((s, r) => s + (r.ar_gwr_tot || 0), 0);
                const totalAvailability = stateResources.reduce((s, r) => s + (r.nagwa || 0), 0);
                const totalDraft = stateResources.reduce((s, r) => s + (r.agwd_tot || 0), 0);
                const totalIrrigationDraft = stateResources.reduce((s, r) => s + (r.agwd_irr || 0), 0);
                const totalDomesticDraft = stateResources.reduce((s, r) => s + (r.agwd_dom_in || 0), 0);
                const avgDevelopment = stateResources.length > 0
                    ? stateResources.reduce((s, r) => s + (r.gw_dev_per || 0), 0) / stateResources.length
                    : 0;

                // Top overexploited states
                const topOverexploited = [...stateResources]
                    .filter(s => s.gw_dev_per)
                    .sort((a, b) => b.gw_dev_per - a.gw_dev_per)
                    .slice(0, 8)
                    .map(s => ({
                        state: s.stname || s.state,
                        stateCode: s.state,
                        developmentPct: Math.round(s.gw_dev_per * 10) / 10,
                        totalRecharge: Math.round(s.ar_gwr_tot * 100) / 100,
                        netAvailability: Math.round(s.nagwa * 100) / 100,
                        totalDraft: Math.round(s.agwd_tot * 100) / 100,
                        futureAvailability: Math.round((s.gwa_fut_use || 0) * 100) / 100,
                        status: s.gw_dev_per > 100 ? "Over Exploited" : s.gw_dev_per > 90 ? "Critical" : s.gw_dev_per > 70 ? "Semi Critical" : "Safe",
                    }));

                return NextResponse.json({
                    national: {
                        totalRecharge: Math.round(totalRecharge * 100) / 100,
                        totalAvailability: Math.round(totalAvailability * 100) / 100,
                        totalDraft: Math.round(totalDraft * 100) / 100,
                        irrigationDraft: Math.round(totalIrrigationDraft * 100) / 100,
                        domesticDraft: Math.round(totalDomesticDraft * 100) / 100,
                        avgDevelopmentPct: Math.round(avgDevelopment * 10) / 10,
                        statesAssessed: stateResources.length,
                    },
                    blockCategories,
                    stations: {
                        total: totalStations,
                        dwlr: telemetry.dwlr,
                        manual: telemetry.manual,
                    },
                    topOverexploited,
                    allStates: stateResources.map(s => ({
                        state: s.stname || s.state,
                        stateCode: s.state,
                        developmentPct: Math.round((s.gw_dev_per || 0) * 10) / 10,
                        netAvailability: Math.round((s.nagwa || 0) * 100) / 100,
                        totalDraft: Math.round((s.agwd_tot || 0) * 100) / 100,
                    })),
                    _source: "India WRIS / CGWB GWR-2024",
                    _timestamp: new Date().toISOString(),
                });
            }

            // ──────────────── Live Water Level Data ────────────────
            case "water-level": {
                const state = searchParams.get("state") || "";
                const district = searchParams.get("district") || "";
                const agency = searchParams.get("agency") || "CGWB";

                // If no specific location, fetch from multiple preset locations
                if (!state) {
                    const results = await Promise.allSettled(
                        LIVE_LOCATIONS.slice(0, 5).map(loc =>
                            fetchLiveGroundwaterLevel(loc.state, loc.district, loc.agency)
                                .then(records => ({ ...loc, records: records || [] }))
                        )
                    );

                    const successful = results
                        .filter(r => r.status === "fulfilled" && r.value.records.length > 0)
                        .map(r => r.value);

                    return NextResponse.json({
                        locations: successful.map(loc => ({
                            state: loc.state,
                            district: loc.district,
                            recordCount: loc.records.length,
                            latestRecords: loc.records.slice(0, 5),
                            summary: computeWaterLevelSummary(loc.records),
                        })),
                        _source: "India WRIS Dataset API (indiawris.gov.in)",
                        _timestamp: new Date().toISOString(),
                    });
                }

                // Specific location
                const records = await fetchLiveGroundwaterLevel(state, district, agency);
                return NextResponse.json({
                    state,
                    district,
                    agency,
                    records: records || [],
                    summary: records ? computeWaterLevelSummary(records) : null,
                    _source: "India WRIS Dataset API",
                    _timestamp: new Date().toISOString(),
                });
            }

            // ──────────────── Water Quality Stations ────────────────
            case "water-quality": {
                const state = searchParams.get("state") || "";
                const stations = await fetchWaterQualityStations(state);

                // Parse the param field which contains quality parameters
                const parsed = stations.map(s => {
                    let params = {};
                    if (s.param) {
                        try { params = JSON.parse(s.param); } catch { /* ignore */ }
                    }
                    return {
                        name: s.station_name,
                        code: s.station_code,
                        state: s.state_name,
                        district: s.district_name,
                        agency: s.agency_name,
                        lat: s.lat,
                        lng: s.long,
                        classification: s.class || "Unknown",
                        year: s.year,
                        params,
                    };
                });

                // Aggregate quality statistics
                const qualityStats = computeQualityStats(parsed);

                return NextResponse.json({
                    stations: parsed.slice(0, 100),
                    totalStations: parsed.length,
                    qualityStats,
                    _source: "India WRIS ArcGIS — WDO_GWQ",
                    _timestamp: new Date().toISOString(),
                });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}. Valid: overview, water-level, water-quality` },
                    { status: 400 }
                );
        }
    } catch (err) {
        console.error("Realtime API error:", err);
        return NextResponse.json({ error: err.message }, { status: 502 });
    }
}

function computeWaterLevelSummary(records) {
    if (!records || records.length === 0) return null;

    // Try common field names for water level
    const levelKeys = ["gw_level", "gwLevel", "waterLevel", "water_level", "level", "value", "gwl"];
    let levels = [];

    for (const r of records) {
        for (const k of levelKeys) {
            if (r[k] !== undefined && r[k] !== null && typeof r[k] === "number") {
                levels.push(r[k]);
                break;
            }
        }
    }

    if (levels.length === 0) {
        // Try to extract numeric values from any field
        for (const r of records) {
            for (const [k, v] of Object.entries(r)) {
                if (typeof v === "number" && v > 0 && v < 200 && !k.includes("id") && !k.includes("code")) {
                    levels.push(v);
                    break;
                }
            }
        }
    }

    if (levels.length === 0) return { recordCount: records.length, fields: Object.keys(records[0] || {}) };

    return {
        recordCount: records.length,
        min: Math.round(Math.min(...levels) * 100) / 100,
        max: Math.round(Math.max(...levels) * 100) / 100,
        avg: Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 100) / 100,
        latest: levels[levels.length - 1],
        trend: levels.length > 1 ? (levels[levels.length - 1] > levels[0] ? "rising" : "falling") : "stable",
    };
}

function computeQualityStats(stations) {
    const classifications = {};
    let totalWithClass = 0;

    for (const s of stations) {
        if (s.classification && s.classification !== "Unknown") {
            classifications[s.classification] = (classifications[s.classification] || 0) + 1;
            totalWithClass++;
        }
    }

    // Count stations by state
    const byState = {};
    for (const s of stations) {
        if (s.state) {
            byState[s.state] = (byState[s.state] || 0) + 1;
        }
    }

    return {
        totalStations: stations.length,
        classifications,
        topStates: Object.entries(byState)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([state, count]) => ({ state, count })),
    };
}
