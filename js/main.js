(function () {
  const header = document.querySelector(".site-header");
  const budgetChips = document.querySelectorAll(".budget-chip");
  const form = document.querySelector(".contact-form");
  const clockEl = document.querySelector("[data-clock]");

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

  if (clockEl) {
    const formatBelgrade = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Belgrade",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
      clockEl.textContent = `${hour}:${minute}`;
    };
    formatBelgrade();
    setInterval(formatBelgrade, 30_000);
  }
})();
