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

  function initAwardsMarquee() {
    const section = document.querySelector(".awards");
    if (!section) return;

    const trackConfigs = [
      { row: ".awards-row--a", mode: "left" },
      { row: ".awards-row--b", mode: "right" },
    ];

    const tracks = trackConfigs
      .map(({ row, mode }) => {
        const el = section.querySelector(`${row} .awards-track`);
        if (!el) return null;
        return buildLoopTrack(el, mode);
      })
      .filter(Boolean);

    if (!tracks.length) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const autoSpeed = reducedMotion ? 0 : 42;
    let lastTime = 0;
    let lastScrollY = window.scrollY;
    let scrollCarry = 0;

    function getParallaxOffset() {
      if (window.innerWidth <= 768) return 0;
      const elementTop = Math.max(section.offsetTop, 1);
      const scrollY = window.scrollY;
      const raw = (scrollY * 500) / elementTop;
      const max = tracks[0].segmentWidth * 0.35;
      return Math.max(0, Math.min(raw, max));
    }

    function loop(time) {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const scrollY = window.scrollY;
      const scrollDelta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      scrollCarry += scrollDelta * 0.45;
      scrollCarry *= 0.9;

      const parallax = getParallaxOffset();

      tracks.forEach((track) => {
        const dir = track.mode === "left" ? -1 : 1;
        track.offset += autoSpeed * dt * dir;

        if (track.mode === "left") {
          while (track.offset <= -track.segmentWidth) {
            track.offset += track.segmentWidth;
          }
        } else {
          while (track.offset >= 0) {
            track.offset -= track.segmentWidth;
          }
        }

        const scrollShift =
          (parallax + scrollCarry * 12) * (track.mode === "left" ? -1 : 1);
        const x = track.offset + scrollShift;

        track.el.style.transform = `translate3d(${x}px, 0, 0)`;
      });

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    window.addEventListener(
      "resize",
      () => {
        tracks.forEach((track) => {
          track.segmentWidth = measureSegment(track.el);
          if (track.mode === "right") {
            track.offset = -track.segmentWidth;
          } else {
            track.offset = 0;
          }
        });
      },
      { passive: true }
    );
  }

  function buildLoopTrack(el, mode) {
    const pills = [...el.children];
    if (!pills.length) return null;

    el.innerHTML = "";

    const setA = document.createElement("div");
    const setB = document.createElement("div");
    setA.className = "awards-track__set";
    setB.className = "awards-track__set";
    setB.setAttribute("aria-hidden", "true");

    pills.forEach((pill) => setA.appendChild(pill));
    pills.forEach((pill) => setB.appendChild(pill.cloneNode(true)));

    el.appendChild(setA);
    el.appendChild(setB);

    const segmentWidth = measureSegment(el);
    const offset = mode === "right" ? -segmentWidth : 0;

    return { el, mode, segmentWidth, offset };
  }

  function measureSegment(trackEl) {
    const set = trackEl.querySelector(".awards-track__set");
    if (!set) return 0;
    const gap = 12.5;
    return set.getBoundingClientRect().width + gap;
  }
})();
