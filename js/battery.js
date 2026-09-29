/* Батарейка «Крона» (9V) — элемент схемы.
   Плоский вид:
     - вертикальный корпус со скруглёнными углами;
     - верхняя ~1/3 — оранжевая этикетка;
     - нижние ~2/3 — чёрный корпус;
     - сверху две металлические клеммы:
       слева — широкая пластина у корпуса, на 1 px выше правой,
               сдвинута на 2 px вправо и сжата по ширине на 2 px;
       справа — узкая ножка со скруглённым верхом;
     - на корпусе белые значки «−» (слева) и «+» (справа), без обводки;
     - у каждой клеммы есть вывод (pin) — точка подключения провода.

   Регистрируется в window.SchematicComponents под ключом 'battery'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = {
    bodyOrange:   '#f07c00',
    bodyBlack:    '#141414',
    bodyEdge:     '#000000',
    terminal:     '#8a8a8a',
    terminalTop:  '#a8a8a8',
    terminalEdge: '#000000',
    sign:         '#ffffff'
  };

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y,     x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x,     y + h, rr);
    ctx.arcTo(x,     y + h, x,     y,     rr);
    ctx.arcTo(x,     y,     x + w, y,     rr);
    ctx.closePath();
  }

  function bottomRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.closePath();
  }

  function topRoundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  const CAP_W  = 20, CAP_H  = 6;
  const STEM_W = 14, STEM_H = 5;

  const W = 60, H = 100;
  const X0 = -W / 2;
  const Y0 = -H / 2;
  const LEFT_X  = X0 + 16;
  const RIGHT_X = X0 + W - 14;
  const LEFT_PIN_Y  = Y0 - CAP_H + 3;
  const RIGHT_PIN_Y = Y0 - STEM_H + 3;

  function drawTerminalWithCap(ctx, cx, baseY) {
    ctx.save();
    ctx.translate(cx, baseY);

    ctx.fillStyle = COL.terminal;
    ctx.strokeStyle = COL.terminalEdge;
    ctx.lineWidth = 1;

    bottomRoundedRect(ctx, -CAP_W / 2, -CAP_H, CAP_W, CAP_H, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COL.terminalTop;
    roundRect(ctx, -CAP_W / 2 + 2, -CAP_H + 1, CAP_W - 4, 1.5, 1);
    ctx.fill();

    ctx.restore();
  }

  function drawTerminalPlain(ctx, cx, baseY) {
    ctx.save();
    ctx.translate(cx, baseY);

    ctx.fillStyle = COL.terminal;
    ctx.strokeStyle = COL.terminalEdge;
    ctx.lineWidth = 1;

    topRoundedRect(ctx, -STEM_W / 2, -STEM_H, STEM_W, STEM_H, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COL.terminalTop;
    ctx.fillRect(-STEM_W / 2 + 2, -STEM_H + 1, STEM_W - 4, 1);

    ctx.restore();
  }

  function drawMinusSign(ctx, cx, cy, size) {
    const barW = size;
    const barH = size * 0.28;
    ctx.fillStyle = COL.sign;
    ctx.fillRect(cx - barW / 2, cy - barH / 2, barW, barH);
  }

  function drawPlusSign(ctx, cx, cy, size) {
    const barW = size;
    const barH = size * 0.28;
    ctx.fillStyle = COL.sign;
    ctx.fillRect(cx - barW / 2, cy - barH / 2, barW, barH);
    ctx.fillRect(cx - barH / 2, cy - barW / 2, barH, barW);
  }

  window.SchematicComponents.battery = {
    w: W,
    h: H,

    hitPadX: 2,
    hitPadY: 12,

    defaults: {
      type: 'battery',
      voltage: 9,
      label: 'Крона'
    },

    pins: [
      { id: 'neg', x: LEFT_X,  y: LEFT_PIN_Y,  label: '−' },
      { id: 'pos', x: RIGHT_X, y: RIGHT_PIN_Y, label: '+' }
    ],

    draw(ctx) {
      const x0 = X0;
      const y0 = Y0;
      const outerR = 6;

      const orangeH = Math.round(H / 3);
      const blackH  = H - orangeH;

      ctx.fillStyle = COL.bodyBlack;
      ctx.strokeStyle = COL.bodyEdge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const rB = outerR;
      ctx.moveTo(x0, y0 + orangeH);
      ctx.lineTo(x0 + W, y0 + orangeH);
      ctx.lineTo(x0 + W, y0 + H - rB);
      ctx.arcTo(x0 + W, y0 + H, x0 + W - rB, y0 + H, rB);
      ctx.lineTo(x0 + rB, y0 + H);
      ctx.arcTo(x0, y0 + H, x0, y0 + H - rB, rB);
      ctx.lineTo(x0, y0 + orangeH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COL.bodyOrange;
      ctx.beginPath();
      const rT = outerR;
      ctx.moveTo(x0, y0 + orangeH);
      ctx.lineTo(x0, y0 + rT);
      ctx.arcTo(x0, y0, x0 + rT, y0, rT);
      ctx.lineTo(x0 + W - rT, y0);
      ctx.arcTo(x0 + W, y0, x0 + W, y0 + rT, rT);
      ctx.lineTo(x0 + W, y0 + orangeH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(x0, y0 + orangeH);
      ctx.lineTo(x0 + W, y0 + orangeH);
      ctx.stroke();

      drawTerminalWithCap(ctx, LEFT_X,  y0);
      drawTerminalPlain(ctx,   RIGHT_X, y0);

      const signSize = 12;
      const signY = y0 + orangeH - 21;

      drawMinusSign(ctx, LEFT_X,  signY, signSize);
      drawPlusSign (ctx, RIGHT_X, signY, signSize);
    }
  };
})();