import { NextResponse } from "next/server";

const WRIS_BASE = "https://indiawris.gov.in";

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min for master data

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}

function setCache(key, data) {
    cache.set(key, { ts: Date.now(), data });
}

async function wrisPost(path, params = {}) {
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
    const type = searchParams.get("type") || "states";

    try {
        if (type === "states") {
            const cached = getCached("states");
            if (cached) return NextResponse.json(cached);
            const data = await wrisPost("/masterState/StateList");
            setCache("states", data);
            return NextResponse.json(data);
        }

        if (type === "districts") {
            const state = searchParams.get("state") || "";
            const key = `districts:${state}`;
            const cached = getCached(key);
            if (cached) return NextResponse.json(cached);
            const data = await wrisPost("/masterDistrict/getDistrictbyState", { stateName: state });
            setCache(key, data);
            return NextResponse.json(data);
        }

        if (type === "agencies") {
            const state = searchParams.get("state") || "";
            const district = searchParams.get("district") || "";
            const key = `agencies:${state}:${district}`;
            const cached = getCached(key);
            if (cached) return NextResponse.json(cached);
            const data = await wrisPost("/masterAgency/districAgencyList", {
                stateName: state,
                districtName: district,
            });
            setCache(key, data);
            return NextResponse.json(data);
        }

        if (type === "basins") {
            const cached = getCached("basins");
            if (cached) return NextResponse.json(cached);
            const data = await wrisPost("/basin/getMasterBasin");
            setCache("basins", data);
            return NextResponse.json(data);
        }

        if (type === "stations") {
            const cached = getCached("stations");
            if (cached) return NextResponse.json(cached);
            const data = await wrisPost("/stationMaster/getMasterStationsList");
            setCache("stations", data);
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 502 });
    }
}
