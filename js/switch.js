/* Ключ (выключатель) — элемент схемы.
   Горизонтальная ориентация. Два вывода a и b.
   Замкнут — проводит ток (R ≈ 0.5 Ом). Разомкнут — разрыв (R ≈ 1e9 Ом).

   Переключение: клик по элементу мышью, когда инструмент не активен.
   Состояние — поле closed (bool).

   Регистрируется в window.SchematicComponents под ключом 'switch'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = {
    base:        '#2a2a2c',
    baseHi:      '#4a4a4c',
    baseEdge:    '#111112',
    contact:     '#c9a04a',
    contactEdge: '#7a5a20',
    lever:       '#c9c9c9',
    leverHi:     '#f0f0f0',
    leverEdge:   '#3a3a3a',
    pin:         '#a8a8a8',
    pinEdge:     '#2a2a2a'
  };

  const W = 64;
  const H = 28;
  const X0 = -W / 2;
  const Y0 = -H / 2;
  const CONTACT_X = 22;

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

  window.SchematicComponents.switch = {
    w: W,
    h: H,

    hitPadX: 4,
    hitPadY: 6,

    defaults: {
      type: 'switch',
      label: 'Ключ',
      closed: false
    },

    pins: [
      { id: 'a', x: -30, y: 0, label: 'a' },
      { id: 'b', x:  30, y: 0, label: 'b' }
    ],

    draw(ctx) {
      const closed = !!this.closed;

      // ---- Выводы ----
      ctx.strokeStyle = COL.pin;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-W / 2, 0);
      ctx.lineTo(-CONTACT_X, 0);
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(CONTACT_X, 0);
      ctx.stroke();

      // ---- Основание ----
      ctx.fillStyle = COL.base;
      ctx.strokeStyle = COL.baseEdge;
      ctx.lineWidth = 1.2;
      roundRect(ctx, X0 + 4, Y0 + 12, W - 8, 8, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COL.baseHi;
      ctx.fillRect(X0 + 6, Y0 + 13, W - 12, 1.5);

      // ---- Контакты ----
      for (const cx of [-CONTACT_X, CONTACT_X]) {
        ctx.fillStyle = COL.contact;
        ctx.strokeStyle = COL.contactEdge;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(cx - 1.2, -1.2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- Рычаг ----
      const tipX = closed ?  CONTACT_X      : CONTACT_X - 2;
      const tipY = closed ?  0              : -12;

      ctx.strokeStyle = COL.leverEdge;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-CONTACT_X, 0);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.strokeStyle = COL.lever;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-CONTACT_X, 0);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      ctx.strokeStyle = COL.leverHi;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-CONTACT_X + 2, -1.2);
      ctx.lineTo(tipX - 1, tipY - 0.5);
      ctx.stroke();

      ctx.fillStyle = COL.lever;
      ctx.strokeStyle = COL.leverEdge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };
})();