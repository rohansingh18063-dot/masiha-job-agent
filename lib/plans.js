import { canonicalCity } from "./cities";
import { UserError } from "./errors";

/*
 * Plans.
 * - Free: companies in ONE city. Students can switch that city until they send their first email from it;
 *   after that it is fixed.
 * - Paid: every city and state, for 10 or 30 days. Buying again adds the days on top.
 * Prices are in paise (₹1 = 100 paise), as Razorpay expects.
 */
export const PLANS = {
  days10: { id: "days10", days: 10, amount: 9900, label: "10 days", price: "₹99" },
  days30: { id: "days30", days: 30, amount: 19900, label: "30 days", price: "₹199" },
};

/** Payments (and so the free-city limit) are on only when Razorpay keys are set. */
export const paymentsEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const isPaid = (user) => Boolean(user.planUntil && Date.parse(user.planUntil) > Date.now());

/** What the student's plan allows, for the page. */
export function planInfo(user) {
  const limited = paymentsEnabled() && !isPaid(user);
  return {
    paymentsOn: paymentsEnabled(),
    paid: isPaid(user),
    until: isPaid(user) ? user.planUntil : null,
    limited,
    freeCity: user.freeCity ? { state: user.freeCity.state, city: user.freeCity.city, locked: Boolean(user.freeCity.lockedAt) } : null,
    plans: Object.values(PLANS).map(({ id, label, price, days }) => ({ id, label, price, days })),
  };
}

const sameCity = (a, b) => a && b && a.state === b.state && canonicalCity(a.state, a.city) === canonicalCity(b.state, b.city);

export class UpgradeNeeded extends UserError {
  constructor(message) {
    super(message, 402);
  }
}

/**
 * Which city a free student may look at for this request. Returns:
 *   { area: {state, city} }      look only here
 *   { area: null, pick: true }   no city chosen yet: ask them to pick one
 *   { set: {state, city} }       a new free city to save on the user
 * Throws UpgradeNeeded for a different city once their free city is fixed.
 */
export function freeArea(user, state, city) {
  const wanted = state && city ? { state, city: canonicalCity(state, city) } : null;
  const current = user.freeCity || null;
  if (!wanted) return current ? { area: current } : { area: null, pick: true };
  if (!current || sameCity(current, wanted)) return { area: wanted, set: current ? null : wanted };
  if (!current.lockedAt) return { area: wanted, set: wanted };
  throw new UpgradeNeeded(`The free plan covers one city: ${current.city}. Get a plan to see companies in ${wanted.city} and every other city.`);
}

/** Free students can only write to and email companies in their free city. */
export function checkCompanyAllowed(user, company) {
  if (!paymentsEnabled() || isPaid(user)) return;
  const area = user.freeCity;
  if (!area || !sameCity(area, { state: company.state, city: company.city })) {
    throw new UpgradeNeeded(`The free plan covers one city${area ? ` (${area.city})` : ""}. Get a plan to email companies in ${canonicalCity(company.state, company.city)}.`);
  }
}
