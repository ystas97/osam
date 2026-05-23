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

  budgetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      budgetChips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
    });
  });

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const budget =
        document.querySelector(".budget-chip.is-active")?.textContent?.trim() ||
        "";
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
