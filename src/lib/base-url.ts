/**
 * Canonical site origin for Auth.js and absolute links.
 * On Vercel, prefer the deployment host so preview and production
 * do not each need a hard-coded AUTH_URL.
 */
export const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3001";

if (process.env.VERCEL_URL || !process.env.AUTH_URL) {
  process.env.AUTH_URL = baseUrl;
}
