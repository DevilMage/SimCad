(() => {
  'use strict';

  const workspace     = document.querySelector('.canvas-wrap');
  const canvas        = document.getElementById('canvas');
  const ctx           = canvas.getContext('2d');
  const status        = document.getElementById('status');
  const btnBattery    = document.getElementById('btnBattery');
  const btnBattery15  = document.getElementById('btnBattery15');
  const btnLamp       = document.getElementById('btnLamp');
  const btnSwitch     = document.getElementById('btnSwitch');
  const btnMultimeter = document.getElementById('btnMultimeter');
  const btnClear      = document.getElementById('btnClear');
  const btnGrid       = document.getElementById('btnGrid');
  const btnSim        = document.getElementById('btnSim');

  const CELL = 20;
  const registry = window.SchematicComponents || {};

  let gridVisible  = true;
  let activeTool   = null;
  let mouse        = { x: -100, y: -100, inside: false };
  let simulateMode = false;

  const components = [];
  const selection  = new Set();

  let hoveredPin = null;
  let wireDraft = null;

  let isDraggingSelection = false;
  const dragStart = new Map();
  let dragStartMouse = { x: 0, y: 0 };

  let lasso = null;
  let lassoAdditive = false;
  let lassoBaseSelection = null;

  const history = { past: [], future: [], limit: 100, transaction: null };

  let clipboard = [];
  let pasteMode = false;
  let pasteOrigin = { x: 0, y: 0 };

  const LAMP_R    = 45;
  const BATT_RINT = 0.5;
  const SWITCH_R_CLOSED = 0.5;
  const SWITCH_R_OPEN   = 1e9;
  const MM_R_VOLTAGE    = 1e9;
  const MM_R_CURRENT    = 0.1;
  const MM_R_RESISTANCE = 1e9;

  function snap(v) { return Math.round(v / CELL) * CELL; }
  function getSpec(c) { return registry[c.type] || null; }
  function isWire(c) { return c.type === 'wire'; }
  function isBattery(c) { return c.type === 'battery' || c.type === 'battery15'; }

  function pinWorld(comp, pin) {
    return { x: comp.x + pin.x, y: comp.y + pin.y };
  }

  function findPinById(comp, pinId) {
    const spec = getSpec(comp);
    if (!spec || !spec.pins) return null;
    return spec.pins.find(p => p.id === pinId) || null;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function formatVoltage(v) {
    const a = Math.abs(v);
    if (a < 1e-6) return '0.00 В';
    if (a >= 1000) return (v / 1000).toFixed(2) + ' кВ';
    if (a >= 1)    return v.toFixed(2) + ' В';
    if (a >= 1e-3) return (v * 1e3).toFixed(1) + ' мВ';
    return (v * 1e6).toFixed(1) + ' мкВ';
  }
  function formatCurrent(i) {
    const a = Math.abs(i);
    if (a < 1e-9) return '0.00 А';
    if (a >= 1)    return i.toFixed(3) + ' А';
    if (a >= 1e-3) return (i * 1e3).toFixed(1) + ' мА';
    if (a >= 1e-6) return (i * 1e6).toFixed(1) + ' мкА';
    return (i * 1e9).toFixed(1) + ' нА';
  }
  function formatResistance(r) {
    if (!isFinite(r) || r >= 1e10) return '∞';
    if (r < 1)    return r.toFixed(2) + ' Ом';
    if (r < 1000) return r.toFixed(0) + ' Ом';
    if (r < 1e6)  return (r / 1e3).toFixed(2) + ' кОм';
    return (r / 1e6).toFixed(2) + ' МОм';
  }

  function makeDSU() {
    const parent = new Map();
    function find(x) {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
      return parent.get(x);
    }
    function union(a, b) {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    }
    return { find, union };
  }

  function key(comp, pinId) {
    return components.indexOf(comp) + ':' + pinId;
  }

  function buildNodes(dsu) {
    const { find, union } = dsu;

    for (const c of components) {
      const spec = getSpec(c);
      if (!spec || !spec.pins) continue;
      for (const p of spec.pins) find(key(c, p.id));
    }
    for (const w of components) {
      if (!isWire(w)) continue;
      if (!w.endA || !w.endB) continue;
      if (!w.endA.comp || !w.endB.comp) continue;
      union(key(w.endA.comp, w.endA.pinId),
            key(w.endB.comp, w.endB.pinId));
    }
    const geo = [];
    for (const c of components) {
      const spec = getSpec(c);
      if (!spec || !spec.pins) continue;
      for (const p of spec.pins) {
        const w = pinWorld(c, p);
        geo.push({ id: key(c, p.id), x: w.x, y: w.y });
      }
    }
    for (let i = 0; i < geo.length; i++) {
      for (let j = i + 1; j < geo.length; j++) {
        if (Math.hypot(geo[i].x - geo[j].x, geo[i].y - geo[j].y) < 3.5) {
          union(geo[i].id, geo[j].id);
        }
      }
    }
  }

  function indexNodes(dsu) {
    const { find } = dsu;
    const nodeMap = new Map();
    const nodeList = [];
    function getNodeId(comp, pinId) {
      const root = find(key(comp, pinId));
      if (!nodeMap.has(root)) {
        nodeMap.set(root, nodeList.length);
        nodeList.push(root);
      }
      return nodeMap.get(root);
    }
    for (const c of components) {
      const spec = getSpec(c);
      if (!spec || !spec.pins) continue;
      for (const p of spec.pins) getNodeId(c, p.id);
    }
    return { getNodeId, N: nodeList.length };
  }

  function solveCircuit() {
    const batteries = components.filter(isBattery);
    if (batteries.length === 0) return null;

    const dsu = makeDSU();
    buildNodes(dsu);
    const { getNodeId, N } = indexNodes(dsu);

    const NB = batteries.length;
    const size = N + NB;
    const A = Array.from({ length: size }, () => new Float64Array(size));
    const rhs = new Float64Array(size);

    function addResistor(n1, n2, R) {
      if (n1 === undefined || n2 === undefined || n1 === n2) return;
      const g = 1 / Math.max(R, 1e-9);
      A[n1][n1] += g;
      A[n2][n2] += g;
      A[n1][n2] -= g;
      A[n2][n1] -= g;
    }

    batteries.forEach((bat, i) => {
      const nP = getNodeId(bat, 'pos');
      const nN = getNodeId(bat, 'neg');
      addResistor(nP, nN, BATT_RINT);
      const col = N + i;
      if (nP !== undefined) { A[nP][col] += 1; A[col][nP] += 1; }
      if (nN !== undefined) { A[nN][col] -= 1; A[col][nN] -= 1; }
      rhs[col] = bat.voltage || 9;
    });

    for (const c of components) {
      if (c.type === 'lamp') {
        const R = c.burned ? 1e12 : LAMP_R;
        addResistor(getNodeId(c, 'a'), getNodeId(c, 'b'), R);
      } else if (c.type === 'switch') {
        const R = c.closed ? SWITCH_R_CLOSED : SWITCH_R_OPEN;
        addResistor(getNodeId(c, 'a'), getNodeId(c, 'b'), R);
      } else if (c.type === 'multimeter') {
        const R = (c.mode === 'current') ? MM_R_CURRENT :
                  (c.mode === 'resistance') ? MM_R_RESISTANCE : MM_R_VOLTAGE;
        addResistor(getNodeId(c, 'red'), getNodeId(c, 'black'), R);
      }
    }

    const groundNode = getNodeId(batteries[0], 'neg');
    for (let j = 0; j < size; j++) A[groundNode][j] = 0;
    A[groundNode][groundNode] = 1;
    rhs[groundNode] = 0;

    const sol = gauss(A, rhs, size);
    if (!sol) return null;

    return { sol, getNodeId };
  }

  function gauss(A, rhs, n) {
    const M = A.map(row => Float64Array.from(row));
    const v = Float64Array.from(rhs);

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      let maxVal = Math.abs(M[col][col]);
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > maxVal) {
          maxVal = Math.abs(M[r][col]);
          maxRow = r;
        }
      }
      if (maxVal < 1e-12) {
        for (let k = 0; k < n; k++) M[col][k] = 0;
        M[col][col] = 1;
        v[col] = 0;
        continue;
      }
      if (maxRow !== col) {
        const t = M[col]; M[col] = M[maxRow]; M[maxRow] = t;
        const tv = v[col]; v[col] = v[maxRow]; v[maxRow] = tv;
      }
      for (let r = col + 1; r < n; r++) {
        const f = M[r][col] / M[col][col];
        if (f === 0) continue;
        for (let k = col; k < n; k++) M[r][k] -= f * M[col][k];
        v[r] -= f * v[col];
      }
    }

    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = v[i];
      for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  function measureResistance(mm) {
    const dsu = makeDSU();
    buildNodes(dsu);
    const { getNodeId, N } = indexNodes(dsu);

    const A = Array.from({ length: N }, () => new Float64Array(N));
    const I = new Float64Array(N);

    function addResistor(n1, n2, R) {
      if (n1 === undefined || n2 === undefined || n1 === n2) return;
      const g = 1 / Math.max(R, 1e-9);
      A[n1][n1] += g;
      A[n2][n2] += g;
      A[n1][n2] -= g;
      A[n2][n1] -= g;
    }

    for (const c of components) {
      if (c === mm) continue;
      if (c.type === 'lamp') {
        const R = c.burned ? 1e12 : LAMP_R;
        addResistor(getNodeId(c, 'a'), getNodeId(c, 'b'), R);
      } else if (c.type === 'switch') {
        if (c.closed) addResistor(getNodeId(c, 'a'), getNodeId(c, 'b'), SWITCH_R_CLOSED);
      }
    }

    const nR = getNodeId(mm, 'red');
    const nB = getNodeId(mm, 'black');

    if (nR !== nB) addResistor(nR, nB, 1e12);

    I[nR] += 1;
    I[nB] -= 1;

    for (let j = 0; j < N; j++) A[nB][j] = 0;
    A[nB][nB] = 1;
    I[nB] = 0;

    const sol = gauss(A, I, N);
    if (!sol) return Infinity;

    return Math.abs(sol[nR] - sol[nB]);
  }

  function computeLit() {
    if (!simulateMode) {
      for (const c of components) {
        if (c.type === 'lamp' && !c.burned) {
          c.lit = false;
          c.brightness = 0;
        }
        if (c.type === 'multimeter') {
          c.display = '— — —';
        }
      }
      return;
    }

    for (const c of components) {
      if (c.type === 'lamp' && !c.burned) {
        c.lit = false;
        c.brightness = 0;
      }
      if (c.type === 'multimeter') {
        c.display = '— — —';
      }
    }

    const result = solveCircuit();
    if (!result) return;

    const { sol, getNodeId } = result;

    for (const lamp of components) {
      if (lamp.type !== 'lamp') continue;
      if (lamp.burned) continue;

      const nA = getNodeId(lamp, 'a');
      const nB = getNodeId(lamp, 'b');
      const vDiff = Math.abs(sol[nA] - sol[nB]);
      const rated = lamp.ratedVoltage || 9;
      const b = vDiff / rated;

      if (b >= 2) {
        lamp.burned = true;
        lamp.lit = false;
        lamp.brightness = 0;
        continue;
      }

      lamp.brightness = b;
      lamp.lit = b >= 0.2;
    }

    for (const mm of components) {
      if (mm.type !== 'multimeter') continue;

      const nR = getNodeId(mm, 'red');
      const nB = getNodeId(mm, 'black');
      const vDiff = sol[nR] - sol[nB];

      if (mm.mode === 'voltage') {
        mm.display = formatVoltage(vDiff);
      } else if (mm.mode === 'current') {
        const current = vDiff / MM_R_CURRENT;
        mm.display = formatCurrent(Math.abs(current));
      } else if (mm.mode === 'resistance') {
        mm.display = formatResistance(measureResistance(mm));
      }
    }
  }

  function snapshot() {
    return components.map(c => {
      const copy = {};
      for (const k of Object.keys(c)) {
        if (k === 'endA' || k === 'endB') {
          const ref = c[k];
          copy[k] = ref
            ? { compIndex: components.indexOf(ref.comp), pinId: ref.pinId }
            : null;
        } else {
          copy[k] = c[k];
        }
      }
      return copy;
    });
  }

  function pushHistory() {
    const snap = snapshot();
    history.past.push(snap);
    if (history.past.length > history.limit) history.past.shift();
    history.future.length = 0;
  }

  function restoreSnapshot(snap) {
    selection.clear();
    isDraggingSelection = false;
    dragStart.clear();
    lasso = null;
    lassoBaseSelection = null;
    pasteMode = false;
    hoveredPin = null;
    wireDraft = null;

    const newComps = snap.map(src => {
      const copy = {};
      for (const k of Object.keys(src)) {
        if (k === 'endA' || k === 'endB') continue;
        copy[k] = src[k];
      }
      copy.endA = null;
      copy.endB = null;
      return copy;
    });

    snap.forEach((src, i) => {
      for (const k of ['endA', 'endB']) {
        const ref = src[k];
        if (ref && ref.compIndex >= 0 && ref.compIndex < newComps.length) {
          newComps[i][k] = { comp: newComps[ref.compIndex], pinId: ref.pinId };
        }
      }
    });

    components.length = 0;
    for (const c of newComps) components.push(c);
  }

  function undo() {
    if (history.past.length === 0) return;
    const current = snapshot();
    const prev = history.past.pop();
    history.future.push(current);
    restoreSnapshot(prev);
    render();
  }

  function redo() {
    if (history.future.length === 0) return;
    const current = snapshot();
    const next = history.future.pop();
    history.past.push(current);
    restoreSnapshot(next);
    render();
  }

  function refreshWireGeometry() {
    for (const c of components) {
      if (!isWire(c)) continue;
      if (c.endA && c.endA.comp) {
        const pin = findPinById(c.endA.comp, c.endA.pinId);
        if (pin) {
          const w = pinWorld(c.endA.comp, pin);
          c.ax = w.x; c.ay = w.y;
        }
      }
      if (c.endB && c.endB.comp) {
        const pin = findPinById(c.endB.comp, c.endB.pinId);
        if (pin) {
          const w = pinWorld(c.endB.comp, pin);
          c.bx = w.x; c.by = w.y;
        }
      }
    }
  }

  function drawComponent(c) {
    const spec = getSpec(c);
    if (!spec) return;

    if (isWire(c)) {
      ctx.save();
      spec.draw.call(c, ctx);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(c.x, c.y);
      spec.draw.call(c, ctx);
      ctx.restore();
    }
  }

  function pinColor(comp, pin) {
    if (pin && pin.id === 'pos') {
      return { fill: '#d92b2b', glow: 'rgba(217, 43, 43, 0.25)' };
    }
    if (pin && pin.id === 'red') {
      return { fill: '#d92b2b', glow: 'rgba(217, 43, 43, 0.25)' };
    }
    return { fill: '#0078d7', glow: 'rgba(0, 120, 215, 0.25)' };
  }

  function drawPinSmall(comp, pin) {
    const w = pinWorld(comp, pin);
    const col = pinColor(comp, pin);
    ctx.save();
    ctx.fillStyle = col.fill;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPinHover(comp, pin) {
    const w = pinWorld(comp, pin);
    const col = pinColor(comp, pin);
    ctx.save();
    ctx.fillStyle = col.glow;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.fill;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawToolPreview() {
    if (!activeTool || !mouse.inside) return;
    const spec = registry[activeTool];
    if (!spec) return;
    const px = snap(mouse.x);
    const py = snap(mouse.y);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.translate(px, py);
    spec.draw.call(spec, ctx);
    ctx.restore();
  }

  function drawWireDraft() {
    if (!wireDraft || !mouse.inside) return;
    const from = wireDraft.from;
    const pin = findPinById(from.comp, from.pinId);
    if (!pin) return;
    const start = pinWorld(from.comp, pin);
    const end = { x: mouse.x, y: mouse.y };
    ctx.save();
    ctx.strokeStyle = '#0078d7';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (hoveredPin && !(hoveredPin.comp === from.comp && hoveredPin.pin.id === from.pinId)) {
      const p = pinWorld(hoveredPin.comp, hoveredPin.pin);
      const col = pinColor(hoveredPin.comp, hoveredPin.pin);
      ctx.fillStyle = col.fill;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPastePreview() {
    if (!pasteMode || !mouse.inside || clipboard.length === 0) return;
    const shiftX = snap(mouse.x) - pasteOrigin.x;
    const shiftY = snap(mouse.y) - pasteOrigin.y;
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (const src of clipboard) {
      if (src.type === 'wire') continue;
      const spec = registry[src.type];
      if (!spec) continue;
      ctx.save();
      ctx.translate(src.x + shiftX, src.y + shiftY);
      spec.draw.call(src, ctx);
      ctx.restore();
    }
    ctx.restore();
    const sx = snap(mouse.x);
    const sy = snap(mouse.y);
    ctx.fillStyle = 'rgba(0, 160, 60, 0.9)';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function getBounds(c) {
    const spec = getSpec(c);
    if (!spec) return null;
    if (isWire(c)) {
      return {
        x0: Math.min(c.ax, c.bx),
        y0: Math.min(c.ay, c.by),
        x1: Math.max(c.ax, c.bx),
        y1: Math.max(c.ay, c.by)
      };
    }
    const halfW = spec.w / 2 + (spec.hitPadX || 0);
    const halfH = spec.h / 2 + (spec.hitPadY || 0);
    return { x0: c.x - halfW, y0: c.y - halfH, x1: c.x + halfW, y1: c.y + halfH };
  }

  function drawSelectionBox(c) {
    const b = getBounds(c);
    if (!b) return;
    const pad = 4;
    const x = b.x0 - pad, y = b.y0 - pad;
    const w = (b.x1 - b.x0) + pad * 2;
    const h = (b.y1 - b.y0) + pad * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 120, 215, 0.9)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.setLineDash([]);
    const l = 6;
    ctx.strokeStyle = '#0078d7';
    ctx.lineWidth = 2;
    const corners = [
      [x, y, 1, 1], [x + w, y, -1, 1],
      [x, y + h, 1, -1], [x + w, y + h, -1, -1]
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * l, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * l);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLasso() {
    if (!lasso) return;
    const x = Math.min(lasso.x0, lasso.x1);
    const y = Math.min(lasso.y0, lasso.y1);
    const w = Math.abs(lasso.x1 - lasso.x0);
    const h = Math.abs(lasso.y1 - lasso.y0);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 120, 215, 0.08)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0, 120, 215, 0.9)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function render() {
    const w = workspace.clientWidth;
    const h = workspace.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // сетка теперь рисуется на CSS-фоне .canvas-wrap
    // стираем только то, что на canvas:
    workspace.style.backgroundImage = gridVisible ? '' : 'none';

    refreshWireGeometry();
    computeLit();

    for (const c of components) if (isWire(c)) drawComponent(c);
    for (const c of components) if (!isWire(c)) drawComponent(c);

    for (const c of components) {
      if (!isWire(c)) continue;
      for (const ref of [c.endA, c.endB]) {
        if (!ref || !ref.comp) continue;
        const pin = findPinById(ref.comp, ref.pinId);
        if (!pin) continue;
        drawPinSmall(ref.comp, pin);
      }
    }

    for (const c of selection) drawSelectionBox(c);

    if (hoveredPin) {
      drawPinHover(hoveredPin.comp, hoveredPin.pin);
    }

    if (mouse.inside && activeTool) {
      const sx = snap(mouse.x);
      const sy = snap(mouse.y);
      ctx.fillStyle = 'rgba(0, 120, 215, 0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 120, 215, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - CELL / 2, sy - CELL / 2, CELL, CELL);
    }

    drawToolPreview();
    drawWireDraft();
    drawPastePreview();
    drawLasso();
  }

  function hitTestComponent(x, y) {
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      if (isWire(c)) continue;
      const spec = getSpec(c);
      if (!spec) continue;
      const halfW = spec.w / 2 + (spec.hitPadX || 0);
      const halfH = spec.h / 2 + (spec.hitPadY || 0);
      if (Math.abs(x - c.x) <= halfW && Math.abs(y - c.y) <= halfH) return c;
    }
    return null;
  }

  function hitTestWire(x, y) {
    const R = 6;
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      if (!isWire(c)) continue;
      if (distToSegment(x, y, c.ax, c.ay, c.bx, c.by) <= R) return c;
    }
    return null;
  }

  function hitTest(x, y) {
    const comp = hitTestComponent(x, y);
    if (comp) return comp;
    return hitTestWire(x, y);
  }

  function findPinAt(x, y) {
    const R = 10;
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      if (isWire(c)) continue;
      const spec = getSpec(c);
      if (!spec || !spec.pins) continue;
      for (const pin of spec.pins) {
        const w = pinWorld(c, pin);
        if (Math.hypot(x - w.x, y - w.y) <= R) return { comp: c, pin };
      }
    }
    return null;
  }

  function componentInRect(c, rx, ry, rw, rh) {
    const b = getBounds(c);
    if (!b) return false;
    return !(b.x1 < rx || b.x0 > rx + rw || b.y1 < ry || b.y0 > ry + rh);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = workspace.clientWidth;
    const h = workspace.clientHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function setTool(tool) {
    if (simulateMode) return;
    activeTool = (activeTool === tool) ? null : tool;
    wireDraft = null;
    if (activeTool) {
      clearSelection();
      cancelPasteMode();
    }
    syncToolUI();
    render();
  }

  function clearTool() {
    if (activeTool === null) return;
    activeTool = null;
    syncToolUI();
    render();
  }

  function syncToolUI() {
    btnBattery.classList.toggle('active',    activeTool === 'battery' && !simulateMode);
    btnBattery15.classList.toggle('active',  activeTool === 'battery15' && !simulateMode);
    btnLamp.classList.toggle('active',       activeTool === 'lamp' && !simulateMode);
    btnSwitch.classList.toggle('active',     activeTool === 'switch' && !simulateMode);
    btnMultimeter.classList.toggle('active', activeTool === 'multimeter' && !simulateMode);
    btnSim.classList.toggle('active',        simulateMode);

    if (simulateMode) {
      workspace.style.cursor = 'default';
      return;
    }

    if (!isDraggingSelection && !lasso) {
      if (pasteMode) {
        workspace.style.cursor = 'copy';
      } else if (activeTool) {
        workspace.style.cursor = 'crosshair';
      } else {
        workspace.style.cursor = 'default';
      }
    }
  }

  function createComponent(type, x, y) {
    const spec = registry[type];
    if (!spec) return null;
    const base = Object.assign({}, spec.defaults || {});
    base.x = snap(x);
    base.y = snap(y);
    return base;
  }

  function clearSelection() {
    if (selection.size === 0) return;
    selection.clear();
    updateSelectionStatus();
    render();
  }

  function selectOnly(c) {
    selection.clear();
    selection.add(c);
    updateSelectionStatus();
    render();
  }

  function toggleSelection(c) {
    if (selection.has(c)) selection.delete(c);
    else selection.add(c);
    updateSelectionStatus();
    render();
  }

  function updateSelectionStatus() {
    if (activeTool) return;
    if (pasteMode) return;
    if (selection.size === 0) return;
    status.textContent =
      `Выделено: ${selection.size} (Delete — удалить, Esc — снять, Ctrl+A — всё)`;
  }

  function copySelection() {
    if (simulateMode) return;
    if (selection.size === 0) return;
    clipboard = [];
    for (const c of selection) {
      if (isWire(c)) continue;
      const copy = {};
      for (const k of Object.keys(c)) copy[k] = c[k];
      clipboard.push(copy);
    }
    if (clipboard.length === 0) return;
    let minX = Infinity, minY = Infinity;
    for (const c of clipboard) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
    }
    pasteOrigin = { x: minX, y: minY };
    pasteMode = true;
    if (activeTool) { activeTool = null; syncToolUI(); }
    status.textContent =
      `Скопировано: ${clipboard.length} объект(ов). Кликните мышью, чтобы вставить (Esc — отмена)`;
    render();
  }

  function cutSelection() {
    if (simulateMode) return;
    if (selection.size === 0) return;
    copySelection();
    pushHistory();
    const toDelete = new Set(selection);
    for (const c of components) {
      if (!isWire(c)) continue;
      if ((c.endA && toDelete.has(c.endA.comp)) ||
          (c.endB && toDelete.has(c.endB.comp))) toDelete.add(c);
    }
    for (const c of toDelete) {
      const i = components.indexOf(c);
      if (i !== -1) components.splice(i, 1);
    }
    selection.clear();
    status.textContent =
      `Вырезано: ${clipboard.length} объект(ов). Кликните мышью, чтобы вставить (Esc — отмена)`;
    render();
  }

  function cancelPasteMode() {
    if (!pasteMode) return;
    pasteMode = false;
    syncToolUI();
    render();
  }

  function pasteAt(px, py) {
    if (simulateMode) return;
    if (clipboard.length === 0) return;
    pushHistory();
    const shiftX = snap(px) - pasteOrigin.x;
    const shiftY = snap(py) - pasteOrigin.y;
    const newOnes = [];
    for (const src of clipboard) {
      const copy = {};
      for (const k of Object.keys(src)) copy[k] = src[k];
      copy.x = snap(src.x + shiftX);
      copy.y = snap(src.y + shiftY);
      if (copy.type === 'lamp') {
        copy.lit = false;
        copy.brightness = 0;
        copy.burned = false;
      }
      if (copy.type === 'multimeter') {
        copy.display = '— — —';
      }
      components.push(copy);
      newOnes.push(copy);
    }
    selection.clear();
    for (const c of newOnes) selection.add(c);
    status.textContent =
      `Вставлено: ${newOnes.length} объект(ов). Кликните ещё раз, чтобы вставить повторно (Esc — выйти)`;
    render();
  }

  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  workspace.addEventListener('mousemove', (e) => {
    const p = toLocal(e);
    mouse.x = p.x; mouse.y = p.y; mouse.inside = true;

    if (isDraggingSelection) {
      const dx = p.x - dragStartMouse.x;
      const dy = p.y - dragStartMouse.y;
      for (const [c, start] of dragStart) {
        if (isWire(c)) continue;
        c.x = snap(start.x + dx);
        c.y = snap(start.y + dy);
      }
      hoveredPin = null;
      status.textContent = `Перетаскивание: ${selection.size} объект(ов)`;
      render();
      return;
    }

    if (lasso) {
      lasso.x1 = p.x; lasso.y1 = p.y;
      applyLasso();
      hoveredPin = null;
      status.textContent = `Рамка: ${selection.size} объект(ов)`;
      render();
      return;
    }

    if (pasteMode) {
      hoveredPin = null;
      status.textContent =
        `Режим вставки: ${clipboard.length} объект(ов). Клик — вставить, Esc — отмена`;
      render();
      return;
    }

    if (simulateMode) {
      hoveredPin = null;
      const litLamps = components.filter(c => c.type === 'lamp' && c.lit).length;
      const burned   = components.filter(c => c.type === 'lamp' && c.burned).length;
      status.textContent =
        `Моделирование` +
        (litLamps ? ` — горит ламп: ${litLamps}` : '') +
        (burned ? ` — перегорело: ${burned}` : '') +
        ` (клик — выделить, Esc — выход)`;
      render();
      return;
    }

    hoveredPin = findPinAt(p.x, p.y);

    if (wireDraft) {
      status.textContent =
        hoveredPin && !(hoveredPin.comp === wireDraft.from.comp && hoveredPin.pin.id === wireDraft.from.pinId)
          ? 'Провод: отпустите ЛКМ на этом выводе, чтобы соединить (Esc — отмена)'
          : 'Провод: ведите курсор к другому выводу';
    } else {
      status.textContent =
        `Клетка: ${CELL} px | Курсор: ${Math.round(p.x)}, ${Math.round(p.y)}` +
        ` | Узел: ${snap(p.x)}, ${snap(p.y)}` +
        (activeTool ? ` | Инструмент: ${activeTool} (Esc — отмена)` : '');
    }
    render();
  });

  workspace.addEventListener('mouseleave', () => {
    mouse.inside = false;
    hoveredPin = null;
    render();
  });

  workspace.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const p = toLocal(e);

    if (simulateMode) {
      const hit = hitTest(p.x, p.y);
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;

      if (!hit) {
        if (!additive) { selection.clear(); updateSelectionStatus(); }
        lassoBaseSelection = new Set(selection);
        lassoAdditive = additive;
        lasso = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
        workspace.style.cursor = 'crosshair';
        render();
        return;
      }

      if (hit.type === 'multimeter') {
        const spec = getSpec(hit);
        if (spec && typeof spec.hitButton === 'function') {
          const btn = spec.hitButton.call(spec, p.x - hit.x, p.y - hit.y);
          if (btn) {
            hit.mode = btn;
            render();
            return;
          }
        }
      }

      if (hit.type === 'switch') {
        hit.closed = !hit.closed;
        render();
        return;
      }

      if (additive) { toggleSelection(hit); return; }
      if (!selection.has(hit)) selectOnly(hit);
      return;
    }

    if (pasteMode) { pasteAt(p.x, p.y); return; }

    if (activeTool) {
      const c = createComponent(activeTool, p.x, p.y);
      if (c) { pushHistory(); components.push(c); render(); }
      return;
    }

    {
      const mc = hitTestComponent(p.x, p.y);
      if (mc && mc.type === 'multimeter') {
        const spec = getSpec(mc);
        if (spec && typeof spec.hitButton === 'function') {
          const btn = spec.hitButton.call(spec, p.x - mc.x, p.y - mc.y);
          if (btn) {
            pushHistory();
            mc.mode = btn;
            render();
            return;
          }
        }
      }
    }

    const pinHit = findPinAt(p.x, p.y);
    if (pinHit) {
      wireDraft = { from: { comp: pinHit.comp, pinId: pinHit.pin.id } };
      render();
      return;
    }

    const hit = hitTest(p.x, p.y);
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;

    if (!hit) {
      if (!additive) { selection.clear(); updateSelectionStatus(); }
      lassoBaseSelection = new Set(selection);
      lassoAdditive = additive;
      lasso = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      workspace.style.cursor = 'crosshair';
      render();
      return;
    }

    if (additive) { toggleSelection(hit); return; }
    if (!selection.has(hit)) selectOnly(hit);

    const hasMovable = [...selection].some(c => !isWire(c));
    if (!hasMovable) { render(); return; }

    isDraggingSelection = true;
    dragStartMouse.x = p.x;
    dragStartMouse.y = p.y;
    dragStart.clear();
    for (const c of selection) {
      if (isWire(c)) continue;
      dragStart.set(c, { x: c.x, y: c.y });
    }
    history.transaction = snapshot();
    workspace.style.cursor = 'move';
  });

  window.addEventListener('mouseup', () => {
    if (wireDraft) {
      const p = mouse.inside ? { x: mouse.x, y: mouse.y } : null;
      const hit = p ? findPinAt(p.x, p.y) : null;

      if (hit && !(hit.comp === wireDraft.from.comp && hit.pin.id === wireDraft.from.pinId)) {
        pushHistory();
        const from = wireDraft.from;
        const to   = { comp: hit.comp, pinId: hit.pin.id };
        const pinFrom = findPinById(from.comp, from.pinId);
        const wFrom = pinWorld(from.comp, pinFrom);
        const pinTo = findPinById(to.comp, to.pinId);
        const wTo = pinWorld(to.comp, pinTo);

        components.push({
          type: 'wire',
          endA: { comp: from.comp, pinId: from.pinId },
          endB: { comp: to.comp,   pinId: to.pinId },
          ax: wFrom.x, ay: wFrom.y,
          bx: wTo.x,   by: wTo.y
        });
      }
      wireDraft = null;
      render();
      return;
    }

    if (isDraggingSelection) {
      isDraggingSelection = false;
      if (history.transaction) {
        const before = history.transaction;
        const after = snapshot();
        if (!sameState(before, after)) {
          history.past.push(before);
          if (history.past.length > history.limit) history.past.shift();
          history.future.length = 0;
        }
        history.transaction = null;
      }
      dragStart.clear();
      syncToolUI();
      render();
    }
    if (lasso) {
      lasso = null;
      lassoBaseSelection = null;
      syncToolUI();
      render();
    }
  });

  function sameState(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      const kx = Object.keys(x), ky = Object.keys(y);
      if (kx.length !== ky.length) return false;
      for (const k of kx) {
        if (k === 'endA' || k === 'endB') {
          const aRef = x[k], bRef = y[k];
          if (aRef === null && bRef === null) continue;
          if (!aRef || !bRef) return false;
          if (aRef.pinId !== bRef.pinId) return false;
          if (aRef.comp !== bRef.comp) return false;
        } else if (x[k] !== y[k]) {
          return false;
        }
      }
    }
    return true;
  }

  function applyLasso() {
    if (!lasso) return;
    const x = Math.min(lasso.x0, lasso.x1);
    const y = Math.min(lasso.y0, lasso.y1);
    const w = Math.abs(lasso.x1 - lasso.x0);
    const h = Math.abs(lasso.y1 - lasso.y0);
    selection.clear();
    if (lassoAdditive && lassoBaseSelection) {
      for (const c of lassoBaseSelection) selection.add(c);
    }
    for (const c of components) {
      if (componentInRect(c, x, y, w, h)) selection.add(c);
    }
    updateSelectionStatus();
  }

  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const key  = e.key;

    if (ctrl && !e.shiftKey && (key === 'c' || key === 'C' || key === 'с' || key === 'С')) {
      if (simulateMode) return;
      if (activeTool) return;
      e.preventDefault(); copySelection(); return;
    }
    if (ctrl && !e.shiftKey && (key === 'x' || key === 'X' || key === 'ч' || key === 'Ч')) {
      if (simulateMode) return;
      if (activeTool) return;
      e.preventDefault(); cutSelection(); return;
    }
    if (ctrl && !e.shiftKey && (key === 'v' || key === 'V' || key === 'м' || key === 'М')) {
      if (simulateMode) return;
      if (activeTool) return;
      e.preventDefault();
      if (clipboard.length > 0) {
        pasteMode = true;
        status.textContent =
          `Режим вставки: ${clipboard.length} объект(ов). Клик — вставить, Esc — отмена`;
        syncToolUI();
        render();
      }
      return;
    }
    if (ctrl && !e.shiftKey && (key === 'z' || key === 'Z' || key === 'я' || key === 'Я')) {
      if (activeTool) return;
      e.preventDefault(); cancelPasteMode(); undo(); return;
    }
    if (ctrl && e.shiftKey && (key === 'z' || key === 'Z' || key === 'я' || key === 'Я')) {
      if (activeTool) return;
      e.preventDefault(); cancelPasteMode(); redo(); return;
    }
    if (ctrl && (key === 'a' || key === 'A' || key === 'ф' || key === 'Ф')) {
      if (activeTool) return;
      e.preventDefault();
      cancelPasteMode();
      selection.clear();
      for (const c of components) selection.add(c);
      updateSelectionStatus();
      render();
      return;
    }

    if (key === 'Escape') {
      if (isDraggingSelection) {
        isDraggingSelection = false;
        dragStart.clear();
        history.transaction = null;
      }
      lasso = null;
      lassoBaseSelection = null;
      wireDraft = null;
      cancelPasteMode();
      clearTool();
      clearSelection();
      syncToolUI();
      render();
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      if (simulateMode) return;
      if (selection.size > 0) {
        e.preventDefault();
        pushHistory();
        const toDelete = new Set(selection);
        for (const c of components) {
          if (!isWire(c)) continue;
          if ((c.endA && toDelete.has(c.endA.comp)) ||
              (c.endB && toDelete.has(c.endB.comp))) toDelete.add(c);
        }
        for (const c of toDelete) {
          const i = components.indexOf(c);
          if (i !== -1) components.splice(i, 1);
        }
        selection.clear();
        render();
      }
    }
  });

  btnBattery.addEventListener('click',    () => setTool('battery'));
  btnBattery15.addEventListener('click',  () => setTool('battery15'));
  btnLamp.addEventListener('click',       () => setTool('lamp'));
  btnSwitch.addEventListener('click',     () => setTool('switch'));
  btnMultimeter.addEventListener('click', () => setTool('multimeter'));

  btnClear.addEventListener('click', () => {
    if (components.length === 0) return;
    pushHistory();
    components.length = 0;
    selection.clear();
    cancelPasteMode();
    hoveredPin = null;
    wireDraft = null;
    render();
  });

  btnGrid.addEventListener('click', () => {
    gridVisible = !gridVisible;
    btnGrid.innerHTML = '<span class="icon">▦</span> Сетка: ' + (gridVisible ? 'вкл' : 'выкл');
    render();
  });

  btnSim.addEventListener('click', () => {
    simulateMode = !simulateMode;
    if (simulateMode) {
      activeTool = null;
      wireDraft = null;
      cancelPasteMode();
      btnSim.innerHTML = '<span class="icon">⏹</span> Остановить';
      status.textContent = 'Моделирование запущено. Клик — выделить, клик по ключу — переключить, Esc — выход.';
    } else {
      for (const c of components) {
        if (c.type === 'lamp' && !c.burned) {
          c.lit = false;
          c.brightness = 0;
        }
        if (c.type === 'multimeter') {
          c.display = '— — —';
        }
      }
      btnSim.innerHTML = '<span class="icon">▶</span> Запустить моделирование';
      status.textContent = 'Моделирование остановлено.';
    }
    syncToolUI();
    render();
  });

  resize();
})();