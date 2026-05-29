"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Editor() {
  const [clips, setClips] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [twitchConnected, setTwitchConnected] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);

  const [title, setTitle] = useState("");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [notes, setNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
    fetch("/api/connect/status")
      .then((r) => r.json())
      .then(({ connected }) => {
        const hasTwitch = !!(connected?.twitch);
        setTwitchConnected(hasTwitch);
        if (hasTwitch) fetchClips();
      })
      .catch(() => setTwitchConnected(false));
  }, []);

  async function fetchClips(cur = null) {
    setLoading(true);
    try {
      const url = `/api/clips/twitch?limit=20${cur ? `&cursor=${cur}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClips((prev) => (cur ? [...prev, ...data.clips] : data.clips));
      setCursor(data.cursor);
    } catch (err) {
      console.error("Failed to load clips:", err.message);
    } finally {
      setLoading(false);
    }
  }

  function selectClip(clip) {
    setSelectedClip(clip);
    setTitle(clip.title);
    setTrimStart(0);
    setTrimEnd(clip.duration);
    setNotes("");
    setCurrentTime(0);
  }

  function handleTrimStartChange(val) {
    const v = Math.min(parseFloat(val), trimEnd - 0.5);
    setTrimStart(v);
    if (videoRef.current) videoRef.current.currentTime = v;
  }

  function handleTrimEndChange(val) {
    const v = Math.max(parseFloat(val), trimStart + 0.5);
    setTrimEnd(v);
    if (videoRef.current) videoRef.current.currentTime = v;
  }

  function previewTrimStart() {
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
      videoRef.current.play();
    }
  }

  function previewTrimEnd() {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(trimEnd - 3, trimStart);
      videoRef.current.play();
    }
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    if (t >= trimEnd) videoRef.current.pause();
  }

  function openInPublisher() {
    localStorage.setItem(
      "clipEditor_clip",
      JSON.stringify({
        ...selectedClip,
        title,
        trimStart,
        trimEnd,
        notes,
      })
    );
    router.push("/");
  }

  const trimDuration = Math.max(trimEnd - trimStart, 0);

  return (
    <>
      <nav className="auth-nav">
        <span className="nav-brand">ClipPilot</span>
        <div className="nav-actions">
          <a href="/" className="secondary-btn">Publisher</a>
          <a href="/account" className="secondary-btn">Account</a>
        </div>
      </nav>

      <div className="editor-layout">
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">
            <h2>Clips</h2>
            <span className="editor-sidebar-badge">Twitch</span>
          </div>

          {twitchConnected === false && (
            <div className="editor-no-twitch">
              <p>Connect your Twitch account to browse clips.</p>
              <a href="/account" className="secondary-btn" style={{ fontSize: "0.82rem" }}>
                Go to Account
              </a>
            </div>
          )}

          {twitchConnected === true && loading && clips.length === 0 && (
            <p className="editor-sidebar-empty">Loading clips...</p>
          )}

          {twitchConnected === true && !loading && clips.length === 0 && (
            <p className="editor-sidebar-empty">No clips found on your channel.</p>
          )}

          {clips.length > 0 && (
            <div className="clip-list">
              {clips.map((clip) => (
                <button
                  key={clip.id}
                  className={`clip-list-item${selectedClip?.id === clip.id ? " clip-list-item--active" : ""}`}
                  onClick={() => selectClip(clip)}
                >
                  <div className="clip-list-thumb-wrap">
                    <img src={clip.thumbnailUrl} alt={clip.title} className="clip-list-thumb" />
                    <span className="clip-list-dur">{formatDuration(clip.duration)}</span>
                  </div>
                  <div className="clip-list-info">
                    <p className="clip-list-title">{clip.title}</p>
                    <p className="clip-list-meta">{clip.viewCount.toLocaleString()} views</p>
                  </div>
                </button>
              ))}
              {cursor && (
                <button
                  className="secondary-btn"
                  style={{ width: "100%", marginTop: 8, fontSize: "0.85rem" }}
                  onClick={() => fetchClips(cursor)}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          )}
        </aside>

        <main className="editor-main">
          {!selectedClip ? (
            <div className="editor-empty-state">
              <span className="editor-empty-icon">✂</span>
              <p className="editor-empty-text">Select a clip to start editing</p>
              <p className="editor-empty-sub">Trim, rename, and add context before publishing</p>
            </div>
          ) : (
            <div className="editor-content">
              <div className="editor-video-wrap">
                <video
                  ref={videoRef}
                  key={selectedClip.id}
                  className="editor-video"
                  controls
                  src={selectedClip.videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                />
                <div className="editor-video-overlay">
                  <span className="editor-time-badge">
                    {formatDuration(currentTime)} / {formatDuration(selectedClip.duration)}
                  </span>
                </div>
              </div>

              <div className="editor-controls">
                <div className="editor-section">
                  <label className="field">
                    <span>Clip Title</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for this clip"
                    />
                  </label>
                </div>

                <div className="editor-section trim-section">
                  <div className="trim-header">
                    <span className="trim-label">Trim</span>
                    <span className="trim-range">
                      {formatDuration(trimStart)} &ndash; {formatDuration(trimEnd)}
                      <span className="trim-duration">({formatDuration(trimDuration)})</span>
                    </span>
                  </div>

                  <div className="trim-sliders">
                    <div className="trim-slider-row">
                      <div className="trim-slider-label-row">
                        <span>In point</span>
                        <button className="trim-preview-btn" onClick={previewTrimStart} type="button">
                          Preview
                        </button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={selectedClip.duration}
                        step={0.1}
                        value={trimStart}
                        onChange={(e) => handleTrimStartChange(e.target.value)}
                        className="quality-slider"
                      />
                      <span className="trim-time-value">{formatDuration(trimStart)}</span>
                    </div>

                    <div className="trim-slider-row">
                      <div className="trim-slider-label-row">
                        <span>Out point</span>
                        <button className="trim-preview-btn" onClick={previewTrimEnd} type="button">
                          Preview
                        </button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={selectedClip.duration}
                        step={0.1}
                        value={trimEnd}
                        onChange={(e) => handleTrimEndChange(e.target.value)}
                        className="quality-slider"
                      />
                      <span className="trim-time-value">{formatDuration(trimEnd)}</span>
                    </div>
                  </div>

                  <p className="trim-note">
                    Trim points are saved as reference metadata. The full clip is sent to platforms.
                  </p>
                </div>

                <div className="editor-section">
                  <label className="field">
                    <span>Context / Notes</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What happened in this clip? This gets pre-filled in the Publisher for AI caption generation."
                      style={{ minHeight: 88 }}
                    />
                  </label>
                </div>

                <div className="clip-meta-row">
                  <span>{formatDuration(selectedClip.duration)} total</span>
                  <span>{selectedClip.viewCount.toLocaleString()} views</span>
                  <span>{new Date(selectedClip.createdAt).toLocaleDateString()}</span>
                  <span>by {selectedClip.creatorName}</span>
                  <a
                    href={selectedClip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="clip-twitch-link"
                  >
                    View on Twitch &rarr;
                  </a>
                </div>

                <button className="primary-btn" onClick={openInPublisher}>
                  Open in Publisher
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
