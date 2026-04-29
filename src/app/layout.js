import "./globals.css";

export const metadata = {
  title: "AquaViz — Jungle Groundwater Visualization",
  description:
    "Experience groundwater monitoring through an immersive jungle-themed 3D journey — from rainfall to aquifer recharge, powered by DWLR sensors.",
  keywords: ["groundwater", "DWLR", "water monitoring", "3D visualization", "aquifer"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
