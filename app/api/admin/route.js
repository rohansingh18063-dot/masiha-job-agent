import { requireAdmin, passwordMatches, adminPasswordProblem, startAdminSession, endAdminSession } from "@/lib/admin";
import { hit, blocked, clearLimit } from "@/lib/ratelimit";
import { allCompanies, importRows, parseCsv, deleteAllCompanies } from "@/lib/companies";
import { isXlsx, readXlsx } from "@/lib/xlsx";
import { resetPassword, accountCount } from "@/lib/auth";
import { userStats } from "@/lib/users";
import { siteUsageToday } from "@/lib/usage";
import { paymentStats } from "@/lib/payments";
import { UserError } from "@/lib/gemini";
import { handle, ok, readBody, clientIp } from "@/lib/http";

export const GET = handle(async () => {
  await requireAdmin();
  const companies = await allCompanies();
  const { visitors, profiles, contacted } = await userStats();
  const today = await siteUsageToday();

  const byState = {};
  for (const c of companies) {
    byState[c.state] ??= { companies: 0, verified: 0, cities: new Set() };
    byState[c.state].companies++;
    if (c.verified) byState[c.state].verified++;
    byState[c.state].cities.add(c.city);
  }

  return ok({
    stats: {
      visitors, accounts: await accountCount(), profiles, emailsTotal: contacted,
      emailsToday: today.sends || 0, aiToday: today.ai || 0, companies: companies.length,
      verified: companies.filter((c) => c.verified).length,
      payments: await paymentStats(),
    },
    states: Object.entries(byState)
      .map(([state, v]) => ({ state, companies: v.companies, verified: v.verified, cities: v.cities.size }))
      .sort((a, b) => b.companies - a.companies),
  });
});

export const POST = handle(async (req) => {
  const type = req.headers.get("content-type") || "";

  if (type.includes("multipart/form-data")) {
    await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") throw new UserError("Please choose an Excel (.xlsx) or CSV file.");
    if (file.size > 20 * 1024 * 1024) throw new UserError("The file is too big. Split it into parts under 20 MB.");
    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();

    let rows;
    if (isXlsx(buf)) {
      try {
        rows = readXlsx(buf);
      } catch (err) {
        console.error("xlsx read failed", err);
        throw new UserError("We could not read that Excel file. Save it again as .xlsx (or CSV) and retry.");
      }
    } else if (name.endsWith(".xls") || buf.subarray(0, 4).toString("hex") === "d0cf11e0") {
      throw new UserError("Old .xls files are not supported. In Excel choose File > Save As > Excel Workbook (.xlsx).");
    } else {
      rows = parseCsv(buf.toString("utf8").replace(/^﻿/, ""));
    }
    return ok(await importRows(rows, { replace: form.get("replace") === "1" }));
  }

  const body = await readBody(req);
  if (body.action === "login") {
    const key = `admin-ip:${clientIp(req)}`;
    if (await blocked(key, 5, 15 * 60)) throw new UserError("Too many tries. Please wait 15 minutes.", 429);
    const problem = adminPasswordProblem();
    if (problem) throw new UserError(problem, 503);
    if (!passwordMatches(String(body.password || "").slice(0, 500))) {
      await hit(key, 5, 15 * 60);
      throw new UserError("Wrong password.", 401);
    }
    await clearLimit(key);
    await startAdminSession();
    return ok({ ok: true });
  }
  if (body.action === "logout") {
    await endAdminSession();
    return ok({ ok: true });
  }
  if (body.action === "reset_password") {
    await requireAdmin();
    await resetPassword(body.username, body.password);
    return ok({ ok: true });
  }
  if (body.action === "delete_all") {
    await requireAdmin();
    await deleteAllCompanies();
    return ok({ ok: true });
  }
  throw new UserError("Unknown action.");
});
