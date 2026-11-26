/* 雾崎来信 · 像素探索版 · 引擎
 * 320×480 逻辑像素；场景 × 信外/信内；热点检视；线索 → 规则；三律；四结局。
 */
(function () {
  'use strict';

  const CT = window.CONTENT;
  const { CLUES, CLUE_TYPES, RULES, SCENES, CHOICES, ENDINGS, KEPT_NAMES, GALLERY } = CT;

  const qs = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ESC = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const canvas = qs('#scene');
  const ctx = canvas.getContext('2d');
  const stage = qs('#stage');

  // ---------------------------------------------------------------- 画布缩放
  function fit() {
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const s = Math.min(vw / 320, vh / 480);
    const w = Math.max(200, Math.min(Math.floor(320 * s), 320 * 6));
    const h = Math.round(w * 1.5);
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    document.documentElement.style.setProperty('--u', (w / 320) + 'px');
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------------------------------------------------------------- 素材
  const BG_NAMES = ['office', 'office_in', 'street', 'street_in', 'sanatorium', 'sanatorium_in',
    'washitsu', 'washitsu_in', 'apartment', 'apartment_in', 'island', 'island_in', 'title'];
  const FACE_NAMES = ['mio', 'vira', 'saya'];
  const NPC_NAMES = ['mio', 'saya', 'guitu', 'vira'];
  const IMG = {};
  let assetsReady = false;

  function loadImage(src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  async function loadAssets() {
    const bg = BG_NAMES.map((n) => loadImage('assets/bg/' + n + '.png')
      .then((im) => { IMG['bg:' + n] = im; }));
    const faces = FACE_NAMES.map((n) => loadImage('assets/card/' + n + '_face.png')
      .then((im) => { IMG['face:' + n] = im; }));
    const npcs = NPC_NAMES.map((n) => loadImage('assets/npc/' + n + '.png')
      .then((im) => { IMG['npc:' + n] = im; }));
    await Promise.all(bg.concat(faces, npcs));
    assetsReady = true;
    qs('#loading').classList.add('hidden');
    updateHud();
  }

  // ---------------------------------------------------------------- 状态
  const SAVE_KEY = 'kirizaki_pixel_save_v1';
  const DEF = () => ({
    scene: 'office', form: 'out',
    fog: 6, dev: { li: 0, wu: 0, ren: 0 },
    clues: [], rules: [], items: [], flags: {},
    read: {}, revisit: {}, visit: {}, seen: {}, lastForm: {},
    unlocked: ['office'], pos: {}, ending: null, sound: true
  });
  let S = DEF();

  const P = { x: 160, y: 440, dir: 'down', frame: 0, moving: false, tx: null, ty: null, pending: null, animT: 0 };
  let screen = 'title';        // title / play / ending
  let trans = null;            // 雾切换
  let lastT = 0;
  let particles = { rain: [], ash: [] };
  let nearHs = null;
  let selectedClue = null;
  let bagTab = 'stamp';
  let choiceState = null;

  function save() {
    try {
      const data = JSON.parse(JSON.stringify(S));
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* 存档失败不拦路 */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !d.scene || !SCENES[d.scene]) return false;
      S = Object.assign(DEF(), d);
      S.dev = Object.assign({ li: 0, wu: 0, ren: 0 }, d.dev || {});
      S.flags = d.flags || {}; S.read = d.read || {}; S.revisit = d.revisit || {};
      S.pos = d.pos || {}; S.unlocked = d.unlocked && d.unlocked.length ? d.unlocked : ['office'];
      // 旧存档：第一站选完 A 却卡在「还没读信」的，补上
      if (S.flags.A_done && !S.read.street) {
        S.read.street = true;
        S.read.street_in_shown = true;
      }
      // 旧存档修复：回访和室拿到了眼带、却因为热点重叠没拿到胡萝卜
      if (S.flags.revisit_done && S.revisit.washitsu && S.flags.F_none &&
        S.items.indexOf('眼带') >= 0 && S.items.indexOf('胡萝卜') < 0) {
        S.items.push('胡萝卜');
        S.flags._hotfix_carrot = true;
      }
      return true;
    } catch (e) { return false; }
  }

  const scene = () => SCENES[S.scene];
  const bgKey = () => 'bg:' + (S.form === 'in' ? scene().bg + '_in' : scene().bg);
  const posKey = (sc, form) => sc + ':' + (form || S.form);

  // 读信后才会开信内
  function canEnterInside(sc) {
    sc = sc || S.scene;
    if (sc === 'office') return !!S.revisit.office;
    if (sc === 'island') return !!S.read.island;
    return !!S.read[sc];
  }
  function unlocked(sc) { return S.unlocked.indexOf(sc) >= 0; }

  // ---------------------------------------------------------------- 音
  const Sound = {
    ac: null, master: null, amb: null, ambGain: null, kind: null, level: 0.12,
    init() {
      if (this.ac) {
        if (this.ac.state === 'suspended') this.ac.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ac.destination);
      if (this.ac.state === 'suspended') this.ac.resume();
      if (window.MUSIC) {
        MUSIC.init(this.ac, this.master);
        MUSIC.mute(!S.sound);
      }
      this.kind = null;
      this.setAmbi(S.scene);
    },
    noiseBuf(sec) {
      const ac = this.ac;
      const len = Math.floor(ac.sampleRate * sec);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
      return buf;
    },
    setAmbi(kind) {
      if (!this.ac || !S.sound) return;
      if (this.kind === kind) return;
      this.kind = kind;
      const ac = this.ac;
      if (this.ambGain) {
        const g = this.ambGain;
        g.gain.cancelScheduledValues(ac.currentTime);
        g.gain.setTargetAtTime(0, ac.currentTime, 0.4);
        const old = this.amb;
        setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 1800);
      }
      const g = ac.createGain();
      g.gain.value = 0;
      g.connect(this.master);
      g.gain.setTargetAtTime(0.12, ac.currentTime, 1.2);
      this.ambGain = g;
      const nodes = [];
      const src = ac.createBufferSource();
      src.buffer = this.noiseBuf(3);
      src.loop = true;
      const f = ac.createBiquadFilter();
      const cfg = {
        office: { type: 'bandpass', freq: 620, q: 0.9, lfo: 0.04, trem: { rate: 0.23, depth: 0.55 } },
        street: { type: 'bandpass', freq: 1400, q: 0.6, lfo: 0.10 },
        sanatorium: { type: 'lowpass', freq: 640, q: 0.8, lfo: 0.05, level: 0.055 },
        washitsu: { type: 'highpass', freq: 1200, q: 0.4, lfo: 0.3 },
        apartment: { type: 'lowpass', freq: 420, q: 1.1, lfo: 0.1 },
        island: { type: 'bandpass', freq: 420, q: 0.4, lfo: 0.07 }
      }[kind] || { type: 'lowpass', freq: 500, q: 0.6, lfo: 0.1 };
      f.type = cfg.type; f.frequency.value = cfg.freq; f.Q.value = cfg.q;
      const lv = cfg.level || 0.12;
      this.level = lv;
      if (lv !== 0.12) g.gain.setTargetAtTime(lv, ac.currentTime, 1.2);
      src.connect(f); f.connect(g);
      // 风扇：慢速振幅起伏（换气 / 扇叶）
      if (cfg.trem) {
        const to = ac.createOscillator();
        const tg = ac.createGain();
        to.frequency.value = cfg.trem.rate;
        tg.gain.value = lv * cfg.trem.depth;
        to.connect(tg); tg.connect(g.gain); to.start();
        nodes.push(to, tg);
      }
      // 缓慢的呼吸
      const lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = cfg.lfo;
      lg.gain.value = cfg.freq * 0.4;
      lfo.connect(lg); lg.connect(f.frequency);
      lfo.start();
      src.start();
      nodes.push(src, lfo, f, lg);
      // 低频嗡鸣
      if (kind === 'office' || kind === 'apartment' || kind === 'island') {
        const o = ac.createOscillator();
        const og = ac.createGain();
        o.type = 'sine';
        o.frequency.value = kind === 'office' ? 52 : 44;
        og.gain.value = 0.05;
        o.connect(og); og.connect(g);
        o.start();
        nodes.push(o, og);
      }
      this.amb = { disconnect: () => nodes.forEach((n) => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }) };
    },
    sfx(kind) {
      if (!this.ac || !S.sound) return;
      const ac = this.ac, t = ac.currentTime;
      const g = ac.createGain();
      g.connect(this.master);
      if (kind === 'paper') {
        const src = ac.createBufferSource(); src.buffer = this.noiseBuf(0.5);
        const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(600, t);
        f.frequency.exponentialRampToValueAtTime(3200, t + 0.22);
        src.connect(f); f.connect(g);
        g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        src.start(t); src.stop(t + 0.32);
      } else if (kind === 'stamp') {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
        o.connect(g);
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.24);
      } else if (kind === 'clue') {
        [660, 990].forEach((freq, i) => {
          const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
          const gg = ac.createGain();
          o.connect(gg); gg.connect(this.master);
          gg.gain.setValueAtTime(0.0001, t + i * 0.09);
          gg.gain.linearRampToValueAtTime(0.10, t + i * 0.09 + 0.01);
          gg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.22);
          o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.24);
        });
      } else if (kind === 'breath') {
        const src = ac.createBufferSource(); src.buffer = this.noiseBuf(1.8);
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480;
        src.connect(f); f.connect(g);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        src.start(t); src.stop(t + 1.8);
      }
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 2000);
    }
  };

  // 切后台 / 锁屏回来，音频上下文会被挂起，这里恢复
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Sound.ac && Sound.ac.state === 'suspended') Sound.ac.resume();
  });

  // ---------------------------------------------------------------- 叙述
  const N = {
    lines: [], who: '', face: '', idx: 0, chars: 0, active: false,
    after: null, lineAt: 0, doneAt: 0, full: '',
    start(lines, opt) {
      opt = opt || {};
      this.lines = (lines || []).filter(Boolean);
      this.idx = 0; this.chars = 0; this.active = true;
      this.who = opt.who || ''; this.face = opt.face || '';
      this.after = opt.after || null;
      this.lineAt = performance.now();
      this.doneAt = 0;
      if (!this.lines.length) { this.lines = ['……']; }
      renderNarration(true);
    },
    advance() {
      if (!this.active) return false;
      const cur = this.lines[this.idx] || '';
      if (this.chars < cur.length) { this.chars = cur.length; renderNarration(true); return true; }
      if (this.idx < this.lines.length - 1) {
        this.idx++; this.chars = 0; this.lineAt = performance.now(); renderNarration(true);
      } else {
        this.active = false;
        this.doneAt = performance.now();
        renderNarration(true);
        const cb = this.after; this.after = null;
        if (cb) setTimeout(cb, 220);
      }
      return true;
    },
    tick(now) {
      if (!this.active) return;
      const cur = this.lines[this.idx] || '';
      const el = (now - this.lineAt) / 1000;
      const want = Math.min(cur.length, Math.floor(el * 26));
      if (want !== this.chars) { this.chars = want; renderNarration(); }
      if (this.chars >= cur.length && (now - this.lineAt) / 1000 > cur.length / 26 + 1.7) {
        this.advance();
      }
    }
  };

  function renderNarration(force) {
    if (!N.lines.length) return;
    const say = qs('#say');
    const who = qs('#who'), face = qs('#face'), whoName = qs('#whoName');
    if (N.who) {
      who.classList.add('on');
      whoName.textContent = N.who;
      const im = N.face && IMG['face:' + N.face];
      if (im) { face.src = im.src; face.style.display = ''; } else { face.style.display = 'none'; }
    } else {
      who.classList.remove('on');
    }
    const out = [];
    // 只显示当前这一句：面板不高，堆三句会顶出去
    const from = N.idx;
    for (let i = from; i < N.idx; i++) out.push('<span class="ln">' + ESC(N.lines[i]) + '</span>');
    if (N.idx < N.lines.length) {
      const cur = N.lines[N.idx].slice(0, N.chars);
      out.push('<span class="ln cur">' + ESC(cur) + (N.active ? '<span class="caret">▌</span>' : '') + '</span>');
    }
    say.innerHTML = out.join('');
    // 长句自动滚到末尾，别把后半句切掉
    say.scrollTop = say.scrollHeight;
  }

  // ---------------------------------------------------------------- 线索 / 规则
  function syncRules() {
    const map = { stamp: 'R1', paper: 'R3', ticket: 'R2' };
    ['stamp', 'paper', 'ticket'].forEach((t) => {
      const owned = S.clues.filter((id) => CLUES[id] && CLUES[id].type === t).length;
      const rid = map[t];
      if (owned >= 3 && S.rules.indexOf(rid) < 0) {
        S.rules.push(rid);
        toast('规则合成：' + RULES[rid].name + ' —— ' + RULES[rid].text, 'rule');
        Sound.sfx('stamp');
      }
    });
  }

  function addClue(id) {
    if (!id || !CLUES[id] || S.clues.indexOf(id) >= 0) return;
    S.clues.push(id);
    const c = CLUES[id];
    toast('线索入袋 · ' + CLUE_TYPES[c.type].name + ' No.' + c.no + ' ' + c.title);
    Sound.sfx('clue');
    syncRules();
    updateHud();
    save();
  }

  function addItem(name) {
    if (!name || S.items.indexOf(name) >= 0) return;
    S.items.push(name);
    toast('带走：' + name);
    Sound.sfx('clue');
    updateHud();
    save();
  }

  function toast(text, cls) {
    const box = qs('#toast');
    const el = document.createElement('div');
    el.className = 'toast' + (cls === 'warn' ? ' warn' : '');
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = '0'; }, 2600);
    setTimeout(() => { el.remove(); }, 3200);
  }

  // ---------------------------------------------------------------- 热点
  function hotspots() {
    return scene().hotspots.filter((h) => (h.form === 'both' || h.form === S.form)
      && (!h.when || h.when(S)));
  }
  const val = (v) => (typeof v === 'function' ? v(S) : v);

  function hitTest(x, y) {
    const list = hotspots().slice().sort((a, b) =>
      ((b.priority || 0) - (a.priority || 0)) || (a.w * a.h - b.w * b.h));
    for (const h of list) {
      const pad = 8;
      if (x >= h.x - pad && x <= h.x + h.w + pad && y >= h.y - pad && y <= h.y + h.h + pad) return h;
    }
    return null;
  }

  function nearOf() {
    let best = null, bd = 1e9;
    hotspots().forEach((h) => {
      const cx = h.x + h.w / 2;
      const dx = Math.abs(P.x - cx);
      if (dx > h.w / 2 + 36) return;
      // 物件底边离脚底越远，优先级越低（时钟、窗这类要抬头看）
      const lift = Math.max(0, P.y - (h.y + h.h));
      // 同一位置叠了好几个热点时，优先选可拿的东西 / 更小的物件
      const d = dx + lift * 0.35 - (h.priority || 0) * 4;
      if (d < bd) { bd = d; best = h; }
    });
    return best;
  }

  function resolveLines(h) {
    const lines = val(h.lines);
    if (lines && lines.length) return lines;
    if (h.talk) return ['……'];
    return ['这里没什么可看的。'];
  }

  function interact(h) {
    if (!h || trans) return;
    if (screen !== 'play') return;
    if (!modal.classList.contains('hidden')) return;
    const lines = resolveLines(h);
    Sound.sfx(h.talk ? 'breath' : 'paper');
    N.start(lines, {
      who: h.talk || '', face: h.face || '',
      after: () => afterHotspot(h)
    });
    S.seen[h.id] = true;
    save();
  }
  function afterHotspot(h) {
    const clue = val(h.clue);
    if (clue) addClue(clue);
    if (h.item) addItem(h.item);
    if (h.flag) { S.flags[h.flag] = true; }
    if (h.effects) applyEffects(h.effects);
    const ch = h.choice;
    if (ch && (!h.choiceWhen || h.choiceWhen(S))) openChoice(ch);
    save();
    updateHud();
    checkProgress();
  }

  function applyEffects(e) {
    if (!e) return;
    if (e.fog) S.fog = clamp(S.fog + e.fog, 0, 100);
    if (e.flags) Object.assign(S.flags, e.flags);
    if (e.clue) addClue(e.clue);
    if (e.item) addItem(e.item);
    if (e.unlock) unlockScenes(e.unlock);
    if (e.read) S.read[e.read] = true;
    updateHud();
    save();
    if (e.form && e.form !== S.form) {
      setTimeout(() => { if (screen === 'play') switchForm(e.form); }, 500);
    }
  }

  function unlockScenes(ids) {
    (ids || []).forEach((id) => {
      if (S.unlocked.indexOf(id) >= 0) return;
      S.unlocked.push(id);
      toast('地图上多了一处：' + (SCENES[id] ? SCENES[id].name : id) + '（M）');
    });
    save();
  }

  // ---------------------------------------------------------------- 三律
  function openChoice(id) {
    const def = CHOICES[id];
    if (!def) return;
    if (choiceState && choiceState.timer) clearInterval(choiceState.timer);
    choiceState = { id, t: 15, timer: null };
    const drops = '<div class="drops"><i class="on"></i><i></i><i></i></div>';
    const opts = def.options.map((o, i) => {
      const no = o.need && S.items.indexOf(o.need) < 0;
      return '<button class="opt' + (no ? ' no' : '') + (o.trap ? ' trap' : '') + '" data-i="' + i + '">'
        + '<span class="law">' + ESC(o.law) + '</span>'
        + '<b>' + ESC(o.label) + '</b>'
        + '<i>' + (o.need ? (no ? '缺：' + ESC(o.need) + ' —— 这条路当着你关掉' : '需要：' + ESC(o.need)) : '代价：' + ESC(o.cost)) + '</i>'
        + '</button>';
    }).join('');
    sheet.innerHTML = '<div class="choice"><h3><span>三律</span>' + drops + '</h3>'
      + '<p style="font-family:var(--serif);font-size:calc(var(--u)*10);letter-spacing:.04em;line-height:1.7">'
      + ESC(def.prompt) + '</p><div class="rule"></div>' + opts
      + '<p class="hintline">限时不用数字。滴到第三滴没选，系统替你选「常理」。</p></div>';
    openModal();
    Sound.sfx('stamp');

    const dropEls = sheet.querySelectorAll('.drops i');
    choiceState.timer = setInterval(() => {
      if (!choiceState || choiceState.id !== id) return;
      choiceState.t -= 1;
      const drops = 3 - Math.ceil(choiceState.t / 5);
      dropEls.forEach((d, i) => d.classList.toggle('on', i <= Math.min(2, Math.max(0, drops))));
      if (choiceState.t <= 0) {
        clearInterval(choiceState.timer);
        const idx = def.options.findIndex((o) => o.law === '常理' && !(o.need && S.items.indexOf(o.need) < 0));
        pickOption(def.options[idx >= 0 ? idx : 0], id);
      }
    }, 1000);

    sheet.querySelectorAll('.opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const o = def.options[Number(btn.dataset.i)];
        if (o.need && S.items.indexOf(o.need) < 0) {
          toast('路不成立：你手上没有' + o.need, 'warn');
          Sound.sfx('stamp');
          return;
        }
        pickOption(o, id);
      });
    });
  }

  function pickOption(o, id) {
    if (choiceState && choiceState.timer) clearInterval(choiceState.timer);
    choiceState = null;
    closeModal();
    const r = o.run(S) || {};
    const lines = (r.lines || []).slice();
    // 第一站：处理完 4-2，就地拆开手里那封，雨开始往上落
    if (id === 'A' && S.scene === 'street') {
      lines.push('你拆开手里那封 4-2。信封有一点鼓——鼓的那封，是满的。');
      lines.push('读到最后一行的最后一个字，雨开始往上落。');
    }
    N.start(lines, {
      after: () => {
        if (r.fog) S.fog = clamp(S.fog + r.fog, 0, 100);
        if (r.dev) Object.keys(r.dev).forEach((k) => { S.dev[k] = (S.dev[k] || 0) + r.dev[k]; });
        if (r.flags) Object.assign(S.flags, r.flags);
        if (r.clue) addClue(r.clue);
        if (r.item) addItem(r.item);
        if (r.unlock) unlockScenes(r.unlock);
        S.flags['ch_' + id] = true;
        if (id === 'A' && S.scene === 'street') S.read.street = true;
        updateHud();
        save();
        if (o.trap) { checkProgress(); return; }
        // 读完这封信 → 进信内
        const readAfter = { sanatorium: 'D', washitsu: 'E', apartment: 'G', street: 'A' }[S.scene];
        if (readAfter === id && !S.read[S.scene + '_in_shown']) {
          S.read[S.scene] = true;
          S.read[S.scene + '_in_shown'] = true;
          save();
          toast('这地方的信内开了：按 F 在信外／信内之间切。');
          setTimeout(() => { if (screen === 'play') switchForm('in', true); }, 700);
        }
        checkProgress();
        if (r.ending) { setTimeout(() => showEnding(r.ending), 700); }
      }
    });
  }

  // ---------------------------------------------------------------- 进度
  function checkProgress() {
    const f = S.flags;
    if (S.unlocked.indexOf('street') >= 0 && !f._hint_map && !S.visit['street:out']) {
      f._hint_map = true;
      toast('按 M 打开地图，去白鹭町。雾已经先走了。');
    }
    // 和室 → 公寓
    if (f.F_done && S.unlocked.indexOf('apartment') < 0) {
      S.unlocked.push('apartment');
      toast('雾往湖边移动了。地图上多了一处：镜湖公寓。');
      save();
    }
    // 公寓 4-6 → 回访三选二
    if (f.H_done && !f.revisit_done && !S.flags._revisit_asked) {
      S.flags._revisit_asked = true;
      setTimeout(() => { if (screen === 'play') openRevisit(); }, 2200);
    }
    // 回访拿到两件东西 → 雾屿
    if (f.revisit_done && S.unlocked.indexOf('island') < 0) {
      const picked = ['office', 'sanatorium', 'washitsu'].filter((k) => S.revisit[k]);
      const got = picked.every((k) => (k === 'office' ? S.items.indexOf('旧存根') >= 0
        : k === 'sanatorium' ? S.items.indexOf('王冠') >= 0
          : (S.items.indexOf('眼带') >= 0 && S.items.indexOf('胡萝卜') >= 0)));
      if (got) {
        S.unlocked.push('island');
        S.read.island = true;
        toast('雾把你带到了湖边。终点站：雾屿（M）。');
        save();
        updateHud();
      } else if (!S.flags._revisit_missing) {
        S.flags._revisit_missing = true;
        toast('回访的地方还有东西没拿。地图（M）回去看看。', 'warn');
      }
    }
    updateHud();
  }

  function openRevisit() {
    const cards = [      { k: 'office', n: '死信课', d: '没人、征迁公告、两个空位', it: '旧存根', ic: 'ticket' },
      { k: 'sanatorium', n: '疗养院', d: '薇拉、最后一杯茶', it: '王冠', ic: 'crown' },
      { k: 'washitsu', n: '和室', d: '针线、缝了一半的和服', it: '眼带', ic: 'eyeband' }
    ];
    let picked = [];
    sheet.innerHTML = '<h3><span>回访</span><small>三处，只能进两处</small></h3>'
      + '<p>雾把你推回三个地方——但雾只让你进两个。第三处连同那里的东西，一起被封掉。</p>'
      + '<div class="pick">' + cards.map((c) => (
        '<button class="pcard" data-k="' + c.k + '"><canvas width="16" height="16" data-ic="' + c.ic + '"></canvas>'
        + '<b>' + c.n + '</b><i>' + c.d + '</i><i style="color:#8C2F26;margin-top:3px">' + c.it + '</i></button>'
      )).join('') + '</div>'
      + '<div class="rule"></div>'
      + '<p class="hintline">你只有两只手。带哪两件，终局就只剩哪两条路。</p>'
      + '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px">'
      + '<button class="close" id="rvGo" disabled>进这两处</button></div>';
    modalLock = true;
    openModal();
    sheet.querySelectorAll('canvas[data-ic]').forEach((cv) => {
      ART.icon(cv.getContext('2d'), cv.dataset.ic, 0, 0, 16);
    });
    const go = sheet.querySelector('#rvGo');
    sheet.querySelectorAll('.pcard').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.k;
        const i = picked.indexOf(k);
        if (i >= 0) picked.splice(i, 1); else picked.push(k);
        if (picked.length > 2) picked.shift();
        sheet.querySelectorAll('.pcard').forEach((b) => b.classList.toggle('on', picked.indexOf(b.dataset.k) >= 0));
        go.disabled = picked.length !== 2;
      });
    });
    go.addEventListener('click', () => {
      S.flags.revisit_done = true;
      picked.forEach((k) => {
        S.revisit[k] = true;
        S.unlocked.push(k);
        S.read[k] = true;
      });
      save();
      modalLock = false;
      closeModal();
      toast('第三处已经在你转身的时候封了。');
      goTo(picked[0], 'in');
    });
  }

  // ---------------------------------------------------------------- 弹窗
  const modal = qs('#modal');
  const sheet = qs('#sheet');
  let modalLock = false;
  function openModal(dark) {
    modal.classList.remove('hidden');
    sheet.classList.toggle('dark', !!dark);
  }
  function closeModal() {
    if (modalLock) return;
    if (choiceState && choiceState.timer) { clearInterval(choiceState.timer); choiceState = null; }
    modal.classList.add('hidden');
    sheet.innerHTML = '';
  }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  function clueCardHTML(id) {
    const c = CLUES[id];
    return '<div class="clue" data-id="' + id + '"><span>' + CLUE_TYPES[c.type].name + ' No.' + c.no + '</span>'
      + '<b>' + ESC(c.title) + '</b><span class="stampmark"></span></div>';
  }

  function openBag(tab) {
    bagTab = tab || bagTab;
    if (selectedClue && (!CLUES[selectedClue] || CLUES[selectedClue].type !== bagTab)) selectedClue = null;
    const types = ['stamp', 'paper', 'ticket'];
    const list = S.clues.filter((id) => CLUES[id].type === bagTab);
    const all = [];
    for (let i = 0; i < 3; i++) {
      const id = list[i];
      all.push(id ? clueCardHTML(id) : '<div class="clue locked"><span>' + CLUE_TYPES[bagTab].name + ' No.0' + (i + 1) + '</span><b>未收集</b></div>');
    }
    const detail = selectedClue && CLUES[selectedClue]
      ? '<div class="detail"><h4>' + ESC(CLUES[selectedClue].title) + '</h4><p>' + ESC(CLUES[selectedClue].text)
      + '</p><div class="note">' + ESC(CLUES[selectedClue].note) + '</div></div>'
      : '<div class="detail"><p class="hintline">' + CLUE_TYPES[bagTab].hint + '　点一张看细节。</p></div>';
    sheet.innerHTML = '<div class="sheet-head"><h3><span>信袋</span><small>' + S.clues.length + ' / 9</small></h3></div>'
      + '<div class="tabs">' + types.map((t) => '<button class="' + (t === bagTab ? 'on' : '') + '" data-tab="' + t + '">'
        + CLUE_TYPES[t].name + ' ' + S.clues.filter((id) => CLUES[id].type === t).length + '/3</button>').join('') + '</div>'
      + '<div class="cluegrid">' + all.join('') + '</div>' + detail
      + '<div class="rule"></div><p class="hintline">三张同类线索，自动合成一条规则，写进笔记。</p>'
      + '<div style="text-align:right;margin-top:6px"><button class="close" data-close>合上</button></div>';
    openModal(false);
    sheet.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => openBag(b.dataset.tab)));
    sheet.querySelectorAll('.clue[data-id]').forEach((c) => c.addEventListener('click', () => {
      selectedClue = c.dataset.id; openBag(bagTab);
    }));
    bindClose();
  }

  function openNote() {
    const rank = CT.RANK[Math.min(2, Math.floor(Math.max(S.dev.li, S.dev.wu, S.dev.ren) / 3))];
    const rules = S.rules.length
      ? S.rules.map((id) => {
        const r = RULES[id];
        return '<div class="rulecard"><b>' + r.id + ' ' + r.name + '</b><em>' + CLUE_TYPES[r.type].name + '</em>'
          + '<p>' + ESC(r.text) + '</p><p class="sub">' + ESC(r.sub) + '</p></div>';
      }).join('')
      : '<p class="hintline">还没有合成任何规则。三张同类线索会自动拼出一条。</p>';
    const dev = [['li', '常理'], ['wu', '雾理'], ['ren', '人情']].map(([k, n]) => {
      const v = S.dev[k] || 0;
      return '<div class="devrow"><b>' + n + '</b><div class="bar"><i style="width:' + Math.min(100, v * 12) + '%"></i></div>'
        + '<span>' + v + '</span></div>';
    }).join('');
    sheet.innerHTML = '<h3><span>笔记</span><small>' + (S.ending ? '已结束' : '进行中') + '</small></h3>'
      + '<p class="hintline">灰雾现在：' + rank + '</p>'
      + dev
      + '<div class="rule"></div>'
      + rules
      + '<div class="rule"></div><p class="hintline">带在身上的东西</p>'
      + '<div class="itemlist">' + (S.items.length ? S.items.map((i) => '<span>' + ESC(i) + '</span>').join('')
        : '<span class="empty">还什么都没带</span>') + '</div>'
      + '<div class="rule"></div><p class="hintline">六处场景 · 十二种样子。走过的地方能在地图上重进。</p>'
      + '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px">'
      + '<button class="close" data-gal>卡面</button><button class="close" data-close>合上</button></div>';
    openModal(false);
    bindClose();
    sheet.querySelector('[data-gal]').addEventListener('click', openGallery);
  }

  function openMap() {
    const order = ['office', 'street', 'sanatorium', 'washitsu', 'apartment', 'island'];
    const rows = order.map((id, i) => {
      const sc = SCENES[id];
      const ok = unlocked(id);
      const here = S.scene === id;
      const formTag = ok ? (canEnterInside(id) ? '可切信内' : '信外') : '未解锁';
      return '<button class="maprow' + (ok ? '' : ' lock') + (here ? ' here' : '') + '" data-sc="' + id + '"' + (ok ? '' : ' disabled') + '>'
        + '<span class="idx">' + ['一', '二', '三', '四', '五', '终'][i] + '</span>'
        + '<span><b>' + sc.name + '</b><i>' + sc.sub + '</i></span>'
        + '<span class="tag">' + formTag + '</span></button>';
    }).join('');
    sheet.innerHTML = '<h3><span>地图</span><small>六个地方</small></h3>'
      + '<div class="maplist">' + rows + '</div>'
      + '<div class="rule"></div>'
      + '<p class="hintline">前四站要按投递段走；走过之后，路就松了，可以来回。</p>'
      + '<div style="display:flex;gap:6px;justify-content:space-between;margin-top:8px">'
      + '<button class="close" id="sndBtn">音：' + (S.sound ? '开' : '关') + '</button>'
      + '<span style="display:flex;gap:6px"><button class="close" id="helpBtn">操作</button>'
      + '<button class="close" id="rstBtn">重开</button>'
      + '<button class="close" data-close>合上</button></span></div>';
    openModal(true);
    sheet.querySelector('#helpBtn').addEventListener('click', openHelp);
    sheet.querySelectorAll('.maprow').forEach((b) => b.addEventListener('click', () => {
      if (!b.dataset.sc) return;
      const id = b.dataset.sc;
      closeModal();
      if (id === S.scene) return;
      const f = (S.revisit[id] || (canEnterInside(id) && S.lastForm[id] === 'in')) ? 'in' : 'out';
      goTo(id, f);
    }));
    sheet.querySelector('#sndBtn').addEventListener('click', (e) => {
      S.sound = !S.sound;
      e.target.textContent = '音：' + (S.sound ? '开' : '关');
      if (Sound.ac) {
        if (!S.sound && Sound.ambGain) Sound.ambGain.gain.setTargetAtTime(0, Sound.ac.currentTime, 0.2);
        else if (S.sound) {
          if (Sound.ambGain) Sound.ambGain.gain.setTargetAtTime(Sound.level || 0.12, Sound.ac.currentTime, 0.4);
          else Sound.setAmbi(S.scene);
        }
        if (window.MUSIC) MUSIC.mute(!S.sound);
      }
      save();
    });
    sheet.querySelector('#rstBtn').addEventListener('click', () => {
      if (!confirm('重开一趟？这一趟的线索、带的东西，都会没。')) return;
      resetGame();
      closeModal();
    });
    bindClose();
  }

  function openGallery() {
    sheet.innerHTML = '<h3><span>记录卡面</span><small>三位锚 · 像素稿</small></h3>'
      + '<div class="gal">' + GALLERY.map((g) => (
        '<div class="gcard"><img src="assets/card/' + g.img + '.png" alt="">'
        + '<span class="tag">' + g.tag + '</span>'
        + '<span class="cap"><b>' + g.k + ' · ' + ESC(g.name) + '</b><i>' + ESC(g.line) + '</i></span></div>'
      )).join('') + '</div>'
      + '<div class="rule"></div><p class="hintline">素材来自 AI生成物：角色卡面、像素交互稿。底图由场景概念图转像素。</p>'
      + '<div style="text-align:right;margin-top:6px"><button class="close" data-close>合上</button></div>';
    openModal(true);
    bindClose();
  }

  function openHelp() {
    sheet.innerHTML = '<h3><span>怎么玩</span><small>一个拇指</small></h3>'
      + '<p><b>走</b>　点地面，或 WASD / 方向键；Shift 跑。</p>'
      + '<p><b>调查</b>　点物件，或走近后按 E。头顶冒「！」就是能看的东西。</p>'
      + '<p><b>信袋</b>　Q。三张同类线索自动合成一条规则。</p>'
      + '<p><b>笔记</b>　R。看规则、带的东西、三律倾向。</p>'
      + '<p><b>地图</b>　M。去过的地方可以重进。</p>'
      + '<p><b>雾</b>　F。读完一个地方的信，那地方就能在信外／信内之间切。</p>'
      + '<div class="rule"></div>'
      + '<p class="hintline">没有 Game Over。选错的惩罚是世界被改写。信外的钟停在 5:40，信内的钟倒着走。</p>'
      + '<div style="text-align:right;margin-top:6px"><button class="close" data-close>知道了</button></div>';
    openModal(false);
    bindClose();
  }

  function bindClose() {
    sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  }

  // ---------------------------------------------------------------- 场景切换
  function goTo(id, form) {
    if (!SCENES[id]) return;
    if (!unlocked(id)) { toast('雾还没把你带到那里。', 'warn'); return; }
    trans = { p: 0, dur: 900, to: id, toForm: form || 'out', applied: false };
    P.pending = null; P.tx = P.ty = null; P.moving = false;
    closeModal();
  }

  function switchForm(form, auto) {
    if (form === S.form) return;
    if (form === 'in' && !canEnterInside()) {
      if (!auto) toast('这里的信还没读完。', 'warn');
      return;
    }
    trans = { p: 0, dur: 800, to: S.scene, toForm: form, applied: false };
    P.pending = null; P.tx = P.ty = null; P.moving = false;
  }

  function applyScene() {
    const sc = SCENES[S.scene];
    const key = posKey(S.scene, S.form);
    const pos = S.pos[key];
    if (pos) { P.x = pos[0]; P.y = pos[1]; }
    else {
      P.x = (sc.walk[0] + sc.walk[1]) / 2;
      P.y = sc.walk[3] - 8;
    }
    P.dir = 'down';
    spawnParticles();
    updateHud();
    S.lastForm[S.scene] = S.form;
    Sound.setAmbi(S.scene);
    if (window.MUSIC) {
      MUSIC.set(S.scene === 'washitsu' ? 'k397'
        : S.scene === 'sanatorium' ? 'swan'
          : S.scene === 'island' ? 'island' : null);
      // 第一次切进红色信内：一记重音，雨声不断
      if (S.scene === 'street' && S.form === 'in' && !S.flags.sting_street) {
        S.flags.sting_street = true;
        MUSIC.accent();
        save();
      }
    }
    // 首次进入的叙述
    if (!S.visit[key]) {
      S.visit[key] = true;
      save();
      const lines = (sc.intro && (S.form === 'in' ? sc.intro.in : sc.intro.out)) || [];
      if (lines.length) {
        setTimeout(() => {
          if (screen === 'play') N.start(lines, {});
        }, 260);
      }
    }
  }

  function spawnParticles() {
    particles = { rain: [], ash: [] };
    const rnd = Math.random;
    if (S.scene === 'street' || S.scene === 'island') {
      for (let i = 0; i < 70; i++) {
        particles.rain.push({ x: rnd() * 320, y: rnd() * 480, s: 60 + rnd() * 90 });
      }
    }
    if (S.form === 'in' || S.scene === 'island') {
      for (let i = 0; i < 90; i++) {
        particles.ash.push({ x: rnd() * 320, y: rnd() * 480, vx: (rnd() - 0.5) * 6, vy: -4 - rnd() * 10 });
      }
    }
  }

  // ---------------------------------------------------------------- HUD
  let clockBase = 0;
  function currentHint() {
    const f = S.flags, sc = S.scene;
    if (sc === 'office') {
      if (S.revisit.office && S.items.indexOf('旧存根') < 0) return '回访：柜台上还有旧存根';
      if (!f.ch_O) return '先看右边那只旧邮袋';
      return S.unlocked.indexOf('island') >= 0 ? '地图（M）→ 雾屿' : '地图（M）→ 白鹭町';
    }
    if (sc === 'street') {
      if (!f.A_done) return '药局门口的信箱，还有橱窗玻璃上那封湿信';
      if (!S.read.street) return '按 F，走到信内';
      if (S.form === 'in' && !f.B_done) return '水面上站着一个没有倒影的人';
      return '地图（M）→ 白蔷薇疗养院';
    }
    if (sc === 'sanatorium') {
      if (S.revisit.sanatorium && S.items.indexOf('王冠') < 0) return '回访：杯垫上还有王冠';
      if (!f.C_done) return '和窗边的病人说话';
      if (!S.read.sanatorium) return '住院簿上被剪掉的那一页';
      if (!f.D_done) return '水里那本住院簿，还没处理';
      return S.unlocked.indexOf('island') >= 0 ? '地图（M）→ 雾屿' : '地图（M）→ 和室';
    }
    if (sc === 'washitsu') {
      if (S.revisit.washitsu) {
        if (S.items.indexOf('眼带') < 0 || S.items.indexOf('胡萝卜') < 0) return '榻榻米上还有眼带和胡萝卜';
        return S.unlocked.indexOf('island') >= 0 ? '地图（M）→ 雾屿' : '地图（M）→ 另一处回访';
      }
      if (!f.E_done) return '和服袖子里缝着一封信';
      if (!f.F_done) return '再和她说一次话';
      return '地图（M）→ 镜湖公寓';
    }
    if (sc === 'apartment') {
      if (!f.G_done) return '门垫上那封信';
      if (!f.H_done) return '剥落墙皮后面那面名字墙';
      if (!f.revisit_done) return '雾只让你回两处：地图（M）';
      return '地图（M）→ 雾屿';
    }
    if (sc === 'island') {
      if (S.form === 'out') return '按 F，走到雾的背面';
      return '柜台后面那只空信封';
    }
    return '';
  }

  function updateHud() {
    const sc = scene();
    qs('#place').textContent = sc.name;
    qs('#sub').textContent = sc.sub;
    qs('#bagCount').textContent = S.clues.length + '/9';
    qs('#fogbar').firstElementChild.style.width = clamp(S.fog, 3, 100) + '%';
    const clk = qs('#clock');
    clk.classList.toggle('in', S.form === 'in');
    const hint = currentHint();
    qs('#hint').innerHTML = hint ? '<b>下一步</b>　' + ESC(hint) : '';
    redrawIcons();
    const fb = qs('#formBtn');
    const can = canEnterInside();
    fb.classList.toggle('off', !can);
    fb.classList.toggle('pulse', can && S.form === 'out');
  }

  function redrawIcons() {
    document.querySelectorAll('canvas[data-icon]').forEach((cv) => {
      const g = cv.getContext('2d');
      g.clearRect(0, 0, 16, 16);
      ART.icon(g, cv.dataset.icon, 0, 0, 16);
    });
  }

  function updateClock(now) {
    const clk = qs('#clock');
    if (S.form === 'in') {
      const sec = Math.floor(now / 1000) % 60;
      const mm = 40 - Math.floor(now / 60000) % 40;
      clk.textContent = '5:' + String(mm < 0 ? mm + 60 : mm).padStart(2, '0');
    } else {
      clk.textContent = '5:40';
    }
  }

  // ---------------------------------------------------------------- 主循环
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0);
    lastT = now;
    if (screen === 'play') {
      update(dt, now);
      draw(now);
      N.tick(now);
      updateClock(now);
    } else if (screen === 'title') {
      drawTitle(now);
    }
    requestAnimationFrame(loop);
  }

  function drawTitle(now) {
    ctx.imageSmoothingEnabled = false;
    const bg = IMG['bg:title'];
    if (bg) ctx.drawImage(bg, 0, 0, 320, 480);
    const g = ctx.createLinearGradient(0, 0, 0, 480);
    g.addColorStop(0, 'rgba(4,6,10,.35)');
    g.addColorStop(1, 'rgba(4,6,10,.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 480);
    ART.fog(ctx, now, 60, 'out', 10);
  }

  function update(dt, now) {
    if (trans) {
      trans.p += dt * 1000 / trans.dur;
      if (!trans.applied && trans.p >= 0.55) {
        trans.applied = true;
        S.scene = trans.to;
        S.form = trans.toForm;
        applyScene();
      }
      if (trans.p >= 1) { trans = null; }
      return;
    }
    if (!modal.classList.contains('hidden')) { nearHs = nearOf(); updatePrompt(); return; }
    // 键盘移动
    const k = keys;
    let vx = 0, vy = 0;
    if (k['a'] || k['arrowleft']) vx -= 1;
    if (k['d'] || k['arrowright']) vx += 1;
    if (k['w'] || k['arrowup']) vy -= 1;
    if (k['s'] || k['arrowdown']) vy += 1;
    if (vx || vy) {
      P.tx = P.ty = null; P.pending = null;
      const sp = (k['shift'] ? 88 : 56) * dt;
      const len = Math.hypot(vx, vy) || 1;
      P.x += vx / len * sp;
      P.y += vy / len * sp;
      P.moving = true;
      P.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
    } else if (P.tx != null) {
      const dx = P.tx - P.x, dy = P.ty - P.y;
      const d = Math.hypot(dx, dy);
      const sp = 58 * dt;
      if (d <= sp) {
        P.x = P.tx; P.y = P.ty; P.tx = P.ty = null;
        P.moving = false;
        if (P.pending) {
          const h = P.pending; P.pending = null;
          setTimeout(() => interact(h), 60);
        }
      } else {
        P.x += dx / d * sp; P.y += dy / d * sp;
        P.moving = true;
        P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
    } else {
      P.moving = false;
    }
    // 边界
    const w = scene().walk;
    P.x = clamp(P.x, w[0], w[1]);
    P.y = clamp(P.y, w[2], w[3]);
    if (P.moving) {
      P.animT += dt;
      P.frame = Math.floor(P.animT * 8) % 4;
    } else {
      P.animT = 0; P.frame = 0;
    }
    // 粒子
    const rise = S.form === 'in';
    particles.rain.forEach((d) => {
      d.y += d.s * dt * (rise ? -1 : 1);
      if (rise ? d.y < -6 : d.y > 486) {
        d.y = rise ? 486 : -6;
        d.x = Math.random() * 320;
      }
    });
    particles.ash.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y < -4) { p.y = 484; p.x = Math.random() * 320; }
      if (p.x < -4) p.x = 324; else if (p.x > 324) p.x = -4;
    });
    // 存位置
    S.pos[posKey()] = [Math.round(P.x), Math.round(P.y)];
    nearHs = nearOf();
    updatePrompt();
  }

  let promptEl = null;
  function updatePrompt() {
    if (!promptEl) {
      promptEl = document.createElement('div');
      promptEl.id = 'prompt';
      promptEl.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);'
        + 'bottom:calc(var(--u)*114);z-index:10;background:rgba(246,240,226,.94);color:#221C16;'
        + 'border:1px solid #8B7C63;padding:calc(var(--u)*2) calc(var(--u)*7);'
        + 'font-size:calc(var(--u)*7.4);letter-spacing:.06em;pointer-events:none;'
        + 'box-shadow:0 2px 0 rgba(0,0,0,.4);transition:opacity .2s';
      stage.appendChild(promptEl);
    }
    if (N.active) { promptEl.style.opacity = '0'; return; }
    const canLook = nearHs && !trans;
    promptEl.style.opacity = canLook ? '1' : '0';
    if (canLook) promptEl.textContent = '！ ' + nearHs.name + (nearHs.talk ? '　对话' : '　调查');
    const lb = qs('#acts button[data-act="look"]');
    lb.classList.toggle('pulse', !!canLook);
  }

  // ---------------------------------------------------------------- NPC / 道具
  const NPC_SKIN = {
    vira: {
      hair: '#C9A227', hair2: '#E9D9C6', dress: '#1B2430', dress2: '#253347',
      trim: '#E9D9C6', style: 'long', ears: true, crown: true, skin: '#E9D9C6'
    },
    saya: {
      hair: '#E9EEF0', hair2: '#A2B6C2', dress: '#1A0E10', dress2: '#5C1A2A',
      trim: '#8C2F26', style: 'twin', band: true, carrot: true, skin: '#C87A5E'
    },
    guitu: {
      hair: '#E9EEF0', hair2: '#C9D6DC', dress: '#1A0E10', dress2: '#33171C',
      trim: '#5C1A2A', style: 'long', skin: '#C87A5E'
    }
  };
  const NPC_AT = {
    'street:out': { img: 'mio', x: 178, y: 362 },
    'street:in': { img: 'guitu', x: 162, y: 358, ghost: true, noshadow: true },
    'sanatorium:out': { img: 'vira', x: 182, y: 362 },
    'sanatorium:in': { img: 'vira', x: 182, y: 362, ghost: true },
    'washitsu:out': { img: 'saya', x: 208, y: 366 },
    'washitsu:in': { img: 'saya', x: 208, y: 366, ghost: true },
    'island:out': { img: 'guitu', x: 160, y: 352 }
  };

  function drawNpc(now) {
    // 回访的和室已经空了，别再画跪坐的纱夜
    if (S.scene === 'washitsu' && S.revisit.washitsu) return;
    const at = NPC_AT[S.scene + ':' + S.form];
    if (!at) return;
    ctx.globalAlpha = at.ghost ? 0.86 : 1;
    if (at.img) {
      ART.npcImage(ctx, IMG['npc:' + at.img], at.x, at.y, now);
    } else {
      const o = Object.assign({}, NPC_SKIN[at.chibi], {
        kneel: at.kneel, seed: at.x, back: at.back,
        lantern: at.lantern, noshadow: at.noshadow
      });
      ART.chibi(ctx, at.x, at.y, now, o);
    }
    ctx.globalAlpha = 1;
  }

  function drawProps() {
    if (S.scene === 'street' && S.form === 'out') ART.prop(ctx, 'mailbox', 88, 344);
    if (S.scene === 'sanatorium' && S.form === 'out') ART.prop(ctx, 'page', 266, 352);
    if (S.scene === 'apartment' && S.form === 'out') {
      ART.prop(ctx, 'mat', 12, 358);
      ART.prop(ctx, 'letter', 34, 348);
    }
  }

  function draw(now) {
    ctx.imageSmoothingEnabled = false;
    const bg = IMG[bgKey()];
    if (bg) ctx.drawImage(bg, 0, 0, 320, 480);
    else { ctx.fillStyle = '#0B1018'; ctx.fillRect(0, 0, 320, 480); }
    // 呼吸：雾的浓度随节律轻微起伏
    const breath = Math.sin(now / 1000 * (Math.PI * 2 / 7));
    const amount = clamp(S.fog + breath * 7, 0, 100);
    ART.fog(ctx, now, amount, S.form);
    if (particles.rain.length) ART.rain(ctx, particles.rain, S.form);
    if (particles.ash.length) ART.ash(ctx, particles.ash);
    drawProps();
    drawNpc(now);
    // 玩家
    const opt = { moving: P.moving };
    ART.player(ctx, P.x, P.y, P.dir, P.frame, S.form, opt);
    // 热点标记：没看过的一律冒「！」，看过的小点
    if (!trans) {
      hotspots().forEach((h) => {
        const active = nearHs && nearHs.id === h.id;
        ART.marker(ctx, h.x, h.y, h.w, h.h, now, active, !!S.seen[h.id]);
      });
    }
    // 切换的雾
    if (trans) {
      const p = trans.p < 0.55 ? trans.p / 0.55 : (1 - trans.p) / 0.45;
      ART.fogWipe(ctx, clamp(p, 0, 1), S.form);
    }
  }

  // ---------------------------------------------------------------- 输入
  const keys = {};
  let pointerDown = null;

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * 320,
      y: (e.clientY - r.top) / r.height * 480
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (screen !== 'play') return;
    Sound.init();
    if (N.active) { N.advance(); return; }
    if (!modal.classList.contains('hidden')) return;
    const p = canvasPos(e);
    pointerDown = p;
    const h = hitTest(p.x, p.y);
    if (h) {
      if (nearHs && nearHs.id === h.id) { interact(h); return; }
      walkTo(h, true);
    } else {
      walkToPoint(p.x, p.y);
    }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function walkToPoint(x, y) {
    const w = scene().walk;
    P.tx = clamp(x, w[0], w[1]);
    P.ty = clamp(y, w[2], w[3]);
    P.pending = null;
  }
  function walkTo(h, then) {
    const w = scene().walk;
    const cx = h.x + h.w / 2;
    P.tx = clamp(cx, w[0], w[1]);
    P.ty = clamp(h.y + h.h + 12, w[2], w[3]);
    P.pending = then ? h : null;
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'shift') keys['shift'] = true;
    if (screen === 'title') {
      if (k === 'enter' || k === ' ') startGame(false);
      return;
    }
    if (screen === 'ending') return;
    if (k === 'escape') { if (!modal.classList.contains('hidden')) closeModal(); return; }
    if (k === 'e' || k === ' ' || k === 'enter') {
      e.preventDefault();
      Sound.init();
      if (N.active) { N.advance(); return; }
      if (!modal.classList.contains('hidden')) return;
      if (nearHs) interact(nearHs);
      return;
    }
    if (!modal.classList.contains('hidden')) return;
    if (k === 'q') openBag();
    else if (k === 'r') openNote();
    else if (k === 'm') openMap();
    else if (k === 'f') { if (canEnterInside()) switchForm(S.form === 'out' ? 'in' : 'out'); else toast('这里的信还没读完。', 'warn'); }
    else if (k === 'g') openGallery();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  qs('#acts').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    Sound.init();
    if (N.active) { N.advance(); return; }
    const act = b.dataset.act;
    if (act === 'look') {
      if (nearHs) interact(nearHs);
      else toast('走近一点，或者直接点物件。');
    } else if (act === 'bag') openBag();
    else if (act === 'note') openNote();
    else if (act === 'map') openMap();
    else if (act === 'form') {
      if (!canEnterInside()) { toast('这个场景的信还没读完。', 'warn'); return; }
      switchForm(S.form === 'out' ? 'in' : 'out');
    }
  });
  qs('#bagBtn').addEventListener('click', (e) => { e.stopPropagation(); Sound.init(); openBag(); });
  qs('#homeBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    save();
    location.href = '../index.html';
  });
  qs('#say').addEventListener('pointerdown', () => { if (N.active) N.advance(); });

  // ---------------------------------------------------------------- 标题 / 结局
  function startGame(cont) {
    Sound.init();
    if (cont && load()) {
      // 继续
      if (S.flags._hotfix_carrot) {
        setTimeout(() => {
          toast('补发：胡萝卜（回访热点修复）', 'warn');
          delete S.flags._hotfix_carrot;
          save();
        }, 1200);
      }
    } else {
      S = DEF();
      localStorage.removeItem(SAVE_KEY);
      S.visit = {};
    }
    screen = 'play';
    qs('#title').classList.add('hidden');
    qs('#ending').classList.add('hidden');
    if (!S.pos[posKey()]) {
      P.x = (scene().walk[0] + scene().walk[1]) / 2;
      P.y = scene().walk[3] - 8;
    }
    applyScene();
    updateHud();
    if (!S.visit['_started']) {
      S.visit['_started'] = true;
      save();
      setTimeout(() => {
        if (screen === 'play') toast('点地面走动 · 走近物件按 E，或直接点它 · M 看地图');
      }, 1200);
    }
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    S = DEF();
    screen = 'play';
    qs('#ending').classList.add('hidden');
    qs('#title').classList.add('hidden');
    P.x = 160; P.y = 440; P.tx = P.ty = null; P.pending = null;
    applyScene();
    updateHud();
    toast('重新领件。');
  }

  function keptName() {
    const order = ['A_ren', 'B_ask', 'C_age', 'D_fill', 'E_read', 'F_none', 'H_touch', 'A_li'];
    for (const k of order) if (S.flags[k] && KEPT_NAMES[k]) return KEPT_NAMES[k];
    return null;
  }

  function showEnding(key) {
    const e = ENDINGS[key];
    if (!e) return;
    S.ending = key;
    save();
    screen = 'ending';
    N.active = false;
    qs('#endTag').textContent = e.tag + ' · ' + key.toUpperCase();
    qs('#endTitle').textContent = e.title;
    let body = e.lines.map((l) => '<p>' + ESC(l) + '</p>').join('');
    if (S.items.indexOf('旧存根') >= 0) {
      const nm = keptName();
      body += '<p class="keep">' + (nm
        ? '旧存根上还留着一个名字：' + nm + '。整座城都被封上的时候，这个名字没被忘掉。'
        : '旧存根上留着一个名字，但墨已经晕开了，认不出来。') + '</p>';
    }
    qs('#endBody').innerHTML = body;
    qs('#ending').classList.remove('hidden');
    Sound.sfx('breath');
  }

  qs('#title').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const t = b.dataset.t;
    if (t === 'new') startGame(false);
    else if (t === 'continue') startGame(true);
    else if (t === 'gallery') openGallery();
    else if (t === 'help') openHelp();
  });
  qs('#ending').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.e === 'again') {
      qs('#ending').classList.add('hidden');
      resetGame();
    } else if (b.dataset.e === 'roam') {
      qs('#ending').classList.add('hidden');
      screen = 'play';
      S.ending = null;
      save();
    }
  });

  // ---------------------------------------------------------------- 启动
  function boot() {
    const params = new URLSearchParams(location.search);
    if (params.get('fresh')) localStorage.removeItem(SAVE_KEY);
    loadAssets();
    // 标题上的按钮禁用状态
    const contBtn = qs('#title button[data-t="continue"]');
    if (contBtn && !localStorage.getItem(SAVE_KEY)) contBtn.disabled = true;
    requestAnimationFrame(loop);

    if (params.get('scene') && SCENES[params.get('scene')]) {
      S = DEF();
      S.scene = params.get('scene');
      S.form = params.get('form') === 'in' ? 'in' : 'out';
      S.unlocked = ['office', 'street', 'sanatorium', 'washitsu', 'apartment', 'island'];
      ['street', 'sanatorium', 'washitsu', 'apartment', 'island'].forEach((k) => { S.read[k] = true; });
      if (params.get('revisit')) {
        const rv = params.get('revisit');
        S.revisit = rv === '1'
          ? { office: 1, sanatorium: 1 }
          : rv.split(',').reduce((o, k) => { o[k] = 1; return o; }, {});
      }
      if (params.get('clues')) S.clues = Object.keys(CLUES).slice(0, 9);
      if (params.get('f_none')) S.flags.F_none = true;
      S.visit = {};
      screen = 'play';
      qs('#title').classList.add('hidden');
      setTimeout(() => { applyScene(); updateHud(); }, 900);
    }
  }
  // ---------------------------------------------------------------- 调试口
  window.__KIRIZAKI__ = {
    get S() { return S; }, P, N, IMG,
    goTo, switchForm, interact, hotspots, nearOf, hitTest, scene,
    openChoice, pickOption, openBag, openNote, openMap, openGallery, openRevisit, openHelp,
    startGame, resetGame, showEnding, applyScene, updateHud,
    get screen() { return screen; },
    step(ms) { update((ms || 16) / 1000, performance.now()); draw(performance.now()); }
  };

  boot();
})();
