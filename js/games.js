/* ============================================================
   Mannou's Garden Quest — the five mini-games
   Each scene implements: enter(), exit(), update(dt), draw(ctx),
   pointer(type, x, y)  — and reports victory through WinFX.
   ============================================================ */

'use strict';

var GAME_TITLES = ['Butterfly Chase', 'Petal Dash', 'Flower Memory', 'Bee Rescue', 'Bloom Challenge'];
var GAME_ICONS  = ['🦋', '🌸', '🌷', '🐝', '✨'];
var GAME_FLAVOR = [
  'The garden’s butterflies came out to play with you.',
  'A warm breeze is shaking the blossom tree…',
  'The flowers put on their best faces for you.',
  'Somewhere in the hedges — a tiny, worried buzzing.',
  'The five great flowers want to sing with you.'
];
var GAME_HOWTO = [
  [['🦋', 'Glowing butterflies drift across the garden'],
   ['👆', 'Tap them gently to catch their light'],
   ['✨', 'Catch 15 and the first flower wakes up']],
  [['🌸', 'Pink petals tumble down from the sky'],
   ['👉', 'Drag left & right — catch them in your blossom'],
   ['🍂', 'Let the brown leaves pass. You have 3 hearts!']],
  [['🌷', 'Twelve cards hide six flower pairs'],
   ['👆', 'Flip any two cards at a time'],
   ['💞', 'Matched pairs stay in bloom — find them all']],
  [['🐝', 'A little bee has lost her way home'],
   ['👆', 'Touch and drag — she follows your finger'],
   ['🌼', 'Lead her through the hedges to the big flower']],
  [['✨', 'The flowers sing a short melody of light'],
   ['👀', 'Watch closely which ones glow, and in what order'],
   ['🎵', 'Tap the same order back. Five gentle rounds!']]
];
var WIN_MESSAGES = [
  'Somehow, you turn my most ordinary days into my favorite ones.',
  'If I could, I’d bottle up every little moment with you and keep them all.',
  'It’s been a while now… and I still get butterflies just thinking about you.',
  'My world got so much brighter the day you wandered into it.',
  'Do you feel that? The whole garden is holding its breath…'
];

function hudTop(app){ return app.safeTop + 66; }

/* one flower species per quest, so the garden feels hand-planted */
var QUEST_SPECIES = [1, 0, 2, 3, 0];

/* ============================================================
   WinFX — shared victory bloom overlay
   ============================================================ */

