// Panel management
(function () {
  // Write link points to editor on port 3000
  var writeLink = document.getElementById('writeLink');
  if (writeLink) {
    var hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      writeLink.href = 'http://localhost:3000';
    } else if (hostname === '10.121.227.114') {
      writeLink.href = 'http://10.121.227.114:3000';
    } else if (hostname === '10.51.217.24') {
      writeLink.href = 'http://10.51.217.24:3000';
    } else if (hostname.indexOf('github.io') !== -1) {
      // From GitHub Pages — default to phone-accessible IP
      writeLink.href = 'http://10.51.217.24:3000';
    } else {
      writeLink.href = 'http://' + hostname + ':3000';
    }
  }

  var landing = document.getElementById('landing');
  var panels = document.querySelectorAll('.panel');
  var circles = document.querySelectorAll('.circle[data-panel]');

  circles.forEach(function (c) {
    c.addEventListener('click', function () {
      var panelId = 'panel-' + this.dataset.panel;
      panels.forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById(panelId);
      if (target) {
        target.classList.add('active');
        if (panelId === 'panel-about') loadAboutContent();
      }
      landing.classList.add('hidden');
      window.scrollTo(0, 0);
    });
  });

  function loadAboutContent() {
    var container = document.querySelector('#panel-about .about__content');
    if (!container || container.dataset.loaded) return;
    fetch('/xjjwri/about/')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var content = doc.querySelector('.about__content');
        if (content) {
          container.innerHTML = content.innerHTML;
          container.dataset.loaded = '1';
        }
      })
      .catch(function () {});
  }

  // Full-card click — navigate to post
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.post-card');
    if (!card) return;
    // Don't navigate if clicking a thumbnail image (handled by lightbox)
    if (e.target.closest('.post-card__img-wrap')) return;
    // Don't navigate if user is selecting text
    if (window.getSelection().toString().length > 0) return;
    var url = card.getAttribute('data-url');
    if (url) {
      window.location = url;
    }
  });

  window.closePanel = function () {
    panels.forEach(function (p) { p.classList.remove('active'); });
    landing.classList.remove('hidden');
    window.scrollTo(0, 0);
  };
})();

// Search
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
    .catch(function () {});

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
      return;
    }
    var matches = posts.filter(function (p) {
      return p.title.toLowerCase().indexOf(q) !== -1 ||
             p.excerpt.toLowerCase().indexOf(q) !== -1;
    });
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

