import { cookies } from "next/headers";
import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import PassphraseForm from "./PassphraseForm";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_auth")?.value;
  if (!adminCookie) return false;

  const expected = createHash("sha256")
    .update(
      (process.env.ADMIN_PASSPHRASE ?? "") +
        (process.env.ADMIN_URL_TOKEN ?? "")
    )
    .digest("hex");

  return adminCookie === expected;
}

export default async function AdminPage({ params }) {
  const { token } = await params;

  if (!process.env.ADMIN_URL_TOKEN || token !== process.env.ADMIN_URL_TOKEN) {
    notFound();
  }

  const authed = await isAuthenticated();

  if (!authed) {
    return (
      <main className="admin-login-page">
        <div className="admin-login-card">
          <p className="eyebrow">Admin</p>
          <h1>ClipPilot Admin</h1>
          <p className="subtitle">Enter your passphrase to continue.</p>
          <PassphraseForm token={token} />
        </div>
      </main>
    );
  }

  // Fetch all logs for stats + table
  const supabase = createAdminClient();
  const { data: logs } = await supabase
    .from("usage_logs")
    .select("id, created_at, user_id, user_email, game, clip_type, total_tokens, input_tokens, output_tokens")
    .order("created_at", { ascending: false });

  const allLogs = logs ?? [];
  const today = new Date().toDateString();

  const totalCalls = allLogs.length;
  const totalTokens = allLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0);
  const uniqueUsers = new Set(allLogs.filter((l) => l.user_id).map((l) => l.user_id)).size;
  const callsToday = allLogs.filter(
    (l) => new Date(l.created_at).toDateString() === today
  ).length;
  const recentLogs = allLogs.slice(0, 100);

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>ClipPilot Admin</h1>
        </div>
        <a href="/" className="secondary-btn">← Back to App</a>
      </div>

      <div className="admin-stats">
        <StatCard label="Total Calls" value={totalCalls.toLocaleString()} />
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} />
        <StatCard label="Unique Users" value={uniqueUsers.toLocaleString()} />
        <StatCard label="Calls Today" value={callsToday.toLocaleString()} />
      </div>

      <div className="panel">
        <h2>Recent Generations</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Game</th>
                <th>Clip Type</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="td-time">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="td-email">{log.user_email ?? "anonymous"}</td>
                  <td>{log.game ?? "—"}</td>
                  <td>{log.clip_type ?? "—"}</td>
                  <td>{log.total_tokens?.toLocaleString() ?? "—"}</td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="td-empty">
                    No generations logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
