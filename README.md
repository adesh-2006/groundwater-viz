# AquaViz - Groundwater Visualization Platform

AquaViz is a comprehensive, real-time groundwater monitoring and visualization platform. It integrates interactive historical data visualization, 3D mapping, and real-time sensor data from sources like India WRIS and CGWB to provide actionable insights into water quality and levels.

## Key Features

- **Real-Time Live Monitor Dashboard**: Track groundwater levels and water quality metrics live.
- **Interactive 3D Mappings**: Visualize data geographically using Three.js and dynamic maps.
- **Historical Trends**: Time-series visualization and historical data analysis for individual monitoring stations.
- **Government Data Integration**: Seamlessly pulls data from India WRIS ArcGIS analytical services and API endpoints.

## Tech Stack

- **Frontend**: Next.js, React, Three.js, CSS Modules
- **Backend**: Next.js API Routes, In-memory data store for CRUD operations
- **Data Integrations**: India WRIS, CGWB APIs

## Getting Started

First, install the dependencies if you haven't already:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## Deployment

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new). Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
