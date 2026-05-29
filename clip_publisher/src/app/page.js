"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [quality, setQuality] = useState(2);

  const [twitchClip, setTwitchClip] = useState(null);
  const [showTwitchPicker, setShowTwitchPicker] = useState(false);
  const [twitchClips, setTwitchClips] = useState([]);
  const [twitchCursor, setTwitchCursor] = useState(null);
  const [twitchLoading, setTwitchLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Pick up a clip sent from the editor page
  useEffect(() => {
    const stored = localStorage.getItem("clipEditor_clip");
    if (!stored) return;
    try {
      const clip = JSON.parse(stored);
      setTwitchClip(clip);
      setClipName(clip.title ?? "");
      if (clip.notes) setContext(clip.notes);
    } catch {}
    localStorage.removeItem("clipEditor_clip");
  }, []);

  useEffect(() => {
    fetch("/api/connect/status")
      .then((r) => r.json())
      .then(({ connected }) => setConnected(connected ?? {}))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      alert("Sign out failed. Please try again.");
    }
  }

  function normalizeHashtags(hashtags, fallback) {
    if (!Array.isArray(hashtags) || hashtags.length === 0) return fallback;
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
        body: JSON.stringify({ clipName, game, clipType, tone, context, quality }),
      });
      const data = await response.json();
      if (!response.ok) { alert(data.error || "Failed to generate captions."); return; }

      const tiktokHashtags = normalizeHashtags(data.tiktok?.hashtags, ["#leagueoflegends", "#lolclips", "#gamingtiktok", "#twitchstreamer", "#funnygaming"]);
      const instagramHashtags = normalizeHashtags(data.instagram?.hashtags, ["#LeagueOfLegends", "#GamingReels", "#TwitchStreamer", "#StreamerMoments", "#FunnyGamingMoments"]);
      const youtubeHashtags = normalizeHashtags(data.youtube?.hashtags, ["#LeagueOfLegends", "#LoLShorts", "#GamingShorts", "#TwitchStreamer"]);
      const youtubeTags = Array.isArray(data.youtube?.tags)
        ? data.youtube.tags.join(", ")
        : "league of legends, lol shorts, gaming shorts, twitch streamer";

      setTiktok(`${data.tiktok?.caption || "This clip had me confused 💀"}\n\n${tiktokHashtags.join(" ")}`);
      setInstagram(`${data.instagram?.caption || "Another normal day on stream 💀"}\n\n${instagramHashtags.join(" ")}`);
      setYoutube(`Title:\n${data.youtube?.title || "This Clip Had Me Confused 💀"}\n\nDescription:\n${data.youtube?.description || "This gaming moment did not go how I expected."}\n\nHashtags:\n${youtubeHashtags.join(" ")}\n\nTags:\n${youtubeTags}`);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while generating captions.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyText(text) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      alert("Could not copy — please copy the text manually.");
    }
  }

  async function exportCaptions() {
    if (!tiktok && !instagram && !youtube) {
      await generateCaptions();
      return;
    }
    const content = `ClipPilot Export\n================\n\nClip:\n${clipName || "No clip selected"}\n\nTikTok\n------\n${tiktok}\n\nInstagram Reels\n---------------\n${instagram}\n\nYouTube Shorts\n--------------\n${youtube}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clip-captions.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function setStatus(platform, value) {
    setUploadStatus((prev) => ({ ...prev, [platform]: value }));
  }

  async function fetchTwitchClips(cursor = null) {
    setTwitchLoading(true);
    try {
      const url = `/api/clips/twitch?limit=20${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTwitchClips((prev) => cursor ? [...prev, ...data.clips] : data.clips);
      setTwitchCursor(data.cursor);
    } catch (err) {
      alert(err.message || "Failed to load Twitch clips.");
    } finally {
      setTwitchLoading(false);
    }
  }

  function openTwitchPicker() {
    setShowTwitchPicker(true);
    if (twitchClips.length === 0) fetchTwitchClips();
  }

  function selectTwitchClip(clip) {
    setTwitchClip(clip);
    setSelectedVideo(null);
    setClipName(clip.title);
    setShowTwitchPicker(false);
  }

  // Upload video to Supabase Storage and return the storage path.
  // Used as the first step for TikTok and Instagram uploads.
  async function uploadToStorage(onProgress) {
    if (!selectedVideo) throw new Error("No video selected");

    const res = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: selectedVideo.name }),
    });
    const { uploadUrl, path, error } = await res.json();
    if (error) throw new Error(error);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", selectedVideo.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Storage upload failed: ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Storage upload failed"));
      xhr.send(selectedVideo);
    });

    return path;
  }

  async function uploadToYouTube() {
    if (!selectedVideo) { alert("Select a video first."); return; }
    if (!youtube) { alert("Generate captions first."); return; }

    setStatus("youtube", { state: "uploading", progress: 0 });
    try {
      const titleMatch = youtube.match(/Title:\n(.+)/);
      const title = titleMatch?.[1]?.trim() || clipName || "Gaming Clip";
      const tagsMatch = youtube.match(/Tags:\n(.+)/s);
      const tags = tagsMatch
        ? tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const initRes = await fetch("/api/upload/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: youtube,
          tags,
          contentType: selectedVideo.type || "video/mp4",
          fileSize: selectedVideo.size,
        }),
      });
      const { uploadUrl, error } = await initRes.json();
      if (error) throw new Error(error);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedVideo.type || "video/mp4");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setStatus("youtube", { state: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
        };
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`YouTube upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("YouTube upload failed"));
        xhr.send(selectedVideo);
      });

      setStatus("youtube", { state: "done" });
    } catch (err) {
      setStatus("youtube", { state: "error", message: err.message });
    }
  }

  async function uploadToTikTok() {
    if (!selectedVideo && !twitchClip) { alert("Select a video first."); return; }
    if (!tiktok) { alert("Generate captions first."); return; }

    setStatus("tiktok", { state: "uploading", progress: 0 });
    try {
      let body;
      if (twitchClip) {
        setStatus("tiktok", { state: "publishing" });
        body = { caption: tiktok, videoUrl: twitchClip.videoUrl };
      } else {
        const storagePath = await uploadToStorage((p) =>
          setStatus("tiktok", { state: "uploading", progress: p })
        );
        setStatus("tiktok", { state: "publishing" });
        body = { caption: tiktok, storagePath };
      }

      const res = await fetch("/api/upload/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus("tiktok", { state: "done" });
    } catch (err) {
      setStatus("tiktok", { state: "error", message: err.message });
    }
  }

  async function uploadToInstagram() {
    if (!selectedVideo && !twitchClip) { alert("Select a video first."); return; }
    if (!instagram) { alert("Generate captions first."); return; }

    setStatus("instagram", { state: "uploading", progress: 0 });
    try {
      let body;
      if (twitchClip) {
        setStatus("instagram", { state: "processing" });
        body = { caption: instagram, videoUrl: twitchClip.videoUrl };
      } else {
        const storagePath = await uploadToStorage((p) =>
          setStatus("instagram", { state: "uploading", progress: p })
        );
        setStatus("instagram", { state: "processing" });
        body = { caption: instagram, storagePath };
      }

      // Create media container
      const containerRes = await fetch("/api/upload/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const containerData = await containerRes.json();
      if (!containerRes.ok) throw new Error(containerData.error);

      const { creation_id } = containerData;

      // Poll until Instagram finishes processing the video
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const publishRes = await fetch("/api/upload/instagram/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id }),
        });
        const publishData = await publishRes.json();
        if (!publishRes.ok) throw new Error(publishData.error);
        if (publishData.status === "done") break;
        if (publishData.status === "error") throw new Error(publishData.error);
        // still "processing" — keep polling
      }

      setStatus("instagram", { state: "done" });
    } catch (err) {
      setStatus("instagram", { state: "error", message: err.message });
    }
  }

  function getUploadHandler(platform) {
    if (!connected[platform]) {
      return () => alert(`Connect your ${platform} account in Account settings first.`);
    }
    if (platform === "youtube") {
      if (twitchClip) return () => alert("YouTube upload requires a local file. Download the clip from Twitch first, then drop it here.");
      return uploadToYouTube;
    }
    if (platform === "tiktok") return uploadToTikTok;
    if (platform === "instagram") return uploadToInstagram;
    return () => {};
  }

  return (
    <>
      <nav className="auth-nav">
        <span className="nav-brand">ClipPilot</span>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-email">{user.email}</span>
              <a href="/editor" className="secondary-btn">Editor</a>
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

          {twitchClip ? (
            <div className="twitch-selected">
              <img src={twitchClip.thumbnailUrl} alt={twitchClip.title} className="twitch-selected-thumb" />
              <div className="twitch-selected-info">
                <p className="twitch-selected-title">{twitchClip.title}</p>
                <p className="twitch-selected-meta">
                  {formatDuration(twitchClip.duration)} &middot; {twitchClip.viewCount.toLocaleString()} views
                </p>
              </div>
              <button
                type="button"
                className="twitch-selected-remove"
                onClick={() => { setTwitchClip(null); setClipName(""); }}
              >✕</button>
            </div>
          ) : (
            <DropZone
              onFile={(file) => { setClipName(file.name); setSelectedVideo(file); }}
              selectedVideo={selectedVideo}
            />
          )}

          {connected.twitch && (
            <button type="button" className="twitch-import-btn" onClick={openTwitchPicker}>
              ◉ Browse Twitch Clips
            </button>
          )}

          <div className="grid">
            <label className="field">
              <span>Game</span>
              <input
                type="text"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                placeholder="Example: League of Legends"
              />
            </label>

            <label className="field">
              <span>Clip Type</span>
              <select value={clipType} onChange={(e) => setClipType(e.target.value)}>
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
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
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
              onChange={(e) => setContext(e.target.value)}
              placeholder="Example: Chat said jumpscare and I actually panicked for no reason."
            />
          </label>

          <div className="quality-slider-wrap">
            <div className="quality-slider-header">
              <span className="quality-slider-label">Generation Quality</span>
              <span className="quality-slider-value">
                {quality === 1 ? "Fast" : quality === 2 ? "Balanced" : "Best"}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="quality-slider"
            />
            <div className="quality-slider-ticks">
              <span>Fastest</span>
              <span>Balanced</span>
              <span>Best Quality</span>
            </div>
          </div>

          <button onClick={generateCaptions} className="primary-btn" disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate AI Captions"}
          </button>
        </section>

        {Object.keys(connected).length === 0 && (
          <div className="no-connection-banner">
            <span className="no-connection-icon">⚠</span>
            <span>
              No platforms connected.{" "}
              <a href="/account" className="no-connection-link">
                Connect your accounts
              </a>{" "}
              to upload clips directly from ClipPilot.
            </span>
          </div>
        )}

        <section className="results">
          <CaptionCard
            title="TikTok"
            value={tiktok}
            setValue={setTiktok}
            onCopy={() => copyText(tiktok)}
            onUpload={getUploadHandler("tiktok")}
            uploadLabel={connected.tiktok ? "Upload to TikTok" : "Connect TikTok to upload"}
            uploadStatus={uploadStatus.tiktok}
          />
          <CaptionCard
            title="Instagram Reels"
            value={instagram}
            setValue={setInstagram}
            onCopy={() => copyText(instagram)}
            onUpload={getUploadHandler("instagram")}
            uploadLabel={connected.instagram ? "Upload to Instagram" : "Connect Instagram to upload"}
            uploadStatus={uploadStatus.instagram}
          />
          <CaptionCard
            title="YouTube Shorts"
            value={youtube}
            setValue={setYoutube}
            onCopy={() => copyText(youtube)}
            onUpload={getUploadHandler("youtube")}
            uploadLabel={connected.youtube ? "Upload to YouTube" : "Connect YouTube to upload"}
            uploadStatus={uploadStatus.youtube}
          />
        </section>
      </main>

      {showTwitchPicker && (
        <TwitchClipPicker
          clips={twitchClips}
          loading={twitchLoading}
          cursor={twitchCursor}
          onSelect={selectTwitchClip}
          onClose={() => setShowTwitchPicker(false)}
          onLoadMore={(c) => fetchTwitchClips(c)}
        />
      )}
    </>
  );
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TwitchClipPicker({ clips, loading, cursor, onSelect, onClose, onLoadMore }) {
  return (
    <div className="twitch-picker-overlay" onClick={onClose}>
      <div className="twitch-picker" onClick={(e) => e.stopPropagation()}>
        <div className="twitch-picker-header">
          <h2>Twitch Clips</h2>
          <button className="twitch-picker-close" onClick={onClose}>✕</button>
        </div>
        {loading && clips.length === 0 ? (
          <p className="twitch-picker-empty">Loading clips...</p>
        ) : clips.length === 0 ? (
          <p className="twitch-picker-empty">No clips found on your channel.</p>
        ) : (
          <>
            <div className="twitch-clip-grid">
              {clips.map((clip) => (
                <button key={clip.id} className="twitch-clip-item" onClick={() => onSelect(clip)}>
                  <div className="twitch-clip-thumb-wrap">
                    <img src={clip.thumbnailUrl} alt={clip.title} className="twitch-clip-thumb" />
                    <span className="twitch-clip-dur">{formatDuration(clip.duration)}</span>
                  </div>
                  <p className="twitch-clip-title">{clip.title}</p>
                  <p className="twitch-clip-views">{clip.viewCount.toLocaleString()} views</p>
                </button>
              ))}
            </div>
            {cursor && (
              <button
                className="secondary-btn"
                style={{ margin: "16px auto 0", display: "block" }}
                onClick={() => onLoadMore(cursor)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DropZone({ onFile, selectedVideo }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function formatSize(bytes) {
    if (!bytes) return "0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function handleFiles(files) {
    const file = files?.[0];
    if (file && file.type.startsWith("video/")) onFile(file);
  }

  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }

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

function UploadStatusBadge({ status }) {
  if (!status) return null;
  if (status.state === "uploading") {
    return <span className="upload-badge upload-badge--progress">Uploading {status.progress}%</span>;
  }
  if (status.state === "publishing") {
    return <span className="upload-badge upload-badge--progress">Publishing...</span>;
  }
  if (status.state === "processing") {
    return <span className="upload-badge upload-badge--progress">Processing...</span>;
  }
  if (status.state === "done") {
    return <span className="upload-badge upload-badge--done">Uploaded</span>;
  }
  if (status.state === "error") {
    return <span className="upload-badge upload-badge--error" title={status.message}>Failed</span>;
  }
  return null;
}

function CaptionCard({ title, value, setValue, onCopy, onUpload, uploadLabel, uploadStatus }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value.trim()) return;
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const isUploading = uploadStatus?.state === "uploading" ||
    uploadStatus?.state === "publishing" ||
    uploadStatus?.state === "processing";

  return (
    <article className="caption-card">
      <div className="caption-header">
        <h3>{title}</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <UploadStatusBadge status={uploadStatus} />
          <button onClick={handleCopy} className="copy-btn">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`${title} caption will appear here...`}
      />
      <button onClick={onUpload} className="upload-btn" disabled={isUploading}>
        {isUploading ? "Uploading..." : uploadLabel}
      </button>
    </article>
  );
}
