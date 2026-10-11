/* Anuj Chaudhary — portfolio script */

/* 1. Theme: runs immediately (this file loads in <head>) so the page never flashes the wrong theme */
/* Set the theme before first paint: saved choice, otherwise the visitor's system setting */
(function () {
  var t;
  try { t = localStorage.getItem('theme'); } catch (e) { }
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
})();

/* 2. Everything else waits until the page has been read */
document.addEventListener('DOMContentLoaded', function () {

  /* Theme toggle, mobile menu, and active-section highlight */
  (function () {
    var root = document.documentElement;

    // Theme toggle (remembers the choice)
    document.getElementById('themeBtn').addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { }
    });

    // Mobile menu
    var menu = document.getElementById('menu');
    var btn = document.getElementById('menuBtn');
    function setMenu(open) {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    // Highlight the section you are reading
    var links = Array.prototype.slice.call(document.querySelectorAll('.menu a'));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) io.observe(s);
    });
  })();

  /* Portfolio assistant (chat, voice, API call) */
  (() => {
    // CHANGE THIS to your deployed server URL (no API key here, the key lives only on the server)
    const API_URL = (location.hostname === "127.0.0.1" || location.hostname === "localhost")
    ? "http://localhost:3000/chat"
    : "https://portfolio-9n2k.onrender.com/chat";

    const $ = id => document.getElementById(id);
    const log = $("pa-log");
    const history = [];
    let busy = false;

    const add = (txt, cls) => {
      const m = document.createElement("div");
      m.className = "pa-m " + cls;
      m.textContent = txt;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    };

    async function ask(q, viaVoice) {
      if (busy) return;
      busy = true;
      add(q, "pa-me");
      const wait = add("Thinking… (the first reply can take up to 30 seconds)", "pa-bot");
      try {
        const r = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q, history: history.slice(-6) })
        });
        const j = await r.json();
        wait.textContent = j.reply || "Sorry, something went wrong.";
        if (r.ok) history.push({ role: "user", content: q }, { role: "assistant", content: wait.textContent });
        if (r.ok && (speak || viaVoice)) say(wait.textContent);
      } catch (e) {
        wait.textContent = "Couldn't reach the assistant. Please email anujchaudhary8528@gmail.com.";
      }
      busy = false;
      log.scrollTop = log.scrollHeight;
    }

    $("pa-fab").onclick = () => {
      const box = $("pa-box");
      box.hidden = !box.hidden;
      if (!box.hidden && !log.children.length)
        add("Hi! Ask me about Anuj's skills, projects, experience or contact details, in any language.", "pa-bot");
    };
    $("pa-x").onclick = () => {
      $("pa-box").hidden = true;
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
    $("pa-form").onsubmit = e => {
      e.preventDefault();
      const q = $("pa-in").value.trim();
      if (q) { $("pa-in").value = ""; ask(q); }
    };
    // ---------- voice (browser built-in, free) ----------
    let speak = false; // speaker toggle: read every answer aloud
    const say = t => {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = /[\u0900-\u097F]/.test(t) ? "hi-IN" : "en-IN"; // Hindi script -> Hindi voice
      speechSynthesis.speak(u);
    };
    $("pa-spk").onclick = () => {
      speak = !speak;
      $("pa-spk").textContent = speak ? "🔊" : "🔇";
      if (!speak && "speechSynthesis" in window) speechSynthesis.cancel();
    };

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = $("pa-mic");
    if (!SR) {
      mic.style.display = "none";      // e.g. Firefox: no voice input
      $("pa-lang").style.display = "none";
    } else {
      const rec = new SR();
      rec.lang = "en-IN";
      rec.interimResults = false;
      let on = false;
      $("pa-lang").onclick = () => {   // switch listening language: English <-> Hindi
        rec.lang = rec.lang === "en-IN" ? "hi-IN" : "en-IN";
        $("pa-lang").textContent = rec.lang === "en-IN" ? "EN" : "हि";
      };
      mic.onclick = () => {
        if (on) { rec.stop(); return; }
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        try { rec.start(); } catch (e) {}
      };
      rec.onstart = () => { on = true; mic.textContent = "⏹"; };
      rec.onend = () => { on = false; mic.textContent = "🎤"; };
      rec.onerror = () => { on = false; mic.textContent = "🎤"; };
      rec.onresult = e => {
        const q = e.results[0][0].transcript.trim();
        if (q) ask(q, true);           // spoken question -> spoken answer
      };
    }

    ["What are your skills?", "Tell me about your projects", "Any work experience?", "How can I contact you?"].forEach(q => {
      const b = document.createElement("button");
      b.textContent = q;
      b.onclick = () => ask(q);
      $("pa-chips").appendChild(b);
    });
  })();

});