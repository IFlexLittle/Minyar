/* ============================================================
   Mannou's Garden Quest — procedural art & particles
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

function hexToRgb(c){
  if (c.charAt(0) === '#'){
    var h = c.slice(1);
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  var m = c.match(/([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])] : [255, 255, 255];
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
/* lighten (amt > 0) or darken (amt < 0) a hex colour → css string */
function shade(hex, amt){
  var c = hexToRgb(hex);
  var r, i, out = [];
  for (i = 0; i < 3; i++){
    r = amt > 0 ? c[i] + (255 - c[i]) * amt : c[i] * (1 + amt);
    out.push(Math.round(clamp(r, 0, 255)));
  }
  return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
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
  { p:'#f8a5c6', p2:'#fdd7e4', c:'#ffd98e', c2:'#e79f63' },  // pink
  { p:'#bb9ce8', p2:'#e0d0f5', c:'#ffe3a3', c2:'#d8925f' },  // lavender
  { p:'#ffbe7d', p2:'#ffe3c2', c:'#fff1cf', c2:'#e0a05e' },  // peach
  { p:'#8fbcf0', p2:'#cfe2f8', c:'#ffe9b0', c2:'#caa055' },  // sky blue
  { p:'#f4839e', p2:'#fbc4d0', c:'#ffde9c', c2:'#dd9a58' },  // rose
  { p:'#96d4ae', p2:'#d2ecd9', c:'#fff0c2', c2:'#d9a45e' }   // mint
];
var GREY_COL = { p:'#cfccc5', p2:'#e0ddd6', c:'#c2bdb2', c2:'#a9a69c' };

var BFLY_COLORS = [
  { a:'#ffc978', b:'#ffedd0', glow:'#ffe9b8' },
  { a:'#f48fb8', b:'#fdd6e5', glow:'#ffcfe2' },
  { a:'#b394e4', b:'#e4d6f7', glow:'#ddc8f5' },
  { a:'#8fd0b2', b:'#d5efe0', glow:'#c8ecd8' }
];

var PETAL_PINKS = ['#f6b9d0', '#f9c9da', '#f2a5c3', '#fbd5e2'];

