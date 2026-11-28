/* Clara's activities: send each result to the "Clara 활동 기록" Google Sheet.
 * Every activity page loads this file and calls claraSave({...}) when a game ends.
 * Results wait in this browser (queue) until they are sent, so nothing is lost offline. */
(function () {
  // Paste the Apps Script "Web app URL" here (ends with /exec). Empty = results wait in the queue.
  var SHEET_URL = 'https://script.google.com/macros/s/AKfycbwAx55vzaJpiDLpgVohwMkZFhPIVLxNKxVY0Mm3zwmXYD8OgT4gFOHlOAjGRetdHgykkw/exec';
  var KEY = 'claraQueue';

  function readQueue() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function writeQueue(q) {
    try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { /* storage blocked: skip */ }
  }
  function device() {
    var ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/iPhone|Android.*Mobile/i.test(ua)) return 'phone';
    if (/Android/i.test(ua)) return 'tablet';
    return 'computer';
  }
  function send(row) {
    return fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(row) });
  }
  var sending = false;
  function flush() {
    if (!SHEET_URL || sending) return;
    var q = readQueue();
    if (!q.length) return;
    sending = true;
    var row = q[0];
    send(row).then(function () {
      var rest = readQueue();
      if (rest.length && rest[0].id === row.id) rest.shift();
      writeQueue(rest);
      sending = false;
      flush();
    }).catch(function () { sending = false; });
  }

  window.claraSave = function (r) {
    var now = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var row = {
      id: now.getTime() + '-' + Math.random().toString(36).slice(2, 7),
      date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()),
      time: pad(now.getHours()) + ':' + pad(now.getMinutes()),
      activity: r.activity || '', game: r.game || '',
      score: r.score == null ? '' : r.score, total: r.total == null ? '' : r.total,
      seconds: r.seconds == null ? '' : r.seconds, wpm: r.wpm == null ? '' : r.wpm,
      detail: r.detail || '', device: device()
    };
    var q = readQueue(); q.push(row); writeQueue(q);
    flush();
  };

  window.addEventListener('online', flush);
  flush();
})();
