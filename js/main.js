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

  document.querySelectorAll(".awards-track").forEach((track) => {
    const pills = [...track.children];
    pills.forEach((pill) => track.appendChild(pill.cloneNode(true)));
  });

  const PARALLAX_MIN_WIDTH = 769;
  const parallaxRows = [
    { selector: ".text-to-left-side", prop: "right" },
    { selector: ".text-to-right-side", prop: "left" },
  ];

  const resetAwardsParallax = () => {
    parallaxRows.forEach(({ selector }) => {
      document.querySelectorAll(selector).forEach((row) => {
        const track = row.querySelector(".awards-track");
        if (!track) return;
        track.style.left = "";
        track.style.right = "";
      });
    });
  };

  const updateAwardsParallax = () => {
    if (window.innerWidth <= PARALLAX_MIN_WIDTH) {
      resetAwardsParallax();
      return;
    }

    const windowTop = window.scrollY;

    parallaxRows.forEach(({ selector, prop }) => {
      document.querySelectorAll(selector).forEach((row) => {
        const track = row.querySelector(".awards-track");
        if (!track) return;

        const elementTop = row.getBoundingClientRect().top + windowTop;
        if (elementTop <= 0) return;

        const offset = (windowTop * 500) / elementTop;
        track.style.left = "";
        track.style.right = "";
        track.style[prop] = `${offset}px`;
      });
    });
  };

  window.addEventListener("load", updateAwardsParallax);
  window.addEventListener("resize", updateAwardsParallax);
  window.addEventListener("scroll", updateAwardsParallax, { passive: true });
})();
