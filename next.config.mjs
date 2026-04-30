/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile packages that need it
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "leaflet.markercluster"],
};

export default nextConfig;

// Updated configuration
