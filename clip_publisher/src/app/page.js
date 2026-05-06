"use client";

import { useState } from "react";

export default function Home() {
  const [clipName, setClipName] = useState("");
  const [game, setGame] = useState("League of Legends");
  const [clipType, setClipType] = useState("funny reaction");
  const [tone, setTone] = useState("funny");
  const [context, setContext] = useState("");

  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);

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

      const tiktokText = `${data.tiktok.caption}

${data.tiktok.hashtags.join(" ")}`;

      const instagramText = `${data.instagram.caption}

${data.instagram.hashtags.join(" ")}`;

      const youtubeText = `Title:
${data.youtube.title}

Description:
${data.youtube.description}

Hashtags:
${data.youtube.hashtags.join(" ")}

Tags:
${data.youtube.tags.join(", ")}`;

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

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">KD Creator Tool</p>
          <h1>ClipPilot</h1>
          <p className="subtitle">
            Generate TikTok, Instagram, and YouTube Shorts captions from your
            gaming clips using AI.
          </p>
        </div>

        <button onClick={exportCaptions} className="secondary-btn">
          Export All
        </button>
      </section>

      <section className="panel">
        <h2>Clip Details</h2>

        <div className="grid">
          <label className="field">
            <span>Select Clip</span>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setClipName(file ? file.name : "");
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
        />

        <CaptionCard
          title="Instagram Reels"
          value={instagram}
          setValue={setInstagram}
          onCopy={() => copyText(instagram)}
        />

        <CaptionCard
          title="YouTube Shorts"
          value={youtube}
          setValue={setYoutube}
          onCopy={() => copyText(youtube)}
        />
      </section>
    </main>
  );
}

function CaptionCard({ title, value, setValue, onCopy }) {
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
    </article>
  );
}