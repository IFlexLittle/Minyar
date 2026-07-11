/* ============================================================
   Minyar's Garden Quest — procedural art & particles
   All visuals are painted with canvas code: no image assets.
   ============================================================ */

'use strict';

/* ---------- tiny utility kit ---------- */

var TAU = Math.PI * 2;
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t){ return a + (b - a) * t; }
function rand(a, b){ return a + Math.random() * (b - a); }
function randi(a, b){ return Math.floor(rand(a, b + 1)); }
function pick(arr){ return arr[(Math.random() * arr.length) | 0]; }
function easeOutCubic(t){ t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function easeInOut(t){ t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOutBack(t){
  t = clamp(t, 0, 1);
  var c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function hexToRgb(hex){
  var h = hex.replace('#', '');
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function rgba(hex, a){
  var c = hexToRgb(hex);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}
function lerpColor(hexA, hexB, t){
  var a = hexToRgb(hexA), b = hexToRgb(hexB);
  t = clamp(t, 0, 1);
  return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' +
                  Math.round(lerp(a[1], b[1], t)) + ',' +
                  Math.round(lerp(a[2], b[2], t)) + ')';
}

function roundRectPath(ctx, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heartPath(ctx, r){
  ctx.moveTo(0, -0.35 * r);
  ctx.bezierCurveTo(0.06 * r, -0.72 * r, 0.62 * r, -0.72 * r, 0.62 * r, -0.28 * r);
  ctx.bezierCurveTo(0.62 * r, 0.05 * r, 0.28 * r, 0.28 * r, 0, 0.55 * r);
  ctx.bezierCurveTo(-0.28 * r, 0.28 * r, -0.62 * r, 0.05 * r, -0.62 * r, -0.28 * r);
  ctx.bezierCurveTo(-0.62 * r, -0.72 * r, -0.06 * r, -0.72 * r, 0, -0.35 * r);
  ctx.closePath();
}

/* ---------- palettes ---------- */

var FLOWER_COLORS = [
  { p:'#f8afca', p2:'#fdd7e4', c:'#ffd98e', c2:'#e79f63' },  // pink
  { p:'#c3a8ea', p2:'#e0d0f5', c:'#ffe3a3', c2:'#d8925f' },  // lavender
  { p:'#ffc98f', p2:'#ffe3c2', c:'#fff1cf', c2:'#e0a05e' },  // peach
  { p:'#9fc4ef', p2:'#cfe2f8', c:'#ffe9b0', c2:'#caa055' },  // sky blue
  { p:'#f591a9', p2:'#fbc4d0', c:'#ffde9c', c2:'#dd9a58' },  // rose
  { p:'#a8d8b8', p2:'#d2ecd9', c:'#fff0c2', c2:'#d9a45e' }   // mint
];
var GREY_COL = { p:'#cfccc5', p2:'#e0ddd6', c:'#c2bdb2', c2:'#a9a69c' };

var BFLY_COLORS = [
  { a:'#ffd28f', b:'#ffedd0', glow:'#ffe9b8' },
  { a:'#f7a8c8', b:'#fdd6e5', glow:'#ffcfe2' },
  { a:'#c3a8ea', b:'#e4d6f7', glow:'#ddc8f5' },
  { a:'#a8d8c0', b:'#d5efe0', glow:'#c8ecd8' }
];

var PETAL_PINKS = ['#f6b9d0', '#f9c9da', '#f2a5c3', '#fbd5e2'];

var Art = (function(){

  var FONT_HAND = '"Segoe Script","Snell Roundhand","Bradley Hand","Chalkboard SE","Comic Sans MS",cursive';
  var FONT_ROUND = 'ui-rounded,-apple-system,"SF Pro Rounded","Segoe UI",system-ui,sans-serif';

  /* ---------- cached glow sprites ---------- */

  var glowCache = {};
  function glowSprite(color){
    if (glowCache[color]) return glowCache[color];
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, rgba(color, 0.55));
    grad.addColorStop(0.45, rgba(color, 0.2));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glowCache[color] = c;
    return c;
  }
  function glow(ctx, x, y, r, color, alpha){
    ctx.save();
    ctx.globalAlpha *= (alpha == null ? 1 : alpha);
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /* ---------- petals & flowers ---------- */

  function petalShape(ctx, len, w){
    ctx.moveTo(0, -len * 0.06);
    ctx.bezierCurveTo(-w, -len * 0.32, -w * 0.72, -len * 0.9, 0, -len);
    ctx.bezierCurveTo(w * 0.72, -len * 0.9, w, -len * 0.32, 0, -len * 0.06);
    ctx.closePath();
  }

  function petal(ctx, x, y, rot, size, color, alpha){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha *= (alpha == null ? 1 : alpha);
    ctx.beginPath();
    petalShape(ctx, size, size * 0.5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function budHead(ctx, x, y, size, rot){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.45, 0, 0, TAU);
    ctx.fillStyle = '#b6b9a7';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-size * 0.09, -size * 0.06, size * 0.16, size * 0.3, -0.2, 0, TAU);
    ctx.fillStyle = '#c6c9b6';
    ctx.fill();
    for (var i = -1; i <= 1; i++){
      ctx.save();
      ctx.rotate(i * 0.55);
      ctx.beginPath();
      petalShape(ctx, size * 0.62, size * 0.2);
      ctx.translate(0, size * 0.35);
      ctx.fillStyle = '#9aa38f';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function flowerHead(ctx, x, y, size, col, bloom, rot){
    bloom = clamp(bloom, 0, 1);
    if (bloom <= 0.03){
      budHead(ctx, x, y, size, rot);
      return;
    }
    var be = easeOutBack(bloom);
    var mix = clamp(bloom * 1.4, 0, 1);
    var len = size * (0.32 + 0.68 * be);
    var pc  = lerpColor(GREY_COL.p,  col.p,  mix);
    var pc2 = lerpColor(GREY_COL.p2, col.p2, mix);
    var cc  = lerpColor(GREY_COL.c,  col.c,  mix);
    var cc2 = lerpColor(GREY_COL.c2, col.c2, mix);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);

    var detailed = size >= 15;  // small flowers skip the inner layer (perf)
    var i;
    ctx.fillStyle = pc;
    for (i = 0; i < 6; i++){
      ctx.save();
      ctx.rotate(i * TAU / 6);
      ctx.beginPath();
      petalShape(ctx, len, len * 0.52);
      ctx.fill();
      ctx.restore();
    }
    if (detailed){
      ctx.fillStyle = pc2;
      ctx.globalAlpha *= 0.92;
      for (i = 0; i < 6; i++){
        ctx.save();
        ctx.rotate(i * TAU / 6 + TAU / 12);
        ctx.beginPath();
        petalShape(ctx, len * 0.62, len * 0.34);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha /= 0.92;
    }

    var cr = size * 0.22 * (0.5 + 0.5 * bloom);
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.fillStyle = cc;
    ctx.fill();
    if (detailed){
      ctx.fillStyle = cc2;
      for (i = 0; i < 6; i++){
        var a = i * TAU / 6 + 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * cr * 0.62, Math.sin(a) * cr * 0.62, cr * 0.13, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(-cr * 0.3, -cr * 0.3, cr * 0.22, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
    }
    ctx.restore();
  }

  /* A whole plant: stem + leaf + head, gently swaying.
     (x, y) is where the stem meets the ground. */
  function plant(ctx, o){
    var size = o.size;
    var stemLen = size * (o.stem == null ? 2.1 : o.stem);
    var sway = Math.sin((o.t || 0) * 0.8 + (o.phase || 0)) * size * 0.1 * (o.swayMul == null ? 1 : o.swayMul);
    var hx = o.x + sway;
    var hy = o.y - stemLen;
    var mix = clamp((o.bloom || 0) * 1.4, 0, 1);
    var stemCol = lerpColor('#a3a896', '#7ea06f', mix);

    ctx.save();
    ctx.strokeStyle = stemCol;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.quadraticCurveTo(o.x + sway * 0.3, o.y - stemLen * 0.55, hx, hy + size * 0.2);
    ctx.stroke();

    var la = o.x + sway * 0.45, lb = o.y - stemLen * 0.5;
    ctx.save();
    ctx.translate(la, lb);
    ctx.rotate(-1.1 + sway * 0.01);
    ctx.beginPath();
    petalShape(ctx, size * 0.7, size * 0.26);
    ctx.fillStyle = stemCol;
    ctx.fill();
    ctx.restore();
    ctx.restore();

    if (o.bloom > 0.5 && !o.noGlow){
      glow(ctx, hx, hy, size * 2.1, o.col.p, 0.3 * o.bloom);
    }
    flowerHead(ctx, hx, hy, size, o.col, o.bloom, sway * 0.012);
    return { hx: hx, hy: hy };
  }

  /* ---------- creatures ---------- */

  function drawButterfly(ctx, b){
    var s = b.size;
    var ws = 0.3 + 0.7 * Math.abs(Math.sin(b.flap));
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha *= (b.alpha == null ? 1 : b.alpha);
    if (b.glow !== false) glow(ctx, 0, 0, s * 2.3, b.col.glow, 0.55);
    ctx.rotate((b.angle || 0) + Math.PI / 2);

    for (var side = -1; side <= 1; side += 2){
      ctx.save();
      ctx.scale(side * ws, 1);
      ctx.beginPath();
      ctx.moveTo(s * 0.06, -s * 0.08);
      ctx.bezierCurveTo(s * 0.8, -s * 1.0, s * 1.25, -s * 0.15, s * 0.16, s * 0.08);
      ctx.closePath();
      ctx.fillStyle = b.col.a;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.08, s * 0.02);
      ctx.bezierCurveTo(s * 0.9, s * 0.15, s * 0.5, s * 0.9, s * 0.05, s * 0.3);
      ctx.closePath();
      ctx.fillStyle = b.col.b;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.38, s * 0.13, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.09, s * 0.34, 0, 0, TAU);
    ctx.fillStyle = '#7a5a4a';
    ctx.fill();
    ctx.strokeStyle = '#7a5a4a';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.16, -s * 0.55, -s * 0.24, -s * 0.52);
    ctx.moveTo(0, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.16, -s * 0.55, s * 0.24, -s * 0.52);
    ctx.stroke();
    ctx.restore();
  }

  function drawBee(ctx, o){
    var s = o.size;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.tilt || 0);

    var wf = Math.sin((o.t || 0) * 40) * 0.5 + 0.5;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + wf * 0.3) + ')';
    ctx.beginPath();
    ctx.ellipse(-s * 0.3, -s * 0.75 - wf * s * 0.12, s * 0.36, s * 0.55, -0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.3, -s * 0.75 - wf * s * 0.12, s * 0.36, s * 0.55, 0.5, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.58, 0, 0, TAU);
    ctx.fillStyle = '#ffce6b';
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.58, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#6b4a33';
    ctx.fillRect(-s * 0.18, -s, s * 0.22, s * 2);
    ctx.fillRect(s * 0.22, -s, s * 0.2, s * 2);
    ctx.restore();

    ctx.fillStyle = '#4a3527';
    ctx.beginPath();
    ctx.arc(-s * 0.62, -s * 0.14, s * 0.09, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4a3527';
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-s * 0.52, 0.02 * s, s * 0.14, 0.35, 1.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawLeafItem(ctx, x, y, rot, size){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.72, -size * 0.25, 0, size);
    ctx.quadraticCurveTo(-size * 0.72, -size * 0.25, 0, -size);
    ctx.closePath();
    ctx.fillStyle = '#a67c52';
    ctx.fill();
    ctx.strokeStyle = '#8a6644';
    ctx.lineWidth = Math.max(1, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(0, size * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- backgrounds ---------- */

  var bg = { key: '', canvas: null, stars: [], cloudSprite: null };

  function cloudSprite(){
    if (bg.cloudSprite) return bg.cloudSprite;
    var c = document.createElement('canvas');
    c.width = 260; c.height = 100;
    var g = c.getContext('2d');
    var blobs = [[70, 62, 42], [130, 48, 52], [195, 60, 40], [105, 68, 36], [160, 66, 38]];
    for (var i = 0; i < blobs.length; i++){
      var b = blobs[i];
      var grad = g.createRadialGradient(b[0], b[1], 2, b[0], b[1], b[2]);
      grad.addColorStop(0, 'rgba(255,252,246,0.5)');
      grad.addColorStop(1, 'rgba(255,252,246,0)');
      g.fillStyle = grad;
      g.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2);
    }
    bg.cloudSprite = c;
    return c;
  }

  var SKY_MUTED  = ['#cfc9d8', '#e3d5d6', '#eee3d2'];
  var SKY_VIVID  = ['#c9b3ec', '#f7c6da', '#ffe2b6'];
  var HILL_MUTED = ['#c2c8ba', '#aeb7a6', '#99a692'];
  var HILL_VIVID = ['#cfe0ba', '#aecf9b', '#8fbb84'];

  function renderBase(W, H, prog){
    var c = bg.canvas && bg.canvas.width === W && bg.canvas.height === H
      ? bg.canvas : document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');

    var sky = g.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, lerpColor(SKY_MUTED[0], SKY_VIVID[0], prog));
    sky.addColorStop(0.55, lerpColor(SKY_MUTED[1], SKY_VIVID[1], prog));
    sky.addColorStop(1, lerpColor(SKY_MUTED[2], SKY_VIVID[2], prog));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H * 0.72);

    // low warm sun glow
    var sun = g.createRadialGradient(W * 0.22, H * 0.6, 10, W * 0.22, H * 0.6, W * 0.75);
    sun.addColorStop(0, 'rgba(255,231,180,' + (0.35 + 0.3 * prog) + ')');
    sun.addColorStop(1, 'rgba(255,231,180,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, W, H);

    // rolling hills
    var i, x;
    var hillTop = [H * 0.55, H * 0.64, H * 0.74];
    for (i = 0; i < 3; i++){
      g.beginPath();
      g.moveTo(-10, H + 10);
      g.lineTo(-10, hillTop[i]);
      for (x = -10; x <= W + 12; x += 12){
        var yy = hillTop[i]
          + Math.sin(x * 0.011 + i * 2.4) * H * 0.02
          + Math.sin(x * 0.027 + i * 5.1) * H * 0.008;
        g.lineTo(x, yy);
      }
      g.lineTo(W + 10, H + 10);
      g.closePath();
      g.fillStyle = lerpColor(HILL_MUTED[i], HILL_VIVID[i], prog);
      g.fill();
    }

    // watercolor washes on the meadow
    for (i = 0; i < 46; i++){
      var bx = rand(0, W), by = rand(H * 0.56, H), br = rand(20, 70);
      var wash = g.createRadialGradient(bx, by, 1, bx, by, br);
      var light = Math.random() < 0.5;
      wash.addColorStop(0, light ? 'rgba(255,252,240,0.07)' : 'rgba(90,130,90,0.05)');
      wash.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = wash;
      g.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // distant flower speckles
    for (i = 0; i < 60; i++){
      var fx = rand(6, W - 6), fy = rand(H * 0.58, H * 0.98);
      var fr = rand(1.4, 3.2) * (fy / H);
      var colored = Math.random() < prog;
      g.beginPath();
      g.arc(fx, fy, fr, 0, TAU);
      g.fillStyle = colored ? rgba(pick(PETAL_PINKS), 0.75) : 'rgba(240,238,230,0.55)';
      g.fill();
    }

    // stars for the twinkle pass
    bg.stars = [];
    for (i = 0; i < 14; i++){
      bg.stars.push({ x: rand(10, W - 10), y: rand(10, H * 0.3), r: rand(0.8, 1.9), ph: rand(0, TAU) });
    }
    return c;
  }

  function background(ctx, app, t, prog, opts){
    opts = opts || {};
    var W = app.W, H = app.H;
    var key = W + 'x' + H + '_' + Math.round(prog * 10);
    if (bg.key !== key){
      bg.canvas = renderBase(W, H, prog);
      bg.key = key;
    }
    ctx.drawImage(bg.canvas, 0, 0);

    // twinkling star-sparkles
    var i;
    for (i = 0; i < bg.stars.length; i++){
      var s = bg.stars[i];
      var a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.7 + s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fillStyle = 'rgba(255,250,235,' + a.toFixed(3) + ')';
      ctx.fill();
    }

    // drifting clouds
    var spr = cloudSprite();
    for (i = 0; i < 3; i++){
      var span = W + 340;
      var cx = ((i * 0.41 * span + t * (5 + i * 2.6)) % span) - 170;
      var cy = H * (0.055 + 0.065 * i);
      ctx.save();
      ctx.globalAlpha = 0.75;
      var cw = 190 + i * 45;
      ctx.drawImage(spr, cx, cy, cw, cw * 0.38);
      ctx.restore();
    }

    if (opts.dim){
      ctx.fillStyle = 'rgba(255,250,240,' + opts.dim + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- moon ---------- */

  var moonSpr = null;
  function moonSprite(){
    if (moonSpr) return moonSpr;
    // crescent cut on its own layer, so the glow underneath stays intact
    var cres = document.createElement('canvas');
    cres.width = cres.height = 160;
    var cg = cres.getContext('2d');
    cg.beginPath();
    cg.arc(80, 80, 34, 0, TAU);
    cg.fillStyle = '#fff2cf';
    cg.fill();
    cg.globalCompositeOperation = 'destination-out';
    cg.beginPath();
    cg.arc(96, 66, 30, 0, TAU);
    cg.fill();

    var c = document.createElement('canvas');
    c.width = c.height = 160;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(74, 86, 8, 74, 86, 78);
    grad.addColorStop(0, 'rgba(255,244,214,0.4)');
    grad.addColorStop(0.42, 'rgba(255,244,214,0.14)');
    grad.addColorStop(1, 'rgba(255,244,214,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 160, 160);
    g.drawImage(cres, 0, 0);
    moonSpr = c;
    return c;
  }

  function drawMoon(ctx, x, y, r, found, t){
    var spr = moonSprite();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.drawImage(spr, -r, -r, r * 2, r * 2);
    ctx.restore();
    if (found){
      for (var i = 0; i < 3; i++){
        var a = t * 0.9 + i * TAU / 3;
        var sx = x + Math.cos(a) * r * 0.62;
        var sy = y + Math.sin(a) * r * 0.62;
        sparkleStar(ctx, sx, sy, 3.2, 'rgba(255,248,220,0.85)', t * 2 + i);
      }
    }
  }

  function sparkleStar(ctx, x, y, s, color, ph){
    var a = 0.5 + 0.5 * Math.sin(ph * 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= (0.35 + 0.65 * a);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 4; i++){
      var ang = i * Math.PI / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang - 0.35) * s * 0.35, Math.sin(ang - 0.35) * s * 0.35);
      ctx.lineTo(Math.cos(ang) * s * (1 + a * 0.4), Math.sin(ang) * s * (1 + a * 0.4));
      ctx.lineTo(Math.cos(ang + 0.35) * s * 0.35, Math.sin(ang + 0.35) * s * 0.35);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  /* ---------- vignette & HUD ---------- */

  var vigCache = { key: '', canvas: null };
  function vignette(ctx, W, H){
    var key = W + 'x' + H;
    if (vigCache.key !== key){
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.45, W / 2, H * 0.5, Math.max(W, H) * 0.78);
      grad.addColorStop(0, 'rgba(120,70,90,0)');
      grad.addColorStop(1, 'rgba(120,70,90,0.16)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      vigCache.canvas = c;
      vigCache.key = key;
    }
    ctx.drawImage(vigCache.canvas, 0, 0);
  }

  function hudPill(ctx, x, y, text, opts){
    opts = opts || {};
    ctx.save();
    ctx.font = (opts.font || '700 16px ') + FONT_ROUND;
    var w = ctx.measureText(text).width + 34;
    var h = opts.h || 34;
    ctx.beginPath();
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = 'rgba(255,250,243,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,160,190,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = opts.color || '#8a5a72';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function hudHearts(ctx, x, y, total, left, size){
    size = size || 11;
    for (var i = 0; i < total; i++){
      var hx = x + i * (size * 2.5);
      ctx.save();
      ctx.translate(hx, y);
      ctx.beginPath();
      heartPath(ctx, size);
      if (i < left){
        ctx.fillStyle = '#ef8fb4';
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(239,143,180,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---------- flower sprite cache (for the big finale heart) ---------- */

  var spriteCache = {};
  function flowerSprite(colIdx, q, px){
    var key = colIdx + '_' + q + '_' + px;
    if (spriteCache[key]) return spriteCache[key];
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var g = c.getContext('2d');
    flowerHead(g, px / 2, px / 2, px * 0.4, FLOWER_COLORS[colIdx % FLOWER_COLORS.length], q / 10, 0);
    spriteCache[key] = c;
    return c;
  }

  return {
    FONT_HAND: FONT_HAND,
    FONT_ROUND: FONT_ROUND,
    glow: glow,
    petalShape: petalShape,
    petal: petal,
    flowerHead: flowerHead,
    budHead: budHead,
    plant: plant,
    drawButterfly: drawButterfly,
    drawBee: drawBee,
    drawLeafItem: drawLeafItem,
    background: background,
    drawMoon: drawMoon,
    sparkleStar: sparkleStar,
    vignette: vignette,
    hudPill: hudPill,
    hudHearts: hudHearts,
    flowerSprite: flowerSprite
  };
})();

/* ============================================================
   Particles
   ============================================================ */

var FX = (function(){
  var P = {
    list: [],
    mul: (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 0.45 : 1,
    ambient: 0,
    app: null
  };
  var MAX = 700;
  var spawnAccum = 0;

  function add(p){
    if (P.list.length >= MAX) return;
    p.life = 0;
    P.list.push(p);
  }

  P.clear = function(){ P.list.length = 0; };

  P.petalBurst = function(x, y, n, color){
    n = Math.round(n * P.mul);
    for (var i = 0; i < n; i++){
      add({
        type: 'petal', x: x, y: y,
        vx: rand(-80, 80), vy: rand(-170, -30),
        rot: rand(0, TAU), vr: rand(-3.4, 3.4),
        size: rand(6, 12), color: color || pick(PETAL_PINKS),
        ttl: rand(1.2, 2.1), grav: 150,
        sway: rand(1.5, 3.5), swayAmp: rand(8, 26)
      });
    }
  };

  P.sparkleBurst = function(x, y, n, color){
    n = Math.round(n * P.mul);
    for (var i = 0; i < n; i++){
      var a = rand(0, TAU), sp = rand(24, 150);
      add({
        type: 'sparkle', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        size: rand(2.2, 5), color: color || '#fff6dd',
        ttl: rand(0.45, 0.95), ph: rand(0, TAU)
      });
    }
  };

  P.hearts = function(x, y, n){
    n = Math.round(n * P.mul);
    for (var i = 0; i < n; i++){
      add({
        type: 'heart', x: x + rand(-20, 20), y: y + rand(-10, 10),
        vx: rand(-26, 26), vy: rand(-95, -45),
        size: rand(7, 15), color: pick(['#f28bb4', '#f7a8c8', '#e977a5', '#f9bfd6']),
        ttl: rand(1.6, 2.8), ph: rand(0, TAU)
      });
    }
  };

  P.ring = function(x, y, color){
    add({ type: 'ring', x: x, y: y, size: 6, color: color || '#ffd9ec', ttl: 0.6 });
  };

  P.pollen = function(x, y){
    add({
      type: 'pollen', x: x + rand(-4, 4), y: y + rand(-4, 4),
      vx: rand(-12, 12), vy: rand(4, 22),
      size: rand(1.5, 3), ttl: rand(0.4, 0.85)
    });
  };

  P.flowerBurst = function(x, y, n){
    n = Math.round(n * P.mul);
    for (var i = 0; i < n; i++){
      var a = rand(0, TAU), sp = rand(60, 260);
      add({
        type: 'flower', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        rot: rand(0, TAU), vr: rand(-4, 4),
        size: rand(9, 19), colIdx: randi(0, FLOWER_COLORS.length - 1),
        ttl: rand(1.4, 2.6), grav: 130
      });
    }
  };

  P.bflies = function(x, y, n){
    n = Math.round(n * P.mul);
    for (var i = 0; i < n; i++){
      add({
        type: 'bfly', x: x, y: y,
        heading: rand(0, TAU), speed: rand(60, 130),
        flap: rand(0, TAU), seed: rand(0, 10),
        size: rand(8, 14), col: pick(BFLY_COLORS),
        ttl: rand(4, 7)
      });
    }
  };

  P.update = function(dt){
    var app = P.app;
    // keep ambient petals topped up
    if (app && P.ambient > 0){
      var count = 0;
      for (var k = 0; k < P.list.length; k++) if (P.list[k].amb) count++;
      spawnAccum += dt;
      if (count < P.ambient * P.mul && spawnAccum > 0.22){
        spawnAccum = 0;
        add({
          type: 'petal', amb: true,
          x: rand(0, app.W), y: -18,
          vx: rand(-14, 14), vy: rand(22, 46),
          rot: rand(0, TAU), vr: rand(-1.6, 1.6),
          size: rand(5, 10), color: pick(PETAL_PINKS),
          ttl: 9999, grav: 0,
          sway: rand(0.6, 1.6), swayAmp: rand(14, 36)
        });
      }
    }

    for (var i = P.list.length - 1; i >= 0; i--){
      var p = P.list[i];
      p.life += dt;
      if (p.life > p.ttl){ P.list.splice(i, 1); continue; }

      switch (p.type){
        case 'petal':
          p.vy += (p.grav || 0) * dt;
          p.x += (p.vx + Math.sin(p.life * p.sway * TAU * 0.25) * p.swayAmp) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          if (p.amb && app){
            if (p.y > app.H + 24){
              var alive = 0;
              for (var j = 0; j < P.list.length; j++) if (P.list[j].amb) alive++;
              if (alive <= P.ambient * P.mul){ p.y = -18; p.x = rand(0, app.W); }
              else { P.list.splice(i, 1); }
            }
          }
          break;
        case 'sparkle':
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vx *= (1 - 2.2 * dt); p.vy *= (1 - 2.2 * dt);
          break;
        case 'heart':
          p.x += (p.vx + Math.sin(p.life * 3 + p.ph) * 18) * dt;
          p.y += p.vy * dt;
          p.vy *= (1 - 0.4 * dt);
          break;
        case 'pollen':
          p.x += p.vx * dt; p.y += p.vy * dt;
          break;
        case 'flower':
          p.vy += (p.grav || 0) * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.rot += p.vr * dt;
          break;
        case 'bfly':
          p.heading += (Math.sin(p.life * 1.9 + p.seed) * 1.4 + Math.sin(p.life * 3.7 + p.seed * 2) * 0.7) * dt;
          p.x += Math.cos(p.heading) * p.speed * dt;
          p.y += Math.sin(p.heading) * p.speed * dt - 14 * dt;
          p.flap += dt * 18;
          break;
        case 'ring':
          p.size += 130 * dt;
          break;
      }
    }
  };

  P.draw = function(ctx){
    for (var i = 0; i < P.list.length; i++){
      var p = P.list[i];
      var fade = clamp((p.ttl - p.life) / (p.ttl * 0.3), 0, 1);
      if (p.amb) fade = Math.min(fade, clamp(p.life / 0.8, 0, 1));

      switch (p.type){
        case 'petal':
          Art.petal(ctx, p.x, p.y, p.rot, p.size, p.color, 0.9 * fade);
          break;
        case 'sparkle':
          Art.sparkleStar(ctx, p.x, p.y, p.size * fade + 0.5, p.color, p.life * 6 + p.ph);
          break;
        case 'heart':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.sin(p.life * 2 + p.ph) * 0.2);
          ctx.globalAlpha = fade * 0.92;
          ctx.beginPath();
          heartPath(ctx, p.size);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.restore();
          break;
        case 'pollen':
          ctx.globalAlpha = fade * 0.85;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fillStyle = '#ffe1a1';
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case 'flower':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = fade;
          Art.flowerHead(ctx, 0, 0, p.size, FLOWER_COLORS[p.colIdx], 1, 0);
          ctx.restore();
          break;
        case 'bfly':
          Art.drawButterfly(ctx, {
            x: p.x, y: p.y, angle: p.heading,
            flap: p.flap, size: p.size, col: p.col, alpha: fade
          });
          break;
        case 'ring':
          ctx.save();
          ctx.globalAlpha = fade * 0.7;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.stroke();
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  };

  return P;
})();
