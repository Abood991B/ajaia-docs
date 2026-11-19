/**
 * End-to-end API check for the collaboration features.
 *
 *   node scripts/e2e-api.mjs http://localhost:3100
 *
 * Signs in as the seeded accounts, exercises every new endpoint with the
 * permissions that should and should not be allowed, and deletes everything it
 * created. Exits non-zero if any assertion fails.
 */

const BASE = process.argv[2] ?? "http://localhost:3100";
const PASSWORD = "Ajaia2026!";
const STAMP = Date.now().toString(36);

const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  const mark = condition ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function jsonBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

class Session {
  constructor(label) {
    this.label = label;
    this.cookie = "";
  }

  async request(path, { method = "GET", body, form } = {}) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;

    let payload;
    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: payload,
      redirect: "manual",
    });

    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const entry of setCookie) {
      const [pair] = entry.split(";");
      if (pair.startsWith("ajaia_session=")) this.cookie = pair;
    }

    return { status: response.status, body: await jsonBody(response), response };
  }

  async login(email, password = PASSWORD) {
    const result = await this.request("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    check(`${this.label} can sign in`, result.status === 200, `status ${result.status}`);
    return result;
  }
}

function markdownFile(name, text) {
  const form = new FormData();
  form.append("file", new File([text], name, { type: "text/markdown" }));
  return form;
}

