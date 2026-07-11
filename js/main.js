/* ============================================================
   Minyar's Garden Quest — app core
   Scenes: title → intro → hub ⇄ mini-games → ending
   ============================================================ */

'use strict';

var SAVE_KEY = 'mgq_save_v1';

var RANDOM_MSGS = [
  "You're adorable.",
  'You make me smile.',
  "You're my favorite person.",
  'Stay with me forever.',
  'I love your smile.',
  "You're my safe place.",
  'Thank you for existing.',
  'You make my world bloom.'
];

var MOON_LINES = [
  "I knew you'd find this...",
  "You're curious...",
  "That's one of the things I love about you. ❤️"
];

var LETTER_PARAS = [
  'Dear Minyar,',
  'Every flower in this garden bloomed because of you.',
  'Just like my happiest memories.',
  'Thank you for making my life softer, brighter, happier, and more beautiful every single day.',
  'Whenever life feels difficult, remember that somewhere there will always be a little garden where every flower blooms because you smiled.',
  'I hope this tiny adventure reminds you how deeply loved you are.',
  'I love you more than words could ever explain.',
  '❤️'
];

/* ============================================================
   App
   ============================================================ */

var App = {
  canvas: null,
  ctx: null,
  W: 360,
  H: 640,
  dpr: 1,
  safeTop: 0,
  t: 0,
  scene: null,
  scenes: {},
  transitioning: false,
  save: { b: [0, 0, 0, 0, 0], intro: 0, secret: 0, ending: 0, muted: 0 },

  progress: function(){
    var n = 0;
    for (var i = 0; i < 5; i++) if (this.save.b[i]) n++;
    return n;
  },

  persist: function(){
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) {}
  },

  load: function(){
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw){
        var s = JSON.parse(raw);
        if (s && s.b && s.b.length === 5) this.save = s;
      }
    } catch (e) {}
  },

  go: function(name, data){
    if (this.transitioning) return;
    this.transitioning = true;
    var self = this;
    UI.fade(true);
    setTimeout(function(){
      UI.clearOverlay();
      if (self.scene && self.scene.exit) self.scene.exit();
      FX.clear();
      self.scene = self.scenes[name];
      document.body.setAttribute('data-scene', name);
      if (self.scene.enter) self.scene.enter(data);
      UI.fade(false);
      setTimeout(function(){ self.transitioning = false; }, 220);
    }, 470);
  },

  completeGame: function(idx){
    this.save.b[idx] = 1;
    this.persist();
    this.go('hub', { justWon: idx });
  }
};

/* ============================================================
   UI helpers (DOM overlays)
   ============================================================ */

