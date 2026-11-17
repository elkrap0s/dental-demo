/* =========================================================
   ОБЩИЙ СКРИПТ — для всех сайтов. Без библиотек.
   Что умеет:
   - мобильное меню (.burger, .mobile-menu)
   - тень шапки при прокрутке (.header)
   - появление блоков при прокрутке (.reveal)
   - вкладки (.tabs [role=tab] + [role=tabpanel])
   - модальные окна ([data-modal-open="id"], [data-modal-close])
   - формы заявок (form[data-lead-form]): маска телефона +7, проверка,
     согласие на обработку ПД, отправка
   - cookie-уведомление (#cookie)
   - текущий год ([data-year])

   Куда уходят заявки — настраивается в SITE_CONFIG в index.html:
     window.SITE_CONFIG = { leadEndpoint: "https://..." }
   Если адрес не указан, форма работает в демо-режиме (просто показывает «Спасибо»).
   ========================================================= */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var CONFIG = window.SITE_CONFIG || {};
  var root = document.documentElement;

  function storageGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* приватный режим */ } }

  /* ---------- Мобильное меню ---------- */
  var burger = document.querySelector(".burger");
  function setMenu(open) {
    // Меню открывается ровно под шапкой (над ней могут быть плашки)
    var hdr = document.querySelector(".header");
    if (open && hdr) root.style.setProperty("--menu-top", Math.max(0, Math.round(hdr.getBoundingClientRect().bottom)) + "px");
    root.classList.toggle("menu-open", open);
    if (burger) burger.setAttribute("aria-expanded", String(open));
  }
  if (burger) {
    burger.addEventListener("click", function () { setMenu(!root.classList.contains("menu-open")); });
    document.querySelectorAll(".mobile-menu a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
  }

  /* ---------- Шапка при прокрутке ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Появление блоков ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  // Блоки, которые уже на экране при загрузке, показываем сразу (с плавной анимацией)
  requestAnimationFrame(function () {
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
    });
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Вкладки ---------- */
  document.querySelectorAll(".tabs").forEach(function (tabs) {
    var btns = tabs.querySelectorAll('[role="tab"]');
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-selected", String(on));
          b.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(b.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
      });
      btn.addEventListener("keydown", function (ev) {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        var list = Array.prototype.slice.call(btns);
        var i = list.indexOf(btn) + (ev.key === "ArrowRight" ? 1 : -1);
        var next = list[(i + list.length) % list.length];
        next.focus(); next.click();
      });
    });
  });

  /* ---------- Модальные окна ---------- */
  var lastFocus = null;
  function openModal(id, source) {
    var m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    // Подставляем услугу, если кнопка её передаёт: data-service="Имплантация"
    var svc = source && source.getAttribute("data-service");
    var svcInput = m.querySelector('input[name="service"]');
    if (svcInput) svcInput.value = svc || "";
    var svcLabel = m.querySelector("[data-service-label]");
    if (svcLabel) { svcLabel.textContent = svc ? "Услуга: " + svc : ""; svcLabel.hidden = !svc; }
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var first = m.querySelector("input:not([type=hidden]), button");
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeModal(m) {
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (ev) {
    var opener = ev.target.closest("[data-modal-open]");
    if (opener) { ev.preventDefault(); setMenu(false); openModal(opener.getAttribute("data-modal-open"), opener); return; }
    var closer = ev.target.closest("[data-modal-close]");
    if (closer) { var m = closer.closest(".modal"); if (m) closeModal(m); }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var m = document.querySelector(".modal.is-open");
    if (m) closeModal(m); else setMenu(false);
  });

  /* ---------- Маска телефона +7 (XXX) XXX-XX-XX ---------- */
  function formatPhone(value) {
    var d = value.replace(/\D/g, "");
    if (!d) return "";
    if (d[0] === "8") d = "7" + d.slice(1);
    if (d[0] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 4) out += ")";
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    return out;
  }
  document.querySelectorAll('input[type="tel"]').forEach(function (inp) {
    inp.addEventListener("input", function () { inp.value = formatPhone(inp.value); inp.classList.remove("is-invalid"); });
    inp.addEventListener("focus", function () { if (!inp.value) inp.value = "+7 "; });
    inp.addEventListener("blur", function () { if (inp.value.replace(/\D/g, "").length <= 1) inp.value = ""; });
  });

  /* ---------- Формы заявок ---------- */
  var successHTML =
    '<div class="form-success">' +
    '<div class="form-success__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></div>' +
    '<h3 class="h3">Заявка отправлена!</h3>' +
    '<p class="muted">' + (CONFIG.successText || "Мы перезвоним вам в течение 15 минут в рабочее время.") + "</p>" +
    "</div>";

  document.querySelectorAll("form[data-lead-form]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var status = form.querySelector(".form__status");
      var ok = true;

      var name = form.querySelector('[name="name"]');
      if (name && name.hasAttribute("required") && name.value.trim().length < 2) { name.classList.add("is-invalid"); ok = false; }

      var phone = form.querySelector('[name="phone"]');
      if (phone && phone.value.replace(/\D/g, "").length !== 11) { phone.classList.add("is-invalid"); ok = false; }

      var consent = form.querySelector('[name="consent"]');
      var consentWrap = consent && consent.closest(".check");
      if (consent && !consent.checked) { if (consentWrap) consentWrap.classList.add("is-invalid"); ok = false; }

      if (!ok) {
        if (status) { status.textContent = "Проверьте имя, телефон и согласие на обработку данных."; status.className = "form__status is-error"; }
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.href;
      data.sentAt = new Date().toISOString();
      if (data.website) return; // ловушка для ботов (скрытое поле)

      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.dataset.text = btn.textContent; btn.textContent = "Отправляем…"; }

      var done = function () {
        form.innerHTML = successHTML;
        if (typeof window.ym === "function" && CONFIG.metrikaId) { try { window.ym(CONFIG.metrikaId, "reachGoal", "lead"); } catch (e) {} }
      };
      var fail = function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.text; }
        if (status) { status.textContent = "Не удалось отправить. Позвоните нам: " + (CONFIG.phone || ""); status.className = "form__status is-error"; }
      };

      if (!CONFIG.leadEndpoint) { setTimeout(done, 600); return; } // демо-режим

      fetch(CONFIG.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) { if (r.ok) done(); else fail(); }).catch(fail);
    });

    form.addEventListener("change", function (ev) {
      var w = ev.target.closest(".check");
      if (w) w.classList.remove("is-invalid");
      if (ev.target.classList) ev.target.classList.remove("is-invalid");
    });
  });

  /* ---------- Cookie-уведомление ---------- */
  var cookie = document.getElementById("cookie");
  if (cookie && storageGet("cookie-ok") !== "1") {
    setTimeout(function () { cookie.classList.add("is-visible"); }, 1200);
    var okBtn = cookie.querySelector("[data-cookie-ok]");
    if (okBtn) okBtn.addEventListener("click", function () { storageSet("cookie-ok", "1"); cookie.classList.remove("is-visible"); });
  }

  /* ---------- Год в подвале ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function fmt(n) { return Math.round(n).toLocaleString("ru-RU").replace(/ /g, " "); }

  /* ---------- Счётчики: <span data-count="12000">12000</span> ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = parseFloat(el.getAttribute("data-count")) || 0, t0 = null, dur = 1400;
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = "0";
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = fmt(parseFloat(c.getAttribute("data-count")) || 0); });
  }

  /* ---------- До / после: [data-ba] с input.ba__range внутри ---------- */
  document.querySelectorAll("[data-ba]").forEach(function (ba) {
    var range = ba.querySelector("input[type=range]");
    if (!range) return;
    var set = function () { ba.style.setProperty("--pos", range.value + "%"); };
    range.addEventListener("input", set);
    set();
  });

  /* ---------- Калькулятор: [data-calc] ---------- */
  document.querySelectorAll("[data-calc]").forEach(function (calc) {
    var totalEl = calc.querySelector("[data-calc-total]");
    var monthEl = calc.querySelector("[data-calc-monthly]");
    var listEl = calc.querySelector("[data-calc-list]");
    var bookBtn = calc.querySelector("[data-calc-book]");
    var months = parseInt(calc.getAttribute("data-months"), 10) || 24;
    var items = calc.querySelectorAll(".calc__item");
    var shown = 0;

    function animateTo(el, to) {
      var from = shown, t0 = null;
      var tick = function (t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / 400, 1);
        el.textContent = fmt(from + (to - from) * p) + " ₽";
        if (p < 1) requestAnimationFrame(tick); else shown = to;
      };
      if (reduceMotion) { el.textContent = fmt(to) + " ₽"; shown = to; } else requestAnimationFrame(tick);
    }

    function update() {
      var total = 0, names = [], rows = "";
      items.forEach(function (it) {
        var cb = it.querySelector("input[type=checkbox]");
        var qtyWrap = it.querySelector(".calc__qty");
        var q = parseInt(it.querySelector("output") ? it.querySelector("output").value || it.querySelector("output").textContent : "1", 10) || 1;
        it.classList.toggle("is-on", cb.checked);
        if (qtyWrap) qtyWrap.hidden = !cb.checked;
        if (!cb.checked) return;
        var sum = (parseFloat(cb.value) || 0) * q;
        total += sum;
        var name = cb.getAttribute("data-name") + (q > 1 ? " × " + q : "");
        names.push(name);
        rows += "<li><span>" + name.replace(/</g, "&lt;") + "</span><b>" + fmt(sum) + " ₽</b></li>";
      });
      listEl.innerHTML = rows || '<li class="muted">Выберите услуги слева</li>';
      animateTo(totalEl, total);
      monthEl.textContent = fmt(Math.ceil(total / months)) + " ₽";
      bookBtn.disabled = !names.length;
      bookBtn.setAttribute("data-service", names.join(", ") + (names.length ? " (≈ " + fmt(total) + " ₽)" : ""));
    }

    calc.addEventListener("change", update);
    calc.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-step]");
      if (!b) return;
      var out = b.parentNode.querySelector("output");
      var v = Math.min(32, Math.max(1, (parseInt(out.textContent, 10) || 1) + parseInt(b.getAttribute("data-step"), 10)));
      out.textContent = v; out.value = v;
      update();
    });
    update();
  });

  /* ---------- Слайдер: [data-slider] + кнопки [data-slide="-1|1"] в той же секции ---------- */
  document.querySelectorAll("[data-slider]").forEach(function (sl) {
    var sec = sl.closest("section") || document;
    sec.querySelectorAll("[data-slide]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var first = sl.firstElementChild;
        var w = first ? first.getBoundingClientRect().width + 20 : sl.clientWidth;
        sl.scrollBy({ left: w * parseInt(btn.getAttribute("data-slide"), 10), behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  });
})();
