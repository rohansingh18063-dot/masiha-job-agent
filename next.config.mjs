/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), usb=(), payment=(self "https://api.razorpay.com")' },
          // "allow-popups": bank and UPI pages open from Razorpay checkout in a popup.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Browsers that saw the site over HTTPS keep using HTTPS (ignored on http://localhost).
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
