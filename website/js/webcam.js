(function () {
  var img = document.getElementById('webcam');
  var status = document.getElementById('bradcam-status');

  if (img) {
    setInterval(function () {
      img.src = 'https://cdn.bradroot.me/latest.jpg?t=' + Date.now();
    }, 15000);
  }

  if (!status) return;

  function refreshStatus() {
    fetch('https://cdn.bradroot.me/latest.json?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var present = !!data.presence;
        status.classList.toggle('bradcam-status--present', present);
        status.textContent = present ? 'On Air' : 'AFK';
        var pct = Math.round((data.confidence || 0) * 100);
        status.title =
          (present ? 'At desk' : 'Away') +
          ' · ' + pct + '% confidence' +
          (data.timestamp ? ' · ' + data.timestamp : '');
      })
      .catch(function () { /* ignore */ });
  }

  refreshStatus();
  setInterval(refreshStatus, 15000);
})();
