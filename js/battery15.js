/* Батарейка «AA» 1.5V — элемент схемы.
   Вертикальная ориентация: цилиндрический корпус,
   сверху — маленький плюсовой контакт (пупок),
   снизу — плоский минусовой торец.

   Характеристики:
     - voltage   — напряжение, В (1.5)
     - capacity  — ёмкость, мА·ч (2500)
     - label     — подпись

   Выводы (pins):
     - pos — на верхнем плюсовом контакте;
     - neg — на нижнем торце корпуса.

   Регистрируется в window.SchematicComponents под ключом 'battery15'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = {
    body:        '#c9a24a',
    bodyDark:    '#8b6b25',
    bodyHi:      '#e8c878',
    capRed:      '#d94a3d',
    capDark:     '#a02a20',
    black:       '#2a2a2c',
    blackHi:     '#4a4a4c',
    terminal:    '#b8b8b8',
    terminalDark:'#6a6a6a',
    terminalEdge:'#2a2a2a',
    label:       '#ffffff'
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

  const W = 26;
  const H = 64;
  const X0 = -W / 2;
  const Y0 = -H / 2;

  // Плюсовой контакт сверху: пупок
  const CAP_W = 12;
  const CAP_H = 4;
  // Минусовой торец снизу — плоская пластина
  const BOT_W = W - 4;
  const BOT_H = 3;

  const POS_PIN_Y = Y0 - CAP_H;             // на верхушке пупка
  const NEG_PIN_Y = Y0 + H + BOT_H - 4;     // на нижней кромке торца (чуть выше)

  window.SchematicComponents.battery15 = {
    w: W,
    h: H + CAP_H + BOT_H,

    hitPadX: 4,
    hitPadY: 6,

    defaults: {
      type: 'battery15',
      voltage: 1.5,
      capacity: 2500,
      label: 'AA 1.5V'
    },

    pins: [
      { id: 'pos', x: 0, y: POS_PIN_Y, label: '+' },
      { id: 'neg', x: 0, y: NEG_PIN_Y, label: '−' }
    ],

    draw(ctx) {
      // ---- Основной корпус (цилиндр) ----
      const grad = ctx.createLinearGradient(X0, 0, X0 + W, 0);
      grad.addColorStop(0,    COL.bodyDark);
      grad.addColorStop(0.2,  COL.body);
      grad.addColorStop(0.5,  COL.bodyHi);
      grad.addColorStop(0.8,  COL.body);
      grad.addColorStop(1,    COL.bodyDark);

      ctx.fillStyle = grad;
      roundRect(ctx, X0, Y0, W, H, 4);
      ctx.fill();

      ctx.strokeStyle = COL.bodyDark;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ---- Красная этикетка сверху ----
      ctx.fillStyle = COL.capRed;
      ctx.fillRect(X0 + 1, Y0 + 6, W - 2, 10);

      // ---- Нижний тёмный поясок ----
      ctx.fillStyle = COL.black;
      ctx.fillRect(X0 + 1, Y0 + H - 10, W - 2, 9);
      ctx.fillStyle = COL.blackHi;
      ctx.fillRect(X0 + 1, Y0 + H - 10, W - 2, 1);

      // ---- Плюсовой пупок сверху ----
      ctx.fillStyle = COL.terminal;
      ctx.strokeStyle = COL.terminalEdge;
      ctx.lineWidth = 1;

      roundRect(ctx, -CAP_W / 2, Y0 - CAP_H, CAP_W, CAP_H + 4, 2);
      ctx.fill();
      ctx.stroke();

      // блик на пупке
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-CAP_W / 2 + 1, Y0 - CAP_H + 1, CAP_W - 2, 1);

      // ---- Минусовой торец снизу ----
      ctx.fillStyle = COL.terminalDark;
      roundRect(ctx, -BOT_W / 2, Y0 + H - 1, BOT_W, BOT_H, 1.5);
      ctx.fill();
      ctx.strokeStyle = COL.terminalEdge;
      ctx.stroke();

      // ---- Подписи ----
      ctx.fillStyle = COL.label;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // плюс рядом с пупком
      ctx.fillText('+', CAP_W / 2 + 6, Y0 - CAP_H / 2);

      // «1.5V» на этикетке
      ctx.fillStyle = COL.label;
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('1.5V', 0, Y0 + 11);

      // минус внизу
      ctx.fillText('−', BOT_W / 2 + 6, Y0 + H + BOT_H / 2 + 1);

      // лёгкий вертикальный блик на корпусе
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(X0 + 2, Y0 + 4, 1.5, H - 8);
    }
  };
})();