"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube",
    icon: "▶",
    description: "Upload directly to YouTube Shorts",
    connectUrl: "/api/connect/youtube",
    color: "#ff0000",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "♪",
    description: "Publish clips to your TikTok account",
    connectUrl: "/api/connect/tiktok",
    color: "#fe2c55",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "◈",
    description: "Post Reels to your Business or Creator account",
    connectUrl: "/api/connect/instagram",
    color: "#e1306c",
  },
  {
    id: "x",
    label: "X (Twitter)",
    icon: "✕",
    description: "Post short video clips to your X timeline",
    connectUrl: "/api/connect/x",
    color: "#000000",
  },
  {
    id: "twitch",
    label: "Twitch",
    icon: "◉",
    description: "Import clips from your Twitch channel",
    connectUrl: "/api/connect/twitch",
    color: "#9146ff",
    isSource: true,
  },
];

function AccountPageInner() {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState({});
  const [disconnecting, setDisconnecting] = useState(null);
  const [notification, setNotification] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("openai_api_key")
        .eq("id", user.id)
        .single();
      if (profile?.openai_api_key) setApiKey(profile.openai_api_key);

      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const { connected } = await res.json();
        setConnected(connected);
      }

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const connectedPlatform = searchParams.get("connected");
    const errorPlatform = searchParams.get("error");
    if (connectedPlatform) {
      setNotification(`${connectedPlatform} connected successfully.`);
      setTimeout(() => setNotification(""), 4000);
    } else if (errorPlatform) {
      setNotification(`Failed to connect: ${errorPlatform.replace("_", " ")}`);
      setTimeout(() => setNotification(""), 4000);
    }
  }, [searchParams]);

  async function saveApiKey() {
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: user.id,
      openai_api_key: apiKey,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function clearApiKey() {
    setApiKey("");
    await supabase
      .from("profiles")
      .update({ openai_api_key: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  async function disconnect(platform) {
    setDisconnecting(platform);
    await fetch("/api/connect/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    setConnected((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    setDisconnecting(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return null;

  const connectedPlatforms = PLATFORMS.filter((p) => connected[p.id]);
  const availablePlatforms = PLATFORMS.filter((p) => !connected[p.id]);

  return (
    <main className="account-page">
      <div className="account-wrap">
        <div className="account-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Your Account</h1>
          </div>
          <div className="account-header-actions">
            <a href="/" className="secondary-btn">← Back</a>
            <button onClick={signOut} className="secondary-btn">Sign Out</button>
          </div>
        </div>

        {notification && (
          <div className="notification">{notification}</div>
        )}

        <div className="panel">
          <h2>Account Info</h2>
          <p className="panel-subtitle">{user.email}</p>
        </div>

        <div className="panel">
          <h2>Connected Platforms</h2>
          <p className="panel-subtitle">
            Connect your accounts to upload clips directly from ClipPilot.
          </p>

          {connectedPlatforms.length > 0 ? (
            <div className="platform-cards">
              {connectedPlatforms.map((p) => {
                const info = connected[p.id];
                return (
                  <div key={p.id} className={`platform-card platform-card--${p.id}`}>
                    <div className="platform-card-icon">{p.icon}</div>
                    <div className="platform-card-name">{p.label}</div>
                    <div className="platform-card-desc">
                      {p.isSource
                        ? `Importing clips from ${info.username || "your channel"}`
                        : `Connected as ${info.username || "your account"}`}
                    </div>
                    <button
                      onClick={() => disconnect(p.id)}
                      className="platform-disconnect-btn"
                      disabled={disconnecting === p.id}
                    >
                      {disconnecting === p.id ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-connections-msg">No platforms connected yet. Add one below.</p>
          )}

          {availablePlatforms.length > 0 && (
            <div className="add-platform-section">
              <p className="add-platform-label">Add a platform</p>
              <div className="add-platform-list">
                {availablePlatforms.map((p) => (
                  <a
                    key={p.id}
                    href={p.connectUrl}
                    className="add-platform-item"
                    style={{ "--platform-color": p.color }}
                  >
                    <span className="add-platform-icon">{p.icon}</span>
                    <span className="add-platform-name">{p.label}</span>
                    {p.isSource && <span className="add-platform-badge">Source</span>}
                    <span className="add-platform-plus">+</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>OpenAI API Key</h2>
          <p className="panel-subtitle">
            Add your own key to use your personal OpenAI quota. Leave blank to
            use the shared server key (if configured).
          </p>

          <label className="field" style={{ marginTop: "16px" }}>
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </label>

          <div className="account-key-actions">
            <button onClick={saveApiKey} className="primary-btn" disabled={saving}>
              {saved ? "Saved!" : saving ? "Saving..." : "Save Key"}
            </button>
            {apiKey && (
              <button onClick={clearApiKey} className="secondary-btn">
                Remove Key
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountPageInner />
    </Suspense>
  );
}
