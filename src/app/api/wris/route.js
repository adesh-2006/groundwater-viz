import { NextResponse } from "next/server";

const WRIS_BASE = "https://indiawris.gov.in";

// In-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}

function setCache(key, data) {
    cache.set(key, { ts: Date.now(), data });
}

async function wrisPost(path, params) {
    const url = new URL(path, WRIS_BASE);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
        method: "POST",
        headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`WRIS API error: ${res.status}`);
    return res.json();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint") || "groundwater-level";
    const state = searchParams.get("state") || "Odisha";
    const district = searchParams.get("district") || "Baleshwar";
    const agency = searchParams.get("agency") || "CGWB";
    const startdate = searchParams.get("startdate") || getDefaultStart();
    const enddate = searchParams.get("enddate") || getDefaultEnd();
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "100";

    // Map endpoint names to WRIS paths
    const endpointMap = {
        "groundwater-level": "/Dataset/Ground Water Level",
        "rainfall": "/Dataset/RainFall",
        "river-water-level": "/Dataset/River Water Level",
        "river-discharge": "/Dataset/River Water Discharge",
        "temperature": "/Dataset/Temperature",
        "humidity": "/Dataset/Relative Humidity",
        "reservoir": "/Dataset/Reservoir",
    };

    const wrisPath = endpointMap[endpoint];
    if (!wrisPath) {
        return NextResponse.json(
            { error: `Unknown endpoint: ${endpoint}. Valid: ${Object.keys(endpointMap).join(", ")}` },
            { status: 400 }
        );
    }

    const params = {
        stateName: state,
        districtName: district,
        agencyName: agency,
        startdate,
        enddate,
        page,
        size,
    };

    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) {
        return NextResponse.json({
            ...cached,
            _cached: true,
            _source: "India WRIS (indiawris.gov.in)",
        });
    }

    try {
        const data = await wrisPost(wrisPath, params);
        setCache(cacheKey, data);
        return NextResponse.json({
            ...data,
            _cached: false,
            _source: "India WRIS (indiawris.gov.in)",
            _endpoint: endpoint,
            _params: params,
        });
    } catch (err) {
        return NextResponse.json(
            {
                error: err.message,
                _source: "India WRIS (indiawris.gov.in)",
                _endpoint: endpoint,
            },
            { status: 502 }
        );
    }
}

function getDefaultStart() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
}

function getDefaultEnd() {
    return new Date().toISOString().split("T")[0];
}