async function main() {
  const owner = new Session("owner");
  const stranger = new Session("stranger");
  const viewer = new Session("viewer");

  await owner.login("abdulrahman16baidaq@gmail.com");
  await stranger.login("sam@ajaia.test");

  // ---- documents ---------------------------------------------------------
  const created = await owner.request("/api/documents", {
    method: "POST",
    body: { title: `QA scratch ${STAMP}` },
  });
  check("create a scratch document", created.status === 201, `status ${created.status}`);
  const docId = created.body?.document?.id;
  if (!docId) throw new Error("No document id returned; aborting.");

  const v1 = await owner.request(`/api/documents/${docId}`, {
    method: "PATCH",
    body: {
      contentHtml: `<h1>QA scratch ${STAMP}</h1><p>alpha marker</p>`,
      contentText: `QA scratch ${STAMP} alpha marker`,
      expectedUpdatedAt: created.body.document.updatedAt,
    },
  });
  check("save first body", v1.status === 200, `status ${v1.status}`);

  const v2 = await owner.request(`/api/documents/${docId}`, {
    method: "PATCH",
    body: {
      contentHtml: `<h1>QA scratch ${STAMP}</h1><p>alpha marker</p><p>beta marker</p>`,
      contentText: `QA scratch ${STAMP} alpha marker beta marker`,
      expectedUpdatedAt: v1.body.document.updatedAt,
    },
  });
  check("save second body", v2.status === 200, `status ${v2.status}`);

  const stale = await owner.request(`/api/documents/${docId}`, {
    method: "PATCH",
    body: { contentHtml: "<p>x</p>", contentText: "x", expectedUpdatedAt: 1 },
  });
  check("stale write is rejected with 409", stale.status === 409, `status ${stale.status}`);

  check(
    "stranger gets 404, not 403, for the document",
    (await stranger.request(`/api/documents/${docId}`)).status === 404,
  );

  // ---- history -----------------------------------------------------------
  const versions = await owner.request(`/api/documents/${docId}/versions`);
  check(
    "history lists a snapshot per save",
    versions.status === 200 && versions.body.versions.length >= 2,
    `${versions.body?.versions?.length ?? 0} versions`,
  );

  const oldest = versions.body.versions.at(-1);
  const preview = await owner.request(`/api/documents/${docId}/versions/${oldest.id}`);
  check(
    "version preview returns the old body",
    preview.status === 200 && preview.body.version.contentHtml.includes("alpha"),
    `status ${preview.status}`,
  );

  const restored = await owner.request(
    `/api/documents/${docId}/versions/${oldest.id}/restore`,
    { method: "POST", body: { expectedUpdatedAt: v2.body.document.updatedAt } },
  );
  check(
    "restore rewrites the document",
    restored.status === 200 &&
      restored.body.document.contentHtml.includes("alpha") &&
      !restored.body.document.contentHtml.includes("beta"),
    `status ${restored.status}`,
  );

  const afterRestore = await owner.request(`/api/documents/${docId}/versions`);
  check(
    "restore adds a snapshot instead of deleting history",
    afterRestore.body.versions.length > versions.body.versions.length,
    `${afterRestore.body.versions.length} versions`,
  );

  // ---- comments ----------------------------------------------------------
  const contentAfterRestore = (
    await owner.request(`/api/documents/${docId}`)
  ).body.document;

  const commentId = `cmt_${STAMP}${"a".repeat(8)}`.slice(0, 24);
  const withComment = await owner.request(`/api/documents/${docId}`, {
    method: "PATCH",
    body: {
      contentHtml: contentAfterRestore.contentHtml.replace(
        "alpha marker",
        `<span data-comment-id="${commentId}">alpha marker</span>`,
      ),
      contentText: contentAfterRestore.contentText,
      expectedUpdatedAt: contentAfterRestore.updatedAt,
    },
  });
  check("save a document containing a comment mark", withComment.status === 200);

  const comment = await owner.request(`/api/documents/${docId}/comments`, {
    method: "POST",
    body: { id: commentId, body: "Please tighten this paragraph.", quotedText: "alpha marker" },
  });
  check("create a comment", comment.status === 201, `status ${comment.status}`);
  check("comment appears in the list", comment.body?.comments?.length === 1);

  const badId = await owner.request(`/api/documents/${docId}/comments`, {
    method: "POST",
    body: { id: "<script>", body: "x", quotedText: "" },
  });
  check("rejects a comment id that is not ours", badId.status === 400, `status ${badId.status}`);

  const emptyBody = await owner.request(`/api/documents/${docId}/comments`, {
    method: "POST",
    body: { id: commentId, body: "   ", quotedText: "" },
  });
  check("rejects an empty comment", emptyBody.status === 400, `status ${emptyBody.status}`);

  const resolved = await owner.request(
    `/api/documents/${docId}/comments/${commentId}`,
    { method: "PATCH", body: { resolved: true } },
  );
  check(
    "resolve sets resolvedAt",
    resolved.status === 200 && resolved.body.comments[0].resolvedAt !== null,
  );

  const deleted = await owner.request(
    `/api/documents/${docId}/comments/${commentId}`,
    { method: "DELETE" },
  );
  check("delete removes the comment", deleted.status === 200 && deleted.body.comments.length === 0);

  // ---- presence + sync ---------------------------------------------------
  const sync1 = await owner.request(`/api/documents/${docId}/sync`);
  check("sync returns the document version", sync1.status === 200 && typeof sync1.body.updatedAt === "number");
  check("sync reports no other viewers yet", Array.isArray(sync1.body.viewers) && sync1.body.viewers.length === 0);

  // ---- insert into an existing document ----------------------------------
  const inserted = await owner.request(`/api/documents/${docId}/import`, {
    method: "POST",
    form: markdownFile("insert.md", "## Gamma imported line\n\nInserted from a file."),
  });
  check(
    "insert file appends to the existing body",
    inserted.status === 200 &&
      inserted.body.document.contentHtml.includes("alpha") &&
      inserted.body.document.contentHtml.includes("Gamma imported line"),
    `status ${inserted.status}`,
  );

  // ---- search ------------------------------------------------------------
  const search = await owner.request(`/api/documents?q=Gamma%20imported`);
  const found =
    search.body?.owned?.some((entry) => entry.id === docId) ?? false;
  check("search matches text in the middle of a document", search.status === 200 && found);
  check(
    "search returns a snippet around the match",
    search.body.owned.find((entry) => entry.id === docId)?.excerpt.includes("Gamma"),
  );

  const noMatch = await owner.request(`/api/documents?q=zzz-no-such-${STAMP}`);
  check(
    "search returns no false positives",
    noMatch.body.owned.length === 0 && noMatch.body.shared.length === 0,
  );

  // ---- sign up + viewer permissions --------------------------------------
  // Registration signs the caller in, so it gets its own session object
  // rather than replacing the owner's cookie.
  const newcomer = new Session("newcomer");
  const newEmail = `qa.${STAMP}@ajaia.test`;
  const registered = await newcomer.request("/api/auth/register", {
    method: "POST",
    body: { name: "QA Probe", email: newEmail, password: "probe-password-1" },
  });
  check("register a new account", registered.status === 201, `status ${registered.status}`);

  const duplicate = await newcomer.request("/api/auth/register", {
    method: "POST",
    body: { name: "QA Probe", email: newEmail, password: "probe-password-1" },
  });
  check("duplicate email is rejected", duplicate.status === 409, `status ${duplicate.status}`);

  const weak = await newcomer.request("/api/auth/register", {
    method: "POST",
    body: { name: "QA Probe", email: `weak.${STAMP}@ajaia.test`, password: "short" },
  });
  check("short password is rejected", weak.status === 400, `status ${weak.status}`);

  await viewer.login(newEmail, "probe-password-1");

  const share = await owner.request(`/api/documents/${docId}/share`, {
    method: "POST",
    body: { email: newEmail, role: "VIEWER" },
  });
  check("share with the new account as a viewer", share.status === 200, `status ${share.status}`);

  const viewerSync = await viewer.request(`/api/documents/${docId}/sync`);
  check("viewer can read the document", viewerSync.status === 200, `status ${viewerSync.status}`);

  const ownerSync = await owner.request(`/api/documents/${docId}/sync`);
  check(
    "owner sees the other viewer in presence",
    ownerSync.body.viewers.length === 1 && ownerSync.body.viewers[0].name === "QA Probe",
    JSON.stringify(ownerSync.body.viewers),
  );

  const viewerPatch = await viewer.request(`/api/documents/${docId}`, {
    method: "PATCH",
    body: { contentHtml: "<p>hack</p>", contentText: "hack" },
  });
  check("viewer cannot write", viewerPatch.status === 403, `status ${viewerPatch.status}`);

  const viewerComment = await viewer.request(`/api/documents/${docId}/comments`, {
    method: "POST",
    body: { id: `cmt_${STAMP}${"b".repeat(8)}`.slice(0, 24), body: "hi", quotedText: "" },
  });
  check("viewer cannot comment", viewerComment.status === 403, `status ${viewerComment.status}`);

  const viewerHistory = await viewer.request(`/api/documents/${docId}/versions`);
  check("viewer can read history", viewerHistory.status === 200, `status ${viewerHistory.status}`);

  const viewerRestore = await viewer.request(
    `/api/documents/${docId}/versions/${oldest.id}/restore`,
    { method: "POST", body: {} },
  );
  check("viewer cannot restore", viewerRestore.status === 403, `status ${viewerRestore.status}`);

  const viewerShare = await viewer.request(`/api/documents/${docId}/share`, {
    method: "GET",
  });
  check("viewer cannot read the share list", viewerShare.status === 403, `status ${viewerShare.status}`);

  // ---- cleanup -----------------------------------------------------------
  const removed = await owner.request(`/api/documents/${docId}`, { method: "DELETE" });
  check("owner deletes the scratch document", removed.status === 200, `status ${removed.status}`);
  check(
    "deleted document is gone",
    (await owner.request(`/api/documents/${docId}`)).status === 404,
  );
  check(
    "sync on a deleted document is 404",
    (await owner.request(`/api/documents/${docId}/sync`)).status === 404,
  );

  // ---- report ------------------------------------------------------------
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log("Failures:");
    for (const failure of failed) console.log(`  - ${failure.name}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("E2E run failed:", error);
  process.exitCode = 1;
});