/* flower species: petal count / shape / proportions */
var SPECIES = [
  { n: 6,  kind: 'round', w: 0.52, inner: true  },   // classic blossom
  { n: 5,  kind: 'point', w: 0.60, inner: true  },   // star flower
  { n: 12, kind: 'slim',  w: 0.20, inner: false },   // daisy
  { n: 8,  kind: 'round', w: 0.40, inner: true  }    // dahlia-ish
];

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

  function petalShape(ctx, len, w, kind){
    if (kind === 'point'){
      ctx.moveTo(0, -len * 0.05);
      ctx.bezierCurveTo(-w, -len * 0.3, -w * 0.5, -len * 0.78, 0, -len);
      ctx.bezierCurveTo(w * 0.5, -len * 0.78, w, -len * 0.3, 0, -len * 0.05);
    } else if (kind === 'slim'){
      ctx.moveTo(0, -len * 0.08);
      ctx.bezierCurveTo(-w, -len * 0.35, -w, -len * 0.85, 0, -len);
      ctx.bezierCurveTo(w, -len * 0.85, w, -len * 0.35, 0, -len * 0.08);
    } else {
      ctx.moveTo(0, -len * 0.06);
      ctx.bezierCurveTo(-w, -len * 0.32, -w * 0.72, -len * 0.9, 0, -len);
      ctx.bezierCurveTo(w * 0.72, -len * 0.9, w, -len * 0.32, 0, -len * 0.06);
    }
    ctx.closePath();
  }

  function petal(ctx, x, y, rot, size, color, alpha){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha *= (alpha == null ? 1 : alpha);
    ctx.beginPath();
    petalShape(ctx, size, size * 0.5, 'round');
    var grad = ctx.createLinearGradient(0, 0, 0, -size);
    grad.addColorStop(0, shade(color, -0.08));
    grad.addColorStop(1, shade(color, 0.22));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  function budHead(ctx, x, y, size, rot){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    var grad = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
    grad.addColorStop(0, '#cdd0bd');
    grad.addColorStop(1, '#a9ac9a');
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.45, 0, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-size * 0.09, -size * 0.08, size * 0.14, size * 0.28, -0.2, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    for (var i = -1; i <= 1; i++){
      ctx.save();
      ctx.rotate(i * 0.55);
      ctx.beginPath();
      petalShape(ctx, size * 0.62, size * 0.2, 'round');
      ctx.translate(0, size * 0.35);
      ctx.fillStyle = i === 0 ? '#96a189' : '#8a9580';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* Layered, gradient-shaded flower head.
     One gradient + one fill per layer keeps it fast. */
  function flowerHead(ctx, x, y, size, col, bloom, rot, species){
    bloom = clamp(bloom, 0, 1);
    if (bloom <= 0.03){
      budHead(ctx, x, y, size, rot);
      return;
    }
    var sp = SPECIES[(species || 0) % SPECIES.length];
    var be = easeOutBack(bloom);
    var mix = clamp(bloom * 1.4, 0, 1);
    var len = size * (0.32 + 0.68 * be);
    var pc  = lerpColor(GREY_COL.p,  col.p,  mix);
    var pc2 = lerpColor(GREY_COL.p2, col.p2, mix);
    var cc  = lerpColor(GREY_COL.c,  col.c,  mix);
    var cc2 = lerpColor(GREY_COL.c2, col.c2, mix);
    var detailed = size >= 13;
    var i, grad;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);

    // outer petals — one combined path, radial shading base→tip
    ctx.beginPath();
    for (i = 0; i < sp.n; i++){
      ctx.save();
      ctx.rotate(i * TAU / sp.n);
      petalShape(ctx, len, len * sp.w, sp.kind);
      ctx.restore();
    }
    grad = ctx.createRadialGradient(0, 0, len * 0.1, 0, 0, len);
    grad.addColorStop(0, shade(pc, -0.16));
    grad.addColorStop(0.5, pc);
    grad.addColorStop(1, shade(pc, 0.26));
    ctx.fillStyle = grad;
    ctx.fill();
    if (detailed){
      ctx.strokeStyle = rgba('#7c4a63', 0.16);
      ctx.lineWidth = Math.max(1, size * 0.028);
      ctx.stroke();
    }

    // inner petal layer
    if (sp.inner && detailed){
      ctx.beginPath();
      for (i = 0; i < sp.n; i++){
        ctx.save();
        ctx.rotate(i * TAU / sp.n + Math.PI / sp.n);
        petalShape(ctx, len * 0.6, len * sp.w * 0.66, sp.kind);
        ctx.restore();
      }
      grad = ctx.createRadialGradient(0, 0, len * 0.05, 0, 0, len * 0.62);
      grad.addColorStop(0, shade(pc2, -0.05));
      grad.addColorStop(1, shade(pc2, 0.3));
      ctx.fillStyle = grad;
      ctx.globalAlpha *= 0.95;
      ctx.fill();
      ctx.globalAlpha /= 0.95;
    }

    // golden gradient center
    var cr = size * (sp.kind === 'slim' ? 0.26 : 0.22) * (0.5 + 0.5 * bloom);
    grad = ctx.createRadialGradient(-cr * 0.25, -cr * 0.25, cr * 0.1, 0, 0, cr);
    grad.addColorStop(0, shade(cc, 0.45));
    grad.addColorStop(0.7, cc);
    grad.addColorStop(1, shade(cc, -0.18));
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
    if (detailed){
      ctx.fillStyle = cc2;
      for (i = 0; i < 6; i++){
        var a = i * TAU / 6 + 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * cr * 0.6, Math.sin(a) * cr * 0.6, cr * 0.12, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(-cr * 0.32, -cr * 0.32, cr * 0.2, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
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
    var stemCol = lerpColor('#a3a896', '#6f9660', mix);
    var stemLight = lerpColor('#b5baa8', '#8fb87c', mix);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = stemCol;
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.quadraticCurveTo(o.x + sway * 0.3, o.y - stemLen * 0.55, hx, hy + size * 0.2);
    ctx.stroke();
    ctx.strokeStyle = stemLight;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(o.x - size * 0.02, o.y);
    ctx.quadraticCurveTo(o.x + sway * 0.3 - size * 0.02, o.y - stemLen * 0.55, hx - size * 0.02, hy + size * 0.2);
    ctx.stroke();

    // two leaves
    var la = o.x + sway * 0.45, lb = o.y - stemLen * 0.5;
    ctx.save();
    ctx.translate(la, lb);
    ctx.rotate(-1.1 + sway * 0.01);
    ctx.beginPath();
    petalShape(ctx, size * 0.7, size * 0.26, 'point');
    ctx.fillStyle = stemCol;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(o.x + sway * 0.25, o.y - stemLen * 0.3);
    ctx.rotate(1.15 + sway * 0.01);
    ctx.beginPath();
    petalShape(ctx, size * 0.5, size * 0.2, 'point');
    ctx.fillStyle = stemLight;
    ctx.fill();
    ctx.restore();
    ctx.restore();

    if (o.bloom > 0.5 && !o.noGlow){
      glow(ctx, hx, hy, size * 2.1, o.col.p, 0.3 * o.bloom);
    }
    if (o.sprite && o.colIdx != null){
      // sprite-cached head (rotated live, so the sway is kept) — much
      // cheaper than re-shading gradients for every flower every frame
      var q = Math.round(clamp(o.bloom, 0, 1) * 10);
      var spr = flowerSprite(o.colIdx, q, 128, o.species || 0);
      var ds = size * 2.6;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(sway * 0.012);
      ctx.drawImage(spr, -ds / 2, -ds / 2, ds, ds);
      ctx.restore();
    } else {
      flowerHead(ctx, hx, hy, size, o.col, o.bloom, sway * 0.012, o.species || 0);
    }
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

    var edge = shade(b.col.a, -0.28);
    for (var side = -1; side <= 1; side += 2){
      ctx.save();
      ctx.scale(side * ws, 1);

      // upper wing
      ctx.beginPath();
      ctx.moveTo(s * 0.06, -s * 0.08);
      ctx.bezierCurveTo(s * 0.8, -s * 1.0, s * 1.25, -s * 0.15, s * 0.16, s * 0.08);
      ctx.closePath();
      ctx.fillStyle = b.col.a;
      ctx.fill();
      ctx.strokeStyle = rgba('#7c4a63', 0.25);
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.stroke();
      // inner sheen
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.06);
      ctx.bezierCurveTo(s * 0.55, -s * 0.66, s * 0.85, -s * 0.14, s * 0.16, s * 0.03);
      ctx.closePath();
      ctx.fillStyle = b.col.b;
      ctx.globalAlpha *= 0.85;
      ctx.fill();
      ctx.globalAlpha /= 0.85;

      // lower wing with a little tail
      ctx.beginPath();
      ctx.moveTo(s * 0.08, s * 0.02);
      ctx.bezierCurveTo(s * 0.9, s * 0.15, s * 0.6, s * 0.75, s * 0.28, s * 0.8);
      ctx.bezierCurveTo(s * 0.18, s * 0.95, s * 0.1, s * 0.9, s * 0.1, s * 0.72);
      ctx.bezierCurveTo(s * 0.02, s * 0.5, s * 0.03, s * 0.25, s * 0.08, s * 0.02);
      ctx.closePath();
      ctx.fillStyle = b.col.b;
      ctx.fill();
      ctx.strokeStyle = rgba('#7c4a63', 0.18);
      ctx.stroke();

      // spots
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(s * 0.52, -s * 0.42, s * 0.12, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.72, -s * 0.22, s * 0.06, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(edge === b.col.a ? '#7c4a63' : '#7c4a63', 0.2);
      ctx.beginPath();
      ctx.arc(s * 0.36, s * 0.34, s * 0.08, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // body
    var bodyGrad = ctx.createLinearGradient(0, -s * 0.35, 0, s * 0.35);
    bodyGrad.addColorStop(0, '#8a6a58');
    bodyGrad.addColorStop(1, '#5f4335');
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.09, s * 0.34, 0, 0, TAU);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -s * 0.32, s * 0.09, 0, TAU);
    ctx.fillStyle = '#6f4f3f';
    ctx.fill();
    ctx.strokeStyle = '#6f4f3f';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.36);
    ctx.quadraticCurveTo(-s * 0.16, -s * 0.6, -s * 0.26, -s * 0.56);
    ctx.moveTo(0, -s * 0.36);
    ctx.quadraticCurveTo(s * 0.16, -s * 0.6, s * 0.26, -s * 0.56);
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

    var grad = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
    grad.addColorStop(0, '#ffdf94');
    grad.addColorStop(1, '#f5b74d');
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.58, 0, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.58, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#6b4a33';
    ctx.fillRect(-s * 0.18, -s, s * 0.22, s * 2);
    ctx.fillRect(s * 0.22, -s, s * 0.2, s * 2);
    ctx.restore();

    // face: eye, smile, blush
    ctx.fillStyle = '#4a3527';
    ctx.beginPath();
    ctx.arc(-s * 0.62, -s * 0.14, s * 0.09, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-s * 0.65, -s * 0.17, s * 0.03, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4a3527';
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-s * 0.52, 0.02 * s, s * 0.14, 0.35, 1.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244,131,158,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.42, s * 0.1, s * 0.1, 0, TAU);
    ctx.fill();
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
    var grad = ctx.createLinearGradient(-size * 0.5, 0, size * 0.5, 0);
    grad.addColorStop(0, '#b58a5e');
    grad.addColorStop(1, '#93683f');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#7c5836';
    ctx.lineWidth = Math.max(1, size * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(0, size * 0.8);
    ctx.moveTo(0, -size * 0.2);
    ctx.quadraticCurveTo(size * 0.25, -size * 0.1, size * 0.34, size * 0.05);
    ctx.moveTo(0, 0.25 * size);
    ctx.quadraticCurveTo(-size * 0.22, 0.32 * size, -size * 0.3, 0.5 * size);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- backgrounds ---------- */

  var bg = { key: '', canvas: null, stars: [], grass: [], flies: [], cloudSprite: null, wispSprite: null };

  function cloudSprite(){
    if (bg.cloudSprite) return bg.cloudSprite;
    var c = document.createElement('canvas');
    c.width = 280; c.height = 110;
    var g = c.getContext('2d');
    var blobs = [[70, 66, 40], [125, 48, 50], [190, 56, 44], [235, 68, 30], [100, 70, 36], [160, 70, 40]];
    var i, b, grad;
    for (i = 0; i < blobs.length; i++){
      b = blobs[i];
      grad = g.createRadialGradient(b[0], b[1] - 6, 2, b[0], b[1], b[2]);
      grad.addColorStop(0, 'rgba(255,253,248,0.6)');
      grad.addColorStop(0.7, 'rgba(255,250,246,0.22)');
      grad.addColorStop(1, 'rgba(255,250,246,0)');
      g.fillStyle = grad;
      g.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2);
    }
    // warm underlight
    for (i = 0; i < blobs.length; i++){
      b = blobs[i];
      grad = g.createRadialGradient(b[0], b[1] + b[2] * 0.45, 2, b[0], b[1] + b[2] * 0.45, b[2] * 0.8);
      grad.addColorStop(0, 'rgba(255,190,180,0.16)');
      grad.addColorStop(1, 'rgba(255,190,180,0)');
      g.fillStyle = grad;
      g.fillRect(b[0] - b[2], b[1], b[2] * 2, b[2]);
    }
    bg.cloudSprite = c;
    return c;
  }

  var raySpr = null;
  function raySprite(){
    if (raySpr) return raySpr;
    var c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(255,238,200,0.09)');
    grad.addColorStop(1, 'rgba(255,238,200,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 32);
    g.lineTo(256, 0);
    g.lineTo(256, 64);
    g.closePath();
    g.fill();
    raySpr = c;
    return c;
  }

  function wispSprite(){
    if (bg.wispSprite) return bg.wispSprite;
    var c = document.createElement('canvas');
    c.width = 240; c.height = 44;
    var g = c.getContext('2d');
    for (var i = 0; i < 4; i++){
      var x = 40 + i * 55, r = 26 - i * 3;
      var grad = g.createRadialGradient(x, 22, 2, x, 22, r);
      grad.addColorStop(0, 'rgba(255,240,240,0.3)');
      grad.addColorStop(1, 'rgba(255,240,240,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, 22 - r, r * 2, r * 2);
    }
    bg.wispSprite = c;
    return c;
  }

  var SKY_MUTED  = ['#c6c1d2', '#d6cacd', '#e2d5c9', '#eadfd0'];
  var SKY_VIVID  = ['#a993e0', '#e9aed0', '#ffc3a4', '#ffdfae'];
  var HILL_MUTED = ['#c6cbbc', '#b4bcaa', '#a0ac97', '#8c9a85'];
  var HILL_VIVID = ['#cfe3b6', '#adcf96', '#8dbb7d', '#719e66'];

  function sunPos(W, H){ return { x: W * 0.24, y: H * 0.53 }; }

  function renderBase(W, H, prog){
    var c = bg.canvas && bg.canvas.width === W && bg.canvas.height === H
      ? bg.canvas : document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    var i, x, grad;

    // layered sunset sky
    var skyH = H * 0.7;
    var sky = g.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0,    lerpColor(SKY_MUTED[0], SKY_VIVID[0], prog));
    sky.addColorStop(0.4,  lerpColor(SKY_MUTED[1], SKY_VIVID[1], prog));
    sky.addColorStop(0.72, lerpColor(SKY_MUTED[2], SKY_VIVID[2], prog));
    sky.addColorStop(1,    lerpColor(SKY_MUTED[3], SKY_VIVID[3], prog));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, skyH + 2);

    // warm horizontal light bands near the horizon
    for (i = 0; i < 3; i++){
      var by = skyH * (0.72 + i * 0.09);
      grad = g.createRadialGradient(W * 0.35, by, 4, W * 0.35, by, W * 0.7);
      grad.addColorStop(0, 'rgba(255,214,170,' + (0.1 + prog * 0.08) + ')');
      grad.addColorStop(1, 'rgba(255,214,170,0)');
      g.save();
      g.translate(W * 0.35, by);
      g.scale(1, 0.12);
      g.translate(-W * 0.35, -by);
      g.fillStyle = grad;
      g.fillRect(-W, by - W * 0.7, W * 3, W * 1.4);
      g.restore();
    }

    // the sun — soft disc + big halo
    var sun = sunPos(W, H);
    grad = g.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, W * 0.85);
    grad.addColorStop(0, 'rgba(255,236,190,' + (0.5 + 0.25 * prog) + ')');
    grad.addColorStop(0.25, 'rgba(255,225,175,' + (0.18 + 0.12 * prog) + ')');
    grad.addColorStop(1, 'rgba(255,225,175,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    grad = g.createRadialGradient(sun.x, sun.y, 1, sun.x, sun.y, W * 0.075);
    grad.addColorStop(0, 'rgba(255,252,235,0.95)');
    grad.addColorStop(0.55, 'rgba(255,242,200,0.55)');
    grad.addColorStop(1, 'rgba(255,242,200,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(sun.x, sun.y, W * 0.075, 0, TAU);
    g.fill();

    // rolling hills with rim light
    var hillTop = [H * 0.52, H * 0.60, H * 0.685, H * 0.79];
    for (i = 0; i < 4; i++){
      var pts = [];
      for (x = -12; x <= W + 14; x += 10){
        pts.push([x, hillTop[i]
          + Math.sin(x * 0.011 + i * 2.4) * H * 0.022
          + Math.sin(x * 0.027 + i * 5.1) * H * 0.009
          + Math.sin(x * 0.005 + i * 1.3) * H * 0.012]);
      }
      g.beginPath();
      g.moveTo(-12, H + 10);
      for (var p = 0; p < pts.length; p++) g.lineTo(pts[p][0], pts[p][1]);
      g.lineTo(W + 14, H + 10);
      g.closePath();
      var hillCol = lerpColor(HILL_MUTED[i], HILL_VIVID[i], prog);
      grad = g.createLinearGradient(0, hillTop[i] - H * 0.03, 0, Math.min(H, hillTop[i] + H * 0.3));
      grad.addColorStop(0, shade(hillCol, 0.14));
      grad.addColorStop(1, shade(hillCol, -0.05));
      g.fillStyle = grad;
      g.fill();
      // sunlit rim along the crest
      g.beginPath();
      for (p = 0; p < pts.length; p++){
        if (p === 0) g.moveTo(pts[p][0], pts[p][1]);
        else g.lineTo(pts[p][0], pts[p][1]);
      }
      g.strokeStyle = rgba('#fff0c9', 0.28 + prog * 0.22);
      g.lineWidth = 2.5;
      g.stroke();
    }

    // watercolor washes on the meadow
    for (i = 0; i < 70; i++){
      var bx = rand(0, W), byy = rand(H * 0.52, H), br = rand(18, 80);
      grad = g.createRadialGradient(bx, byy, 1, bx, byy, br);
      var kind = Math.random();
      grad.addColorStop(0, kind < 0.45 ? 'rgba(255,250,235,0.08)'
                       : kind < 0.8 ? 'rgba(80,120,80,0.05)'
                       : 'rgba(255,190,200,0.05)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(bx - br, byy - br, br * 2, br * 2);
    }

    // distant flower speckles (with tiny stems on the near hills)
    for (i = 0; i < 90; i++){
      var fx = rand(6, W - 6), fy = rand(H * 0.56, H * 0.99);
      var depth = fy / H;
      var fr = rand(1.4, 3.4) * depth;
      var colored = Math.random() < prog;
      if (fy > H * 0.72){
        g.strokeStyle = 'rgba(90,120,80,0.4)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(fx, fy);
        g.lineTo(fx + rand(-1.5, 1.5), fy + fr * 3);
        g.stroke();
      }
      g.beginPath();
      g.arc(fx, fy, fr, 0, TAU);
      g.fillStyle = colored ? rgba(pick(PETAL_PINKS), 0.85) : 'rgba(240,238,230,0.6)';
      g.fill();
      if (colored && fr > 2){
        g.beginPath();
        g.arc(fx, fy, fr * 0.4, 0, TAU);
        g.fillStyle = 'rgba(255,230,160,0.9)';
        g.fill();
      }
    }

    // stars for the twinkle pass
    bg.stars = [];
    for (i = 0; i < 16; i++){
      bg.stars.push({ x: rand(10, W - 10), y: rand(8, H * 0.3), r: rand(0.8, 2.1), ph: rand(0, TAU) });
    }
    // grass blades along the bottom edge
    bg.grass = [];
    var n = Math.round(W / 7);
    for (i = 0; i < n; i++){
      bg.grass.push({
        x: rand(0, W), h: rand(12, 34), lean: rand(-6, 6),
        ph: rand(0, TAU), w: rand(2, 3.6),
        col: pick(['#5d8455', '#6b9260', '#527a4b', '#75a068'])
      });
    }
    // fireflies
    bg.flies = [];
    for (i = 0; i < 10; i++){
      bg.flies.push({ x: rand(0.06, 0.94), y: rand(0.35, 0.75), s: rand(0.5, 1), ph: rand(0, TAU) });
    }
    return c;
  }

  function drawGrass(ctx, W, H, t){
    var step = Art.lowQuality ? 2 : 1;
    for (var i = 0; i < bg.grass.length; i += step){
      var b = bg.grass[i];
      var sway = Math.sin(t * 1.3 + b.ph) * 3 + Math.sin(t * 0.4 + b.ph * 2) * 2;
      ctx.beginPath();
      ctx.moveTo(b.x - b.w, H + 2);
      ctx.quadraticCurveTo(b.x + b.lean * 0.4 + sway * 0.4, H - b.h * 0.55,
                           b.x + b.lean + sway, H - b.h);
      ctx.quadraticCurveTo(b.x + b.lean * 0.5 + sway * 0.45, H - b.h * 0.5,
                           b.x + b.w, H + 2);
      ctx.closePath();
      ctx.fillStyle = b.col;
      ctx.fill();
    }
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
    var i;

    // slowly sweeping god rays from the sun (pre-rendered wedge sprite)
    if (!Art.lowQuality){
      var sun = sunPos(W, H);
      var ray = raySprite();
      ctx.save();
      ctx.translate(sun.x, sun.y);
      for (i = 0; i < 4; i++){
        var a = -0.85 + i * 0.5 + Math.sin(t * 0.11 + i * 1.7) * 0.06;
        var rayA = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 2.1));
        ctx.save();
        ctx.rotate(a);
        ctx.globalAlpha = rayA;
        var rh = H * 0.12 + i * 9;
        ctx.drawImage(ray, 0, -rh / 2, H * 0.85, rh);
        ctx.restore();
      }
      ctx.restore();
    }

    // twinkling star-sparkles
    for (i = 0; i < bg.stars.length; i++){
      var s = bg.stars[i];
      var tw = 0.5 + 0.5 * Math.sin(t * 1.7 + s.ph);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fillStyle = 'rgba(255,250,235,' + (0.2 + 0.35 * tw).toFixed(3) + ')';
      ctx.fill();
      if (s.r > 1.6 && tw > 0.75){
        sparkleStar(ctx, s.x, s.y, s.r * 2.4, 'rgba(255,250,235,0.5)', t + s.ph);
      }
    }

    // drifting clouds — two layers of parallax
    var spr = cloudSprite(), wisp = wispSprite();
    for (i = 0; i < 3; i++){
      var span = W + 360;
      var cx = ((i * 0.41 * span + t * (4 + i * 2.4)) % span) - 180;
      var cy = H * (0.045 + 0.07 * i);
      ctx.save();
      ctx.globalAlpha = 0.85 - i * 0.14;
      var cw = 200 + i * 50;
      ctx.drawImage(spr, cx, cy, cw, cw * 0.4);
      ctx.restore();
    }
    for (i = 0; i < 2; i++){
      var span2 = W + 300;
      var wx = ((i * 0.53 * span2 + t * (9 + i * 3)) % span2) - 150;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(wisp, wx, H * (0.16 + 0.1 * i), 210, 40);
      ctx.restore();
    }

    // fireflies drifting over the meadow
    if (opts.fireflies){
      var flyCount = Art.lowQuality ? 5 : bg.flies.length;
      for (i = 0; i < flyCount; i++){
        var f = bg.flies[i];
        var fx = (f.x + Math.sin(t * 0.21 + f.ph) * 0.035 + Math.sin(t * 0.07 + f.ph * 3) * 0.02) * W;
        var fy = (f.y + Math.sin(t * 0.17 + f.ph * 2) * 0.03) * H;
        var blink = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * (0.8 + f.s * 0.6) + f.ph * 4), 2);
        glow(ctx, fx, fy, 10 * f.s + 6, '#ffeea8', blink * 0.8);
        ctx.beginPath();
        ctx.arc(fx, fy, 1.6 * f.s, 0, TAU);
        ctx.fillStyle = 'rgba(255,246,200,' + (0.5 + blink * 0.5).toFixed(3) + ')';
        ctx.fill();
      }
    }

    if (opts.grass !== false) drawGrass(ctx, W, H, t);

    if (opts.dim){
      ctx.fillStyle = 'rgba(255,250,240,' + opts.dim + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* soft out-of-focus foreground flowers (fake depth of field) */
  var bokehCache = {};
  function bokehFlower(colIdx, species){
    var key = colIdx + '_' + species;
    if (bokehCache[key]) return bokehCache[key];
    var small = document.createElement('canvas');
    small.width = small.height = 44;
    var sg = small.getContext('2d');
    flowerHead(sg, 22, 22, 17, FLOWER_COLORS[colIdx], 1, 0.3, species);
    var c = document.createElement('canvas');
    c.width = c.height = 40;
    var g = c.getContext('2d');
    g.drawImage(small, 4, 4, 32, 32);   // downscale…
    bokehCache[key] = c;                 // …then upscale at draw = cheap blur
    return c;
  }
  function foreground(ctx, W, H, t){
    if (Art.lowQuality) return;
    var sway = Math.sin(t * 0.7) * 8;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.drawImage(bokehFlower(0, 0), -W * 0.1 + sway * 0.4, H - W * 0.34, W * 0.42, W * 0.42);
    ctx.drawImage(bokehFlower(1, 1), W * 0.72 - sway * 0.5, H - W * 0.3, W * 0.36, W * 0.36);
    ctx.globalAlpha = 0.75;
    ctx.drawImage(bokehFlower(2, 3), W * 0.3 + sway * 0.3, H - W * 0.18, W * 0.24, W * 0.24);
    ctx.restore();
  }

  /* ---------- moon ---------- */

  var moonSpr = null;
  function moonSprite(){
    if (moonSpr) return moonSpr;
    var cres = document.createElement('canvas');
    cres.width = cres.height = 160;
    var cg = cres.getContext('2d');
    var mg = cg.createRadialGradient(70, 74, 4, 80, 80, 36);
    mg.addColorStop(0, '#fff8e2');
    mg.addColorStop(1, '#f7e7b8');
    cg.beginPath();
    cg.arc(80, 80, 34, 0, TAU);
    cg.fillStyle = mg;
    cg.fill();
    // craters
    cg.fillStyle = 'rgba(215,190,140,0.55)';
    cg.beginPath(); cg.arc(66, 92, 4.5, 0, TAU); cg.fill();
    cg.beginPath(); cg.arc(76, 104, 3, 0, TAU); cg.fill();
    cg.beginPath(); cg.arc(58, 76, 3.4, 0, TAU); cg.fill();
    cg.globalCompositeOperation = 'destination-out';
    cg.beginPath();
    cg.arc(96, 66, 30, 0, TAU);
    cg.fill();

    var c = document.createElement('canvas');
    c.width = c.height = 160;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(74, 86, 8, 74, 86, 78);
    grad.addColorStop(0, 'rgba(255,244,214,0.42)');
    grad.addColorStop(0.42, 'rgba(255,244,214,0.15)');
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
      grad.addColorStop(1, 'rgba(110,60,85,0.18)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      // warm bloom at the top
      grad = g.createLinearGradient(0, 0, 0, H * 0.2);
      grad.addColorStop(0, 'rgba(255,235,215,0.14)');
      grad.addColorStop(1, 'rgba(255,235,215,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H * 0.2);
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
    ctx.fillStyle = 'rgba(255,250,243,0.9)';
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
        var grad = ctx.createLinearGradient(0, -size, 0, size);
        grad.addColorStop(0, '#f9a8c9');
        grad.addColorStop(1, '#e26d9e');
        ctx.fillStyle = grad;
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
  function flowerSprite(colIdx, q, px, species){
    species = species || 0;
    var key = colIdx + '_' + q + '_' + px + '_' + species;
    if (spriteCache[key]) return spriteCache[key];
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var g = c.getContext('2d');
    flowerHead(g, px / 2, px / 2, px * 0.4, FLOWER_COLORS[colIdx % FLOWER_COLORS.length], q / 10, 0, species);
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
    foreground: foreground,
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
        species: randi(0, 3),
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
          Art.flowerHead(ctx, 0, 0, p.size, FLOWER_COLORS[p.colIdx], 1, 0, p.species || 0);
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
