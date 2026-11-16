(function () {
  window.weightChartSvg = function (rows, period) {
    period = period || window.weightPeriod || 'week';
    var days = { week: 7, month: 30, quarter: 90, year: 365, all: null }[period];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cutoff = days ? new Date(today.getTime() - (days - 1) * 86400000) : null;
    var raw = (rows || []).map(function (row, order) {
      return { date: String(row.date || ''), kg: Number(row.kg), order: order };
    }).filter(function (row) { return row.date && Number.isFinite(row.kg) && row.kg > 0; })
      .sort(function (a, b) { return a.date.localeCompare(b.date) || a.order - b.order; });
    var counts = {}, seen = {};
    raw.forEach(function (row) { counts[row.date] = (counts[row.date] || 0) + 1; });
    var points = raw.map(function (row) {
      var base = new Date(row.date + 'T00:00:00');
      var index = seen[row.date] || 0; seen[row.date] = index + 1;
      return Object.assign({}, row, { base: base, plot: new Date(base.getTime() + (index - (counts[row.date] - 1) / 2) * 86400000 * .35) });
    }).filter(function (row) { return !cutoff || row.base >= cutoff; });
    if (!points.length) return '<div class="chart chart-empty">Нет записей за этот период</div>';
    var w = 360, h = 250, left = 52, right = 18, top = 18, bottom = 38;
    var low = Math.min.apply(null, points.map(function (p) { return p.kg; }));
    var high = Math.max.apply(null, points.map(function (p) { return p.kg; }));
    var pad = Math.max(.15, (high - low) * .3), min = low - pad, max = high + pad;
    var registration = points[0].date;
    var start = period === 'all' ? points[0].base : cutoff;
    var end = period === 'all' ? points[points.length - 1].base : today;
    var range = Math.max(86400000, end - start), plotWidth = w - left - right, plotHeight = h - top - bottom;
    var x = function (i) { return points.length === 1 ? left : left + i / (points.length - 1) * plotWidth; };
    var y = function (value) { return top + (max - value) / (max - min) * plotHeight; };
    var polyline = points.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.kg).toFixed(1); }).join(' ');
    var grid = [0, 1, 2, 3, 4].map(function (i) { var yy = top + i * plotHeight / 4, value = max - (max - min) * i / 4; return '<line x1="' + left + '" y1="' + yy + '" x2="' + (w - right) + '" y2="' + yy + '"/><text x="2" y="' + (yy + 5) + '">' + value.toFixed(1).replace('.', ',') + '</text>'; }).join('');
    var dots = points.map(function (p, i) { return '<circle cx="' + x(i) + '" cy="' + y(p.kg) + '" r="5"/>'; }).join('');
    var label = function (value) { return window.esc ? window.esc(value) : value; };
    var leftLabel = period === 'all' ? points[0].date : start.toISOString().slice(0, 10);
    var rightLabel = period === 'all' ? points[points.length - 1].date : end.toISOString().slice(0, 10);
    var labels = '<text x="' + left + '" y="' + (h - 8) + '">' + label(leftLabel) + '</text><text x="' + (w - right - 58) + '" y="' + (h - 8) + '">' + label(rightLabel) + '</text>';
    return '<div class="chart chart-svg"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="График веса">' + grid + '<polyline points="' + polyline + '"/>' + dots + '<text class="last-value" x="' + Math.min(w - right - 45, Math.max(left, x(points.length - 1) - 12)) + '" y="' + Math.max(14, y(points[points.length - 1].kg) - 12) + '">' + points[points.length - 1].kg.toFixed(1).replace('.', ',') + ' кг</text>' + labels + '</svg></div>';
  };
}());
