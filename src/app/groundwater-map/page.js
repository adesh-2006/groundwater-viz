import GroundwaterMapClient from "./GroundwaterMapClient";

export const metadata = {
    title: "Ground Water Level Map — India WRIS Live Data",
    description:
        "Interactive groundwater monitoring map showing live data from India WRIS (indiawris.gov.in). View 90,000+ monitoring stations across India with real-time telemetric and manual groundwater level data from CGWB and state agencies.",
};

export default function GroundwaterMapPage() {
    return <GroundwaterMapClient />;
}
