/* ============================================================
   Mannou's Garden Quest — audio engine
   Everything is synthesized with the Web Audio API, so the game
   needs no audio files and works offline instantly.
   ============================================================ */

var Sfx = (function(){
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var S = {
    ready: false,
    muted: false
  };

  var ctx = null;
  var master = null, musicBus = null, sfxBus = null, ambBus = null;
  var noiseBuf = null;
  var musicTimer = null, birdTimer = null;
  var nextBar = 0, barIdx = 0;

  function now(){ return ctx.currentTime; }
  function mtof(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd(a, b){ return a + Math.random() * (b - a); }

  /* ---------- graph setup ---------- */

  S.unlock = function(){
    if (S.ready || !AC) return;
    try { ctx = new AC(); } catch (e) { return; }

    master = ctx.createGain();
    master.gain.value = S.muted ? 0 : 0.9;
    master.connect(ctx.destination);

    var soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 3200;
    soften.connect(master);

    musicBus = ctx.createGain(); musicBus.gain.value = 0.85; musicBus.connect(soften);
    ambBus   = ctx.createGain(); ambBus.gain.value   = 1.0;  ambBus.connect(soften);
    sfxBus   = ctx.createGain(); sfxBus.gain.value   = 0.9;  sfxBus.connect(master);

    noiseBuf = makeNoise();

    S.ready = true;
    if (ctx.state === 'suspended') ctx.resume();

    startMusic();
    startWind();
    scheduleBirds();

    document.addEventListener('visibilitychange', function(){
      if (!ctx) return;
      if (document.hidden) { ctx.suspend(); }
      else { ctx.resume(); }
    });
  };

  /* Called on every pointerdown: revives an iOS-suspended context. */
  S.poke = function(){
    if (S.ready && ctx.state === 'suspended') ctx.resume();
  };

  S.setMuted = function(m){
    S.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
  };

  function makeNoise(){
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------- generative music ----------
     A slow, warm lullaby: soft pad chords with a sparse
     music-box piano wandering over the pentatonic scale. */

  var CHORDS = [
    [48, 55, 59, 64],   // Cmaj7
    [45, 52, 60, 64],   // Am7
    [41, 53, 57, 64],   // Fmaj7
    [43, 55, 62, 67]    // G
  ];
  var PENTA = [72, 74, 76, 79, 81, 84];
  var BAR = 3.8;

  function startMusic(){
    nextBar = now() + 0.15;
    barIdx = 0;
    musicTimer = setInterval(function(){
      if (!ctx || ctx.state !== 'running') return;
      while (nextBar < now() + 1.0){
        scheduleBar(nextBar);
        nextBar += BAR;
      }
    }, 250);
  }

  function scheduleBar(t0){
    var ch = CHORDS[barIdx % CHORDS.length];
    barIdx++;
    for (var i = 0; i < ch.length; i++){
      pad(mtof(ch[i]), t0 + i * 0.04);
    }
    var steps = [0.05, 1.0, 1.9, 2.85];
    for (var s = 0; s < steps.length; s++){
      if (Math.random() < 0.85){
        var pool = Math.random() < 0.6 ? ch : PENTA;
        var m = pool[(Math.random() * pool.length) | 0];
        if (pool === ch) m += 12;
        piano(mtof(m), t0 + steps[s] + rnd(0, 0.09), rnd(0.05, 0.085));
      }
    }
    if (Math.random() < 0.45){
      piano(mtof(PENTA[(Math.random() * PENTA.length) | 0]) * 2, t0 + rnd(1.2, 3.2), 0.03);
    }
  }

  function pad(freq, t){
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'sine';
    o1.frequency.value = freq;
    o2.frequency.value = freq * 1.003;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.028, t + 1.5);
    g.gain.setValueAtTime(0.028, t + BAR - 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + BAR + 0.4);
    o1.connect(g); o2.connect(g); g.connect(musicBus);
    o1.start(t); o2.start(t);
    o1.stop(t + BAR + 0.5); o2.stop(t + BAR + 0.5);
  }

  function piano(freq, t, vol){
    var partials = [1, 2, 3];
    var gains = [1, 0.32, 0.1];
    for (var i = 0; i < partials.length; i++){
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * partials[i] * (1 + rnd(-0.0008, 0.0008));
      var g = ctx.createGain();
      var v = vol * gains[i];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + 2.3);
    }
  }

  /* ---------- ambience ---------- */

  function startWind(){
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.5;
    var g = ctx.createGain();
    g.gain.value = 0.018;

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    var lfoG = ctx.createGain();
    lfoG.gain.value = 0.01;
    lfo.connect(lfoG); lfoG.connect(g.gain);

    var lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.045;
    var lfo2G = ctx.createGain();
    lfo2G.gain.value = 130;
    lfo2.connect(lfo2G); lfo2G.connect(f.frequency);

    src.connect(f); f.connect(g); g.connect(ambBus);
    src.start(); lfo.start(); lfo2.start();
  }

  function scheduleBirds(){
    birdTimer = setTimeout(function(){
      if (ctx && ctx.state === 'running' && !S.muted) chirpCluster();
      scheduleBirds();
    }, rnd(4500, 11000));
  }

  function chirpCluster(){
    var n = 2 + ((Math.random() * 3) | 0);
    var t = now() + 0.05;
    for (var i = 0; i < n; i++){
      chirp(t);
      t += rnd(0.15, 0.34);
    }
  }

  function chirp(t){
    var o = ctx.createOscillator();
    o.type = 'sine';
    var f0 = rnd(2100, 3100);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.15, 1.4), t + 0.06);
    o.frequency.exponentialRampToValueAtTime(f0 * rnd(0.85, 0.95), t + 0.14);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.018, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(ambBus);
    o.start(t); o.stop(t + 0.2);
  }

  /* ---------- sound effects ---------- */

  function bellAt(freq, t, vol, dur){
    if (!S.ready) return;
    vol = vol || 0.16; dur = dur || 0.9;
    var partials = [1, 2.76, 5.4];
    var gains = [1, 0.32, 0.1];
    for (var i = 0; i < partials.length; i++){
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * partials[i];
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * gains[i], t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  S.bell = function(mul){
    if (!S.ready) return;
    bellAt(1046.5 * (mul || 1), now(), 0.13, 0.8);
  };

  S.chime = function(){
    if (!S.ready) return;
    bellAt(1568, now(), 0.09, 0.6);
  };

  S.pop = function(){
    if (!S.ready) return;
    var t = now();
    var o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(360, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + 0.1);
  };

  S.flip = function(){
    if (!S.ready) return;
    var t = now();
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1300;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + 0.08);
  };

  S.sad = function(){
    if (!S.ready) return;
    var t = now();
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(330, t);
    o.frequency.linearRampToValueAtTime(255, t + 0.32);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + 0.4);
  };

  S.bloom = function(){
    if (!S.ready) return;
    var t = now();
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(320, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 1.0);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + 1.3);

    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(392, t);
    o.frequency.exponentialRampToValueAtTime(784, t + 0.9);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.05, t + 0.3);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(og); og.connect(sfxBus);
    o.start(t); o.stop(t + 1.2);

    bellAt(1046.5, t + 0.45, 0.09, 0.9);
    bellAt(1318.5, t + 0.6, 0.08, 0.9);
    bellAt(1568.0, t + 0.75, 0.07, 1.0);
  };

  S.fanfare = function(){
    if (!S.ready) return;
    var t = now();
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++){
      bellAt(notes[i], t + i * 0.13, 0.11, 1.0);
    }
  };

  S.celebrate = function(){
    if (!S.ready) return;
    var t = now();
    var notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];
    for (var i = 0; i < notes.length; i++){
      bellAt(notes[i], t + i * 0.1, 0.1, 1.2);
    }
    bellAt(2093, t + 0.9, 0.06, 1.6);
  };

  var SIMON_NOTES = [523.25, 587.33, 659.25, 783.99, 880];
  S.simonNote = function(i){
    if (!S.ready) return;
    var t = now();
    var f = SIMON_NOTES[i % SIMON_NOTES.length];
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    var o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(0.03, t + 0.015);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); g.connect(sfxBus);
    o2.connect(g2); g2.connect(sfxBus);
    o.start(t); o.stop(t + 0.6);
    o2.start(t); o2.stop(t + 0.45);
  };

  S.sparkle = function(){
    if (!S.ready) return;
    bellAt(rnd(1800, 2600), now(), 0.05, 0.5);
  };

  return S;
})();
