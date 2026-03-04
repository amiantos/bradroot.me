(function () {
  var el = document.querySelector('.ealain-slideshow');
  if (!el) return;

  var images = JSON.parse(el.getAttribute('data-images'));
  if (!images || images.length < 2) return;

  var bottom = el.querySelector('.ealain-slideshow__bottom');
  var top = el.querySelector('.ealain-slideshow__top');
  var index = 1; // bottom has [0], top has [1]
  var topVisible = false;

  function nextIndex() {
    index = (index + 1) % images.length;
    return index;
  }

  function preload(src) {
    var img = new Image();
    img.src = src;
  }

  // Preload the third image
  if (images.length > 2) preload(images[2]);

  setInterval(function () {
    if (!topVisible) {
      // Fade in top (revealing top over bottom)
      topVisible = true;
      top.classList.add('visible');
      // After transition, swap bottom to next image (hidden behind top)
      setTimeout(function () {
        var ni = nextIndex();
        bottom.src = images[ni];
        preload(images[(ni + 1) % images.length]);
      }, 3000);
    } else {
      // Fade out top (revealing new bottom)
      topVisible = false;
      top.classList.remove('visible');
      // After transition, swap top to next image (hidden, opacity 0)
      setTimeout(function () {
        var ni = nextIndex();
        top.src = images[ni];
        preload(images[(ni + 1) % images.length]);
      }, 3000);
    }
  }, 10000);
})();
