import { NextResponse } from "next/server";

// Simulated rainfall data — in production, integrate with IMD or weather APIs
function generateHourlyRainfall(hours = 24) {
    const data = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
        const time = new Date(now - i * 3600000);
        const isNight = time.getHours() >= 22 || time.getHours() <= 5;
        const baseRain = isNight ? 2 : 5;
        const rainfall = Math.max(0, baseRain + Math.random() * 15 - 3);

        data.push({
            timestamp: time.toISOString(),
            hour: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            rainfall_mm: Math.round(rainfall * 10) / 10,
            intensity: rainfall > 15 ? "Heavy" : rainfall > 7 ? "Moderate" : rainfall > 2 ? "Light" : "Trace",
            humidity: 65 + Math.random() * 30,
            wind_speed_kmh: 5 + Math.random() * 25,
        });
    }
    return data;
}

function generateMonthlyRainfall() {
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return months.map((month, i) => {
        const isMonsoon = i >= 5 && i <= 8;
        const base = isMonsoon ? 150 : 30;
        return {
            month,
            rainfall_mm: Math.round(base + Math.random() * (isMonsoon ? 200 : 40)),
            is_monsoon: isMonsoon,
        };
    });
}

const regions = [
    { name: "Northern Plains", avg_rainfall: 185.3, trend: "+12%", status: "Above Normal" },
    { name: "Western Ghats", avg_rainfall: 342.7, trend: "+8%", status: "Normal" },
    { name: "Deccan Plateau", avg_rainfall: 92.1, trend: "-15%", status: "Below Normal" },
    { name: "Eastern Coast", avg_rainfall: 156.8, trend: "+3%", status: "Normal" },
    { name: "Thar Desert", avg_rainfall: 28.4, trend: "-22%", status: "Deficit" },
    { name: "Northeast India", avg_rainfall: 489.2, trend: "+18%", status: "Excess" },
];

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";

    if (type === "hourly") {
        return NextResponse.json({
            type: "hourly",
            data: generateHourlyRainfall(24),
            unit: "mm",
        });
    }

    if (type === "monthly") {
        return NextResponse.json({
            type: "monthly",
            data: generateMonthlyRainfall(),
            unit: "mm",
        });
    }

    // Summary
    const hourly = generateHourlyRainfall(24);
    const totalToday = hourly.reduce((sum, h) => sum + h.rainfall_mm, 0);

    return NextResponse.json({
        type: "summary",
        total_rainfall_today_mm: Math.round(totalToday * 10) / 10,
        avg_hourly_mm: Math.round((totalToday / 24) * 10) / 10,
        max_hourly_mm: Math.max(...hourly.map((h) => h.rainfall_mm)),
        current_intensity: hourly[hourly.length - 1].intensity,
        monsoon_status: "Active",
        season: "Southwest Monsoon",
        regions,
        last_updated: new Date().toISOString(),
    });
}
