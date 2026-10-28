// 霓虹躲避 Neon Dodge —— 纯 Canvas 躲避类小游戏
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 480, H = 720;

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const scoreFinalEl = overlay.querySelector('.score-final');
  const bestFinalEl = overlay.querySelector('.best');
  const titleEl = overlay.querySelector('h1');
  const descEl = overlay.querySelector('p');

  let best = 0;
  try { best = parseInt(localStorage.getItem('neon-dodge-best') || '0', 10) || 0; } catch (e) {}
  bestEl.textContent = best;

  // ---- 玩家 ----
  const player = {
    x: W / 2, y: H - 110, w: 34, h: 34,
    vx: 0, vy: 0, onGround: true,
    speed: 6.2, jump: -11.5, gravity: 0.62
  };
  const GROUND_Y = H - 70; // 落地 y 坐标（方块底部）

  // ---- 游戏状态 ----
  let running = false;
  let score = 0;
  let spawnTimer = 0;
  let obstacles = [];
  let stars = [];
  let particles = [];

  // 按键状态
  const keys = {};
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if ((e.key === ' ' || e.key === 'ArrowUp') && running) tryJump();
    if (e.key === 'Enter' && !running) startGame();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // 移动端触摸支持
  let touchDir = 0;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const px = (t.clientX - rect.left) * (W / rect.width);
    touchDir = px < W / 2 ? -1 : 1;
    if (!running) { startGame(); return; }
    tryJump();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { touchDir = 0; });

  function tryJump() {
    if (player.onGround) {
      player.vy = player.jump;
      player.onGround = false;
    }
  }

  function startGame() {
    running = true;
    score = 0;
    spawnTimer = 0;
    obstacles = [];
    stars = [];
    particles = [];
    player.x = W / 2; player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0; player.onGround = true;
    overlay.style.display = 'none';
  }

  function endGame() {
    running = false;
    if (score > best) { best = score; try { localStorage.setItem('neon-dodge-best', String(best)); } catch (e) {} }
    bestEl.textContent = best;
    titleEl.textContent = '游戏结束';
    scoreFinalEl.textContent = '本局得分 ' + score;
    bestFinalEl.textContent = '历史最佳 ' + best;
    descEl.textContent = '按 Enter 或点击按钮再来一局';
    overlay.style.display = 'flex';
    burst(player.x + player.w / 2, player.y + player.h / 2, '#ff5d7a', 26);
  }

  // ---- 生成 ----
  function difficulty() { return Math.min(1 + score / 800, 2.6); }

  function spawnObstacle() {
    const s = difficulty();
    const w = 26 + Math.random() * 26;
    const x = Math.random() * (W - w);
    obstacles.push({ x, y: -30, w, h: 18 + Math.random() * 16, v: (3.2 + Math.random() * 1.6) * s, hue: 340 + Math.random() * 60 });
  }

  function spawnStar() {
    stars.push({ x: Math.random() * (W - 24) + 12, y: -20, r: 9, v: 3.6 });
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
  }

  // ---- 更新 ----
  function update() {
    if (!running) return;

    const d = difficulty();

    // 玩家水平移动
    let dir = 0;
    if (keys['arrowleft'] || keys['a']) dir -= 1;
    if (keys['arrowright'] || keys['d']) dir += 1;
    dir += touchDir;
    player.x += dir * player.speed;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    // 垂直物理
    player.vy += player.gravity;
    player.y += player.vy;
    if (player.y >= GROUND_Y - player.h) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // 障碍
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(18, Math.floor(58 / d)) + Math.random() * 14;
      if (Math.random() < 0.5) spawnStar();
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.v;
      // 碰撞（AABB）
      if (player.x < o.x + o.w && player.x + player.w > o.x &&
          player.y < o.y + o.h && player.y + player.h > o.y) {
        endGame();
        return;
      }
      if (o.y > H) obstacles.splice(i, 1);
    }

    // 星星
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.y += s.v;
      const dx = (player.x + player.w / 2) - s.x;
      const dy = (player.y + player.h / 2) - s.y;
      if (dx * dx + dy * dy < (s.r + 20) * (s.r + 20)) {
        score += 10;
        scoreEl.textContent = score;
        burst(s.x, s.y, '#ffd76a', 14);
        stars.splice(i, 1);
      } else if (s.y > H) {
        stars.splice(i, 1);
      }
    }

    // 粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---- 绘制 ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 背景网格
    ctx.strokeStyle = 'rgba(90,90,140,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 地面
    ctx.fillStyle = '#15152a';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = '#3a5bd9';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();
    ctx.fillStyle = 'rgba(122,230,255,0.25)';
    ctx.fillRect(0, GROUND_Y + 1, W, 3);

    // 星星
    for (const s of stars) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = '#ffd76a';
      ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s.r : s.r * 0.45;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // 障碍
    for (const o of obstacles) {
      ctx.save();
      ctx.fillStyle = `hsl(${o.hue}, 85%, 58%)`;
      ctx.shadowColor = `hsl(${o.hue}, 90%, 55%)`;
      ctx.shadowBlur = 10;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.restore();
    }

    // 玩家
    ctx.save();
    const px = player.x, py = player.y;
    ctx.fillStyle = '#7de6ff';
    ctx.shadowColor = '#7de6ff'; ctx.shadowBlur = 18;
    ctx.fillRect(px, py, player.w, player.h);
    ctx.fillStyle = '#3aa8d9';
    ctx.fillRect(px + 5, py + 5, player.w - 10, player.h - 10);
    ctx.restore();

    // 粒子
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', startGame);
  scoreFinalEl.textContent = '';
  bestFinalEl.textContent = '';
  loop();
})();
