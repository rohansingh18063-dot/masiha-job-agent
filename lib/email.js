/** A plain ready-made email, used when we do not know the job the student wants. Uses only facts from the resume. */
export function templateDraft(profile, company, targetRole) {
  const role = targetRole || profile.headline || "a suitable role";
  const intro = profile.headline && profile.headline.toLowerCase() !== role.toLowerCase()
    ? `I am ${profile.name}, a ${profile.headline}`
    : `I am ${profile.name}`;
  const skills = profile.skills.slice(0, 3);
  return {
    subject: `${role} application - ${profile.name}`,
    body: `Dear Hiring Team at ${company.name},

${intro}, and I am writing to ask about ${role} opportunities at ${company.name}${company.city ? ` in ${company.city}` : ""}.

I would be glad to bring my skills to your team${skills.length ? `, especially ${skills.join(", ")}` : ""}. I learn quickly and work well with others.

I would be grateful to be considered for any current or upcoming opening. I have attached my resume for your reference.

Regards,
${profile.name}
${[profile.phone, profile.email].filter(Boolean).join("\n")}`,
  };
}

/** Removes the old "My resume: <link>" lines. The student attaches the PDF in Gmail instead. */
export function withoutResumeLink(body) {
  return String(body || "")
    .split("\n")
    .filter((line) => !/^\s*my resume:?\s*$/i.test(line) && !/\{\{RESUME_LINK\}\}|\/r\/[a-f0-9]{24}\b/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeDraft(d) {
  const subject = String(d?.subject || "").replace(/\s+/g, " ").trim().slice(0, 150);
  const body = withoutResumeLink(String(d?.body || "").replace(/\r/g, "")).slice(0, 2500);
  if (!subject || !body) throw new Error("Empty draft");
  return { subject, body };
}

/** Saved drafts from before this change may still hold the link line. */
export function cleanDraft(draft) {
  return draft ? { ...draft, body: withoutResumeLink(draft.body) } : null;
}
