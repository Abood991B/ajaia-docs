import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
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
            Internal tools · scoped build
          </p>
          <h1 style={{ marginTop: 14 }}>
            A document,
            <br />
            not a workspace.
          </h1>
          <p>
            One canvas. A margin that tells you the truth about your draft.
            Sharing that states exactly who can do what — and nothing else
            competing for your attention.
          </p>
        </div>

        <p
          className="mono"
          style={{ color: "rgba(255,255,255,0.42)", position: "relative", zIndex: 1 }}
        >
          Next.js · Tiptap · libSQL · four-hour timebox
        </p>
      </aside>

      <section className="login-panel">
        <LoginForm />
      </section>
    </main>
  );
}
