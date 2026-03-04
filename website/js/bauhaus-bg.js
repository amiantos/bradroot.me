(() => {
  const canvas = document.getElementById('bauhaus-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const colors = [
    'rgba(211, 47, 47, 0.08)',   // red
    'rgba(21, 101, 192, 0.08)',  // blue
    'rgba(251, 192, 45, 0.08)',  // yellow
    'rgba(26, 26, 26, 0.04)',    // dark
  ];

  const shapes = [];
  const SHAPE_COUNT = 12;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function createShape() {
    const type = ['circle', 'rect', 'triangle'][Math.floor(Math.random() * 3)];
    return {
      type,
      x: randomBetween(0, canvas.width),
      y: randomBetween(0, canvas.height),
      size: randomBetween(40, 200),
      rotation: randomBetween(0, Math.PI * 2),
      vx: randomBetween(-0.15, 0.15),
      vy: randomBetween(-0.15, 0.15),
      vr: randomBetween(-0.002, 0.002),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  function init() {
    resize();
    shapes.length = 0;
    for (let i = 0; i < SHAPE_COUNT; i++) {
      shapes.push(createShape());
    }
  }

  function drawShape(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);
    ctx.fillStyle = s.color;

    switch (s.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'rect':
        ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -s.size / 2);
        ctx.lineTo(s.size / 2, s.size / 2);
        ctx.lineTo(-s.size / 2, s.size / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  function update() {
    for (const s of shapes) {
      s.x += s.vx;
      s.y += s.vy;
      s.rotation += s.vr;

      // Wrap around edges
      if (s.x < -s.size) s.x = canvas.width + s.size;
      if (s.x > canvas.width + s.size) s.x = -s.size;
      if (s.y < -s.size) s.y = canvas.height + s.size;
      if (s.y > canvas.height + s.size) s.y = -s.size;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of shapes) {
      drawShape(s);
    }
    update();
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();
