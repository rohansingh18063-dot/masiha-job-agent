import { takeSiteAi } from "./usage";
import { updateUser } from "./users";
import { DAILY_AI_LIMIT_PER_USER, DAILY_AI_LIMIT_TOTAL } from "./config";
import { UserError } from "./errors";

export { UserError };

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/** Checks and counts one AI call for this user and for the whole site. */
async function takeQuota(userId) {
  const okUser = await updateUser(userId, (u) => {
    if (u.usage.ai >= DAILY_AI_LIMIT_PER_USER) return false;
    u.usage.ai += 1;
    return true;
  });
  if (!okUser) throw new UserError("You have reached today's limit. Please come back tomorrow.", 429);

  if (!(await takeSiteAi(DAILY_AI_LIMIT_TOTAL))) throw new UserError("Our free capacity for today is full. Please come back tomorrow.", 429);
}

/**
 * Calls Gemini and returns parsed JSON.
 * parts: Gemini content parts, e.g. [{ text }] or [{ inline_data: { mime_type, data } }, { text }]
 * mock: function returning the value to use when MOCK_AI=1 (local testing without a key).
 * fast: for plain copying jobs (reading an uploaded resume). Turns off the model's "thinking" step,
 *       which is most of the wait, and keeps the answer exact.
 */
export async function askGeminiJson(userId, parts, mock, { fast = false, timeoutMs = 90000 } = {}) {
  await takeQuota(userId);

  if (process.env.MOCK_AI === "1") return mock();

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new UserError("AI is not set up yet. Add GEMINI_API_KEY to the .env file.", 503);

  // Never wait forever: a slow answer is dropped and the caller decides what to do.
  const deadline = AbortSignal.timeout(timeoutMs);
  const call = (quick) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    signal: deadline,
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: quick
        ? { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } }
        : { temperature: 0.5, responseMimeType: "application/json", maxOutputTokens: 8192 },
    }),
  });

  let res;
  try {
    res = await call(fast);
    // Some models do not accept switching thinking off; ask again the normal way.
    if (fast && res.status === 400) {
      console.warn("Gemini fast mode refused, retrying normally:", (await res.text()).slice(0, 200));
      res = await call(false);
    }
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new UserError("This is taking too long right now. Please try again in a minute.", 504);
    }
    throw err;
  }

  if (res.status === 429) throw new UserError("We are a little busy right now. Please try again in a minute.", 429);
  if (!res.ok) {
    console.error("Gemini error", res.status, await res.text());
    throw new UserError("Could not finish that right now. Please try again.", 502);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    console.error("Gemini returned non-JSON", text.slice(0, 500));
    throw new UserError("Could not finish that right now. Please try again.", 502);
  }
}
