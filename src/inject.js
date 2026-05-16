(() => {
  const TARGET_HOST = 'capi.ds.at';
  const TARGET_PATH = '/forum-serve-graphql';
  const TARGET_OP = 'ThreadsByForumQuery';

  // Active when the user clicked a paywalled sort tab and we forced the fetch
  // ourselves. While active, we keep `nextCursor` in sync from responses so
  // pagination uses the right pointer into the sorted list.
  let overrideActive = false;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.__dsUnlock === 'sort-click') {
      queueMicrotask(checkAndOverride);
    } else if (data.__dsUnlock === 'navigated') {
      overrideActive = false;
    }
  });

  function parseTargetUrl(urlStr) {
    let url;
    try { url = new URL(urlStr, location.href); } catch { return null; }
    if (!url.hostname.endsWith(TARGET_HOST)) return null;
    if (!url.pathname.startsWith(TARGET_PATH)) return null;
    if (url.searchParams.get('operationName') !== TARGET_OP) return null;
    return url;
  }

  function syncCursorFromResponse(response) {
    response.clone().json().then(body => {
      const cursor = body?.data?.getForumRootPostingsV2?.pageInfo?.nextCursor;
      if (typeof cursor !== 'string') return;
      const f = document.querySelector('dst-forum');
      if (f && 'nextCursor' in f) {
        f.nextCursor = cursor;
      }
    }).catch(() => {});
  }

  const origFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input
              : input instanceof Request ? input.url
              : null;

    const promise = origFetch(input, init);

    if (overrideActive && url && parseTargetUrl(url)) {
      promise.then(response => {
        if (response.ok) syncCursorFromResponse(response);
      }).catch(() => {});
    }

    return promise;
  };

  async function checkAndOverride() {
    const f = document.querySelector('dst-forum');
    if (!f) {
      return;
    }

    // Let the framework's own click handler run first so sortField is updated
    // and the paywall flag has been set if applicable.
    if (f.updateComplete) {
      try { await f.updateComplete; } catch {}
    }

    if (f.showSubscriptionNotice) {
      f.showSubscriptionNotice = false;
      if ('nextCursor' in f) f.nextCursor = '';
      overrideActive = true;
      if (typeof f.fetchPostings === 'function') {
        try { f.fetchPostings(); }
        catch (err) { console.warn('[ds-unlock] fetchPostings threw:', err); }
      }
      if (typeof f.requestUpdate === 'function') f.requestUpdate();
    } else {
      overrideActive = false;
    }
  }
})();
