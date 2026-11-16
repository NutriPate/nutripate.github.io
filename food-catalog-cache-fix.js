(function () {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.includes('data/nutripate-catalog.json')) {
      input = input.replace(/\?v=[^&]+/, '?v=food-audit-v8');
    }
    return nativeFetch(input, init);
  };
}());
