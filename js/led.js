/* Светодиод (LED) — элемент схемы.
   Горизонтальная ориентация: корпус-полусфера, два вывода.
   Анод (+) — слева, катод (−) — справа.

   Свечение:
     - lit     — true, если V(anode) − V(cathode) > 0.5 В;
     - reverse — true, если V(anode) − V(cathode) < −0.5 В.

   Регистрируется в window.SchematicComponents под ключом 'led'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = {
    bodyOff:      '#f7e07a',
    bodyEdgeOff:  '#b38f2c',
    bodyOn:       '#ff4a2b',
    bodyEdgeOn:   '#a82615',
    glow:         'rgba(255, 80, 40, 0.85)',
    glowSoft:     'rgba(255, 140, 60, 0.4)',
    highlight:    '#fffbe0',
    highlightOn:  '#ffd6c8',
    lead:         '#7f8c8d',
    signPlus:     '#c0392b',
    signMinus:    '#2c3e50'
  };

  window.SchematicComponents.led = {
    w: 64,
    h: 36,

    hitPadX: 4,
    hitPadY: 4,

    defaults: {
      type: 'led',
      label: 'Светодиод',
      lit: false,
      reverse: false,
      forwardResistance: 50
    },

    pins: [
      { id: 'anode',   x: -32, y: 0, label: '+' },
      { id: 'cathode', x:  32, y: 0, label: '−' }
    ],

    draw(ctx) {
      const lit = !!this.lit;
      const reverse = !!this.reverse;

      const r = 14;
      const leadLen = 18;

      if (lit) {
        const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 4);
        g.addColorStop(0,   COL.glow);
        g.addColorStop(0.4, COL.glowSoft);
        g.addColorStop(1,   'rgba(255, 200, 120, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = COL.lead;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(-r - leadLen, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(r + leadLen, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = lit ? COL.bodyOn : COL.bodyOff;
      ctx.fill();
      ctx.strokeStyle = lit ? COL.bodyEdgeOn : COL.bodyEdgeOff;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-5, -5, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = lit ? COL.highlightOn : COL.highlight;
      ctx.fill();

      if (reverse && !lit) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200, 80, 80, 0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(-r - 4, 0);
        ctx.lineTo(0, -r * 0.6);
        ctx.lineTo(r + 4, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.fillStyle = COL.signPlus;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', -r - 10, -r - 4);

      ctx.fillStyle = COL.signMinus;
      ctx.fillText('−', r + 10, -r - 4);
    }
  };
})();