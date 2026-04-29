"use client";

import dynamic from "next/dynamic";

const GroundwaterMap = dynamic(
    () => import("@/components/GroundwaterMap"),
    {
        ssr: false,
        loading: () => (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                background: "#040a07",
                gap: "16px",
            }}>
                <div style={{
                    width: 44,
                    height: 44,
                    border: "3px solid rgba(61,214,140,0.1)",
                    borderTopColor: "#3dd68c",
                    borderRadius: "50%",
                    animation: "spin 0.9s linear infinite",
                }} />
                <div style={{ color: "#e4ede8", fontSize: "14px", fontWeight: 500 }}>
                    Loading Groundwater Map...
                </div>
                <div style={{ color: "rgba(228,237,232,0.35)", fontSize: "11px" }}>
                    Connecting to India WRIS ArcGIS Services
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        ),
    }
);

export default function GroundwaterMapClient() {
    return <GroundwaterMap />;
}
