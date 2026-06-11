/* mundial-groups.js — Mundial 2026 hub: explorador de grupos (tabs accesibles)
   y mini quiz de historia de los Mundiales. Vanilla JS, sin dependencias. */
(function () {
  'use strict';

  /* ============================================================
     1. EXPLORADOR DE GRUPOS — mejora progresiva: el HTML ya
        muestra los 4 grupos apilados; aquí los convertimos en tabs.
     ============================================================ */
  function initGroupTabs() {
    var root = document.getElementById('wc-group-explorer');
    if (!root) return;
    var panels = Array.prototype.slice.call(root.querySelectorAll('.wc-group'));
    if (panels.length < 2) return;

    var tablist = document.createElement('div');
    tablist.className = 'wc-tabs';
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Selecciones de LATAM por grupo');

    var tabs = panels.map(function (panel, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wc-tab';
      btn.id = 'wc-tab-' + i;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', panel.id);
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.tabIndex = i === 0 ? 0 : -1;
      btn.textContent = (panel.getAttribute('data-flag') || '') + ' ' +
        (panel.getAttribute('data-team') || '') + ' · ' +
        (panel.getAttribute('data-group') || '');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', btn.id);
      panel.tabIndex = 0;
      panel.hidden = i !== 0;
      tablist.appendChild(btn);
      return btn;
    });

    function select(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (moveFocus) tabs[index].focus();
    }

    tablist.addEventListener('click', function (e) {
      var tab = e.target.closest('.wc-tab');
      if (tab) select(tabs.indexOf(tab), false);
    });

    tablist.addEventListener('keydown', function (e) {
      var current = tabs.indexOf(document.activeElement);
      if (current === -1) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) { e.preventDefault(); select(next, true); }
    });

    root.classList.add('js-tabs');
    root.insertBefore(tablist, root.firstChild);
  }

  /* ============================================================
     2. MINI QUIZ "¿Cuánto sabes de los Mundiales?"
        Datos históricos verificados. Sin JS solo se ve el <noscript>.
     ============================================================ */
  var QUESTIONS = [
    {
      q: '¿Qué selección ganó la primera Copa del Mundo, en 1930?',
      options: ['Argentina', 'Uruguay', 'Brasil', 'Italia'],
      answer: 1,
      note: 'Uruguay organizó y ganó el primer Mundial en 1930: venció 4-2 a Argentina en la final de Montevideo.'
    },
    {
      q: '¿Cuántos títulos mundiales tiene Brasil, el máximo ganador del torneo?',
      options: ['3', '4', '5', '6'],
      answer: 2,
      note: 'Brasil suma cinco copas: 1958, 1962, 1970, 1994 y 2002. Nadie ha ganado más.'
    },
    {
      q: '¿En qué estadio se juega la final del Mundial 2026?',
      options: ['Estadio Azteca, Ciudad de México', 'Rose Bowl, Los Ángeles', 'AT&T Stadium, Dallas', 'MetLife Stadium, Nueva Jersey'],
      answer: 3,
      note: 'La final se disputa el 19 de julio de 2026 en el MetLife Stadium de East Rutherford, Nueva Jersey.'
    },
    {
      q: '¿Qué selección llega al Mundial 2026 como campeona defensora?',
      options: ['Francia', 'Brasil', 'Argentina', 'Alemania'],
      answer: 2,
      note: 'Argentina ganó Qatar 2022 al vencer a Francia en penales y conquistó así su tercer título mundial.'
    },
    {
      q: '¿Cuántas selecciones disputan el Mundial 2026, el primero con formato ampliado?',
      options: ['32', '40', '48', '64'],
      answer: 2,
      note: 'Por primera vez participan 48 selecciones, repartidas en 12 grupos de cuatro equipos.'
    }
  ];

  function initQuiz() {
    var box = document.getElementById('wc-quiz');
    if (!box) return;
    var current = 0;
    var score = 0;

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }

    function renderQuestion() {
      var item = QUESTIONS[current];
      box.innerHTML = '';
      box.appendChild(el('p', 'wc-quiz-progress', 'Pregunta ' + (current + 1) + ' de ' + QUESTIONS.length));
      box.appendChild(el('p', 'wc-quiz-q', item.q));

      var list = el('div', 'wc-quiz-options');
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'Opciones de respuesta');
      var feedback = el('div', 'wc-quiz-feedback');
      feedback.setAttribute('aria-live', 'polite');

      item.options.forEach(function (option, i) {
        var opt = el('button', 'wc-quiz-opt', option);
        opt.type = 'button';
        opt.addEventListener('click', function () {
          var buttons = list.querySelectorAll('.wc-quiz-opt');
          Array.prototype.forEach.call(buttons, function (b, j) {
            b.disabled = true;
            if (j === item.answer) b.classList.add('is-correct');
          });
          var ok = i === item.answer;
          if (ok) score++;
          else opt.classList.add('is-wrong');

          var lead = el('strong', null, ok ? '¡Correcto! ' : 'Casi… ');
          feedback.appendChild(lead);
          feedback.appendChild(document.createTextNode(item.note));

          var next = el('button', 'wc-quiz-next', current + 1 < QUESTIONS.length ? 'Siguiente pregunta' : 'Ver mi resultado');
          next.type = 'button';
          next.addEventListener('click', function () {
            current++;
            if (current < QUESTIONS.length) renderQuestion();
            else renderResult();
          });
          box.appendChild(next);
          next.focus();
        });
        list.appendChild(opt);
      });

      box.appendChild(list);
      box.appendChild(feedback);
    }

    function renderResult() {
      box.innerHTML = '';
      var messages = score === QUESTIONS.length ? '¡Perfecto! Te sabes los Mundiales de memoria.'
        : score >= 3 ? 'Muy bien: dominas la historia mundialista.'
        : 'Buen intento: el torneo apenas comienza y hay tiempo de repasar.';
      var wrap = el('div', null);
      wrap.style.textAlign = 'center';
      wrap.setAttribute('aria-live', 'polite');
      wrap.appendChild(el('p', 'wc-quiz-progress', 'Resultado final'));
      wrap.appendChild(el('p', 'wc-quiz-score', score + ' / ' + QUESTIONS.length));
      wrap.appendChild(el('p', 'wc-quiz-feedback', messages));

      var cta = el('a', 'wc-quiz-cta', 'Salón de la Fama sudamericano →');
      cta.href = '/mundial/salon-de-la-fama-sudamericano/';
      wrap.appendChild(cta);

      var again = el('button', 'wc-quiz-next', 'Jugar de nuevo');
      again.type = 'button';
      again.style.display = 'block';
      again.style.margin = '18px auto 0';
      again.addEventListener('click', function () {
        current = 0;
        score = 0;
        renderQuestion();
      });
      wrap.appendChild(again);
      box.appendChild(wrap);
    }

    renderQuestion();
  }

  /* El script se carga con defer, así que el DOM ya está disponible. */
  initGroupTabs();
  initQuiz();
})();
