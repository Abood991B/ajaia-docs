"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const DEMO_ACCOUNTS = [
  {
    name: "Abdulrahman Baidaq",
    email: "abdulrahman16baidaq@gmail.com",
    note: "owner of two documents",
  },
  { name: "Maya Chen", email: "maya@ajaia.test", note: "editor on the brief" },
  { name: "Sam Ortiz", email: "sam@ajaia.test", note: "viewer on the brief" },
];

const DEMO_PASSWORD = "Ajaia2026!";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Could not sign in. Try again.");
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  function fillDemoAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="login-form">
      <p className="eyebrow">Ajaia Docs</p>
      <h2
        style={{
          margin: "10px 0 6px",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        Sign in
      </h2>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--muted)" }}>
        Three seeded accounts, one shared password.
      </p>

      <form onSubmit={submit} noValidate>
        <div style={{ marginBottom: 14 }}>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@ajaia.test"
            required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error ? (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", height: 40 }}
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "24px 0 12px",
        }}
      >
        <hr className="divider" style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10 }}>
          DEMO ACCOUNTS
        </span>
        <hr className="divider" style={{ flex: 1 }} />
      </div>

      <div className="demo-list">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            className="demo-row"
            onClick={() => fillDemoAccount(account.email)}
          >
            <span style={{ display: "block" }}>
              <strong>{account.name}</strong>
              <span style={{ fontFamily: "var(--font-plex)" }}>
                {account.email}
              </span>
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{account.note}</span>
          </button>
        ))}
      </div>

      <p
        className="mono"
        style={{ marginTop: 14, lineHeight: 1.6, textTransform: "none" }}
      >
        Password for all three: <strong>{DEMO_PASSWORD}</strong>
      </p>

      <p
        className="mono"
        style={{ marginTop: 10, lineHeight: 1.6, textTransform: "none" }}
      >
        No account? <Link href="/register">Create one</Link> — new accounts can
        own documents and be shared with by email.
      </p>
    </div>
  );
}
