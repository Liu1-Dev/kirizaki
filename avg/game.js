/* 《雾崎来信》AVG 引擎 —— 无依赖，双击 index.html 就能跑。
 * 剧本在 story.js，这里是解释器 + 界面。
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

  var LAW_COLOR = { '常理': '#8E9BA5', '雾理': '#6FD3D8', '人情': '#E2603C' };
  var SAVE_KEY = 'kirizaki_save_';

  var S = {
    ptr: 0, vars: {}, history: [], fog: 18,
    bgName: '', charName: '',
    typing: false, typeTimer: null, fullText: '',
    auto: false, skip: false, speed: 26,
    pendingGo: null, lastSay: -1,
    started: false, ended: false,
    autoTimer: null, choiceTimer: null, choiceLeft: 3, choiceNodes: null,
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

  function setBg(name, fx) {
    if (!name || name === S.bgName) return;
    var img = 'url("../assets/avg/bg/' + name + '.png")';
    var cur = frontA ? $('bgA') : $('bgB');
    var nxt = frontA ? $('bgB') : $('bgA');
    nxt.style.backgroundImage = img;
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

  function setChar(name, fx) {
    var el = $('char');
    el.classList.toggle('water', fx === 'water');
    if (!name) {
      el.classList.remove('on');
      S.charName = '';
      return;
    }
    el.style.backgroundImage = 'url("../assets/avg/char/' + name + '.png")';
    el.classList.add('on');
    S.charName = name;
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  /* ---------------------------------------------------------- 文本 */
  function pushLog(n, v) {
    S.history.push({ n: n || '', v: v });
    if (S.history.length > 400) S.history.shift();
  }

  function doSay(node) {
    S.lastSay = S.ptr - 1;
    $('dialogue').classList.add('on');
    var sp = $('speaker');
    if (node.n) {
      sp.textContent = node.n;
      sp.classList.add('on');
      sp.classList.remove('narr');
    } else {
      sp.textContent = '';
      sp.classList.remove('on');
    }
    pushLog(node.n, node.v);
    typeText(node.v);
  }

  function showLine(text, who) {
    S.lastSay = -1;
    $('dialogue').classList.add('on');
    var sp = $('speaker');
    if (who) { sp.textContent = who; sp.classList.add('on'); } else { sp.classList.remove('on'); }
    pushLog(who, text);
    typeText(text);
  }

  function typeText(text) {
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
    }, S.speed);
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

  function step() {
    if (!S.started) return;
    if (S.ptr >= SCRIPT.length) { showEnd('第一章 · 白鹭町'); return; }
    var n = SCRIPT[S.ptr++];
    switch (n.t) {
      case 'label': step(); return;
      case 'bg': setBg(n.v, n.fx); step(); return;
      case 'show': setChar(n.v, n.fx); step(); return;
      case 'hide': setChar(null); step(); return;
      case 'fog': setFog(n.v); step(); return;
      case 'set': S.vars[n.k] = n.v; step(); return;
      case 'go': jump(n.v); return;
      case 'wait': setTimeout(step, n.v || 300); return;
      case 'say': doSay(n); return;
      case 'choice': doChoice(n); return;
      case 'end': showEnd(n.v); return;
      default: step(); return;
    }
  }

  function advance() {
    if (!S.started || S.ended || S.panel) return;
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
  function doChoice(node) {
    S.skip = false;
    S.auto = false;
    syncMenu();
    clearTimeout(S.autoTimer);

    S.choiceNodes = node.o || [];
    $('choiceq').textContent = node.v || '';
    var wrap = $('choiceopts');
    wrap.innerHTML = '';
    for (var i = 0; i < S.choiceNodes.length; i++) {
      (function (o, idx) {
        var d = document.createElement('div');
        d.className = 'opt';
        d.style.setProperty('--col', LAW_COLOR[o.law] || '#8E9BA5');
        var law = document.createElement('div');
        law.className = 'law';
        law.textContent = o.law;
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
      })(S.choiceNodes[i], i);
    }
    $('dialogue').classList.remove('on');
    $('choices').classList.add('on');
    startDrops();
  }

  function startDrops() {
    var drops = document.querySelectorAll('#dropline .drop');
    for (var i = 0; i < drops.length; i++) drops[i].classList.remove('gone');
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
    var opt = S.choiceNodes && S.choiceNodes[i];
    if (!opt) return;
    $('choices').classList.remove('on');
    S.history.push({ n: '选择', v: '［' + opt.law + '］' + opt.text });

    if (forced) {
      toast('第三滴水落了下去');
      showLine('雾线上的第三滴水落了下去。\n系统替你选了「常理」。\n——因为大多数人都这样。', '');
      S.pendingGo = opt.go;
    } else {
      jump(opt.go);
    }
  }

  /* ---------------------------------------------------------- 面板 */
  function closePanel() {
    S.panel = null;
    $('panel').classList.remove('on');
  }

  function openPanel(kind) {
    if (S.typing) finishTyping();
    S.panel = kind;
    $('panel').classList.add('on');
    $('paneltitle').textContent = kind === 'log' ? '记录' : (kind === 'save' ? '存档' : '读档');
    var body = $('panelbody');
    body.innerHTML = '';
    if (kind === 'log') renderLog(body);
    else renderSlots(body, kind);
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
    for (var i = 1; i <= 3; i++) {
      (function (no) {
        var d = readSlot(no);
        var row = document.createElement('div');
        row.className = 'slot';
        var tag = document.createElement('div');
        tag.className = 'no';
        tag.textContent = no < 10 ? '0' + no : '' + no;
        var meta = document.createElement('div');
        meta.className = 'meta';
        var t = document.createElement('div');
        t.className = 't';
        var s = document.createElement('div');
        s.className = 's';
        if (d) {
          t.textContent = d.time || '';
          s.textContent = d.text || '';
        } else {
          t.textContent = '空';
          s.textContent = kind === 'save' ? '点这里存到这个位置' : '还没有存档';
        }
        meta.appendChild(t);
        meta.appendChild(s);
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

        if (kind === 'save' && d) {
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
      })(i);
    }
  }

  function doSave(no) {
    var ptr = S.lastSay >= 0 ? S.lastSay : S.ptr;
    var data = {
      ptr: ptr, vars: S.vars, fog: S.fog, bg: S.bgName, char: S.charName,
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
    S.charName = '';
    $('bgA').className = 'bg';
    $('bgB').className = 'bg';
    frontA = true;
    setFog(d.fog || 18);
    if (d.bg) {
      $('bgA').style.backgroundImage = 'url("../assets/avg/bg/' + d.bg + '.png")';
      $('bgA').classList.add('on');
      S.bgName = d.bg;
    }
    setChar(d.char || null);
    $('choices').classList.remove('on');
    toast('读档：' + (d.time || ''));
    step();
  }

  /* ---------------------------------------------------------- 结束 */
  function showEnd(name) {
    S.ended = true;
    S.started = false;
    clearInterval(S.choiceTimer);
    clearTimeout(S.autoTimer);
    $('endname').textContent = name || '第一章 · 白鹭町';
    var law = S.vars.law_rule ? '常理' : (S.vars.law_fog ? '雾理' : (S.vars.law_warm ? '人情' : '（未记录）'));
    $('endstats').innerHTML =
      '雾浓度 ' + S.fog + '%　·　最后一次选择：' + law +
      '<br>这一章教了你两条规则：雾里的东西会重复；所有钟停在 5:40。' +
      '<br><br>第二章「白蔷薇疗养院」——温柔可以是暴力，<br>收容与庇护，用的是同一套词。';
    $('endscreen').classList.add('on');
    $('dialogue').classList.remove('on');
    $('choices').classList.remove('on');
  }

  /* ---------------------------------------------------------- 标题 / 开始 */
  function reset() {
    S.ptr = LABELS['start'] || 0;
    S.vars = {};
    S.history = [];
    S.lastSay = -1;
    S.pendingGo = null;
    S.bgName = '';
    S.charName = '';
    S.auto = false;
    S.skip = false;
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
    $('char').classList.remove('on');
    clearInterval(S.choiceTimer);
    clearTimeout(S.autoTimer);
    clearInterval(S.typeTimer);
    setFog(18);
    syncMenu();
  }

  function newGame() {
    reset();
    $('title').classList.add('off');
    step();
  }

  function latestSlot() {
    var best = null, bestNo = 0, bestT = -1;
    for (var i = 1; i <= 3; i++) {
      var d = readSlot(i);
      if (!d) continue;
      var t = Date.parse((d.time || '').replace(/\//g, '-')) || 0;
      if (t > bestT) { bestT = t; best = i; bestNo = i; }
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
  function bind() {
    $('stage').addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button,#panel,#title,#endscreen,#choices')) return;
      advance();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (S.panel) return;
        e.preventDefault();
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
      else if (act === 'title') { $('title').classList.remove('off'); S.started = false; }
    });

    $('panelclose').addEventListener('click', function (e) { e.stopPropagation(); closePanel(); });

    $('title').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute('data-act');
      if (act === 'new') { $('about').classList.remove('on'); newGame(); }
      else if (act === 'continue') {
        var no = latestSlot();
        if (no) { $('title').classList.add('off'); doLoad(no); }
        else toast('还没有存档');
      } else if (act === 'about') { $('about').classList.add('on'); }
      else if (act === 'aboutclose') { $('about').classList.remove('on'); }
    });

    $('endscreen').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute('data-act');
      if (act === 'title') { $('endscreen').classList.remove('on'); $('title').classList.remove('off'); }
      else if (act === 'load') { $('endscreen').classList.remove('on'); openPanel('load'); }
    });
  }

  /* ---------------------------------------------------------- 启动 */
  bind();
  setFog(18);
  if (!SCRIPT.length) {
    $('text').textContent = '剧本没加载上：检查 story.js 是否和 index.html 在同一目录。';
  }

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
  } catch (e) { /* 老浏览器没有 URLSearchParams 就算了 */ }
})();
