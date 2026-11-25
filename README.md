# CA Desk

CA Desk is a daily regulatory briefing for chartered accountants in India. Browse notices by practice area, subhead and document type, search the briefing, follow official sources and save notices on the current browser.

## Run locally

Use Node.js 20.9 or later.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). For a production build, run `npm run build` and then `npm start`.

## Notice coverage

- **Income Tax** reads the [Income Tax e-Filing latest news page](https://www.incometax.gov.in/iec/foportal/latest-news).
- **GST** reads the [CGST & Customs Thiruvananthapuram GST news feed](https://cgstcustvmzone.gov.in/category/gst-news/feed/), which republishes GSTN advisories. It does not cover every CBIC or state-level update.
- **MCA** attempts to read [MCA What's New](https://www.mca.gov.in/content/mca/global/en/notifications-tender/whats-new.html). If the site blocks automated access, the dashboard displays preloaded MCA notices and labels the source accordingly.

The API normalizes, deduplicates and sorts notices. It refreshes on demand, normally at most once every 15 minutes per server instance, and serves the most recent successful results or a dated snapshot during upstream errors. The refresh button can request a new check after 30 seconds. Curated entries include plain-language summaries and verified action or effective-date fields where available. Other entries display information from the publisher.
