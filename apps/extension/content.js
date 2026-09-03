/**
 * MUSOU-EC コネクタ — content script（ページ ⇄ background の橋渡し）
 * MUSOU-EC のページからのみ window.postMessage を受け、background に転送して結果を返す。
 * 拡張IDをページ側にハードコードしなくて済むよう、この relay 方式にしている。
 */
(function () {
  const TAG = "musou-ec";

  const VERSION = chrome.runtime.getManifest().version;

  // ① DOM属性マーカー：document_start で <html> に打ち込む。
  //    ページ側はこれを同期的に読むだけでよく、メッセージのタイミング勝負にならない。
  function mark() {
    try {
      if (document.documentElement) document.documentElement.setAttribute("data-musou-ext", VERSION);
    } catch (e) {}
  }
  mark();
  document.addEventListener("DOMContentLoaded", mark);

  // ② メッセージでも起動を知らせる（後から登録されたリスナー救済のフォールバック）
  function announce() {
    mark();
    window.postMessage({ source: `${TAG}-ext`, type: "ready", version: VERSION }, "*");
  }
  announce();
  [50, 200, 600, 1500, 3000].forEach((ms) => setTimeout(announce, ms));
  document.addEventListener("DOMContentLoaded", announce);
  window.addEventListener("load", announce);

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.source !== `${TAG}-page`) return;

    // ページ側からの hello に即応（リスナーが後から登録されたケースを救済）
    if (d.type === "hello") {
      announce();
      return;
    }
    if (!d.id || !d.req) return;

    chrome.runtime.sendMessage({ __musou: "req", id: d.id, req: d.req }, (res) => {
      const err = chrome.runtime.lastError;
      window.postMessage(
        err
          ? { source: `${TAG}-ext`, type: "res", id: d.id, ok: false, error: err.message }
          : { source: `${TAG}-ext`, type: "res", id: d.id, ok: !!(res && res.ok), data: res && res.data, error: res && res.error },
        "*",
      );
    });
  });
})();
