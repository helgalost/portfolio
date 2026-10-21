/* Портфолио — поведение страницы. Без зависимостей.
 * Тяжёлые эффекты (курсор, шлейф красок, магнитные кнопки, наклон карточек)
 * включаются только на компьютерах с мышью и экраном шире 1024 px. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desktopFx = canHover && window.innerWidth > 1024;

  var CATS = { photo: 'Фотография', product: 'Предметная съёмка', ad: 'Реклама и графика', web: 'Веб-дизайн' };

  function plural(n, f) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return f[0];
    if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return f[1];
    return f[2];
  }

  /* ---------- Тема: тумблер ---------- */
  var toggle = $('#themeToggle');
  var themeMeta = $('meta[name="theme-color"]');
  function applyTheme(t) {
    root.dataset.theme = t;
    toggle.checked = t === 'light';
    if (themeMeta) themeMeta.content = t === 'light' ? '#fcf9f2' : '#0d0808';
  }
  applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
  toggle.addEventListener('change', function () {
    var t = toggle.checked ? 'light' : 'dark';
    applyTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  });

  /* ---------- Прокрутка: прогресс и кнопка «Наверх» (один rAF на кадр) ---------- */
  var progress = $('#progress'), toTop = $('#toTop'), ticking = false;
  function onScroll() {
    ticking = false;
    var h = root.scrollHeight - root.clientHeight;
    var y = window.scrollY;
    progress.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    toTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* ---------- Видео: играет, только когда видно ---------- */
  var video = $('#heroVideo');
  if (video) {
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        else video.pause();
      }, { threshold: 0.1 }).observe(video);
    }
  }

  /* ---------- Сворачиваемые блоки: разделы, кейсы, «Подробнее» ---------- */
  $$('.acc-head, .case-head, .details-btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      if (btn.classList.contains('details-btn')) btn.firstChild.textContent = open ? 'Свернуть' : 'Подробнее';
      if (open) setTimeout(function () { window.dispatchEvent(new Event('panelopen')); }, 60);
    });
  });

  /* ---------- Появление при прокрутке ---------- */
  var revealObs = null;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    $$('.reveal').forEach(function (el) { revealObs.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Подсказки: наведение на компьютере, касание на телефоне ---------- */
  var tip = $('#tooltip'), tipFor = null;
  function showTip(el) {
    tipFor = el;
    tip.textContent = el.getAttribute('data-tip');
    tip.classList.add('is-on');
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var vw = root.clientWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), vw - tw - 12);
    var top = r.top - th - 10;
    if (top < 76) top = Math.min(r.bottom + 10, vh - th - 12);
    tip.style.transform = 'none';
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    if (el.tagName === 'BUTTON') el.setAttribute('aria-expanded', 'true');
  }
  function hideTip() {
    if (tipFor && tipFor.tagName === 'BUTTON') tipFor.setAttribute('aria-expanded', 'false');
    tipFor = null;
    tip.classList.remove('is-on');
  }
  $$('[data-tip]').forEach(function (el) {
    if (el.tagName === 'BUTTON') el.setAttribute('aria-expanded', 'false');
    if (canHover) {
      el.addEventListener('mouseenter', function () { showTip(el); });
      el.addEventListener('mouseleave', hideTip);
    }
    el.addEventListener('focus', function () { if (canHover) showTip(el); });
    el.addEventListener('blur', hideTip);
    el.addEventListener('click', function (e) {
      if (canHover) return;
      e.stopPropagation();
      if (tipFor === el) hideTip(); else showTip(el);
    });
  });
  document.addEventListener('click', function () { if (!canHover) hideTip(); });
  window.addEventListener('scroll', function () { if (tipFor) hideTip(); }, { passive: true });

  /* ---------- Вкладки навыков ---------- */
  var tabs = $$('.tab');
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- Работы ---------- */
  var works = window.WORKS || [];
  var byN = {};
  works.forEach(function (w) { byN[w.n] = w; });
  var featured = (window.FEATURED || []).map(function (n) { return byN[n]; }).filter(Boolean);
  var featuredIds = featured.map(function (w) { return w.n; });
  var rest = works.filter(function (w) { return featuredIds.indexOf(w.n) === -1; });
  $('#worksCount').textContent = works.length;

  function card(w, extraClass) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'work' + (extraClass ? ' ' + extraClass : '');
    b.setAttribute('aria-label', (w.title || '') + ' — открыть');
    b.innerHTML = '<span class="shot"><img src="' + w.thumb + '" width="' + w.w + '" height="' + w.h + '" alt="" loading="lazy" decoding="async"></span>' +
      (w.cat ? '<span class="cap"><b>' + w.title + '</b><span>' + CATS[w.cat] + '</span></span>' : '');
    return b;
  }

  /* Лучшие работы — ряды одинаковой высоты, картинки без обрезки.
     Работы делятся на ряды так, чтобы ряды были примерно равной «ширины». */
  var featuredEl = $('#featured');
  var featuredCards = featured.map(function (w, i) {
    var c = card(w, 'tilt');
    var img = $('img', c);
    img.src = w.thumb;
    img.srcset = w.thumb + ' ' + w.w + 'w, ' + w.src + ' 2000w';
    img.sizes = '(min-width: 900px) 40vw, 90vw';
    if (i < 3) img.loading = 'eager';
    c.addEventListener('click', function () { openLightbox(featured, i, c); });
    return c;
  });
  function partition(ars, k) {
    // линейное разбиение: минимизируем отклонение сумм рядов от среднего
    var n = ars.length, best = null;
    k = Math.max(1, Math.min(k, n));
    function rec(start, rowsLeft, acc) {
      if (rowsLeft === 1) {
        var rows = acc.concat([ars.slice(start)]);
        var avg = ars.reduce(function (a, b) { return a + b; }, 0) / rows.length;
        var cost = rows.reduce(function (s, r) { var t = r.reduce(function (a, b) { return a + b; }, 0) - avg; return s + t * t; }, 0);
        if (!best || cost < best.cost) best = { cost: cost, rows: rows };
        return;
      }
      for (var end = start + 1; end <= n - rowsLeft + 1; end++) rec(end, rowsLeft - 1, acc.concat([ars.slice(start, end)]));
    }
    rec(0, k, []);
    return best.rows.map(function (r) { return r.length; });
  }
  var lastW = 0;
  function layoutFeatured() {
    var W = featuredEl.clientWidth;
    if (!W || Math.abs(W - lastW) < 2) return;
    lastW = W;
    var gap = W < 600 ? 10 : 14;
    var T = W < 600 ? 250 : W < 900 ? 300 : 360;
    var ars = featured.map(function (w) { return w.w / w.h; });
    var total = ars.reduce(function (a, b) { return a + b; }, 0);
    var sizes = partition(ars, Math.round(total * T / W) || 1);
    featuredEl.innerHTML = '';
    var idx = 0;
    sizes.forEach(function (count) {
      var row = document.createElement('div');
      row.className = 'jrow';
      row.style.gap = gap + 'px';
      var sum = 0;
      for (var j = 0; j < count; j++) {
        var c = featuredCards[idx + j];
        c.style.flex = ars[idx + j] + ' 1 0%';
        sum += ars[idx + j];
        row.appendChild(c);
      }
      // одиночная вертикальная работа не растягивается на весь экран
      var maxH = T * 1.35;
      if ((W - gap * (count - 1)) / sum > maxH) row.style.maxWidth = (maxH * sum + gap * (count - 1)) + 'px';
      featuredEl.appendChild(row);
      idx += count;
    });
  }
  layoutFeatured();
  if ('ResizeObserver' in window) new ResizeObserver(layoutFeatured).observe(featuredEl);
  else window.addEventListener('resize', layoutFeatured);

  /* Зацикленная лента: копии набора слева и справа, после остановки прокрутки
     незаметно возвращаемся в середину — листать можно бесконечно в обе стороны. */
  function makeRail(host, items, title, extraClass) {
    var block = document.createElement('div');
    block.className = 'rail-block';
    block.innerHTML = '<div class="rail-head">' + (title ? '<h3>' + title + '<small>' + items.length + '</small></h3>' : '<span></span>') +
      '<div class="rail-nav"><button class="icon-btn round magnetic" type="button" aria-label="Назад"><svg class="icon"><use href="#i-left"/></svg></button>' +
      '<button class="icon-btn round magnetic" type="button" aria-label="Вперёд"><svg class="icon"><use href="#i-right"/></svg></button></div></div>';
    var rail = document.createElement('div');
    rail.className = 'rail' + (extraClass ? ' ' + extraClass : '');
    var COPIES = 3;
    for (var c = 0; c < COPIES; c++) {
      items.forEach(function (w, i) {
        var el = card(w);
        if (c !== 1) { el.setAttribute('aria-hidden', 'true'); el.tabIndex = -1; }
        el.addEventListener('click', function () { openLightbox(items, i, el); });
        rail.appendChild(el);
      });
    }
    block.appendChild(rail);
    host.appendChild(block);

    var setW = 0, n = items.length, timer = null;
    function measure() {
      var kids = rail.children;
      if (kids.length < n * 2) return;
      var w = kids[n].offsetLeft - kids[0].offsetLeft;
      if (!w) return;
      var offset = setW ? rail.scrollLeft - setW : 0;
      setW = w;
      jump(setW + offset);
    }
    function jump(x) {
      rail.style.scrollSnapType = 'none';
      rail.scrollLeft = x;
      requestAnimationFrame(function () { rail.style.scrollSnapType = ''; });
    }
    function normalize() {
      if (!setW) return;
      var x = rail.scrollLeft;
      if (x < setW * 0.5) jump(x + setW);
      else if (x > setW * 1.5) jump(x - setW);
    }
    rail.addEventListener('scroll', function () { clearTimeout(timer); timer = setTimeout(normalize, 160); }, { passive: true });
    if ('onscrollend' in window) rail.addEventListener('scrollend', normalize);
    var btns = $$('.rail-nav button', block);
    function step(dir) {
      normalize();
      rail.scrollBy({ left: dir * Math.max(200, rail.clientWidth * 0.7), behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    btns[0].addEventListener('click', function () { step(-1); });
    btns[1].addEventListener('click', function () { step(1); });
    // мышью на компьютере можно листать колёсиком по горизонтали без Shift
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(rail);
    window.addEventListener('panelopen', measure);
    return block;
  }

  var moreBtn = $('#moreBtn'), moreLabel = $('#moreLabel'), moreEl = $('#more');
  var railsEl = $('#rails'), railsBuilt = false;
  var moreText = 'Показать ещё ' + rest.length + ' ' + plural(rest.length, ['работу', 'работы', 'работ']);
  moreLabel.textContent = moreText;
  function buildRails() {
    var order = ['photo', 'product', 'ad', 'web'];
    order.forEach(function (cat, i) {
      var list = rest.filter(function (w) { return w.cat === cat; });
      if (!list.length) return;
      var b = makeRail(railsEl, list, CATS[cat]);
      b.style.setProperty('--i', i);
    });
    railsBuilt = true;
  }
  moreBtn.addEventListener('click', function () {
    var open = moreBtn.getAttribute('aria-expanded') !== 'true';
    moreBtn.setAttribute('aria-expanded', String(open));
    moreEl.classList.toggle('is-open', open);
    moreLabel.textContent = open ? 'Скрыть' : moreText;
    if (open && !railsBuilt) buildRails();
    if (open) window.dispatchEvent(new Event('panelopen'));
    if (!open) $('#works').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  // «Все сеткой» — скрыто по умолчанию, открывается отдельной кнопкой
  var gridBtn = $('#gridBtn'), gridAll = $('#gridAll'), masonry = $('#masonry'), gridBuilt = false;
  gridBtn.addEventListener('click', function () {
    var open = gridBtn.getAttribute('aria-expanded') !== 'true';
    gridBtn.setAttribute('aria-expanded', String(open));
    gridAll.classList.toggle('is-open', open);
    $('#gridLabel').textContent = open ? 'Скрыть сетку' : 'Открыть все сеткой';
    if (open && !gridBuilt) {
      rest.forEach(function (w, i) {
        var c = card(w);
        c.addEventListener('click', function () { openLightbox(rest, i, c); });
        masonry.appendChild(c);
      });
      gridBuilt = true;
    }
  });

  /* ---------- Сертификаты — тоже зацикленная лента ---------- */
  var certs = [];
  for (var ci = 1; ci <= 7; ci++) {
    certs.push({ src: 'img/certs/cert-' + ci + '.jpg', thumb: 'img/certs/thumb/cert-' + ci + '.webp', title: 'Сертификат ' + ci, w: (window.CERT_DIMS || {})[ci] ? window.CERT_DIMS[ci][0] : 600, h: (window.CERT_DIMS || {})[ci] ? window.CERT_DIMS[ci][1] : 848 });
  }
  var certHost = $('#certRail');
  var certBlock = makeRail(certHost.parentNode, certs, '', 'certs');
  certHost.replaceWith(certBlock);

  /* ---------- Картинки кейсов ---------- */
  var groups = {};
  $$('.js-zoom').forEach(function (b) { (groups[b.dataset.group] = groups[b.dataset.group] || []).push(b); });
  Object.keys(groups).forEach(function (g) {
    var items = groups[g].map(function (b) { var im = $('img', b); return { src: im.getAttribute('src'), thumb: im.getAttribute('src'), title: b.dataset.title }; });
    groups[g].forEach(function (b, i) { b.addEventListener('click', function () { openLightbox(items, i, b); }); });
  });

  /* ---------- Лайтбокс ---------- */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbPanel = $('#lbPanel');
  var lbTitle = $('#lbTitle'), lbDesc = $('#lbDesc'), lbCat = $('#lbCat'), lbCount = $('#lbCount');
  var lbList = [], lbIndex = 0, lbOpener = null, token = 0;
  function show(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    var it = lbList[lbIndex], my = ++token;
    lbImg.alt = it.title || '';
    lbImg.src = it.thumb || it.src;
    if (it.thumb && it.thumb !== it.src) {
      lb.classList.add('is-loading');
      var full = new Image();
      full.onload = function () { if (my === token) { lbImg.src = it.src; lb.classList.remove('is-loading'); } };
      full.onerror = function () { lb.classList.remove('is-loading'); };
      full.src = it.src;
    }
    lbTitle.textContent = it.title || '';
    lbDesc.textContent = it.desc || '';
    lbCat.hidden = !it.cat;
    if (it.cat) lbCat.textContent = CATS[it.cat];
    var empty = !it.desc && !it.cat;
    lbPanel.classList.toggle('is-empty', empty);
    lb.classList.toggle('no-panel', empty);
    lbCount.textContent = lbList.length > 1 ? (lbIndex + 1) + ' из ' + lbList.length : '';
    $('#lbPrev').hidden = $('#lbNext').hidden = lbList.length < 2;
    lbPanel.scrollTop = 0;
    [lbIndex + 1, lbIndex - 1].forEach(function (j) { var nx = lbList[(j + lbList.length) % lbList.length]; if (nx) { var p = new Image(); p.src = nx.src; } });
  }
  function openLightbox(list, i, opener) {
    lbList = list; lbOpener = opener || null;
    show(i);
    lb.hidden = false; lb.classList.add('is-open');
    root.style.overflow = 'hidden';
    hideTip();
    $('#lbClose').focus({ preventScroll: true });
  }
  function closeLightbox() {
    lb.classList.remove('is-open'); lb.hidden = true;
    root.style.overflow = '';
    lbImg.removeAttribute('src');
    if (lbOpener) lbOpener.focus({ preventScroll: true });
  }
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', function () { show(lbIndex - 1); });
  $('#lbNext').addEventListener('click', function () { show(lbIndex + 1); });
  $('#lbStage').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') show(lbIndex + 1);
    else if (e.key === 'ArrowLeft') show(lbIndex - 1);
    else if (e.key === 'Tab') {
      var f = $$('button', lb).filter(function (el) { return !el.hidden && el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  var sx = 0, sy = 0, swiping = false, stage = $('#lbStage');
  stage.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true; } }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!swiping) return; swiping = false;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && lbList.length > 1) show(lbIndex + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) closeLightbox();
  }, { passive: true });

  var yEl = $('#year'); if (yEl) yEl.textContent = new Date().getFullYear();

  /* ==========================================================================
     Эффекты только для компьютера с мышью
     ========================================================================== */
  if (!desktopFx) return;

  /* ---------- Круглый курсор ---------- */
  var dot = $('#cursorDot'), ring = $('#cursorRing');
  var mx = -100, my2 = -100, rx = -100, ry = -100, cursorRaf = 0;
  root.classList.add('has-cursor');
  function cursorLoop() {
    rx += (mx - rx) * 0.18; ry += (my2 - ry) * 0.18;
    dot.style.transform = 'translate3d(' + mx + 'px,' + my2 + 'px,0)';
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    if (Math.abs(mx - rx) > 0.1 || Math.abs(my2 - ry) > 0.1) cursorRaf = requestAnimationFrame(cursorLoop);
    else cursorRaf = 0;
  }
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my2 = e.clientY;
    if (rx < -50) { rx = mx; ry = my2; root.classList.add('cursor-moved'); }
    if (!cursorRaf) cursorRaf = requestAnimationFrame(cursorLoop);
    paintKick(e.clientX, e.clientY);
  }, { passive: true });
  var hoverSel = 'a, button, label, [data-tip], .work, input';
  document.addEventListener('mouseover', function (e) { if (e.target.closest(hoverSel)) ring.classList.add('is-hover'); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest(hoverSel)) ring.classList.remove('is-hover'); });
  document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });

  /* ---------- Шлейф размытых красок за курсором ----------
     Холст рисуется в уменьшенном разрешении и растягивается — получается
     мягкое «акварельное» размытие без CSS-фильтров. Цикл засыпает, когда
     мышь не двигается, поэтому в покое не тратит ресурсы. */
  var canvas = $('#paint'), ctx = null, blobs = [], paintRaf = 0, lastMove = 0, SCALE = 0.35;
  var paintOn = !reduceMotion && !!canvas.getContext;
  if (paintOn) {
    canvas.style.display = 'block';
    ctx = canvas.getContext('2d');
    var resize = function () { canvas.width = Math.round(innerWidth * SCALE); canvas.height = Math.round(innerHeight * SCALE); };
    resize();
    window.addEventListener('resize', resize);
    var colors = ['255,90,54', '255,176,58', '226,96,159', '192,132,252', '239,68,68'];
    // у каждой краски своя скорость и своё смещение — цвета не сливаются в одно пятно
    for (var bi = 0; bi < colors.length; bi++) blobs.push({ x: -500, y: -500, k: 0.2 - bi * 0.03, c: colors[bi], r: 90 - bi * 8, a: bi * 1.3, ox: 0, oy: 0 });
  }
  function paintKick(x, y) {
    if (!paintOn) return;
    lastMove = performance.now();
    blobs.tx = x * SCALE; blobs.ty = y * SCALE;
    if (blobs[0].x < -400) blobs.forEach(function (b) { b.x = blobs.tx; b.y = blobs.ty; });
    if (!paintRaf) paintRaf = requestAnimationFrame(paintLoop);
  }
  function paintLoop(now) {
    var light = root.dataset.theme === 'light';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.055)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var idle = now - lastMove > 1600;
    if (!idle) {
      ctx.globalCompositeOperation = 'source-over';
      blobs.forEach(function (b, i) {
        var dx = blobs.tx - b.x, dy = blobs.ty - b.y;
        b.x += dx * b.k; b.y += dy * b.k;
        var speed = Math.min(Math.hypot(dx, dy), 60);
        b.a += 0.03 + i * 0.004;
        var orbit = (18 + speed * 0.6) * SCALE;
        var x = b.x + Math.cos(b.a) * orbit, y = b.y + Math.sin(b.a) * orbit;
        var r = (b.r + speed * 1.2) * SCALE * 1.5;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        var alpha = light ? 0.11 : 0.1;
        g.addColorStop(0, 'rgba(' + b.c + ',' + alpha + ')');
        g.addColorStop(0.55, 'rgba(' + b.c + ',' + (alpha * 0.45) + ')');
        g.addColorStop(1, 'rgba(' + b.c + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
    }
    // спим, когда всё растаяло
    if (now - lastMove > 4200) { ctx.clearRect(0, 0, canvas.width, canvas.height); paintRaf = 0; return; }
    paintRaf = requestAnimationFrame(paintLoop);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && paintRaf) { cancelAnimationFrame(paintRaf); paintRaf = 0; } });

  /* ---------- Магнитные кнопки и наклон карточек ---------- */
  $$('.magnetic').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      el.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.3 + 'px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = ''; });
  });
  document.addEventListener('mousemove', function (e) {
    var card = e.target.closest && e.target.closest('.tilt, .offer.card');
    $$('.is-tilting').forEach(function (c) { if (c !== card) { c.style.transform = ''; c.classList.remove('is-tilting'); } });
    if (!card) return;
    var r = card.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add('is-tilting');
    card.style.transform = 'perspective(900px) rotateY(' + x * 5 + 'deg) rotateX(' + -y * 5 + 'deg)';
  }, { passive: true });
})();
