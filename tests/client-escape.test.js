// client-escape.test.js — frontend escapeHtml() unit test (net-new: F; gap G1).
// Loads client/assets/js/api.js in a node:vm sandbox with a faithful WHATWG
// text-node serialization stub for document.createElement — NO jsdom, no server,
// no DB. Verifies escapeHtml() delegates to textContent (safe) rather than
// building markup by string concatenation.

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

// Minimal element stub: setting textContent stores the raw string; reading
// innerHTML returns the HTML-fragment serialization of that text node. This is
// exactly what a browser does — &, <, > (and U+00A0) are escaped; quotes are not.
function makeDocumentStub() {
  return {
    createElement() {
      let stored = "";
      return {
        set textContent(v) {
          stored = v === undefined || v === null ? "" : String(v);
        },
        get textContent() {
          return stored;
        },
        get innerHTML() {
          return stored
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/ /g, "&nbsp;");
        },
      };
    },
  };
}

function loadEscapeHtml() {
  const apiPath = path.join(__dirname, "..", "client", "assets", "js", "api.js");
  const code = fs.readFileSync(apiPath, "utf8");
  const sandbox = { window: {}, document: makeDocumentStub() };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "api.js" });
  return sandbox.window.escapeHtml;
}

test("api.js exposes escapeHtml as a function", () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(typeof escapeHtml, "function");
});

test("escapeHtml neutralizes a <script> payload", () => {
  const escapeHtml = loadEscapeHtml();
  const out = escapeHtml("<script>alert(1)</script>");
  assert.equal(out, "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.ok(!out.includes("<script"), "must not contain a live <script tag");
});

test("escapeHtml neutralizes an <img onerror> payload", () => {
  const escapeHtml = loadEscapeHtml();
  const out = escapeHtml('<img src=x onerror="alert(1)">');
  assert.ok(!out.includes("<img"), "must not contain a live <img tag");
  assert.ok(out.includes("&lt;img"), "the angle bracket must be escaped");
});

test("escapeHtml escapes ampersands and angle brackets", () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml("a & b < c > d"), "a &amp; b &lt; c &gt; d");
});

test("escapeHtml maps null/undefined to empty string", () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("escapeHtml leaves plain text unchanged", () => {
  const escapeHtml = loadEscapeHtml();
  assert.equal(escapeHtml("Plain text 123"), "Plain text 123");
});

test("escapeHtml output never contains a parseable tag start", () => {
  const escapeHtml = loadEscapeHtml();
  const payloads = [
    "<svg/onload=alert(1)>",
    "<iframe src=javascript:alert(1)>",
    "</td><script>x</script>",
    "<a href='x'>y</a>",
  ];
  for (const p of payloads) {
    const out = escapeHtml(p);
    assert.ok(!/<[a-z!/]/i.test(out), `payload leaked a tag: ${JSON.stringify(p)}`);
  }
});
