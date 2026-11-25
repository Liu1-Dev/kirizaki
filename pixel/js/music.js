/* 雾崎来信 · 音乐层
 *
 * 不加载任何音频文件：全部 Web Audio 现场合成。
 * 三个 12–16 秒循环，旋律取自公有领域乐谱或按同一语汇重写：
 *
 *   raindrop  肖邦《雨滴》Op.28 No.15 第 1–4 小节，76 BPM（12.6s）
 *             目前不挂在任何场景（街道信内改回纯雨声），数据留作备用
 *   k397      莫扎特 K397 低音 E 心跳段，16s
 *             脉冲贯穿整段、不断气；上声部半音下行到 F 后跨过循环点
 *   swan      圣-桑《天鹅》语汇的轻柔人声，G 大调 6/4（12s）
 *             共振峰合成的「ooh」合唱 + 低音 G 持续
 *   island    雾屿：原创的「管风琴 + 滴答」，16s（Dm–B♭–Gm–A）
 *             不引用《星际穿越》任何主题，只借用“时间/宇宙”的音色语汇
 *
 * 两种音色：piano（毡钢琴/音乐盒）与 choir（共振峰人声）。
 */
(function (global) {
  'use strict';

  const A4 = 440;
  const hz = (m) => A4 * Math.pow(2, (m - 69) / 12);

  // ---------------------------------------------------------------- 音符数据
  // [时间(秒), MIDI, 时值(秒), 力度]

  function buildRaindrop() {
    const BPM = 76;
    const BEAT = 60 / BPM;
    const at = (bar, beat) => (bar * 4 + beat) * BEAT;
    const n = [];

    // 左手：低音、和弦（每小节第一拍）
    [[0, 49], [1, 56], [2, 46], [3, 45]].forEach(([bar, m]) => n.push([at(bar, 0), m, BEAT * 2.2, 0.22]));
    [
      [0, 61], [0, 65],   // D♭4 F4
      [1, 63], [1, 66],   // E♭4 G♭4
      [2, 61], [2, 65],
      [3, 63], [3, 66]
    ].forEach(([bar, m]) => n.push([at(bar, 0), m, BEAT * 3.2, 0.09]));

    // 雨滴：每个八分音符一下，四小节
    for (let b = 0; b < 4; b++) {
      for (let i = 0; i < 8; i++) {
        n.push([at(b, i * 0.5), 80, 0.32, i === 0 ? 0.075 : 0.05]);
      }
    }

    // 右手旋律（第 1–3 小节）
    n.push([at(0, 0.00), 77, BEAT * 0.75, 0.30]);   // F5
    n.push([at(0, 0.75), 73, BEAT * 0.25, 0.24]);   // D♭5
    n.push([at(0, 1.00), 68, BEAT * 2.00, 0.28]);   // A♭4
    n.push([at(0, 3.00), 70, BEAT * 1.00, 0.26]);   // B♭4
    n.push([at(1, 0.00), 72, BEAT * 3.00, 0.28]);   // C5
    n.push([at(1, 3.00), 73, BEAT * 1.00, 0.24]);   // D♭5
    n.push([at(2, 0.00), 75, BEAT * 0.75, 0.28]);   // E♭5
    n.push([at(2, 0.75), 77, BEAT * 0.25, 0.22]);   // F5
    n.push([at(2, 1.00), 78, BEAT * 2.00, 0.28]);   // G♭5
    n.push([at(2, 3.00), 77, BEAT * 1.00, 0.24]);   // F5

    // 第 4 小节：附点 + 七连音（原谱的 tuplet 7/2）
    n.push([at(3, 0.00), 77, BEAT * 1.50, 0.28]);   // F5
    n.push([at(3, 1.50), 75, BEAT * 0.50, 0.22]);   // E♭5
    n.push([at(3, 2.00), 73, BEAT * 1.00, 0.24]);   // D♭5
    const run = [75, 77, 75, 74, 75, 77, 78];        // E♭ F E♭ D E♭ F G♭
    run.forEach((m, i) => n.push([at(3, 3.00) + i * BEAT / 7, m, 0.20, 0.20 - i * 0.006]));

    return { dur: at(4, 0), notes: n.sort((a, b) => a[0] - b[0]), voice: 'piano', cents: -4, gain: 1 };
  }

  function buildK397() {
    const n = [];
    // 低音 E 持续，刻意比循环长 1 秒，跨过接缝
    n.push([0, 40, 17, 0.09]);
    // 心跳：0.5 秒一下，贯穿 16 秒，不再有尾部停顿
    for (let i = 0; i < 32; i++) {
      n.push([i * 0.5, 52, 0.40, i % 4 === 0 ? 0.18 : (i % 2 === 0 ? 0.14 : 0.09)]);
    }
    // 上声部：半音下行，最后一个音跨过循环点
    const line = [
      [2.0, 60], [4.0, 59], [6.0, 58], [8.0, 57],
      [10.0, 56], [12.0, 55], [14.0, 54], [15.2, 53]
    ];
    line.forEach(([t, m], i) => n.push([t, m, i === line.length - 1 ? 2.6 : 2.2, 0.26]));
    return { dur: 16, notes: n.sort((a, b) => a[0] - b[0]), voice: 'piano', cents: 0, gain: 0.95 };
  }

  function buildSwan() {
    // G 大调 6/4，四分音符 = 60，12 拍 = 12 秒
    const n = [];
    // 低音与和声垫，跨过接缝
    n.push([0, 43, 13.2, 0.055]);          // G2
    n.push([0, 55, 13.2, 0.034]);          // G3
    n.push([0, 59, 13.2, 0.030]);          // B3
    n.push([0, 62, 13.2, 0.028]);          // D4
    // 旋律：B–D–E–F♯–G–F♯–E–D
    const mel = [
      [0.0, 71, 2.0], [2.0, 74, 1.0], [3.0, 76, 1.0], [4.0, 78, 2.0],
      [6.0, 79, 2.0], [8.0, 78, 1.0], [9.0, 76, 1.0], [10.0, 74, 2.6]
    ];
    mel.forEach(([t, m, d], i) => n.push([t, m, d, i === 0 ? 0.20 : 0.17]));
    // 三度和声（低于旋律）
    [[0.0, 67, 2.0], [2.0, 71, 1.0], [3.0, 72, 1.0], [4.0, 74, 2.0],
      [6.0, 75, 2.0], [8.0, 74, 1.0], [9.0, 72, 1.0], [10.0, 71, 2.6]]
      .forEach(([t, m, d]) => n.push([t, m, d, 0.048]));
    return { dur: 12, notes: n.sort((a, b) => a[0] - b[0]), voice: 'choir', cents: 0, gain: 1.15 };
  }

  function buildIsland() {
    // 16 秒，四小节：Dm – B♭ – Gm – A。原创段落，不对应任何电影配乐
    const n = [];
    const bars = [
      [0, 50, 53, 57],    // D3 F3 A3
      [4, 46, 50, 53],    // B♭2 D3 F3
      [8, 43, 46, 50],    // G2 B♭2 D3
      [12, 45, 49, 52]    // A2 C♯3 E3
    ];
    bars.forEach(([t, ...notes]) => notes.forEach((m) => n.push([t, m, 4.6, 0.10])));
    [[0, 38], [4, 34], [8, 31], [12, 33]].forEach(([t, m]) => n.push([t, m, 4.8, 0.16]));
    // 高音缓慢铺开
    n.push([0, 69, 8, 0.050]);
    n.push([0, 74, 8, 0.040]);
    n.push([8, 67, 8, 0.050]);
    n.push([8, 74, 8, 0.035]);
    // 低音 D 持续，跨过循环点
    n.push([0, 26, 17, 0.10]);
    // 滴答：每拍一下，小节头重一点
    for (let i = 0; i < 16; i++) n.push([i, -1, 0.1, i % 4 === 0 ? 0.16 : 0.09]);
    return { dur: 16, notes: n.sort((a, b) => a[0] - b[0]), voice: 'organ', cents: 0, gain: 1 };
  }

  const LOOPS = {
    raindrop: buildRaindrop(),
    k397: buildK397(),
    swan: buildSwan(),
    island: buildIsland()
  };

  // ---------------------------------------------------------------- 合成器
  let ac = null, dest = null;
  let musicGain = null, dry = null, wet = null, conv = null;
  let timer = null, current = null, loopStart = 0, cursor = 0;
  let muted = false, pending = null;

  function makeIR(sec) {
    const len = Math.floor(ac.sampleRate * sec);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    return buf;
  }

  let _acc = null;
  function accentNoise() {
    if (_acc) return _acc;
    const len = Math.floor(ac.sampleRate * 0.6);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    _acc = buf;
    return buf;
  }

  let _noise = null;
  function noiseBurst() {
    if (_noise) return _noise;
    const len = Math.floor(ac.sampleRate * 0.08);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    _noise = buf;
    return buf;
  }

  /** 毡钢琴 / 音乐盒：四个振荡器 + 低通 + 衰减包络 + 击弦噪声 */
  function piano(t, midi, dur, vel, cents) {
    const f = hz(midi);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(4200, 700 + f * 3.4);
    lp.Q.value = 0.45;

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, vel), t + 0.012);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0008, vel * 0.34), t + 0.34);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.1);

    const stop = t + dur + 1.3;
    [
      ['sine', 1, 1.00, 0],
      ['sine', 2, 0.16 + vel * 1.4, 4],
      ['triangle', 1, 0.20, -5],
      ['sine', 3, 0.05, 2]
    ].forEach(([type, mult, amp, det]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = det + cents;
      const og = ac.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(stop);
    });

    const nb = ac.createBufferSource();
    nb.buffer = noiseBurst();
    const nf = ac.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = Math.min(5000, f * 4);
    nf.Q.value = 1.2;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(Math.min(0.03, vel * 0.12), t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    nb.connect(nf); nf.connect(ng); ng.connect(g);
    nb.start(t); nb.stop(t + 0.08);

    lp.connect(g);
    g.connect(musicGain);
  }

  /** 轻柔人声：三支失谐锯齿 + 两个共振峰（ooh）+ 慢起音 + 颤音 */
  function choir(t, midi, dur, vel, cents) {
    const f = hz(midi);
    const out = ac.createGain();
    const atk = 0.55;
    const rel = 2.2;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(Math.max(0.001, vel), t + atk);
    out.gain.setValueAtTime(Math.max(0.001, vel), t + Math.max(atk, dur * 0.55));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);

    const src = ac.createGain();
    src.gain.value = 1;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.3;

    // 颤音
    const vib = ac.createOscillator();
    const vibG = ac.createGain();
    vib.frequency.value = 4.7;
    vibG.gain.value = 5.5;
    vib.connect(vibG);
    vib.start(t);
    vib.stop(t + dur + rel + 0.2);

    [-7, 0, 6].forEach((det) => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det + cents;
      vibG.connect(o.detune);
      const og = ac.createGain();
      og.gain.value = 0.30;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + rel + 0.2);
    });

    // 共振峰：ooh 的 320 / 780 Hz
    [[320, 7, 1.0], [780, 9, 0.55], [2200, 12, 0.16]].forEach(([freq, q, amp]) => {
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      const bg = ac.createGain();
      bg.gain.value = amp;
      lp.connect(bp); bp.connect(bg); bg.connect(out);
    });
    const direct = ac.createGain();
    direct.gain.value = 0.12;
    lp.connect(direct); direct.connect(out);

    out.connect(musicGain);
  }

  /** 管风琴：正弦加和，慢起音、长释放 */
  function organ(t, midi, dur, vel, cents) {
    const f = hz(midi);
    const g = ac.createGain();
    const atk = 0.5, rel = 2.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.001, vel), t + atk);
    g.gain.setValueAtTime(Math.max(0.001, vel), t + Math.max(atk, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    lp.Q.value = 0.3;
    lp.connect(g);
    g.connect(musicGain);
    [
      [1, 0.60, 0],
      [2, 0.34, 3],
      [3, 0.18, -2],
      [4, 0.10, 0],
      [2, 0.18, -7]
    ].forEach(([mult, amp, det]) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      o.detune.value = det + cents;
      const og = ac.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      o.stop(t + dur + rel + 0.2);
    });
  }

  /** 滴答：一声很轻的钟摆 */
  function tickVoice(t, vel) {
    const g = ac.createGain();
    g.gain.setValueAtTime(Math.max(0.001, vel), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    g.connect(dry);
    g.connect(conv);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1180, t);
    o.frequency.exponentialRampToValueAtTime(820, t + 0.05);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.1);
    const n = ac.createBufferSource();
    n.buffer = noiseBurst();
    const nf = ac.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2600;
    nf.Q.value = 3;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(vel * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(g);
    n.start(t);
    n.stop(t + 0.06);
  }

  function tick() {
    if (!current || !ac) return;
    const L = LOOPS[current];
    const horizon = ac.currentTime + 1.2;
    while (loopStart + L.dur <= horizon) {
      loopStart += L.dur;
      cursor = 0;
    }
    while (cursor < L.notes.length && loopStart + L.notes[cursor][0] < horizon) {
      const n = L.notes[cursor++];
      if (muted) continue;
      const t = loopStart + n[0] + (Math.random() - 0.5) * 0.008;
      const v = n[3] * (L.gain || 1) * (0.94 + Math.random() * 0.12);
      if (n[1] < 0) tickVoice(t, v);
      else if (L.voice === 'choir') choir(t, n[1], n[2], v, L.cents || 0);
      else if (L.voice === 'organ') organ(t, n[1], n[2], v, L.cents || 0);
      else piano(t, n[1], n[2], v, L.cents || 0);
    }
  }

  function stopLoop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  const MUSIC = {
    init(ctx, master) {
      if (ac) return;
      ac = ctx;
      dest = master;
      musicGain = ac.createGain();
      musicGain.gain.value = 0.55;
      dry = ac.createGain(); dry.gain.value = 0.9;
      wet = ac.createGain(); wet.gain.value = 0.36;
      conv = ac.createConvolver();
      conv.buffer = makeIR(1.8);
      musicGain.connect(dry); dry.connect(dest);
      musicGain.connect(conv); conv.connect(wet); wet.connect(dest);
    },

    /** 切曲。key = 'raindrop' | 'k397' | 'swan' | null */
    set(key) {
      if (!ac) return;
      if (key === current) return;
      stopLoop();
      current = key;
      pending = key;
      musicGain.gain.cancelScheduledValues(ac.currentTime);
      musicGain.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      if (!key) return;
      setTimeout(() => {
        if (pending !== key || current !== key) return;
        loopStart = ac.currentTime + 0.05;
        cursor = 0;
        tick();
        timer = setInterval(tick, 200);
        musicGain.gain.cancelScheduledValues(ac.currentTime);
        musicGain.gain.setTargetAtTime(muted ? 0 : 0.55, ac.currentTime, 0.3);
      }, 180);
    },

    /** 一次性的重音：一下很重的钢琴低音，1 秒内收掉（雨声不停） */
    accent() {
      if (!ac || muted) return;
      const t = ac.currentTime + 0.015;
      const bus = ac.createGain();
      bus.gain.value = 0.8;
      bus.connect(dry);
      const send = ac.createGain();
      send.gain.value = 0.04;
      bus.connect(send);
      send.connect(conv);

      // 低音区的一击：D♭1 / D♭2（只留最沉的，D♭3 给手机喇叭一点存在感）
      [[25, 0.58], [37, 0.50], [49, 0.10]].forEach(([midi, v]) => {
        const f = hz(midi);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + 0.006);
        g.gain.exponentialRampToValueAtTime(v * 0.20, t + 0.40);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.95);
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1800;
        lp.Q.value = 0.5;
        [
          ['sine', 1, 1.00, 0],
          ['sine', 2, 0.40, 3],
          ['triangle', 1, 0.22, -6],
          ['sine', 3, 0.12, 0]
        ].forEach(([type, mult, amp, det]) => {
          const o = ac.createOscillator();
          o.type = type;
          o.frequency.value = f * mult;
          o.detune.value = det;
          const og = ac.createGain();
          og.gain.value = amp;
          o.connect(og);
          og.connect(lp);
          o.start(t);
          o.stop(t + 2.1);
        });
        lp.connect(g);
        g.connect(bus);
      });

      // 琴槌的一下
      const nb = ac.createBufferSource();
      nb.buffer = accentNoise();
      const nf = ac.createBiquadFilter();
      nf.type = 'highpass';
      nf.frequency.value = 1400;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.10, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      nb.connect(nf);
      nf.connect(ng);
      ng.connect(bus);
      nb.start(t);
      nb.stop(t + 0.08);
    },

    mute(on) {
      muted = !!on;
      if (!ac || !musicGain) return;
      musicGain.gain.setTargetAtTime(muted ? 0 : 0.55, ac.currentTime, 0.2);
    },

    get key() { return current; }
  };

  global.MUSIC = MUSIC;
})(window);
