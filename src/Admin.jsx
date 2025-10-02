import React, { useEffect, useMemo, useState } from "react";
import { LS, parseChannels } from "./lib";

export default function Admin(){
  const [hasPin, setHasPin] = useState(!!LS.get("admin_pin"));
  const [authed, setAuthed] = useState(LS.get("admin_authed")==="1");
  const [pinInput, setPinInput] = useState("");

  useEffect(()=>{ setHasPin(!!LS.get("admin_pin")); },[]);

  function handleLogin(){
    const stored = LS.get("admin_pin");
    if (!stored){
      if (!pinInput) return alert("Set a new PIN first");
      LS.set("admin_pin", pinInput);
      LS.set("admin_authed","1");
      setAuthed(true);
      setHasPin(true);
      alert("Admin PIN set.");
      return;
    }
    if (pinInput === stored){
      LS.set("admin_authed","1");
      setAuthed(true);
    } else {
      alert("Wrong PIN");
    }
  }

  if (!authed){
    return (
      <div className="max-w-sm mx-auto mt-16 p-6 rounded-3xl bg-neutral-900 ring-1 ring-neutral-800">
        <h2 className="text-lg font-semibold mb-2">{hasPin? "Enter Admin PIN":"Set Admin PIN"}</h2>
        <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)}
          placeholder="••••••" className="w-full px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none"/>
        <button onClick={handleLogin} className="mt-3 w-full px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 transition">
          {hasPin? "Unlock":"Set PIN"}
        </button>
        <p className="text-xs text-neutral-400 mt-3">Client-side PIN in localStorage.</p>
      </div>
    );
  }

  return <AdminForm onLogout={()=>{ LS.del("admin_authed"); setAuthed(false); }} />;
}

function AdminForm({ onLogout }){
  const [apiKey, setApiKey] = useState(LS.get("yt_api_key") || "");
  const [channelIdsText, setChannelIdsText] = useState(LS.get("yt_channel_ids") || "");
  const [tz, setTz] = useState(LS.get("tz") || "Asia/Bangkok");
  const [hoursForward, setHoursForward] = useState(Number(LS.get("hrs_fwd")) || 72);

  // handle resolver
  const [handleInput, setHandleInput] = useState("");
  const [resolving, setResolving] = useState(false);

  async function resolveHandleAndAdd(){
    const h = (handleInput || "").trim();
    if (!h) return alert("กรอก @handle ก่อน");
    if (!apiKey) return alert("ต้องกรอก YouTube API key ก่อน");
    const clean = h.startsWith("@") ? h.slice(1) : h;
    setResolving(true);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/channels");
      url.searchParams.set("part","id");
      url.searchParams.set("forHandle", clean);
      url.searchParams.set("key", apiKey);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("YouTube API error");
      const json = await res.json();
      const cid = json?.items?.[0]?.id;
      if (!cid) {
        alert("ไม่พบช่องจาก handle นี้");
      } else {
        const prev = channelIdsText.trim();
        const next = prev ? (prev + "," + cid) : cid;
        setChannelIdsText(next);
        alert(`เพิ่ม Channel ID: ${cid}`);
      }
    } catch (e) {
      console.error(e);
      alert("แปลง handle ไม่สำเร็จ");
    } finally {
      setResolving(false);
    }
  }

  function saveAll(){
    LS.set("yt_api_key", apiKey);
    LS.set("yt_channel_ids", channelIdsText);
    LS.set("tz", tz);
    LS.set("hrs_fwd", String(hoursForward));
    alert("Saved ✓");
  }

  const count = useMemo(()=> parseChannels(channelIdsText).length, [channelIdsText]);

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <div className="flex items-center gap-2">
          <a href="#/" className="px-3 py-2 rounded-2xl bg-neutral-800 ring-1 ring-neutral-700">Go to Schedule</a>
          <button onClick={onLogout} className="px-3 py-2 rounded-2xl bg-neutral-800 ring-1 ring-neutral-700">Lock</button>
        </div>
      </div>

      <section className="rounded-3xl bg-neutral-900 ring-1 ring-neutral-800 p-4">
        <h2 className="font-semibold mb-2">YouTube API</h2>
        <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="AIza..." className="w-full px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none" />
        <p className="text-xs text-neutral-400 mt-1">เอาคีย์ที่ Google Cloud → YouTube Data API v3.</p>
      </section>

      <section className="rounded-3xl bg-neutral-900 ring-1 ring-neutral-800 p-4">
        <h2 className="font-semibold mb-2">Add by @handle</h2>
        <div className="flex gap-2 flex-wrap">
          <input value={handleInput} onChange={e=>setHandleInput(e.target.value)} placeholder="@handle"
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none" />
          <button onClick={resolveHandleAndAdd} disabled={resolving}
            className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 transition disabled:opacity-50">
            {resolving ? "Resolving…" : "Resolve & Add"}
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-1">ตัวอย่าง: <code>@holoen_raorapanthera</code> → ได้ Channel ID (UC…)</p>
      </section>

      <section className="rounded-3xl bg-neutral-900 ring-1 ring-neutral-800 p-4">
        <h2 className="font-semibold mb-2">Channels ({count})</h2>
        <textarea value={channelIdsText} onChange={e=>setChannelIdsText(e.target.value)} rows={8}
          className="w-full px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none"
          placeholder="UCxxxxxx, UCyyyyyy or newline-separated"/>
     
      </section>

      <section className="rounded-3xl bg-neutral-900 ring-1 ring-neutral-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-neutral-300">Timezone</label>
          <input value={tz} onChange={e=>setTz(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none" />
        </div>
        <div>
          <label className="block text-sm text-neutral-300">Look ahead (hours)</label>
          <input type="number" min={1} max={240} value={hoursForward} onChange={e=>setHoursForward(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 outline-none" />
        </div>
        <div className="flex items-end">
          <button onClick={saveAll} className="w-full px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 transition">Save Settings</button>
        </div>
      </section>

      <p className="text-xs text-neutral-500"> PIN และค่าต่าง ๆ เก็บใน localStorage ฝั่ง client</p>
    </div>
  );
}
