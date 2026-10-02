// <tdz-account> — sign-in / account menu for every tandat17z site, backed by Cloudflare Access.
// Self-contained (no dependencies, no build); each site keeps its own copy of this file.
// Canonical copy: hub/public/account.js — change it there, then copy it to the other sites.
//
// Attributes:
//   lang        "vi" (default) | "en"
//   login-url   where "Sign in" points (an Access-protected path, e.g. "/login/"). Without it,
//               nothing is shown when nobody is signed in (sites fully behind Access).
//   admin-url   optional endpoint returning 200 for admins / 403 otherwise, to show admin rights.
//   me-url      optional fallback returning { email } when Access identity is unavailable (dev).
//
// Identity comes from /cdn-cgi/access/get-identity on the current host; sign-out uses
// /cdn-cgi/access/logout. No tokens are read or stored here.
(() => {
  if (customElements.get("tdz-account")) return;

  const TEXT = {
    vi: { signIn: "Đăng nhập", signOut: "Đăng xuất", account: "Tài khoản", via: "Đăng nhập qua", admin: "Quyền quản trị", yes: "Có", no: "Không" },
    en: { signIn: "Sign in", signOut: "Sign out", account: "Account", via: "Signed in with", admin: "Admin rights", yes: "Yes", no: "No" },
  };

  const initials = (name, email) => {
    const words = (name || email).split(/[\s@._-]+/).filter(Boolean);
    return (name ? [words[0], words.at(-1)] : [words[0]]).map((w) => (w ? w[0] : "")).join("").toUpperCase();
  };

  const getJson = async (url) => {
    try {
      const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
      return { status: res.status, body: res.ok ? await res.json() : null };
    } catch {
      return { status: 0, body: null };
    }
  };

  // Colors follow each site's CSS variables when present (hub/DaFinance/web names, then DaTra's
  // --ink/--border), with the shared dark palette as the last fallback.
  const CSS = `
    :host { position: relative; display: inline-flex; font: 500 13px/1.4 var(--font-sans, var(--sans, ui-sans-serif, system-ui, sans-serif)); color: var(--fg, var(--ink, #e7e9ec)); }
    button, a { font: inherit; color: inherit; }
    .login { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-strong, var(--border, #2d3239)); text-decoration: none; }
    .login:hover, .logout:hover { background: var(--surface-2, #14171b); }
    .avatar { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); background: var(--surface-2, #14171b); color: var(--accent, #7ee0c3);
      font: 600 12px/1 var(--font-mono, var(--mono, ui-monospace, monospace)); }
    .avatar.warn { border-color: #f2c46d99; color: #f2c46d; }
    .avatar:focus-visible, .login:focus-visible, .logout:focus-visible { outline: 2px solid var(--accent, #7ee0c3); outline-offset: 2px; }
    .panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: 272px; padding: 16px; border-radius: 12px;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); background: var(--surface, #0f1114); box-shadow: 0 16px 40px #0008; }
    .who { display: flex; gap: 12px; align-items: center; }
    .who .avatar { width: 40px; height: 40px; cursor: default; font-size: 14px; }
    .name { font-weight: 600; }
    .email { color: var(--muted, #9ba2ac); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who > div { min-width: 0; }
    dl { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid var(--border, #1f2328); font-size: 12px; display: grid; gap: 6px; }
    dl div { display: flex; justify-content: space-between; gap: 12px; }
    dt { color: var(--subtle, var(--muted, #8a919c)); } dd { margin: 0; color: var(--muted, #9ba2ac); }
    dd.yes { color: var(--accent, #7ee0c3); } dd.no { color: #f2c46d; }
    .logout { display: flex; align-items: center; justify-content: center; height: 36px; margin-top: 14px; border-radius: 8px;
      border: 1px solid var(--border-strong, var(--border, #2d3239)); text-decoration: none; }
    [hidden] { display: none !important; }
  `;

  class TdzAccount extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: "open" }).innerHTML = `<style>${CSS}</style>`;
      this.t = TEXT[this.getAttribute("lang") === "en" ? "en" : "vi"];
      this.load();
    }

    async load() {
      const identity = await getJson("/cdn-cgi/access/get-identity");
      let email = identity.body?.email;
      let name = identity.body?.name;
      const meUrl = this.getAttribute("me-url");
      if (!email && meUrl) {
        const me = await getJson(meUrl);
        email = me.body?.email;
      }
      if (!email) return this.renderSignedOut();

      const adminUrl = this.getAttribute("admin-url");
      const admin = adminUrl ? (await getJson(adminUrl)).status : null;
      this.renderSignedIn({ email, name, admin: admin === 200 ? true : admin === 403 ? false : null });
    }

    renderSignedOut() {
      const url = this.getAttribute("login-url");
      if (!url) return;
      const a = document.createElement("a");
      a.className = "login";
      a.textContent = this.t.signIn;
      // Come back to the current page after signing in.
      a.href = `${url}${url.includes("?") ? "&" : "?"}return=${encodeURIComponent(location.pathname + location.search)}`;
      this.shadowRoot.append(a);
    }

    renderSignedIn({ email, name, admin }) {
      const t = this.t;
      const root = this.shadowRoot;
      const letters = initials(name, email);

      const button = document.createElement("button");
      button.type = "button";
      button.className = `avatar${admin === false ? " warn" : ""}`;
      button.textContent = letters;
      button.setAttribute("aria-haspopup", "true");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", `${t.account}: ${email}`);

      const panel = document.createElement("div");
      panel.className = "panel";
      panel.hidden = true;
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", t.account);

      const who = document.createElement("div");
      who.className = "who";
      const big = document.createElement("span");
      big.className = "avatar";
      big.setAttribute("aria-hidden", "true");
      big.textContent = letters;
      const info = document.createElement("div");
      if (name) info.append(Object.assign(document.createElement("div"), { className: "name", textContent: name }));
      info.append(Object.assign(document.createElement("div"), { className: "email", textContent: email, title: email }));
      who.append(big, info);

      const dl = document.createElement("dl");
      const row = (k, v, cls = "") => {
        const d = document.createElement("div");
        d.append(Object.assign(document.createElement("dt"), { textContent: k }), Object.assign(document.createElement("dd"), { textContent: v, className: cls }));
        dl.append(d);
      };
      row(t.via, "Cloudflare Access");
      if (admin !== null) row(t.admin, admin ? t.yes : t.no, admin ? "yes" : "no");

      const logout = Object.assign(document.createElement("a"), { className: "logout", href: "/cdn-cgi/access/logout", textContent: t.signOut });
      panel.append(who, dl, logout);
      root.append(button, panel);

      const setOpen = (open) => {
        panel.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
      };
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        setOpen(panel.hidden);
      });
      document.addEventListener("click", (e) => {
        if (!e.composedPath().includes(this)) setOpen(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !panel.hidden) {
          setOpen(false);
          button.focus();
        }
      });
    }
  }

  customElements.define("tdz-account", TdzAccount);
})();
