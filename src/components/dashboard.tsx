"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight, Bell, BookOpen, Bookmark, Building2, CalendarDays, ChevronDown, ChevronRight,
  CircleHelp, FileText, LayoutGrid, ListFilter, Menu, RefreshCw, Search, ShieldCheck, X,
} from "lucide-react";
import { areas, initialBriefing, type Area, type Briefing, type Notice } from "@/lib/notices";

const areaIcons = { income: FileText, gst: ListFilter, mca: Building2 };
const areaOrder = Object.keys(areas) as Area[];
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const shortDay = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
const todayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
const backupDate = "2026-11-25";
const sourceLabel = { live: "Live feed", cached: "Cached feed", snapshot: "Saved notices" };
const dateOf = (date: string) => new Date(date.length === 10 ? date + "T12:00:00+05:30" : date);
const keySaved = "ca-desk:saved-notices:v1";

type View = "brief" | "saved" | "action" | "sources";

function markNotice(notice: Notice, toggle: (notice: Notice) => void, saved: boolean) {
  return (
    <button className={`icon-button bookmark-button ${saved ? "marked" : ""}`} onClick={() => toggle(notice)}
      type="button" aria-label={saved ? "Remove saved notice" : "Save notice"} aria-pressed={saved}
      title={saved ? "Remove saved notice" : "Save notice"}>
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function NoticeCard({ notice, open, toggle, saved }: {
  notice: Notice; open: (notice: Notice) => void; toggle: (notice: Notice) => void; saved: boolean;
}) {
  const AreaIcon = areaIcons[notice.area];
  return (
    <article className="notice-card">
      <div className={`notice-icon ${notice.area}`}><AreaIcon size={18} aria-hidden /></div>
      <div className="notice-body">
        <div className="notice-meta">
          <span className={`category ${notice.area}`}>{areas[notice.area].label}</span>
          <span className="meta-dot" />
          <span>{notice.kind}</span>
          <time dateTime={notice.published}>{dateFormat.format(dateOf(notice.published))}</time>
        </div>
        <h3><button type="button" onClick={() => open(notice)}>{notice.title}</button></h3>
        {notice.summary && <p>{notice.summary}</p>}
        <div className="notice-foot">
          <span className="topic">{notice.topic}</span>
          {(notice.effective || notice.due) && (
            <span className="notice-date"><CalendarDays size={13} /> {notice.due ? "Due" : "Effective"} {dateFormat.format(dateOf((notice.due ?? notice.effective)!))}</span>
          )}
          <button className="notice-read" type="button" onClick={() => open(notice)}>Read notice <ChevronRight size={14} /></button>
        </div>
      </div>
      {markNotice(notice, toggle, saved)}
    </article>
  );
}

function NoticeDetails({ notice, close, toggle, saved }: {
  notice: Notice | null; close: () => void; toggle: (notice: Notice) => void; saved: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (notice && !dialog.current?.open) dialog.current?.showModal();
    if (!notice && dialog.current?.open) dialog.current.close();
  }, [notice]);

  return (
    <dialog ref={dialog} className="notice-dialog" onClose={close} aria-labelledby="detail-title">
      {notice && (
        <>
          <div className="dialog-top">
            <span className={`category ${notice.area}`}>{areas[notice.area].label}</span>
            <button className="icon-button" onClick={close} aria-label="Close notice"><X size={21} /></button>
          </div>
          <p className="dialog-meta">{notice.kind} · {dateFormat.format(dateOf(notice.published))} · {notice.topic}</p>
          <h2 id="detail-title">{notice.title}</h2>
          {notice.summary && <p className="dialog-summary">{notice.summary}</p>}
          {(notice.audience || notice.action || notice.effective || notice.due) && (
            <dl className="details-grid">
              {notice.audience && <div><dt>Who is affected</dt><dd>{notice.audience}</dd></div>}
              {notice.action && <div><dt>What to do</dt><dd>{notice.action}</dd></div>}
              {notice.effective && <div><dt>Effective date</dt><dd>{dateFormat.format(dateOf(notice.effective))}</dd></div>}
              {notice.due && <div><dt>Filing deadline</dt><dd>{dateFormat.format(dateOf(notice.due))}</dd></div>}
            </dl>
          )}
          <div className="dialog-actions">
            <a className="primary-button" href={notice.url} target="_blank" rel="noreferrer">Open official source <ArrowUpRight size={16} /></a>
            {markNotice(notice, toggle, saved)}
          </div>
        </>
      )}
    </dialog>
  );
}

export function Dashboard() {
  const [briefing, setBriefing] = useState(initialBriefing);
  const [view, setView] = useState<View>("brief");
  const [area, setArea] = useState<Area | "all">("all");
  const [saved, setSaved] = useState<Notice[]>([]);
  const [selected, setSelected] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("All types");
  const [topic, setTopic] = useState("All subheads");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [today, setToday] = useState(backupDate);
  const [visibleCount, setVisibleCount] = useState(8);
  const searchRef = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);

  const reload = useCallback(async (force = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(false);
    try {
      const response = await fetch(force ? "/api/notices?refresh=1" : "/api/notices", { signal: controller.signal });
      if (!response.ok) throw new Error("Could not refresh notices.");
      const result: Briefing = await response.json();
      if (!controller.signal.aborted) setBriefing(result);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }, []);

  useEffect(() => {
    const start = window.setTimeout(() => {
      setToday(todayFormat.format(new Date()));
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(keySaved) ?? "[]");
        if (Array.isArray(stored)) setSaved(stored.filter((item): item is Notice =>
          item && typeof item.id === "string" && Object.hasOwn(areas, item.area)));
      } catch {}
      void reload();
    }, 0);
    return () => {
      window.clearTimeout(start);
      request.current?.abort();
    };
  }, [reload]);

  function toggle(notice: Notice) {
    const next = saved.some((item) => item.id === notice.id) ? saved.filter((item) => item.id !== notice.id) : [...saved, notice];
    setSaved(next);
    try { localStorage.setItem(keySaved, JSON.stringify(next)); } catch {}
  }

  function navigate(next: View, filter: Area | "all" = "all") {
    setView(next);
    setArea(filter);
    setKind("All types");
    setTopic("All subheads");
    setSearch("");
    setVisibleCount(8);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function filterArea(filter: Area | "all") {
    setArea(filter);
    setTopic("All subheads");
    setVisibleCount(8);
  }

  function jumpToSearch() {
    if (view === "sources") {
      navigate("brief");
      window.requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      searchRef.current?.focus();
    }
  }

  const list = view === "saved" ? saved.map((notice) => briefing.notices.find((item) => item.id === notice.id) ?? notice)
    : view === "action" ? briefing.notices.filter((notice) => notice.action || notice.due || notice.effective) : briefing.notices;
  const scoped = list.filter((notice) => area === "all" || notice.area === area);
  const topics = [...new Set(scoped.map((notice) => notice.topic))].sort();
  const query = search.trim().toLowerCase();
  const filtered = scoped.filter((notice) => (kind === "All types" || notice.kind === kind) &&
    (topic === "All subheads" || notice.topic === topic) &&
    [notice.title, notice.summary, notice.topic, notice.kind, areas[notice.area].label].join(" ").toLowerCase().includes(query));
  const dueSoon = briefing.notices.flatMap((notice) => {
    const date = notice.due ?? notice.effective;
    return date && date >= today ? [{ notice, date }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const showingBrief = view === "brief" && area === "all";
  const title = view === "saved" ? "Saved notices" : view === "action" ? "Action watch" :
    view === "sources" ? "Official sources" : area === "all" ? "Latest notices" : areas[area].label;
  const nav = (label: string, icon: ReactNode, target: View, filter: Area | "all" = "all", count?: number) => (
    <button className={`nav-link ${view === target && area === filter ? "active" : ""}`}
      aria-current={view === target && area === filter ? "page" : undefined} onClick={() => navigate(target, filter)}>
      {icon}<span>{label}</span>{count !== undefined && count > 0 && <small>{count}</small>}
    </button>
  );

  return (
    <div className="desk">
      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => navigate("brief")} aria-label="CA Desk home">
          <span className="brand-icon"><BookOpen size={22} strokeWidth={1.7} /></span>
          <span><strong>CA Desk</strong><small>Practice Intelligence</small></span>
        </button>
        <nav aria-label="Dashboard">
          <div className="nav-group">
            <span className="nav-label">WORKSPACE</span>
            {nav("Daily Brief", <LayoutGrid size={17} />, "brief")}
            {nav("Action Watch", <Bell size={17} />, "action")}
            {nav("Saved Notices", <Bookmark size={17} />, "saved", "all", saved.length)}
          </div>
          <div className="nav-group">
            <span className="nav-label">PRACTICE AREAS</span>
            {areaOrder.map((key) => {
              const Icon = areaIcons[key];
              return <div key={key}>{nav(areas[key].label, <Icon size={17} />, "brief", key)}</div>;
            })}
          </div>
          <div className="nav-group">
            <span className="nav-label">REFERENCE</span>
            {nav("Official Sources", <ShieldCheck size={17} />, "sources")}
          </div>
        </nav>
        <button className="sidebar-footer" onClick={() => navigate("sources")}>
          <CircleHelp size={17} /> <span>About this briefing</span><ChevronRight size={15} />
        </button>
      </aside>
      <div className="workbench">
        <header className="topbar">
          <div className="crumb">
            <button className="icon-button mobile-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav}><Menu size={22} /></button>
            <span>Workspace</span><ChevronRight size={14} /><strong>{showingBrief ? "Daily Brief" : title}</strong>
          </div>
          <div className="top-actions">
            <button className="top-search" onClick={jumpToSearch} aria-label="Focus notice search"><Search size={17} /><span>Search notices</span></button>
            <button className="icon-button refresh-button" onClick={() => void reload(true)} disabled={pending} aria-label="Refresh official feeds" title="Refresh official feeds"><RefreshCw size={17} className={pending ? "spin" : ""} /></button>
          </div>
        </header>

        <main className="workspace">
          {showingBrief && (
            <section className="hero" aria-labelledby="brief-title">
              <div className="hero-pattern" aria-hidden />
              <div className="hero-content">
                <p className="hero-date"><CalendarDays size={15} /> {dayFormat.format(dateOf(today))}</p>
                <h1 id="brief-title">The Daily <em>Brief.</em></h1>
                <p className="hero-description">India’s regulatory updates for chartered accountants.</p>
                <div className="hero-sources"><ShieldCheck size={15} /> Income Tax · GST · MCA</div>
              </div>
              <div className="hero-initial" aria-hidden>CA<span>.</span></div>
            </section>
          )}

          <div className={`content-layout ${view === "sources" ? "sources-view" : ""}`}>
            <section className="feed" aria-labelledby="feed-title">
              <div className="feed-heading">
                <div>
                  {showingBrief ? <h2 id="feed-title">{title}</h2> : <h1 id="feed-title">{title}</h1>}
                  <p>{view === "saved" ? "Notices you’ve bookmarked on this device." : view === "action" ? "Filing dates, effective dates, and changes to review." :
                    view === "sources" ? "Check the publishers and their latest refresh status." : "Recent circulars, notifications, advisories, and drafts."}</p>
                </div>
                {view !== "sources" && <span className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "notice" : "notices"}</span>}
              </div>
              {view === "sources" ? (
                <div className="source-list">
                  {areaOrder.map((key) => <div className="source-detail" key={key}>
                    <div><h3>{areas[key].label}</h3><p>{areas[key].source}</p></div>
                    <span className={`source-state ${briefing.sources[key]}`}>{sourceLabel[briefing.sources[key]]}</span>
                    <a href={areas[key].url} target="_blank" rel="noreferrer">Publisher <ArrowUpRight size={15} /></a>
                  </div>)}
                  <p className="source-explanation">Live feeds are checked when the briefing opens. When a source is unavailable, CA Desk shows its last successful response or saved notices. Dates on notices reflect their official publication or listing.</p>
                  <button className="outline-button" disabled={pending} onClick={() => void reload(true)}><RefreshCw size={15} /> {pending ? "Checking sources…" : "Check sources"}</button>
                </div>
              ) : (
                <>
                  <div className="filter-row" aria-label="Practice areas">
                    <button type="button" className={`filter-pill ${area === "all" ? "chosen" : ""}`} aria-pressed={area === "all"} onClick={() => filterArea("all")}>All notices</button>
                    {areaOrder.map((key) => <button type="button" key={key} className={`filter-pill ${area === key ? "chosen" : ""}`} aria-pressed={area === key} onClick={() => filterArea(key)}>{areas[key].label}</button>)}
                  </div>
                  <div className="search-row">
                    <label className="search-box"><Search size={16} /><span className="sr-only">Search notices</span><input ref={searchRef} type="search" placeholder="Search notices…" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(8); }} /></label>
                    <label className="select-box"><span className="sr-only">Notice type</span><select value={kind} onChange={(e) => { setKind(e.target.value); setVisibleCount(8); }}>
                      {["All types", "Advisory", "Notification", "Circular", "Draft", "Update"].map((item) => <option key={item}>{item}</option>)}
                    </select><ChevronDown size={14} /></label>
                    <label className="select-box subhead"><span className="sr-only">Subhead</span><select value={topic} onChange={(e) => { setTopic(e.target.value); setVisibleCount(8); }}>
                      {["All subheads", ...topics].map((item) => <option key={item}>{item}</option>)}
                    </select><ChevronDown size={14} /></label>
                  </div>
                  {error && <p className="inline-status" role="status">Refresh unavailable. Showing saved notices.</p>}
                  <div className="notice-list">
                    {filtered.slice(0, visibleCount).map((notice) => <NoticeCard key={notice.id} notice={notice} open={setSelected} toggle={toggle} saved={saved.some((item) => item.id === notice.id)} />)}
                    {filtered.length === 0 && <div className="empty"><Bookmark size={24} /><h3>{view === "saved" && saved.length === 0 ? "No saved notices yet" : "No notices match these filters"}</h3>
                      <p>{view === "saved" && saved.length === 0 ? "Use the bookmark on a notice to keep it here." : "Try a different search or clear your filters."}</p>
                      <button className="outline-button" onClick={() => navigate(view === "saved" && saved.length === 0 ? "brief" : view)}>{view === "saved" && saved.length === 0 ? "Browse notices" : "Clear filters"}</button></div>}
                  </div>
                  {filtered.length > visibleCount && <button className="outline-button show-more" onClick={() => setVisibleCount(visibleCount + 8)}>Show more notices</button>}
                </>
              )}
            </section>

            {view !== "sources" && <aside className="right-rail" aria-label="Dates and sources">
              <section className="rail-card">
                <div className="rail-heading"><span className="rail-icon"><CalendarDays size={18} /></span><h2>Dates to watch</h2></div>
                {dueSoon.length ? <div className="date-list">{dueSoon.map(({ notice, date }) => {
                  const [day, month] = shortDay.format(dateOf(date)).split(" ");
                  return <button type="button" className="date-row" key={notice.id} onClick={() => setSelected(notice)}>
                    <time dateTime={date}><span>{month}</span><strong>{day}</strong></time>
                    <span><strong>{notice.topic}</strong><small>{notice.due ? "Filing deadline" : "Takes effect"} · {notice.area === "gst" ? "GST" : areas[notice.area].label}</small></span>
                    <ChevronRight size={15} />
                  </button>;
                })}</div> : <p className="rail-empty">No upcoming dates in the notices currently tracked.</p>}
                <button className="rail-link" onClick={() => navigate("action")}>View action watch <ChevronRight size={15} /></button>
              </section>
              <section className="rail-card sources-card">
                <div className="rail-heading"><span className="rail-icon"><ShieldCheck size={18} /></span><h2>Official sources</h2></div>
                <div className="source-rows">{areaOrder.map((key) => (
                  <a href={areas[key].url} target="_blank" rel="noreferrer" className="source-row" key={key}>
                    <span>{key === "income" ? "Income Tax Department" : key === "gst" ? "CGST & Customs" : "MCA"}</span>
                    <span className={`source-state ${briefing.sources[key]}`}>{sourceLabel[briefing.sources[key]]}</span><ArrowUpRight size={13} />
                  </a>
                ))}</div>
                <p className="feed-status" aria-live="polite">{pending ? "Checking official feeds…" : briefing.checkedAt ? `Checked ${dateFormat.format(dateOf(briefing.checkedAt))}` : "Showing saved notices"}</p>
              </section>
            </aside>}
          </div>
        </main>
      </div>
      <NoticeDetails notice={selected} close={() => setSelected(null)} toggle={toggle} saved={!!selected && saved.some((item) => item.id === selected.id)} />
    </div>
  );
}
