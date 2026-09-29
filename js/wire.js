/* Провод — элемент схемы.
   Отрезок между двумя выводами компонентов.
   endA / endB — ссылки { comp, pinId }.
   Координаты ax/ay/bx/by пересчитываются каждый кадр в main.js.

   Регистрируется в window.SchematicComponents под ключом 'wire'.
*/
(function () {
  'use strict';

  window.SchematicComponents = window.SchematicComponents || {};

  const COL = { line: '#333333' };

  window.SchematicComponents.wire = {
    w: 0,
    h: 0,

    defaults: {
      type: 'wire',
      endA: null,
      endB: null,
      ax: 0, ay: 0,
      bx: 0, by: 0
    },

    draw(ctx) {
      const { ax, ay, bx, by } = this;
      ctx.save();
      ctx.strokeStyle = COL.line;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }
  };
})();