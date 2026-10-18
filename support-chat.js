(function () {
  "use strict";

  // After deploying support-api, replace this with the Worker URL shown by Cloudflare.
  var API_URL = "https://chocoholics-support-chat.charansenpai.workers.dev/api/chat";
  var history = [];
  var busy = false;

  var css = document.createElement("style");
  css.textContent = `
    .choco-chat-launch{position:fixed;z-index:1000;right:20px;bottom:20px;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:13px 18px;background:var(--accent,#9a3b14);color:var(--accent-text,#f4efe8);font:500 16px/1.2 "Fraunces",Georgia,serif;box-shadow:0 8px 28px rgba(29,26,23,.28);cursor:pointer}
    .choco-chat-launch:hover{transform:translateY(-2px)}
    .choco-chat-launch:focus-visible,.choco-chat-close:focus-visible,.choco-chat-send:focus-visible,.choco-chat-input:focus-visible,.choco-chat-suggestion:focus-visible{outline:3px solid #e0a064;outline-offset:3px}
    .choco-chat-launch svg{width:21px;height:21px;flex:none}
    .choco-chat-panel{position:fixed;z-index:1001;right:20px;bottom:82px;width:min(390px,calc(100vw - 28px));height:min(590px,calc(100dvh - 110px));min-height:350px;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line,#d8cfc3);border-radius:16px;background:var(--bg,#f4efe8);color:var(--text,#1d1a17);font-family:"Fraunces",Georgia,serif;box-shadow:0 20px 60px rgba(29,26,23,.25)}
    .choco-chat-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#1a100b;color:#f4ebe0}
    .choco-chat-heading{font-size:18px;font-weight:500;line-height:1.2}
    .choco-chat-subtitle{margin-top:4px;color:#b9a898;font-size:13px;line-height:1.3}
    .choco-chat-close{width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:inherit;font:inherit;font-size:25px;line-height:1;cursor:pointer}
    .choco-chat-close:hover{background:rgba(255,255,255,.12)}
    .choco-chat-messages{display:flex;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:16px}
    .choco-chat-bubble{max-width:88%;border:1px solid var(--line,#d8cfc3);border-radius:14px;padding:11px 13px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.45}
    .choco-chat-bubble.assistant{align-self:flex-start;background:var(--surface,#ebe4da)}
    .choco-chat-bubble.user{align-self:flex-end;border-color:var(--accent,#9a3b14);background:var(--accent,#9a3b14);color:var(--accent-text,#f4efe8)}
    .choco-chat-suggestions{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 12px}
    .choco-chat-suggestion{border:1px solid var(--line,#d8cfc3);border-radius:999px;padding:7px 10px;background:transparent;color:var(--text,#1d1a17);font:500 13px/1.2 "Fraunces",Georgia,serif;cursor:pointer}
    .choco-chat-suggestion:hover{border-color:var(--accent,#9a3b14)}
    .choco-chat-form{display:flex;align-items:flex-end;gap:8px;border-top:1px solid var(--line,#d8cfc3);padding:12px}
    .choco-chat-input{flex:1;min-width:0;max-height:100px;resize:none;border:1px solid var(--line,#d8cfc3);border-radius:10px;padding:10px 12px;background:var(--surface,#ebe4da);color:var(--text,#1d1a17);font:400 15px/1.4 "Fraunces",Georgia,serif}
    .choco-chat-send{border:0;border-radius:999px;padding:10px 14px;background:var(--accent,#9a3b14);color:var(--accent-text,#f4efe8);font:500 15px/1.2 "Fraunces",Georgia,serif;cursor:pointer}
    .choco-chat-send:disabled{opacity:.55;cursor:wait}
    .choco-chat-note{padding:0 14px 10px;color:var(--muted,#6f655b);font:400 11px/1.35 "Fraunces",Georgia,serif;text-align:center}
    @media(max-width:480px){.choco-chat-launch{right:14px;bottom:14px}.choco-chat-panel{right:10px;bottom:74px;width:calc(100vw - 20px);height:min(590px,calc(100dvh - 94px))}}
    @media(prefers-reduced-motion:reduce){.choco-chat-launch{transition:none}}
  `;
  document.head.appendChild(css);

  var launch = document.createElement("button");
  launch.type = "button";
  launch.className = "choco-chat-launch";
  launch.setAttribute("aria-expanded", "false");
  launch.setAttribute("aria-controls", "choco-support-panel");
  launch.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.8A2.8 2.8 0 0 1 6.8 3h10.4A2.8 2.8 0 0 1 20 5.8v7.4a2.8 2.8 0 0 1-2.8 2.8h-5.4L7 20v-4H6.8A2.8 2.8 0 0 1 4 13.2V5.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 8h8M8 11.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>Ask us</span>';

  var panel = document.createElement("section");
  panel.className = "choco-chat-panel";
  panel.id = "choco-support-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chocoholics support chat");
  panel.hidden = true;

  var head = document.createElement("header");
  head.className = "choco-chat-head";
  var headCopy = document.createElement("div");
  var title = document.createElement("div");
  title.className = "choco-chat-heading";
  title.textContent = "Chocoholics support";
  var subtitle = document.createElement("div");
  subtitle.className = "choco-chat-subtitle";
  subtitle.textContent = "Menu, ordering and visiting";
  headCopy.append(title, subtitle);
  var close = document.createElement("button");
  close.type = "button";
  close.className = "choco-chat-close";
  close.setAttribute("aria-label", "Close support chat");
  close.textContent = "×";
  head.append(headCopy, close);

  var messages = document.createElement("div");
  messages.className = "choco-chat-messages";
  messages.setAttribute("role", "log");
  messages.setAttribute("aria-live", "polite");
  messages.setAttribute("aria-relevant", "additions text");

  var suggestions = document.createElement("div");
  suggestions.className = "choco-chat-suggestions";
  ["Opening hours", "Delivery options", "Allergen info"].forEach(function (label) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "choco-chat-suggestion";
    chip.textContent = label;
    chip.addEventListener("click", function () { sendMessage(label); });
    suggestions.appendChild(chip);
  });

  var form = document.createElement("form");
  form.className = "choco-chat-form";
  var input = document.createElement("textarea");
  input.className = "choco-chat-input";
  input.rows = 1;
  input.maxLength = 1000;
  input.placeholder = "Ask about the menu, delivery…";
  input.setAttribute("aria-label", "Your support question");
  var send = document.createElement("button");
  send.type = "submit";
  send.className = "choco-chat-send";
  send.textContent = "Send";
  form.append(input, send);

  var note = document.createElement("div");
  note.className = "choco-chat-note";
  note.textContent = "AI support for Chocoholics. Please don’t share payment or personal details.";
  panel.append(head, messages, suggestions, form, note);
  document.body.append(launch, panel);

  function addMessage(text, kind) {
    var bubble = document.createElement("div");
    bubble.className = "choco-chat-bubble " + kind;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  addMessage("Hi! Ask me about our menu, delivery options, opening hours or where to find us. I can’t confirm allergy safety, but I can share the information on our site.", "assistant");

  function openPanel(open) {
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    if (open) input.focus(); else launch.focus();
  }

  launch.addEventListener("click", function () { openPanel(panel.hidden); });
  close.addEventListener("click", function () { openPanel(false); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) openPanel(false);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  async function sendMessage(raw) {
    var question = String(raw || "").trim();
    if (!question || busy) return;
    input.value = "";
    addMessage(question, "user");

    if (API_URL.indexOf("REPLACE-WITH-YOUR-WORKER") !== -1) {
      addMessage("The AI support chat isn’t connected yet. Please check back soon or use the menu and delivery links on this page.", "assistant");
      return;
    }

    busy = true;
    send.disabled = true;
    send.textContent = "…";
    var waitBubble = document.createElement("div");
    waitBubble.className = "choco-chat-bubble assistant";
    waitBubble.textContent = "One moment…";
    messages.appendChild(waitBubble);
    messages.scrollTop = messages.scrollHeight;

    try {
      var payload = history.concat([{ role: "user", content: question }]).slice(-8);
      var response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload })
      });
      var result = await response.json();
      waitBubble.remove();
      if (!response.ok) throw new Error(result.error || "Could not get a reply.");
      var answer = String(result.answer || "I couldn’t find that in the support information. Please contact the shop directly.");
      history = payload.concat([{ role: "assistant", content: answer }]).slice(-8);
      addMessage(answer, "assistant");
    } catch (error) {
      waitBubble.remove();
      addMessage("Sorry, I can’t connect just now. Please try again in a moment.", "assistant");
    } finally {
      busy = false;
      send.disabled = false;
      send.textContent = "Send";
      input.focus();
    }
  }
})();
