(function () {
  var posts = [];
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var empty = document.getElementById('searchEmpty');
  var timeline = document.getElementById('postTimeline');

  if (!input) return;

  fetch('/xjjwri/posts.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { posts = data.posts; })
    .catch(function () { /* offline, search unavailable */ });

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(doSearch, 150);
  });

  function doSearch() {
    var q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      results.style.display = 'none';
      if (empty) empty.style.display = 'none';
      if (timeline) timeline.classList.remove('hidden');
      return;
    }
    var matches = posts.filter(function (p) {
      return p.title.toLowerCase().indexOf(q) !== -1 ||
             p.excerpt.toLowerCase().indexOf(q) !== -1;
    });
    if (timeline) timeline.classList.add('hidden');
    if (matches.length === 0) {
      results.innerHTML = '';
      results.style.display = 'none';
      if (empty) { empty.style.display = ''; empty.textContent = '没有找到匹配的日记'; }
      return;
    }
    if (empty) empty.style.display = 'none';
    results.style.display = '';
    results.innerHTML = matches.map(function (p) {
      return '<li onclick="location.href=\'' + p.url + '\'">' +
        '<div class="search-result__title">' + esc(p.title) + '</div>' +
        '<div class="search-result__date">' + p.date + '</div>' +
      '</li>';
    }).join('');
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
