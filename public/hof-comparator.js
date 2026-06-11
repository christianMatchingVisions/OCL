/**
 * Salón de la Fama Sudamericano — comparador cara a cara.
 * Datos verificados (FIFA / RSSSF, junio 2026). Deben coincidir 1:1 con la
 * tabla HTML de /mundial/salon-de-la-fama-sudamericano/.
 * Vanilla JS, sin dependencias. Mejora progresiva: sin JS, la tabla de la
 * página contiene toda la información.
 */
(function () {
  "use strict";

  // mejorRank: 1 = campeón ... 7 = nunca clasificó (menor es mejor).
  var DATA = {
    brasil:    { nombre: "Brasil",    bandera: "🇧🇷", participaciones: 23, titulos: 5, titulosDetalle: "1958, 1962, 1970, 1994, 2002", subcampeonatos: 2, subDetalle: "1950, 1998", mejor: "Campeón", mejorRank: 1, debut: 1930 },
    argentina: { nombre: "Argentina", bandera: "🇦🇷", participaciones: 19, titulos: 3, titulosDetalle: "1978, 1986, 2022", subcampeonatos: 3, subDetalle: "1930, 1990, 2014", mejor: "Campeón", mejorRank: 1, debut: 1930 },
    uruguay:   { nombre: "Uruguay",   bandera: "🇺🇾", participaciones: 15, titulos: 2, titulosDetalle: "1930, 1950", subcampeonatos: 0, subDetalle: "", mejor: "Campeón", mejorRank: 1, debut: 1930 },
    chile:     { nombre: "Chile",     bandera: "🇨🇱", participaciones: 9,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Tercer lugar (1962)", mejorRank: 3, debut: 1930 },
    paraguay:  { nombre: "Paraguay",  bandera: "🇵🇾", participaciones: 9,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Cuartos de final (2010)", mejorRank: 4, debut: 1930 },
    colombia:  { nombre: "Colombia",  bandera: "🇨🇴", participaciones: 7,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Cuartos de final (2014)", mejorRank: 4, debut: 1962 },
    peru:      { nombre: "Perú",      bandera: "🇵🇪", participaciones: 5,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Cuartos de final (1970)", mejorRank: 4, debut: 1930 },
    ecuador:   { nombre: "Ecuador",   bandera: "🇪🇨", participaciones: 5,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Octavos de final (2006)", mejorRank: 5, debut: 2002 },
    bolivia:   { nombre: "Bolivia",   bandera: "🇧🇴", participaciones: 3,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Fase de grupos", mejorRank: 6, debut: 1930 },
    venezuela: { nombre: "Venezuela", bandera: "🇻🇪", participaciones: 0,  titulos: 0, titulosDetalle: "", subcampeonatos: 0, subDetalle: "", mejor: "Nunca ha clasificado", mejorRank: 7, debut: null }
  };

  // Filas de la comparación: label, cómo se muestra y cómo se decide el "mejor".
  var ROWS = [
    {
      label: "Participaciones",
      value: function (n) { return String(n.participaciones); },
      score: function (n) { return n.participaciones; },
      higherWins: true
    },
    {
      label: "Títulos",
      value: function (n) { return n.titulos ? n.titulos + " (" + n.titulosDetalle + ")" : "0"; },
      score: function (n) { return n.titulos; },
      higherWins: true
    },
    {
      label: "Subcampeonatos",
      value: function (n) { return n.subcampeonatos ? n.subcampeonatos + " (" + n.subDetalle + ")" : "0"; },
      score: function (n) { return n.subcampeonatos; },
      higherWins: true
    },
    {
      label: "Mejor resultado",
      value: function (n) { return n.mejor; },
      score: function (n) { return -n.mejorRank; }, // rank menor = mejor
      higherWins: true
    },
    {
      label: "Debut mundialista",
      value: function (n) { return n.debut === null ? "—" : String(n.debut); },
      score: function (n) { return n.debut === null ? -Infinity : -n.debut; }, // debut más antiguo gana
      higherWins: true
    }
  ];

  function buildCard(nation, rival) {
    var card = document.createElement("div");
    card.className = "hof-card";

    var title = document.createElement("h3");
    title.textContent = nation.bandera + " " + nation.nombre;
    card.appendChild(title);

    ROWS.forEach(function (row) {
      var line = document.createElement("div");
      line.className = "hof-row";

      var label = document.createElement("span");
      label.textContent = row.label;
      line.appendChild(label);

      var val = document.createElement("span");
      val.className = "hof-val";
      val.textContent = row.value(nation);

      var a = row.score(nation);
      var b = row.score(rival);
      if (a !== b && (row.higherWins ? a > b : a < b)) {
        val.classList.add("hof-win");
        val.setAttribute("title", "Mejor registro en esta categoría");
      }
      line.appendChild(val);
      card.appendChild(line);
    });

    return card;
  }

  function render(selectA, selectB, results) {
    var nationA = DATA[selectA.value];
    var nationB = DATA[selectB.value];
    if (!nationA || !nationB) return;

    results.textContent = ""; // limpiar render anterior

    if (nationA === nationB) {
      var note = document.createElement("p");
      note.className = "hof-note";
      note.textContent = "Elige dos selecciones distintas para comparar sus historiales.";
      results.appendChild(note);
      return;
    }

    var grid = document.createElement("div");
    grid.className = "hof-grid";
    grid.appendChild(buildCard(nationA, nationB));
    grid.appendChild(buildCard(nationB, nationA));
    results.appendChild(grid);

    var legend = document.createElement("p");
    legend.className = "hof-note";
    legend.textContent = "En dorado: el mejor registro de cada categoría. Fuente: FIFA y RSSSF (verificado en junio de 2026).";
    results.appendChild(legend);
  }

  function init() {
    var selectA = document.getElementById("hof-select-a");
    var selectB = document.getElementById("hof-select-b");
    var results = document.getElementById("hof-results");
    if (!selectA || !selectB || !results) return;

    var update = function () { render(selectA, selectB, results); };
    selectA.addEventListener("change", update);
    selectB.addEventListener("change", update);
    update(); // comparación inicial (Brasil vs Argentina)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
