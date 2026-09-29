/* Лампа накаливания — элемент схемы.
   Вертикальная ориентация: стеклянная колба сверху, цоколь снизу.
   Внутри колбы — два держателя-контакта, расходящиеся как рогатка,
   на верхних концах — спираль накала.

   Выводы (pins) — на металлических штырьках.

   Физика свечения (поля, которые выставляет main.js в computeLit()):
     - ratedVoltage — номинальное напряжение, В (по умолчанию 9);
     - brightness   — V_лампы / ratedVoltage, 0..2+;
     - lit          — горит ли (brightness ≥ 0.2);
     - burned       — перегорела ли (brightness ≥ 2).

   Радиус ореола и плотность свечения растут ЛИНЕЙНО с brightness.
   Чем выше напряжение на лампе — тем шире и ярче ореол.

   Регистрируется в window.SchematicComponents под ключом 'lamp'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = {
    glassFill:    'rgba(255, 255, 255, 0.35)',
    glassEdge:    '#9aa0a6',
    wire:         '#7a7d82',
    baseBody:     '#2a2a2c',
    baseTop:      '#1e1e20',
    baseEdge:     '#111112',
    baseHi:       'rgba(255,255,255,0.10)',
    pin:          '#a8a8a8',
    pinDark:      '#5c5c5c',
    pinEdge:      '#2a2a2a',
    pinHi:        '#dcdcdc',

    burnedBody:   'rgba(120, 120, 130, 0.55)',
    burnedEdge:   '#5a5a66'
  };

  const W = 56;
  const H = 104;

  function filamentColor(b) {
    const t = Math.max(0, Math.min(2, b));
    let r, g, bl;
    if (t <= 0.4) {
      const k = (t - 0.2) / 0.2;
      r = 130 + 50 * k;   g = 20 + 20 * k;   bl = 15;
    } else if (t <= 0.7) {
      const k = (t - 0.4) / 0.3;
      r = 180 + 50 * k;   g = 40 + 80 * k;   bl = 15 + 10 * k;
    } else if (t <= 1.0) {
      const k = (t - 0.7) / 0.3;
      r = 230 + 25 * k;   g = 120 + 100 * k; bl = 25 + 35 * k;
    } else if (t <= 1.5) {
      const k = (t - 1.0) / 0.5;
      r = 255;            g = 220 + 20 * k;  bl = 60 + 40 * k;
    } else {
      const k = (t - 1.5) / 0.5;
      r = 255;            g = 240 + 15 * k;  bl = 100 + 130 * k;
    }
    return { r: Math.round(r), g: Math.round(g), b: Math.round(bl) };
  }

  function drawSpiralPath(ctx, x1, x2, yTop, yBot, loops) {
    const dx = (x2 - x1) / loops;
    ctx.beginPath();
    ctx.moveTo(x1, yTop);
    for (let i = 0; i < loops; i++) {
      const xm = x1 + dx * (i + 0.5);
      const xe = x1 + dx * (i + 1);
      ctx.quadraticCurveTo(xm, yBot, xe, yTop);
    }
    ctx.stroke();
  }

  window.SchematicComponents.lamp = {
    w: W,
    h: H,

    hitPadX: 2,
    hitPadY: 12,

    defaults: {
      type: 'lamp',
      label: 'Лампа',
      ratedVoltage: 9,
      brightness: 0,
      lit: false,
      burned: false
    },

    pins: [
      { id: 'a', x: -5, y: 37, label: 'a' },
      { id: 'b', x:  5, y: 37, label: 'b' }
    ],

    draw(ctx) {
      const burned     = !!this.burned;
      const brightness = Math.max(0, this.brightness || 0);
      const lit        = !burned && brightness >= 0.2;
      const col        = filamentColor(brightness);

      const cx  = 0;
      const top = -H / 2;

      const bulbTopY   = top + 2;
      const bulbMaxR   = 25;
      const bulbMidY   = bulbTopY + 26;
      const neckY      = top + 68;
      const neckHalfW  = 11;

      const baseW      = 26;
      const baseH      = 22;
      const baseTopY   = neckY - 3;
      const baseBotY   = baseTopY + baseH;

      const pinH       = 7;
      const pinR       = 3.2;

      // ---- Радиус и плотность ореола зависят от brightness ----
      const clampedB = Math.min(brightness, 2.0);
      const glowR    = bulbMaxR * (0.6 + clampedB * 3.0);
      const glowA    = 0.05 + clampedB * 0.40;

      if (lit) {
        const g = ctx.createRadialGradient(
          cx, bulbMidY, bulbMaxR * 0.3,
          cx, bulbMidY, glowR
        );
        g.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, ${glowA})`);
        g.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, bulbMidY, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- Колба ----
      ctx.save();

      ctx.beginPath();
      ctx.moveTo(cx - neckHalfW, neckY);

      ctx.bezierCurveTo(
        cx - neckHalfW - 1.5, neckY - 3,
        cx - neckHalfW - 1.5, neckY - 7,
        cx - neckHalfW - 3,   neckY - 11
      );
      ctx.bezierCurveTo(
        cx - neckHalfW - 6,   neckY - 17,
        cx - bulbMaxR * 0.95, bulbMidY + 8,
        cx - bulbMaxR,        bulbMidY
      );
      ctx.bezierCurveTo(
        cx - bulbMaxR,        bulbMidY - 14,
        cx - bulbMaxR * 0.78, bulbTopY + 1,
        cx - bulbMaxR * 0.35, bulbTopY
      );
      ctx.bezierCurveTo(
        cx - bulbMaxR * 0.12, bulbTopY - 1,
        cx + bulbMaxR * 0.12, bulbTopY - 1,
        cx + bulbMaxR * 0.35, bulbTopY
      );
      ctx.bezierCurveTo(
        cx + bulbMaxR * 0.78, bulbTopY + 1,
        cx + bulbMaxR,        bulbMidY - 14,
        cx + bulbMaxR,        bulbMidY
      );
      ctx.bezierCurveTo(
        cx + bulbMaxR * 0.95, bulbMidY + 8,
        cx + neckHalfW + 6,   neckY - 17,
        cx + neckHalfW + 3,   neckY - 11
      );
      ctx.bezierCurveTo(
        cx + neckHalfW + 1.5, neckY - 7,
        cx + neckHalfW + 1.5, neckY - 3,
        cx + neckHalfW,       neckY
      );
      ctx.closePath();

      if (burned) {
        ctx.fillStyle = COL.burnedBody;
      } else if (lit) {
        const alphaIn = Math.min(0.85, 0.2 + clampedB * 0.35);
        const g = ctx.createRadialGradient(
          cx - bulbMaxR * 0.3, bulbMidY - bulbMaxR * 0.3, 2,
          cx,                bulbMidY,                 bulbMaxR
        );
        g.addColorStop(0,   `rgba(${Math.min(255, col.r + 40)}, ${Math.min(255, col.g + 40)}, ${Math.min(255, col.b + 40)}, ${alphaIn})`);
        g.addColorStop(0.6, `rgba(${col.r}, ${col.g}, ${col.b}, ${alphaIn * 0.5})`);
        g.addColorStop(1,   'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = COL.glassFill;
      }
      ctx.fill();

      ctx.strokeStyle = burned ? COL.burnedEdge
                       : lit ? `rgb(${Math.round(col.r * 0.7)}, ${Math.round(col.g * 0.7)}, ${Math.round(col.b * 0.7)})`
                       : COL.glassEdge;
      ctx.lineWidth = lit ? 1.6 : 1.3;
      ctx.stroke();

      ctx.restore();

      // ===================== ДЕРЖАТЕЛИ-КОНТАКТЫ =====================
      const holderBottomY      = neckY - 2;
      const holderTopY         = top + 24;
      const holderBottomLeftX  = cx - 4;
      const holderBottomRightX = cx + 4;
      const holderTopLeftX     = cx - 13;
      const holderTopRightX    = cx + 13;

      const holderColor = burned ? '#5a5a66'
                        : lit ? `rgb(${col.r}, ${col.g}, ${col.b})`
                        : COL.wire;

      ctx.beginPath();
      ctx.moveTo(holderBottomLeftX, holderBottomY);
      ctx.lineTo(holderTopLeftX, holderTopY);
      ctx.strokeStyle = holderColor;
      ctx.lineWidth = lit ? 2 : 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(holderBottomRightX, holderBottomY);
      ctx.lineTo(holderTopRightX, holderTopY);
      ctx.stroke();

      // ===================== СПИРАЛЬ НАКАТА =====================
      const spiralTopY = holderTopY;
      const spiralBotY = holderTopY + 6;
      const spiralLoops = 6;

      const spiralWidth = 1.6 + Math.min(brightness, 2) * 0.5;
      const shadowBlur  = 4 + Math.min(brightness, 2) * 10;

      if (burned) {
        ctx.strokeStyle = '#3a3a44';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(holderTopLeftX, spiralTopY);
        ctx.lineTo(holderTopLeftX + 8, spiralBotY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(holderTopRightX - 8, spiralBotY);
        ctx.lineTo(holderTopRightX, spiralTopY);
        ctx.stroke();
      } else if (lit) {
        ctx.save();
        ctx.shadowColor = `rgba(${col.r}, ${col.g}, ${col.b}, 0.95)`;
        ctx.shadowBlur = shadowBlur;
        ctx.strokeStyle = `rgb(${col.r}, ${col.g}, ${col.b})`;
        ctx.lineWidth = spiralWidth;
        drawSpiralPath(
          ctx,
          holderTopLeftX, holderTopRightX,
          spiralTopY, spiralBotY,
          spiralLoops
        );
        ctx.restore();

        if (brightness > 0.85) {
          const w = Math.min(1, (brightness - 0.85) / 0.65);
          ctx.strokeStyle = `rgba(255, 255, 255, ${w})`;
          ctx.lineWidth = 1;
          drawSpiralPath(
            ctx,
            holderTopLeftX, holderTopRightX,
            spiralTopY, spiralBotY,
            spiralLoops
          );
        }
      } else {
        ctx.strokeStyle = COL.wire;
        ctx.lineWidth = 1.3;
        drawSpiralPath(
          ctx,
          holderTopLeftX, holderTopRightX,
          spiralTopY, spiralBotY,
          spiralLoops
        );
      }

      // ===================== ЦОКОЛЬ =====================
      ctx.fillStyle = COL.baseTop;
      const rimY = baseTopY;

      ctx.beginPath();
      ctx.moveTo(cx - baseW / 2, rimY + 4);
      ctx.quadraticCurveTo(cx, rimY - 4, cx + baseW / 2, rimY + 4);
      ctx.lineTo(cx + baseW / 2, rimY + 8);
      ctx.quadraticCurveTo(cx, rimY + 2, cx - baseW / 2, rimY + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = COL.baseBody;
      ctx.strokeStyle = COL.baseEdge;
      ctx.lineWidth = 1;

      const rBot = 6;
      const rTop = 4;
      ctx.beginPath();
      ctx.moveTo(cx - baseW / 2, rimY + rTop);
      ctx.arcTo(cx - baseW / 2, rimY,        cx - baseW / 2 + rTop, rimY, rTop);
      ctx.lineTo(cx + baseW / 2 - rTop, rimY);
      ctx.arcTo(cx + baseW / 2, rimY,        cx + baseW / 2, rimY + rTop, rTop);
      ctx.lineTo(cx + baseW / 2, baseBotY - rBot);
      ctx.arcTo(cx + baseW / 2, baseBotY,    cx + baseW / 2 - rBot, baseBotY, rBot);
      ctx.lineTo(cx - baseW / 2 + rBot, baseBotY);
      ctx.arcTo(cx - baseW / 2, baseBotY,    cx - baseW / 2, baseBotY - rBot, rBot);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COL.baseHi;
      ctx.fillRect(cx - baseW / 2 + 2.5, rimY + 4, 1.5, baseH - 8);

      // ===================== ШТЫРЬКИ =====================
      const pinY = baseBotY - 1;
      const pinXs = [cx - 5, cx + 5];

      for (const px of pinXs) {
        ctx.fillStyle = COL.pin;
        ctx.strokeStyle = COL.pinEdge;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(px - pinR, pinY);
        ctx.lineTo(px - pinR, pinY + pinH - pinR);
        ctx.arcTo(px - pinR, pinY + pinH, px - pinR + pinR, pinY + pinH, pinR);
        ctx.lineTo(px + pinR - pinR, pinY + pinH);
        ctx.arcTo(px + pinR, pinY + pinH, px + pinR, pinY + pinH - pinR, pinR);
        ctx.lineTo(px + pinR, pinY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COL.pinDark;
        ctx.fillRect(px - pinR, pinY + pinH * 0.55, pinR * 2, 1.5);

        ctx.fillStyle = COL.pinHi;
        ctx.fillRect(px - pinR + 0.8, pinY + 1.5, 0.8, pinH - 3);
      }
    }
  };
})();