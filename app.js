(function () {
  'use strict';

  // Daily THC limit for edibles (mg per day). Change this one number if the rule changes.
  var EDIBLE_DAILY_LIMIT_MG = 40;

  // ---------- Maths ----------

  // mg of THC in one gram of product. 1% of 1000 mg = 10 mg.
  function mgPerGram(potencyPct) {
    return potencyPct * 10;
  }

  function gramsFromMg(totalMg, potencyPct) {
    return totalMg / mgPerGram(potencyPct);
  }

  function mgFromGrams(grams, potencyPct) {
    return grams * mgPerGram(potencyPct);
  }

  function piecesFromMg(totalMg, mgPerPiece) {
    return totalMg / mgPerPiece;
  }

  function mgFromPieces(pieces, mgPerPiece) {
    return pieces * mgPerPiece;
  }

  // Accepts things like "15,000", "15 000", "15000mg", "25%", "22.5".
  function parseNumber(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (s === '') return { empty: true };
    s = s.replace(/[,\s]/g, '').replace(/(mg|g|%|pcs|days?)$/i, '');
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { invalid: true };
    return { value: parseFloat(s) };
  }

  function fmt(n, maxDigits) {
    var digits = maxDigits;
    if (digits === undefined) digits = Math.abs(n) < 1 ? 2 : 1;
    return new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits }).format(n);
  }

  var api = {
    EDIBLE_DAILY_LIMIT_MG: EDIBLE_DAILY_LIMIT_MG,
    mgPerGram: mgPerGram, gramsFromMg: gramsFromMg, mgFromGrams: mgFromGrams,
    piecesFromMg: piecesFromMg, mgFromPieces: mgFromPieces,
    parseNumber: parseNumber, fmt: fmt
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  // ---------- Product setup ----------

  var PRODUCTS = {
    flower: {
      unit: 'g',
      noun: 'grams',
      reverseLabel: 'Flower',
      reversePlaceholder: '60',
      resultLabel: 'Grams of flower',
      strengthLabel: 'THC potency',
      strengthUnit: '%',
      strengthPlaceholder: '25',
      mgPlaceholder: '15,000'
    },
    concentrate: {
      unit: 'g',
      noun: 'grams',
      reverseLabel: 'Concentrate',
      reversePlaceholder: '5',
      resultLabel: 'Grams of concentrate',
      strengthLabel: 'THC potency',
      strengthUnit: '%',
      strengthPlaceholder: '70',
      mgPlaceholder: '15,000'
    },
    edible: {
      unit: 'pcs',
      noun: 'pieces',
      reverseLabel: 'Pieces',
      reversePlaceholder: '60',
      resultLabel: 'Edible pieces',
      strengthLabel: 'THC per piece',
      strengthUnit: 'mg',
      strengthPlaceholder: '10',
      mgPlaceholder: '1,200'
    }
  };

  // ---------- UI ----------

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    form: $('calc'),
    amount: $('amount'),
    amountLabel: $('amount-label'),
    amountUnit: $('amount-unit'),
    amountMsg: $('amount-msg'),
    potency: $('potency'),
    potencyLabel: $('potency-label'),
    potencyUnit: $('potency-unit'),
    potencyMsg: $('potency-msg'),
    days: $('days'),
    pack: $('pack'),
    packField: $('pack-field'),
    packMsg: $('pack-msg'),
    daysField: $('days-field'),
    daysMsg: $('days-msg'),
    dirTo: $('dir-to'),
    dirFrom: $('dir-from'),
    resultLabel: $('result-label'),
    resultValue: $('result-value'),
    working: $('working'),
    formula: $('formula'),
    productTabs: Array.prototype.slice.call(document.querySelectorAll('.products [role="tab"]')),
    dirTabs: Array.prototype.slice.call(document.querySelectorAll('.modes [role="tab"]')),
    theme: $('theme')
  };

  var product = 'flower';
  var dir = 'to'; // 'to' = mg THC -> product amount, 'from' = product amount -> mg THC
  var saved = { amount: {}, potency: {} };

  function amountKey() { return dir === 'to' ? 'mg' : product; }

  function setMsg(el, field, text, kind) {
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
    field.classList.toggle('invalid', kind === 'error');
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  function formatAmount(n) {
    if (product === 'edible') return fmt(n, 1) + ' ' + plural(n, 'piece', 'pieces');
    return fmt(n) + ' g';
  }

  function formatMg(n) { return fmt(n, 1) + '\u00A0mg'; }

  function addLine(text, cls) {
    var el = document.createElement('p');
    el.textContent = text;
    if (cls) el.className = cls;
    els.working.appendChild(el);
  }

  // Things like grams, packs and pieces can only be dispensed in whole units.
  // Returns the nearest whole number plus a line with both rounding options
  // and the mg each one actually comes to.
  function wholeOptions(exact, mgPerUnit, label, flag) {
    var nearest = Math.round(exact);
    if (Math.abs(exact - nearest) < 1e-9) return { value: nearest, line: null };
    var lo = Math.floor(exact);
    var hi = Math.ceil(exact);
    var opt = function (n) {
      var mg = n * mgPerUnit;
      return label(n) + ' (' + formatMg(mg) + (flag ? flag(mg) : '') + ')';
    };
    var line = 'Exact: ' + label(exact) + '. ' + (lo > 0
      ? 'Round down to ' + opt(lo) + ' or up to ' + opt(hi) + '.'
      : 'Round up to ' + opt(hi) + '.');
    var value = nearest > 0 ? nearest : hi;
    // If rounding to the nearest goes over a limit but rounding down doesn't, suggest rounding down.
    if (flag && value === hi && lo > 0 && flag(hi * mgPerUnit) && !flag(lo * mgPerUnit)) value = lo;
    return { value: value, line: line };
  }

  function checkStrength(p, field) {
    var isEdible = product === 'edible';
    if (p.empty) { setMsg(els.potencyMsg, field, ''); return false; }
    if (p.invalid) { setMsg(els.potencyMsg, field, 'Enter a number, e.g. ' + PRODUCTS[product].strengthPlaceholder, 'error'); return false; }
    if (p.value <= 0) { setMsg(els.potencyMsg, field, 'Enter a value above 0', 'error'); return false; }
    if (!isEdible && p.value > 100) { setMsg(els.potencyMsg, field, 'Enter a potency between 0 and 100', 'error'); return false; }

    var warn = '';
    if (isEdible) {
      if (p.value > EDIBLE_DAILY_LIMIT_MG) warn = 'One piece is over the ' + EDIBLE_DAILY_LIMIT_MG + ' mg daily limit.';
    } else if (p.value < 1) {
      warn = 'Did you mean ' + fmt(p.value * 100) + '%? Enter 25 for 25%.';
    } else if (product === 'flower' && p.value > 40) {
      warn = 'High for flower. Is this a concentrate?';
    } else if (product === 'concentrate' && p.value < 10) {
      warn = 'Low for a concentrate. Check the label.';
    }
    setMsg(els.potencyMsg, field, warn, warn ? 'warn' : '');
    return true;
  }

  function render() {
    var cfg = PRODUCTS[product];
    var isEdible = product === 'edible';
    var amountField = els.amount.closest('.field');
    var potencyField = els.potency.closest('.field');

    var a = parseNumber(els.amount.value);
    var p = parseNumber(els.potency.value);
    var d = parseNumber(els.days.value);
    var amountOk = false;

    if (a.empty) {
      setMsg(els.amountMsg, amountField, '');
    } else if (a.invalid) {
      setMsg(els.amountMsg, amountField, 'Enter a number, e.g. ' + (dir === 'to' ? cfg.mgPlaceholder : cfg.reversePlaceholder), 'error');
    } else if (a.value <= 0) {
      setMsg(els.amountMsg, amountField, 'Enter an amount above 0', 'error');
    } else {
      setMsg(els.amountMsg, amountField, '');
      amountOk = true;
    }

    var potencyOk = checkStrength(p, potencyField);

    var packOk = false;
    var k = parseNumber(els.pack.value);
    if (product === 'concentrate') {
      if (k.empty) {
        setMsg(els.packMsg, els.packField, '');
      } else if (k.invalid || k.value <= 0) {
        setMsg(els.packMsg, els.packField, 'Enter the grams per pack, e.g. 1', 'error');
      } else {
        setMsg(els.packMsg, els.packField, '');
        packOk = true;
      }
    }

    var daysOk = false;
    if (isEdible) {
      if (d.empty) {
        setMsg(els.daysMsg, els.daysField, '');
      } else if (d.invalid || d.value <= 0) {
        setMsg(els.daysMsg, els.daysField, 'Enter a number of days, e.g. 30', 'error');
      } else {
        setMsg(els.daysMsg, els.daysField, '');
        daysOk = true;
      }
    }

    if (dir === 'to') {
      els.resultLabel.textContent = product === 'concentrate' && packOk
        ? 'Packs of ' + fmt(k.value, 2) + ' g'
        : cfg.resultLabel;
    }

    els.working.innerHTML = '';
    if (amountOk && potencyOk) {
      var totalMg, out, rounded;
      var dayFlag = null;
      if (isEdible && daysOk) {
        dayFlag = function (mg) {
          return mg / d.value > EDIBLE_DAILY_LIMIT_MG + 1e-9 ? ', over daily limit' : '';
        };
      }

      if (isEdible) {
        if (dir === 'to') {
          totalMg = a.value;
          out = piecesFromMg(a.value, p.value);
          rounded = wholeOptions(out, p.value, function (n) {
            return fmt(n) + '\u00A0' + plural(n, 'piece', 'pieces');
          }, dayFlag);
          els.resultValue.textContent = fmt(rounded.value) + ' ' + plural(rounded.value, 'piece', 'pieces');
          if (rounded.line) addLine(rounded.line, 'round');
          addLine(fmt(a.value, 2) + ' mg ÷ ' + formatMg(p.value) + ' per piece = ' + formatAmount(out));
        } else {
          out = mgFromPieces(a.value, p.value);
          totalMg = out;
          els.resultValue.textContent = formatMg(out);
          addLine(fmt(a.value, 2) + ' ' + plural(a.value, 'piece', 'pieces') + ' × ' + formatMg(p.value) + ' = ' + formatMg(out));
        }
        if (daysOk) {
          var perDay = totalMg / d.value;
          var piecesPerDay = perDay / p.value;
          addLine('Over ' + fmt(d.value, 1) + ' ' + plural(d.value, 'day', 'days') + ': ' + formatMg(perDay) + ' per day (' + fmt(piecesPerDay, 1) + ' ' + plural(piecesPerDay, 'piece', 'pieces') + ')');
          if (perDay > EDIBLE_DAILY_LIMIT_MG + 1e-9) {
            addLine('Over the ' + EDIBLE_DAILY_LIMIT_MG + ' mg per day limit for edibles. Maximum over ' + fmt(d.value, 1) + ' ' + plural(d.value, 'day', 'days') + ' is ' + formatMg(EDIBLE_DAILY_LIMIT_MG * d.value) + '.', 'alert');
          } else {
            addLine('Within the ' + EDIBLE_DAILY_LIMIT_MG + ' mg per day limit.', 'ok');
          }
        }
      } else {
        var perG = mgPerGram(p.value);
        var potencyLine = fmt(p.value, 2) + '% THC = ' + fmt(perG, 1) + ' mg THC per gram';
        if (dir === 'to') {
          out = gramsFromMg(a.value, p.value);
          var calcLine = fmt(a.value, 2) + ' mg ÷ ' + fmt(perG, 1) + ' mg = ' + formatAmount(out);
          if (product === 'concentrate' && packOk) {
            // Concentrate is dispensed in whole packs.
            var packs = out / k.value;
            var packLabel = function (n) {
              return fmt(n) + '\u00A0' + plural(n, 'pack', 'packs');
            };
            rounded = wholeOptions(packs, perG * k.value, packLabel);
            els.resultLabel.textContent = 'Packs of ' + fmt(k.value, 2) + ' g';
            els.resultValue.textContent = fmt(rounded.value) + ' ' + plural(rounded.value, 'pack', 'packs');
            if (rounded.line) addLine(rounded.line, 'round');
            addLine(potencyLine);
            addLine(calcLine);
            addLine(fmt(out) + ' g ÷ ' + fmt(k.value, 2) + ' g per pack = ' + fmt(packs) + ' ' + plural(packs, 'pack', 'packs'));
          } else {
            rounded = wholeOptions(out, perG, function (n) { return fmt(n) + '\u00A0g'; });
            els.resultLabel.textContent = cfg.resultLabel;
            els.resultValue.textContent = fmt(rounded.value) + ' g';
            if (rounded.line) addLine(rounded.line, 'round');
            addLine(potencyLine);
            addLine(calcLine);
          }
        } else {
          out = mgFromGrams(a.value, p.value);
          els.resultValue.textContent = formatMg(out);
          addLine(potencyLine);
          addLine(fmt(a.value, 2) + ' g × ' + fmt(perG, 1) + ' mg = ' + formatMg(out));
          if (product === 'concentrate' && packOk) {
            var revPacks = a.value / k.value;
            addLine(fmt(a.value) + ' g = ' + fmt(revPacks, 1) + ' ' + plural(revPacks, 'pack', 'packs') + ' of ' + fmt(k.value, 2) + ' g');
          }
        }
      }
    } else {
      els.resultValue.textContent = '–';
      var what = isEdible ? 'the THC per piece' : 'a potency';
      addLine(!amountOk && !potencyOk ? 'Enter an amount and ' + what + '.'
        : !amountOk ? 'Enter an amount.' : 'Enter ' + what + ' from the label.');
    }

    updateUrl();
  }

  function paintTabs(tabs, attr, value, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute(attr) === value;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
  }

  function saveInputs() {
    saved.amount[amountKey()] = els.amount.value;
    saved.potency[product] = els.potency.value;
  }

  function applyState(focusTabs) {
    var cfg = PRODUCTS[product];
    var isEdible = product === 'edible';

    paintTabs(els.productTabs, 'data-product', product, focusTabs === 'product');
    paintTabs(els.dirTabs, 'data-dir', dir, focusTabs === 'dir');

    els.dirTo.textContent = 'mg THC → ' + cfg.noun;
    els.dirFrom.textContent = cfg.noun + ' → mg THC';

    if (dir === 'to') {
      els.amountLabel.textContent = 'Total THC';
      els.amountUnit.textContent = 'mg';
      els.amount.placeholder = cfg.mgPlaceholder;
      els.resultLabel.textContent = cfg.resultLabel;
    } else {
      els.amountLabel.textContent = cfg.reverseLabel;
      els.amountUnit.textContent = cfg.unit;
      els.amount.placeholder = cfg.reversePlaceholder;
      els.resultLabel.textContent = 'Total THC';
    }

    els.potencyLabel.textContent = cfg.strengthLabel;
    els.potencyUnit.textContent = cfg.strengthUnit;
    els.potency.placeholder = cfg.strengthPlaceholder;
    els.potency.setAttribute('enterkeyhint', product === 'flower' ? 'done' : 'next');
    els.daysField.hidden = !isEdible;
    els.packField.hidden = product !== 'concentrate';

    if (isEdible) {
      els.formula.textContent = dir === 'to'
        ? 'Pieces = mg THC ÷ mg per piece'
        : 'mg THC = pieces × mg per piece';
    } else {
      els.formula.textContent = dir === 'to'
        ? 'Grams = mg THC ÷ (potency % × 10)'
        : 'mg THC = grams × (potency % × 10)';
    }

    els.amount.value = saved.amount[amountKey()] || '';
    els.potency.value = saved.potency[product] || '';
    render();
  }

  function setProduct(next, focus) {
    if (next === product) return;
    saveInputs();
    product = next;
    applyState(focus ? 'product' : null);
  }

  function setDir(next, focus) {
    if (next === dir) return;
    saveInputs();
    dir = next;
    applyState(focus ? 'dir' : null);
  }

  // Keep the current inputs in the address bar so a calculation can be shared.
  function updateUrl() {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams();
    if (product !== 'flower') params.set('type', product);
    if (dir === 'from') params.set('mode', 'reverse');
    if (els.amount.value.trim()) params.set('amount', els.amount.value.trim());
    if (els.potency.value.trim()) params.set('potency', els.potency.value.trim());
    if (product === 'edible' && els.days.value.trim() && els.days.value.trim() !== '30') params.set('days', els.days.value.trim());
    if (product === 'concentrate' && els.pack.value.trim() && els.pack.value.trim() !== '1') params.set('pack', els.pack.value.trim());
    var qs = params.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }

  function readUrl() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    if (PRODUCTS[params.get('type')]) product = params.get('type');
    var m = params.get('mode');
    if (m === 'reverse' || m === 'g') dir = 'from';
    if (params.get('amount')) saved.amount[amountKey()] = params.get('amount');
    if (params.get('potency')) saved.potency[product] = params.get('potency');
    if (params.get('days')) els.days.value = params.get('days');
    if (params.get('pack')) els.pack.value = params.get('pack');
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
  els.days.addEventListener('input', render);
  els.pack.addEventListener('input', render);
  els.form.addEventListener('submit', function (e) { e.preventDefault(); });

  // Phone keyboards: "Next" moves to the next box; "Done" closes the keyboard
  // and brings the result into view.
  function finish(input) {
    input.blur();
    var r = $('result');
    if (r && r.getBoundingClientRect().bottom > window.innerHeight) {
      r.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  els.amount.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); els.potency.focus(); }
  });
  els.potency.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (product === 'edible') els.days.focus();
    else if (product === 'concentrate') els.pack.focus();
    else finish(els.potency);
  });
  els.pack.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); finish(els.pack); }
  });
  els.days.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); finish(els.days); }
  });

  function wireTabs(tabs, attr, set) {
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { set(tab.getAttribute(attr)); });
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        set(next.getAttribute(attr), true);
      });
    });
  }
  wireTabs(els.productTabs, 'data-product', setProduct);
  wireTabs(els.dirTabs, 'data-dir', setDir);

  // Init
  readUrl();
  applyState();
  paintThemeButton();
})();
