// Кафе «У Иваныча»: вкладки меню и статус «открыто / закрыто».
(() => {
  'use strict';

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
