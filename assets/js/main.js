/* Портфолио — поведение страницы. Без зависимостей. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var CATS = {
    photo: 'Фотография',
    product: 'Предметная съёмка',
    ad: 'Реклама и графика',
    web: 'Веб-дизайн'
  };

  /* ---------- Тема ---------- */
  var root = document.documentElement;
  $('#themeBtn').addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Шапка: линия при прокрутке (без scroll-обработчика) ---------- */
  var header = $('.site-header');
  var sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
  document.body.prepend(sentinel);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      header.classList.toggle('is-scrolled', !e[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- Видео: играет только когда видно ---------- */
  var video = $('#heroVideo');
  if (video) {
    var tryPlay = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    if (reduceMotion.matches) { video.removeAttribute('autoplay'); video.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) tryPlay(); else video.pause();
      }, { threshold: 0.1 }).observe(video);
    }
  }

  /* ---------- Работы ---------- */
  var works = window.WORKS || [];
  var byN = {};
  works.forEach(function (w) { byN[w.n] = w; });
  var featuredIds = (window.FEATURED || []).filter(function (n) { return byN[n]; });
  var featured = featuredIds.map(function (n) { return byN[n]; });

  function card(w, opts) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'work-card';
    b.dataset.n = w.n;
    b.setAttribute('aria-label', w.title + ' — открыть');
    var big = opts && opts.big;
    var img = '<img src="' + w.thumb + '"' +
      (big ? ' srcset="' + w.thumb + ' ' + w.w + 'w, ' + w.src + ' 2000w" sizes="(min-width: 900px) 50vw, 100vw"' : '') +
      ' width="' + w.w + '" height="' + w.h + '" alt="" loading="' + (opts && opts.eager ? 'eager' : 'lazy') + '" decoding="async">';
    b.innerHTML = '<span class="shot">' + img + '</span>' +
      '<span class="cap"><b>' + w.title + '</b><span>' + CATS[w.cat] + '</span></span>';
    return b;
  }

  var featuredEl = $('#featured');
  featured.forEach(function (w, i) {
    var c = card(w, { big: i === 0, eager: i < 2 });
    c.addEventListener('click', function () { openLightbox(featured, i, c); });
    featuredEl.appendChild(c);
  });

  var rest = works.filter(function (w) { return featuredIds.indexOf(w.n) === -1; });
  var moreBtn = $('#moreBtn'), moreLabel = $('#moreLabel'), moreEl = $('#more');
  var masonry = $('#masonry'), filtersEl = $('#filters');
  var currentFilter = 'all', rendered = false, revealObs = null;
  moreLabel.textContent = 'Показать ещё ' + rest.length + ' ' + plural(rest.length, ['работу', 'работы', 'работ']);

  function plural(n, f) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return f[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return f[1];
    return f[2];
  }

  function renderFilters() {
    var counts = { all: rest.length };
    rest.forEach(function (w) { counts[w.cat] = (counts[w.cat] || 0) + 1; });
    var keys = ['all', 'photo', 'product', 'ad', 'web'];
    filtersEl.innerHTML = keys.filter(function (k) { return counts[k]; }).map(function (k) {
      return '<button type="button" class="chip" data-cat="' + k + '" aria-pressed="' + (k === currentFilter) + '">' +
        (k === 'all' ? 'Все' : CATS[k]) + ' <small>' + counts[k] + '</small></button>';
    }).join('');
    $$('.chip', filtersEl).forEach(function (ch) {
      ch.addEventListener('click', function () {
        currentFilter = ch.dataset.cat;
        $$('.chip', filtersEl).forEach(function (c) { c.setAttribute('aria-pressed', String(c === ch)); });
        renderMasonry();
      });
    });
  }

  function visibleRest() {
    return currentFilter === 'all' ? rest : rest.filter(function (w) { return w.cat === currentFilter; });
  }

  function renderMasonry() {
    var list = visibleRest();
    if (revealObs) revealObs.disconnect();
    masonry.innerHTML = '';
    var frag = document.createDocumentFragment();
    list.forEach(function (w, i) {
      var c = card(w);
      c.addEventListener('click', function () { openLightbox(list, i, c); });
      frag.appendChild(c);
    });
    masonry.appendChild(frag);
    revealCards();
  }

  /* Каждая карточка «проявляется», когда доходит до экрана; соседние — с небольшим сдвигом */
  function revealCards() {
    var cards = $$('.work-card', masonry);
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('in'); });
      return;
    }
    revealObs = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (e, i) {
        e.target.style.setProperty('--d', Math.min(i * 70, 420) + 'ms');
        e.target.classList.add('in');
        revealObs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    cards.forEach(function (c) { revealObs.observe(c); });
  }

  moreBtn.addEventListener('click', function () {
    var open = moreBtn.getAttribute('aria-expanded') === 'true';
    if (!open) {
      if (!rendered) { renderFilters(); renderMasonry(); rendered = true; }
      else { $$('.work-card', masonry).forEach(function (c) { c.classList.remove('in'); }); revealCards(); }
      moreEl.classList.add('is-open');
      moreBtn.setAttribute('aria-expanded', 'true');
      moreLabel.textContent = 'Свернуть';
      // переносим кнопку под галерею, чтобы свернуть можно было в конце
      moreEl.after(moreBtn.parentNode);
    } else {
      moreEl.classList.remove('is-open');
      moreBtn.setAttribute('aria-expanded', 'false');
      moreLabel.textContent = 'Показать ещё ' + rest.length + ' ' + plural(rest.length, ['работу', 'работы', 'работ']);
      moreEl.before(moreBtn.parentNode);
      $('#works').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }
  });

  /* ---------- Сертификаты ---------- */
  var certs = [];
  for (var i = 1; i <= 7; i++) {
    certs.push({ src: 'img/certs/cert-' + i + '.jpg', thumb: 'img/certs/thumb/cert-' + i + '.webp', title: 'Сертификат ' + i });
  }
  var certList = $('#certList');
  certs.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'cert';
    b.setAttribute('aria-label', c.title + ' — открыть');
    b.innerHTML = '<img src="' + c.thumb + '" alt="" loading="lazy" decoding="async">';
    b.addEventListener('click', function () { openLightbox(certs, i, b); });
    certList.appendChild(b);
  });

  /* ---------- Кейсы: раскрытие и картинки ---------- */
  $$('.case-toggle').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('is-open', !open);
      btn.firstChild.textContent = open ? 'Подробнее' : 'Свернуть';
    });
  });
  var groups = {};
  $$('.js-zoom').forEach(function (b) {
    var g = b.dataset.group;
    (groups[g] = groups[g] || []).push(b);
  });
  Object.keys(groups).forEach(function (g) {
    var items = groups[g].map(function (b) {
      var im = $('img', b);
      return { src: im.getAttribute('src'), thumb: im.getAttribute('src'), title: b.dataset.title };
    });
    groups[g].forEach(function (b, i) {
      b.addEventListener('click', function () { openLightbox(items, i, b); });
    });
  });

  /* ---------- Лайтбокс ---------- */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbPanel = $('#lbPanel');
  var lbTitle = $('#lbTitle'), lbDesc = $('#lbDesc'), lbCat = $('#lbCat'), lbCount = $('#lbCount');
  var lbList = [], lbIndex = 0, lbOpener = null, loadToken = 0;

  function show(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    var it = lbList[lbIndex];
    var token = ++loadToken;
    lbImg.alt = it.title || '';
    // сначала лёгкое превью, затем полный размер — на мобильном интернете картинка видна сразу
    lbImg.src = it.thumb || it.src;
    if (it.thumb && it.thumb !== it.src) {
      lb.classList.add('is-loading');
      var full = new Image();
      full.onload = function () { if (token === loadToken) { lbImg.src = it.src; lb.classList.remove('is-loading'); } };
      full.onerror = function () { lb.classList.remove('is-loading'); };
      full.src = it.src;
    }
    var hasDesc = !!it.desc;
    lbTitle.textContent = it.title || '';
    lbDesc.textContent = it.desc || '';
    lbCat.hidden = !it.cat;
    if (it.cat) { lbCat.textContent = CATS[it.cat]; lbCat.dataset.cat = it.cat; }
    lbPanel.classList.toggle('is-empty', !hasDesc && !it.cat);
    lb.classList.toggle('no-panel', !hasDesc && !it.cat);
    lbCount.textContent = lbList.length > 1 ? (lbIndex + 1) + ' из ' + lbList.length : '';
    $('#lbPrev').hidden = $('#lbNext').hidden = lbList.length < 2;
    lbPanel.scrollTop = 0;
    // подгружаем соседей заранее
    [lbIndex + 1, lbIndex - 1].forEach(function (j) {
      var n = lbList[(j + lbList.length) % lbList.length];
      if (n && n.src) { var pre = new Image(); pre.src = n.src; }
    });
  }

  var scrollY = 0;
  function openLightbox(list, i, opener) {
    lbList = list; lbOpener = opener || null;
    show(i);
    lb.hidden = false;
    lb.classList.add('is-open');
    scrollY = window.scrollY;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    $('#lbClose').focus({ preventScroll: true });
  }
  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.hidden = true;
    root.style.overflow = '';
    document.body.style.overflow = '';
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
      var f = $$('button:not([hidden])', lb).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // свайп на телефоне
  var sx = 0, sy = 0, swiping = false;
  var stage = $('#lbStage');
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!swiping) return; swiping = false;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && lbList.length > 1) show(lbIndex + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) closeLightbox();
  }, { passive: true });

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
