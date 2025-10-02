export const LS = {
  get(k, fallback = ""){ try{ return localStorage.getItem(k) ?? fallback } catch { return fallback } },
  set(k,v){ try{ localStorage.setItem(k,v) } catch {} },
  del(k){ try{ localStorage.removeItem(k) } catch {} }
};

export function parseChannels(text){
  return text.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
}

export function badgeClass(status){
  const base = "px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1";
  if (status === "live") return base + " bg-rose-600/20 text-rose-300 ring-rose-500/40";
  if (status === "upcoming") return base + " bg-amber-500/20 text-amber-300 ring-amber-400/40";
  return base + " bg-neutral-800 text-neutral-300 ring-neutral-600/50";
}

export function toZonedDateString(iso, tz){
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const [{ value: day },,{ value: month },,{ value: year }] = fmt.formatToParts(d);
  return `${year}-${month}-${day}`;
}

export function fmtTime(iso, tz){
  const d = new Date(iso);
  const df = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const dd = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", month: "short", day: "2-digit" });
  return `${df.format(d)} • ${dd.format(d)}`;
}

export function formatDayHeader(ymd, tz){
  const [y,m,da] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m-1, da));
  const dd = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "2-digit" });
  return dd.format(d);
}

export function groupByDay(items, tz){
  const map = {};
  for (const it of items){
    const d = toZonedDateString(it.startTime, tz);
    if (!map[d]) map[d] = [];
    map[d].push(it);
  }
  return map;
}

export function pickThumb(thumbnails){
  if (!thumbnails) return "https://i.ytimg.com/vi/000/default.jpg";
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url
  );
}

export function inferStatus(ls){
  if (!ls) return "past";
  if (ls.actualStartTime && !ls.actualEndTime) return "live";
  if (ls.scheduledStartTime && !ls.actualStartTime) return "upcoming";
  return "past";
}

export function normalizeVideo(v, channelId){
  const sn = v.snippet || {};
  const ls = v.liveStreamingDetails || {};
  const status = inferStatus(ls);
  const startTime = ls.scheduledStartTime || ls.actualStartTime || sn.publishedAt;
  const thumb = pickThumb(sn.thumbnails);
  return {
    id: v.id,
    channelId,
    channelTitle: sn.channelTitle,
    videoId: v.id,
    title: sn.title,
    description: sn.description,
    thumbnail: thumb,
    status,
    startTime,
  };
}