var UI = (function(){
  var overlay, toasts, fadeEl, blossomBar, muteBtn;
  var activeDialogue = null;

  function init(){
    overlay = document.getElementById('overlay');
    toasts = document.getElementById('toasts');
    fadeEl = document.getElementById('fade');
    blossomBar = document.getElementById('blossomBar');
    muteBtn = document.getElementById('muteBtn');
    muteBtn.innerHTML = muteIcon(false);
    muteBtn.addEventListener('click', function(){
      var m = !App.save.muted;
      App.save.muted = m ? 1 : 0;
      App.persist();
      Sfx.unlock();
      Sfx.setMuted(!!m);
      muteBtn.innerHTML = muteIcon(!!m);
    });
  }

  function muteIcon(muted){
    var base = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#b06a8c"/>';
    if (muted){
      return base + '<path d="M16 9.5l5 5M21 9.5l-5 5" stroke="#b06a8c" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>';
    }
    return base + '<path d="M15.8 9.4c1.3 1.5 1.3 3.7 0 5.2M18.4 7.2c2.3 2.7 2.3 6.9 0 9.6" stroke="#b06a8c" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>';
  }

  function butterflySVG(){
    return '<svg viewBox="0 0 60 60">' +
      '<path d="M29 30 C20 12 5 14 7 27 C9 39 21 41 29 34 Z" fill="#f7a8c8"/>' +
      '<path d="M31 30 C40 12 55 14 53 27 C51 39 39 41 31 34 Z" fill="#c3a8ea"/>' +
      '<path d="M29 33 C22 42 10 46 11 38 C12 31 22 30 29 33 Z" fill="#fdd6e5"/>' +
      '<path d="M31 33 C38 42 50 46 49 38 C48 31 38 30 31 33 Z" fill="#e4d6f7"/>' +
      '<ellipse cx="30" cy="32" rx="2.4" ry="8" fill="#7a5a4a"/>' +
      '<path d="M30 25 Q26 18 24 18 M30 25 Q34 18 36 18" stroke="#7a5a4a" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  function blossomSVG(filled, gid){
    var fill = filled ? 'url(#bg' + gid + ')' : 'rgba(255,255,255,0.6)';
    var stroke = filled ? '' : ' stroke="#e58ab2" stroke-width="2"';
    return '<svg viewBox="0 0 40 40">' +
      '<defs><linearGradient id="bg' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f9a8c9"/><stop offset="1" stop-color="#e26d9e"/>' +
      '</linearGradient></defs>' +
      '<path d="M20 33 C10 25.5 6.5 19 10 14 C13 10 18 11 20 15.5 C22 11 27 10 30 14 C33.5 19 30 25.5 20 33 Z" fill="' + fill + '"' + stroke + '/>' +
      (filled ? '<circle cx="15.5" cy="16.5" r="2.2" fill="rgba(255,255,255,0.7)"/>' : '') +
      '</svg>';
  }

  function setBlossoms(arr, popIdx){
    blossomBar.innerHTML = '';
    for (var i = 0; i < 5; i++){
      var d = document.createElement('div');
      d.className = 'blossom' + (popIdx === i ? ' pop' : '');
      d.innerHTML = blossomSVG(!!arr[i], i);
      blossomBar.appendChild(d);
    }
  }

  function fade(on){
    fadeEl.classList.toggle('show', !!on);
  }

  function clearOverlay(){
    if (activeDialogue){ activeDialogue.cancel(); activeDialogue = null; }
    overlay.innerHTML = '';
  }

  function toast(text, x, y){
    if (toasts.children.length > 3) toasts.removeChild(toasts.firstChild);
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    el.style.left = clamp(x, 90, App.W - 90) + 'px';
    el.style.top = clamp(y, App.safeTop + 70, App.H - 60) + 'px';
    toasts.appendChild(el);
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 2250);
  }

  /* generic card */
  function card(opts){
    clearOverlay();
    var el = document.createElement('div');
    el.className = 'card';
    var html = '';
    if (opts.icon) html += '<div class="card-icon">' + opts.icon + '</div>';
    if (opts.title) html += '<div class="card-title">' + opts.title + '</div>';
    if (opts.text) html += '<div class="card-text">' + opts.text.replace(/\n/g, '<br>') + '</div>';
    if (opts.msg) html += '<div class="card-msg">' + opts.msg.replace(/\n/g, '<br>') + '</div>';
    html += '<div class="card-actions"></div>';
    el.innerHTML = html;
    var actions = el.querySelector('.card-actions');
    (opts.buttons || []).forEach(function(b){
      var btn = document.createElement('button');
      btn.className = 'btn' + (b.secondary ? ' secondary' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', function(){
        Sfx.pop();
        el.classList.add('leaving');
        setTimeout(function(){
          if (el.parentNode) el.parentNode.removeChild(el);
          if (b.cb) b.cb();
        }, 240);
      });
      actions.appendChild(btn);
    });
    overlay.appendChild(el);
    return el;
  }

  function gameIntro(i, onStart){
    card({
      icon: GAME_ICONS[i],
      title: GAME_TITLES[i],
      text: GAME_DESCS[i],
      buttons: [{ label: 'Start 🌷', cb: onStart }]
    });
  }

  function winCard(idx, msg, btnLabel, cb){
    card({
      icon: blossomSVG(true, 'win' + idx),
      title: idx < 4 ? 'A Heart Blossom!' : 'The final Heart Blossom!',
      msg: msg,
      buttons: [{ label: btnLabel, cb: cb }]
    });
    Sfx.fanfare();
  }

  /* typewriter dialogue from the butterfly guide */
  function dialogue(lines, onDone){
    clearOverlay();
    var catcher = document.createElement('div');
    catcher.className = 'dialogue-catch';
    var box = document.createElement('div');
    box.className = 'dialogue';
    box.innerHTML =
      '<div class="dlg-icon">' + butterflySVG() + '</div>' +
      '<div class="dlg-body"><div class="dlg-text"></div><div class="dlg-hint">tap ❀</div></div>';
    catcher.appendChild(box);
    overlay.appendChild(catcher);
    var textEl = box.querySelector('.dlg-text');

    var li = 0, ci = 0, timer = null, done = false;

    function typeLine(){
      ci = 0;
      textEl.textContent = '';
      clearInterval(timer);
      timer = setInterval(function(){
        ci++;
        textEl.textContent = lines[li].slice(0, ci);
        if (ci % 3 === 0) Sfx.sparkle();
        if (ci >= lines[li].length) clearInterval(timer);
      }, 34);
    }

    function cleanup(){
      done = true;
      clearInterval(timer);
      if (catcher.parentNode) catcher.parentNode.removeChild(catcher);
      activeDialogue = null;
    }

    catcher.addEventListener('click', function(){
      if (done) return;
      if (ci < lines[li].length){
        clearInterval(timer);
        ci = lines[li].length;
        textEl.textContent = lines[li];
      } else {
        li++;
        if (li >= lines.length){
          cleanup();
          if (onDone) onDone();
        } else {
          typeLine();
        }
      }
    });

    typeLine();
    activeDialogue = { cancel: cleanup };
    return activeDialogue;
  }

  /* ---------- title screen ---------- */

  function showTitle(onBegin){
    clearOverlay();
    var w = document.createElement('div');
    w.className = 'title-wrap';
    w.innerHTML =
      '<div class="title-fly">' + butterflySVG() + '</div>' +
      '<div class="title-main">Minyar’s<br>Garden Quest</div>' +
      '<div class="title-sub">🌸 a tiny adventure, made with love 🌸</div>';
    var btn = document.createElement('button');
    btn.className = 'btn big';
    btn.textContent = App.save.intro ? 'Continue 🌸' : 'Begin 🌸';
    btn.addEventListener('click', function(){
      Sfx.unlock();
      Sfx.setMuted(!!App.save.muted);
      Sfx.pop();
      onBegin();
    });
    w.appendChild(btn);
    var foot = document.createElement('div');
    foot.className = 'title-foot';
    foot.textContent = 'for Minyar ❤️';
    w.appendChild(foot);
    overlay.appendChild(w);
  }

  /* ---------- ending pieces ---------- */

  function showEndingTitle(){
    var el = document.createElement('div');
    el.className = 'ending-title';
    el.textContent = 'Bloomed by Minyar ❤️';
    document.getElementById('ui').appendChild(el);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ el.classList.add('show'); });
    });
    return el;
  }

  function showEnvelope(onOpened){
    clearOverlay();
    var w = document.createElement('div');
    w.className = 'env-wrap';
    w.innerHTML =
      '<div class="envelope">' +
        '<div class="env-back"></div>' +
        '<div class="env-letter">💌</div>' +
        '<div class="env-front"></div>' +
        '<div class="env-flap"></div>' +
        '<div class="env-seal">❤</div>' +
      '</div>' +
      '<div class="env-hint">Tap to open</div>';
    var opened = false;
    w.addEventListener('click', function(){
      if (opened) return;
      opened = true;
      w.classList.add('open');
      Sfx.flip();
      Sfx.chime();
      setTimeout(function(){ w.classList.add('fadeout'); }, 500);
      setTimeout(function(){
        if (w.parentNode) w.parentNode.removeChild(w);
        if (onOpened) onOpened();
      }, 1900);
    });
    overlay.appendChild(w);
  }

  function showLetter(onHug){
    clearOverlay();
    var el = document.createElement('div');
    el.className = 'letter-card';
    var body = document.createElement('div');
    body.className = 'letter-body';
    LETTER_PARAS.forEach(function(p){
      var pe = document.createElement('p');
      if (p === '❤️') pe.className = 'heart';
      pe.textContent = p;
      body.appendChild(pe);
    });
    el.appendChild(body);
    var actions = document.createElement('div');
    actions.className = 'letter-actions';
    var btn = document.createElement('button');
    btn.className = 'btn big';
    btn.textContent = 'Hug ❤️';
    btn.addEventListener('click', function(){
      el.classList.add('leaving');
      setTimeout(function(){
        if (el.parentNode) el.parentNode.removeChild(el);
        if (onHug) onHug();
      }, 240);
    });
    actions.appendChild(btn);
    el.appendChild(actions);
    overlay.appendChild(el);
  }

  function showFinale(onReturn){
    clearOverlay();
    var el = document.createElement('div');
    el.className = 'finale';
    var txt = document.createElement('div');
    txt.className = 'finale-text';
    txt.textContent = 'Thank you for playing, Minyar.';
    el.appendChild(txt);
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Return to the garden 🌸';
    btn.addEventListener('click', function(){ if (onReturn) onReturn(); });
    el.appendChild(btn);
    overlay.appendChild(el);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ el.classList.add('show'); });
    });
    setTimeout(function(){ btn.classList.add('show'); }, 3200);
    return el;
  }

  return {
    init: init,
    fade: fade,
    clearOverlay: clearOverlay,
    toast: toast,
    card: card,
    gameIntro: gameIntro,
    winCard: winCard,
    dialogue: dialogue,
    setBlossoms: setBlossoms,
    showTitle: showTitle,
    showEndingTitle: showEndingTitle,
    showEnvelope: showEnvelope,
    showLetter: showLetter,
    showFinale: showFinale,
    butterflySVG: butterflySVG,
    muteIcon: muteIcon
  };
})();

