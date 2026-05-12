"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PassphraseForm({ token }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, passphrase }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      setError("Incorrect passphrase.");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="admin-passphrase-form">
      <label className="field">
        <span>Passphrase</span>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Enter admin passphrase"
          autoFocus
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? "Verifying..." : "Enter"}
      </button>
    </form>
  );
}
