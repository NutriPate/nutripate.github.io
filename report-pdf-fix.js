(function () {
  window.downloadReport = function () {
    const p = activePet();
    const Pdf = window.jspdf && window.jspdf.jsPDF;
    if (!p || !Pdf) return toast('Не удалось подготовить PDF');
    const weights = state.weights.filter(x => x.petId === p.id).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const entries = state.feedEntries.filter(x => x.petId === p.id);
    const feeds = entries.filter(x => (x.kind || 'feed') === 'feed');
    const notes = entries.filter(x => x.kind === 'note');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const W = 1200, H = 1700;
    canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2);
    const ru = value => String(value || '').replace(/\bbeef\b/gi, 'говядина').replace(/\bchicken\b/gi, 'курица').replace(/\bfish\b/gi, 'рыба').replace(/\blow\b/gi, 'низкая').replace(/\bmedium\b/gi, 'умеренная').replace(/\bhigh\b/gi, 'высокая').replace(/\bvery_high\b/gi, 'очень высокая').replace(/\bfemale\b/gi, 'самка').replace(/\bmale\b/gi, 'самец');
    const text = (s, x, y, size = 24, color = '#07383a', bold = false) => {
      ctx.font = `${bold ? '700 ' : '400 '}${size}px Arial`;
      ctx.fillStyle = color;
      ctx.fillText(String(s || ''), x, y);
    };
    const box = (y, h, mint = false) => {
      ctx.fillStyle = mint ? '#d9f6f3' : '#fff';
      ctx.strokeStyle = '#d8e5e1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(70, y, 1060, h, 22); ctx.fill(); ctx.stroke();
    };
    const page = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); text('NutriPate', 80, 70, 34, '#07383a', true); };
    const draw = photo => {
      page();
      text('Отчёт о питомце', 80, 150, 54); text(`${p.name || 'Питомец'} - питание и изменения состояния`, 80, 220, 28, '#53716f');
      box(300, 360, true); text('01 ПАСПОРТ ПИТОМЦА', 95, 340, 20, '#53716f');
      if (photo) ctx.drawImage(photo, 105, 390, 190, 190);
      text(p.name || 'Питомец', 360, 405, 34);
      text(`${p.species === 'dog' ? 'Собака' : 'Кошка'} · ${ru(p.breedLabel || p.breed || 'Порода не указана')}`, 360, 450, 23);
      text(`Текущий вес: ${p.weight || p.kg || '—'} кг`, 360, 525, 25);
      text(`Целевой вес: ${p.targetWeight || '—'} кг`, 760, 525, 25);
      text(`Аллергии: ${ru(p.allergens || 'не указаны')}`, 105, 650, 21);
      text(`Особенности: ${ru(p.diagnoses || 'не указаны')}`, 105, 690, 21);
      text('Данные внесены владельцем и не заменяют консультацию ветеринара.', 105, 735, 18, '#53716f');
      box(790, 560); text('02 ДИНАМИКА ВЕСА', 95, 830, 20, '#53716f'); text('Вес за всё время', 95, 875, 34);
      const first = Number(weights[0]?.kg || p.weight || p.kg || 0), last = Number(weights.at(-1)?.kg || first), vals = weights.map(x => Number(x.kg)).filter(Number.isFinite);
      text(`Начальный вес: ${first.toFixed(1).replace('.', ',')} кг`, 95, 920, 22); text(`Текущий вес: ${last.toFixed(1).replace('.', ',')} кг`, 390, 920, 22); text(`Изменение: ${(last - first).toFixed(1).replace('.', ',')} кг`, 700, 920, 22);
      const low = (vals.length ? Math.min(...vals) : first) - .2, high = (vals.length ? Math.max(...vals) : first) + .2, gx = 130, gy = 1045, gw = 920, gh = 170;
      ctx.strokeStyle = '#cfe1dd'; ctx.setLineDash([8, 8]); [0, .25, .5, .75, 1].forEach(v => { ctx.beginPath(); ctx.moveTo(gx, gy + gh * v); ctx.lineTo(gx + gw, gy + gh * v); ctx.stroke(); text((high - (high - low) * v).toFixed(1).replace('.', ','), 78, gy + gh * v - 10, 18, '#53716f'); }); ctx.setLineDash([]);
      ctx.strokeStyle = '#12b6b8'; ctx.lineWidth = 6; ctx.beginPath(); weights.forEach((r, i) => { const x = gx + (weights.length < 2 ? gw / 2 : i / (weights.length - 1) * gw), y = gy + (high - Number(r.kg)) / (high - low) * gh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      weights.forEach((r, i) => { const x = gx + (weights.length < 2 ? gw / 2 : i / (weights.length - 1) * gw), y = gy + (high - Number(r.kg)) / (high - low) * gh; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      text(weights.length + ' измерений', 95, 1285, 19, '#53716f'); text(`Период: ${weights[0]?.date || '—'} - ${weights.at(-1)?.date || '—'}`, 95, 1320, 19, '#53716f'); text('Записи веса', 95, 1380, 26, '#07383a', true); weights.slice(-4).forEach((r, i) => text(`${r.date} — ${r.kg} кг`, 95, 1425 + i * 42, 21));
      const doc = new Pdf({ unit: 'pt', format: 'a4' }); doc.addImage(canvas.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, 595, 842);
      canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2); page(); text('03 ИСТОРИЯ ПИТАНИЯ', 80, 130, 24, '#53716f'); text('Рационы и кормления', 80, 185, 40);
      let y = 260; if (feeds.length) feeds.forEach(r => { box(y, 100); text(r.date || 'Дата не указана', 105, y + 22, 20, '#53716f'); text(`${r.foodName || 'Корм'} · ${r.grams || 0} г`, 105, y + 60, 25, '#07383a', true); y += 125; }); else text('Записей кормлений пока нет.', 105, y, 24, '#53716f');
      box(y + 30, 210); text('04 АЛЛЕРГИИ И ИЗМЕНЕНИЯ СОСТОЯНИЯ', 95, y + 65, 20, '#53716f'); text(`Аллергии: ${ru(p.allergens || 'не указаны')}`, 95, y + 115, 24); text(notes.length ? notes.map(x => ru(x.text || x.name || 'Наблюдение')).join(' | ') : 'Наблюдений владельца пока нет.', 95, y + 160, 21);
      box(y + 280, 210, true); text('05 ИТОГОВАЯ СВОДКА', 95, y + 315, 20, '#53716f'); text(`Текущий вес: ${last.toFixed(1).replace('.', ',')} кг`, 95, y + 365, 26); text(`Кормлений: ${feeds.length} · записей веса: ${weights.length}`, 95, y + 410, 24); text('Отчёт содержит только внесённые данные.', 95, y + 465, 19, '#53716f');
      doc.addPage(); doc.addImage(canvas.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, 595, 842); doc.save(`nutripate-report-${p.name || 'pet'}.pdf`); toast('PDF-отчёт скачан');
    };
    const photo = new Image(); photo.onload = () => draw(photo); photo.onerror = () => draw(null); photo.src = typeof petPhoto === 'function' ? petPhoto(p) : '';
    if (photo.complete && photo.naturalWidth) draw(photo);
  };
}());
