export const DAILY_SEND_LIMIT = Number(process.env.DAILY_SEND_LIMIT || 20);
export const DAILY_AI_LIMIT_PER_USER = Number(process.env.DAILY_AI_LIMIT_PER_USER || 40);
export const DAILY_AI_LIMIT_TOTAL = Number(process.env.DAILY_AI_LIMIT_TOTAL || 1000);
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "http://localhost:8000";

export { INDIA_STATES } from "./states";
