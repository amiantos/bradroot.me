(function () {
  var img = document.getElementById('webcam');
  if (!img) return;
  setInterval(function () {
    img.src = 'https://cdn.bradroot.me/latest.jpg?t=' + Date.now();
  }, 15000);
})();
