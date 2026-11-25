/* 《雾崎来信》AVG 音效层 —— 无音频文件，全部 Web Audio 现场合成。
 *
 * 环境音（amb_*）：
 *   street      雨＋远处演歌残响（白鹭町）
 *   sanatorium  留声机底噪＋极远处的合唱（白蔷薇）
 *   apt         冰箱嗡鸣＋水滴（镜湖公寓）
 *   lake        水面轻拍＋风（镜湖）
 *   post        盖章机＋低鸣（旧港区邮局）
 *
 * 限量音效：
 *   open        拆信纸的嘶声
 *   stamp       邮戳落下的闷响
 *   breath      归途的喘息（不该第一次就听出是人）
 *
 * game.js 通过 AVG_AUDIO.cmd(v) 调用：
 *   'unlock'          首次用户手势后初始化（浏览器要求）
 *   'amb_street' 等    切环境音；'amb_off' 关闭
 *   'open' / 'stamp' / 'breath'
 */
(function () {
  'use strict';
  var ac = null, master = null;
  var ambGain = null, ambName = null;
  var ambTimers = [], ambSources = [];
  var _noise2 = null;

  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
    if (ambName) { var n = ambName; ambName = null; startAmb(n); }
  }

  function noiseBuf(sec, decay) {
    var len = Math.max(1, Math.floor(ac.sampleRate * sec));
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (decay ? (1 - i / len) : 1);
    }
    return buf;
  }

  function loopNoise(sec, freq, q, type) {
    if (!_noise2) _noise2 = noiseBuf(2.0, false);
    var src = ac.createBufferSource();
    src.buffer = _noise2; src.loop = true;
    var f = ac.createBiquadFilter();
    f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q || 0.7;
    src.connect(f);
    ambSources.push(src);
    return { src: src, out: f };
  }

  function lfo(freq, depth, param) {
    var o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    var g = ac.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(param);
    ambSources.push(o);
    return o;
  }

  function tone(freq, type, gain) {
    var o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    var g = ac.createGain(); g.gain.value = gain;
    o.connect(g); g.connect(ambGain);
    ambSources.push(o);
    return { o: o, g: g };
  }

  function every(ms, fn) {
    ambTimers.push(setInterval(function () {
      if (ac && ambGain) fn(ac.currentTime);
    }, ms));
  }

  function later(ms, fn) {
    ambTimers.push(setTimeout(function () {
      if (ac && ambGain) fn(ac.currentTime);
    }, ms));
  }

  /* ---------------- 环境音床 ---------------- */

  function bedStreet() {
    var rain = loopNoise(2.0, 900, 0.5);
    var lg = ac.createGain(); lg.gain.value = 0.14;
    rain.out.connect(lg); lg.connect(ambGain);
    rain.src.start();
    lfo(0.07, 0.045, lg.gain);
    tone(164, 'sine', 0.012);            // 霓虹镇流器的哼
    // 远处的演歌残响：一小句，很轻，很久才来一次
    later(5000, function song() {
      var notes = [69, 65, 62, 65];
      var base = ac.currentTime + 0.05;
      notes.forEach(function (m, i) {
        var f = 440 * Math.pow(2, (m - 69) / 12);
        var o = ac.createOscillator(); o.type = 'sine';
        o.frequency.value = f; o.detune.value = -7;
        var g = ac.createGain();
        var t0 = base + i * 0.85;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.024, t0 + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);
        o.connect(g); g.connect(ambGain);
        o.start(t0); o.stop(t0 + 1.8);
      });
      later(14000 + Math.random() * 7000, song);
    });
  }

  function bedSanatorium() {
    // 留声机：黑胶炒豆声
    every(260, function (t) {
      if (Math.random() > 0.24) return;
      var b = noiseBuf(0.03, true);
      var n = ac.createBufferSource(); n.buffer = b;
      var f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3200;
      var g = ac.createGain(); g.gain.value = 0.03;
      n.connect(f); f.connect(g); g.connect(ambGain);
      n.start(t); n.stop(t + 0.04);
    });
    // 远处合唱：极慢的暖垫
    tone(196, 'sine', 0.020);
    tone(294, 'sine', 0.014);
    tone(392, 'triangle', 0.008);
    // 走调的童声，偶尔飘过来一句
    later(9000, function kid() {
      var o = ac.createOscillator(); o.type = 'sine';
      o.frequency.value = 660 + Math.random() * 40;
      var vib = ac.createOscillator(); vib.frequency.value = 5;
      var vg = ac.createGain(); vg.gain.value = 6;
      vib.connect(vg); vg.connect(o.frequency);
      var g = ac.createGain();
      var t0 = ac.currentTime + 0.05;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.018, t0 + 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 2.6);
      o.connect(g); g.connect(ambGain);
      o.start(t0); o.stop(t0 + 2.7); vib.start(t0); vib.stop(t0 + 2.7);
      later(19000 + Math.random() * 14000, kid);
    });
  }

  function bedApt() {
    var hum = loopNoise(2.0, 140, 0.6);
    var hg = ac.createGain(); hg.gain.value = 0.05;
    hum.out.connect(hg); hg.connect(ambGain); hum.src.start();
    tone(50, 'sawtooth', 0.012);
    tone(100, 'sine', 0.008);
    // 水滴
    later(2500, function drip() {
      var o = ac.createOscillator(); o.type = 'sine';
      var t0 = ac.currentTime + 0.02;
      o.frequency.setValueAtTime(1100 + Math.random() * 300, t0);
      o.frequency.exponentialRampToValueAtTime(260, t0 + 0.13);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(g); g.connect(ambGain);
      o.start(t0); o.stop(t0 + 0.2);
      later(3200 + Math.random() * 5200, drip);
    });
  }

  function bedLake() {
    var lap = loopNoise(2.0, 380, 0.8, 'bandpass');
    var lg = ac.createGain(); lg.gain.value = 0.10;
    lap.out.connect(lg); lg.connect(ambGain);
    lap.src.start();
    lfo(0.09, 0.06, lg.gain);
    var wind = loopNoise(2.0, 520, 0.5, 'bandpass');
    var wg = ac.createGain(); wg.gain.value = 0.05;
    wind.out.connect(wg); wg.connect(ambGain);
    wind.src.start();
    lfo(0.045, 240, wind.out.frequency);
    tone(55, 'sine', 0.022);
  }

  function bedPost() {
    tone(120, 'sawtooth', 0.008);
    // 盖章机：两声一组的咔哒＋闷响
    every(2400, function (t) {
      for (var i = 0; i < 2; i++) {
        (function (dt) {
          var b = noiseBuf(0.04, true);
          var n = ac.createBufferSource(); n.buffer = b;
          var f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2400;
          var g = ac.createGain(); g.gain.value = 0.05;
          n.connect(f); f.connect(g); g.connect(ambGain);
          n.start(t + dt); n.stop(t + dt + 0.05);
          var o = ac.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(95, t + dt);
          o.frequency.exponentialRampToValueAtTime(58, t + dt + 0.1);
          var og = ac.createGain(); og.gain.value = 0.06;
          o.connect(og); og.connect(ambGain);
          o.start(t + dt); o.stop(t + dt + 0.12);
        })(i * 0.24);
      }
    });
    // 纸的抖动
    later(6000, function flutter() {
      var b = noiseBuf(0.5, true);
      var n = ac.createBufferSource(); n.buffer = b;
      var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.4;
      var g = ac.createGain(); g.gain.value = 0.035;
      n.connect(f); f.connect(g); g.connect(ambGain);
      n.start(ac.currentTime); n.stop(ac.currentTime + 0.5);
      later(8000 + Math.random() * 6000, flutter);
    });
  }

  /* ---------------- 环境音调度 ---------------- */

  function stopAmb() {
    ambTimers.forEach(clearTimeout);
    ambTimers.forEach(clearInterval);
    ambTimers = [];
    if (ambGain) {
      var g = ambGain, old = ambSources;
      ambSources = [];
      try { g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.22); } catch (e) {}
      setTimeout(function () {
        old.forEach(function (s) { try { s.stop(); } catch (e) {} });
        try { g.disconnect(); } catch (e) {}
      }, 800);
    }
    ambGain = null;
  }

  function startAmb(name) {
    if (!ac) { ambName = name; return; }   // 还没有手势：先记住，unlock 后再起
    stopAmb();
    ambName = name || null;
    if (!name) return;
    ambGain = ac.createGain();
    ambGain.gain.value = 0.0001;
    ambGain.connect(master);
    try { ambGain.gain.setTargetAtTime(0.5, ac.currentTime, 1.1); } catch (e) {}
    if (name === 'street') bedStreet();
    else if (name === 'sanatorium') bedSanatorium();
    else if (name === 'apt') bedApt();
    else if (name === 'lake') bedLake();
    else if (name === 'post') bedPost();
  }

  /* ---------------- 限量音效 ---------------- */

  function sfxOpen() {
    if (!ac) return;
    var t = ac.currentTime + 0.01;
    var b = noiseBuf(0.4, true);
    var src = ac.createBufferSource(); src.buffer = b;
    var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.32);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.20, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.45);
  }

  function sfxStamp() {
    if (!ac) return;
    var t = ac.currentTime + 0.01;
    var o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.13);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.42, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.32);
    var b = noiseBuf(0.06, true);
    var n = ac.createBufferSource(); n.buffer = b;
    var nf = ac.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2400;
    var ng = ac.createGain();
    ng.gain.setValueAtTime(0.11, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(nf); nf.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.08);
  }

  function sfxBreath() {
    if (!ac) return;
    var t = ac.currentTime + 0.02;
    var b = noiseBuf(2.2, false);
    var src = ac.createBufferSource(); src.buffer = b;
    var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 640; f.Q.value = 0.7;
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.55);    // 吸
    g.gain.linearRampToValueAtTime(0.0001, t + 0.85);
    g.gain.linearRampToValueAtTime(0.07, t + 1.5);     // 呼——更长，更沉
    g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + 2.2);
  }

  /* ---------------- 对外接口 ---------------- */

  function cmd(v) {
    if (!v) return;
    if (v === 'unlock') { unlock(); return; }
    if (v === 'amb_off') { startAmb(null); return; }
    if (v.indexOf('amb_') === 0) { startAmb(v.slice(4)); return; }
    if (v === 'open') { sfxOpen(); return; }
    if (v === 'stamp') { sfxStamp(); return; }
    if (v === 'breath') { sfxBreath(); return; }
  }

  window.AVG_AUDIO = { cmd: cmd, unlock: unlock };
})();
