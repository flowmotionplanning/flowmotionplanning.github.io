(function () {
  function labelFor(section) {
    var heading = section.querySelector(".sec-heading, h2, h3");
    if (heading && heading.textContent.trim()) return heading.textContent.trim();
    return section.id.replace(/[-_]/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function smoothScrollTo(id) {
    var target = id === "top" ? document.body : document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildContents(sections) {
    if (!sections.length) return null;
    var nav = document.createElement("aside");
    nav.className = "research-contents";
    nav.innerHTML = '<div class="research-contents-title">Contents</div>';

    var top = document.createElement("button");
    top.type = "button";
    top.className = "research-contents-link";
    top.dataset.target = "top";
    top.textContent = "Title";
    nav.appendChild(top);

    sections.forEach(function (section) {
      var link = document.createElement("button");
      link.type = "button";
      link.className = "research-contents-link";
      link.dataset.target = section.id;
      link.textContent = labelFor(section);
      nav.appendChild(link);
    });

    nav.addEventListener("click", function (event) {
      var button = event.target.closest(".research-contents-link");
      if (!button) return;
      smoothScrollTo(button.dataset.target);
    });

    document.body.appendChild(nav);
    return nav;
  }

  function initProgress() {
    var progress = document.createElement("div");
    progress.className = "research-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);

    function update() {
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = "scaleX(" + Math.min(1, window.scrollY / max) + ")";
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function initActiveContents(sections, nav) {
    if (!nav || !("IntersectionObserver" in window)) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll(".research-contents-link"));

    function setActive(id) {
      links.forEach(function (link) {
        link.classList.toggle("active", link.dataset.target === id);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-30% 0px -55% 0px", threshold: 0.01 });

    sections.forEach(function (section) { observer.observe(section); });
  }

  function initReveal() {
    var items = document.querySelectorAll(
      ".highlight-card, .method-step, .chart-card, .fmp-chart-wrap, .fig-wrap, .module-card, .taxonomy-card, .mini-figure, .paper-browser"
    );
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("research-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("research-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) {
      el.classList.add("research-reveal");
      observer.observe(el);
    });
  }

  function initTopButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "research-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.textContent = "↑";
    btn.addEventListener("click", function () { smoothScrollTo("top"); });
    document.body.appendChild(btn);

    function update() {
      btn.classList.toggle("visible", window.scrollY > 600);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initLightbox() {
    var media = document.querySelectorAll(".fig-wrap img, .survey-hero-card img, .mini-figure img, .method-visual-card img");
    if (!media.length) return;

    var overlay = document.createElement("div");
    overlay.className = "research-lightbox";
    overlay.innerHTML = '<button type="button" class="research-lightbox-close" aria-label="Close">×</button><img alt="">';
    document.body.appendChild(overlay);

    var img = overlay.querySelector("img");
    function close() { overlay.classList.remove("open"); }
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.closest(".research-lightbox-close")) close();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    media.forEach(function (el) {
      el.classList.add("research-clickable-media");
      el.addEventListener("click", function () {
        img.src = el.currentSrc || el.src;
        img.alt = el.alt || "";
        overlay.classList.add("open");
      });
    });
  }

  function initAccent() {
    var link = document.querySelector("a");
    if (!link) return;
    var color = window.getComputedStyle(link).color;
    if (color) document.documentElement.style.setProperty("--research-accent", color);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("research-polished");
    initAccent();
    initProgress();
    var sections = Array.prototype.slice.call(document.querySelectorAll("section[id]"));
    var contents = buildContents(sections);
    initActiveContents(sections, contents);
    initReveal();
    initTopButton();
    initLightbox();
  });
})();
