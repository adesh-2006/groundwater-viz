import { NextResponse } from "next/server";
import { getAllSensors, addSensor, updateSensor, pushReading, deleteSensor } from "@/lib/sensorStore";

// GET — list all sensors (admin view)
export async function GET() {
    const sensors = getAllSensors();
    return NextResponse.json(
        sensors.map(s => ({
            id: s.sensor_id,
            name: s.name,
            district: s.district,
            state: s.state,
            status: s.status,
            depth: s.depth,
            lat: s.lat,
            lng: s.lng,
            lastReading: `${s.water_level}m`,
            lastUpdated: formatTimeAgo(s.lastUpdated),
        }))
    );
}

// POST — add sensor OR push reading
export async function POST(request) {
    const body = await request.json();
    const action = body.action || "add";

    if (action === "push-reading") {
        const result = pushReading(body.sensor_id, {
            water_level: body.water_level,
            ph: body.ph,
            tds: body.tds,
            temperature: body.temperature,
            turbidity: body.turbidity,
        });
        if (!result) {
            return NextResponse.json({ error: "Sensor not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, sensor: result });
    }

    // Default: add new sensor
    const newSensor = addSensor(body);
    return NextResponse.json({ success: true, sensor: newSensor });
}

// PUT — update sensor details
export async function PUT(request) {
    const body = await request.json();
    const sensorId = body.sensor_id || body.id;

    if (!sensorId) {
        return NextResponse.json({ error: "sensor_id required" }, { status: 400 });
    }

    const result = updateSensor(sensorId, body);
    if (!result) {
        return NextResponse.json({ error: "Sensor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, sensor: result });
}

// DELETE — remove a sensor
export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get("id");

    if (!sensorId) {
        return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const ok = deleteSensor(sensorId);
    if (!ok) {
        return NextResponse.json({ error: "Sensor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
}

function formatTimeAgo(isoString) {
    if (!isoString) return "—";
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
