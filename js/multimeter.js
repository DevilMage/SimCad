/* Мультиметр — элемент схемы.
   Горизонтальная ориентация. Два вывода снизу:
     - red   — «+» (красный щуп);
     - black — «−» (чёрный щуп).

   Три режима измерения:
     - 'voltage'    — напряжение между щупами (V);
     - 'current'    — сила тока через прибор (A);
     - 'resistance' — сопротивление между щупами (Ω).

   Режим переключается кликом по кнопке V / A / Ω на корпусе.
   Поле display — строка, которую показывает дисплей.

   Регистрируется в window.SchematicComponents под ключом 'multimeter'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = {
    body:        '#2c3e50',
    bodyEdge:    '#1a252f',
    inner:       '#3d566e',
    screenBg:    '#0f1720',
    screenEdge:  '#0a0d11',
    screenText:  '#7dffb8',
    btnActive:   '#1abc9c',
    btnActiveEd: '#16a085',
    btnInactive: '#22303d',
    btnInactiveEd: '#0d1319',
    btnTextAct:  '#ffffff',
    btnTextIn:   '#95a5a6',
    red:         '#e74c3c',
    redDark:     '#a82615',
    black:       '#2a2a2c',
    label:       '#95a5a6'
  };

  const W = 92;
  const H = 68;
  const X0 = -W / 2;
  const Y0 = -H / 2;

  // Кнопки режимов — константа модуля (не через this)
  const BTN_Y = 12;
  const BTN_R = 8;
  const BTN_XS = [-22, 0, 22];
  const MODES = ['voltage', 'current', 'resistance'];
  const MODE_LABELS = ['V', 'A', 'Ω'];
  const BUTTONS = [
    { id: 'voltage',    x: BTN_XS[0], y: BTN_Y, r: BTN_R },
    { id: 'current',    x: BTN_XS[1], y: BTN_Y, r: BTN_R },
    { id: 'resistance', x: BTN_XS[2], y: BTN_Y, r: BTN_R }
  ];

  // Выводы (щупы) внизу
  const PIN_Y = 40;
  const PIN_RED_X = -22;
  const PIN_BLACK_X = 22;

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

  // Проверка попадания в кнопку режима (в локальных координатах)
  function hitButtonLocal(px, py) {
    for (const b of BUTTONS) {
      if (Math.hypot(px - b.x, py - b.y) <= b.r) return b.id;
    }
    return null;
  }

  window.SchematicComponents.multimeter = {
    w: W,
    h: H,

    hitPadX: 2,
    hitPadY: 12,

    defaults: {
      type: 'multimeter',
      label: 'Мультиметр',
      mode: 'voltage',
      display: '— — —'
    },

    pins: [
      { id: 'red',   x: PIN_RED_X,   y: PIN_Y, label: 'R' },
      { id: 'black', x: PIN_BLACK_X, y: PIN_Y, label: 'B' }
    ],

    // Публичный метод — можно вызывать spec.hitButton(px, py)
    hitButton: hitButtonLocal,

    draw(ctx) {
      const mode    = this.mode || 'voltage';
      const display = this.display || '— — —';

      // ---- Выводы (щупы) ----
      ctx.lineCap = 'round';

      // красный
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(PIN_RED_X, Y0 + H - 6);
      ctx.lineTo(PIN_RED_X, PIN_Y);
      ctx.stroke();

      // чёрный
      ctx.strokeStyle = COL.black;
      ctx.beginPath();
      ctx.moveTo(PIN_BLACK_X, Y0 + H - 6);
      ctx.lineTo(PIN_BLACK_X, PIN_Y);
      ctx.stroke();

      // наконечники
      ctx.fillStyle = COL.redDark;
      ctx.beginPath();
      ctx.arc(PIN_RED_X, PIN_Y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(PIN_BLACK_X, PIN_Y, 3, 0, Math.PI * 2);
      ctx.fill();

      // ---- Корпус ----
      ctx.fillStyle = COL.body;
      ctx.strokeStyle = COL.bodyEdge;
      ctx.lineWidth = 2;
      roundRect(ctx, X0, Y0, W, H, 8);
      ctx.fill();
      ctx.stroke();

      // внутренний контур
      ctx.strokeStyle = COL.inner;
      ctx.lineWidth = 1;
      roundRect(ctx, X0 + 4, Y0 + 4, W - 8, H - 8, 6);
      ctx.stroke();

      // ---- Дисплей ----
      const dispW = W - 22;
      const dispH = 22;
      const dispX = -dispW / 2;
      const dispY = Y0 + 8;

      ctx.fillStyle = COL.screenBg;
      ctx.strokeStyle = COL.screenEdge;
      ctx.lineWidth = 1.5;
      roundRect(ctx, dispX, dispY, dispW, dispH, 3);
      ctx.fill();
      ctx.stroke();

      // индикатор единицы измерения
      ctx.fillStyle = 'rgba(125, 255, 184, 0.7)';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const unitLabel =
        mode === 'voltage'    ? 'V' :
        mode === 'current'    ? 'A' : 'Ω';
      ctx.fillText(unitLabel, dispX + dispW - 4, dispY + 3);

      // значение
      ctx.fillStyle = COL.screenText;
      ctx.font = 'bold 13px "Consolas", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(display, 0, dispY + dispH / 2 + 1);

      // ---- Кнопки ----
      for (let i = 0; i < BUTTONS.length; i++) {
        const b = BUTTONS[i];
        const modeId = MODES[i];
        const active = (mode === modeId);

        // тень
        ctx.beginPath();
        ctx.arc(b.x, b.y + 1.5, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();

        // основа
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = active ? COL.btnActive : COL.btnInactive;
        ctx.fill();
        ctx.strokeStyle = active ? COL.btnActiveEd : COL.btnInactiveEd;
        ctx.lineWidth = 2;
        ctx.stroke();

        // блик
        ctx.beginPath();
        ctx.arc(b.x - 2.5, b.y - 2.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)';
        ctx.fill();

        // символ
        ctx.fillStyle = active ? COL.btnTextAct : COL.btnTextIn;
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(MODE_LABELS[i], b.x, b.y + 0.5);
      }

      // ---- Подписи у выводов ----
      ctx.fillStyle = COL.red;
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R', PIN_RED_X, Y0 + H - 2);

      ctx.fillStyle = COL.label;
      ctx.fillText('B', PIN_BLACK_X, Y0 + H - 2);
    }
  };
})();