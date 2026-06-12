/**
 * wc2026-stats.js — Interactividad de /mundial/estadisticas-mundial-2026/.
 * Lee window.WC2026_DATA (cargado antes desde /wc2026-data.js); las cifras
 * deben coincidir 1:1 con las tablas HTML de la página.
 * Vanilla JS, sin dependencias. Mejora progresiva: sin JavaScript, todos los
 * datos están visibles en las tablas y listas estáticas de la página.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          node.setAttribute(key, String(attrs[key]));
        }
      }
    }
    return node;
  }

  /* Normaliza texto para comparar/filtrar sin distinguir tildes ni mayúsculas. */
  function normalize(str) {
    return String(str).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ============================================================
     1. EXPLORADOR DE GRUPOS — el HTML ya muestra los 12 grupos
        apilados; aquí los convertimos en pestañas accesibles.
     ============================================================ */
  function initGroupTabs() {
    var root = $("wcs-grupos");
    if (!root) return;
    var panels = Array.prototype.slice.call(root.querySelectorAll(".wcs-group"));
    if (panels.length < 2) return;

    var tablist = el("div", "wcs-tabs");
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Grupos del Mundial 2026");

    var tabs = panels.map(function (panel, i) {
      var letter = panel.getAttribute("data-tab") || "";
      var btn = el("button", "wcs-tab", letter);
      btn.type = "button";
      btn.id = "wcs-tab-" + letter.toLowerCase();
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", panel.id);
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.setAttribute("aria-label", "Grupo " + letter);
      btn.tabIndex = i === 0 ? 0 : -1;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", btn.id);
      panel.tabIndex = 0;
      panel.hidden = i !== 0;
      tablist.appendChild(btn);
      return btn;
    });

    function select(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (moveFocus) tabs[index].focus();
    }

    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest(".wcs-tab");
      if (tab) select(tabs.indexOf(tab), false);
    });

    tablist.addEventListener("keydown", function (e) {
      var current = tabs.indexOf(document.activeElement);
      if (current === -1) return;
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % tabs.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next !== null) { e.preventDefault(); select(next, true); }
    });

    root.classList.add("js-tabs");
    root.insertBefore(tablist, root.firstChild);
  }

  /* ============================================================
     2. TABLAS ORDENABLES — cada <th data-type="num|text"> se
        vuelve un botón que ordena la tabla (asc/desc, aria-sort).
     ============================================================ */
  function cellValue(row, idx, type) {
    var text = row.cells[idx] ? row.cells[idx].textContent.trim() : "";
    if (type === "num") {
      var n = parseFloat(text.replace(/,/g, ""));
      return isNaN(n) ? -Infinity : n;
    }
    /* Quita banderas/símbolos iniciales para ordenar por el nombre. */
    return normalize(text.replace(/^[^A-Za-zÀ-ɏ]+/, ""));
  }

  function sortTable(table, th, idx, type) {
    var current = th.getAttribute("aria-sort");
    var dir = current === "descending" ? "asc"
      : current === "ascending" ? "desc"
      : (type === "num" ? "desc" : "asc");

    var headerCells = th.parentNode.cells;
    for (var i = 0; i < headerCells.length; i++) headerCells[i].removeAttribute("aria-sort");
    th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");

    var tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    rows.sort(function (a, b) {
      var va = cellValue(a, idx, type);
      var vb = cellValue(b, idx, type);
      var cmp = type === "num" ? va - vb : String(va).localeCompare(String(vb), "es");
      return dir === "asc" ? cmp : -cmp;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });
  }

  function initSortableTables() {
    var tables = document.querySelectorAll("table.wcs-sortable");
    Array.prototype.forEach.call(tables, function (table) {
      if (!table.tHead || !table.tBodies.length) return;
      var ths = table.tHead.rows[0].cells;
      Array.prototype.forEach.call(ths, function (th, idx) {
        var type = th.getAttribute("data-type");
        if (!type) return;
        var label = th.textContent.trim();
        var btn = el("button", "wcs-sort-btn", label);
        btn.type = "button";
        btn.setAttribute("aria-label", "Ordenar por " + label);
        th.textContent = "";
        th.appendChild(btn);
        btn.addEventListener("click", function () { sortTable(table, th, idx, type); });
      });
      /* La tabla ya viene ordenada por su columna por defecto. */
      var def = table.querySelector("th[data-default]");
      if (def) {
        def.setAttribute("aria-sort", def.getAttribute("data-default") === "asc" ? "ascending" : "descending");
      }
      table.classList.add("js-sortable");
    });
  }

  /* ============================================================
     3. FILTRO DE GOLEADORES — filtra por jugador o selección.
     ============================================================ */
  function initScorerFilter() {
    var input = $("wcs-filtro-goleadores");
    var table = $("wcs-tabla-goleadores");
    var status = $("wcs-estado-goleadores");
    if (!input || !table || !table.tBodies.length) return;

    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    var total = rows.length;

    input.addEventListener("input", function () {
      var query = normalize(input.value.trim());
      var visible = 0;
      rows.forEach(function (row) {
        var haystack = normalize(row.cells[0].textContent + " " + row.cells[1].textContent);
        var show = !query || haystack.indexOf(query) !== -1;
        row.hidden = !show;
        if (show) visible++;
      });
      if (status) {
        status.textContent = visible === total
          ? "Mostrando los " + total + " goleadores."
          : visible === 0
            ? "Sin resultados para ese filtro. Borra el texto para ver la lista completa."
            : "Mostrando " + visible + " de " + total + " goleadores.";
      }
    });
  }

  /* ============================================================
     4a. GRÁFICO DE BARRAS — goles por edición (1930-2022).
     ============================================================ */
  function initGoalsChart() {
    var box = $("wcs-grafico-goles");
    var data = window.WC2026_DATA && window.WC2026_DATA.ediciones;
    if (!box || !data || !data.length) return;

    var W = 720, H = 340, padL = 46, padR = 8, padT = 14, padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    var maxY = 180;

    /* role="group" (no "img"): así los rect enfocables exponen su propio
       aria-label a los lectores de pantalla, en lugar de quedar como
       descendientes presentacionales de un role="img". */
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "group" });
    svg.setAttribute("aria-label", "Gráfico de barras con los goles anotados en cada edición del Mundial, de 1930 a 2022. El mínimo es 70 goles, en 1930 y 1934, y el máximo es 172 goles, en Qatar 2022.");

    /* Cuadrícula y etiquetas del eje vertical. */
    [0, 45, 90, 135, 180].forEach(function (value) {
      var y = padT + plotH - (value / maxY) * plotH;
      var line = svgEl("line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "#2a3550", "stroke-width": value === 0 ? 1.5 : 1, "stroke-dasharray": value === 0 ? "none" : "3 4" });
      svg.appendChild(line);
      var label = svgEl("text", { x: padL - 8, y: y + 3.5, "text-anchor": "end", "font-size": 11, fill: "#8a9ab5" });
      label.textContent = String(value);
      svg.appendChild(label);
    });

    var tooltip = $("wcs-tooltip-goles");
    var card = tooltip ? tooltip.parentNode : null;

    function showTip(rect, info) {
      if (!tooltip || !card) return;
      tooltip.textContent = info;
      var r = rect.getBoundingClientRect();
      var c = card.getBoundingClientRect();
      tooltip.style.left = (r.left - c.left + r.width / 2) + "px";
      tooltip.style.top = (r.top - c.top - 6) + "px";
      tooltip.classList.add("visible");
    }

    function hideTip() {
      if (tooltip) tooltip.classList.remove("visible");
    }

    var n = data.length;
    var step = plotW / n;
    var barW = step * 0.62;

    data.forEach(function (d, i) {
      var h = (d.goles / maxY) * plotH;
      var x = padL + i * step + (step - barW) / 2;
      var y = padT + plotH - h;
      var promedio = (d.goles / d.partidos).toFixed(2);
      var info = d.anio + ": " + d.goles + " goles en " + d.partidos + " partidos (" + promedio + " por partido)";

      var rect = svgEl("rect", { x: x, y: y, width: barW, height: h, rx: 2, "class": "wcs-bar", tabindex: 0, role: "img" });
      rect.setAttribute("aria-label", info);
      var title = svgEl("title");
      title.textContent = info;
      rect.appendChild(title);

      rect.addEventListener("mouseenter", function () { showTip(rect, info); });
      rect.addEventListener("mouseleave", hideTip);
      rect.addEventListener("focus", function () { showTip(rect, info); });
      rect.addEventListener("blur", hideTip);
      svg.appendChild(rect);

      if (i % 2 === 0) {
        var yearLabel = svgEl("text", { x: x + barW / 2, y: H - padB + 18, "text-anchor": "middle", "font-size": 10, fill: "#8a9ab5" });
        yearLabel.textContent = String(d.anio);
        svg.appendChild(yearLabel);
      }
    });

    box.appendChild(svg);
  }

  /* ============================================================
     4b. GRÁFICO DE DONA — títulos por confederación (1930-2022).
     ============================================================ */
  function initConfedChart() {
    var box = $("wcs-grafico-confederaciones");
    var data = window.WC2026_DATA && window.WC2026_DATA.titulosConfederacion;
    if (!box || !data || !data.length) return;

    var size = 240, center = 120, radius = 78, strokeWidth = 30;
    var circumference = 2 * Math.PI * radius;
    var total = 0;
    data.forEach(function (d) { total += d.titulos; });

    var parts = data.map(function (d) { return d.confederacion + ", " + d.titulos + " títulos"; }).join("; ");
    var svg = svgEl("svg", { viewBox: "0 0 " + size + " " + size, role: "img" });
    svg.setAttribute("aria-label", "Gráfico de dona con los títulos mundiales por confederación entre 1930 y 2022: " + parts + "; " + total + " títulos en total, uno por cada edición disputada.");

    var offset = 0;
    data.forEach(function (d) {
      var length = circumference * (d.titulos / total);
      var circle = svgEl("circle", {
        cx: center, cy: center, r: radius, fill: "none",
        stroke: d.color, "stroke-width": strokeWidth,
        "stroke-dasharray": length + " " + (circumference - length),
        "stroke-dashoffset": -offset,
        transform: "rotate(-90 " + center + " " + center + ")"
      });
      var title = svgEl("title");
      title.textContent = d.confederacion + " (" + d.region + "): " + d.titulos + " títulos";
      circle.appendChild(title);
      svg.appendChild(circle);
      offset += length;
    });

    var big = svgEl("text", { x: center, y: center - 2, "text-anchor": "middle", "font-size": 34, "font-weight": 800, fill: "#ffffff" });
    big.textContent = String(total);
    svg.appendChild(big);
    var small = svgEl("text", { x: center, y: center + 22, "text-anchor": "middle", "font-size": 12, fill: "#8a9ab5" });
    small.textContent = "títulos (1930-2022)";
    svg.appendChild(small);

    box.appendChild(svg);
  }

  /* ============================================================
     5. COMPARADOR DE SELECCIONES 2026 — dos selects, tarjetas
        lado a lado, mejor registro en dorado.
     ============================================================ */
  function initComparator() {
    var selectA = $("wcs-cmp-a");
    var selectB = $("wcs-cmp-b");
    var results = $("wcs-cmp-resultados");
    var teams = window.WC2026_DATA && window.WC2026_DATA.equipos;
    if (!selectA || !selectB || !results || !teams) return;

    var byId = {};
    teams.forEach(function (team) { byId[team.id] = team; });

    var ROWS = [
      { label: "Grupo", value: function (t) { return "Grupo " + t.grupo; }, score: null },
      { label: "Confederación", value: function (t) { return t.confederacion; }, score: null },
      { label: "Ranking FIFA", value: function (t) { return String(t.ranking); }, score: function (t) { return -t.ranking; } },
      { label: "Participaciones", value: function (t) { return String(t.participaciones); }, score: function (t) { return t.participaciones; } },
      { label: "Títulos", value: function (t) { return String(t.titulos); }, score: function (t) { return t.titulos; } },
      { label: "Mejor resultado", value: function (t) { return t.mejor; }, score: function (t) { return -t.mejorRank; } }
    ];

    function buildCard(team, rival) {
      var card = el("div", "wcs-card");
      var title = el("h3", null, team.bandera + " " + team.nombre);
      card.appendChild(title);

      ROWS.forEach(function (row) {
        var line = el("div", "wcs-row");
        line.appendChild(el("span", null, row.label));
        var val = el("span", "wcs-val", row.value(team));
        if (row.score) {
          var a = row.score(team);
          var b = row.score(rival);
          if (a !== b && a > b) {
            val.classList.add("wcs-win");
            val.setAttribute("title", "Mejor registro en esta categoría");
          }
        }
        line.appendChild(val);
        card.appendChild(line);
      });
      return card;
    }

    function render() {
      var teamA = byId[selectA.value];
      var teamB = byId[selectB.value];
      if (!teamA || !teamB) return;

      results.textContent = "";

      if (teamA === teamB) {
        results.appendChild(el("p", "wcs-note", "Elige dos selecciones distintas para comparar sus historiales."));
        return;
      }

      var grid = el("div", "wcs-grid");
      grid.appendChild(buildCard(teamA, teamB));
      grid.appendChild(buildCard(teamB, teamA));
      results.appendChild(grid);

      results.appendChild(el("p", "wcs-note", "En dorado: el mejor registro de cada categoría. Ranking FIFA de junio de 2026; las participaciones incluyen el Mundial 2026. Fuente: FIFA y RSSSF."));
    }

    selectA.addEventListener("change", render);
    selectB.addEventListener("change", render);
    render(); /* comparación inicial: México vs Argentina */
  }

  /* ============================================================
     6. RÉCORDS — chips de categoría (botones con aria-pressed)
        que filtran las tarjetas estáticas.
     ============================================================ */
  function initRecordChips() {
    var bar = $("wcs-chips-records");
    var grid = $("wcs-grid-records");
    var status = $("wcs-estado-records");
    if (!bar || !grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll(".wcs-record"));
    if (!cards.length) return;

    var categories = [
      { id: "todos", label: "Todos" },
      { id: "goles", label: "Goles" },
      { id: "jugadores", label: "Jugadores" },
      { id: "equipos", label: "Equipos" },
      { id: "asistencia", label: "Asistencia" },
      { id: "torneos", label: "Torneos" }
    ];

    var chips = categories.map(function (cat) {
      var count = cat.id === "todos" ? cards.length : cards.filter(function (card) {
        return card.getAttribute("data-cat") === cat.id;
      }).length;
      var chip = el("button", "wcs-chip", cat.label + " (" + count + ")");
      chip.type = "button";
      chip.setAttribute("aria-pressed", cat.id === "todos" ? "true" : "false");
      chip.setAttribute("data-cat", cat.id);
      bar.appendChild(chip);
      return chip;
    });

    bar.addEventListener("click", function (e) {
      var chip = e.target.closest(".wcs-chip");
      if (!chip) return;
      var catId = chip.getAttribute("data-cat");
      var catLabel = "";
      categories.forEach(function (cat) { if (cat.id === catId) catLabel = cat.label; });

      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });

      var visible = 0;
      cards.forEach(function (card) {
        var show = catId === "todos" || card.getAttribute("data-cat") === catId;
        card.hidden = !show;
        if (show) visible++;
      });

      if (status) {
        status.textContent = catId === "todos"
          ? "Mostrando los " + cards.length + " récords."
          : "Mostrando " + visible + " récords de la categoría " + catLabel + ".";
      }
    });
  }

  /* ============================================================
     Inicialización
     ============================================================ */
  function init() {
    initGroupTabs();
    initSortableTables();
    initScorerFilter();
    initGoalsChart();
    initConfedChart();
    initComparator();
    initRecordChips();
    /* reducedMotion() queda disponible por si algún módulo futuro anima;
       hoy todo el movimiento es opacity/transform vía CSS, que ya respeta
       prefers-reduced-motion en la hoja de estilos de la página. */
    void reducedMotion;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
