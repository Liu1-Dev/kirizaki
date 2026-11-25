/* 《雾崎来信》AVG 引擎 —— 无依赖，双击 index.html 就能跑。
 * 剧本在 story.js，这里是解释器 + 界面。
 *
 * v3（三章版）新增：
 *   - 双立绘槽：show 支持 pos:'left/center/right'，fx 支持 'water'/'ghost'（白轮廓）
 *   - filter 指令：'in'＝信内去色滤镜，'none'＝还原
 *   - if 指令：变量相等跳转（跨章因果）
 *   - sfx / amb_* 指令：接 audio.js（WebAudio 合成，无音频文件）
 *   - autosave 指令：章节自动存档（0 号槽），读档面板含章节行
 *   - say 支持 style:'letter'（信纸体）与 speed（毫秒/字）
 *   - choice 选项支持 ifk/ifv（满足才显示）与 unlessk/unlessv（满足则隐藏）
 *   - 存档键 kirizaki_save_v2_（三章剧本行号与旧版不兼容，旧存档作废）
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var SCRIPT = window.KIRIZAKI_SCRIPT || [];
  var LABELS = {};
  (function () {
    for (var i = 0; i < SCRIPT.length; i++) {
      if (SCRIPT[i].t === 'label') LABELS[SCRIPT[i].v] = i;
    }
  })();

  var LAW_COLOR = {
    '常理': '#8E9BA5', '雾理': '#6FD3D8', '人情': '#E2603C',
    '判断': '#C8A24A', '？': '#8E9BA5', '空白': '#F6F0E2'
  };
  var SAVE_KEY = 'kirizaki_save_v2_';
  var AUDIO = window.AVG_AUDIO || null;

  var S = {
    ptr: 0, vars: {}, history: [], fog: 18,
    bgName: '', filter: 'none',
    charA: null, charB: null, charC: null,
    clues: [], rules: [],
    typing: false, typeTimer: null, fullText: '',
    auto: false, skip: false, speed: 26,
    pendingGo: null, lastSay: -1,
    started: false, ended: false,
    autoTimer: null, choiceTimer: null, choiceLeft: 3, choiceNodes: null, choiceOpts: null,
    choiceTimed: true, choicePaused: false,
    cardOpen: false, cardTimer: null, stampOpen: false, stampTimer: null,
    panel: null
  };
  var frontA = true;

  /* ---------------------------------------------------------- 视觉 */
  function setFog(v) {
    v = Math.round(v);
    S.fog = Math.max(0, Math.min(100, v));
    $('fogfill').style.width = S.fog + '%';
    $('fogpct').textContent = S.fog + '%';
    $('fogfill').style.background = S.fog > 65
      ? 'linear-gradient(90deg,#8C3A2E,#E2603C)'
      : 'linear-gradient(90deg,#55636F,#C8D0D4)';
  }

  function setFilter(mode) {
    S.filter = (mode === 'in') ? 'in' : 'none';
    applyFilter();
  }

  function applyFilter() {
    var on = S.filter === 'in';
    $('bgA').classList.toggle('fin', on);
    $('bgB').classList.toggle('fin', on);
    var stage = $('stage');
    if (stage) stage.classList.toggle('inner', on);
  }

  function setBg(name, fx) {
    if (!name || name === S.bgName) return;
    var img = 'url("../assets/avg/bg/' + name + '.jpg")';
    var cur = frontA ? $('bgA') : $('bgB');
    var nxt = frontA ? $('bgB') : $('bgA');
    nxt.style.backgroundImage = img;
    nxt.classList.toggle('fin', S.filter === 'in');
    S.bgName = name;
    frontA = !frontA;

    if (fx === 'cut') {
      cur.classList.remove('on');
      nxt.classList.add('on');
      return;
    }
    // 雾从画面下缘涨上来，淹到腰线时换底图，再退潮
    var veil = $('veil');
    veil.classList.add('rise');
    setTimeout(function () { nxt.classList.add('on'); }, 760);
    setTimeout(function () {
      cur.classList.remove('on');
      veil.classList.remove('rise');
    }, 1500);
  }

  /* ---------------------------------------------------------- 立绘（双槽） */
  function applyFx(el, fxStr) {
    el.classList.remove('water', 'ghost');
    var fxs = (fxStr || '').split(/\s+/);
    for (var i = 0; i < fxs.length; i++) {
      if (fxs[i] === 'water' || fxs[i] === 'ghost') el.classList.add(fxs[i]);
    }
  }

  function showChar(n) {
    var pos = n.pos || 'center';
    var el = (pos === 'left') ? $('char2') : (pos === 'right') ? $('char3') : $('char');
    var st = { name: n.v, pos: pos, fx: n.fx || '' };
    el.style.backgroundImage = 'url("../assets/avg/char/' + n.v + '.png")';
    applyFx(el, st.fx);
    el.classList.add('on');
    if (pos === 'center') S.charA = st;
    else if (pos === 'left') S.charB = st;
    else S.charC = st;
  }

  function hideChars(which) {
    if (!which || which === 'all') {
      $('char').classList.remove('on');
      $('char2').classList.remove('on');
      $('char3').classList.remove('on');
      S.charA = null; S.charB = null; S.charC = null;
      return;
    }
    if (which === 'A' || which === 'center') {
      $('char').classList.remove('on'); S.charA = null; return;
    }
    if (which === 'B' || which === 'left') {
      $('char2').classList.remove('on'); S.charB = null; return;
    }
    if (which === 'C' || which === 'right') {
      $('char3').classList.remove('on'); S.charC = null; return;
    }
  }

  function applySlot(el, st) {
    el.classList.remove('pos-left', 'pos-right');
    el.classList.remove('on');
    if (!st) { el.style.backgroundImage = ''; applyFx(el, ''); return; }
    if (st.pos === 'left') el.classList.add('pos-left');
    if (st.pos === 'right') el.classList.add('pos-right');
    el.style.backgroundImage = 'url("../assets/avg/char/' + st.name + '.png")';
    applyFx(el, st.fx);
    el.classList.add('on');
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  /* ---------------------------------------------------------- 笔记（线索 / 规则） */
  function updateNoteCount() {
    var el = $('notebtn');
    if (!el) return;
    var n = S.clues.length + S.rules.length;
    el.textContent = '笔记 ' + n;
    el.classList.toggle('has', n > 0);
  }

  function addClue(n) {
    var k = n.k || ('c' + S.clues.length);
    for (var i = 0; i < S.clues.length; i++) {
      if (S.clues[i].k === k) { step(); return; }
    }
    S.clues.push({ k: k, name: n.name || '线索', v: n.v || '' });
    S.vars['clue_' + k] = 1;
    toast('线索入袋 · ' + (n.name || '线索'));
    updateNoteCount();
    step();
  }

  function addRule(n) {
    var k = n.k || ('R' + S.rules.length);
    for (var i = 0; i < S.rules.length; i++) {
      if (S.rules[i].k === k) { step(); return; }
    }
    S.rules.push({ k: k, name: n.name || k, v: n.v || '' });
    S.vars['rule_' + k] = 1;
    toast('规则入册 · ' + k + ' ' + (n.name || ''));
    updateNoteCount();
    step();
  }

  /* ---------------------------------------------------------- 文本 */
  function pushLog(n, v) {
    S.history.push({ n: n || '', v: v });
    if (S.history.length > 400) S.history.shift();
  }

  function doSay(n) {
    S.lastSay = S.ptr - 1;
    $('dialogue').classList.add('on');
    $('dialogue').classList.toggle('letter', n.style === 'letter');
    var sp = $('speaker');
    if (n.n) {
      sp.textContent = n.n;
      sp.classList.add('on');
      sp.classList.remove('narr');
    } else {
      sp.textContent = '';
      sp.classList.remove('on');
    }
    pushLog(n.n, n.v);
    typeText(n.v, n.speed);
  }

  function showLine(text, who) {
    S.lastSay = -1;
    $('dialogue').classList.add('on');
    $('dialogue').classList.remove('letter');
    var sp = $('speaker');
    if (who) { sp.textContent = who; sp.classList.add('on'); } else { sp.classList.remove('on'); }
    pushLog(who, text);
    typeText(text);
  }

  function typeText(text, speed) {
    var el = $('text');
    S.fullText = text;
    el.textContent = '';
    $('next').classList.remove('on');
    $('hint').classList.remove('on');
    clearInterval(S.typeTimer);

    if (S.skip) {
      el.textContent = text;
      finishTyping();
      return;
    }
    var i = 0;
    S.typing = true;
    S.typeTimer = setInterval(function () {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) finishTyping();
    }, speed || S.speed);
  }

  function finishTyping() {
    clearInterval(S.typeTimer);
    S.typeTimer = null;
    S.typing = false;
    $('text').textContent = S.fullText;
    $('next').classList.add('on');
    $('hint').classList.add('on');
    scheduleAuto();
  }

  function scheduleAuto() {
    clearTimeout(S.autoTimer);
    if (!S.started || S.ended) return;
    if (S.skip) {
      S.autoTimer = setTimeout(advance, 60);
      return;
    }
    if (S.auto) {
      S.autoTimer = setTimeout(advance, 1000 + S.fullText.length * 70);
    }
  }

  /* ---------------------------------------------------------- 解释器 */
  function jump(label) {
    if (Object.prototype.hasOwnProperty.call(LABELS, label)) {
      S.ptr = LABELS[label];
    }
    step();
  }

  function doIf(n) {
    var ok = (S.vars[n.k] === n.v);
    var tgt = ok ? n.go : n.else;
    if (tgt && Object.prototype.hasOwnProperty.call(LABELS, tgt)) {
      S.ptr = LABELS[tgt];
      step();
    } else {
      step();
    }
  }

  function doAudio(v) {
    if (AUDIO) AUDIO.cmd(v);
    if (v === 'unlock') return;
    step();
  }

  function doAutoSave(label) {
    var data = {
      ptr: S.ptr, vars: S.vars, fog: S.fog, bg: S.bgName, filter: S.filter,
      charA: S.charA, charB: S.charB, charC: S.charC,
      clues: S.clues, rules: S.rules,
      history: S.history.slice(-120),
      time: new Date().toLocaleString('zh-CN'),
      text: label || '章节存档', auto: true
    };
    try { localStorage.setItem(SAVE_KEY + '0', JSON.stringify(data)); } catch (e) {}
  }

  function step() {
    if (!S.started) return;
    if (S.ptr >= SCRIPT.length) { showEnd({ v: '没有收件人' }); return; }
    var n = SCRIPT[S.ptr++];
    switch (n.t) {
      case 'label': step(); return;
      case 'bg': setBg(n.v, n.fx); step(); return;
      case 'filter': setFilter(n.v); step(); return;
      case 'show': showChar(n); step(); return;
      case 'hide': hideChars(n.v); step(); return;
      case 'fog': setFog(n.v); step(); return;
      case 'set': S.vars[n.k] = n.v; step(); return;
      case 'clue': addClue(n); return;
      case 'rule': addRule(n); return;
      case 'stamp': showStamp(n); return;
      case 'if': doIf(n); return;
      case 'sfx': doAudio(n.v); return;
      case 'autosave': doAutoSave(n.v); step(); return;
      case 'go': jump(n.v); return;
      case 'wait': setTimeout(step, n.v || 300); return;
      case 'say': doSay(n); return;
      case 'choice': doChoice(n); return;
      case 'card': showCard(n); return;
      case 'shake':
        $('stage').classList.add('shake');
        setTimeout(function () { $('stage').classList.remove('shake'); }, 700);
        step(); return;
      case 'flash':
        $('flash').classList.add('on');
        setTimeout(function () { $('flash').classList.remove('on'); }, 160);
        step(); return;
      case 'end': showEnd(n); return;
      default: step(); return;
    }
  }

  function advance() {
    if (!S.started || S.ended || S.panel) return;
    if (S.stampOpen) {
      clearTimeout(S.stampTimer);
      $('stamp').classList.remove('on');
      S.stampOpen = false;
      step();
      return;
    }
    if (S.cardOpen) {
      clearTimeout(S.cardTimer);
      $('card').classList.remove('on');
      S.cardOpen = false;
      step();
      return;
    }
    if ($('choices').classList.contains('on')) return;
    if (S.typing) { finishTyping(); return; }
    if (S.pendingGo !== null) {
      var g = S.pendingGo;
      S.pendingGo = null;
      jump(g);
      return;
    }
    step();
  }

  /* ---------------------------------------------------------- 三律选项 */
  function optVisible(o) {
    if (o.ifk !== undefined && S.vars[o.ifk] !== o.ifv) return false;
    if (o.unlessk !== undefined && S.vars[o.unlessk] === o.unlessv) return false;
    return true;
  }

  function doChoice(node) {
    S.skip = false;
    S.auto = false;
    syncMenu();
    clearTimeout(S.autoTimer);

    S.choiceNodes = node.o || [];
    S.choiceOpts = [];
    for (var i = 0; i < S.choiceNodes.length; i++) {
      if (optVisible(S.choiceNodes[i])) S.choiceOpts.push(S.choiceNodes[i]);
    }
    S.choiceTimed = node.timed !== false;

    var tag = $('choicetag');
    if (tag) {
      tag.textContent = node.tag || '';
      tag.classList.toggle('on', !!node.tag);
    }
    $('choiceq').textContent = node.v || '';
    var wrap = $('choiceopts');
    wrap.innerHTML = '';
    for (var j = 0; j < S.choiceOpts.length; j++) {
      (function (o, idx) {
        var d = document.createElement('div');
        d.className = 'opt';
        d.style.setProperty('--col', LAW_COLOR[o.law] || '#8E9BA5');
        var law = document.createElement('div');
        law.className = 'law';
        law.textContent = o.law || '　';
        var txt = document.createElement('div');
        txt.className = 'txt';
        txt.textContent = o.text;
        if (o.note) {
          var sm = document.createElement('small');
          sm.textContent = o.note;
          txt.appendChild(sm);
        }
        d.appendChild(law);
        d.appendChild(txt);
        d.addEventListener('click', function (ev) {
          ev.stopPropagation();
          pick(idx, false);
        });
        wrap.appendChild(d);
      })(S.choiceOpts[j], j);
    }
    $('dialogue').classList.remove('on');
    $('choices').classList.add('on');
    if (S.choiceTimed) startDrops();
    else {
      clearInterval(S.choiceTimer);
      S.choiceLeft = 3;
      var dl = $('dropline');
      if (dl) dl.classList.add('off');
    }
  }

  function startDrops() {
    var drops = document.querySelectorAll('#dropline .drop');
    for (var i = 0; i < drops.length; i++) drops[i].classList.remove('gone');
    var dl = $('dropline');
    if (dl) dl.classList.remove('off');
    S.choiceLeft = 3;
    clearInterval(S.choiceTimer);
    S.choiceTimer = setInterval(function () {
      var idx = 3 - S.choiceLeft;
      if (idx >= 0 && idx < 3) drops[idx].classList.add('gone');
      S.choiceLeft--;
      if (S.choiceLeft <= 0) {
        clearInterval(S.choiceTimer);
        pick(0, true);
      }
    }, 8000);
  }

  function pick(i, forced) {
    clearInterval(S.choiceTimer);
    S.choicePaused = false;
    var opt = S.choiceOpts && S.choiceOpts[i];
    if (!opt) return;
    $('choices').classList.remove('on');
    var tag = $('choicetag');
    if (tag) { tag.classList.remove('on'); tag.textContent = ''; }
    var dl = $('dropline');
    if (dl) dl.classList.remove('off');
    S.history.push({ n: '选择', v: '［' + (opt.law || '　') + '］' + opt.text });

    if (forced) {
      toast('第三滴水落了下去');
      showLine('雾线上的第三滴水落了下去。\n系统替你选了「' + (opt.law || '常理') + '」。\n——因为大多数人都这样。', '');
      S.pendingGo = opt.go;
    } else {
      jump(opt.go);
    }
  }

  /* ---------------------------------------------------------- 面板 */
  function closePanel() {
    S.panel = null;
    $('panel').classList.remove('on');
    if (S.choicePaused && $('choices').classList.contains('on')) {
      S.choicePaused = false;
      startDrops();
    }
  }

  function openPanel(kind) {
    if (S.typing) finishTyping();
    if ($('choices').classList.contains('on') && S.choiceTimed) {
      clearInterval(S.choiceTimer);
      S.choicePaused = true;
    }
    S.panel = kind;
    $('panel').classList.add('on');
    $('paneltitle').textContent = kind === 'log' ? '记录' : (kind === 'clues' ? '笔记' : (kind === 'save' ? '存档' : '读档'));
    var body = $('panelbody');
    body.innerHTML = '';
    if (kind === 'log') renderLog(body);
    else if (kind === 'clues') renderNotes(body);
    else renderSlots(body, kind);
  }

  function renderNotes(body) {
    if (!S.clues.length && !S.rules.length) {
      body.innerHTML = '<p style="color:#55636F">还没有记下东西。看清了，再选。</p>';
      return;
    }
    if (S.clues.length) {
      var h = document.createElement('div');
      h.className = 'notehead';
      h.textContent = '线索 · ' + S.clues.length;
      body.appendChild(h);
      for (var i = 0; i < S.clues.length; i++) {
        var c = S.clues[i];
        var row = document.createElement('div');
        row.className = 'notecard';
        var tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = c.name;
        var txt = document.createElement('div');
        txt.className = 'body';
        txt.textContent = c.v;
        row.appendChild(tag); row.appendChild(txt);
        body.appendChild(row);
      }
    }
    if (S.rules.length) {
      var h2 = document.createElement('div');
      h2.className = 'notehead';
      h2.textContent = '规则 · ' + S.rules.length;
      body.appendChild(h2);
      for (var j = 0; j < S.rules.length; j++) {
        var r = S.rules[j];
        var row2 = document.createElement('div');
        row2.className = 'notecard rule';
        var tag2 = document.createElement('div');
        tag2.className = 'tag';
        tag2.textContent = r.k + ' ' + r.name;
        var txt2 = document.createElement('div');
        txt2.className = 'body';
        txt2.textContent = r.v;
        row2.appendChild(tag2); row2.appendChild(txt2);
        body.appendChild(row2);
      }
    }
  }

  function renderLog(body) {
    if (!S.history.length) {
      body.innerHTML = '<p style="color:#55636F">还没有任何记录。</p>';
      return;
    }
    for (var i = 0; i < S.history.length; i++) {
      var h = S.history[i];
      var row = document.createElement('div');
      row.className = 'logline';
      var who = document.createElement('div');
      who.className = 'who';
      who.textContent = h.n;
      var what = document.createElement('div');
      what.className = 'what';
      what.textContent = h.v;
      row.appendChild(who);
      row.appendChild(what);
      body.appendChild(row);
    }
    body.scrollTop = body.scrollHeight;
  }

  function readSlot(i) {
    try {
      var raw = localStorage.getItem(SAVE_KEY + i);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function renderSlots(body, kind) {
    var slots = (kind === 'load') ? [0, 1, 2, 3] : [1, 2, 3];
    for (var s = 0; s < slots.length; s++) {
      (function (no) {
        var d = readSlot(no);
        var row = document.createElement('div');
        row.className = 'slot' + (no === 0 ? ' auto' : '');
        var tag = document.createElement('div');
        tag.className = 'no';
        tag.textContent = no === 0 ? '章' : (no < 10 ? '0' + no : '' + no);
        var meta = document.createElement('div');
        meta.className = 'meta';
        var t = document.createElement('div');
        t.className = 't';
        var s2 = document.createElement('div');
        s2.className = 's';
        if (d) {
          t.textContent = d.time || '';
          s2.textContent = d.text || '';
        } else {
          t.textContent = no === 0 ? '章节存档' : '空';
          s2.textContent = kind === 'save'
            ? '点这里存到这个位置'
            : (no === 0 ? '章节开头会自动存到这里' : '还没有存档');
        }
        meta.appendChild(t);
        meta.appendChild(s2);
        row.appendChild(tag);
        row.appendChild(meta);

        row.addEventListener('click', function (ev) {
          if (ev.target.classList.contains('del')) return;
          if (kind === 'save') {
            if (doSave(no)) { toast('已存到 ' + no); closePanel(); }
          } else if (d) {
            doLoad(no);
          } else {
            toast('这个位置没有存档');
          }
        });

        if (kind === 'save' && d && no !== 0) {
          var del = document.createElement('button');
          del.className = 'del';
          del.textContent = '删除';
          del.addEventListener('click', function (ev) {
            ev.stopPropagation();
            localStorage.removeItem(SAVE_KEY + no);
            openPanel('save');
          });
          row.appendChild(del);
        }
        body.appendChild(row);
      })(slots[s]);
    }
  }

  function doSave(no) {
    var ptr = S.lastSay >= 0 ? S.lastSay : S.ptr;
    var data = {
      ptr: ptr, vars: S.vars, fog: S.fog, bg: S.bgName, filter: S.filter,
      charA: S.charA, charB: S.charB, charC: S.charC,
      clues: S.clues, rules: S.rules,
      history: S.history.slice(-120),
      time: new Date().toLocaleString('zh-CN'),
      text: S.fullText.slice(0, 40)
    };
    try {
      localStorage.setItem(SAVE_KEY + no, JSON.stringify(data));
      return true;
    } catch (e) {
      toast('存不进去（浏览器限制）');
      return false;
    }
  }

  function doLoad(no) {
    var d = readSlot(no);
    if (!d) return;
    closePanel();
    $('title').classList.add('off');
    $('endscreen').classList.remove('on');
    S.ptr = d.ptr || 0;
    S.vars = d.vars || {};
    S.history = d.history || [];
    S.lastSay = -1;
    S.pendingGo = null;
    S.ended = false;
    S.started = true;
    S.bgName = '';
    S.filter = d.filter || 'none';
    S.charA = d.charA || null;
    S.charB = d.charB || null;
    S.charC = d.charC || null;
    S.clues = d.clues || [];
    S.rules = d.rules || [];
    updateNoteCount();
    $('bgA').className = 'bg';
    $('bgB').className = 'bg';
    frontA = true;
    setFog(d.fog || 18);
    applyFilter();
    if (d.bg) {
      $('bgA').style.backgroundImage = 'url("../assets/avg/bg/' + d.bg + '.jpg")';
      $('bgA').classList.add('on');
      $('bgA').classList.toggle('fin', S.filter === 'in');
      S.bgName = d.bg;
    }
    applySlot($('char'), S.charA);
    applySlot($('char2'), S.charB);
    applySlot($('char3'), S.charC);
    $('choices').classList.remove('on');
    toast('读档：' + (d.time || ''));
    step();
  }

  /* ---------------------------------------------------------- 结束 */
  function showCard(n) {
    S.cardOpen = true;
    $('cardTitle').textContent = n.v || '';
    $('cardSub').textContent = n.sub || '';
    $('dialogue').classList.remove('on');
    $('choices').classList.remove('on');
    $('card').classList.add('on');
    clearTimeout(S.cardTimer);
    S.cardTimer = setTimeout(function () {
      $('card').classList.remove('on');
      S.cardOpen = false;
      step();
    }, n.wait || 2400);
  }

  /* 穿越判定结果章：一枚盖在画面上的「邮戳」 */
  function showStamp(n) {
    S.stampOpen = true;
    $('dialogue').classList.remove('on');
    $('choices').classList.remove('on');
    var el = $('stamp');
    $('stampMain').textContent = n.v || '穿越';
    $('stampSub').textContent = n.sub || '';
    el.classList.toggle('bad', n.ok === false);
    el.classList.add('on');
    clearTimeout(S.stampTimer);
    S.stampTimer = setTimeout(function () {
      el.classList.remove('on');
      S.stampOpen = false;
      step();
    }, n.wait || 1400);
  }

  function lawText(key) {
    var m = { rule: '常理', fog: '雾理', warm: '人情' };
    return m[S.vars[key]] || '（未记录）';
  }

  function buildStats(n) {
    var items = [];
    if (S.vars.ch1_ok == 1) items.push('第一章穿越成功');
    else if (S.vars.ch1_fail) items.push('第一章进错了信');
    if (S.vars.ch2_ok == 1) items.push('第二章走对了路');
    else if (S.vars.ch2_fail) items.push('第二章被登记了');
    if (S.vars.ch3_ok == 1) items.push('第三章跟对了呼吸');
    else if (S.vars.ch3_fail) items.push('第三章没有认出她');
    var cross = [
      S.vars.ch1_ok == 1 ? '一 ✓' : '一 ✗',
      S.vars.ch2_ok == 1 ? '二 ✓' : '二 ✗',
      S.vars.ch3_ok == 1 ? '三 ✓' : '三 ✗'
    ].join('　');
    var sign = S.vars.sign_mode === 'num' ? '编号' : (S.vars.sign_mode === 'name' ? '名字' : '未写');
    var list = S.vars.list_spoken === 1 ? '已念' : '未念';
    var debt = S.vars.fog_debt || 0;
    var html = '雾浓度 ' + S.fog + '%　·　穿越 ' + cross +
      '<br>第一章 ' + lawText('ch1_law') +
      '　·　第二章 ' + lawText('ch2_law') +
      (n.law ? '　·　终局 ' + n.law : '') +
      '<br>回执簿：' + sign + '　·　名单：' + list + '　·　雾债：' + debt +
      '　·　线索 ' + S.clues.length + '　·　规则 ' + S.rules.length +
      '<br>你带着：' + (items.length ? items.join('、') : '两手空空') +
      '<br><br>下一封信，已经在路上。';
    return html;
  }

  function showEnd(n) {
    S.ended = true;
    S.started = false;
    clearInterval(S.choiceTimer);
    clearTimeout(S.autoTimer);
    $('card').classList.remove('on');
    S.cardOpen = false;
    $('stamp').classList.remove('on');
    S.stampOpen = false;
    $('endname').textContent = n.v || '没有收件人';
    $('endstats').innerHTML = buildStats(n);
    $('endscreen').classList.add('on');
    $('dialogue').classList.remove('on');
    $('dialogue').classList.remove('letter');
    $('choices').classList.remove('on');
    if (AUDIO) AUDIO.cmd('amb_off');
  }

  /* ---------------------------------------------------------- 标题 / 开始 */
  function reset() {
    S.ptr = LABELS['start'] || 0;
    S.vars = {};
    S.history = [];
    S.lastSay = -1;
    S.pendingGo = null;
    S.bgName = '';
    S.filter = 'none';
    S.charA = null; S.charB = null; S.charC = null;
    S.clues = []; S.rules = [];
    updateNoteCount();
    S.auto = false;
    S.skip = false;
    S.choicePaused = false;
    S.ended = false;
    S.started = true;
    $('bgA').className = 'bg';
    $('bgB').className = 'bg';
    $('bgA').style.backgroundImage = '';
    $('bgB').style.backgroundImage = '';
    frontA = true;
    $('endscreen').classList.remove('on');
    $('choices').classList.remove('on');
    $('panel').classList.remove('on');
    $('text').textContent = '';
    $('speaker').classList.remove('on');
    $('dialogue').classList.remove('on');
    $('dialogue').classList.remove('letter');
    $('char').classList.remove('on');
    $('char2').classList.remove('on');
    $('char3').classList.remove('on');
    $('stamp').classList.remove('on');
    S.stampOpen = false;
    clearInterval(S.choiceTimer);
    clearTimeout(S.autoTimer);
    clearInterval(S.typeTimer);
    setFog(18);
    applyFilter();
    syncMenu();
  }

  function newGame() {
    reset();
    $('title').classList.add('off');
    step();
  }

  function latestSlot() {
    var bestNo = 0, bestT = -1;
    for (var i = 0; i <= 3; i++) {
      var d = readSlot(i);
      if (!d) continue;
      var t = Date.parse((d.time || '').replace(/\//g, '-')) || 0;
      if (t > bestT) { bestT = t; bestNo = i; }
    }
    return bestNo;
  }

  function syncMenu() {
    var map = { auto: S.auto, skip: S.skip };
    var btns = document.querySelectorAll('#menu button');
    for (var i = 0; i < btns.length; i++) {
      var a = btns[i].getAttribute('data-act');
      if (a === 'auto' || a === 'skip') {
        btns[i].classList.toggle('act', !!map[a]);
        btns[i].textContent = a === 'auto' ? (S.auto ? '自动·开' : '自动') : (S.skip ? '快进·开' : '快进');
      }
    }
  }

  /* ---------------------------------------------------------- 输入 */
  function unlockAudio() {
    if (AUDIO) AUDIO.cmd('unlock');
  }

  function bind() {
    $('stage').addEventListener('click', function (e) {
      unlockAudio();
      if (e.target.closest && e.target.closest('button,#panel,#title,#endscreen,#choices')) return;
      advance();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (S.panel) return;
        e.preventDefault();
        unlockAudio();
        advance();
      } else if (e.key === 'Escape') {
        if (S.panel) closePanel();
      } else if (e.key === 'Control') {
        if (!S.skip && S.started) { S.skip = true; syncMenu(); if (!S.typing) advance(); }
      } else if (e.key === 'a' || e.key === 'A') {
        if (!S.started) return;
        S.auto = !S.auto;
        syncMenu();
        if (S.auto && !S.typing) scheduleAuto();
      } else if (e.key === 'n' || e.key === 'N') {
        if (S.panel) closePanel();
        else openPanel('clues');
      }
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === 'Control' && S.skip) { S.skip = false; syncMenu(); clearTimeout(S.autoTimer); }
    });

    $('menu').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute('data-act');
      if (act === 'log') openPanel('log');
      else if (act === 'save') openPanel('save');
      else if (act === 'load') openPanel('load');
      else if (act === 'auto') { S.auto = !S.auto; syncMenu(); if (S.auto && !S.typing) scheduleAuto(); }
      else if (act === 'skip') { S.skip = !S.skip; syncMenu(); if (S.skip && !S.typing) advance(); }
      else if (act === 'title') {
        $('title').classList.remove('off');
        S.started = false;
        if (AUDIO) AUDIO.cmd('amb_off');
      }
      else if (act === 'home') { location.href = '../index.html'; }
    });

    $('panelclose').addEventListener('click', function (e) { e.stopPropagation(); closePanel(); });

    var nb = $('notebtn');
    if (nb) nb.addEventListener('click', function (e) {
      e.stopPropagation();
      unlockAudio();
      openPanel('clues');
    });

    $('title').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute('data-act');
      if (act === 'new') { $('about').classList.remove('on'); newGame(); }
      else if (act === 'continue') {
        var no = latestSlot();
        if (no !== null && readSlot(no)) { $('title').classList.add('off'); doLoad(no); }
        else toast('还没有存档');
      } else if (act === 'about') { $('about').classList.add('on'); }
      else if (act === 'aboutclose') { $('about').classList.remove('on'); }
      else if (act === 'home') { location.href = '../index.html'; }
    });

    $('endscreen').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute('data-act');
      if (act === 'title') { $('endscreen').classList.remove('on'); $('title').classList.remove('off'); }
      else if (act === 'load') { $('endscreen').classList.remove('on'); openPanel('load'); }
      else if (act === 'home') { location.href = '../index.html'; }
    });
  }

  /* ---------------------------------------------------------- 启动 */
  bind();
  setFog(18);
  updateNoteCount();
  if (!SCRIPT.length) {
    $('text').textContent = '剧本没加载上：检查 story.js 是否和 index.html 在同一目录。';
  }

  // 供自检/截图脚本读取状态；正常游玩不需要。
  window.__AVG__ = {
    S: S, LABELS: LABELS, advance: advance, jump: jump, step: step,
    pick: pick, openPanel: openPanel, closePanel: closePanel
  };

  // 调试/截图用：?auto=1 直接开始；&at=标签名 跳段；&bg=底图名 补底图；&adv=N 自动推进 N 次
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.get('diag')) {
      setTimeout(function () {
        var r = $('stage').getBoundingClientRect();
        var box = document.createElement('div');
        box.id = 'diagbox';
        box.textContent = 'DIAG|vw=' + innerWidth + '|vh=' + innerHeight +
          '|dpr=' + devicePixelRatio + '|stage=' + Math.round(r.width) + 'x' +
          Math.round(r.height) + '@' + Math.round(r.left) + ',' + Math.round(r.top) +
          '|u=' + getComputedStyle($('stage')).getPropertyValue('--u');
        document.body.appendChild(box);
      }, 1200);
    }
    if (qs.get('auto')) {
      $('title').classList.add('off');
      reset();
      var at = qs.get('at');
      if (at && LABELS[at] !== undefined) S.ptr = LABELS[at];
      var bgn = qs.get('bg');
      if (bgn) setBg(bgn, 'cut');
      step();
      var advN = parseInt(qs.get('adv') || '0', 10);
      if (advN > 0) {
        var k = 0;
        var tk = setInterval(function () {
          if (k++ >= advN || S.ended) { clearInterval(tk); return; }
          advance();
        }, 380);
      }
    }
    if (qs.get('panel') === 'clues') {
      setTimeout(function () { openPanel('clues'); }, 3200);
    }
  } catch (e) { /* 老浏览器没有 URLSearchParams 就算了 */ }
})();
