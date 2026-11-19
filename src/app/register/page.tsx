import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { RegisterForm } from "@/components/RegisterForm";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="login-wrap">
      <aside className="login-aside">
        <div className="brand" style={{ color: "#fff" }}>
          <span
            className="brand-mark"
            style={{ background: "#fff", color: "var(--ink)" }}
          >
            <Logo />
          </span>
          Ajaia Docs
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
            Accounts · scoped build
          </p>
          <h1 style={{ marginTop: 14 }}>
            Your draft,
            <br />
            your name on it.
          </h1>
          <p>
            Creating an account gives you your own documents and lets an owner
            share a document with you by email. The three seeded demo accounts
            stay available on the sign-in page.
          </p>
        </div>

        <p
          className="mono"
          style={{ color: "rgba(255,255,255,0.42)", position: "relative", zIndex: 1 }}
        >
          scrypt · signed session cookie · no email verification
        </p>
      </aside>

      <section className="login-panel">
        <RegisterForm />
      </section>
    </main>
  );
}
