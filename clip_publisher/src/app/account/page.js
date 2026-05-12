"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("openai_api_key")
        .eq("id", user.id)
        .single();

      if (profile?.openai_api_key) {
        setApiKey(profile.openai_api_key);
      }

      setLoading(false);
    }

    load();
  }, []);

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

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
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

        <div className="panel">
          <h2>Account Info</h2>
          <p className="panel-subtitle">{user.email}</p>
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
