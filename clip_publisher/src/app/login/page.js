"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a confirmation link.");
      }
    }

    setLoading(false);
  }

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
    setMessage("");
  }

  return (
    <main className="login-page">
      {/* Left: cinematic panel — drop a looping MP4 at /public/login-bg.mp4 to replace the gradient */}
      <div className="login-cinema">
        <div className="login-cinema-bg" />
        <video
          autoPlay
          muted
          loop
          playsInline
          className="login-video"
          aria-hidden="true"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>
        <div className="login-cinema-overlay" />
        <div className="login-cinema-content">
          <p className="eyebrow">KD Creator Tool</p>
          <h1>ClipPilot</h1>
          <p className="login-cinema-tagline">
            Generate platform-ready captions, hashtags, and upload your gaming
            clips directly to TikTok, Instagram, and YouTube.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="login-form-side">
        <div className="login-form-inner">
          <p className="eyebrow">ClipPilot</p>
          <h1>{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="login-subtitle">
            {mode === "signin"
              ? "Sign in to access your clips and connected platforms."
              : "Join ClipPilot and start publishing clips faster."}
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Sign In"
                : "Sign Up"}
            </button>
          </form>

          <p className="login-toggle">
            {mode === "signin"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button onClick={switchMode} className="toggle-btn">
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