/* ============================================================
   Title scene
   ============================================================ */

var titleScene = {
  name: 'title',
  enter: function(){
    FX.ambient = 10;
    UI.setBlossoms(App.save.b);
    UI.showTitle(function(){
      App.go(App.save.intro ? 'hub' : 'intro');
    });
  },
  exit: function(){},
  update: function(){},
  pointer: function(){},
  draw: function(ctx){
    var prog = App.progress() / 5;
    Art.background(ctx, App, App.t, prog);
    // a couple of foreground plants framing the title
    var W = App.W, H = App.H;
    Art.plant(ctx, { x: W * 0.13, y: H * 0.97, size: 26, col: FLOWER_COLORS[0], bloom: prog > 0 ? 1 : 0.0, t: App.t, phase: 0 });
    Art.plant(ctx, { x: W * 0.88, y: H * 0.99, size: 30, col: FLOWER_COLORS[1], bloom: prog > 0.3 ? 1 : 0.0, t: App.t, phase: 2 });
    Art.plant(ctx, { x: W * 0.72, y: H * 0.95, size: 20, col: FLOWER_COLORS[2], bloom: prog > 0.5 ? 1 : 0.0, t: App.t, phase: 4 });
    Art.glow(ctx, W / 2, H * 0.4, Math.min(W, H) * 0.5, '#fff2d9', 0.35);
  }
};

