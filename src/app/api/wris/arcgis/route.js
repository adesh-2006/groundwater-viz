import { NextResponse } from "next/server";

/**
 * Proxy for India WRIS ArcGIS REST services.
 * This avoids CORS issues when fetching directly from arc.indiawris.gov.in
 * and provides server-side caching for performance.
 */

const ARC_BASE = "https://arc.indiawris.gov.in/server/rest/services/NWIC";

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    // Limit cache size
    if (cache.size > 100) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }
    cache.set(key, { ts: Date.now(), data });
}

// Fetch with timeout, retry, and SSL bypass for India WRIS
// The India WRIS ArcGIS server has an incomplete SSL certificate chain
// that causes UNABLE_TO_VERIFY_LEAF_SIGNATURE in Node.js
async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 30000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await new Promise((resolve, reject) => {
                const https = require("https");
                const parsedUrl = new URL(url);

                const req = https.request(
                    {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || 443,
                        path: parsedUrl.pathname + parsedUrl.search,
                        method: "GET",
                        headers: { Accept: "application/json" },
                        rejectUnauthorized: false, // Bypass SSL cert issue
                        timeout: timeoutMs,
                    },
                    (res) => {
                        let data = "";
                        res.on("data", (chunk) => (data += chunk));
                        res.on("end", () => {
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                try {
                                    resolve(JSON.parse(data));
                                } catch (e) {
                                    reject(new Error("Invalid JSON from ArcGIS"));
                                }
                            } else {
                                reject(new Error(`ArcGIS error: ${res.statusCode}`));
                            }
                        });
                    }
                );

                req.on("error", reject);
                req.on("timeout", () => {
                    req.destroy();
                    reject(new Error("Request timeout"));
                });
                req.end();
            });
            return result;
        } catch (err) {
            if (attempt < retries) {
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
                continue;
            }
            throw err;
        }
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stations";

    try {
        let result;

        switch (action) {
            case "stations": {
                // Fetch groundwater stations with optional state filter
                const state = searchParams.get("state") || "";
                const agency = searchParams.get("agency") || "";
                const resultOffset = searchParams.get("offset") || "0";
                const resultRecordCount = searchParams.get("count") || "2000";

                let where = "1=1";
                if (state) where = `state_name='${state}'`;
                if (agency) where += ` AND agency_name='${agency}'`;

                // Filter out stations with lat < 5 (bad data) to get only India
                where += " AND lat > 5";

                const cacheKey = `stations:${where}:${resultOffset}:${resultRecordCount}`;
                const cached = getCached(cacheKey);
                if (cached) {
                    return NextResponse.json({ ...cached, _cached: true });
                }

                const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/0/query?` +
                    new URLSearchParams({
                        where,
                        outFields: "objectid,station_code,station_name,station_type,lat,long,telemetry,agency_name,state_name,district_name,block_name,basin_name,sub_basin_name,station_data_type_new",
                        outSR: "4326",
                        f: "json",
                        resultOffset,
                        resultRecordCount,
                        orderByFields: "state_name",
                    });

                result = await fetchWithRetry(url);
                setCache(cacheKey, result);
                break;
            }

            case "station-count": {
                // Get count of stations (optionally filtered)
                const state = searchParams.get("state") || "";
                let where = "lat > 5";
                if (state) where += ` AND state_name='${state}'`;

                const cacheKey = `count:${where}`;
                const cached = getCached(cacheKey);
                if (cached) {
                    return NextResponse.json({ ...cached, _cached: true });
                }

                const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/0/query?` +
                    new URLSearchParams({
                        where,
                        returnCountOnly: "true",
                        f: "json",
                    });

                result = await fetchWithRetry(url);
                setCache(cacheKey, result);
                break;
            }

            case "states": {
                // Get distinct states from groundwater stations
                const cacheKey = "distinct-states";
                const cached = getCached(cacheKey);
                if (cached) {
                    return NextResponse.json({ ...cached, _cached: true });
                }

                const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/0/query?` +
                    new URLSearchParams({
                        where: "lat > 5",
                        outFields: "state_name",
                        returnDistinctValues: "true",
                        returnGeometry: "false",
                        orderByFields: "state_name",
                        f: "json",
                        resultRecordCount: "100",
                    });

                result = await fetchWithRetry(url);
                setCache(cacheKey, result);
                break;
            }

            case "districts": {
                // Get distinct districts for a state
                const state = searchParams.get("state") || "";
                if (!state) {
                    return NextResponse.json({ error: "state parameter required" }, { status: 400 });
                }

                const cacheKey = `districts:${state}`;
                const cached = getCached(cacheKey);
                if (cached) {
                    return NextResponse.json({ ...cached, _cached: true });
                }

                const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/0/query?` +
                    new URLSearchParams({
                        where: `state_name='${state}' AND lat > 5`,
                        outFields: "district_name",
                        returnDistinctValues: "true",
                        returnGeometry: "false",
                        orderByFields: "district_name",
                        f: "json",
                        resultRecordCount: "200",
                    });

                result = await fetchWithRetry(url);
                setCache(cacheKey, result);
                break;
            }

            case "state-boundary": {
                // Get state boundaries for map overlay
                const cacheKey = "state-boundary";
                const cached = getCached(cacheKey);
                if (cached) {
                    return NextResponse.json({ ...cached, _cached: true });
                }

                const url = `${ARC_BASE}/GroundwaterLevel_Stations/MapServer/1/query?` +
                    new URLSearchParams({
                        where: "1=1",
                        outFields: "*",
                        outSR: "4326",
                        f: "json",
                        resultRecordCount: "50",
                    });

                result = await fetchWithRetry(url);
                setCache(cacheKey, result);
                break;
            }

            case "gwresources": {
                // Get groundwater resources assessment data (2024)
                const cacheKey = "gwresources";
                const cached = getCached(cacheKey);
                if (cached) {
                    return NextResponse.json({ ...cached, _cached: true });
                }

                const url = `${ARC_BASE}/GWR2024_CGWB/MapServer/0/query?` +
                    new URLSearchParams({
                        where: "1=1",
                        outFields: "*",
                        outSR: "4326",
                        f: "json",
                        resultRecordCount: "1000",
                    });

                result = await fetchWithRetry(url);
                setCache(cacheKey, result);
                break;
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}. Valid: stations, station-count, states, districts, state-boundary, gwresources` },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            ...result,
            _source: "India WRIS ArcGIS (arc.indiawris.gov.in)",
            _timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("ArcGIS proxy error:", err);
        return NextResponse.json(
            {
                error: err.message,
                _source: "India WRIS ArcGIS (arc.indiawris.gov.in)",
            },
            { status: 502 }
        );
    }
}
