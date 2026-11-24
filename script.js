/* =========================================================
   B.L.O.O.M. // SECRET BRIEF — interactions
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 40) : ms));
  const pad2 = (n) => String(n).padStart(2, '0');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------------- sound (tiny synth, no files) ---------------- */
  const Snd = {
    ctx: null,
    on: store.get('bloom-snd') !== 'off',
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
    },
    tone(freq, dur = 0.08, { type = 'square', vol = 0.035, delay = 0, slide = 0 } = {}) {
      if (!this.on || !this.ctx) return;
      try {
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + dur + 0.03);
      } catch (e) { /* ignore */ }
    },
    blip() { this.tone(1320, 0.05, { vol: 0.025 }); },
    key() { this.tone(1700 + Math.random() * 700, 0.014, { type: 'triangle', vol: 0.014 }); },
    error() { this.tone(170, 0.18, { type: 'sawtooth', vol: 0.035 }); },
    granted() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, { delay: i * 0.09, vol: 0.04 })); },
    fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.17, { type: 'triangle', delay: i * 0.11, vol: 0.07 })); },
    sad() { [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.28, { type: 'triangle', delay: i * 0.22, vol: 0.06 })); },
    boom() {
      this.tone(140, 1.3, { type: 'sawtooth', vol: 0.09, slide: -110 });
      this.tone(70, 1.5, { type: 'square', vol: 0.05, slide: -40 });
    },
  };
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => Snd.unlock(), { passive: true }));

  const sndBtn = $('#sndBtn');
  const renderSnd = () => {
    sndBtn.textContent = Snd.on ? 'SND ON' : 'SND OFF';
    sndBtn.setAttribute('aria-pressed', String(Snd.on));
  };
  sndBtn.addEventListener('click', () => {
    Snd.on = !Snd.on;
    store.set('bloom-snd', Snd.on ? 'on' : 'off');
    renderSnd();
    Snd.blip();
  });
  renderSnd();

  /* ---------------- clock + issue date ---------------- */
  const clock = $('#clock');
  const tickClock = () => {
    const d = new Date();
    clock.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };
  tickClock();
  setInterval(tickClock, 1000);

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const today = new Date();
  $('#issued').textContent = `${pad2(today.getDate())} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  /* ---------------- text effects ---------------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@<>/\\*';
  function scramble(el, duration = 1000, glyphs = GLYPHS) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    if (reduce) { el.textContent = final; return Promise.resolve(); }
    const chars = [...final];
    const at = chars.map((_, i) => (i / chars.length) * duration * 0.7 + Math.random() * duration * 0.3);
    const start = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const t = now - start;
        let out = '';
        let done = true;
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          if (ch === ' ' || t >= at[i]) out += ch;
          else { done = false; out += glyphs[(Math.random() * glyphs.length) | 0]; }
        }
        el.textContent = out;
        if (done) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  // Wrap every character in a span (words kept unbreakable) so the note can type out
  // without the layout jumping around.
  function prepType(container) {
    const chars = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!node.nodeValue.trim()) return;
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.append(document.createTextNode(tok)); return; }
        const w = document.createElement('span');
        w.className = 'w';
        for (const ch of tok) {
          const c = document.createElement('span');
          c.className = 'ch';
          c.textContent = ch;
          w.append(c);
          chars.push(c);
        }
        frag.append(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return chars;
  }

  /* ---------------- gate: boot + fingerprint ---------------- */
  const gate = $('#gate');
  const app = $('#app');
  const bootlog = $('#bootlog');
  const scanner = $('#scanner');
  const gateHint = $('#gateHint');
  let fast = false;

  const BOOT = [
    ['INITIALISING SECURE TERMINAL', 'OK', 'ok'],
    ['ESTABLISHING ENCRYPTED UPLINK', 'OK', 'ok'],
    ['BOUNCING SIGNAL OFF 7 SATELLITES', 'OK', 'ok'],
    ['SWEEPING ROOM FOR MASSIMO DUTTI SPIES', 'CLEAR', 'ok'],
    ['AUDITING AGENCY TOWEL INVENTORY', 'COMPROMISED', 'bad'],
    ['LOCATING AGENT JULIA777', 'FOUND', 'ok'],
  ];

  async function boot() {
    gate.addEventListener('pointerdown', () => { if (scanner.hidden) fast = true; });
    await sleep(400);
    for (const [txt, st, cls] of BOOT) {
      const ln = document.createElement('div');
      ln.className = 'ln';
      const tx = document.createElement('span');
      const lead = document.createElement('span');
      lead.className = 'lead';
      const s = document.createElement('span');
      s.className = 'st';
      ln.append(tx, lead, s);
      bootlog.append(ln);
      const full = '> ' + txt;
      if (fast || reduce) tx.textContent = full;
      else {
        for (let i = 1; i <= full.length; i++) {
          tx.textContent = full.slice(0, i);
          if (fast) { tx.textContent = full; break; }
          await sleep(11);
        }
      }
      await sleep(fast ? 30 : 220);
      s.textContent = st;
      s.classList.add(cls);
      if (cls === 'bad') Snd.error(); else Snd.blip();
      await sleep(fast ? 20 : 120);
    }
    await sleep(fast ? 80 : 450);
    gateHint.hidden = true;
    scanner.hidden = false;
    $('#scanPad').focus({ preventScroll: true });
  }

  const padEl = $('#scanPad');
  const ring = $('#scanRing');
  const status = $('#scanStatus');
  const CIRC = 2 * Math.PI * 56;
  const HOLD_MS = 1600;
  let prog = 0;
  let holding = false;
  let last = 0;
  let rafId = 0;
  let granted = false;
  let beepAcc = 0;

  const setStatus = (t, cls = '') => { status.textContent = t; status.className = 'scanner__status ' + cls; };

  function scanLoop(now) {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    prog = holding ? Math.min(1, prog + dt / HOLD_MS) : Math.max(0, prog - dt / 700);
    ring.style.strokeDashoffset = String(CIRC * (1 - prog));
    if (holding) {
      beepAcc += dt;
      if (beepAcc > 130) { beepAcc = 0; Snd.tone(500 + prog * 1000, 0.03, { vol: 0.02 }); }
      setStatus(`SCANNING… ${pad2(Math.min(99, Math.round(prog * 100)))}%`);
    }
    if (prog >= 1) { rafId = 0; grant(); return; }
    if (holding || prog > 0) rafId = requestAnimationFrame(scanLoop);
    else { rafId = 0; last = 0; }
  }
  function startHold(e) {
    if (granted || scanner.hidden) return;
    if (e && e.cancelable) e.preventDefault();
    holding = true;
    padEl.classList.add('scanning');
    if (!rafId) { last = 0; rafId = requestAnimationFrame(scanLoop); }
  }
  function endHold() {
    if (!holding || granted) return;
    holding = false;
    padEl.classList.remove('scanning');
    if (prog < 1) { setStatus('SCAN INTERRUPTED. KEEP HOLDING', 'warn'); Snd.error(); }
    if (!rafId) rafId = requestAnimationFrame(scanLoop);
  }
  padEl.addEventListener('pointerdown', (e) => {
    try { padEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    startHold(e);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => padEl.addEventListener(ev, endHold));
  padEl.addEventListener('contextmenu', (e) => e.preventDefault());
  padEl.addEventListener('click', (e) => e.preventDefault());
  padEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) startHold();
    }
  });
  padEl.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endHold(); }
  });

  async function grant() {
    granted = true;
    holding = false;
    padEl.classList.remove('scanning');
    padEl.classList.add('done');
    ring.style.strokeDashoffset = '0';
    setStatus('MATCH FOUND ✓ AGENT JULIA777', 'ok');
    Snd.granted();
    await sleep(750);
    gate.classList.add('is-granted');
    await sleep(1600);
    unlock();
  }

  function unlock() {
    document.body.classList.remove('locked');
    document.body.classList.add('unlocked');
    gate.setAttribute('aria-hidden', 'true');
    app.inert = false;
    window.scrollTo(0, 0);
    initMain();
    setTimeout(() => { gate.hidden = true; }, 900);
  }

  /* ---------------- main page ---------------- */
  let mainReady = false;

  function initMain() {
    if (mainReady) return;
    mainReady = true;

    const heroTitle = $('#heroTitle');
    heroTitle.focus({ preventScroll: true });
    $$('[data-scramble]', heroTitle).forEach((el, i) => setTimeout(() => scramble(el, 1100), 200 + i * 260));

    // Note: prepare typewriter before it scrolls into view
    const note = $('#note');
    const noteBody = $('#noteBody');
    const noteChars = prepType(noteBody);
    noteBody.classList.add('typing');
    let skipNote = false;
    const noteSkip = $('#noteSkip');
    const finishNote = () => {
      noteChars.forEach((c) => c.classList.add('on'));
      noteBody.classList.remove('typing');
      $$('.ch.cur', noteBody).forEach((c) => c.classList.remove('cur'));
      noteSkip.hidden = true;
      note.classList.add('signed');
    };
    noteSkip.addEventListener('click', () => { skipNote = true; finishNote(); Snd.blip(); });

    async function typeNote() {
      if (reduce) { finishNote(); return; }
      await sleep(500);
      let prev = null;
      for (let i = 0; i < noteChars.length; i++) {
        if (skipNote) return;
        const c = noteChars[i];
        c.classList.add('on', 'cur');
        if (prev) prev.classList.remove('cur');
        prev = c;
        if (i % 2 === 0) Snd.key();
        const ch = c.textContent;
        const next = noteChars[i + 1];
        const endOfWord = !next || next.parentNode !== c.parentNode;
        await sleep(/[.!?…]/.test(ch) && endOfWord ? 230 : /[,]/.test(ch) ? 110 : 13);
      }
      finishNote();
    }

    // Reveal-on-scroll + per-element hooks
    const hooks = new Map([
      [note, typeNote],
      [$('#mapGrid'), startMap],
    ]);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add('in');
        io.unobserve(el);
        $$('[data-scramble]', el).forEach((s) => scramble(s, 900));
        const hook = hooks.get(el);
        if (hook) hook();
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));

    // Scroll progress bar
    const bar = $('#scrollBar');
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    initIdCard();
    initRedactions();
    buildMap();
    initCta();
    initDestruct();
  }

  /* ---------------- ID card tilt ---------------- */
  function initIdCard() {
    if (!finePointer || reduce) return;
    const card = $('#idcard');
    const inner = $('.idcard__inner', card);
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      inner.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
      inner.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      inner.style.setProperty('--ry', '0deg');
      inner.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------------- redactions ---------------- */
  function initRedactions() {
    $$('.redact').forEach((el) => {
      el.setAttribute('aria-pressed', 'false');
      const toggle = () => {
        const on = el.classList.toggle('revealed');
        el.setAttribute('aria-pressed', String(on));
        Snd.blip();
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ---------------- tactical map ---------------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    if (parent) parent.append(el);
    return el;
  };
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const riverY = (x) => 372 + 34 * Math.sin(x / 105 + 0.6);

  function buildMap() {
    const rnd = mulberry32(777);
    const AVE_X = [200, 450];
    const AVE_Y = [150, 250];
    const PARKS = [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 500, y: 200, w: 100, h: 50 },
      { x: 350, y: 400, w: 100, h: 100 },
    ];
    const SPECIAL = { '100,450': 'hq', '300,200': 'florist', '650,100': 'target' };

    let d = '';
    for (let x = -20; x <= 820; x += 10) d += (x === -20 ? 'M' : 'L') + x + ' ' + riverY(x).toFixed(1) + ' ';
    ['#mapRiverEdge', '#mapRiver', '#mapRiverFlow'].forEach((s) => $(s).setAttribute('d', d));

    const gP = $('#mapParks');
    PARKS.forEach((p) => svgEl('rect', { x: p.x + 5, y: p.y + 5, width: p.w - 10, height: p.h - 10, rx: 3, class: 'park' }, gP));
    const inPark = (x, y) => PARKS.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);

    const gB = $('#mapBlocks');
    const gS = $('#mapSpecial');
    for (let x0 = 0; x0 < 800; x0 += 50) {
      for (let y0 = 0; y0 < 500; y0 += 50) {
        if (inPark(x0 + 1, y0 + 1)) continue;
        if ([x0, x0 + 25, x0 + 50].some((x) => { const ry = riverY(x); return ry > y0 - 18 && ry < y0 + 68; })) continue;
        const l = x0 + (AVE_X.includes(x0) ? 7 : 4);
        const r = x0 + 50 - (AVE_X.includes(x0 + 50) ? 7 : 4);
        const t = y0 + (AVE_Y.includes(y0) ? 7 : 4);
        const b = y0 + 50 - (AVE_Y.includes(y0 + 50) ? 7 : 4);
        const key = x0 + ',' + y0;
        if (SPECIAL[key]) {
          svgEl('rect', { x: l, y: t, width: r - l, height: b - t, rx: 1.5, class: 'special special--' + SPECIAL[key] }, gS);
          continue;
        }
        const w = r - l;
        const h = b - t;
        const g = 2.2;
        const mode = Math.floor(rnd() * 4);
        const rects = [];
        if (mode === 0) rects.push([l, t, w, h]);
        else if (mode === 1) { const s = w * (0.35 + rnd() * 0.3); rects.push([l, t, s - g / 2, h], [l + s + g / 2, t, w - s - g / 2, h]); }
        else if (mode === 2) { const s = h * (0.35 + rnd() * 0.3); rects.push([l, t, w, s - g / 2], [l, t + s + g / 2, w, h - s - g / 2]); }
        else {
          const sx = w * (0.4 + rnd() * 0.2);
          const sy = h * (0.4 + rnd() * 0.2);
          rects.push(
            [l, t, sx - g / 2, sy - g / 2], [l + sx + g / 2, t, w - sx - g / 2, sy - g / 2],
            [l, t + sy + g / 2, sx - g / 2, h - sy - g / 2], [l + sx + g / 2, t + sy + g / 2, w - sx - g / 2, h - sy - g / 2],
          );
        }
        rects.forEach(([x, y, ww, hh]) => svgEl('rect', {
          x: x.toFixed(1), y: y.toFixed(1), width: ww.toFixed(1), height: hh.toFixed(1),
          class: rnd() < 0.25 ? 'blk blk--b' : 'blk',
        }, gB));
      }
    }

    const by = riverY(200);
    svgEl('rect', { x: 193, y: (by - 22).toFixed(1), width: 14, height: 44, class: 'bridge' }, $('#mapBridge'));

    // crosshair + live coordinates
    const map = $('#mapFrame');
    const cross = $('#mapCross');
    const coords = $('#mapCoords');
    const DEFAULT_COORDS = coords.textContent;
    const track = (e) => {
      const r = map.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      cross.style.setProperty('--mx', (px * 100).toFixed(2) + '%');
      cross.style.setProperty('--my', (py * 100).toFixed(2) + '%');
      const lat = (77.777 + (0.5 - py) * 0.02).toFixed(4);
      const lon = (7.777 + (px - 0.5) * 0.03).toFixed(4).padStart(7, '0');
      coords.textContent = `LAT ${lat}°N · LON ${lon}°E`;
      cross.classList.add('on');
    };
    map.addEventListener('pointermove', track);
    map.addEventListener('pointerdown', track);
    map.addEventListener('pointerleave', () => { cross.classList.remove('on'); coords.textContent = DEFAULT_COORDS; });
  }

  let mapStarted = false;
  function startMap() {
    if (mapStarted) return;
    mapStarted = true;
    const map = $('#mapFrame');
    map.classList.add('live');
    Snd.tone(220, 0.4, { type: 'sine', vol: 0.04, slide: 600 });

    const route = $('#routeTrail');
    const L = route.getTotalLength();
    route.style.strokeDasharray = String(L);
    route.style.strokeDashoffset = String(L);
    const agent = $('#agentDot');
    const agentLabel = $('#agentLabel');
    const teleDist = $('#teleDist');
    const teleAgent = $('#teleAgent');
    const FLORIST = 400; // path length where the route passes the florist
    const M_PER_UNIT = 1.5;

    const place = (s) => {
      const p = route.getPointAtLength(s);
      agent.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      agentLabel.style.setProperty('--x', p.x.toFixed(1));
      agentLabel.style.setProperty('--y', p.y.toFixed(1));
      route.style.strokeDashoffset = String(L - s);
      teleDist.textContent = (((L - s) * M_PER_UNIT) / 1000).toFixed(2) + ' KM';
    };

    // telemetry flavour
    const teleCoords = $('#teleCoords');
    setInterval(() => scramble(teleCoords, 700, '0123456789'), 4200);
    const meterFill = $('#meterFill');
    const meterVal = $('#meterVal');
    setInterval(() => {
      const v = 6 + Math.round(Math.random() * 14);
      meterFill.style.width = v + '%';
      meterVal.textContent = v + '%';
    }, 2600);

    if (reduce) {
      place(L);
      teleAgent.textContent = 'IN POSITION';
      return;
    }

    const phases = [
      { from: 0, to: FLORIST, dur: 5200, status: 'EN ROUTE TO FLORIST' },
      { pause: 1900, status: 'COLLECTING BOUQUET' },
      { from: FLORIST, to: L, dur: 6200, status: 'EN ROUTE TO TARGET' },
      { pause: 3400, status: 'IN POSITION ✓' },
    ];
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    let pi = 0;
    let t0 = 0;
    let elapsed = 0;
    let visible = true;
    let raf = 0;

    const setPhase = (i, now) => {
      pi = i;
      t0 = now;
      teleAgent.textContent = phases[pi].status;
      teleAgent.className = phases[pi].pause ? 'ok' : '';
      if (phases[pi].pause) Snd.blip();
    };
    const frame = (now) => {
      if (!visible) { raf = 0; return; }
      const ph = phases[pi];
      elapsed = now - t0;
      if (ph.pause) {
        if (elapsed >= ph.pause) {
          const nextI = (pi + 1) % phases.length;
          if (nextI === 0) place(0);
          setPhase(nextI, now);
        }
      } else {
        const k = Math.min(1, elapsed / ph.dur);
        place(ph.from + (ph.to - ph.from) * ease(k));
        if (k >= 1) setPhase((pi + 1) % phases.length, now);
      }
      raf = requestAnimationFrame(frame);
    };

    place(0);
    setTimeout(() => {
      const now = performance.now();
      setPhase(0, now);
      raf = requestAnimationFrame(frame);
      const vis = new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (visible && !raf) {
          t0 = performance.now() - elapsed;
          raf = requestAnimationFrame(frame);
        }
      });
      vis.observe(map);
    }, 1500);
  }

  /* ---------------- final question ---------------- */
  let answered = false;
  let armDestruct = () => {};

  function petals(n = 70) {
    if (reduce) return;
    const colors = ['#ff8fb1', '#ff5c8a', '#ffc2d4', '#ffffff', '#ffd6e0', '#e8436f', '#ffbf4d'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      const s = 9 + Math.random() * 12;
      p.style.cssText = [
        `--x:${(Math.random() * 100).toFixed(1)}vw`,
        `--drift:${((Math.random() * 2 - 1) * 28).toFixed(1)}vw`,
        `--rot:${((Math.random() * 2 - 1) * 720).toFixed(0)}deg`,
        `--dur:${(3.2 + Math.random() * 3).toFixed(2)}s`,
        `--delay:${(Math.random() * 1.4).toFixed(2)}s`,
        `--s:${s.toFixed(1)}px`,
        `--c:${colors[i % colors.length]}`,
      ].join(';');
      p.addEventListener('animationend', () => p.remove());
      frag.append(p);
    }
    document.body.append(frag);
  }

  function initCta() {
    const btns = $('#ctaBtns');
    const yes = $('#btnYes');
    const no = $('#btnNo');
    const result = $('#ctaResult');
    const stamp = $('#ctaStamp');
    const msg = $('#ctaMsg');
    const teleMission = $('#teleMission');
    const LABELS = ['NEGATIVE', 'ARE YOU SURE?', 'THINK OF THE FLOWERS', 'FINE. NEGATIVE.'];
    const MAX_TRIES = LABELS.length - 1;
    let tries = 0;

    const bump = () => {
      tries = Math.min(MAX_TRIES, tries + 1);
      no.textContent = LABELS[tries];
      Snd.error();
    };

    // Desktop: the button runs away from the cursor (a few times).
    const dodge = () => {
      const box = btns.getBoundingClientRect();
      const dx0 = parseFloat(no.style.getPropertyValue('--dx')) || 0;
      const dy0 = parseFloat(no.style.getPropertyValue('--dy')) || 0;
      const nb = no.getBoundingClientRect();
      const homeL = nb.left - dx0 - box.left;
      const homeT = nb.top - dy0 - box.top;
      const yb = yes.getBoundingClientRect();
      const padding = 18;
      for (let k = 0; k < 40; k++) {
        const x = Math.random() * Math.max(0, box.width - nb.width);
        const y = Math.random() * Math.max(0, box.height - nb.height);
        const L = box.left + x; const T = box.top + y;
        const overlap = !(L + nb.width < yb.left - padding || L > yb.right + padding || T + nb.height < yb.top - padding || T > yb.bottom + padding);
        const far = Math.hypot(L - nb.left, T - nb.top) > 140;
        if (!overlap && far) {
          no.style.setProperty('--dx', (x - homeL).toFixed(0) + 'px');
          no.style.setProperty('--dy', (y - homeT).toFixed(0) + 'px');
          return;
        }
      }
    };

    no.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !finePointer || tries >= MAX_TRIES) return;
      dodge();
      bump();
    });
    no.addEventListener('click', () => {
      if (tries < MAX_TRIES) {
        // Touch / keyboard: the button shrinks and protests instead.
        bump();
        no.style.setProperty('--s', String(1 - tries * 0.12));
        no.classList.remove('shake'); void no.offsetWidth; no.classList.add('shake');
        return;
      }
      respond(false);
    });
    yes.addEventListener('click', () => respond(true));

    function respond(accepted) {
      btns.hidden = true;
      result.hidden = false;
      stamp.textContent = accepted ? 'MISSION ACCEPTED' : 'MISSION ON STANDBY';
      stamp.classList.toggle('no', !accepted);
      stamp.classList.remove('go'); void stamp.offsetWidth; stamp.classList.add('go');
      if (accepted) {
        msg.innerHTML = 'Outstanding, Agent Julia777. Proceed to <b>the Madhouse</b>, collect the package from your handler, look casual and act natural. Do <b>not</b> mention the towels.<br><br>Confirm with your handler on the usual secure channel (yes, that chat) using the code word:<br><span class="code">PETAL STRIKE</span>';
        teleMission.textContent = 'ACCEPTED ✓';
        teleMission.className = 'ok';
        Snd.fanfare();
        petals();
      } else {
        msg.innerHTML = 'Copy that, Agent. Operation Petal Strike is on standby. The flowers will wait in the safe house. They are very patient flowers.<br><br>Tell your handler when you will be around.';
        teleMission.textContent = 'ON STANDBY';
        teleMission.className = 'amber';
        Snd.sad();
      }
      stamp.setAttribute('tabindex', '-1');
      stamp.focus({ preventScroll: true });
      answered = true;
      setTimeout(armDestruct, 2500);
    }

    $('#ctaReset').addEventListener('click', () => {
      result.hidden = true;
      btns.hidden = false;
      tries = 0;
      no.textContent = LABELS[0];
      no.style.removeProperty('--dx');
      no.style.removeProperty('--dy');
      no.style.removeProperty('--s');
      teleMission.textContent = 'AWAITING YOUR ANSWER';
      teleMission.className = 'amber';
      yes.focus({ preventScroll: true });
    });
  }

  /* ---------------- self-destruct ---------------- */
  function initDestruct() {
    const section = $('#destruct');
    const timer = $('#destructTimer');
    const msg = $('#destructMsg');
    let started = false;

    // The countdown only arms once Agent Julia777 has answered the final question,
    // so the page never "explodes" while she is still reading it.
    let visible = false;
    const maybeStart = () => {
      if (started || !visible || !answered) return;
      started = true;
      run();
    };
    armDestruct = maybeStart;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      maybeStart();
    }, { threshold: 0.6 });
    io.observe(section);

    async function run() {
      let n = 10;
      const show = () => {
        timer.textContent = '00:' + pad2(n);
        timer.classList.remove('tick'); void timer.offsetWidth; timer.classList.add('tick');
      };
      show();
      while (n > 0) {
        await sleep(1000);
        n -= 1;
        show();
        Snd.tone(n <= 3 ? 1250 : 880, 0.08, { vol: 0.035 });
      }
      Snd.boom();
      document.body.classList.add('destruct-fx');
      await sleep(1700);
      document.body.classList.remove('destruct-fx');
      timer.textContent = 'ABORTED';
      timer.classList.add('aborted');
      msg.hidden = false;
    }

    $('#replayBtn').addEventListener('click', () => {
      window.location.href = window.location.pathname + window.location.search;
    });
  }

  /* ---------------- start ---------------- */
  if (window.location.hash === '#open') {
    gate.hidden = true;
    unlock();
  } else {
    app.inert = true;
    boot();
  }
})();
