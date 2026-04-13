(function () {
  var container = document.getElementById("irc-messages");
  if (!container) return;

  var NICK_COLORS = [
    "#c0392b", "#2980b9", "#27ae60", "#8e44ad",
    "#d35400", "#16a085", "#c0392b", "#2c3e50",
    "#7f8c8d", "#e67e22", "#1abc9c", "#9b59b6",
  ];

  function hashNick(nick) {
    var h = 0;
    for (var i = 0; i < nick.length; i++) {
      h = ((h << 5) - h + nick.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % NICK_COLORS.length;
  }

  function formatTime(isoStr) {
    var d = new Date(isoStr);
    var h = d.getHours().toString().padStart(2, "0");
    var m = d.getMinutes().toString().padStart(2, "0");
    return h + ":" + m;
  }

  function formatDate(isoStr) {
    var d = new Date(isoStr);
    var y = d.getFullYear();
    var mo = (d.getMonth() + 1).toString().padStart(2, "0");
    var da = d.getDate().toString().padStart(2, "0");
    return y + "-" + mo + "-" + da;
  }

  function escapeAndLinkify(text, el) {
    // Set textContent first for safety, then replace with linked version
    var urlPattern = /(https?:\/\/[^\s<>]+)/g;
    if (!urlPattern.test(text)) {
      el.textContent = text;
      return;
    }
    // Split on URLs, create text nodes and anchor elements
    var parts = text.split(urlPattern);
    el.textContent = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].match(urlPattern)) {
        var a = document.createElement("a");
        a.href = parts[i];
        a.textContent = parts[i];
        a.target = "_blank";
        a.rel = "noopener";
        el.appendChild(a);
      } else if (parts[i]) {
        el.appendChild(document.createTextNode(parts[i]));
      }
    }
  }

  function parseLine(line) {
    // Match timestamp prefix: [2026-04-11T01:50:15.192Z]
    var tsMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]\s*/);
    if (!tsMatch) return null;

    var timestamp = tsMatch[1];
    var rest = line.slice(tsMatch[0].length);

    // Chat message: <nick> or <@nick> or <+nick>
    var msgMatch = rest.match(/^<([+@]?)([^>]+)>\s(.*)/);
    if (msgMatch) {
      return {
        type: "message",
        timestamp: timestamp,
        nick: msgMatch[2],
        content: msgMatch[3],
      };
    }

    // System events: *** ...
    if (rest.startsWith("*** ")) {
      var event = rest.slice(4);

      // Join: nick (~ident@host) joined
      var joinMatch = event.match(/^(\S+)\s+\([^)]+\)\s+joined$/);
      if (joinMatch) {
        return { type: "join", timestamp: timestamp, nick: joinMatch[1] };
      }

      // Quit: nick (~ident@host) quit (reason)
      var quitMatch = event.match(/^(\S+)\s+\([^)]+\)\s+quit\s+\(([^)]*)\)$/);
      if (quitMatch) {
        return {
          type: "quit",
          timestamp: timestamp,
          nick: quitMatch[1],
          content: quitMatch[2],
        };
      }

      // Part: nick (~ident@host) left (reason)
      var partMatch = event.match(/^(\S+)\s+\([^)]+\)\s+left\s*\(?([^)]*)\)?$/);
      if (partMatch) {
        return {
          type: "part",
          timestamp: timestamp,
          nick: partMatch[1],
          content: partMatch[2],
        };
      }

      // Topic: nick changed topic to 'topic'
      var topicMatch = event.match(/^(\S+)\s+changed topic to\s+'(.*)'/);
      if (topicMatch) {
        return {
          type: "topic",
          timestamp: timestamp,
          nick: topicMatch[1],
          content: topicMatch[2],
        };
      }

      // Nick change: nick is now known as newnick (TheLounge may not log this)
      // Mode, host changes: skip
      var modeMatch = event.match(/set mode |changed host /);
      if (modeMatch) return null;

      // Fallback: render as generic event
      return { type: "event", timestamp: timestamp, content: event };
    }

    return null;
  }

  function renderEvents(events) {
    // Check if user is scrolled near bottom before updating
    var atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;

    container.textContent = "";

    var lastDate = null;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];

      var evDate = formatDate(ev.timestamp);
      if (evDate !== lastDate) {
        var dayDiv = document.createElement("div");
        dayDiv.className = "irc-chat__line irc-chat__line--day";
        var daySpan = document.createElement("span");
        daySpan.className = "irc-chat__time";
        daySpan.textContent = evDate;
        dayDiv.appendChild(daySpan);
        container.appendChild(dayDiv);
        lastDate = evDate;
      }

      var div = document.createElement("div");

      var time = document.createElement("span");
      time.className = "irc-chat__time";
      time.textContent = formatTime(ev.timestamp);
      div.appendChild(time);

      if (ev.type === "message") {
        div.className = "irc-chat__line";
        var nick = document.createElement("span");
        nick.className = "irc-chat__nick";
        nick.style.color = NICK_COLORS[hashNick(ev.nick)];
        nick.textContent = "<" + ev.nick + ">";
        div.appendChild(nick);
        div.appendChild(document.createTextNode(" "));
        var text = document.createElement("span");
        text.className = "irc-chat__text";
        escapeAndLinkify(ev.content, text);
        div.appendChild(text);
      } else if (ev.type === "join") {
        div.className = "irc-chat__line irc-chat__line--event";
        var span = document.createElement("span");
        span.textContent = ev.nick + " has joined";
        div.appendChild(span);
      } else if (ev.type === "quit" || ev.type === "part") {
        div.className = "irc-chat__line irc-chat__line--event";
        var span = document.createElement("span");
        var verb = ev.type === "quit" ? "has quit" : "has left";
        span.textContent =
          ev.nick + " " + verb + (ev.content ? " (" + ev.content + ")" : "");
        div.appendChild(span);
      } else if (ev.type === "topic") {
        div.className = "irc-chat__line irc-chat__line--event";
        var span = document.createElement("span");
        span.textContent = ev.nick + ' set topic: "' + ev.content + '"';
        div.appendChild(span);
      } else if (ev.type === "event") {
        div.className = "irc-chat__line irc-chat__line--event";
        var span = document.createElement("span");
        span.textContent = ev.content;
        div.appendChild(span);
      }

      container.appendChild(div);
    }

    if (atBottom || container.scrollTop === 0) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function fetchAndRender() {
    var url = "https://cdn.bradroot.me/chat-log.txt?t=" + Date.now();
    var localUrl = "chat-log.txt?t=" + Date.now();
    fetch(url)
      .catch(function () {
        return fetch(localUrl);
      })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var lines = text.trim().split("\n");
        var events = [];
        for (var i = 0; i < lines.length; i++) {
          var ev = parseLine(lines[i]);
          if (ev) events.push(ev);
        }
        if (events.length > 0) {
          renderEvents(events);
        } else {
          container.textContent = "";
          var p = document.createElement("p");
          p.className = "irc-chat__empty";
          p.textContent = "No recent activity";
          container.appendChild(p);
        }
      })
      .catch(function () {
        // Silently retry on next interval
      });
  }

  fetchAndRender();
  setInterval(fetchAndRender, 30000);
})();
