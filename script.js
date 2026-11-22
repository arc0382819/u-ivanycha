// Кафе «У Иваныча»: шапка с меню разделов, вкладки меню и статус «открыто / закрыто».
(() => {
  'use strict';

  /* ---------- Шапка: ссылки в строку или кнопка ☰ ---------- */
  // Старым браузерам без всплывающих окон (popover) подгружаем замену, остальным — ничего
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    const s = document.createElement('script');
    s.src = 'vendor/popover-polyfill-0.7.3.min.js';
    document.head.append(s);
  }

  const header = document.querySelector('.top');
  const row = header && header.querySelector('.top__in');
  const navList = document.getElementById('top-menu');
  if (header && row && navList) {
    const isOpen = () => navList.matches(':is(:popover-open, .\\:popover-open)');
    let lastWidth = 0;

    // Пробуем показать ссылки в строку; не влезли — возвращаем кнопку ☰.
    // Свёрнутую шапку перемеряем только когда она стала шире, иначе вёрстка дёргается.
    function layout() {
      const width = row.clientWidth;
      const wide = header.classList.contains('is-wide');
      if (!wide && width <= lastWidth) return;
      lastWidth = width;
      const wasOpen = !wide && isOpen();
      header.classList.add('is-wide');
      navList.removeAttribute('popover');
      if (row.scrollWidth > row.clientWidth) {
        header.classList.remove('is-wide');
        navList.setAttribute('popover', 'auto');
        if (wasOpen) navList.showPopover();
      }
    }
    new ResizeObserver(layout).observe(row);
    new ResizeObserver(layout).observe(navList);

    // Ссылки ведут на разделы этой же страницы: после нажатия закрываем меню
    navList.addEventListener('click', e => {
      if (e.target.closest('a') && navList.hasAttribute('popover') && isOpen()) navList.hidePopover();
    });
  }

  /* ---------- Вкладки меню ---------- */
  const tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(t => document.querySelector(`[role="tabpanel"][aria-labelledby="${t.id}"]`));
    const nativeFocusgroup = Object.hasOwn(HTMLElement.prototype, 'focusGroup');

    function select(tab, { focus = false } = {}) {
      tabs.forEach((t, i) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.toggleAttribute('focusgroupstart', on);
        if (!nativeFocusgroup) t.tabIndex = on ? 0 : -1;
        const p = panels[i];
        if (!p) return;
        if (on) { p.hidden = false; p.tabIndex = 0; }
        else { p.hidden = 'until-found'; p.removeAttribute('tabindex'); }
      });
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
    }

    tabs.forEach(tab => tab.addEventListener('click', () => select(tab)));

    // Выбор следует за фокусом (стрелки внутри списка вкладок)
    tablist.addEventListener('focusin', e => {
      const tab = e.target.closest('[role="tab"]');
      if (tab && tab.getAttribute('aria-selected') !== 'true') select(tab);
    });

    // Без нативного focusgroup — свой «бегающий» tabindex и стрелки
    if (!nativeFocusgroup) {
      tabs.forEach(t => { t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1; });
      tablist.addEventListener('keydown', e => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, { focus: true }); }
      });
    }

    // Поиск по странице (Ctrl+F) открыл скрытую вкладку — переключаем на неё
    panels.forEach((p, i) => p && p.addEventListener('beforematch', () => select(tabs[i])));

    // Затухание краёв списка вкладок без scroll-driven animations
    if (!CSS.supports('animation-timeline', 'scroll()')) {
      tablist.classList.add('no-sda');
      const first = tabs[0], last = tabs[tabs.length - 1];
      const io = new IntersectionObserver(entries => {
        for (const { target, intersectionRatio } of entries) {
          tablist.classList.toggle(target === first ? 'more-start' : 'more-end', intersectionRatio < 1);
        }
      }, { root: tablist, threshold: 1, rootMargin: '1px' });
      io.observe(first);
      io.observe(last);
    }
  }

  /* ---------- Открыто сейчас? (время московское) ---------- */
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const nowMsk = () => {
    const parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = type => Number(parts.find(p => p.type === type).value);
    return get('hour') * 60 + get('minute');
  };

  function updateStatus() {
    const now = nowMsk();
    document.querySelectorAll('[data-open-status]').forEach(el => {
      const open = toMin(el.dataset.open), close = toMin(el.dataset.close);
      const isOpen = now >= open && now < close;
      if (!('base' in el.dataset)) el.dataset.base = el.textContent.trim();
      const msg = isOpen ? 'сейчас открыто' : 'сейчас закрыто';
      el.classList.toggle('is-open', isOpen);
      if (el.classList.contains('chip')) {
        el.textContent = isOpen ? `Открыто до ${el.dataset.close}` : `Закрыто, откроемся в ${el.dataset.open}`;
      } else if (el.dataset.base === '') {
        el.textContent = msg;
      } else {
        el.textContent = `${el.dataset.base} · ${msg}`;
      }
    });
  }
  updateStatus();
  setInterval(updateStatus, 60_000);
})();