/* ============================================================
   Intro scene — the butterfly welcomes Minyar
   ============================================================ */

var introScene = {
  name: 'intro',
  t: 0,
  dlgStarted: false,
  flap: 0,

  enter: function(){
    this.t = 0;
    this.dlgStarted = false;
    FX.ambient = 6;
  },
  exit: function(){},

  update: function(dt){
    this.t += dt;
    this.flap += dt * 12;
    if (!this.dlgStarted && this.t > 1.6){
      this.dlgStarted = true;
      UI.dialogue([
        'Welcome, Minyar.',
        'This garden has been waiting for you.',
        'Restore its flowers and discover the secret hidden at its heart.'
      ], function(){
        App.save.intro = 1;
        App.persist();
        App.go('hub');
      });
    }
  },

  pointer: function(){},

  draw: function(ctx){
    Art.background(ctx, App, App.t, 0);
    hubScene.drawScenery(ctx, [0, 0, 0, 0, 0], { labels: false, decorBloom: 0 });

    // butterfly flies in
    var W = App.W, H = App.H;
    var k = easeOutCubic(Math.min(1, this.t / 2.2));
    var bx = lerp(-50, W / 2, k);
    var by = lerp(H * 0.6, H * 0.3, k) - Math.sin(k * Math.PI) * 70;
    by += Math.sin(App.t * 1.8) * 6;
    Art.drawButterfly(ctx, {
      x: bx, y: by,
      angle: k < 0.95 ? Math.atan2(H * 0.3 - H * 0.6, W / 2 + 50) : Math.sin(App.t) * 0.2,
      flap: this.flap, size: 20, col: BFLY_COLORS[0]
    });
    Art.vignette(ctx, W, H);
  }
};

/* ============================================================
   Hub scene — the garden
   ============================================================ */

