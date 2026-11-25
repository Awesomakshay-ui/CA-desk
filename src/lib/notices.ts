export const areas = {
  income: { label: "Income Tax", source: "Income Tax Department", url: "https://www.incometax.gov.in/iec/foportal/latest-news" },
  gst: { label: "GST & Indirect Tax", source: "CGST & Customs", url: "https://cgstcustvmzone.gov.in/category/gst-news/" },
  mca: { label: "MCA & Company Law", source: "Ministry of Corporate Affairs", url: "https://www.mca.gov.in/content/mca/global/en/notifications-tender/whats-new.html" },
} as const;

export type Area = keyof typeof areas;
export type NoticeKind = "Advisory" | "Notification" | "Circular" | "Draft" | "Update";
export type Notice = {
  id: string;
  area: Area;
  kind: NoticeKind;
  topic: string;
  title: string;
  published: string;
  url: string;
  summary: string;
  audience?: string;
  action?: string;
  effective?: string;
  due?: string;
};

export type SourceStatus = "live" | "cached" | "snapshot";
export type Briefing = {
  notices: Notice[];
  sources: Record<Area, SourceStatus>;
  checkedAt: string | null;
};

const mcaCirculars = "https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/circulars.html";
const gstBase = "https://cgstcustvmzone.gov.in/";
const incomePdfs = "https://www.incometax.gov.in/iec/foportal/sites/default/files/";

export const archivedNotices: Notice[] = [
  {
    id: "mca-nfra-draft", area: "mca", kind: "Draft", topic: "Audit oversight",
    title: "MCA opens consultation on NFRA staffing rules", published: "2026-11-20", url: areas.mca.url,
    summary: "The ministry has invited comments on proposed changes to the rules governing service conditions for NFRA officers and employees.",
    audience: "Audit and regulatory professionals following NFRA governance.",
    action: "See the consultation document for the proposed changes and response instructions.",
  },
  {
    id: "gst-rcm-einvoice", area: "gst", kind: "Advisory", topic: "E-invoicing",
    title: "GSTN outlines e-invoicing changes for reverse-charge transactions", published: "2026-11-17",
    url: gstBase + "subject-advisory-on-implementation-of-e-invoicing-for-rcm-domestic-supplies-rcmdom-and-import-of-services-rcmimp-with-effect-from-1st-january-2027/",
    summary: "The advisory covers e-invoicing for specified domestic reverse-charge supplies and imports of services, with separate document types for each.",
    audience: "GST taxpayers and software teams handling the transactions covered by the advisory.",
    action: "Read the advisory to check applicability and review billing-system readiness.",
    effective: "2027-01-01",
  },
  {
    id: "mca-csr-draft", area: "mca", kind: "Draft", topic: "Corporate social responsibility",
    title: "MCA publishes draft changes to CSR rules and Schedule VII", published: "2026-11-11", url: areas.mca.url,
    summary: "The ministry published proposed amendments to Schedule VII of the Companies Act and the CSR Policy Rules.",
    audience: "Companies subject to CSR requirements and their advisers.",
    action: "Review the draft and follow the consultation before relying on any proposed changes.",
  },
  {
    id: "income-141-2026", area: "income", kind: "Notification", topic: "Withholding tax",
    title: "CBDT sets withholding treatment for certain IFSC dividends", published: "2026-11-06",
    url: incomePdfs + "2026-11/Notification-No-141-2026.pdf",
    summary: "Notification 141/2026 provides for no withholding on qualifying dividends between IFSC aircraft-leasing units, subject to the prescribed declaration.",
    audience: "IFSC units engaged in aircraft leasing that pay or receive qualifying dividends.",
    action: "Check the conditions and prescribed Form 1(N) in the notification.",
    effective: "2026-04-01",
  },
  {
    id: "gst-eway-numbering", area: "gst", kind: "Advisory", topic: "E-way bills",
    title: "E-way bill numbering formats are changing", published: "2026-11-04",
    url: gstBase + "revision-in-e-way-bill-and-consolidated-e-way-bill-numbering-formats-w-e-f-1-january-2027/",
    summary: "GSTN announced revised numbering formats for e-way bills and consolidated e-way bills, effective 1 January 2027.",
    audience: "Businesses and software providers that generate or validate e-way bills.",
    action: "Review validation and integration rules against the official formats before the change takes effect.",
    effective: "2027-01-01",
  },
  {
    id: "income-139-2026", area: "income", kind: "Notification", topic: "Non-profits",
    title: "New filing form introduced for eligible non-profit mergers", published: "2026-11-03",
    url: incomePdfs + "2026-10/Notification-No-139-2026.pdf",
    summary: "Notification 139/2026 adds Rule 189A and Form 112A for reporting mergers between registered non-profit organisations with the same or similar objects.",
    audience: "Registered non-profit organisations considering a merger and their advisers.",
    action: "Review Rule 189A and the particulars required in Form 112A.",
  },
  {
    id: "gst-registration", area: "gst", kind: "Advisory", topic: "Registration",
    title: "GST Portal updates its registration amendment process", published: "2026-11-01",
    url: gstBase + "advisory-on-key-changes-in-the-gst-registration-amendment-process/",
    summary: "GSTN has published an advisory describing changes to the online workflow for amending GST registration details.",
    audience: "Registered taxpayers and practitioners handling registration amendments.",
  },
  {
    id: "mca-cra4", area: "mca", kind: "Circular", topic: "Cost audit",
    title: "MCA grants filing relief for Form CRA-4", published: "2026-10-27", url: mcaCirculars,
    summary: "General Circular 06/2026 provides additional-fee relief and more time to file the cost audit report in XBRL format.",
    audience: "Companies required to submit the cost audit report in Form CRA-4.",
    action: "Check the circular for the revised filing window and eligibility.",
  },
  {
    id: "mca-annual-returns", area: "mca", kind: "Circular", topic: "ROC filings",
    title: "MCA extends filing time for financial statements and annual returns", published: "2026-10-24", url: mcaCirculars,
    summary: "General Circular 05/2026 extends the filing window and relaxes additional fees for eligible filings under the Companies Act.",
    audience: "Companies preparing financial statements and annual returns.",
    action: "Check the circular for the forms, period, and conditions covered.",
  },
  {
    id: "income-itr-circular", area: "income", kind: "Circular", topic: "Returns & audit",
    title: "CBDT extends certain AY 2026–27 audit and return timelines", published: "2026-09-28",
    url: "https://www.incometaxindia.gov.in/documents/d/guest/circular-7-2026",
    summary: "Circular 07/2026 moved the audit-report deadline to 21 October and the return deadline to 21 November 2026 for the covered taxpayers.",
    audience: "Taxpayers and audit filings specified in the circular.",
    due: "2026-11-21",
  },
];

export function byDate(notices: Notice[]) {
  return [...notices].sort((a, b) => b.published.localeCompare(a.published));
}

export const initialBriefing: Briefing = {
  notices: byDate(archivedNotices),
  sources: { income: "snapshot", gst: "snapshot", mca: "snapshot" },
  checkedAt: null,
};
