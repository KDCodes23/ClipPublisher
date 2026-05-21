"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube",
    description: "Upload directly to YouTube Shorts",
    connectUrl: "/api/connect/youtube",
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "Publish clips to your TikTok account",
    connectUrl: "/api/connect/tiktok",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Post Reels to your Business/Creator account",
    connectUrl: "/api/connect/instagram",
  },
];

export default function AccountPage() {
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

          <div className="platforms-list">
            {PLATFORMS.map((p) => {
              const info = connected[p.id];
              return (
                <div key={p.id} className="platform-row">
                  <div className="platform-info">
                    <span className="platform-name">{p.label}</span>
                    <span className="platform-desc">
                      {info
                        ? `Connected as ${info.username || "unknown"}`
                        : p.description}
                    </span>
                  </div>
                  {info ? (
                    <button
                      onClick={() => disconnect(p.id)}
                      className="secondary-btn"
                      disabled={disconnecting === p.id}
                    >
                      {disconnecting === p.id ? "Disconnecting..." : "Disconnect"}
                    </button>
                  ) : (
                    <a href={p.connectUrl} className="primary-btn">
                      Connect
                    </a>
                  )}
                </div>
              );
            })}
          </div>
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
