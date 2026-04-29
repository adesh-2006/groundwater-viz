import { NextResponse } from "next/server";
import { getAllSensors } from "@/lib/sensorStore";

export async function GET() {
    const sensors = getAllSensors();
    const active = sensors.filter(s => s.status === "active");
    const critical = sensors.filter(s => s.status === "critical" || s.quality_status === "Critical");

    return NextResponse.json({
        totalUsers: 24,
        totalSensors: sensors.length,
        activeSensors: active.length,
        criticalReadings: critical.length,
    });
}
