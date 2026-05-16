(() => {
  const SORT_LABEL_RE = /^\s*(Plus|Minus|Älteste|Aktuellste|Aktuell(es)?|Zeit)\s*$/i;

  function isSortTab(el) {
    return el && el.nodeType === 1
      && el.tagName === 'BUTTON'
      && el.getAttribute('role') === 'tab';
  }

  function matchSortButton(event) {
    for (const node of event.composedPath()) {
      if (!isSortTab(node)) continue;
      const label = (node.textContent || '').trim();
      if (SORT_LABEL_RE.test(label)) return label;
    }
    return null;
  }

  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const label = matchSortButton(event);
    if (!label) return;
    window.postMessage({ __dsUnlock: 'sort-click', label }, '*');
  }, true);

  window.addEventListener('popstate', () => {
    window.postMessage({ __dsUnlock: 'navigated' }, '*');
  });
})();
