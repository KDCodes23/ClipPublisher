"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [clipName, setClipName] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [game, setGame] = useState("League of Legends");
  const [clipType, setClipType] = useState("funny reaction");
  const [tone, setTone] = useState("funny");
  const [context, setContext] = useState("");

  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [snapchat, setSnapchat] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function normalizeHashtags(hashtags, fallback) {
    if (!Array.isArray(hashtags) || hashtags.length === 0) {
      return fallback;
    }
    return hashtags
      .map((tag) => {
        const cleaned = String(tag).trim();
        if (!cleaned) return "";
        return cleaned.startsWith("#")
          ? cleaned.replace(/\s+/g, "")
          : `#${cleaned.replace(/\s+/g, "")}`;
      })
      .filter(Boolean);
  }

  async function generateCaptions() {
    try {
      setIsGenerating(true);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipName, game, clipType, tone, context }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert(data.error || "Failed to generate captions.");
        return;
      }

      const tiktokHashtags = normalizeHashtags(data.tiktok?.hashtags, [
        "#leagueoflegends", "#lolclips", "#gamingtiktok", "#twitchstreamer", "#funnygaming",
      ]);
      const instagramHashtags = normalizeHashtags(data.instagram?.hashtags, [
        "#LeagueOfLegends", "#GamingReels", "#TwitchStreamer", "#StreamerMoments", "#FunnyGamingMoments",
      ]);
      const youtubeHashtags = normalizeHashtags(data.youtube?.hashtags, [
        "#LeagueOfLegends", "#LoLShorts", "#GamingShorts", "#TwitchStreamer",
      ]);
      const snapchatHashtags = normalizeHashtags(data.snapchat?.hashtags, [
        "#gaming", "#clips", "#viral",
      ]);

      const youtubeTags = Array.isArray(data.youtube?.tags)
        ? data.youtube.tags.join(", ")
        : "league of legends, lol shorts, gaming shorts, twitch streamer";

      setTiktok(`${data.tiktok?.caption || "This clip had me confused 💀"}\n\n${tiktokHashtags.join(" ")}`);
      setInstagram(`${data.instagram?.caption || "Another normal day on stream 💀"}\n\n${instagramHashtags.join(" ")}`);
      setYoutube(`Title:\n${data.youtube?.title || "This Clip Had Me Confused 💀"}\n\nDescription:\n${data.youtube?.description || "This gaming moment did not go how I expected."}\n\nHashtags:\n${youtubeHashtags.join(" ")}\n\nTags:\n${youtubeTags}`);
      setSnapchat(`${data.snapchat?.caption || "bro what 💀"}\n\n${snapchatHashtags.join(" ")}`);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while generating captions.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyText(text) {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
  }

  async function exportCaptions() {
    if (!tiktok && !instagram && !youtube && !snapchat) {
      await generateCaptions();
      return;
    }

    const content = `ClipPilot Export
================

Clip:
${clipName || "No clip selected"}

TikTok
------
${tiktok}

Instagram Reels
---------------
${instagram}

YouTube Shorts
--------------
${youtube}

Snapchat
--------
${snapchat}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clip-captions.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleUploadPlaceholder(platform) {
    if (!selectedVideo) {
      alert("Select a video first.");
      return;
    }
    alert(`${platform} upload is the next integration step.\n\nVideo ready: ${selectedVideo.name}`);
  }

  return (
    <>
      <nav className="auth-nav">
        <span className="nav-brand">ClipPilot</span>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-email">{user.email}</span>
              <a href="/account" className="secondary-btn">Account</a>
              <button onClick={handleSignOut} className="secondary-btn">Sign Out</button>
            </>
          ) : (
            <a href="/login" className="secondary-btn">Sign In</a>
          )}
        </div>
      </nav>

      <main className="app">
        <section className="hero">
          <div>
            <p className="eyebrow">KD Creator Tool</p>
            <h1>ClipPilot</h1>
            <p className="subtitle">
              Generate platform-ready captions, hashtags, and upload prep for your gaming clips.
            </p>
          </div>
          <button onClick={exportCaptions} className="secondary-btn">Export All</button>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <div>
              <h2>Clip Details</h2>
              <p className="panel-subtitle">
                Add quick context, then generate captions for each platform.
              </p>
            </div>
          </div>

          <DropZone onFile={(file) => { setClipName(file.name); setSelectedVideo(file); }} selectedVideo={selectedVideo} />

          <div className="grid">
            <label className="field">
              <span>Game</span>
              <input
                type="text"
                value={game}
                onChange={(event) => setGame(event.target.value)}
                placeholder="Example: League of Legends"
              />
            </label>

            <label className="field">
              <span>Clip Type</span>
              <select value={clipType} onChange={(event) => setClipType(event.target.value)}>
                <option value="funny reaction">Funny Reaction</option>
                <option value="chat troll">Chat Troll</option>
                <option value="outplay">Outplay</option>
                <option value="fail">Fail</option>
                <option value="clutch moment">Clutch Moment</option>
                <option value="rage moment">Rage Moment</option>
                <option value="jumpscare">Jumpscare</option>
                <option value="unexpected moment">Unexpected Moment</option>
                <option value="streamer moment">Streamer Moment</option>
                <option value="kill steal">Kill Steal</option>
                <option value="anime reaction">Anime Reaction</option>
              </select>
            </label>

            <label className="field">
              <span>Tone</span>
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                <option value="funny">Funny</option>
                <option value="chaotic">Chaotic</option>
                <option value="clean">Clean</option>
                <option value="hype">Hype</option>
                <option value="sarcastic">Sarcastic</option>
                <option value="short and viral">Short and Viral</option>
                <option value="small streamer">Small Streamer</option>
              </select>
            </label>
          </div>


          <label className="field full">
            <span>What happened in the clip?</span>
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Example: Chat said jumpscare and I actually panicked for no reason."
            />
          </label>

          <button onClick={generateCaptions} className="primary-btn" disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate AI Captions"}
          </button>
        </section>

        <section className="results">
          <CaptionCard
            title="TikTok"
            value={tiktok}
            setValue={setTiktok}
            onCopy={() => copyText(tiktok)}
            onUpload={() => handleUploadPlaceholder("TikTok")}
            uploadLabel="Upload to TikTok"
          />
          <CaptionCard
            title="Instagram Reels"
            value={instagram}
            setValue={setInstagram}
            onCopy={() => copyText(instagram)}
            onUpload={() => handleUploadPlaceholder("Instagram")}
            uploadLabel="Upload to Instagram"
          />
          <CaptionCard
            title="YouTube Shorts"
            value={youtube}
            setValue={setYoutube}
            onCopy={() => copyText(youtube)}
            onUpload={() => handleUploadPlaceholder("YouTube")}
            uploadLabel="Upload to YouTube"
          />
          <CaptionCard
            title="Snapchat"
            value={snapchat}
            setValue={setSnapchat}
            onCopy={() => copyText(snapchat)}
            onUpload={() => handleUploadPlaceholder("Snapchat")}
            uploadLabel="Upload to Snapchat"
          />
        </section>
      </main>
    </>
  );
}

function DropZone({ onFile, selectedVideo }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useState(null);

  function formatSize(bytes) {
    if (!bytes) return "0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function handleFiles(files) {
    const file = files?.[0];
    if (file && file.type.startsWith("video/")) onFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <label
      className={`dropzone${dragging ? " dropzone--over" : ""}${selectedVideo ? " dropzone--filled" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="dropzone-input"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {selectedVideo ? (
        <div className="dropzone-filled">
          <span className="dropzone-icon">🎬</span>
          <div className="dropzone-meta">
            <span className="dropzone-filename">{selectedVideo.name}</span>
            <span className="dropzone-size">{formatSize(selectedVideo.size)}</span>
          </div>
          <span className="dropzone-change">Click to change</span>
        </div>
      ) : (
        <div className="dropzone-empty">
          <span className="dropzone-icon">📁</span>
          <span className="dropzone-prompt">Drop your clip here or <u>browse</u></span>
          <span className="dropzone-hint">MP4, MOV, AVI — any video format</span>
        </div>
      )}
    </label>
  );
}

function CaptionCard({ title, value, setValue, onCopy, onUpload, uploadLabel }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value.trim()) return;
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className="caption-card">
      <div className="caption-header">
        <h3>{title}</h3>
        <button onClick={handleCopy} className="copy-btn">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={`${title} caption will appear here...`}
      />
      <button onClick={onUpload} className="upload-btn">{uploadLabel}</button>
    </article>
  );
}
