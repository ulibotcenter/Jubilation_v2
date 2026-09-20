import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer"],
  // Function region is pinned in vercel.json (`regions: ["fra1"]`) and
  // `export const preferredRegion` on the root layout. Do not add a US pin.
};

export default nextConfig;
