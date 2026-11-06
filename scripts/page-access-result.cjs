// Next.js streams fallback definitions in script payloads, even on allowed pages.
function inspectPageAccess(status, body, expectedTitle) {
  const html = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "");
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => match[1]
    .replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim());
  const denied = status === 403 || status === 404 || body.includes("NEXT_HTTP_ERROR_FALLBACK;404") || body.includes("NEXT_HTTP_ERROR_FALLBACK;403");
  const dataError = html.includes("Data Supabase gagal dimuat");
  return { denied, allowed: status === 200 && !denied && !dataError && headings.includes(expectedTitle), headings, dataError };
}
module.exports = { inspectPageAccess };
