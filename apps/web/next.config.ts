import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  transpilePackages: [
    "@serverspot/ui",
    "@serverspot/auth",
    "@serverspot/config",
    "@serverspot/db",
    "@serverspot/permissions",
    "@serverspot/spot",
    "@serverspot/storage",
    "@serverspot/store",
    "@serverspot/forum",
    "@serverspot/support",
    "@serverspot/cms",
    "@serverspot/users",
    "@serverspot/payments",
    "@serverspot/jobs",
    "@serverspot/game",
    "@serverspot/votes",
    "@serverspot/minecraft",
    "@serverspot/applications",
    "@serverspot/analytics",
    "@serverspot/developer",
    "@serverspot/discord",
  ],
};

export default nextConfig;
