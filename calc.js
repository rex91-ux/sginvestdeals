/* SG Invest Deals — homepage fee calculators.
   Every fee rule lives here. When a platform changes its pricing, edit FEES
   and the "asof" date in index.html. All results include 9% GST. */
(function () {
  var GST = 1.09;
  var US_PRICE = 100; // assumed US$ share price, for per-share fees

  var FEES = {
    tiger_us: function (x) {
      var sh = x / US_PRICE, cap = 0.005 * x;
      var c = Math.min(Math.max(0.005 * sh, 0.99), cap);
      var p = Math.min(Math.max(0.005 * sh, 1.00), cap);
      var s = Math.min(0.003 * sh, cap);
      return (c + p + s) * GST;
    },
    poems_us: function () { return 0; },
    tiger_sg: function (x) {
      return (Math.max(0.0003 * x, 0.99) + Math.max(0.0003 * x, 1) + 0.000075 * x + 0.000325 * x) * GST;
    },
    poems_sg: function (x) {
      // tier set by account assets; we assume your account is at least the trade size
      var r = x < 30000 ? 0.0008 : x < 250000 ? 0.0007 : 0.0006;
      return (r * x + 0.000325 * x + 0.000075 * x + 0.35) * GST;
    },
    moomoo_us: function (x) {
      // $0 commission; platform fee US$0.005/share min US$1 (max 0.5%) + GST; settlement US$0.003/share
      var sh = x / US_PRICE;
      return Math.min(Math.max(0.005 * sh, 1), 0.005 * x) * GST + 0.003 * sh;
    },
    moomoo_sg: function (x, year1) {
      // commission 0.03% min S$0.99 (waived for new users' first year) + platform 0.03% min S$0.99 + SGX 0.04%; GST on all
      return ((year1 ? 0 : Math.max(0.0003 * x, 0.99)) + Math.max(0.0003 * x, 0.99) + 0.0004 * x) * GST;
    },
    syfe_us: function () { return 0; },
    syfe_sg: function (x) {
      // tier set by total Syfe assets; we assume your account is at least the trade size
      var r = x < 50000 ? 0.0006 : x < 250000 ? 0.00055 : x < 1000000 ? 0.0005 : 0.00045;
      return (Math.max(r * x, 1.98) + 0.000075 * x + 0.000325 * x) * GST;
    },
    syfe_robo: function (x) {
      // Syfe applies the rate of the tier your total falls into
      var r = x < 50000 ? 0.0065 : x < 250000 ? 0.0055 : x < 1000000 ? 0.0045 : 0.0035;
      return x * r * GST;
    },
    endowus_cash: function (x) {
      // Endowus applies the rate of the tier your total falls into
      var r = x < 200000 ? 0.006 : x < 1000000 ? 0.005 : 0.0035;
      return x * r * GST;
    },
    endowus_cpf: function (x) { return x * 0.004 * GST; },
    autowealth_cash: function (x) { return x * 0.005 + 18 * 1.33; },   // as AutoWealth quotes it: 0.5% + US$18 (~S$24); no GST mentioned
    autowealth_cpf: function (x) { return x * 0.0028; },               // CPF OA advisory fee, as quoted
    stashaway: function (x) {
      // StashAway charges each slice at its own rate
      var t = [[25e3, .008], [50e3, .007], [100e3, .006], [250e3, .005], [500e3, .004], [1e6, .003], [1e12, .002]];
      var f = 0, prev = 0;
      t.forEach(function (s) { if (x > prev) f += (Math.min(x, s[0]) - prev) * s[1]; prev = s[0]; });
      return f * GST;
    }
  };
  window.SGID_FEES = FEES;

  function money(n, ccy) {
    if (n === 0) return (ccy || '$') + '0';
    var d = n < 100 ? 2 : 0;
    return (ccy || '$') + n.toLocaleString('en-SG', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function logVal(t, lo, hi) { return Math.round(Math.exp(Math.log(lo) + t * (Math.log(hi) - Math.log(lo)))); }
  function logPos(v, lo, hi) { return (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)); }
  function nice(v) { var m = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / m) * m; }

  function wire(root, lo, hi, init, render) {
    var slider = root.querySelector('input[type=range]');
    var state = { amt: init, mode: root.querySelector('.seg button[aria-selected="true"]').getAttribute('data-mode') };
    function go() {
      Array.prototype.forEach.call(root.querySelectorAll('.presets button'), function (p) {
        p.classList.toggle('on', +p.getAttribute('data-v') === state.amt);
      });
      render(state);
    }
    slider.addEventListener('input', function () { state.amt = nice(logVal(+slider.value / 1000, lo, hi)); go(); });
    Array.prototype.forEach.call(root.querySelectorAll('.presets button'), function (p) {
      p.addEventListener('click', function () {
        state.amt = +p.getAttribute('data-v'); slider.value = Math.round(logPos(state.amt, lo, hi) * 1000); go();
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('.seg button'), function (b) {
      b.addEventListener('click', function () {
        state.mode = b.getAttribute('data-mode');
        Array.prototype.forEach.call(root.querySelectorAll('.seg button'), function (x) {
          x.setAttribute('aria-selected', x === b ? 'true' : 'false');
        });
        go();
      });
    });
    slider.value = Math.round(logPos(init, lo, hi) * 1000);
    go();
  }

  function bars(el, rows) {
    var avail = rows.filter(function (r) { return r.v != null; });
    var max = Math.max.apply(null, avail.map(function (r) { return r.v; })) || 1;
    var min = Math.min.apply(null, avail.map(function (r) { return r.v; }));
    el.innerHTML = rows.map(function (r) {
      if (r.v == null) {
        return '<a class="cbar na" href="' + r.url + '"><div><b>' + r.name + '</b><small>' + r.sub + '</small></div>' +
          '<div class="tr"></div><div class="v">' + r.na + '</div></a>';
      }
      var best = r.v === min && avail.length > 1;
      var w = max > 0 ? Math.max(1.5, r.v / max * 100) : 1.5;
      return '<a class="cbar' + (best ? ' best' : '') + '" href="' + r.url + '"><div><b>' + r.name + '</b><small>' + r.sub + '</small></div>' +
        '<div class="tr"><i style="width:' + w.toFixed(1) + '%"></i></div>' +
        '<div class="v">' + money(r.v, r.ccy) + '<span>' + r.note + '</span></div></a>';
    }).join('');
  }

  var trade = document.getElementById('tradeCalc');
  if (trade) wire(trade, 100, 200000, 1000, function (s) {
    var us = s.mode === 'us', x = s.amt, ccy = us ? 'US$' : 'S$';
    trade.querySelector('output').textContent = ccy + x.toLocaleString('en-SG');
    var t = us ? FEES.tiger_us(x) : FEES.tiger_sg(x), p = us ? FEES.poems_us(x) : FEES.poems_sg(x), y = us ? FEES.syfe_us(x) : FEES.syfe_sg(x);
    var mm = us ? FEES.moomoo_us(x) : FEES.moomoo_sg(x);
    function pct(v) { return (v / x * 100).toFixed(3) + '% of trade'; }
    bars(trade.querySelector('.cbars'), [
      { name: 'POEMS', sub: 'Cash Plus account', v: p, ccy: ccy, note: p === 0 ? 'no commission' : pct(p), url: '/poems-referral-code/' },
      { name: 'Syfe', sub: 'Syfe Brokerage', v: y, ccy: ccy, note: y === 0 ? 'no commission' : pct(y), url: '/syfe-referral-code/' },
      { name: 'moomoo', sub: us ? '$0 commission + platform fee' : 'Standard fees', v: mm, ccy: ccy, note: us ? pct(mm) : 'new users yr 1: ' + money(FEES.moomoo_sg(x, true), ccy), url: '/moomoo-referral-code/' },
      { name: 'Tiger', sub: 'Tiger Trade', v: t, ccy: ccy, note: pct(t), url: '/tiger-brokers-referral-code/' }
    ].sort(function (a, b) { return a.v - b.v; }));
  });

  var robo = document.getElementById('roboCalc');
  if (robo) wire(robo, 1000, 1000000, 100000, function (s) {
    var cpf = s.mode === 'cpf', x = s.amt;
    robo.querySelector('output').textContent = 'S$' + x.toLocaleString('en-SG');
    var e = cpf ? FEES.endowus_cpf(x) : FEES.endowus_cash(x);
    var yv = cpf ? null : FEES.syfe_robo(x);
    var rows = [
      cpf ? { name: 'Syfe', sub: 'Doesn’t take CPF', v: null, na: 'Not offered', url: '/syfe-referral-code/' }
          : { name: 'Syfe', sub: 'Managed portfolios', v: yv, ccy: 'S$', note: (yv / x * 100).toFixed(2) + '% a year', url: '/syfe-referral-code/' },
      { name: 'Endowus', sub: cpf ? 'CPF, 0.40% flat' : 'Cash, tiered', v: e, ccy: 'S$', note: (e / x * 100).toFixed(2) + '% a year', url: '/endowus-promo-code/' },
      { name: 'AutoWealth', sub: cpf ? 'CPF OA, 0.28% flat' : '0.5% + US$18 flat', v: cpf ? FEES.autowealth_cpf(x) : FEES.autowealth_cash(x), ccy: 'S$', note: ((cpf ? FEES.autowealth_cpf(x) : FEES.autowealth_cash(x)) / x * 100).toFixed(2) + '% a year', url: '/autowealth-referral-code/' },
      cpf ? { name: 'StashAway', sub: 'Doesn’t take CPF', v: null, na: 'Not offered', url: '/stashaway-referral-code/' }
          : { name: 'StashAway', sub: 'General Investing', v: FEES.stashaway(x), ccy: 'S$', note: (FEES.stashaway(x) / x * 100).toFixed(2) + '% a year', url: '/stashaway-referral-code/' }
    ];
    rows.sort(function (a, b) { return (a.v == null) - (b.v == null) || a.v - b.v; });
    bars(robo.querySelector('.cbars'), rows);
  });
})();
