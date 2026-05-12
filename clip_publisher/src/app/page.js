"use client";

import { useState } from "react";

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

  function formatFileSize(bytes) {
    if (!bytes) return "0 MB";

    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clipName,
          game,
          clipType,
          tone,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        alert(data.error || "Failed to generate captions.");
        return;
      }

      const tiktokHashtags = normalizeHashtags(data.tiktok?.hashtags, [
        "#leagueoflegends",
        "#lolclips",
        "#gamingtiktok",
        "#twitchstreamer",
        "#funnygaming",
      ]);

      const instagramHashtags = normalizeHashtags(data.instagram?.hashtags, [
        "#LeagueOfLegends",
        "#GamingReels",
        "#TwitchStreamer",
        "#StreamerMoments",
        "#FunnyGamingMoments",
      ]);

      const youtubeHashtags = normalizeHashtags(data.youtube?.hashtags, [
        "#LeagueOfLegends",
        "#LoLShorts",
        "#GamingShorts",
        "#TwitchStreamer",
      ]);

      const youtubeTags = Array.isArray(data.youtube?.tags)
        ? data.youtube.tags.join(", ")
        : "league of legends, lol shorts, gaming shorts, twitch streamer";

      const tiktokText = `${data.tiktok?.caption || "This clip had me confused 💀"}

${tiktokHashtags.join(" ")}`;

      const instagramText = `${data.instagram?.caption || "Another normal day on stream 💀"}

${instagramHashtags.join(" ")}`;

      const youtubeText = `Title:
${data.youtube?.title || "This Clip Had Me Confused 💀"}

Description:
${data.youtube?.description || "This gaming moment did not go how I expected."}

Hashtags:
${youtubeHashtags.join(" ")}

Tags:
${youtubeTags}`;

      setTiktok(tiktokText);
      setInstagram(instagramText);
      setYoutube(youtubeText);
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
    if (!tiktok && !instagram && !youtube) {
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
`;

    const blob = new Blob([content], {
      type: "text/plain",
    });

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

    alert(
      `${platform} upload is the next integration step.\n\nVideo ready: ${selectedVideo.name}`
    );
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">KD Creator Tool</p>
          <h1>ClipPilot</h1>
          <p className="subtitle">
            Generate platform-ready captions, hashtags, and upload prep for your
            gaming clips.
          </p>
        </div>

        <button onClick={exportCaptions} className="secondary-btn">
          Export All
        </button>
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

        <div className="grid">
          <label className="field">
            <span>Select Clip</span>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];

                setClipName(file ? file.name : "");
                setSelectedVideo(file || null);
              }}
            />
          </label>

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
            <select
              value={clipType}
              onChange={(event) => setClipType(event.target.value)}
            >
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
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
            >
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

        {selectedVideo && (
          <div className="file-preview">
            <div>
              <p className="file-label">Selected Video</p>
              <p className="file-name">{selectedVideo.name}</p>
            </div>

            <span className="file-size">{formatFileSize(selectedVideo.size)}</span>
          </div>
        )}

        <label className="field full">
          <span>What happened in the clip?</span>
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Example: Chat said jumpscare and I actually panicked for no reason."
          />
        </label>

        <button
          onClick={generateCaptions}
          className="primary-btn"
          disabled={isGenerating}
        >
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
      </section>
    </main>
  );
}

function CaptionCard({ title, value, setValue, onCopy, onUpload, uploadLabel }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value.trim()) return;

    await onCopy();
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1200);
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

      <button onClick={onUpload} className="upload-btn">
        {uploadLabel}
      </button>
    </article>
  );
}