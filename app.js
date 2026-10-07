(function () {
  'use strict';

  // ---------- Maths ----------

  // mg of THC in one gram of flower. 1% of 1000 mg = 10 mg.
  function mgPerGram(potencyPct) {
    return potencyPct * 10;
  }

  function gramsFromMg(totalMg, potencyPct) {
    return totalMg / mgPerGram(potencyPct);
  }

  function mgFromGrams(grams, potencyPct) {
    return grams * mgPerGram(potencyPct);
  }

  // Accepts things like "15,000", "15 000", "15000mg", "25%", "22.5".
  function parseNumber(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (s === '') return { empty: true };
    s = s.replace(/[,\s]/g, '').replace(/(mg|g|%)$/i, '');
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { invalid: true };
    return { value: parseFloat(s) };
  }

  function fmt(n, maxDigits) {
    var digits = maxDigits;
    if (digits === undefined) digits = Math.abs(n) < 1 ? 2 : 1;
    return new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits }).format(n);
  }

  var api = { mgPerGram: mgPerGram, gramsFromMg: gramsFromMg, mgFromGrams: mgFromGrams, parseNumber: parseNumber, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  // ---------- UI ----------

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    form: $('calc'),
    amount: $('amount'),
    amountLabel: $('amount-label'),
    amountUnit: $('amount-unit'),
    amountMsg: $('amount-msg'),
    potency: $('potency'),
    potencyMsg: $('potency-msg'),
    resultLabel: $('result-label'),
    resultValue: $('result-value'),
    working: $('working'),
    tabs: Array.prototype.slice.call(document.querySelectorAll('.modes [role="tab"]')),
    theme: $('theme')
  };

  var mode = 'mg-to-g';
  var savedAmounts = { 'mg-to-g': '', 'g-to-mg': '' };

  var MODES = {
    'mg-to-g': {
      amountLabel: 'Total THC',
      amountUnit: 'mg',
      placeholder: '15,000',
      resultLabel: 'Grams of flower',
      formula: 'Grams = mg THC \u00F7 (potency % \u00D7 10)'
    },
    'g-to-mg': {
      amountLabel: 'Flower',
      amountUnit: 'g',
      placeholder: '60',
      resultLabel: 'Total THC',
      formula: 'mg THC = grams \u00D7 (potency % \u00D7 10)'
    }
  };

  function setMsg(el, field, text, kind) {
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
    field.classList.toggle('invalid', kind === 'error');
  }

  function convert(amount, potency) {
    return mode === 'mg-to-g' ? gramsFromMg(amount, potency) : mgFromGrams(amount, potency);
  }

  function formatResult(n) {
    return mode === 'mg-to-g' ? fmt(n) + ' g' : fmt(n, 1) + ' mg';
  }

  function render() {
    var cfg = MODES[mode];
    var amountField = els.amount.closest('.field');
    var potencyField = els.potency.closest('.field');

    var a = parseNumber(els.amount.value);
    var p = parseNumber(els.potency.value);
    var amountOk = false;
    var potencyOk = false;

    if (a.empty) {
      setMsg(els.amountMsg, amountField, '');
    } else if (a.invalid) {
      setMsg(els.amountMsg, amountField, 'Enter a number, e.g. ' + cfg.placeholder, 'error');
    } else if (a.value <= 0) {
      setMsg(els.amountMsg, amountField, 'Enter an amount above 0', 'error');
    } else {
      setMsg(els.amountMsg, amountField, '');
      amountOk = true;
    }

    if (p.empty) {
      setMsg(els.potencyMsg, potencyField, '');
    } else if (p.invalid) {
      setMsg(els.potencyMsg, potencyField, 'Enter a number, e.g. 25', 'error');
    } else if (p.value <= 0 || p.value > 100) {
      setMsg(els.potencyMsg, potencyField, 'Enter a potency between 0 and 100', 'error');
    } else {
      potencyOk = true;
      if (p.value < 1) {
        setMsg(els.potencyMsg, potencyField, 'Did you mean ' + fmt(p.value * 100) + '%? Enter 25 for 25%.', 'warn');
      } else if (p.value > 40) {
        setMsg(els.potencyMsg, potencyField, 'High for flower. Check the label.', 'warn');
      } else {
        setMsg(els.potencyMsg, potencyField, '');
      }
    }

    // Result + working
    els.working.innerHTML = '';
    if (amountOk && potencyOk) {
      var perG = mgPerGram(p.value);
      var out = convert(a.value, p.value);
      els.resultValue.textContent = formatResult(out);

      var line1 = fmt(p.value, 2) + '% THC = ' + fmt(perG, 1) + ' mg THC per gram';
      var line2 = mode === 'mg-to-g'
        ? fmt(a.value, 2) + ' mg ÷ ' + fmt(perG, 1) + ' mg = ' + formatResult(out)
        : fmt(a.value, 2) + ' g × ' + fmt(perG, 1) + ' mg = ' + formatResult(out);
      [line1, line2].forEach(function (t) {
        var el = document.createElement('p');
        el.textContent = t;
        els.working.appendChild(el);
      });
    } else {
      els.resultValue.textContent = '–';
      var hint = document.createElement('p');
      hint.textContent = !amountOk && !potencyOk
        ? 'Enter an amount and a potency.'
        : !amountOk ? 'Enter an amount.' : 'Enter the potency from the label.';
      els.working.appendChild(hint);
    }

    updateUrl();
  }

  function applyMode(next, focus, initial) {
    if (!initial) savedAmounts[mode] = els.amount.value;
    mode = next;
    var cfg = MODES[mode];
    els.tabs.forEach(function (t) {
      var on = t.getAttribute('data-mode') === mode;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    els.amountLabel.textContent = cfg.amountLabel;
    els.amountUnit.textContent = cfg.amountUnit;
    els.amount.placeholder = cfg.placeholder;
    els.resultLabel.textContent = cfg.resultLabel;
    document.getElementById('formula').textContent = cfg.formula;
    els.amount.value = savedAmounts[mode];
    render();
  }

  // Keep the current inputs in the address bar so a calculation can be shared.
  function updateUrl() {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams();
    if (mode === 'g-to-mg') params.set('mode', 'g');
    if (els.amount.value.trim()) params.set('amount', els.amount.value.trim());
    if (els.potency.value.trim()) params.set('potency', els.potency.value.trim());
    var qs = params.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }

  function readUrl() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    if (params.get('mode') === 'g') {
      mode = 'g-to-mg';
    }
    if (params.get('amount')) els.amount.value = params.get('amount');
    if (params.get('potency')) els.potency.value = params.get('potency');
  }

  // Theme
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function paintThemeButton() {
    var dark = currentTheme() === 'dark';
    els.theme.textContent = dark ? 'Light' : 'Dark';
    els.theme.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  els.theme.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    var meta = document.getElementById('theme-color');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#141414' : '#ffffff');
    try { localStorage.setItem('theme', next); } catch (e) {}
    paintThemeButton();
  });

  // Events
  els.amount.addEventListener('input', render);
  els.potency.addEventListener('input', render);
  els.form.addEventListener('submit', function (e) { e.preventDefault(); });

  // Phone keyboards: "Next" on the amount moves to potency; "Done" on potency
  // closes the keyboard and brings the result into view.
  els.amount.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); els.potency.focus(); }
  });
  els.potency.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    els.potency.blur();
    var r = document.getElementById('result');
    if (r && r.getBoundingClientRect().bottom > window.innerHeight) {
      r.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  els.tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      if (tab.getAttribute('data-mode') !== mode) applyMode(tab.getAttribute('data-mode'));
    });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var next = els.tabs[(i + (e.key === 'ArrowRight' ? 1 : els.tabs.length - 1)) % els.tabs.length];
      applyMode(next.getAttribute('data-mode'), true);
    });
  });

  // Init
  readUrl();
  savedAmounts[mode] = els.amount.value;
  applyMode(mode, false, true);
  paintThemeButton();
})();
