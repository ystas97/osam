(function () {
  const header = document.querySelector(".site-header");
  const budgetChips = document.querySelectorAll(".budget-chip");
  const form = document.querySelector(".contact-form");

  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  initHeaderLinkSlide();

  const budgetInput = form?.querySelector('input[name="budget"]');

  budgetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      budgetChips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      if (budgetInput) {
        budgetInput.value =
          chip.getAttribute("data-budget") || chip.textContent.trim();
      }
    });
  });

  if (form) {
    initContactForm(form);
  }

  function initContactForm(formEl) {
    const statusEl = formEl.querySelector(".contact-form__status");
    const submitBtn = formEl.querySelector(".btn--send");
    const endpoint = (window.SITE_CONFIG?.contactFormUrl?.trim() || "").replace(
      /\/$/,
      ""
    );

    const setStatus = (message, type) => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.hidden = !message;
      statusEl.classList.toggle("is-error", type === "error");
      statusEl.classList.toggle("is-success", type === "success");
    };

    const setLoading = (loading) => {
      if (submitBtn) submitBtn.disabled = loading;
    };

    const submitViaMailto = (data) => {
      const budget = String(data.get("budget") || "").trim();
      const subject = encodeURIComponent("OSAM — new request");
      const body = encodeURIComponent(
        [
          `Name: ${data.get("name") || ""}`,
          `Email: ${data.get("email") || ""}`,
          `Budget: ${budget}`,
          "",
          String(data.get("message") || ""),
        ].join("\n")
      );
      window.location.href = `mailto:hello@osam.design?subject=${subject}&body=${body}`;
    };

    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("", "");

      const data = new FormData(formEl);
      const payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        budget: String(data.get("budget") || "").trim(),
        message: String(data.get("message") || "").trim(),
        company: String(data.get("company") || "").trim(),
      };

      if (!payload.name || !payload.email) {
        setStatus("Укажите имя и email.", "error");
        return;
      }

      if (!endpoint) {
        submitViaMailto(data);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "request_failed");
        }

        setStatus("Спасибо! Сообщение отправлено.", "success");
        formEl.reset();
        budgetChips.forEach((c) => c.classList.remove("is-active"));
        budgetChips[budgetChips.length - 1]?.classList.add("is-active");
        if (budgetInput) budgetInput.value = "$5-10k";
      } catch {
        setStatus(
          "Не удалось отправить. Попробуйте позже или напишите в Telegram.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    });
  }

  document.querySelectorAll("[data-clock]").forEach((el) => {
    const zone = el.getAttribute("data-clock");
    if (!zone) return;

    const tick = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
      el.textContent = `${hour}:${minute}`;
    };

    tick();
    setInterval(tick, 30_000);
  });

  initAwardsMarquee();
  initProjectsShowcase();

  function initHeaderLinkSlide() {
    document.querySelectorAll(".nav-desktop.link-slide a").forEach((link) => {
      const text = link.textContent.trim();
      if (text) link.setAttribute("data-content", text);

      if (link.parentElement?.classList.contains("wrapper-slide-text")) return;

      const wrap = document.createElement("span");
      wrap.className = "wrapper-slide-text";
      link.replaceWith(wrap);
      wrap.appendChild(link);
    });
  }

  function initProjectsShowcase() {
    const items = document.querySelectorAll("[data-project]");
    if (!items.length) return;

    const OPEN_MS = 550;
    const CLOSE_MS = 500;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const nextFrame = () =>
      new Promise((resolve) => requestAnimationFrame(resolve));

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const ensureDetailInner = (detail) => {
      if (detail.querySelector(".project-showcase__detail-inner")) return;
      const inner = document.createElement("div");
      inner.className = "project-showcase__detail-inner";
      while (detail.firstChild) inner.appendChild(detail.firstChild);
      detail.appendChild(inner);
    };

    const preloadDetailImages = (detail) => {
      const images = [...detail.querySelectorAll(".project-showcase__detail-figure img[src]")];
      if (!images.length) return Promise.resolve();

      const loadImage = (img) => {
        if (img.complete && img.naturalWidth > 0) {
          return typeof img.decode === "function"
            ? img.decode().catch(() => undefined)
            : Promise.resolve();
        }

        const src = img.currentSrc || img.src;
        if (!src) return Promise.resolve();

        return new Promise((resolve) => {
          const loader = new Image();
          loader.decoding = "async";
          loader.onload = () => resolve();
          loader.onerror = () => resolve();
          loader.src = src;
        }).then(() => {
          if (img.complete) {
            return typeof img.decode === "function"
              ? img.decode().catch(() => undefined)
              : undefined;
          }

          img.loading = "eager";
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        });
      };

      return Promise.all(images.map(loadImage));
    };

    const setUiState = (item, open) => {
      const toggle = item.querySelector(".project-showcase__toggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      item.classList.toggle("is-open", open);
    };

    const waitForDetailClose = (detail) =>
      new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          detail.removeEventListener("transitionend", onEnd);
          resolve();
        };
        const onEnd = (event) => {
          if (event.target === detail && event.propertyName === "grid-template-rows") {
            finish();
          }
        };
        detail.addEventListener("transitionend", onEnd);
        setTimeout(finish, CLOSE_MS + 100);
      });

    const hideDetail = (detail) => {
      detail.classList.remove("is-closing");
      if (detail.offsetHeight <= 1) {
        detail.hidden = true;
        return;
      }
      requestAnimationFrame(() => {
        detail.hidden = true;
      });
    };

    const closeProject = async (item) => {
      const detail = item.querySelector(".project-showcase__detail");
      if (!detail || detail.hidden) return;

      if (reducedMotion) {
        setUiState(item, false);
        detail.hidden = true;
        return;
      }

      detail.classList.add("is-closing");
      await nextFrame();
      setUiState(item, false);
      await waitForDetailClose(detail);
      hideDetail(detail);
    };

    const openProject = async (item) => {
      const detail = item.querySelector(".project-showcase__detail");
      if (!detail) return;

      ensureDetailInner(detail);
      await Promise.race([preloadDetailImages(detail), wait(400)]);

      detail.hidden = false;
      detail.classList.remove("is-closing");

      if (reducedMotion) {
        setUiState(item, true);
        detail.scrollIntoView({ block: "start" });
        return;
      }

      await nextFrame();
      setUiState(item, true);
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
      await wait(OPEN_MS);
    };

    items.forEach((item) => {
      ensureDetailInner(item.querySelector(".project-showcase__detail"));
      const toggle = item.querySelector(".project-showcase__toggle");
      const detail = item.querySelector(".project-showcase__detail");
      const close = item.querySelector(".project-showcase__close");
      if (!toggle || !detail) return;

      let animating = false;

      const handleToggle = async () => {
        if (animating) return;
        animating = true;

        const willOpen = detail.hidden;

        try {
          if (willOpen) {
            await openProject(item);
          } else {
            await closeProject(item);
          }
        } finally {
          animating = false;
        }
      };

      const primeDetail = () => {
        preloadDetailImages(detail);
      };

      toggle.addEventListener("mouseenter", primeDetail);
      toggle.addEventListener("focus", primeDetail);
      toggle.addEventListener("click", () => {
        handleToggle();
      });

      close?.addEventListener("click", () => {
        if (animating || detail.hidden) return;
        animating = true;
        closeProject(item).finally(() => {
          animating = false;
        });
      });
    });
  }

  function normalizeMarqueeX(x, loopWidth) {
    if (loopWidth <= 0) return x;
    while (x > 0) x -= loopWidth;
    while (x <= -loopWidth) x += loopWidth;
    return x;
  }

  function initAwardsMarquee() {
    const section = document.querySelector(".awards");
    if (!section) return;

    const tracks = [
      {
        el: section.querySelector(".awards-row--a .awards-track"),
        dir: -1,
      },
      {
        el: section.querySelector(".awards-row--b .awards-track"),
        dir: 1,
      },
    ].filter((t) => t.el);

    tracks.forEach(({ el }) => {
      [...el.children].forEach((pill) => el.appendChild(pill.cloneNode(true)));
    });

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const autoSpeed = reducedMotion ? 0 : 42;
    const loopWidths = tracks.map(({ el }) => el.scrollWidth / 2);

    const autoOffsets = [
      0,
      loopWidths[1] > 0 ? -loopWidths[1] / 2 : 0,
    ];

    let lastTime = 0;
    let ready = false;

    function loop(time) {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (!ready) {
        loopWidths[0] = tracks[0].el.scrollWidth / 2;
        loopWidths[1] = tracks[1].el.scrollWidth / 2;
        autoOffsets[1] = loopWidths[1] > 0 ? -loopWidths[1] / 2 : 0;
        ready = true;
      }

      const scrollY = window.scrollY;
      const elementTop = Math.max(section.offsetTop, 1);
      const scrollLinked =
        window.innerWidth > 768 ? (scrollY * 500) / elementTop : 0;

      tracks.forEach(({ el, dir }, index) => {
        const loopWidth = loopWidths[index];
        autoOffsets[index] += autoSpeed * dt * dir;
        autoOffsets[index] = normalizeMarqueeX(autoOffsets[index], loopWidth);

        const x = normalizeMarqueeX(
          autoOffsets[index] + scrollLinked * dir,
          loopWidth
        );
        el.style.transform = `translate3d(${x}px, 0, 0)`;
      });

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }
})();
