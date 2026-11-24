/* 雾崎来信 · 像素探索版 · 绘制层
 * 全部按 320×480 逻辑像素绘制；canvas 由 CSS 整数放大。
 */
(function (global) {
  'use strict';

  const P = {
    ink: '#0B1018', deep: '#131C28', wall: '#1B2430', slate: '#253347',
    dusk: '#3E5164', steel: '#587485', mist: '#7E96A8', pale: '#A2B6C2',
    fog: '#E9EEF0', paper: '#F6F0E2', ash: '#9AA0A0',
    wine: '#5C1A2A', rust: '#8C2F26', ember: '#E8792B', skin: '#C9D6DC'
  };

  function r(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0));
  }

  // 角色色板：信外 / 信内
  const SKIN = {
    out: { coat: '#253347', coat2: '#3E5164', line: '#0B1018', hair: '#1B2430', face: '#C9D6DC', bag: '#587485', paper: P.paper },
    in: { coat: '#401A21', coat2: '#5C1A2A', line: '#120A0C', hair: '#1A0E10', face: '#C87A5E', bag: '#8C2F26', paper: P.paper }
  };

  /** 玩家：小邮差。x,y 为脚底中心；dir: down/up/left/right；t: 0..3 */
  function player(ctx, x, y, dir, t, mode, opt) {
    opt = opt || {};
    const c = SKIN[mode === 'in' ? 'in' : 'out'];
    const step = opt.moving ? [0, 1, 0, -1][t & 3] : 0;
    const bob = opt.moving ? (t & 1 ? -1 : 0) : 0;
    x = Math.round(x); y = Math.round(y);
    const flip = dir === 'right' ? -1 : 1;

    // 影子
    ctx.fillStyle = 'rgba(6,9,13,0.55)';
    ctx.fillRect(x - 11, y - 3, 22, 4);
    ctx.fillRect(x - 8, y - 5, 16, 2);

    const top = y - 54 + bob;
    // 腿
    r(ctx, x - 6, y - 14 + step, 5, 13, c.coat);
    r(ctx, x + 1, y - 14 - step, 5, 13, c.coat);
    r(ctx, x - 7, y - 3 + step, 7, 3, c.line);
    r(ctx, x + 1, y - 3 - step, 7, 3, c.line);
    // 大衣
    r(ctx, x - 10, top + 20, 20, 22, c.coat);
    r(ctx, x - 10, top + 20, 20, 2, c.coat2);
    r(ctx, x - 10, top + 20, 2, 22, c.line);
    r(ctx, x + 8, top + 20, 2, 22, c.line);
    // 左侧轮廓光：深底上也看得见人形
    r(ctx, x - 11, top + 21, 1, 20, c.face);
    r(ctx, x - 8, top + 6, 1, 10, c.face);
    // 单侧挎包
    r(ctx, x + 7 * flip, top + 24, 8, 9, c.bag);
    r(ctx, x + 7 * flip, top + 24, 8, 2, c.line);
    r(ctx, x + 1, top + 20, 2, 12, c.coat2);
    // 围巾 / 领口
    r(ctx, x - 6, top + 18, 12, 3, c.coat2);
    // 头
    r(ctx, x - 7, top + 5, 14, 14, c.face);
    r(ctx, x - 7, top + 5, 14, 3, c.hair);
    r(ctx, x - 8, top + 7, 2, 12, c.hair);
    r(ctx, x + 6, top + 7, 2, 12, c.hair);
    // 帽
    r(ctx, x - 8, top + 2, 16, 4, c.line);
    r(ctx, x - 9, top + 5, 18, 2, c.line);
    r(ctx, x - 2, top + 3, 4, 2, c.coat2);
    // 脸
    if (dir === 'down') {
      r(ctx, x - 4, top + 11, 2, 2, c.line);
      r(ctx, x + 2, top + 11, 2, 2, c.line);
      r(ctx, x - 1, top + 15, 2, 1, c.line);
    } else if (dir === 'left') {
      r(ctx, x - 5, top + 11, 2, 2, c.line);
      r(ctx, x - 7, top + 14, 4, 1, c.line);
    } else if (dir === 'right') {
      r(ctx, x + 3, top + 11, 2, 2, c.line);
      r(ctx, x + 3, top + 14, 4, 1, c.line);
    }
    // 手里的信（只在下/左右时露一点）
    if (dir !== 'up') {
      r(ctx, x - 11 * flip, top + 26, 5, 4, c.paper);
      r(ctx, x - 11 * flip, top + 26, 5, 1, c.coat2);
    }
  }

  // ---------------------------------------------------------- 图标（16×16 网格）
  const ICONS = {
    stamp(g) {
      r(g, 4, 14, 8, 2, P.wall); r(g, 2, 15, 12, 1, P.ink);
      r(g, 5, 5, 6, 9, '#8C7355'); r(g, 4, 9, 8, 5, P.dusk);
      r(g, 6, 2, 4, 4, '#B08A5A'); r(g, 6, 11, 4, 2, P.paper);
      r(g, 14, 12, 2, 4, P.rust);
    },
    paper(g) {
      r(g, 3, 2, 10, 13, P.paper); r(g, 3, 2, 10, 1, P.mist);
      for (let i = 0; i < 4; i++) r(g, 5, 5 + i * 2, 6, 1, P.mist);
      r(g, 9, 11, 4, 4, P.rust);
    },
    ticket(g) {
      r(g, 2, 5, 12, 7, P.paper); r(g, 2, 5, 12, 1, P.pale);
      r(g, 4, 7, 4, 1, P.mist); r(g, 4, 9, 6, 1, P.mist);
      r(g, 0, 7, 2, 3, P.ink); r(g, 14, 7, 2, 3, P.ink);
      r(g, 10, 8, 3, 3, P.rust);
    },
    letter(g) {
      r(g, 2, 4, 12, 9, P.paper); r(g, 2, 4, 12, 1, P.mist);
      r(g, 3, 5, 10, 1, P.pale); r(g, 3, 5, 1, 6, P.pale);
      r(g, 12, 5, 1, 6, P.pale); r(g, 7, 8, 2, 2, P.rust);
      r(g, 5, 10, 6, 1, P.pale);
    },
    sack(g) {
      r(g, 4, 6, 8, 9, '#6A6250'); r(g, 3, 9, 10, 6, '#6A6250');
      r(g, 5, 4, 6, 3, '#8A7C63'); r(g, 5, 7, 6, 1, P.ink);
      r(g, 6, 3, 4, 1, '#8A7C63'); r(g, 11, 11, 4, 4, P.paper);
      r(g, 12, 12, 2, 1, P.rust);
    },
    clock(g) {
      r(g, 3, 2, 10, 12, P.paper); r(g, 2, 3, 12, 10, P.paper);
      r(g, 2, 3, 12, 1, P.ink); r(g, 2, 12, 12, 1, P.ink);
      r(g, 3, 4, 1, 8, P.ink); r(g, 12, 4, 1, 8, P.ink);
      r(g, 8, 5, 1, 4, P.ink); r(g, 8, 8, 3, 1, P.ink);
      r(g, 7, 1, 2, 1, P.ink);
    },
    window(g) {
      r(g, 2, 2, 12, 12, P.mist); r(g, 2, 2, 12, 12, 'rgba(0,0,0,0)');
      r(g, 1, 1, 14, 1, P.ink); r(g, 1, 14, 14, 1, P.ink);
      r(g, 1, 1, 1, 14, P.ink); r(g, 14, 1, 1, 14, P.ink);
      r(g, 8, 1, 1, 14, P.ink); r(g, 1, 8, 14, 1, P.ink);
      r(g, 2, 9, 6, 5, P.fog);
    },
    coat(g) {
      r(g, 5, 2, 6, 3, P.dusk); r(g, 3, 5, 10, 9, P.slate);
      r(g, 5, 5, 6, 9, P.slate); r(g, 7, 5, 2, 9, P.ink);
      r(g, 3, 5, 1, 9, P.ink); r(g, 12, 5, 1, 9, P.ink);
      r(g, 4, 9, 3, 2, P.pale);
    },
    umbrella(g) {
      r(g, 3, 4, 10, 2, P.paper); r(g, 2, 5, 12, 3, P.paper);
      r(g, 2, 8, 12, 1, P.pale); r(g, 7, 8, 2, 6, P.pale);
      r(g, 5, 13, 4, 1, P.pale); r(g, 1, 6, 1, 2, P.pale);
      r(g, 13, 6, 1, 2, P.pale);
    },
    lantern(g) {
      r(g, 6, 1, 4, 2, P.ink); r(g, 4, 3, 8, 2, P.ink);
      r(g, 4, 5, 8, 7, P.paper); r(g, 4, 5, 8, 1, P.ink);
      r(g, 6, 6, 4, 5, P.ember); r(g, 6, 12, 4, 2, P.ink);
    },
    mirror(g) {
      r(g, 4, 1, 8, 1, P.ink); r(g, 3, 2, 10, 12, P.ink);
      r(g, 4, 3, 8, 10, '#8FA6B4'); r(g, 5, 4, 2, 6, P.fog);
      r(g, 6, 14, 4, 1, P.ink);
    },
    cup(g) {
      r(g, 3, 6, 9, 6, P.paper); r(g, 4, 7, 7, 4, '#5C4A3A');
      r(g, 2, 12, 11, 1, P.pale); r(g, 12, 7, 2, 3, P.paper);
      r(g, 6, 2, 1, 3, P.pale); r(g, 8, 3, 1, 2, P.pale);
    },
    door(g) {
      r(g, 3, 1, 10, 14, P.slate); r(g, 3, 1, 10, 1, P.ink);
      r(g, 7, 3, 2, 10, P.wall); r(g, 4, 2, 3, 12, P.wall);
      r(g, 10, 2, 2, 12, P.wall);
    },
    tape(g) {
      r(g, 1, 5, 14, 7, P.slate); r(g, 1, 5, 14, 1, P.ink);
      r(g, 3, 7, 4, 4, P.pale); r(g, 9, 7, 4, 4, P.pale);
      r(g, 4, 8, 2, 2, P.ink); r(g, 10, 8, 2, 2, P.ink);
      r(g, 5, 3, 6, 2, P.dusk);
    },
    phone(g) {
      r(g, 2, 2, 12, 4, P.slate); r(g, 2, 2, 12, 1, P.ink);
      r(g, 3, 3, 4, 2, P.pale); r(g, 9, 3, 4, 2, P.pale);
      r(g, 4, 6, 8, 8, P.slate); r(g, 6, 8, 4, 4, P.pale);
      r(g, 7, 9, 2, 2, P.ink);
    },
    wall(g) {
      r(g, 1, 1, 14, 14, '#2E2A2A');
      for (let y = 2; y < 15; y += 4) {
        r(g, 1, y, 14, 1, '#1A1717');
        for (let x = (y % 8 === 2 ? 2 : 5); x < 15; x += 5) r(g, x, y + 1, 1, 3, '#1A1717');
      }
      r(g, 5, 6, 5, 1, P.paper); r(g, 8, 7, 3, 1, P.rust);
    },
    crown(g) {
      r(g, 2, 9, 12, 4, '#C9A227'); r(g, 3, 4, 2, 6, '#C9A227');
      r(g, 7, 2, 2, 8, '#C9A227'); r(g, 11, 4, 2, 6, '#C9A227');
      r(g, 2, 12, 12, 1, '#8A6E1B'); r(g, 6, 6, 1, 2, P.rust);
    },
    carrot(g) {
      r(g, 6, 1, 1, 4, '#3E6B45'); r(g, 9, 1, 1, 4, '#3E6B45');
      r(g, 7, 2, 2, 3, '#3E6B45');
      r(g, 5, 5, 6, 3, P.ember); r(g, 4, 8, 6, 3, P.ember);
      r(g, 3, 11, 6, 2, P.ember); r(g, 5, 13, 3, 1, P.ember);
      r(g, 6, 6, 1, 4, '#C25F1E');
    },
    eyeband(g) {
      r(g, 1, 6, 14, 4, '#141014'); r(g, 1, 6, 14, 1, '#3A2E38');
      r(g, 2, 9, 12, 1, '#2A2028'); r(g, 3, 10, 2, 1, '#3A2E38');
      r(g, 7, 10, 2, 1, '#3A2E38'); r(g, 11, 10, 2, 1, '#3A2E38');
      r(g, 2, 5, 1, 1, '#3A2E38'); r(g, 13, 5, 1, 1, '#3A2E38');
    },
    photo(g) {
      r(g, 2, 2, 12, 11, P.paper); r(g, 3, 3, 10, 8, P.steel);
      r(g, 5, 5, 3, 4, P.ink); r(g, 9, 4, 2, 5, P.ink);
      r(g, 3, 11, 10, 1, P.mist); r(g, 11, 9, 3, 3, P.paper);
    }
  };

  function icon(ctx, kind, x, y, s) {
    const fn = ICONS[kind] || ICONS.paper;
    const g = document.createElement('canvas');
    g.width = 16; g.height = 16;
    const gg = g.getContext('2d');
    fn(gg);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(g, x, y, s, s);
  }

  // ---------------------------------------------------------- 雾 / 雨 / 灰
  function makeNoise(seed) {
    let s = seed || 1;
    const tbl = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      tbl[i] = s / 4294967296;
    }
    return (x, y) => {
      const i = ((x * 73 + y * 151) & 511);
      const j = ((x * 37 + y * 89 + 17) & 511);
      return (tbl[i] + tbl[j]) * 0.5;
    };
  }

  function fog(ctx, t, amount, mode, cell) {
    cell = 4;
    const noise = fog._n || (fog._n = makeNoise(7));
    const noise2 = fog._n2 || (fog._n2 = makeNoise(23));
    const W = 320, H = 480;
    // 信外：雾贴地，慢慢横着走；信内：悬停不动
    const driftX = Math.floor(t * 0.0009);
    const rows = H / cell;
    const cols = W / cell;
    for (let gy = 0; gy < rows; gy++) {
      const wy = gy * cell;
      let band;
      if (mode === 'in') {
        band = 0.25 + 0.5 * (wy / H);
      } else {
        band = Math.max(0, (wy - 210) / 260);
        band = band * band * (3 - 2 * band);      // smoothstep
      }
      if (band <= 0.01) continue;
      for (let gx = 0; gx < cols; gx++) {
        const v = noise(gx + driftX, gy) * 0.62
          + noise2(gx + 40, gy * 2) * 0.38;
        let a = (v - 0.42) * 2.4 * band * (amount / 100);
        if (a <= 0.02) continue;
        a = Math.min(mode === 'in' ? 0.05 : 0.30, a);
        a = Math.round(a * 50) / 50;
        ctx.fillStyle = mode === 'in'
          ? 'rgba(154,160,160,' + a.toFixed(2) + ')'
          : 'rgba(233,238,240,' + a.toFixed(2) + ')';
        ctx.fillRect(gx * cell, wy, cell, cell);
      }
    }
  }

  function rain(ctx, drops, mode) {
    ctx.fillStyle = 'rgba(233,238,240,0.55)';
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      ctx.fillRect(d.x | 0, d.y | 0, 1, mode === 'in' ? 3 : 4);
    }
  }

  function ash(ctx, parts, col) {
    ctx.fillStyle = col || 'rgba(154,160,160,0.8)';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      ctx.fillRect(p.x | 0, p.y | 0, 1, 1);
    }
  }

  /** 导入的像素小人（澪）：cx 为脚底中心 */
  function npcImage(ctx, img, cx, feetY, t, opt) {
    if (!img) return;
    opt = opt || {};
    const w = img.width, h = img.height;
    const bob = opt.bob === false ? 0 : Math.round(Math.sin(t / 620) * 1.2);
    ctx.fillStyle = 'rgba(6,9,13,0.5)';
    ctx.fillRect(Math.round(cx - w / 2) - 1, feetY - 2, w + 2, 3);
    ctx.fillRect(Math.round(cx - w / 2) + 3, feetY - 4, w - 6, 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(cx - w / 2), Math.round(feetY - h + bob));
  }

  const CN = {
    ink: '#0B1018', skin: '#C9D6DC', skin2: '#A2B6C2',
    wine: '#5C1A2A', rust: '#8C2F26', paper: '#F6F0E2', ember: '#E8792B'
  };

  /**
   * 程序化小人：和玩家同一套画法，靠发型/裙/配件区分。
   * opt: hair, hair2, dress, dress2, trim, style(bob|long|twin), crown, ears,
   *      band, carrot, kneel, back, lantern, glow
   */
  function chibi(ctx, cx, feetY, t, opt) {
    const o = Object.assign({
      hair: '#1B2430', hair2: '#3E5164', dress: '#5C1A2A', dress2: '#8C2F26',
      trim: '#E9D9C6', style: 'long', skin: CN.skin
    }, opt || {});
    const h = o.kneel ? 46 : 62;
    const top = feetY - h;
    const bob = Math.sin(t / 700 + (o.seed || 0)) * 0.8;
    const y = Math.round(top + bob);
    const cxr = Math.round(cx);

    // 影
    if (!o.noshadow) {
      ctx.fillStyle = 'rgba(6,9,13,0.5)';
      ctx.fillRect(cxr - 10, feetY - 2, 20, 3);
    }

    // 腿
    if (!o.kneel) {
      r(ctx, cxr - 5, feetY - 12, 4, 11, o.skin2 || o.skin);
      r(ctx, cxr + 1, feetY - 12, 4, 11, o.skin2 || o.skin);
      r(ctx, cxr - 6, feetY - 2, 6, 2, CN.ink);
      r(ctx, cxr + 1, feetY - 2, 6, 2, CN.ink);
    }
    // 裙子
    const sk0 = y + 24;
    for (let i = 0; i < 5; i++) {
      const ww = 8 + i * 3;
      r(ctx, cxr - ww, sk0 + i * 4, ww * 2, 4, i < 2 ? o.dress : o.dress2);
    }
    r(ctx, cxr - 22, sk0 + 18, 44, 2, o.trim);
    // 上身
    r(ctx, cxr - 7, y + 15, 14, 12, o.dress);
    r(ctx, cxr - 7, y + 15, 14, 2, o.trim);
    r(ctx, cxr - 1, y + 17, 2, 10, o.trim);
    // 手臂
    r(ctx, cxr - 10, y + 17, 3, 12, o.dress);
    r(ctx, cxr + 7, y + 17, 3, 12, o.dress);
    // 头
    r(ctx, cxr - 8, y + 4, 16, 14, o.skin);
    // 发型
    if (o.style === 'bob') {
      r(ctx, cxr - 9, y + 1, 18, 7, o.hair);
      r(ctx, cxr - 9, y + 6, 2, 10, o.hair);
      r(ctx, cxr + 7, y + 6, 2, 10, o.hair);
    } else if (o.style === 'twin') {
      r(ctx, cxr - 9, y + 1, 18, 6, o.hair);
      r(ctx, cxr - 12, y + 4, 4, 16, o.hair);
      r(ctx, cxr + 8, y + 4, 4, 16, o.hair);
      r(ctx, cxr - 12, y + 18, 4, 2, o.hair2);
      r(ctx, cxr + 8, y + 18, 4, 2, o.hair2);
    } else {
      r(ctx, cxr - 9, y + 1, 18, 7, o.hair);
      r(ctx, cxr - 10, y + 5, 4, 28, o.hair);
      r(ctx, cxr + 6, y + 5, 4, 28, o.hair);
      r(ctx, cxr - 10, y + 30, 4, 2, o.hair2);
      r(ctx, cxr + 6, y + 30, 4, 2, o.hair2);
    }
    // 领口
    r(ctx, cxr - 6, y + 15, 12, 2, o.trim);
    // 脸
    if (!o.back) {
      if (o.band) {
        r(ctx, cxr - 8, y + 8, 16, 5, '#141014');
        r(ctx, cxr - 8, y + 12, 16, 1, '#3A2E38');
      } else {
        r(ctx, cxr - 4, y + 10, 2, 2, CN.ink);
        r(ctx, cxr + 2, y + 10, 2, 2, CN.ink);
        r(ctx, cxr - 1, y + 14, 2, 1, CN.ink);
      }
    }
    // 配饰
    if (o.ears) {
      r(ctx, cxr - 8, y - 1, 4, 4, o.hair2);
      r(ctx, cxr + 4, y - 1, 4, 4, o.hair2);
      r(ctx, cxr - 7, y, 2, 2, o.skin);
      r(ctx, cxr + 5, y, 2, 2, o.skin);
    }
    if (o.crown) {
      r(ctx, cxr - 7, y - 1, 14, 2, '#C9A227');
      r(ctx, cxr - 6, y - 4, 2, 4, '#C9A227');
      r(ctx, cxr - 1, y - 5, 2, 5, '#C9A227');
      r(ctx, cxr + 4, y - 4, 2, 4, '#C9A227');
    }
    if (o.carrot) {
      r(ctx, cxr + 3, y - 3, 5, 2, CN.ember);
      r(ctx, cxr + 4, y - 1, 4, 2, CN.ember);
      r(ctx, cxr + 5, y + 1, 3, 2, CN.ember);
      r(ctx, cxr + 6, y - 6, 1, 3, '#3E6B45');
      r(ctx, cxr + 8, y - 6, 1, 3, '#3E6B45');
    }
    if (o.lantern) {
      r(ctx, cxr + 12, y + 18, 2, 8, CN.ink);
      r(ctx, cxr + 9, y + 26, 8, 2, CN.ink);
      r(ctx, cxr + 9, y + 28, 8, 6, '#F6F0E2');
      r(ctx, cxr + 10, y + 29, 6, 4, CN.ember);
    }
  }

  /** 场景小道具：信箱、门垫上的信、剪下的那页 */
  function prop(ctx, kind, x, y) {
    if (kind === 'mailbox') {
      r(ctx, x, y - 30, 26, 30, '#3E5164');
      r(ctx, x + 1, y - 29, 24, 2, '#7E96A8');
      r(ctx, x + 3, y - 22, 20, 3, '#0B1018');
      r(ctx, x + 4, y - 14, 18, 9, '#F6F0E2');
      r(ctx, x + 6, y - 12, 14, 1, '#A2B6C2');
      r(ctx, x + 6, y - 9, 10, 1, '#A2B6C2');
      r(ctx, x + 8, y, 3, 6, '#253347');
      r(ctx, x + 16, y, 3, 6, '#253347');
      r(ctx, x + 2, y - 34, 22, 3, '#253347');
    } else if (kind === 'letter') {
      r(ctx, x, y - 8, 16, 9, '#F6F0E2');
      r(ctx, x, y - 8, 16, 1, '#A2B6C2');
      r(ctx, x + 1, y - 6, 7, 1, '#A2B6C2');
      r(ctx, x + 1, y - 4, 5, 1, '#A2B6C2');
      r(ctx, x + 10, y - 5, 4, 4, '#8C2F26');
    } else if (kind === 'mat') {
      r(ctx, x, y - 4, 40, 10, '#253347');
      r(ctx, x + 2, y - 3, 36, 2, '#3E5164');
    } else if (kind === 'page') {
      r(ctx, x, y - 10, 14, 11, '#F6F0E2');
      r(ctx, x + 1, y - 9, 12, 2, '#8C2F26');
      r(ctx, x + 2, y - 6, 9, 1, '#A2B6C2');
      r(ctx, x + 2, y - 3, 7, 1, '#A2B6C2');
    }
  }
  /** 热点提示：没看过的冒「！」，看过的只留一个小点 */
  function marker(ctx, hx, hy, hw, hh, t, active, seen) {
    const pulse = 0.6 + 0.4 * Math.sin(t / 320);
    const base = active ? 1 : (seen ? 0.22 : 0.78);
    const dash = 4;
    const on = Math.floor(t / 260) % 2 === 0 || active;
    ctx.globalAlpha = base;
    ctx.fillStyle = 'rgba(246,240,226,0.95)';
    if (active) {
      const x0 = hx, y0 = hy, x1 = hx + hw, y1 = hy + hh;
      for (let x = x0; x < x1; x += dash * 2) {
        ctx.fillRect(x, y0, Math.min(dash, x1 - x), 1);
        ctx.fillRect(x, y1 - 1, Math.min(dash, x1 - x), 1);
      }
      for (let y = y0; y < y1; y += dash * 2) {
        ctx.fillRect(x0, y, 1, Math.min(dash, y1 - y));
        ctx.fillRect(x1 - 1, y, 1, Math.min(dash, y1 - y));
      }
    }
    if (!seen) {
      const bx = hx + hw / 2 - 6, by = hy - 20;
      ctx.globalAlpha = base * (0.72 + 0.28 * pulse);
      ctx.fillStyle = P.ink;
      ctx.fillRect(bx - 1, by - 1, 14, 17);
      ctx.fillStyle = P.paper;
      ctx.fillRect(bx, by, 12, 14);
      ctx.fillStyle = P.ink;
      ctx.fillRect(bx + 5, by + 3, 2, 6);
      ctx.fillRect(bx + 5, by + 11, 2, 2);
      ctx.fillStyle = P.wine;
      ctx.fillRect(bx + 5, by + 10, 2, 1);
      ctx.fillStyle = P.paper;
      ctx.fillRect(bx + 4, by + 14, 4, 2);
      ctx.fillRect(bx + 5, by + 16, 2, 1);
    } else if (!active) {
      ctx.fillStyle = 'rgba(246,240,226,0.6)';
      ctx.fillRect(hx + hw / 2 - 1, hy - 4, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  /** 雾从画面下缘涨上来的切换遮罩：p 0..1 */
  function fogWipe(ctx, p, mode) {
    const H = 480;
    const h = H * p;
    if (h <= 0) return;
    ctx.fillStyle = mode === 'in' ? 'rgba(154,160,160,0.92)' : 'rgba(233,238,240,0.92)';
    ctx.fillRect(0, H - h, 320, h);
    // 上沿打散
    for (let x = 0; x < 320; x += 2) {
      const jitter = ((x * 37) % 7);
      ctx.fillRect(x, H - h - jitter, 2, jitter + 1);
    }
  }

  global.ART = { P, r, player, npcImage, chibi, prop, icon, fog, rain, ash, marker, fogWipe, ICONS };
})(window);
