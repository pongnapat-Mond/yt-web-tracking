import React, { useEffect, useMemo, useState } from "react";
import { LS, badgeClass, fmtTime, formatDayHeader, groupByDay, normalizeVideo, parseChannels } from "./lib";
import Admin from "./Admin";

export default function App() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  useEffect(()=>{
    const onHash = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  },[]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />
      {route.startsWith("#/admin") ? <Admin /> : <ScheduleApp />}
    </div>
  );
}

function TopNav(){
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600/20 ring-1 ring-rose-500/40">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-rose-400">
            <path d="M10.5 6a7.5 7.5 0 1 0 6 12.247V21a.75.75 0 0 0 1.28.53l2.47-2.47a.75.75 0 0 0 .22-.53v-2.19a7.5 7.5 0 0 0-9.97-9.34.75.75 0 0 0-.5.71z"/>
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">YouTube Schedule</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a href="#/" className="px-3 py-2 rounded-2xl bg-neutral-800 ring-1 ring-neutral-700">Schedule</a>
        <a href="#/admin" className="px-3 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 transition">Admin</a>
      </div>
    </div>
  );
}

function ScheduleApp() {
  const [apiKey, setApiKey] = useState(LS.get("yt_api_key") || "");
  const [channelIds, setChannelIds] = useState(LS.get("yt_channel_ids") || "");
  const [tz, setTz] = useState(LS.get("tz") || "Asia/Bangkok");
  const [hoursForward, setHoursForward] = useState(Number(LS.get("hrs_fwd")) || 72);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("grid");

  const parsedChannels = useMemo(() => parseChannels(channelIds), [channelIds]);

  async function fetchAll() {
    setIsLoading(true);
    setError("");
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() + hoursForward * 3600 * 1000);

      const perChannelPromises = parsedChannels.map(async (cid) => {
        const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        searchUrl.searchParams.set("key", apiKey);
        searchUrl.searchParams.set("channelId", cid);
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("order", "date");
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("maxResults", "30");

        const searchRes = await fetch(searchUrl.toString());
        if (!searchRes.ok) throw new Error(`search API failed for ${cid}`);
        const searchJson = await searchRes.json();
        const videoIds = (searchJson.items || []).map(i => i.id?.videoId).filter(Boolean);
        if (videoIds.length === 0) return [];

        const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        videosUrl.searchParams.set("key", apiKey);
        videosUrl.searchParams.set("id", videoIds.join(","));
        videosUrl.searchParams.set("part", "snippet,liveStreamingDetails");
        videosUrl.searchParams.set("maxResults", "50");
        const videosRes = await fetch(videosUrl.toString());
        if (!videosRes.ok) throw new Error(`videos API failed for ${cid}`);
        const videosJson = await videosRes.json();

        return (videosJson.items || []).map(v => normalizeVideo(v, cid));
      });

      const all = (await Promise.all(perChannelPromises)).flat();
      const filtered = all.filter(it => {
        if (it.status === "live") return true;
        if (it.status === "upcoming") return new Date(it.startTime) <= cutoff;
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
        return new Date(it.startTime) >= threeDaysAgo;
      });

      filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setItems(filtered);
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!apiKey || parsedChannels.length === 0) return;
    fetchAll();
    const id = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [apiKey, channelIds, hoursForward]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.title?.toLowerCase().includes(q)) ||
      (it.channelTitle?.toLowerCase().includes(q))
    );
  }, [items, query]);

  const sections = useMemo(() => groupByDay(filtered, tz), [filtered, tz]);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="rounded-3xl bg-neutral-900 ring-1 ring-neutral-800 p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 flex items-center gap-2 text-sm text-neutral-400">
          <span>Timezone: <b className="text-neutral-200 ml-1">{tz}</b></span>
          <span className="mx-2">•</span>
          <span>Look ahead: <b className="text-neutral-200 ml-1">{hoursForward}h</b></span>
          <span className="mx-2">•</span>
          <a href="#/admin" className="underline">Admin</a>
          <div className="flex-1" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title or channel…" className="w-64 px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none" />
          <button onClick={fetchAll} disabled={isLoading} className="px-4 py-2 rounded-2xl bg-neutral-800 ring-1 ring-neutral-700 ml-2">{isLoading ? "Refreshing…" : "Refresh"}</button>
          <button onClick={()=>setView(v=>v==='grid'?'list':'grid')} className="px-4 py-2 rounded-2xl bg-neutral-800 ring-1 ring-neutral-700 ml-2">{view==='grid'?'List view':'Grid view'}</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-2xl mb-4">
          <p className="font-semibold">Error</p>
          <p className="opacity-90 text-sm">{error}</p>
        </div>
      )}

      {view === "grid" ? (
        <DayGrid sections={sections} tz={tz} />
      ) : (
        <ListView items={filtered} tz={tz} />
      )}

      <Footer />
    </div>
  );
}

function DayGrid({ sections, tz }) {
  const dayKeys = Object.keys(sections);
  if (dayKeys.length === 0) return <Empty />;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dayKeys.map((day) => (
        <div key={day} className="rounded-3xl bg-neutral-900 ring-1 ring-neutral-800 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-850/60 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">{formatDayHeader(day, tz)}</h3>
            <span className="text-xs text-neutral-400">{sections[day].length} item(s)</span>
          </div>
          <div className="divide-y divide-neutral-800">
            {sections[day].map((it) => (
              <ScheduleItem key={it.id} item={it} tz={tz} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ items, tz }) {
  if (!items.length) return <Empty />;
  return (
    <div className="space-y-3">
      {items.map(it => (
        <ScheduleItem key={it.id} item={it} tz={tz} />
      ))}
    </div>
  );
}

function ScheduleItem({ item, tz }) {
  return (
    <a href={`https://www.youtube.com/watch?v=${item.videoId}`} target="_blank" rel="noreferrer"
       className="flex gap-3 p-3 hover:bg-neutral-800/60 transition">
      <img src={item.thumbnail} alt="thumb" className="w-28 h-16 rounded-xl object-cover ring-1 ring-neutral-800"/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className={badgeClass(item.status)}>{item.status.toUpperCase()}</span>
          <span className="text-neutral-400">{fmtTime(item.startTime, tz)}</span>
        </div>
        <h4 className="mt-1 font-medium leading-tight line-clamp-2">{item.title}</h4>
        <p className="text-sm text-neutral-400 truncate">{item.channelTitle}</p>
      </div>
    </a>
  );
}

function Empty(){
  return (
    <div className="text-center py-16 text-neutral-400">ไม่มี list ที่เพิ่มไว้</div>
  );
}

function Footer(){
  return (
    <div className="mt-8 text-center text-xs text-neutral-500 pb-6">
      Built with YouTube Data API v3. This is an unofficial viewer.
    </div>
  );
}
