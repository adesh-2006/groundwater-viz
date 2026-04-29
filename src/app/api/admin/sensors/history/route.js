import { NextResponse } from "next/server";
import { getHistory, getSensorById } from "@/lib/sensorStore";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get("sensor_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!sensorId) {
        return NextResponse.json({ error: "sensor_id is required" }, { status: 400 });
    }

    const sensor = getSensorById(sensorId);
    if (!sensor) {
        return NextResponse.json({ error: "Sensor not found" }, { status: 404 });
    }

    const readings = getHistory(sensorId, limit);

    return NextResponse.json({
        sensor_id: sensor.sensor_id,
        name: sensor.name,
        district: sensor.district,
        state: sensor.state,
        total_readings: readings.length,
        readings,
    });
}