var hubScene = {
  name: 'hub',
  QUESTS: [[0.25, 0.80], [0.75, 0.74], [0.23, 0.64], [0.77, 0.56], [0.50, 0.47]],
  QSIZES: [30, 28, 27, 25, 27],
  DECOR: [
    [0.09, 0.91], [0.38, 0.94], [0.68, 0.92], [0.93, 0.86], [0.07, 0.73],
    [0.93, 0.67], [0.08, 0.56], [0.90, 0.45], [0.42, 0.56], [0.60, 0.67]
  ],
  moonTaps: 0,
  blooms: [0, 0, 0, 0, 0],
  animIdx: null,
  animT: 0,
  animBurst: false,
  dlgTimer: -1,
  hintT: -1,
  decorCd: [],
  flap: 0,

  enter: function(data){
    FX.ambient = 10;
    this.flap = 0;
    this.decorCd = this.DECOR.map(function(){ return 0; });
    this.blooms = App.save.b.map(function(v){ return v ? 1 : 0; });
    this.animIdx = null;

    var justWon = data && data.justWon != null ? data.justWon : null;
    if (justWon != null){
      this.blooms[justWon] = 0;
      this.animIdx = justWon;
      this.animT = -0.45;
      this.animBurst = false;
      UI.setBlossoms(App.save.b, justWon);
    } else {
      UI.setBlossoms(App.save.b);
    }

    var allDone = App.progress() === 5;
    this.dlgTimer = (allDone && !App.save.ending) ? (justWon === 4 ? 2.6 : 1.2) : -1;
    this.hintT = (App.progress() === 0 && !App.save.intro) ? -1 :
                 (App.progress() === 0 ? 1.0 : -1);
  },
  exit: function(){},

  questPos: function(i){
    var q = this.QUESTS[i];
    var scale = Math.min(App.W / 390, 1.15);
    var size = this.QSIZES[i] * scale;
    var x = App.W * q[0];
    var gy = App.H * q[1];
    return { x: x, gy: gy, size: size, hx: x, hy: gy - size * 2.1 };
  },

  heartPos: function(){
    return { x: App.W * 0.5, y: App.H * 0.60 };
  },

  moonPos: function(){
    return { x: App.W * 0.84, y: App.safeTop + App.H * 0.085 + 18, r: 40 };
  },

  update: function(dt){
    this.flap += dt * 11;

    if (this.animIdx != null){
      this.animT += dt;
      if (this.animT > 0){
        if (this.animT < dt * 1.5) Sfx.bloom();
        var v = Math.min(1, this.animT / 1.4);
        this.blooms[this.animIdx] = v;
        if (!this.animBurst && v > 0.45){
          this.animBurst = true;
          var p = this.questPos(this.animIdx);
          FX.petalBurst(p.hx, p.hy, 12, FLOWER_COLORS[this.animIdx].p);
          FX.sparkleBurst(p.hx, p.hy, 10, '#fff3c9');
        }
        if (this.animT > 1.7) this.animIdx = null;
      }
    }

    if (this.dlgTimer > 0){
      this.dlgTimer -= dt;
      if (this.dlgTimer <= 0){
        UI.dialogue([
          'The last flower has bloomed...',
          "Can you feel it, Minyar? The garden's heart is awakening."
        ], function(){
          App.go('ending');
        });
      }
    }

    if (this.hintT > 0){
      this.hintT -= dt;
      if (this.hintT <= 0){
        UI.toast('Tap a sleeping flower to begin 🌸', App.W / 2, App.H * 0.36);
      }
    }

    for (var i = 0; i < this.decorCd.length; i++){
      this.decorCd[i] = Math.max(0, this.decorCd[i] - dt);
    }
  },

  /* shared scenery renderer (also used by the intro, colorless) */
  drawScenery: function(ctx, blooms, opts){
    opts = opts || {};
    var W = App.W, H = App.H;
    var i, p;

    // petal stepping stones along the winding path
    var pts = [[0.5, 0.95]];
    for (i = 0; i < this.QUESTS.length; i++) pts.push(this.QUESTS[i]);
    ctx.save();
    ctx.fillStyle = 'rgba(255,250,238,0.4)';
    for (i = 0; i < pts.length - 1; i++){
      for (var s = 1; s <= 4; s++){
        var tt = s / 5;
        var px = lerp(pts[i][0], pts[i + 1][0], tt) * W + Math.sin(i * 5 + s * 2.7) * 12;
        var py = lerp(pts[i][1], pts[i + 1][1], tt) * H;
        ctx.beginPath();
        ctx.ellipse(px, py, 7, 4, 0.3, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // decorative flowers, colouring in as the garden is restored
    var decorBloom = opts.decorBloom != null ? opts.decorBloom : App.progress() / 5;
    for (i = 0; i < this.DECOR.length; i++){
      var frac = this.DECOR[i];
      var db = clamp(decorBloom * 12 - i, 0, 1);
      Art.plant(ctx, {
        x: frac[0] * W, y: frac[1] * H,
        size: 13 + (i % 3) * 3,
        col: FLOWER_COLORS[i % FLOWER_COLORS.length],
        bloom: db, t: App.t, phase: i * 1.7,
        stem: 1.7, noGlow: true
      });
    }

    // the five quest flowers
    var nextIdx = -1;
    for (i = 0; i < 5; i++) if (!App.save.b[i]){ nextIdx = i; break; }

    for (i = 0; i < 5; i++){
      p = this.questPos(i);
      Art.plant(ctx, {
        x: p.x, y: p.gy, size: p.size,
        col: FLOWER_COLORS[i],
        bloom: blooms[i], t: App.t, phase: i * 2.1
      });
      if (opts.labels !== false){
        Art.hudPill(ctx, p.x, p.gy + 18, GAME_TITLES[i], { font: '600 13px ', h: 26 });
        if (i === nextIdx && this.animIdx == null){
          Art.sparkleStar(ctx, p.hx + p.size * 1.1, p.hy - p.size * 1.1, 7, '#fff6dd', App.t * 1.4);
        }
      }
    }
  },

  draw: function(ctx){
    var W = App.W, H = App.H;
    var prog = App.progress() / 5;
    Art.background(ctx, App, App.t, prog);

    var moon = this.moonPos();
    Art.drawMoon(ctx, moon.x, moon.y, 46, !!App.save.secret, App.t);

    this.drawScenery(ctx, this.blooms, {});

    var allDone = App.progress() === 5;

    // the garden's heart (replay the finale once seen)
    if (allDone && App.save.ending){
      var hp = this.heartPos();
      var pulse = 1 + Math.sin(App.t * 2.2) * 0.08;
      Art.glow(ctx, hp.x, hp.y, 64 * pulse, '#ffb9d4', 0.75);
      ctx.save();
      ctx.translate(hp.x, hp.y);
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      heartPath(ctx, 26);
      var grad = ctx.createLinearGradient(0, -20, 0, 20);
      grad.addColorStop(0, '#f9a8c9');
      grad.addColorStop(1, '#e26d9e');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      Art.hudPill(ctx, hp.x, hp.y - 48, 'The Garden’s Heart ❤', { font: '600 13px ', h: 26 });
    }

    // guide butterfly
    var bx, by;
    if (allDone && App.save.ending){
      var hp2 = this.heartPos();
      bx = hp2.x + Math.sin(App.t * 0.8) * 30;
      by = hp2.y - 52 + Math.sin(App.t * 1.3) * 8;
    } else {
      bx = W * (0.5 + 0.3 * Math.sin(App.t * 0.23));
      by = App.safeTop + H * 0.24 + H * 0.045 * Math.sin(App.t * 0.31 + 1);
    }
    Art.drawButterfly(ctx, {
      x: bx, y: by,
      angle: Math.cos(App.t * 0.23) >= 0 ? 0.3 : -0.3,
      flap: this.flap, size: 15, col: BFLY_COLORS[0]
    });

    Art.vignette(ctx, W, H);
  },

  pointer: function(type, x, y){
    if (type !== 'down') return;
    var i, p, d;

    // moon secret
    var moon = this.moonPos();
    if (Math.hypot(moon.x - x, moon.y - y) < moon.r + 6){
      this.moonTaps++;
      Sfx.bell(1 + this.moonTaps * 0.12);
      FX.sparkleBurst(moon.x, moon.y, 8, '#fff6dd');
      if (this.moonTaps >= 5){
        this.moonTaps = 0;
        App.save.secret = 1;
        App.persist();
        UI.card({
          icon: '🌙',
          msg: MOON_LINES.join('\n\n'),
          buttons: [{ label: 'Close ✨', cb: function(){} }]
        });
      }
      return;
    }

    // quest flowers
    for (i = 0; i < 5; i++){
      p = this.questPos(i);
      d = Math.hypot(p.hx - x, p.hy - y);
      if (d < Math.max(44, p.size * 1.4)){
        var gameName = 'game' + (i + 1);
        if (!App.save.b[i]){
          Sfx.pop();
          App.go(gameName);
        } else {
          Sfx.chime();
          UI.card({
            icon: GAME_ICONS[i],
            title: GAME_TITLES[i],
            msg: i < 4 ? WIN_MESSAGES[i] : 'The melody of the garden, remembered. ✨',
            buttons: [
              { label: 'Play again ' + GAME_ICONS[i], cb: (function(n){ return function(){ App.go(n); }; })(gameName) },
              { label: 'Close', cb: function(){}, secondary: true }
            ]
          });
        }
        return;
      }
    }

    // the garden's heart
    if (App.progress() === 5 && App.save.ending){
      var hp = this.heartPos();
      if (Math.hypot(hp.x - x, hp.y - y) < 54){
        Sfx.chime();
        App.go('ending');
        return;
      }
    }

    // decorative flowers whisper love notes
    for (i = 0; i < this.DECOR.length; i++){
      var frac = this.DECOR[i];
      var fx = frac[0] * App.W;
      var fy = frac[1] * App.H - 24;
      if (Math.hypot(fx - x, fy - y) < 34 && this.decorCd[i] <= 0){
        this.decorCd[i] = 1.6;
        Sfx.bell(rand(1.1, 1.5));
        FX.petalBurst(fx, fy - 6, 6);
        FX.sparkleBurst(fx, fy - 6, 6, '#fff3c9');
        UI.toast(pick(RANDOM_MSGS), fx, fy - 48);
        return;
      }
    }
  }
};

/* ============================================================
   Ending scene — the heart garden, the letter, the hug
   ============================================================ */

var endingScene = {
  name: 'ending',
  t: 0,
  phase: 'zoom',
  flowers: [],
  titleEl: null,
  titleShown: false,
  envShown: false,
  celebT: 0,
  nextBurst: 0,
  burstCount: 0,
  finaleShown: false,

  heartPoint: function(a){
    var x = 16 * Math.pow(Math.sin(a), 3);
    var y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    return { x: x / 17, y: -y / 17 };
  },

  enter: function(){
    App.save.ending = 1;
    App.persist();

    this.t = 0;
    this.phase = 'zoom';
    this.titleShown = false;
    this.envShown = false;
    this.finaleShown = false;
    this.celebT = 0;
    this.flowers = [];
    FX.ambient = 26;

    var i, p;
    for (i = 0; i < 56; i++){
      var a = (i / 56) * TAU;
      p = this.heartPoint(a);
      this.addFlower(p.x, p.y);
    }
    for (i = 0; i < 74; i++){
      var aa = rand(0, TAU);
      var rr = Math.sqrt(Math.random()) * 0.86;
      p = this.heartPoint(aa);
      this.addFlower(p.x * rr, p.y * rr);
    }
    // pre-warm the sprite cache so the bloom wave never stutters
    for (var c = 0; c < FLOWER_COLORS.length; c++){
      for (var q = 0; q <= 10; q++) Art.flowerSprite(c, q, 96);
    }
    Sfx.bloom();
  },

  addFlower: function(hx, hy){
    var dist = Math.hypot(hx, hy);
    this.flowers.push({
      hx: hx, hy: hy,
      size: rand(11, 18),
      colIdx: randi(0, FLOWER_COLORS.length - 1),
      delay: 0.5 + dist * 2.4 + rand(0, 0.4),
      rot: rand(-0.5, 0.5)
    });
  },

  exit: function(){
    if (this.titleEl && this.titleEl.parentNode) this.titleEl.parentNode.removeChild(this.titleEl);
    this.titleEl = null;
    FX.ambient = 10;
  },

  update: function(dt){
    this.t += dt;
    var self = this;

    if (!this.titleShown && this.t > 5.4){
      this.titleShown = true;
      this.titleEl = UI.showEndingTitle();
      Sfx.fanfare();
    }

    if (!this.envShown && this.t > 8.4 && this.phase === 'zoom'){
      this.envShown = true;
      this.phase = 'letter';
      UI.showEnvelope(function(){
        UI.showLetter(function(){ self.startCelebrate(); });
      });
    }

    if (this.phase === 'celebrate'){
      this.celebT += dt;
      if (this.celebT > this.nextBurst && this.burstCount < 9){
        this.nextBurst += 0.5;
        this.burstCount++;
        var x = rand(App.W * 0.15, App.W * 0.85);
        var y = rand(App.H * 0.2, App.H * 0.7);
        FX.flowerBurst(x, y, 7);
        FX.sparkleBurst(x, y, 12, '#fff3c9');
        FX.hearts(x, y, 5);
        if (this.burstCount % 3 === 1) FX.bflies(x, y, 4);
        Sfx.bell(rand(0.9, 1.6));
      }
      if (this.celebT > 4.8 && !this.finaleShown){
        this.finaleShown = true;
        if (this.titleEl){ this.titleEl.classList.remove('show'); }
        UI.showFinale(function(){ App.go('hub'); });
      }
    }
  },

  startCelebrate: function(){
    this.phase = 'celebrate';
    this.celebT = 0;
    this.nextBurst = 0.1;
    this.burstCount = 0;
    FX.ambient = 42;
    Sfx.celebrate();
  },

  pointer: function(){},

  draw: function(ctx){
    var W = App.W, H = App.H;
    Art.background(ctx, App, App.t, 1);

    var scale = lerp(1.75, 1, easeInOut(Math.min(1, this.t / 7)));
    var cx = W / 2, cy = H * 0.44;
    var R = Math.min(W * 0.44, H * 0.32);

    var avgBloom = clamp((this.t - 0.5) / 3.5, 0, 1);
    var pulse = 0.55 + 0.2 * Math.sin(App.t * 1.6);
    Art.glow(ctx, cx, cy + R * 0.05, R * 1.9 * scale, '#ffb9d4', avgBloom * pulse);

    // flowers are 6-fold symmetric, so per-flower rotation is baked into
    // the layout jitter instead of costing a transform per sprite
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    for (var i = 0; i < this.flowers.length; i++){
      var f = this.flowers[i];
      var bloom = clamp((this.t - f.delay) / 1.1, 0, 1);
      var q = Math.round(bloom * 10);
      var spr = Art.flowerSprite(f.colIdx, q, 96);
      var ds = f.size * 2.5;
      ctx.drawImage(spr, f.hx * R - ds / 2, f.hy * R - ds / 2, ds, ds);
    }
    ctx.restore();
    Art.vignette(ctx, W, H);
  }
};

/* ============================================================
   Boot, input & main loop
   ============================================================ */

(function boot(){
  var canvas = document.getElementById('game');
  App.canvas = canvas;
  App.ctx = canvas.getContext('2d');
  App.load();

  UI.init();
  document.getElementById('muteBtn').innerHTML = UI.muteIcon(!!App.save.muted);
  FX.app = App;

  var gameScenes = Games.makeScenes(App);
  App.scenes = {
    title: titleScene,
    intro: introScene,
    hub: hubScene,
    ending: endingScene,
    game1: gameScenes.game1,
    game2: gameScenes.game2,
    game3: gameScenes.game3,
    game4: gameScenes.game4,
    game5: gameScenes.game5
  };

  function resize(){
    var winW = window.innerWidth;
    var winH = window.innerHeight;
    var stage = document.getElementById('stage');
    var stageW = Math.min(winW, Math.round(winH * 0.68));
    stage.style.width = stageW + 'px';
    stage.style.height = winH + 'px';

    App.dpr = Math.min(window.devicePixelRatio || 1, 2);
    App.W = stageW;
    App.H = winH;
    canvas.width = Math.round(stageW * App.dpr);
    canvas.height = Math.round(winH * App.dpr);
    canvas.style.width = stageW + 'px';
    canvas.style.height = winH + 'px';
    App.ctx.setTransform(App.dpr, 0, 0, App.dpr, 0, 0);

    var probe = document.getElementById('safeprobe');
    App.safeTop = probe ? probe.offsetHeight : 0;

    if (App.scene && App.scene.resize) App.scene.resize();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function(){ setTimeout(resize, 60); });
  resize();

  /* ---------- input ---------- */

  function pos(e){
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  var activePointer = null;

  canvas.addEventListener('pointerdown', function(e){
    e.preventDefault();
    Sfx.unlock();
    Sfx.setMuted(!!App.save.muted);
    Sfx.poke();
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (App.transitioning || WinFX.active) return;
    var p = pos(e);
    if (App.scene && App.scene.pointer) App.scene.pointer('down', p.x, p.y);
  });

  canvas.addEventListener('pointermove', function(e){
    if (e.pointerId !== activePointer) return;
    if (App.transitioning || WinFX.active) return;
    var p = pos(e);
    if (App.scene && App.scene.pointer) App.scene.pointer('move', p.x, p.y);
  });

  function endPointer(e){
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    if (App.transitioning || WinFX.active) return;
    var p = pos(e);
    if (App.scene && App.scene.pointer) App.scene.pointer('up', p.x, p.y);
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // stop iOS rubber-band scrolling / double-tap zoom on the stage
  document.getElementById('stage').addEventListener('touchmove', function(e){
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function(e){ e.preventDefault(); });
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  /* ---------- main loop ---------- */

  var last = performance.now();
  function frame(nowT){
    var dt = Math.min(0.05, (nowT - last) / 1000);
    last = nowT;
    App.t += dt;

    if (App.scene){
      if (App.scene.update) App.scene.update(dt);
      WinFX.update(dt);
      FX.update(dt);
      if (App.scene.draw) App.scene.draw(App.ctx);
      FX.draw(App.ctx);
      WinFX.draw(App.ctx);
    }
    requestAnimationFrame(frame);
  }

  App.scene = titleScene;
  document.body.setAttribute('data-scene', 'title');
  titleScene.enter();
  requestAnimationFrame(frame);

  /* ---------- service worker (offline support) ---------- */

  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    });
  }

  /* ---------- hooks for automated testing ---------- */

  window.__mgq = {
    app: App,
    fx: FX,
    winfx: WinFX,
    scene: function(){ return App.scene ? App.scene.name : null; },
    save: function(){ return App.save; },
    go: function(n, d){ App.go(n, d); },
    reset: function(){
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      location.reload();
    }
  };
})();
