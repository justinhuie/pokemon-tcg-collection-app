/** @type {import('next').NextConfig} */
const nextConfig = {
  // The SQLite catalog is opened via a runtime path, so make sure it ships
  // with the serverless function that reads it.
  outputFileTracingIncludes: {
    "/api/search-cards": ["./data/app.db"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
