"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Could not create that account.");
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
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
        Create an account
      </h2>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--muted)" }}>
        New accounts own their own documents and can be shared with by email.
      </p>

      <form onSubmit={submit} noValidate>
        <div style={{ marginBottom: 14 }}>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Rivera"
            required
          />
        </div>

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
            placeholder="you@example.com"
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
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
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p
        className="mono"
        style={{ marginTop: 16, textTransform: "none", lineHeight: 1.6 }}
      >
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