// Image lightbox + lazy loading + post gallery extraction
(function () {
  // Lazy load + reveal animation for all images
  document.querySelectorAll('.post__content img, .post__image, .post__gallery img, .post-card__img-wrap img').forEach(function (img) {
    img.loading = 'lazy';
    img.decoding = 'async';
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', function () { img.classList.add('loaded'); });
    }
  });

  // === Extract images from post content into thumbnail gallery ===
  var postContent = document.querySelector('.post__content');
  var postGallery = document.querySelector('.post__gallery');
  if (postContent && postGallery) {
    var imgs = postContent.querySelectorAll('img');
    imgs.forEach(function (img) {
      // Remove the wrapping <p> if it only contains this image
      var parent = img.parentElement;
      if (parent && parent.tagName === 'P' && parent.textContent.trim() === '' && parent.children.length === 1) {
        parent.remove();
      } else if (parent) {
        parent.removeChild(img);
        if (parent.textContent.trim() === '') parent.remove();
      }
      // Create gallery thumbnail
      var item = document.createElement('a');
      item.className = 'post__gallery-item';
      item.href = img.src;
      item.target = '_blank';
      item.appendChild(img.cloneNode(true));
      postGallery.appendChild(item);
    });
  }

  // === Lightbox ===
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML =
    '<span class="lightbox__close">CLOSE</span>' +
    '<button class="lightbox__nav lightbox__nav--prev" aria-label="prev">&larr;</button>' +
    '<button class="lightbox__nav lightbox__nav--next" aria-label="next">&rarr;</button>' +
    '<span class="lightbox__counter"></span>';
  document.body.appendChild(lb);
  var lbImg = document.createElement('img');
  lb.appendChild(lbImg);

  var lbClose = lb.querySelector('.lightbox__close');
  var lbPrev = lb.querySelector('.lightbox__nav--prev');
  var lbNext = lb.querySelector('.lightbox__nav--next');
  var lbCounter = lb.querySelector('.lightbox__counter');

  var gallery = [];
  var currentIdx = 0;

  function show(i) {
    if (gallery.length === 0) return;
    currentIdx = (i + gallery.length) % gallery.length;
    lbImg.style.opacity = '0';
    setTimeout(function () {
      lbImg.src = gallery[currentIdx].src;
      lbImg.style.opacity = '1';
    }, 150);
    if (gallery.length > 1) {
      lbCounter.textContent = (currentIdx + 1) + ' / ' + gallery.length;
      lbPrev.style.display = '';
      lbNext.style.display = '';
    } else {
      lbCounter.textContent = '';
      lbPrev.style.display = 'none';
      lbNext.style.display = 'none';
    }
  }

  function open(target) {
    gallery = [];
    currentIdx = 0;

    var cardWrap = target.closest('.post-card__img-wrap');
    var galleryWrap = target.closest('.post__gallery-item');

    if (cardWrap) {
      // Card thumbnail — only thumbnails within the SAME post card
      var card = target.closest('.post-card');
      var scope = card || document;
      var allThumbs = scope.querySelectorAll('.post-card__img-wrap img');
      allThumbs.forEach(function (img, idx) {
        gallery.push(img);
        if (img === target) currentIdx = idx;
      });
      if (gallery.length === 0) gallery.push(target);
    } else if (galleryWrap) {
      // Gallery thumbnail on post page — collect all gallery images in this post
      var post = target.closest('.post');
      var allItems = post.querySelectorAll('.post__gallery-item img');
      allItems.forEach(function (img, idx) {
        gallery.push(img);
        if (img === target) currentIdx = idx;
      });
      if (gallery.length === 0) gallery.push(target);
    } else {
      // Fallback: any content image
      var container = target.closest('.post__content, .post');
      var imgs;
      if (container) {
        imgs = container.querySelectorAll('.post__content img, .post__image');
      } else {
        imgs = document.querySelectorAll('.post__content img, .post__image');
      }
      imgs.forEach(function (img, idx) {
        gallery.push(img);
        if (img === target) currentIdx = idx;
      });
      if (gallery.length === 0) { gallery.push(target); currentIdx = 0; }
    }

    show(currentIdx);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function next() { show(currentIdx + 1); }
  function prev() { show(currentIdx - 1); }

  lb.addEventListener('click', function (e) {
    if (e.target === lb) close();
  });
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', function (e) { e.stopPropagation(); prev(); });
  lbNext.addEventListener('click', function (e) { e.stopPropagation(); next(); });

  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  // Touch swipe — works on entire lightbox area
  var touchX = 0;
  lb.addEventListener('touchstart', function (e) {
    touchX = e.touches[0].clientX;
  });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchX;
    if (dx < -50) next();
    if (dx > 50) prev();
  });

  // Click handler — capture phase to intercept before <a> tag navigation on mobile
  document.addEventListener('click', function (e) {
    var t = e.target;
    // Check for image click or tap on thumbnail/link wrapper (mobile taps may miss the img)
    var wrap = t.closest('.post-card__img-wrap, .post__gallery-item');
    var isContentImg = t.tagName === 'IMG' && (t.closest('.post__content') || t.closest('.post__image-wrapper'));
    var isThumb = wrap && wrap.querySelector('img');
    if (isContentImg || isThumb) {
      e.preventDefault();
      e.stopPropagation();
      var img = isContentImg ? t : wrap.querySelector('img');
      open(img);
    }
  }, true); // capture phase — fires before <a> tag's own click handling
})();
