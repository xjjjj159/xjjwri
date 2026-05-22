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
      if (empty) { empty.style.display = ''; empty.textContent = 'NO MATCH'; }
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

// Image lightbox + lazy loading
(function () {
  // Add lazy loading + reveal animation to all content images
  document.querySelectorAll('.post__content img, .post__image').forEach(function (img) {
    img.loading = 'lazy';
    img.decoding = 'async';
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', function () { img.classList.add('loaded'); });
    }
  });

  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<span class="lightbox__close">CLOSE</span>';
  document.body.appendChild(lb);
  var lbImg = document.createElement('img');
  lb.appendChild(lbImg);

  lb.addEventListener('click', function (e) {
    if (e.target !== lbImg) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  function open(src) { lbImg.src = src; lb.classList.add('open'); }
  function close() { lb.classList.remove('open'); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.tagName === 'IMG' && (t.closest('.post__content') || t.closest('.post__image-wrapper') || t.closest('.post-card__image-wrapper'))) {
      e.preventDefault();
      open(t.src);
    }
  });
})();
