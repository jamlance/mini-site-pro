// Inkwell Mini script (served verbatim at /assets/mini.js): bag, item sheet,
// category tabs, checkout through the site's /payments/checkout (Inkress
// prices items, delivery and fees server-side) and the thank-you page.
export const ASSETS_JS = String.raw`
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cfgEl = document.getElementById('mini-config');
  var cfg = {};
  try { cfg = cfgEl ? JSON.parse(cfgEl.textContent || '{}') : {}; } catch (e) { cfg = {}; }
  var KEY = cfg.key || 'inkwell.bag';
  var PREFIX = cfg.currencyPrefix || '$';
  var LABEL = { delivery: 'Delivery', pickup: 'Pickup', in_touch: "We'll be in touch" };
  var HINT = { delivery: 'Priced at checkout', pickup: cfg.pickupAddress || 'Free', in_touch: 'The shop messages you' };

  function money(n) {
    var v = Math.round(Number(n || 0) * 100) / 100;
    var s = v.toFixed(2).replace(/\.00$/, '');
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return PREFIX + parts.join('.');
  }
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(lines) { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* private mode */ } paint(); }
  function lineKey(l) { return l.id + '|' + JSON.stringify(l.props || {}); }
  function add(item, qty, props) {
    var lines = read();
    var key = lineKey({ id: item.id, props: props });
    var found = lines.filter(function (l) { return lineKey(l) === key; })[0];
    var cap = item.stock > 0 ? item.stock : 9999;
    if (found) found.qty = Math.min(cap, found.qty + qty);
    else lines.push({ id: item.id, title: item.title, price: item.price, extra: item.extra || 0, qty: Math.min(cap, qty), stock: cap, props: props || {} });
    write(lines);
  }
  function itemFrom(el) {
    var inputs = [];
    try { inputs = JSON.parse(el.getAttribute('data-inputs') || '[]') || []; } catch (e) { inputs = []; }
    return {
      id: Number(el.getAttribute('data-id')),
      title: el.getAttribute('data-title') || '',
      price: Number(el.getAttribute('data-price') || 0),
      stock: Number(el.getAttribute('data-stock') || 0),
      img: el.getAttribute('data-img') || '',
      desc: el.getAttribute('data-desc') || '',
      inputs: Array.isArray(inputs) ? inputs : [],
    };
  }
  function needsChoice(item) { return item.inputs.some(function (ci) { return ci && (ci.required || ci.type === 'options'); }); }

  function paint() {
    var lines = read();
    var count = lines.reduce(function (a, l) { return a + l.qty; }, 0);
    var sub = lines.reduce(function (a, l) { return a + (l.price + (l.extra || 0)) * l.qty; }, 0);
    $$('[data-count]').forEach(function (e) { e.textContent = '(' + count + ')'; });
    var bar = $('[data-bagbar]');
    if (bar) {
      bar.hidden = count === 0;
      $('[data-bag-count]', bar).textContent = count + (count === 1 ? ' item' : ' items');
      $('[data-bag-total]', bar).textContent = money(sub);
    }
    var subEl = $('[data-bag-sub]');
    if (subEl) subEl.textContent = money(sub);
  }

  // ── Category tabs ─────────────────────────────────────
  $$('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var cat = b.getAttribute('data-cat');
      $$('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      $$('.grid .cell').forEach(function (c) { c.hidden = !!cat && c.getAttribute('data-cat') !== cat; });
    });
  });

  // ── Item sheet ────────────────────────────────────────
  var sheet = $('[data-sheet]');
  var current = null;
  var qty = 1;
  function openSheet(item) {
    if (!sheet) return;
    current = item; qty = 1;
    $('[data-sheet-title]', sheet).textContent = item.title;
    $('[data-sheet-price]', sheet).textContent = money(item.price);
    $('[data-sheet-stock]', sheet).textContent = item.stock > 0 && item.stock < 50 ? item.stock + ' left' : (item.stock < 1 ? 'Sold out' : '');
    $('[data-sheet-desc]', sheet).textContent = item.desc;
    var img = $('[data-sheet-img]', sheet);
    if (item.img) { img.src = item.img; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
    $('[data-sheet-qty]', sheet).textContent = '1';
    var box = $('[data-sheet-inputs]', sheet);
    box.innerHTML = '';
    item.inputs.forEach(function (ci, i) {
      if (!ci || !ci.name) return;
      if (ci.type === 'options' && Array.isArray(ci.options)) {
        var fs = document.createElement('fieldset'); fs.className = 'choose'; fs.setAttribute('data-ci', ci.name);
        var lg = document.createElement('legend'); lg.textContent = ci.name; fs.appendChild(lg);
        var cells = document.createElement('div'); cells.className = 'cells';
        ci.options.forEach(function (o, j) {
          var lb = document.createElement('label');
          var r = document.createElement('input'); r.type = 'radio'; r.name = 'ci' + i; r.value = o.label; r.setAttribute('data-price', o.price || 0);
          if (j === 0) r.checked = true;
          var t = document.createElement('span'); t.textContent = o.label;
          var p = document.createElement('small'); p.textContent = o.price > 0 ? '+' + money(o.price) : money(item.price);
          lb.appendChild(r); lb.appendChild(t); lb.appendChild(p); cells.appendChild(lb);
        });
        fs.appendChild(cells); box.appendChild(fs);
      } else if (ci.type === 'text' || ci.type === 'number') {
        var wrap = document.createElement('div'); wrap.className = 'fields';
        var l2 = document.createElement('label'); l2.textContent = ci.name + (ci.required ? '' : ' (optional)');
        var inp = document.createElement('input'); inp.type = ci.type === 'number' ? 'number' : 'text'; inp.maxLength = 300; inp.setAttribute('data-ci', ci.name); inp.setAttribute('data-price', ci.price || 0);
        if (ci.required) inp.required = true;
        l2.appendChild(inp); wrap.appendChild(l2); box.appendChild(wrap);
      }
    });
    $('[data-sheet-add]', sheet).disabled = item.stock < 1;
    sheet.showModal();
  }
  function sheetChoice() {
    var props = {}; var extra = 0; var missing = null;
    $$('[data-ci]', sheet).forEach(function (el) {
      var name = el.getAttribute('data-ci');
      if (el.tagName === 'FIELDSET') {
        var on = $('input:checked', el);
        if (on) { props[name] = on.value; extra += Number(on.getAttribute('data-price') || 0); }
      } else {
        var v = String(el.value || '').trim();
        if (v) { props[name] = v; extra += Number(el.getAttribute('data-price') || 0); }
        else if (el.required && !missing) missing = el;
      }
    });
    return { props: props, extra: extra, missing: missing };
  }
  if (sheet) {
    $$('[data-qty]', sheet).forEach(function (b) {
      b.addEventListener('click', function () {
        var cap = current && current.stock > 0 ? current.stock : 99;
        qty = Math.max(1, Math.min(cap, qty + Number(b.getAttribute('data-qty'))));
        $('[data-sheet-qty]', sheet).textContent = String(qty);
      });
    });
    $('[data-sheet-add]', sheet).addEventListener('click', function () {
      if (!current) return;
      var c = sheetChoice();
      if (c.missing) { c.missing.focus(); return; }
      add({ id: current.id, title: current.title, price: current.price, stock: current.stock, extra: c.extra }, qty, c.props);
      sheet.close();
    });
  }
  $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openSheet(itemFrom(b)); }); });
  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      var item = itemFrom(b);
      var opener = b.closest('.cell') && $('[data-open]', b.closest('.cell'));
      if (needsChoice(item) && opener) { openSheet(itemFrom(opener)); return; }
      add(item, 1, {});
      b.textContent = 'Added';
      setTimeout(function () { b.textContent = b.getAttribute('data-label') || b.textContent; }, 1200);
    });
    b.setAttribute('data-label', b.textContent);
  });

  // ── Bag + checkout ────────────────────────────────────
  var bag = $('[data-bag]');
  function chosen() { var on = bag && $('[data-fulfil-cells] input:checked', bag); return on ? on.value : (cfg.fulfilment || ['in_touch'])[0]; }
  function renderBag() {
    var lines = read();
    var ul = $('[data-lines]', bag);
    ul.innerHTML = '';
    if (!lines.length) { var li = document.createElement('li'); li.textContent = 'Your bag is empty.'; ul.appendChild(li); }
    lines.forEach(function (l, i) {
      var li = document.createElement('li');
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = l.title;
      var op = document.createElement('span'); op.className = 'op';
      op.textContent = Object.keys(l.props || {}).map(function (k) { return l.props[k]; }).join(', ');
      var rt = document.createElement('span'); rt.className = 'rt';
      var pr = document.createElement('span'); pr.className = 'price'; pr.textContent = money((l.price + (l.extra || 0)) * l.qty);
      var q = document.createElement('span'); q.className = 'qty';
      var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'One fewer ' + l.title);
      var n = document.createElement('span'); n.textContent = String(l.qty);
      var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'One more ' + l.title);
      minus.addEventListener('click', function () { var all = read(); all[i].qty -= 1; if (all[i].qty < 1) all.splice(i, 1); write(all); renderBag(); });
      plus.addEventListener('click', function () { var all = read(); all[i].qty = Math.min(all[i].stock || 99, all[i].qty + 1); write(all); renderBag(); });
      q.appendChild(minus); q.appendChild(n); q.appendChild(plus);
      rt.appendChild(pr); rt.appendChild(q);
      li.appendChild(nm); li.appendChild(op); li.appendChild(rt);
      ul.appendChild(li);
    });
    $('[data-pay]', bag).disabled = !lines.length;
    paint();
  }
  function renderFulfilment() {
    var opts = cfg.fulfilment && cfg.fulfilment.length ? cfg.fulfilment : ['in_touch'];
    var box = $('[data-fulfil-cells]', bag);
    box.innerHTML = '';
    opts.forEach(function (f, i) {
      var lb = document.createElement('label');
      var r = document.createElement('input'); r.type = 'radio'; r.name = 'fulfil'; r.value = f; if (i === 0) r.checked = true;
      var t = document.createElement('span'); t.textContent = LABEL[f] || f;
      var s = document.createElement('small'); s.textContent = HINT[f] || '';
      lb.appendChild(r); lb.appendChild(t); lb.appendChild(s); box.appendChild(lb);
      r.addEventListener('change', syncAddress);
    });
    syncAddress();
  }
  function syncAddress() { var a = $('[data-address]', bag); if (a) a.hidden = chosen() !== 'delivery'; }
  if (bag) {
    renderFulfilment();
    $$('[data-bag-open]').forEach(function (b) { b.addEventListener('click', function () { renderBag(); bag.showModal(); }); });
    $('[data-bag-close]', bag).addEventListener('click', function () { bag.close(); });
    var form = $('[data-bag-form]', bag);
    var err = $('[data-err]', bag);
    var pay = $('[data-pay]', bag);
    try { var saved = JSON.parse(localStorage.getItem(KEY + '.buyer') || '{}'); ['name', 'email', 'phone', 'street', 'town', 'parish'].forEach(function (k) { if (saved[k] && form.elements[k]) form.elements[k].value = saved[k]; }); } catch (e) { /* none */ }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      if (document.body.getAttribute('data-preview')) { err.textContent = 'This is the preview. Checkout opens on your live site.'; err.hidden = false; return; }
      var f = form.elements;
      var how = chosen();
      var need = ['name', 'email', 'phone'].concat(how === 'delivery' ? ['street', 'town', 'parish'] : []);
      var missing = need.filter(function (k) { return !String(f[k].value || '').trim(); });
      if (missing.length) { err.textContent = 'Please fill in your ' + missing.join(', ') + '.'; err.hidden = false; f[missing[0]].focus(); return; }
      if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) { err.textContent = 'That email address looks incomplete.'; err.hidden = false; f.email.focus(); return; }
      var lines = read();
      if (!lines.length) return;
      try { localStorage.setItem(KEY + '.buyer', JSON.stringify({ name: f.name.value, email: f.email.value, phone: f.phone.value, street: f.street.value, town: f.town.value, parish: f.parish.value })); } catch (x) { /* none */ }
      var note = (LABEL[how] || how) + (how === 'pickup' && cfg.pickupAddress ? ' at ' + cfg.pickupAddress : '') + (f.notes.value.trim() ? '. ' + f.notes.value.trim() : '');
      var body = {
        items: lines.map(function (l) { var it = { id: l.id, quantity: l.qty }; if (l.props && Object.keys(l.props).length) it.properties = l.props; return it; }),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        notes: note,
        paymentMethod: 'inkress',
      };
      if (how === 'delivery') body.shippingAddress = { name: f.name.value.trim(), line1: f.street.value.trim(), city: f.town.value.trim(), region: f.parish.value.trim(), country: 'JM' };
      pay.disabled = true; pay.textContent = 'Opening secure payment…';
      fetch('/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          var url = j && j.data && j.data.payment && j.data.payment.redirect_url;
          if (j && j.state === 'ok' && url) { window.location.href = url; return; }
          throw new Error((j && j.data && j.data.message) || 'We could not open the payment page.');
        })
        .catch(function (x) {
          err.textContent = x.message + (cfg.whatsapp ? ' You can also message the shop on WhatsApp.' : ' Please try again.');
          err.hidden = false; pay.disabled = false; pay.textContent = 'Checkout';
        });
    });
  }

  // ── Thank-you page ────────────────────────────────────
  var thanks = $('[data-thanks]');
  if (thanks) {
    var q = new URLSearchParams(location.search);
    var status = String(q.get('status') || '').toLowerCase();
    var state = /^(paid|confirmed|prepared|shipped|delivered|completed)$/.test(status) ? 'ok' : /(awaiting|partially|pending)/.test(status) ? 'wait' : status ? 'bad' : 'ok';
    $('[data-ok]').hidden = state !== 'ok';
    $('[data-wait]').hidden = state !== 'wait';
    $('[data-bad]').hidden = state !== 'bad';
    var ref = q.get('reference');
    if (ref && state === 'ok') $('[data-ref]').textContent = 'Order ' + ref + '.';
    if (state === 'ok' && status) { try { localStorage.removeItem(KEY); } catch (e) { /* none */ } }
  }

  paint();
})();
`;