var WinFX = {
  active: false,
  t: 0,
  shown: false,
  idx: -1,
  msg: '',
  btn: '',
  app: null,

  start: function(app, idx, msg, opts){
    opts = opts || {};
    this.app = app;
    this.active = true;
    this.t = 0;
    this.shown = false;
    this.idx = idx;
    this.msg = msg;
    this.btn = opts.btn || 'Continue 🌸';
    Sfx.bloom();
    FX.sparkleBurst(app.W / 2, app.H * 0.42, 22, '#fff3c9');
  },

  update: function(dt){
    if (!this.active) return;
    this.t += dt;
    var app = this.app;
    if (this.t > 0.5 && Math.random() < dt * 6){
      FX.petalBurst(app.W / 2 + rand(-60, 60), app.H * 0.42 + rand(-40, 40), 2,
        FLOWER_COLORS[this.idx % FLOWER_COLORS.length].p);
    }
    if (!this.shown && this.t > 1.5){
      this.shown = true;
      var self = this;
      UI.winCard(this.idx, this.msg, this.btn, function(){
        self.active = false;
        App.completeGame(self.idx);
      });
    }
  },

  draw: function(ctx){
    if (!this.active) return;
    var app = this.app, W = app.W, H = app.H, t = this.t;
    ctx.fillStyle = 'rgba(255,247,240,' + Math.min(0.55, t * 1.1).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);

    var cx = W / 2, cy = H * 0.42;
    var bloom = easeOutCubic(Math.min(1, t / 1.25));
    var size = Math.min(W * 0.28, 130);
    var i, a, grad;

    // opening flash of light
    if (t < 0.45){
      var flash = 1 - t / 0.45;
      Art.glow(ctx, cx, cy, size * (1 + (1 - flash) * 3), '#fff6dd', flash * 0.9);
    }

    // rotating god rays
    ctx.save();
    ctx.translate(cx, cy);
    var rayA = Math.min(0.4, t * 0.45);
    for (i = 0; i < 12; i++){
      a = t * 0.3 + i * TAU / 12;
      var w = (i % 2 === 0) ? size * 0.22 : size * 0.1;
      ctx.save();
      ctx.rotate(a);
      grad = ctx.createLinearGradient(0, 0, 0, -H * 0.46);
      grad.addColorStop(0, 'rgba(255,224,170,' + (rayA * (i % 2 ? 0.35 : 0.55)).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(255,224,170,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-w, -H * 0.46);
      ctx.lineTo(w, -H * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // expanding light rings
    for (i = 0; i < 2; i++){
      var rt = (t - 0.15 - i * 0.35);
      if (rt > 0 && rt < 1.1){
        var rr = easeOutCubic(rt / 1.1) * size * 2.6;
        ctx.save();
        ctx.globalAlpha = (1 - rt / 1.1) * 0.55;
        ctx.strokeStyle = '#ffdff0';
        ctx.lineWidth = 3 - i;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }

    Art.glow(ctx, cx, cy, size * 2.6, '#ffd9ec', 0.75 * bloom);
    Art.flowerHead(ctx, cx, cy, size, FLOWER_COLORS[this.idx % FLOWER_COLORS.length],
      bloom, Math.sin(t * 0.8) * 0.05, QUEST_SPECIES[this.idx % QUEST_SPECIES.length]);

    // orbiting sparkles
    for (i = 0; i < 5; i++){
      a = t * 1.4 + i * TAU / 5;
      var orb = size * (1.35 + 0.12 * Math.sin(t * 2 + i));
      Art.sparkleStar(ctx, cx + Math.cos(a) * orb, cy + Math.sin(a) * orb * 0.8,
        5, 'rgba(255,244,214,0.9)', t * 3 + i);
    }
  }
};

/* ============================================================ */

var Games = (function(){

  function makeScenes(app){

    /* ========================================================
       1 — BUTTERFLY CHASE
       ======================================================== */

    var butterfly = {
      name: 'game1',
      state: 'intro',
      caught: 0,
      goal: 15,
      bflies: [],
      pending: [],
      hintT: 0,

      enter: function(){
        this.state = 'intro';
        this.caught = 0;
        this.bflies = [];
        this.pending = [];
        this.hintT = 0;
        FX.ambient = 5;
        var self = this;
        UI.gameIntro(0, function(){
          self.state = 'play';
          for (var i = 0; i < 4; i++) self.spawn(true);
        });
      },
      exit: function(){},

      spawn: function(scattered){
        var W = app.W, H = app.H;
        var x, y;
        if (scattered){
          x = rand(W * 0.15, W * 0.85);
          y = rand(hudTop(app) + 60, H * 0.75);
        } else {
          var side = randi(0, 3);
          if (side === 0){ x = -14; y = rand(H * 0.2, H * 0.7); }
          else if (side === 1){ x = W + 14; y = rand(H * 0.2, H * 0.7); }
          else if (side === 2){ x = rand(20, W - 20); y = hudTop(app) - 10; }
          else { x = rand(20, W - 20); y = H - 30; }
        }
        this.bflies.push({
          x: x, y: y,
          heading: Math.atan2(app.H * 0.45 - y, app.W / 2 - x) + rand(-0.5, 0.5),
          speed: rand(52, 74),
          flap: rand(0, TAU),
          seed: rand(0, 20),
          size: rand(15, 20),
          col: pick(BFLY_COLORS),
          alpha: 0
        });
      },

      update: function(dt){
        if (this.state !== 'play') return;
        this.hintT += dt;
        var W = app.W, H = app.H;
        var topLim = hudTop(app) + 24;
        var sf = 1 + this.caught * 0.045;

        for (var p = this.pending.length - 1; p >= 0; p--){
          this.pending[p] -= dt;
          if (this.pending[p] <= 0){
            this.pending.splice(p, 1);
            this.spawn(false);
          }
        }

        for (var i = 0; i < this.bflies.length; i++){
          var b = this.bflies[i];
          b.alpha = Math.min(1, b.alpha + dt * 2.2);
          b.flap += dt * (11 + b.speed * 0.06);
          b.heading += (Math.sin(app.t * 1.6 + b.seed) * 1.1 +
                        Math.sin(app.t * 3.1 + b.seed * 2.3) * 0.55) * dt;

          // steer back toward the middle near the edges
          var m = 46;
          if (b.x < m || b.x > W - m || b.y < topLim + m || b.y > H - m){
            var desired = Math.atan2(H * 0.5 - b.y, W / 2 - b.x);
            var diff = desired - b.heading;
            while (diff > Math.PI) diff -= TAU;
            while (diff < -Math.PI) diff += TAU;
            b.heading += diff * 3.2 * dt;
          }

          b.x += Math.cos(b.heading) * b.speed * sf * dt;
          b.y += Math.sin(b.heading) * b.speed * sf * dt;
          b.x = clamp(b.x, 10, W - 10);
          b.y = clamp(b.y, topLim, H - 14);

          if (Math.random() < dt * 1.6) FX.pollen(b.x, b.y);
        }
      },

      pointer: function(type, x, y){
        if (type !== 'down' || this.state !== 'play') return;
        var best = -1, bestD = 52;
        for (var i = 0; i < this.bflies.length; i++){
          var b = this.bflies[i];
          var d = Math.hypot(b.x - x, b.y - y);
          if (d < bestD){ bestD = d; best = i; }
        }
        if (best >= 0){
          var b = this.bflies.splice(best, 1)[0];
          this.caught++;
          Sfx.bell(rand(0.9, 1.35));
          FX.sparkleBurst(b.x, b.y, 12, '#fff3c9');
          FX.petalBurst(b.x, b.y, 4);
          FX.ring(b.x, b.y, '#ffe9f2');
          if (this.caught >= this.goal){
            this.state = 'won';
            WinFX.start(app, 0, WIN_MESSAGES[0]);
          } else {
            var want = Math.min(4, this.goal - this.caught);
            if (this.bflies.length + this.pending.length < want) this.pending.push(0.55);
          }
        } else {
          FX.sparkleBurst(x, y, 3, '#ffffff');
        }
      },

      draw: function(ctx){
        Art.background(ctx, app, app.t, app.progress() / 5, { dim: 0.1 });
        for (var i = 0; i < this.bflies.length; i++){
          var b = this.bflies[i];
          Art.drawButterfly(ctx, {
            x: b.x, y: b.y, angle: b.heading, flap: b.flap,
            size: b.size, col: b.col, alpha: b.alpha
          });
        }
        if (this.state === 'play' || this.state === 'won'){
          Art.hudPill(ctx, app.W / 2, hudTop(app), '🦋 ' + this.caught + ' / ' + this.goal);
          if (this.hintT < 3 && this.caught === 0){
            Art.hudPill(ctx, app.W / 2, hudTop(app) + 44, 'Tap the butterflies!', { color: '#b06a8c' });
          }
        }
        Art.vignette(ctx, app.W, app.H);
      }
    };

    /* ========================================================
       2 — PETAL DASH
       ======================================================== */

    var petalDash = {
      name: 'game2',
      state: 'intro',
      lives: 3,
      score: 0,
      goal: 30,
      items: [],
      spawnT: 0,
      leafCd: 0,
      cx: 0, tx: 0,
      invuln: 0,
      shake: 0,

      enter: function(){
        this.resetRun();
        this.state = 'intro';
        FX.ambient = 0;
        var self = this;
        UI.gameIntro(1, function(){ self.state = 'play'; });
      },
      exit: function(){},

      resetRun: function(){
        this.lives = 3;
        this.score = 0;
        this.items = [];
        this.spawnT = 0.4;
        this.leafCd = 0;
        this.cx = this.tx = app.W / 2;
        this.invuln = 0;
        this.shake = 0;
      },

      catcherY: function(){ return app.H - 116; },

      update: function(dt){
        if (this.state !== 'play') return;
        var W = app.W;

        this.cx += (this.tx - this.cx) * Math.min(1, dt * 11);
        this.cx = clamp(this.cx, 30, W - 30);
        this.invuln = Math.max(0, this.invuln - dt);
        this.shake = Math.max(0, this.shake - dt);
        this.leafCd -= dt;

        this.spawnT -= dt;
        if (this.spawnT <= 0){
          this.spawnT = 0.74 - Math.min(0.2, this.score * 0.006);
          var isLeaf = Math.random() < 0.2 && this.leafCd <= 0;
          if (isLeaf) this.leafCd = 1.35;
          var speedUp = this.score * 1.15;
          this.items.push({
            kind: isLeaf ? 'leaf' : 'petal',
            x: rand(26, W - 26), y: -26,
            vy: (isLeaf ? rand(150, 195) : rand(118, 160)) + speedUp,
            rot: rand(0, TAU), vr: rand(-2.2, 2.2),
            sway: rand(0.8, 2), swayAmp: rand(6, 22),
            size: isLeaf ? rand(12, 15) : rand(9, 13),
            color: pick(PETAL_PINKS),
            t: 0
          });
        }

        var cy = this.catcherY();
        for (var i = this.items.length - 1; i >= 0; i--){
          var it = this.items[i];
          it.t += dt;
          it.y += it.vy * dt;
          it.x += Math.sin(it.t * it.sway * 2) * it.swayAmp * dt;
          it.rot += it.vr * dt;

          if (it.y > app.H + 30){ this.items.splice(i, 1); continue; }

          var dx = Math.abs(it.x - this.cx), dy = Math.abs(it.y - cy);
          if (it.kind === 'petal' && dx < 48 && dy < 38){
            this.items.splice(i, 1);
            this.score++;
            Sfx.bell(rand(1.0, 1.45));
            FX.sparkleBurst(it.x, it.y, 6, '#ffe9f2');
            if (this.score >= this.goal){
              this.state = 'won';
              WinFX.start(app, 1, WIN_MESSAGES[1]);
            }
          } else if (it.kind === 'leaf' && dx < 32 && dy < 28 && this.invuln <= 0){
            this.items.splice(i, 1);
            this.lives--;
            this.invuln = 1.2;
            this.shake = 0.45;
            Sfx.sad();
            FX.sparkleBurst(it.x, it.y, 8, '#d9b48f');
            if (this.lives <= 0){
              this.state = 'fail';
              var self = this;
              UI.card({
                icon: '🍂',
                title: 'Oh, the leaves!',
                text: 'The petals scattered… but this garden believes in you. Every gardener needs a second try.',
                buttons: [{ label: 'Try again 🌸', cb: function(){
                  self.resetRun();
                  self.state = 'play';
                }}]
              });
            }
          }
        }
      },

      pointer: function(type, x, y){
        if (type === 'down' || type === 'move') this.tx = x;
      },

      draw: function(ctx){
        Art.background(ctx, app, app.t, app.progress() / 5, { dim: 0.12 });
        ctx.save();
        if (this.shake > 0) ctx.translate(Math.sin(app.t * 55) * this.shake * 8, 0);

        var i;
        for (i = 0; i < this.items.length; i++){
          var it = this.items[i];
          if (it.kind === 'petal'){
            Art.petal(ctx, it.x, it.y, it.rot, it.size * 1.5, it.color, 0.95);
          } else {
            Art.drawLeafItem(ctx, it.x, it.y, it.rot, it.size);
          }
        }

        // blossom basket
        var cy = this.catcherY();
        var blink = this.invuln > 0 ? (Math.sin(app.t * 22) > 0 ? 0.45 : 1) : 1;
        ctx.save();
        ctx.globalAlpha = blink;
        Art.glow(ctx, this.cx, cy, 66, '#ffe9c9', 0.5);
        ctx.beginPath();
        ctx.moveTo(this.cx - 44, cy - 12);
        ctx.quadraticCurveTo(this.cx, cy + 44, this.cx + 44, cy - 12);
        ctx.quadraticCurveTo(this.cx, cy + 8, this.cx - 44, cy - 12);
        ctx.closePath();
        ctx.fillStyle = '#e8b06b';
        ctx.fill();
        ctx.strokeStyle = '#c98d4f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.cx - 44, cy - 12);
        ctx.quadraticCurveTo(this.cx, cy + 12, this.cx + 44, cy - 12);
        ctx.stroke();
        Art.flowerHead(ctx, this.cx - 40, cy - 16, 10, FLOWER_COLORS[0], 1, 0.4);
        ctx.restore();

        ctx.restore();

        if (this.state !== 'intro'){
          Art.hudPill(ctx, app.W / 2, hudTop(app), '🌸 ' + this.score + ' / ' + this.goal);
          Art.hudHearts(ctx, 30, hudTop(app), 3, this.lives);
        }
        Art.vignette(ctx, app.W, app.H);
      }
    };

    /* ========================================================
       3 — FLOWER MEMORY
       ======================================================== */

    function memFlowerSVG(d){
      var s = '<svg viewBox="0 0 60 72" xmlns="http://www.w3.org/2000/svg">';
      var i, a;
      if (d === 0){ // daisy
        s += '<path d="M30 46 Q29 58 30 66" stroke="#7ea06f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        s += '<path d="M30 58 Q22 55 19 48 Q28 48 30 55 Z" fill="#8fb586"/>';
        for (i = 0; i < 8; i++){
          a = i * 45;
          s += '<ellipse cx="30" cy="17" rx="5.6" ry="14" fill="#fffdf8" stroke="#f0d9e2" stroke-width="0.8" transform="rotate(' + a + ' 30 31)"/>';
        }
        s += '<circle cx="30" cy="31" r="7.5" fill="#ffd473"/>';
        s += '<circle cx="27.5" cy="28.5" r="2" fill="#fff0c9"/>';
      } else if (d === 1){ // rose
        s += '<path d="M30 48 Q29 58 30 66" stroke="#7ea06f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        s += '<path d="M30 60 Q38 57 41 50 Q32 50 30 57 Z" fill="#8fb586"/>';
        s += '<circle cx="30" cy="31" r="17" fill="#ee85ab" stroke="#d86a96" stroke-width="1.4"/>';
        s += '<circle cx="30" cy="31" r="12" fill="#f6a5c3"/>';
        s += '<circle cx="30" cy="31" r="7" fill="#fbc4d6"/>';
        s += '<path d="M30 31 a3.5 3.5 0 1 1 -3.5 -3.5 M30 31 a7.5 7.5 0 1 1 7 9" fill="none" stroke="#d86a96" stroke-width="1.6" stroke-linecap="round"/>';
      } else if (d === 2){ // tulip
        s += '<path d="M30 47 Q29 58 30 66" stroke="#7ea06f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        s += '<path d="M30 58 Q22 55 19 48 Q28 48 30 55 Z" fill="#8fb586"/>';
        s += '<path d="M18 28 L21 13 Q25.5 22 30 10 Q34.5 22 39 13 L42 28 C42 40 36 47 30 47 C24 47 18 40 18 28 Z" fill="#ff9d94"/>';
        s += '<path d="M24 24 Q30 30 36 24" fill="none" stroke="#ee8078" stroke-width="1.4" stroke-linecap="round"/>';
      } else if (d === 3){ // bluebell
        s += '<path d="M14 8 Q34 10 32 20" stroke="#7ea06f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        s += '<path d="M14 8 Q10 20 16 30 Q20 18 14 8 Z" fill="#8fb586"/>';
        s += '<path d="M21 30 C21 21 25 18 31 18 C37 18 41 21 41 30 C41 36 39 40 37 41 Q35 46 32.5 42 Q31 47 29.5 42 Q27 46 25 41 C23 40 21 36 21 30 Z" fill="#a9b6ec"/>';
        s += '<path d="M26 24 Q31 21 36 24" fill="none" stroke="#8d9bd9" stroke-width="1.4" stroke-linecap="round"/>';
      } else if (d === 4){ // sunflower
        s += '<path d="M30 46 Q29 58 30 66" stroke="#7ea06f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        s += '<path d="M30 58 Q38 55 41 48 Q32 48 30 55 Z" fill="#8fb586"/>';
        for (i = 0; i < 12; i++){
          a = i * 30;
          s += '<ellipse cx="30" cy="16" rx="4.4" ry="13.5" fill="#ffcf6e" transform="rotate(' + a + ' 30 31)"/>';
        }
        s += '<circle cx="30" cy="31" r="9" fill="#8a6644"/>';
        for (i = 0; i < 6; i++){
          a = i * 60 * Math.PI / 180;
          s += '<circle cx="' + (30 + Math.cos(a) * 4.5).toFixed(1) + '" cy="' + (31 + Math.sin(a) * 4.5).toFixed(1) + '" r="1.3" fill="#6b4a33"/>';
        }
      } else { // lotus
        s += '<path d="M30 46 Q29 58 30 66" stroke="#7ea06f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        s += '<path d="M30 58 Q22 55 19 48 Q28 48 30 55 Z" fill="#8fb586"/>';
        var pts = [-52, -26, 0, 26, 52];
        for (i = 0; i < pts.length; i++){
          s += '<path d="M30 44 C23 37 23 22 30 12 C37 22 37 37 30 44 Z" fill="' + (i === 2 ? '#f8bcd2' : '#f29dbd') + '" transform="rotate(' + pts[i] + ' 30 44)"/>';
        }
        s += '<ellipse cx="30" cy="39" rx="4.5" ry="3.5" fill="#ffd473"/>';
      }
      return s + '</svg>';
    }

    function memBackSVG(){
      return '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M20 33 C10 25.5 6.5 19 10 14 C13 10 18 11 20 15.5 C22 11 27 10 30 14 C33.5 19 30 25.5 20 33 Z" fill="rgba(255,255,255,0.9)"/>' +
        '</svg>';
    }

    var memory = {
      name: 'game3',
      state: 'intro',
      wrap: null,
      first: null,
      lock: false,
      matched: 0,

      enter: function(){
        this.state = 'intro';
        this.wrap = null;
        this.first = null;
        this.lock = false;
        this.matched = 0;
        FX.ambient = 5;
        var self = this;
        UI.gameIntro(2, function(){
          self.state = 'play';
          self.buildGrid();
        });
      },

      exit: function(){
        if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
        this.wrap = null;
      },

      buildGrid: function(){
        var deck = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
        for (var i = deck.length - 1; i > 0; i--){
          var j = (Math.random() * (i + 1)) | 0;
          var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
        }

        var wrap = document.createElement('div');
        wrap.className = 'mem-wrap';
        wrap.innerHTML = '<div class="mem-title">Find the matching pairs 🌸</div>';
        var grid = document.createElement('div');
        grid.className = 'mem-grid';
        wrap.appendChild(grid);

        var self = this;
        deck.forEach(function(d){
          var card = document.createElement('button');
          card.className = 'mcard';
          card.setAttribute('data-d', d);
          card.innerHTML =
            '<div class="mcard-inner">' +
              '<div class="mface front">' + memBackSVG() + '</div>' +
              '<div class="mface back">' + memFlowerSVG(d) + '</div>' +
            '</div>';
          card.addEventListener('click', function(){ self.tapCard(card, d); });
          grid.appendChild(card);
        });

        document.getElementById('overlay').appendChild(wrap);
        this.wrap = wrap;
      },

      tapCard: function(card, d){
        if (this.state !== 'play' || this.lock) return;
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

        card.classList.add('flipped');
        Sfx.flip();

        if (!this.first){
          this.first = { card: card, d: d };
          return;
        }

        var first = this.first;
        this.first = null;
        this.lock = true;
        var self = this;

        if (first.d === d){
          // a matched pair stays revealed forever
          setTimeout(function(){
            first.card.classList.add('matched');
            card.classList.add('matched');
            Sfx.bell(1.2);
            self.sparkleAt(card);
            self.sparkleAt(first.card);
            self.matched++;
            self.lock = false;
            if (self.matched >= 6){
              self.state = 'won';
              self.wrap.classList.add('won');
              setTimeout(function(){
                if (self.wrap && self.wrap.parentNode) self.wrap.parentNode.removeChild(self.wrap);
                self.wrap = null;
                WinFX.start(app, 2, WIN_MESSAGES[2]);
              }, 850);
            }
          }, 380);
        } else {
          setTimeout(function(){
            first.card.classList.remove('flipped');
            card.classList.remove('flipped');
            Sfx.pop();
            self.lock = false;
          }, 800);
        }
      },

      sparkleAt: function(card){
        var r = card.getBoundingClientRect();
        var s = app.canvas.getBoundingClientRect();
        FX.sparkleBurst(r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top, 8, '#ffe9f2');
      },

      update: function(){},
      pointer: function(){},

      draw: function(ctx){
        Art.background(ctx, app, app.t, app.progress() / 5, { dim: 0.3 });
        Art.vignette(ctx, app.W, app.H);
      }
    };

    /* ========================================================
       4 — BEE RESCUE
       ======================================================== */

    var bee = {
      name: 'game4',
      state: 'intro',
      COLS: 7,
      ROWS: 9,
      walls: null,
      rects: [],
      segs: [],
      deco: [],
      solution: [],
      cell: 40, gx: 0, gy: 0,
      bx: 0, by: 0,
      pressed: false,
      target: null,
      trailAcc: 0,
      hintT: 0,

      enter: function(){
        this.state = 'intro';
        this.pressed = false;
        this.target = null;
        this.hintT = 0;
        FX.ambient = 4;
        this.generate();
        this.layout();
        this.bx = this.gx + this.cell * 0.5;
        this.by = this.gy + this.cell * 0.5;
        var self = this;
        UI.gameIntro(3, function(){ self.state = 'play'; });
      },
      exit: function(){},

      generate: function(){
        var C = this.COLS, R = this.ROWS;
        var walls = [];
        var visited = [];
        var r, c;
        for (r = 0; r < R; r++){
          walls.push([]); visited.push([]);
          for (c = 0; c < C; c++){
            walls[r].push({ t: true, l: true, b: true, rt: true });
            visited[r].push(false);
          }
        }
        var stack = [[0, 0]];
        visited[0][0] = true;
        while (stack.length){
          var cur = stack[stack.length - 1];
          var cc = cur[0], cr = cur[1];
          var opts = [];
          if (cr > 0 && !visited[cr - 1][cc]) opts.push('t');
          if (cr < R - 1 && !visited[cr + 1][cc]) opts.push('b');
          if (cc > 0 && !visited[cr][cc - 1]) opts.push('l');
          if (cc < C - 1 && !visited[cr][cc + 1]) opts.push('rt');
          if (!opts.length){ stack.pop(); continue; }
          var dir = pick(opts);
          if (dir === 't'){ walls[cr][cc].t = false; walls[cr - 1][cc].b = false; visited[cr - 1][cc] = true; stack.push([cc, cr - 1]); }
          else if (dir === 'b'){ walls[cr][cc].b = false; walls[cr + 1][cc].t = false; visited[cr + 1][cc] = true; stack.push([cc, cr + 1]); }
          else if (dir === 'l'){ walls[cr][cc].l = false; walls[cr][cc - 1].rt = false; visited[cr][cc - 1] = true; stack.push([cc - 1, cr]); }
          else { walls[cr][cc].rt = false; walls[cr][cc + 1].l = false; visited[cr][cc + 1] = true; stack.push([cc + 1, cr]); }
        }
        this.walls = walls;

        // BFS solution path (start top-left, goal bottom-right)
        var prev = {};
        var queue = [[0, 0]];
        var seen = { '0,0': true };
        while (queue.length){
          var n = queue.shift();
          var nc = n[0], nr = n[1];
          if (nc === C - 1 && nr === R - 1) break;
          var w = walls[nr][nc];
          var nbrs = [];
          if (!w.t) nbrs.push([nc, nr - 1]);
          if (!w.b) nbrs.push([nc, nr + 1]);
          if (!w.l) nbrs.push([nc - 1, nr]);
          if (!w.rt) nbrs.push([nc + 1, nr]);
          for (var k = 0; k < nbrs.length; k++){
            var key = nbrs[k][0] + ',' + nbrs[k][1];
            if (!seen[key]){
              seen[key] = true;
              prev[key] = n;
              queue.push(nbrs[k]);
            }
          }
        }
        var path = [];
        var node = [C - 1, R - 1];
        while (node){
          path.unshift(node);
          node = prev[node[0] + ',' + node[1]];
        }
        this.solution = path;

        // decorative flowers on some wall corners
        this.deco = [];
        for (var d = 0; d < 12; d++){
          this.deco.push({
            c: rand(0, C), r: rand(0, R),
            colIdx: randi(0, FLOWER_COLORS.length - 1),
            s: rand(4, 7)
          });
        }
      },

      layout: function(){
        var W = app.W, H = app.H;
        var top = hudTop(app) + 30;
        var bottom = H - 30;
        this.cell = Math.min((W - 36) / this.COLS, (bottom - top) / this.ROWS);
        this.gx = (W - this.cell * this.COLS) / 2;
        this.gy = top + ((bottom - top) - this.cell * this.ROWS) / 2;

        var wt = Math.max(7, this.cell * 0.18);
        this.wt = wt;
        this.rects = [];
        this.segs = [];
        var g = this;
        function wallRect(x1, y1, x2, y2){
          g.segs.push([x1, y1, x2, y2]);
          g.rects.push({
            x: Math.min(x1, x2) - wt / 2, y: Math.min(y1, y2) - wt / 2,
            w: Math.abs(x2 - x1) + wt, h: Math.abs(y2 - y1) + wt
          });
        }
        for (var r = 0; r < this.ROWS; r++){
          for (var c = 0; c < this.COLS; c++){
            var w = this.walls[r][c];
            var x = this.gx + c * this.cell, y = this.gy + r * this.cell;
            if (w.t) wallRect(x, y, x + this.cell, y);
            if (w.l) wallRect(x, y, x, y + this.cell);
            if (c === this.COLS - 1 && w.rt) wallRect(x + this.cell, y, x + this.cell, y + this.cell);
            if (r === this.ROWS - 1 && w.b) wallRect(x, y + this.cell, x + this.cell, y + this.cell);
          }
        }
      },

      resize: function(){
        var fx = (this.bx - this.gx) / this.cell;
        var fy = (this.by - this.gy) / this.cell;
        this.layout();
        this.bx = this.gx + fx * this.cell;
        this.by = this.gy + fy * this.cell;
      },

      beeR: function(){ return this.cell * 0.2; },

      goalPos: function(){
        return {
          x: this.gx + (this.COLS - 0.5) * this.cell,
          y: this.gy + (this.ROWS - 0.5) * this.cell
        };
      },

      solutionPx: function(){
        var out = [];
        for (var i = 0; i < this.solution.length; i++){
          out.push({
            x: this.gx + (this.solution[i][0] + 0.5) * this.cell,
            y: this.gy + (this.solution[i][1] + 0.5) * this.cell
          });
        }
        return out;
      },

      collides: function(x, y){
        var r = this.beeR();
        for (var i = 0; i < this.rects.length; i++){
          var rc = this.rects[i];
          var nx = clamp(x, rc.x, rc.x + rc.w);
          var ny = clamp(y, rc.y, rc.y + rc.h);
          var dx = x - nx, dy = y - ny;
          if (dx * dx + dy * dy < r * r) return true;
        }
        return false;
      },

      update: function(dt){
        if (this.state !== 'play') return;
        this.hintT += dt;

        if (this.pressed && this.target){
          var speed = this.cell * 4.6;
          var dx = this.target.x - this.bx;
          var dy = this.target.y - this.by;
          var dist = Math.hypot(dx, dy);
          if (dist > 2){
            var move = Math.min(dist, speed * dt);
            var ux = dx / dist, uy = dy / dist;
            var steps = Math.ceil(move / 2.5);
            var stepLen = move / steps;
            for (var s = 0; s < steps; s++){
              var nx = this.bx + ux * stepLen;
              if (!this.collides(nx, this.by)) this.bx = nx;
              var ny = this.by + uy * stepLen;
              if (!this.collides(this.bx, ny)) this.by = ny;
            }
            this.trailAcc += move;
            if (this.trailAcc > 14){
              this.trailAcc = 0;
              FX.pollen(this.bx, this.by + 4);
            }
            this.tilt = clamp(ux * 0.35, -0.4, 0.4);
          }
        }

        var goal = this.goalPos();
        if (Math.hypot(this.bx - goal.x, this.by - goal.y) < this.cell * 0.36){
          this.state = 'won';
          FX.petalBurst(goal.x, goal.y, 14);
          FX.sparkleBurst(goal.x, goal.y, 14, '#fff3c9');
          WinFX.start(app, 3, WIN_MESSAGES[3]);
        }
      },

      pointer: function(type, x, y){
        if (this.state !== 'play') return;
        if (type === 'down'){ this.pressed = true; this.target = { x: x, y: y }; }
        else if (type === 'move' && this.pressed){ this.target = { x: x, y: y }; }
        else if (type === 'up'){ this.pressed = false; }
      },

      draw: function(ctx){
        Art.background(ctx, app, app.t, app.progress() / 5, { dim: 0.28 });

        // garden bed panel
        var px = this.gx - 15, py = this.gy - 15;
        var pw = this.cell * this.COLS + 30, ph = this.cell * this.ROWS + 30;
        ctx.beginPath();
        roundRectPath(ctx, px, py, pw, ph, 18);
        ctx.fillStyle = 'rgba(255,250,240,0.72)';
        ctx.fill();

        // hedge walls
        var i;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#8fb086';
        ctx.lineWidth = this.wt + 2;
        ctx.beginPath();
        for (i = 0; i < this.segs.length; i++){
          var sg = this.segs[i];
          ctx.moveTo(sg[0], sg[1]);
          ctx.lineTo(sg[2], sg[3]);
        }
        ctx.stroke();
        ctx.strokeStyle = '#a9c79b';
        ctx.lineWidth = Math.max(2, this.wt - 5);
        ctx.stroke();

        // little flowers along the hedges
        for (i = 0; i < this.deco.length; i++){
          var d = this.deco[i];
          Art.flowerHead(ctx,
            this.gx + d.c * this.cell, this.gy + d.r * this.cell,
            d.s, FLOWER_COLORS[d.colIdx], 1, i);
        }

        // start pad & goal flower
        var goal = this.goalPos();
        var pulse = 0.88 + 0.12 * Math.sin(app.t * 2.4);
        Art.glow(ctx, goal.x, goal.y, this.cell * 1.1, '#ffcfe2', 0.6);
        Art.flowerHead(ctx, goal.x, goal.y, this.cell * 0.3 * pulse, FLOWER_COLORS[0], 1, app.t * 0.2);

        // bee
        Art.glow(ctx, this.bx, this.by, this.cell * 0.7, '#ffe9b8', 0.45);
        Art.drawBee(ctx, { x: this.bx, y: this.by, tilt: this.tilt || 0, t: app.t, size: this.beeR() * 1.15 });

        if (this.state === 'play' && this.hintT < 4){
          var ha = 0.5 + 0.5 * Math.sin(app.t * 4);
          ctx.save();
          ctx.globalAlpha = 0.35 + ha * 0.4;
          ctx.strokeStyle = '#f193b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(this.bx, this.by, this.beeR() + 12 + ha * 5, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        if (this.state !== 'intro'){
          Art.hudPill(ctx, app.W / 2, hudTop(app), 'Guide the bee to the flower 🌼');
        }
        Art.vignette(ctx, app.W, app.H);
      }
    };

    /* ========================================================
       5 — BLOOM CHALLENGE (gentle simon)
       ======================================================== */

    var bloom = {
      name: 'game5',
      state: 'intro',
      LENS: [3, 4, 5, 6, 7],
      SIMON_COLS: [0, 1, 2, 3, 5],
      seq: [],
      round: 1,
      showIdx: 0,
      showT: 0,
      inputIdx: 0,
      glows: [0, 0, 0, 0, 0],
      budBloom: 0,
      budTarget: 0,
      waitT: 0,
      nextAction: null,

      enter: function(){
        this.state = 'intro';
        this.seq = [];
        var prevPick = -1;
        for (var i = 0; i < 7; i++){
          var p = randi(0, 4);
          if (p === prevPick) p = (p + 1 + randi(0, 3)) % 5;
          this.seq.push(p);
          prevPick = p;
        }
        this.round = 1;
        this.glows = [0, 0, 0, 0, 0];
        this.budBloom = 0;
        this.budTarget = 0;
        this.nextAction = null;
        FX.ambient = 4;
        var self = this;
        UI.gameIntro(4, function(){ self.startRound(1); });
      },
      exit: function(){},

      len: function(){ return this.LENS[this.round - 1]; },
      noteDur: function(){ return 0.64 - this.round * 0.045; },

      flowerPos: function(i){
        var cy = app.safeTop + (app.H - app.safeTop) * 0.47;
        var R = Math.min(app.W * 0.36, 155);
        var a = -Math.PI / 2 + i * TAU / 5;
        return { x: app.W / 2 + Math.cos(a) * R, y: cy + Math.sin(a) * R };
      },

      startRound: function(r){
        this.round = r;
        this.state = 'wait';
        this.waitT = 0.8;
        var self = this;
        this.nextAction = function(){
          self.state = 'show';
          self.showIdx = 0;
          self.showT = 0;
        };
      },

      update: function(dt){
        if (this.state === 'intro') return;
        var i;
        for (i = 0; i < 5; i++) this.glows[i] = Math.max(0, this.glows[i] - dt * 2.2);
        this.budBloom += (this.budTarget - this.budBloom) * Math.min(1, dt * 3);

        if (this.state === 'wait'){
          this.waitT -= dt;
          if (this.waitT <= 0 && this.nextAction){
            var fn = this.nextAction;
            this.nextAction = null;
            fn();
          }
          return;
        }

        if (this.state === 'show'){
          this.showT += dt;
          var step = this.noteDur() + 0.18;
          var due = this.showIdx * step + 0.15;
          if (this.showT >= due && this.showIdx < this.len()){
            var f = this.seq[this.showIdx];
            this.glows[f] = 1;
            Sfx.simonNote(f);
            var pos = this.flowerPos(f);
            FX.sparkleBurst(pos.x, pos.y, 4, '#fff3c9');
            this.showIdx++;
          }
          if (this.showIdx >= this.len() && this.showT >= this.len() * step + 0.3){
            this.state = 'input';
            this.inputIdx = 0;
          }
        }
      },

      pointer: function(type, x, y){
        if (type !== 'down' || this.state !== 'input') return;
        var hit = -1;
        for (var i = 0; i < 5; i++){
          var p = this.flowerPos(i);
          if (Math.hypot(p.x - x, p.y - y) < 56){ hit = i; break; }
        }
        if (hit < 0) return;

        this.glows[hit] = 1;
        Sfx.simonNote(hit);
        var pos = this.flowerPos(hit);
        var self = this;

        if (hit === this.seq[this.inputIdx]){
          FX.sparkleBurst(pos.x, pos.y, 5, '#ffe9f2');
          this.inputIdx++;
          if (this.inputIdx >= this.len()){
            Sfx.chime();
            this.budTarget = this.round / 5;
            FX.petalBurst(app.W / 2, app.safeTop + (app.H - app.safeTop) * 0.47, 8);
            if (this.round >= 5){
              this.state = 'won';
              this.waitT = 0.7;
              this.nextAction = function(){
                WinFX.start(app, 4, WIN_MESSAGES[4], { btn: 'Continue ❤️' });
              };
              this.state = 'wait';
            } else {
              this.startRound(this.round + 1);
            }
          }
        } else {
          Sfx.sad();
          UI.toast('Almost! Watch once more 🌷', app.W / 2, app.safeTop + 120);
          this.state = 'wait';
          this.waitT = 1.1;
          this.nextAction = function(){
            self.state = 'show';
            self.showIdx = 0;
            self.showT = 0;
          };
        }
      },

      draw: function(ctx){
        Art.background(ctx, app, app.t, app.progress() / 5, { dim: 0.18 });

        var cx = app.W / 2;
        var cy = app.safeTop + (app.H - app.safeTop) * 0.47;

        // center bud grows as rounds are completed
        Art.glow(ctx, cx, cy, 70, '#ffcfe2', 0.3 + this.budBloom * 0.5);
        Art.flowerHead(ctx, cx, cy, 34, FLOWER_COLORS[4], this.budBloom, app.t * 0.15);

        for (var i = 0; i < 5; i++){
          var p = this.flowerPos(i);
          var g = this.glows[i];
          if (g > 0) Art.glow(ctx, p.x, p.y, 95, '#fff2c9', g * 0.9);
          Art.flowerHead(ctx, p.x, p.y, 40 * (1 + g * 0.2),
            FLOWER_COLORS[this.SIMON_COLS[i]], 1,
            Math.sin(app.t * 0.7 + i * 2) * 0.06,
            [0, 1, 3, 2, 0][i]);
        }

        if (this.state !== 'intro'){
          Art.hudPill(ctx, app.W / 2, hudTop(app), 'Round ' + this.round + ' / 5');
          var label = this.state === 'input' ? 'Your turn 🌸' :
                      (this.state === 'show' ? 'Watch… ✨' : '');
          if (label) Art.hudPill(ctx, app.W / 2, hudTop(app) + 42, label, { color: '#b06a8c' });
        }
        Art.vignette(ctx, app.W, app.H);
      }
    };

    return {
      game1: butterfly,
      game2: petalDash,
      game3: memory,
      game4: bee,
      game5: bloom
    };
  }

  return { makeScenes: makeScenes };
})();
