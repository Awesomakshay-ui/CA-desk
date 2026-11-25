import { archivedNotices, areas, byDate, type Area, type Briefing, type Notice, type NoticeKind, type SourceStatus } from "./notices";

const entities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};

function decode(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return entities[name.toLowerCase()] ?? entity;
    const hex = name[1]?.toLowerCase() === "x";
    const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

function plain(html: string) {
  return decode(html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, "")
    .replace(/<a\b[^>]*>\s*(?:click here|read more)\s*<\/a>/gi, "")
    .replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function date(value: string) {
  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(value);
  const timestamp = Date.parse(dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

function officialLink(link: string, area: Area) {
  try {
    const url = new URL(decode(link.trim()), areas[area].url);
    const trusted = new URL(areas[area].url).hostname;
    return url.protocol === "https:" && url.hostname === trusted ? url.href : areas[area].url;
  } catch {
    return areas[area].url;
  }
}

function kindFor(text: string): NoticeKind {
  if (/\bdraft\b|\bproposed\b|inviting comments/i.test(text)) return "Draft";
  if (/\bcircular\b/i.test(text)) return "Circular";
  if (/\bnotification\b/i.test(text)) return "Notification";
  return /\badvisory\b/i.test(text) ? "Advisory" : "Update";
}

function topicFor(text: string, area: Area) {
  if (/e[- ]?invoic/i.test(text)) return "E-invoicing";
  if (/e[- ]?way bill/i.test(text)) return "E-way bills";
  if (/\bregistration\b/i.test(text)) return "Registration";
  if (/\btds\b|\bdeducted\b|withholding/i.test(text)) return "Withholding tax";
  if (/non[- ]?profit/i.test(text)) return "Non-profits";
  if (/\bITRs?\b|return of income|audit report/i.test(text)) return "Returns & audit";
  if (/\bCSR\b/i.test(text)) return "Corporate social responsibility";
  if (/\bNFRA\b/i.test(text)) return "Audit oversight";
  if (/annual returns|\bfiling\b/i.test(text) && area === "mca") return "ROC filings";
  return { income: "Tax administration", gst: "GST portal", mca: "Company law" }[area];
}

function record(area: Area, title: string, published: string, url: string, summary: string): Notice {
  return { id: `${area}:${published}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 125)}`, area,
    title, published, url, summary, kind: kindFor(title + " " + summary), topic: topicFor(title + " " + summary, area) };
}

function field(item: string, key: string) {
  return new RegExp(`<${key}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${key}>`, "i").exec(item)?.[1] ?? "";
}

function gstFeed(body: string) {
  const seen = new Set<string>();
  const entries: Notice[] = [];
  for (const [, item] of body.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const title = plain(field(item, "title")).replace(/^subject:\s*/i, "");
    const key = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const published = date(plain(field(item, "pubDate")));
    if (!title || !published || seen.has(key) || /revenue collections/i.test(title)) continue;
    seen.add(key);
    const url = officialLink(plain(field(item, "link")), "gst");
    const summary = plain(field(item, "description")).replace(/\s*The post .*? appeared first on .+?\.?$/i, "");
    const curated = archivedNotices.find((notice) => notice.area === "gst" &&
      (notice.url === url || notice.url === url.replace(/-2\/$/, "/")));
    entries.push(curated ?? record("gst", title, published, url, shorten(summary, 285)));
  }
  return entries;
}

function shorten(text: string, length: number) {
  if (text.length <= length) return text;
  const boundary = text.lastIndexOf(" ", length);
  return text.slice(0, boundary > 0 ? boundary : length).trimEnd() + "…";
}

function incomePage(body: string) {
  const notices: Notice[] = [];
  for (const match of body.matchAll(/<div class="up-date">\s*([^<]+)<\/div>[\s\S]*?<div class="d-flex gry-ft">([\s\S]*?)<\/div>/gi)) {
    const published = date(match[1].trim());
    const raw = match[2];
    const summary = plain(raw);
    if (!published || !summary) continue;
    const href = /<a\b[^>]*\bhref="([^"]+)"/i.exec(raw)?.[1];
    const url = href ? officialLink(href, "income") : areas.income.url;
    const reference = /(?:Notification|Circular)\s+No\.?\s*[\d]+\s*\/\s*\d{4}/i.exec(summary)?.[0];
    const normalizedRef = reference?.match(/(\d+)\s*\/\s*(\d{4})/);
    const curated = archivedNotices.find((notice) => notice.area === "income" && (notice.url === url ||
      (normalizedRef && notice.summary.includes(`${normalizedRef[1].padStart(2, "0")}/${normalizedRef[2]}`))));
    const shortTitle = shorten(summary.split(/(?<=[.!?])\s+(?=[A-Z])/)[0], 108);
    notices.push(curated ?? record("income", shortTitle, published, url, shorten(summary, 320)));
  }
  return notices;
}

function mcaPage(body: string) {
  const notices: Notice[] = [];
  for (const [, row] of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), (match) => match[1]);
    if (cells.length < 2) continue;
    const title = plain(cells[0]);
    const published = cells.map((cell) => {
      const match = /\b\d{2}[/-]\d{2}[/-]\d{4}\b/.exec(plain(cell));
      return match ? date(match[0]) : "";
    }).find(Boolean);
    if (!published || title.length < 12 || /engagement of|appointment of|recruitment of|tender/i.test(title)) continue;
    const href = Array.from(row.matchAll(/href=["']([^"']+)["']/gi), (match) => match[1])
      .find((link) => /\.pdf(?:[?#]|$)/i.test(link));
    notices.push(record("mca", title, published, href ? officialLink(href, "mca") : areas.mca.url, ""));
  }
  return notices;
}

const readers = {
  income: { url: areas.income.url, parse: incomePage },
  gst: { url: areas.gst.url + "feed/", parse: gstFeed },
  mca: { url: areas.mca.url, parse: mcaPage },
};
const lastSuccessful = new Map<Area, Notice[]>();
let recent: { result: Briefing; until: number } | undefined;
let inFlight: Promise<Briefing> | undefined;

async function load(area: Area): Promise<{ notices: Notice[]; status: SourceStatus }> {
  const reader = readers[area];
  try {
    const response = await fetch(reader.url, { signal: AbortSignal.timeout(6500), cache: "no-store" });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const notices = reader.parse(await response.text());
    if (!notices.length) throw new Error("No recognizable notices in source response");
    lastSuccessful.set(area, notices.slice(0, 16));
    return { notices: notices.slice(0, 16), status: "live" };
  } catch {
    const previous = lastSuccessful.get(area);
    return { notices: previous ?? [], status: previous ? "cached" : "snapshot" };
  }
}

async function refresh(): Promise<Briefing> {
  const [income, gst, mca] = await Promise.all([load("income"), load("gst"), load("mca")]);
  const unique = new Map<string, Notice>();
  const linked = new Set<string>();
  for (const notice of [...archivedNotices, ...income.notices, ...gst.notices, ...mca.notices]) {
    const sharedIndex = notice.url.endsWith(".html") || notice.url === areas[notice.area].url;
    if (unique.has(notice.id) || (!sharedIndex && linked.has(notice.url))) continue;
    unique.set(notice.id, notice);
    if (!sharedIndex) linked.add(notice.url);
  }
  return {
    notices: byDate([...unique.values()]),
    sources: { income: income.status, gst: gst.status, mca: mca.status },
    checkedAt: new Date().toISOString(),
  };
}

export function getBriefing(force = false) {
  if (inFlight) return inFlight;
  if (recent && recent.until > Date.now() + (force ? 14.5 * 60_000 : 0)) return Promise.resolve(recent.result);
  inFlight = refresh().then((result) => {
    recent = { result, until: Date.now() + 15 * 60_000 };
    return result;
  }).finally(() => { inFlight = undefined; });
  return inFlight;
}
