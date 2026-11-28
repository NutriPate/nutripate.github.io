(function () {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.includes('data/nutripate-catalog.json')) {
      input = input.replace(/\?v=[^&]+/, '?v=composition-20261128');
      const request = () => nativeFetch(input, Object.assign({}, init, { cache: 'force-cache' }));
      // Let the first screen paint with the small fallback catalog before the
      // ~1 MB full catalog is parsed on a mobile connection.
      return new Promise(resolve => setTimeout(() => resolve(request()), 450));
    }
    return nativeFetch(input, init);
  };
}());
