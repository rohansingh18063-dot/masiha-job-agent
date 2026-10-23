// 28 states and 8 union territories of India.
export const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const norm = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

const ALIASES = {
  ap: "Andhra Pradesh", ar: "Arunachal Pradesh", as: "Assam", br: "Bihar", cg: "Chhattisgarh",
  chattisgarh: "Chhattisgarh", ga: "Goa", gj: "Gujarat", hr: "Haryana", hp: "Himachal Pradesh",
  jh: "Jharkhand", ka: "Karnataka", kl: "Kerala", mp: "Madhya Pradesh", mh: "Maharashtra",
  od: "Odisha", or: "Odisha", orissa: "Odisha", pb: "Punjab", rj: "Rajasthan", sk: "Sikkim",
  tn: "Tamil Nadu", ts: "Telangana", tg: "Telangana", telengana: "Telangana", tr: "Tripura",
  up: "Uttar Pradesh", uk: "Uttarakhand", ut: "Uttarakhand", uttaranchal: "Uttarakhand",
  wb: "West Bengal", dl: "Delhi", newdelhi: "Delhi", nctofdelhi: "Delhi", delhincr: "Delhi",
  nctdelhi: "Delhi", jk: "Jammu and Kashmir", jandk: "Jammu and Kashmir", jammukashmir: "Jammu and Kashmir",
  pondicherry: "Puducherry", py: "Puducherry", ch: "Chandigarh", andamanandnicobar: "Andaman and Nicobar Islands",
  dadraandnagarhaveli: "Dadra and Nagar Haveli and Daman and Diu", damananddiu: "Dadra and Nagar Haveli and Daman and Diu",
};

const BY_NORM = new Map([...INDIA_STATES.map((s) => [norm(s), s]), ...Object.entries(ALIASES)]);

/** Returns the official state name for common spellings and short forms, or "" if unknown. */
export function matchState(value) {
  return BY_NORM.get(norm(value)) || "";
}
