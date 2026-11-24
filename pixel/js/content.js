/* 雾崎来信 · 像素探索版 · 内容数据
 * 依据：01 世界背景 / 02 章节剧情（四站大纲）/ 03 核心设定
 * 结构：六处场景 × 信外/信内，线索三型 × 三张 → 合成三条规则，
 *       九处三律，回访三选二，终点四结局。
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------ 色板
  const C = {
    ink: '#0B1018', deep: '#131C28', wall: '#1B2430', slate: '#253347',
    dusk: '#3E5164', steel: '#587485', mist: '#7E96A8', pale: '#A2B6C2',
    fog: '#E9EEF0', paper: '#F6F0E2', ash: '#9AA0A0',
    wine: '#5C1A2A', rust: '#8C2F26', ember: '#E8792B'
  };

  // ------------------------------------------------------------ 线索
  const CLUES = {
    // 邮戳
    st_41: {
      type: 'stamp', no: '01', title: '投递段戳 · 4-1',
      text: '药局信箱最上面那封没贴邮票。信封角上盖着投递段的戳：4-1。',
      note: '清单第一行是 4-2 不是门牌，是第 4 投递段第 2 封。'
    },
    st_1107: {
      type: 'stamp', no: '02', title: '印刷戳 · 11.07',
      text: '死亡日期那一栏被盖章机反复吐出来：1974.11.07。边缘太齐，是印刷的。',
      note: '手盖的戳，墨会晕；印刷的戳，日期永远一样。'
    },
    st_blank: {
      type: 'stamp', no: '03', title: '空白邮戳',
      text: '信封上有一圈邮戳的压痕，里面什么都没有。',
      note: '没有邮戳，所以它还没成为档案，所以它还是「信」。'
    },
    // 信纸
    pa_wet: {
      type: 'paper', no: '04', title: '玻璃上的湿信',
      text: '整封信贴在药局玻璃上，边角化开了，字迹一个都没糊。',
      note: '它是从玻璃里面贴上去的。'
    },
    pa_blank: {
      type: 'paper', no: '05', title: '拆开的空白信',
      text: '内页纯白。边缘有一圈花边勒出来的压痕，像有人用蕾丝信封把它寄给了自己。',
      note: '信纸的暖白，是全片唯一不参与调色的颜色。'
    },
    pa_sleeve: {
      type: 'paper', no: '06', title: '袖口里的信',
      text: '针脚细到看不见。读到一半你才发现：这是你的笔迹。',
      note: '收件人一栏写着 黑羽纱夜。'
    },
    // 票根
    ti_card: {
      type: 'ticket', no: '07', title: '你的考勤卡',
      text: '最后一格的时间是 5:40。七年，每一天都是 5:40。',
      note: '信外的钟停在 5:40。'
    },
    ti_vend: {
      type: 'ticket', no: '08', title: '自动贩卖机的车票',
      text: '投币口长着牙。吐出来的车票印着 1974.11.07 —— 这张票比你大二十岁。',
      note: '同一块广告牌上也写着两个年份。'
    },
    ti_ward: {
      type: 'ticket', no: '09', title: '住院簿的编号签',
      text: '1974 年那一页被剪过，剪口很齐，和你档案室那把剪刀的剪法一样。',
      note: '编号 3,001。名字那一栏空了。'
    }
  };

  const CLUE_TYPES = {
    stamp: { name: '邮戳', hint: '三张邮戳，能拼出信怎么到两次' },
    paper: { name: '信纸', hint: '三张信纸，能拼出哪里能走' },
    ticket: { name: '票根', hint: '三张票根，能拼出这座城的钟' }
  };

  const RULES = {
    R1: {
      id: 'R1', name: '重复律', type: 'stamp',
      text: '信内的东西会重复。真东西不会重复两次以上。',
      sub: '同一封信会到两次。真的那封，邮戳手盖，墨会晕；假的那封，印刷，边缘太齐，日期永远是 11.07。'
    },
    R3: {
      id: 'R3', name: '擦字律', type: 'paper',
      text: '写过字的地方会被擦掉，空白的地方永远安全。',
      sub: '字是墙，也是陷阱；空白是路。整部游戏你都在找空地走，最后发现你自己也变成了一块空白。'
    },
    R2: {
      id: 'R2', name: '停表律', type: 'ticket',
      text: '信外的钟停在 5:40；信内的钟倒着走。',
      sub: '所以判断自己在哪一边，不用看人，看钟。'
    }
  };

  // ------------------------------------------------------------ 场景
  // walk: [x0, x1, yTop, yBottom] 可走区域（脚底坐标）
  // hotspots: form = out / in / both
  const SCENES = {
    office: {
      id: 'office', name: '死信课', sub: '第七年 · 周一 · 8:00',
      bg: 'office', walk: [26, 296, 300, 366],
      intro: {
        out: [
          '八点整到，开窗，戴手套。领件，拆，记，烧。',
          '灰装袋，封口，编号，入库。洗手三遍。七年，每天如此。',
          '今天门口多了一只帆布邮袋。袋身印着：旧港区 · 1974.11.07。',
          '清单第一行：白鹭町 4-2。三千一百二十七封。'
        ],
        in: [
          '办公室里没有人。',
          '盖章机还在动，一张一张往外吐同一份文件：征迁公告，落款 1974.11.07。',
          '灰袋堆到天花板。你在这张桌子上，烧了七年信。'
        ]
      },
      hotspots: [
        {
          id: 'mailbag', form: 'out', x: 232, y: 268, w: 84, h: 104, name: '旧邮袋',
          icon: 'sack',
          lines: [
            '帆布被水泡过，硬得像木板。里面按投递段排好，一封一封捆着。',
            '三千一百二十七封。你不能跳着核销——每核销一封，下一封的地址才显形。',
            '第一封：白鹭町 4-2。'
          ],
          choice: 'O', choiceWhen: (s) => !s.flags.ch_O, once: true
        },
        {
          id: 'desk', form: 'both', x: 24, y: 252, w: 132, h: 100, name: '你的工位',
          icon: 'paper',
          lines: [
            '工位最靠里，正对着那扇不能开的窗。',
            '桌面被磨出一块浅色，正好是两只手肘的位置。'
          ]
        },
        {
          id: 'stamp', form: 'both', x: 96, y: 248, w: 40, h: 40, name: '盖章机',
          icon: 'stamp',
          lines: (s) => s.form === 'in'
            ? ['盖章机自己在动。往下吐的每一张都是征迁公告。', '落款日期：1974.11.07。']
            : ['盖章机。落下去的声音比想象中轻。', '登记只记编号，不记名字——第十条：档不留姓名。'],
          clue: (s) => s.form === 'in' && !s.clues.includes('st_1107') ? 'st_1107' : null
        },
        {
          id: 'desk2', form: 'both', x: 82, y: 240, w: 96, h: 60, name: '第二个工位',
          icon: 'paper',
          lines: ['桌面干净，抽屉锁着。', '上个月调走的人，没在册子上留下名字。']
        },
        {
          id: 'desk3', form: 'both', x: 186, y: 246, w: 108, h: 122, name: '第三个工位',
          icon: 'coat',
          lines: [
            '椅背上还挂着一件外套。没人说那是谁的。',
            '外套的袖口有一小块洗不掉的灰——和你手套上的一样。'
          ],
          flag: 'saw_coat'
        },
        {
          id: 'clock', form: 'both', x: 150, y: 62, w: 44, h: 46, name: '墙上的钟',
          icon: 'clock',
          lines: (s) => s.form === 'in'
            ? ['秒针在倒着走。5:41、5:40、5:39。', '你在这里七年，第一次见它动。']
            : ['5:40。', '你在这里七年，没见过它走。', '考勤卡上最后一格也是 5:40。'],
          clue: (s) => s.form === 'out' && !s.clues.includes('ti_card') ? 'ti_card' : null
        },
        {
          id: 'window', form: 'both', x: 204, y: 92, w: 100, h: 162, name: '窗',
          icon: 'window',
          lines: (s) => s.form === 'in'
            ? ['窗外没有街。是一层压一层的纸。', '纸后面有东西在呼吸，很慢。']
            : ['窗打不开。外面是乳白色的雾，贴地三十公分，像有人忘了收的被子。', '你能看见楼下所有人的鞋，看不见他们的脸。']
        },
        {
          id: 'notice', form: 'both', x: 92, y: 124, w: 64, h: 82, name: '墙上的公告',
          icon: 'paper',
          lines: ['征迁公告。旧港区拆迁改造，限期三个月。', '落款日期比你入职还早。']
        },
        {
          id: 'stub', form: 'in', x: 120, y: 300, w: 60, h: 56, name: '旧存根', icon: 'ticket',
          when: (s) => s.revisit.office,
          lines: [
            '抽屉最里面有一叠存根。挂号信寄出会留一张，这座城也有。',
            '最上面那张：1974.11.07，收件人栏空白。',
            '带着它，结局里就还会有一个名字被记住。'
          ],
          item: '旧存根'
        },
        {
          id: 'coats', form: 'in', x: 188, y: 246, w: 104, h: 122, name: '空着的位子',
          icon: 'coat',
          lines: ['两个位子都空着。外套还挂着。', '你一个人拆的信。']
        }
      ]
    },

    street: {
      id: 'street', name: '白鹭町商店街', sub: '雨后傍晚 · 街心',
      bg: 'street', walk: [18, 300, 300, 366],
      intro: {
        out: [
          '雨刚停。卷帘门半拉，鱼店的水管还在流，地面积水。',
          '每家店的收音机在放同一首演歌，而且同步。',
          '所有钟停在 5:40。雾只漫到脚踝——你看得见所有人的鞋，看不见他们的脸。',
          '街心站着一个撑白伞的女孩。她手里那把是干的，脚边还躺着一把湿透的。'
        ],
        in: [
          '雨开始往上落。',
          '招牌的字在一笔一笔褪。墙变成压在一起的纸，一层一层，边缘发毛。',
          '积水成了墨。地面是一整张信纸：写过字的地方是墙，空白的地方是路。',
          '刚才重复的路人，同时把头转向你。街上的钟开始倒着走。'
        ]
      },
      hotspots: [
        {
          id: 'mio', form: 'out', x: 150, y: 286, w: 56, h: 78, name: '撑白伞的女孩',
          icon: 'umbrella', talk: '雨宫 澪', face: 'mio',
          lines: (s) => {
            if (s.flags.A_done) {
              return [
                '「你是来送信的，还是来收信的。」',
                '你答不上来。',
                '她把干伞往你这边递了一寸，又收回去。'
              ];
            }
            return [
              '「你迟到了。」',
              '你问她在等谁。她说等一封信。',
              '你再问一遍。她一字不差地又说了一遍。'
            ];
          }
        },
        {
          id: 'mailbox', form: 'out', x: 84, y: 296, w: 38, h: 54, name: '药局门口的信箱',
          icon: 'letter',
          lines: [
            '信箱塞爆了。最上面一封没贴邮票，信封角上盖着投递段的戳：4-1。',
            '你翻清单：第一行 4-2，第二行 4-1。',
            '4-2 不是门牌，是第 4 投递段第 2 封。'
          ],
          clue: 'st_41',
          choice: 'A', choiceWhen: (s) => !s.flags.A_done
        },
        {
          id: 'glass', form: 'out', x: 22, y: 226, w: 34, h: 52, name: '玻璃上的湿信',
          icon: 'paper',
          lines: [
            '橱窗玻璃上贴着一封湿信，边角化开，字迹一个都没糊。',
            '你伸手去揭，指尖碰到的是玻璃内侧。',
            '它是从玻璃里面贴上去的。'
          ],
          clue: 'pa_wet'
        },
        {
          id: 'vend', form: 'out', x: 82, y: 274, w: 44, h: 40, name: '自动贩卖机',
          icon: 'ticket',
          lines: [
            '投币口长着牙。你投一枚硬币，它嚼了两下。',
            '吐出来的车票印着：1974.11.07。同一块广告牌上写着两个年份。'
          ],
          clue: 'ti_vend'
        },
        {
          id: 'umbrella', form: 'out', x: 34, y: 316, w: 92, h: 76, name: '湿透的白伞',
          icon: 'umbrella',
          lines: ['地上那把伞是湿的，一直在滴水。可这条街的雨，落在伞上没有声音。', '伞骨上挂着一枚湿透的票根，字已经化了。']
        },
        {
          id: 'board', form: 'out', x: 240, y: 56, w: 52, h: 92, name: '霓虹招牌',
          icon: 'lantern',
          lines: ['霓虹亮着，可所有灯都是纸的颜色。', '招牌上的字少了一笔。你盯着看，那一笔自己补上了。']
        },
        {
          id: 'her', form: 'in', x: 132, y: 268, w: 60, h: 104, name: '水上的那个人',
          icon: 'mirror', talk: '？？？',
          lines: [
            '水面上站着一个人。黑裙子，白头发，眼睛上缠着黑蕾丝。',
            '她没有倒影——她本身就是倒影。',
            '头上没有胡萝卜。',
            '「这一次，你比上一次来得早。」'
          ],
          choice: 'B', choiceWhen: (s) => !s.flags.B_done
        },
        {
          id: 'paper_ground', form: 'in', x: 40, y: 312, w: 120, h: 50, name: '信纸地面',
          icon: 'paper',
          lines: [
            '地面是一张巨大的信纸。写过字的地方鼓成墙，空白的地方才是路。',
            '你踩过的每一处空白，都在你身后慢慢被字填满。'
          ]
        },
        {
          id: 'clock_in', form: 'in', x: 236, y: 66, w: 52, h: 92, name: '倒着走的钟',
          icon: 'clock',
          lines: ['街上的钟开始倒着走。5:41、5:40、5:39。', '你终于知道，判断自己在哪一边，不用看人，看钟。']
        }
      ]
    },

    sanatorium: {
      id: 'sanatorium', name: '白蔷薇疗养院', sub: '阳光房 · 下午茶',
      bg: 'sanatorium', walk: [16, 304, 300, 366],
      intro: {
        out: [
          '白瓷砖、玫瑰壁纸、蕾丝窗帘。所有门没有把手，只能推。',
          '三只骨瓷杯，三把椅子，只有一位病人。第三只杯子一直温着。',
          '走廊尽头有童声合唱，走过去就停。',
          '墙上挂着架空时代的公共卫生宣传画：「健康即服从」。'
        ],
        in: [
          '走廊变成折痕，一层压一层，越往里越窄。',
          '玫瑰壁纸的花是缝上去的，线头还在。蕾丝变成胶带，把门缝一圈圈封死。',
          '茶具里是黑色的水。阳光房变成一排手术灯。'
        ]
      },
      hotspots: [
        {
          id: 'vira', form: 'out', x: 150, y: 300, w: 64, h: 84, name: '窗边的病人',
          icon: 'crown', talk: '薇拉·K·艾希霍恩', face: 'vira',
          lines: (s) => {
            if (s.flags.C_done) {
              return ['「现在有两个了。」', '她把第三只杯子往你这边推了一寸。杯里有水，没有茶。'];
            }
            return [
              '金色的头发，狼耳的轮廓，头顶一顶不算新的冠。',
              '「这里不是收容，是庇护。」',
              '「现在有两个了。」'
            ];
          },
          choice: 'C', choiceWhen: (s) => !s.flags.C_done
        },
        {
          id: 'cups', form: 'both', x: 42, y: 300, w: 88, h: 46, name: '三只茶杯',
          icon: 'cup',
          lines: (s) => {
            if (s.form === 'in') return ['茶具里是黑色的水。', '水面上浮着一层灰，一动不动。'];
            const base = ['三只骨瓷杯，三把椅子。只有一位病人。'];
            if (s.flags.A_li) base.push('第三只杯是温的——她还「在等」，灯没灭。');
            if (s.flags.A_wu) base.push('第三只杯是干的。薇拉说，商店街那盏灯灭了。');
            if (s.flags.A_ren) base.push('玻璃里提前出现一个洋装的影子，一秒。');
            return base;
          },
          clue: (s) => s.form === 'in' && !s.clues.includes('pa_blank') ? 'pa_blank' : null
        },
        {
          id: 'ward', form: 'both', x: 240, y: 300, w: 60, h: 70, name: '住院簿',
          icon: 'ticket',
          lines: (s) => (s.form === 'in'
            ? ['住院簿泡在黑色的水里，1974 年那一页浮在最上面。', '剪口还在。剪掉的那个名字，还在往外渗字。']
            : [
              '住院簿上 1974 年那一页被剪过，剪口很齐。',
              '和你档案室那把剪刀的剪法一样。',
              '你把那页对着光：剪掉之前留下压痕——一个名字，四个字，第一个字是「黑」。'
            ]),
          clue: 'ti_ward',
          choice: 'D', choiceWhen: (s) => s.form === 'out' && !s.flags.D_done
        },
        {
          id: 'door', form: 'both', x: 292, y: 200, w: 28, h: 120, name: '没有把手的门',
          icon: 'door',
          lines: (s) => s.form === 'in'
            ? ['门缝被蕾丝胶带一圈圈封死。', '你听见门后面有人在数数，数到一半就从头开始。']
            : ['所有门都没有把手，只能推。', '你推了一下。门后面是走廊；走廊尽头有合唱，走过去就停。']
        },
        {
          id: 'chair', form: 'out', x: 196, y: 314, w: 46, h: 56, name: '角落的椅子',
          icon: 'coat',
          lines: [
            '阳光房角落放着一把椅子，椅背上挂着一件外套。',
            '和死信课第三个工位上那件，是同一件。',
            '薇拉说：上一个来的人。'
          ],
          flag: 'saw_third'
        },
        {
          id: 'gramophone', form: 'out', x: 250, y: 214, w: 64, h: 66, name: '留声机',
          icon: 'tape',
          lines: ['唱片在转。唱针是断的。', '声音从别的地方来。']
        },
        {
          id: 'corridor', form: 'in', x: 96, y: 176, w: 130, h: 130, name: '折痕走廊',
          icon: 'wall',
          lines: ['走廊变成折痕，一层压一层。', '走廊比昨天短两米。']
        },
        {
          id: 'lamp', form: 'in', x: 34, y: 190, w: 74, h: 96, name: '阳光房的手术灯',
          icon: 'lantern',
          lines: ['阳光房变成一排手术灯。', '灯下的椅子还是三把。第三把是空的，但椅面上有坐过的凹痕。']
        },
        {
          id: 'crown', form: 'in', x: 150, y: 300, w: 64, h: 84, name: '最后一杯茶', icon: 'crown',
          when: (s) => s.revisit.sanatorium,
          lines: [
            '薇拉给你倒最后一杯茶。',
            '「庇护」和「收容」是同一个词。',
            '她把头上的冠摘下来，放在杯垫上。'
          ],
          item: '王冠'
        }
      ]
    },

    washitsu: {
      id: 'washitsu', name: '黑羽家 · 盲蝶之间', sub: '办公楼第七层 · 门牌 1974',
      bg: 'washitsu', walk: [16, 300, 300, 366],
      intro: {
        out: [
          '现代办公楼里嵌着一间和室。门牌是 1974 年的。',
          '榻榻米、障子、壁龛，壁龛里一枝红彼岸花。',
          '她跪坐着，蒙着黑蕾丝眼带，正在缝和服的袖口。针脚细到看不见，袖子里有东西。',
          '角落里一台录音机在空转，却有声音；一台线被剪断的转盘电话，偶尔会响。'
        ],
        in: [
          '字从信纸里爬出来，铺满障子。',
          '障子变成信封的内衬，纸很薄，后面有东西在呼吸。',
          '全画面去色。只有她头上的胡萝卜还是橙的。'
        ]
      },
      hotspots: [
        {
          id: 'saya', form: 'both', x: 176, y: 296, w: 62, h: 92, name: '跪坐的她',
          icon: 'eyeband', talk: '黑羽 纱夜', face: 'saya',
          lines: (s) => {
            if (s.flags.F_done) return ['「刚才有人在看我。」', '你说没有。', '「有。她每次来，你都在。」'];
            if (s.form === 'in') return ['眼带下面渗出一点黑雾。', '她说话时，嘴型和声音差半秒。'];
            return ['她在缝和服的袖口。针脚细到看不见。', '「别问。问了，我就会被记住。」'];
          },
          choice: 'F', choiceWhen: (s) => s.flags.E_done && !s.flags.F_done
        },
        {
          id: 'sleeve', form: 'out', x: 126, y: 330, w: 62, h: 66, name: '袖口里的信',
          icon: 'paper',
          lines: [
            '袖子里缝着一封信。针脚细到看不见。',
            '「拆开读的人，会记住写信的人。」',
            '（要不要拆？）'
          ],
          choice: 'E', choiceWhen: (s) => !s.flags.E_done
        },
        {
          id: 'carrot', form: 'both', x: 208, y: 252, w: 44, h: 50, name: '胡萝卜',
          icon: 'carrot',
          lines: (s) => s.form === 'in'
            ? ['全画面去色，只有它还是橙的。', '因为信里说的东西，要带在身上才不会被忘掉。']
            : ['她头上别着一根胡萝卜，用黑发带绑着。', '「种下去，明年就能吃到。」她说，「我种不了，所以别在头上。」']
        },
        {
          id: 'tape', form: 'both', x: 240, y: 320, w: 60, h: 40, name: '空转的录音机',
          icon: 'tape',
          lines: ['录音机里没有带子，却在转，而且有声音。', '是 1974 年的儿童合唱。她无声地跟唱，嘴型对不上——她记的是另一版歌词。']
        },
        {
          id: 'phone', form: 'out', x: 64, y: 200, w: 42, h: 90, name: '剪断线的电话',
          icon: 'phone',
          lines: ['线被剪断了。它偶尔会响一声，只响半下。', '你拿起听筒，里面是忙音。']
        },
        {
          id: 'mirror', form: 'in', x: 206, y: 236, w: 46, h: 76, name: '壁龛的镜面',
          icon: 'mirror',
          lines: [
            '镜面有水汽。水汽里站着洋装的她。',
            '她的胡萝卜是刻出来的，表面有刀痕，颜色是刷上去的。',
            '真的那根，在跪着的这个头上。'
          ],
          flag: 'saw_two'
        },
        {
          id: 'shoji', form: 'in', x: 20, y: 150, w: 150, h: 170, name: '障子',
          icon: 'wall',
          clue: (s) => (s.clues.indexOf('pa_sleeve') < 0 ? 'pa_sleeve' : null),
          lines: ['字从信纸里爬出来，铺满障子。', '其中一段写着收件人：黑羽纱夜。', '障子变成信封的内衬。纸很薄，后面有东西在呼吸。']
        },
        {
          id: 'eyeband', form: 'in', x: 118, y: 318, w: 64, h: 46, name: '黑蕾丝眼带', icon: 'eyeband',
          when: (s) => s.revisit.washitsu,
          lines: () => ['屋里没人。榻榻米上留着针、线，和一件缝了一半的和服。袖口是空的。', '眼带叠得很整齐，放在针线盒上。'],
          item: '眼带'
        },
        {
          id: 'carrot_keep', form: 'in', x: 200, y: 250, w: 52, h: 56, name: '留在榻榻米上的胡萝卜', icon: 'carrot',
          when: (s) => s.revisit.washitsu && s.flags.F_none,
          lines: ['那根真的胡萝卜被留在榻榻米上，像谁忘了带走。', '她没被看过，才肯给。'],
          item: '胡萝卜'
        }
      ]
    },

    apartment: {
      id: 'apartment', name: '镜湖公寓', sub: '你家 · 门垫上有一封信',
      bg: 'apartment', walk: [16, 300, 300, 366],
      intro: {
        out: [
          '你家玄关。门垫上有一封信。',
          '收件人写着「你」，寄件人一栏空白，邮戳是手盖的，墨晕开了。',
          '窗外是镜湖——地图上不存在的水面。湖心有一座岛，终年被白雾盖着。',
          '冰箱上的便签字迹每天变淡。餐桌上三份没动的晚饭。'
        ],
        in: [
          '水从地板缝里涨起来，漫过脚踝。',
          '墙皮剥落后，是一整面名字墙：三千个被划掉的名字。',
          '档案盒浮在水面，标签全是你的名字。',
          '窗外，雾屿背面的灰雾在往外渗。'
        ]
      },
      hotspots: [
        {
          id: 'mat', form: 'out', x: 18, y: 328, w: 58, h: 34, name: '门垫上的信',
          icon: 'letter',
          lines: [
            '收件人写着「你」。寄件人一栏空白。',
            '邮戳是手盖的，墨晕开了——这是真信。'
          ],
          choice: 'G', choiceWhen: (s) => !s.flags.G_done
        },
        {
          id: 'wall_photos', form: 'out', x: 236, y: 100, w: 74, h: 120, name: '照片墙',
          icon: 'photo',
          clue: (s) => (s.clues.indexOf('st_1107') < 0 ? 'st_1107' : null),
          lines: (s) => {
            const n = s.flags.D_take ? 10 : 11;
            return [
              '每张照片都有一个人形被剪掉，剪口整齐。每个缺人形的位置，都钉着一只信封。',
              '你数了数：' + (s.flags.D_take ? '十只。十一这个数，你永远拼不出来。' : '十一只。'),
              '十个人来过。你是第十一个。'
            ];
          }
        },
        {
          id: 'fridge', form: 'out', x: 180, y: 140, w: 52, h: 120, name: '冰箱',
          icon: 'paper',
          lines: ['冰箱上的便签字迹每天变淡。', '里面三份没动的晚饭，日期都是 11.07。', '门牌号是 5:40。']
        },
        {
          id: 'window_lake', form: 'both', x: 24, y: 96, w: 116, h: 180, name: '窗外',
          icon: 'window',
          lines: (s) => s.form === 'in'
            ? ['雾散了一角。镜湖湖心那座岛第一次露出轮廓。', '岛上有一盏灯——提着的，会动。']
            : ['镜湖静得像镜子。地图上有名字，没有形状。', '湖心那座岛叫雾屿。你从来没见它有过轮廓。']
        },
        {
          id: 'dinner', form: 'out', x: 78, y: 300, w: 96, h: 56, name: '餐桌',
          icon: 'cup',
          lines: ['三份晚饭，没动过。', '三把椅子。你只记得自己一个人住。']
        },
        {
          id: 'name_wall', form: 'in', x: 150, y: 120, w: 150, h: 130, name: '名字墙',
          icon: 'wall',
          lines: [
            '三千个名字，全被划掉。',
            '你找自己的名字——找不到。',
            '不是被划掉了，是从来没写上去过。第 3,001 行空着。'
          ],
          choice: 'H', choiceWhen: (s) => !s.flags.H_done
        },
        {
          id: 'floatbox', form: 'in', x: 30, y: 300, w: 90, h: 62, name: '浮在水面的档案盒',
          icon: 'sack',
          lines: ['档案盒浮在水面，标签全是你的名字。', '每一封的收件人都是同一个名字——你的。']
        },
        {
          id: 'phone_in', form: 'in', x: 240, y: 290, w: 50, h: 60, name: '电话',
          icon: 'phone',
          lines: ['你接起来，是忙音。挂掉，又响。', '第三次接起来，那边说：「东西送到了吗。」', '你想起规定：开拆须两人在场。那天科室里只有你一个人。'],
          flag: 'heard_phone'
        },
        {
          id: 'window_in', form: 'in', x: 130, y: 300, w: 90, h: 60, name: '水里的窗',
          icon: 'window',
          lines: ['天边出现一道折痕。城市的边缘开始像信封一样折起来。', '水涨到膝盖。']
        }
      ]
    },

    island: {
      id: 'island', name: '雾屿', sub: '镜湖湖心 · 终点站',
      bg: 'island', walk: [20, 300, 318, 346],
      intro: {
        out: [
          '你追到雾屿。她站在雾的边上，背对着你，手里拿着从袖子里取出来的那封信。',
          '你叫她。她没有回头。',
          '白雾和灰雾第一次同框。灰雾悬着不动，贴着水面，一直铺到岛背面。'
        ],
        in: [
          '雾屿背面是旧港区邮局旧址。',
          '灰袋堆在那里，袋子烂了四十年。风一吹，灰贴地起来，不落地。',
          '这些灰，是死信课四十年烧出来的信。你烧的那七年，也在里面。'
        ]
      },
      hotspots: [
        {
          id: 'lady', form: 'out', x: 130, y: 296, w: 60, h: 62, name: '雾边的人',
          icon: 'mirror', talk: '归途',
          lines: ['「你送得很好。」', '你问：你是谁。', '「你猜。」']
        },
        {
          id: 'lantern_isle', form: 'out', x: 196, y: 156, w: 46, h: 52, name: '岛上的灯',
          icon: 'lantern',
          lines: ['岛上有一盏灯，提着的，会动。', '它不照路。它只是让你知道，有人在前面。']
        },
        {
          id: 'water', form: 'out', x: 40, y: 296, w: 100, h: 62, name: '灰雾铺开的水面',
          icon: 'wall',
          lines: ['灰雾贴着水面，悬着不动，也没有声音。', '你吸了一口气。碱味，像烧过的纸。']
        },
        {
          id: 'bags', form: 'in', x: 10, y: 240, w: 70, h: 130, name: '烂掉的灰袋',
          icon: 'sack',
          lines: ['袋子烂了四十年，灰在里面睡着。', '你烧的那七年，也在里面。', '你不是被卷进来的。你是供应链。']
        },
        {
          id: 'pigeonhole', form: 'in', x: 60, y: 70, w: 200, h: 130, name: '分信格',
          icon: 'wall',
          lines: ['整面墙的分信格，各自塞着没送出去的东西。', '有一格是空的。空的那格下面写着 3,001。']
        },
        {
          id: 'empty', form: 'in', x: 120, y: 262, w: 90, h: 62, name: '最后一封',
          icon: 'letter',
          clue: (s) => (s.clues.indexOf('st_blank') < 0 ? 'st_blank' : null),
          lines: [
            '邮局柜台后面有一封信。',
            '没有收件人，没有寄件人，邮戳是空白的。',
            '它一直在等有人把它填完。'
          ],
          choice: 'I', choiceWhen: (s) => !s.flags.I_done
        }
      ]
    }
  };

  // ------------------------------------------------------------ 三律
  // 每个选项：law 常理/雾理/人情，label 选项，cost 代价提示，
  // run(s) 返回 {lines, fog, dev, flags, item, unlock, read, ending}
  const CHOICES = {
    O: {
      prompt: '三千一百二十七封。第一封，怎么核销？',
      options: [
        {
          law: '常理', label: '按流程：领件、登记、装袋、销毁',
          cost: '你被这座城市登记了一次',
          run: () => ({
            lines: ['你把第一封登记进册。编号那一栏空着——第十条：档不留姓名。', '窗外，雾往上抬了一寸。'],
            fog: 8, dev: { li: 1 }, flags: { O_li: true, office_done: true }, unlock: ['street']
          })
        },
        {
          law: '雾理', label: '先不看编号，只看投递段',
          cost: '你比谁都早看懂地址',
          run: () => ({
            lines: ['你把清单翻到最上面：4-2。', '这条街的 4 号后面直接是 6 号。地址不是不存在，是它根本不是地址。'],
            fog: 10, dev: { wu: 1 }, flags: { O_wu: true, office_done: true }, unlock: ['street']
          })
        },
        {
          law: '人情', label: '先读完一整个地址，念出声',
          cost: '雾涨一寸，某个人变得更像人',
          run: () => ({
            lines: ['你念出收件人那一行。', '读出声音的时候，窗外的雾往上抬了一寸。', '三千一百二十七封里，有一封会因此变得很重。'],
            fog: 14, dev: { ren: 1 }, flags: { O_ren: true, office_done: true }, unlock: ['street']
          })
        }
      ]
    },
    A: {
      prompt: '那封 4-2，怎么办？',
      options: [
        {
          law: '常理', label: '按「地址不详」核销，装袋、登记',
          cost: '她可以继续等；你被登记',
          run: () => ({
            lines: ['她背后那把湿伞少了一格影子。', '她可以继续等。', '你被这座城市登记了一次。'],
            fog: 8, dev: { li: 1 }, flags: { A_done: true, A_li: true }
          })
        },
        {
          law: '雾理', label: '按投递段把信送回邮路',
          cost: '她开始变淡',
          run: () => ({
            lines: ['信回到她手里。', '「原来是我寄的。」', '她开始变淡。你拿到同一封信的两枚邮戳——一枚手盖，一枚印刷。'],
            fog: 12, dev: { wu: 1 }, clue: 'st_blank', flags: { A_done: true, A_wu: true }
          })
        },
        {
          law: '人情', label: '不核销。把干伞还给她，陪她站到演歌第二遍',
          cost: '雾涨一寸，她像个人',
          run: () => ({
            lines: ['你什么都没做，只是站在她旁边。', '演歌第二遍的时候，她说了一句不在重复里的话。', '雾涨了一寸。你第一次觉得她像个人。'],
            fog: 16, dev: { ren: 1 }, flags: { A_done: true, A_ren: true }
          })
        }
      ]
    },
    B: {
      prompt: '她站在水面上。问不问她的名字？',
      options: [
        {
          law: '常理', label: '问',
          cost: '她被雾看见了；你被记住了',
          run: () => ({
            lines: ['「别问。问了，我就会被记住。」', '她被雾看见了。你也被记住了。', '雨停。街上只剩你，和一把忘了收的伞。'],
            fog: 12, dev: { li: 1 }, flags: { B_done: true, B_ask: true }, unlock: ['sanatorium']
          })
        },
        {
          law: '人情', label: '不问，接过那把干伞',
          cost: '你带走了一把伞，她留在原地',
          run: () => ({
            lines: ['你把想问的话咽回去。', '她把干伞递给你。你手里多了一把伞，和一场没有下的雨。', '你没有记住她的名字——所以她还在这里。'],
            fog: 6, dev: { ren: 1 }, item: '伞', flags: { B_done: true, B_noask: true }, unlock: ['sanatorium']
          })
        }
      ]
    },
    C: {
      prompt: '今晚，住不住？',
      options: [
        {
          law: '常理', label: '住下',
          cost: '住院簿上多一页，写着你',
          run: () => ({
            lines: ['你住下了。', '夜里住院簿上多了一页，写着你。第二天走廊短了两米。'],
            fog: 10, dev: { li: 1 }, flags: { C_done: true, C_stay: true }, unlock: ['washitsu']
          })
        },
        {
          law: '雾理', label: '指出这扇门没有把手',
          cost: '你学到门是用名字开的',
          run: () => ({
            lines: ['你指出这扇门没有把手。', '走廊开始收紧，天花板下垂。', '你学到：门是用名字开的。她的裙摆被门缝夹住。'],
            fog: 14, dev: { wu: 1 }, flags: { C_done: true, C_rules: true }, unlock: ['washitsu']
          })
        },
        {
          law: '人情', label: '问她 1974 年你几岁',
          cost: '她第一次答不上来',
          run: () => ({
            lines: ['她第一次答不上来。', '「我记得的是那天之前。」', '你发现她不是人，是那页。'],
            fog: 12, dev: { ren: 1 }, flags: { C_done: true, C_age: true }, unlock: ['washitsu']
          })
        }
      ]
    },
    D: {
      prompt: '被剪掉的那一页，怎么办？',
      options: [
        {
          law: '常理', label: '原样放回',
          cost: '她今晚一直坐在阳光房',
          run: () => ({
            lines: ['你把它原样放回去。', '她整晚坐在阳光房盯着那页。雾涨，但她第一次有了颜色。'],
            fog: 8, dev: { li: 1 }, flags: { D_done: true, D_keep: true }
          })
        },
        {
          law: '雾理', label: '带走那页',
          cost: '她的存在度下降',
          run: () => ({
            lines: ['你把那页折好，收进内袋。', '她笑了。', '你带走「1974 的一页」，可以拿来对笔迹、对名字。她的存在度下降了一格。'],
            fog: 12, dev: { wu: 1 }, flags: { D_done: true, D_take: true }
          })
        },
        {
          law: '人情', label: '补上名字',
          cost: '走廊开始合拢',
          run: () => ({
            lines: ['你在空白处补上名字的最后一笔。', '她第一次露出被冒犯的表情。', '走廊开始合拢。你得到「名字开门」的实证。'],
            fog: 16, dev: { ren: 1 }, flags: { D_done: true, D_fill: true, name_fill: true }
          })
        }
      ]
    },
    E: {
      prompt: '袖子里的这封信，怎么办？',
      options: [
        {
          law: '常理', label: '原样缝回去',
          cost: '你保住她的完整，也保住她的黑暗',
          run: () => ({
            lines: ['你把它原样缝回去。针脚细到看不见。', '她什么都没察觉。', '你保住了她的完整，也保住了她的黑暗。'],
            fog: 8, dev: { li: 1 }, flags: { E_done: true, E_sew: true }
          })
        },
        {
          law: '雾理', label: '举向障子，用光读',
          cost: '她反而笑了',
          run: () => ({
            lines: ['你把信举向障子。光透出字。', '你读到规则，也读到收件人：黑羽纱夜。', '她的存在度下降，但她笑了：「原来还能这样用。」'],
            fog: 14, dev: { wu: 1 }, clue: 'pa_sleeve', flags: { E_done: true, E_light: true }
          })
        },
        {
          law: '人情', label: '念给她听',
          cost: '你发现这封信是你写的',
          run: () => ({
            lines: ['你念给她听。念到一半，你发现这封信是你写的。', '笔迹、口气、连划掉的字都一样。', '她的眼带第一次湿了。'],
            fog: 18, dev: { ren: 1 }, clue: 'pa_sleeve', flags: { E_done: true, E_read: true }
          })
        }
      ]
    },
    F: {
      prompt: '问她的名字，还是揭开她的眼带？',
      options: [
        {
          law: '常理', label: '什么都不做',
          cost: '你把这一幕记住',
          run: () => ({
            lines: ['她继续缝。你把这一幕记住。', '这一幕，是终局的一个条件。', '她把胡萝卜往头发里按了按，怕它掉。'],
            fog: 6, dev: { li: 1 }, flags: { F_done: true, F_none: true }
          })
        },
        {
          law: '雾理', label: '揭眼带',
          cost: '你们都被记住了',
          run: () => ({
            lines: ['你伸手，揭下那条黑蕾丝。', '她看见你。你也第一次看见信内的全貌。', '你们都被记住了。'],
            fog: 18, dev: { wu: 1 }, flags: { F_done: true, F_unveil: true }
          })
        },
        {
          law: '人情', label: '问她的名字',
          cost: '同一句话，第二次出现',
          run: () => ({
            lines: ['「别问。问了，我就会被记住。」', '和第一站水面上，同一句话。', '你靠这句话认出她，不靠脸。'],
            fog: 10, dev: { ren: 1 }, flags: { F_done: true, F_ask: true }
          })
        }
      ]
    },
    G: {
      prompt: '门垫上这封信，怎么办？',
      options: [
        {
          law: '常理', label: '装袋上报',
          cost: '袋子是空的',
          run: () => ({
            lines: ['你把信装进证物袋，拉上拉链。', '袋子是空的。', '你被登记。'],
            fog: 8, dev: { li: 1 }, flags: { G_done: true, G_bag: true }
          })
        },
        {
          law: '雾理', label: '寄给自己',
          cost: '它第二天回到门垫上',
          run: () => ({
            lines: ['你把信投进楼下的邮筒。', '第二天早上，它又回到了门垫上。', '邮戳多了一圈。'],
            fog: 12, dev: { wu: 1 }, flags: { G_done: true, G_send: true }
          })
        },
        {
          law: '人情', label: '拆开读',
          cost: '你成为收件人',
          run: () => ({
            lines: ['信封里是你的笔迹。', '三个名字，一个日期：1974.11.07。', '你成为收件人。'],
            fog: 16, dev: { ren: 1 }, flags: { G_done: true, G_read: true }
          })
        }
      ]
    },
    H: {
      prompt: '名字墙。你怎么办？',
      options: [
        {
          law: '常理', label: '不看不碰',
          cost: '水涨得更快',
          run: () => ({
            lines: ['你转过身。', '水涨得更快。你被推着走。'],
            fog: 10, dev: { li: 1 }, flags: { H_done: true, H_none: true }
          })
        },
        {
          law: '雾理', label: '找名字',
          cost: '你早就来过',
          run: () => ({
            lines: ['你逐行找下去。三千行，没有你。', '你数了信封：十一只＝十个前任＋你。', '你早就来过。'],
            fog: 14, dev: { wu: 1 }, flags: { H_done: true, H_find: true }
          })
        },
        {
          law: '人情', label: '摸墙',
          cost: '你摸到自己的笔迹',
          run: () => ({
            lines: ['你伸手摸那面墙。', '你摸到自己的笔迹。', '第二站那个剪口，对上了。'],
            fog: 16, dev: { ren: 1 }, flags: { H_done: true, H_touch: true }
          })
        }
      ]
    },
    I: {
      prompt: '柜台后面那只空信封。你拿它做什么？',
      options: [
        {
          law: '人情', label: '不填。带着胡萝卜，走出雾屿',
          cost: '需要：胡萝卜',
          need: '胡萝卜',
          run: () => ({ lines: ['你没有填。'], ending: 'leave' })
        },
        {
          law: '常理', label: '填「全体居民」，投出去',
          cost: '需要：王冠',
          need: '王冠',
          run: () => ({ lines: ['你写下「全体居民」。'], ending: 'seal' })
        },
        {
          law: '雾理', label: '烧掉信、灰袋、档案室',
          cost: '需要：眼带',
          need: '眼带',
          run: () => ({ lines: ['你点着了它。'], ending: 'ash' })
        },
        {
          law: '常理', label: '不填。接过那盏灯',
          cost: '不需要任何东西',
          run: () => ({ lines: ['你没有填，也没有走。'], ending: 'lamp' })
        },
        {
          law: '——', label: '填「黑羽纱夜」',
          cost: '这不是一条路',
          trap: true,
          run: () => ({
            lines: ['一个人被登记两次，世界会出 bug。', '信自己合上了。你还在原地。', '它只证明一件事：你不能靠写名字救她。']
          })
        }
      ]
    }
  };

  // ------------------------------------------------------------ 结局
  const ENDINGS = {
    leave: {
      key: 'leave', title: '出岛', tag: '真结局',
      lines: [
        '海雾在两边分开。',
        '脚下是湿的沙，前面有光。',
        '你手里握着那根胡萝卜——真的，带着刀口以外的、活着的那点橙。',
        '游戏不告诉你是信内还是信外。也不解释。'
      ]
    },
    seal: {
      key: 'seal', title: '封口', tag: '结局',
      lines: [
        '城市像信封一样折起、封口。',
        '你听见它落地。',
        '手上只剩一张存根。',
        '你替它把手续办完了。'
      ]
    },
    ash: {
      key: 'ash', title: '灰烬', tag: '结局',
      lines: [
        '你烧掉了信，烧掉了灰袋，烧掉了档案室。',
        '雾散了。城市恢复。',
        '所有人都忘了。包括你。',
        '你还活着，但空。'
      ]
    },
    lamp: {
      key: 'lamp', title: '守灯', tag: '结局',
      lines: [
        '不填。你接过那盏灯。',
        '月亮永远不动，水永远不涨。',
        '你成为下一个提灯的人。',
        '雾屿有了新的轮廓。'
      ]
    }
  };

  // 旧存根：结局多留一个名字
  const KEPT_NAMES = {
    A_ren: '雨宫 澪', B_ask: '雨宫 澪', A_li: '雨宫 澪',
    C_age: '薇拉·K·艾希霍恩', D_fill: '黑羽 纱夜', E_read: '黑羽 纱夜',
    F_none: '黑羽 纱夜', H_touch: '黑羽 纱夜'
  };

  const FORM_TEXT = { out: '信外', in: '信内' };

  const GALLERY = [
    { img: 'mio', face: 'mio_face', k: '白伞', name: '雨宫 澪', line: '等一封永远不会到的信', tag: '信外' },
    { img: 'vira', face: 'vira_face', k: '白狼', name: '薇拉·K·艾希霍恩', line: '把收容说成庇护', tag: '边界' },
    { img: 'saya', face: 'saya_face', k: '盲蝶', name: '黑羽 纱夜', line: '自愿蒙眼：看见了，就会被看见', tag: '信内' },
    { img: 'concept_washitsu', k: '概念稿', name: '黑羽家 · 和室', line: '像素探索界面初稿（信外）', tag: '美术' },
    { img: 'concept_washitsu_in', k: '概念稿', name: '和室 · 信内', line: '像素探索界面初稿（信内）', tag: '美术' }
  ];

  const RANK = ['只是在那儿', '让路', '在前面等你'];

  global.CONTENT = {
    C, CLUES, CLUE_TYPES, RULES, SCENES, CHOICES, ENDINGS, KEPT_NAMES,
    FORM_TEXT, GALLERY, RANK
  };
})(window);
