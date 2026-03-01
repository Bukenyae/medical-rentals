/** @type {import('next').NextConfig} */
const nextConfig = (() => {
  // Derive Supabase storage hostname from env at build time, so we don't have to hardcode the project ref.
  let remotePatterns = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const { hostname } = new URL(supabaseUrl);
      // Allow loading public storage objects from this Supabase project
      remotePatterns.push(
        {
          protocol: 'https',
          hostname,
          pathname: '/storage/v1/object/public/**',
        },
        {
          protocol: 'https',
          hostname,
          pathname: '/storage/v1/render/image/**',
        },
      );
    }
  } catch (_) {
    // no-op: keep default if env is missing or malformed
  }

  // Fallback: allow any Supabase project public storage hosts
  remotePatterns.push(
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/render/image/**',
    },
  );

  return {
    reactStrictMode: true,
    swcMinify: true,
    images: {
      remotePatterns,
    },
  };
})();

module.exports = nextConfig