// Who runs the site, shown on the Contact, Terms and Refund pages (Razorpay checks these before going live).
export const BUSINESS = {
  name: process.env.BUSINESS_NAME || "Masiha",
  email: process.env.CONTACT_EMAIL || process.env.PRIVACY_CONTACT_EMAIL || "rohansingh18063@gmail.com",
  phone: process.env.CONTACT_PHONE || "",
  address: process.env.BUSINESS_ADDRESS || "",
};
