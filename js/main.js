(function () {
  const form = document.querySelector(".contact-form");

  initContactPopup();
  initCareerPopup();
  initCasePage();
  initCarousels();

  if (form) {
    initContactForm(form);
  }

  function initContactForm(formEl) {
    const statusEl = formEl.querySelector(".contact-form__status");
    const submitBtn = formEl.querySelector(".btn--send");
    const contactMethodsEl = formEl.querySelector("[data-contact-methods]");
    const contactMethodInput = formEl.querySelector(
      'input[name="contact_method"]'
    );
    const contactMethods = contactMethodsEl
      ? [...contactMethodsEl.querySelectorAll("[data-contact-method]")]
      : [];
    const endpoint = (window.SITE_CONFIG?.contactFormUrl?.trim() || "").replace(
      /\/$/,
      ""
    );

    const selectContactMethod = (selectedItem) => {
      const method = selectedItem.getAttribute("data-contact-method") || "";

      contactMethodsEl?.classList.add("has-selection");
      if (contactMethodInput) contactMethodInput.value = method;

      contactMethods.forEach((item) => {
        const isActive = item === selectedItem;
        const button = item.querySelector(".contact-method__button");
        const input = item.querySelector(".contact-method__input");

        item.classList.toggle("is-active", isActive);
        button?.setAttribute("aria-pressed", String(isActive));
        if (input) {
          input.disabled = !isActive;
          input.required = isActive;
        }
      });

      const selectedInput = selectedItem.querySelector(".contact-method__input");
      window.requestAnimationFrame(() => selectedInput?.focus());
    };

    const resetContactMethods = () => {
      contactMethodsEl?.classList.remove("has-selection");
      if (contactMethodInput) contactMethodInput.value = "";
      contactMethods.forEach((item) => {
        const button = item.querySelector(".contact-method__button");
        const input = item.querySelector(".contact-method__input");
        item.classList.remove("is-active");
        button?.setAttribute("aria-pressed", "false");
        if (input) {
          input.disabled = true;
          input.required = false;
        }
      });
    };

    contactMethods.forEach((item) => {
      item
        .querySelector(".contact-method__button")
        ?.addEventListener("click", () => selectContactMethod(item));

      if (item.getAttribute("data-contact-method") === "email") return;
      const input = item.querySelector(".contact-method__input");
      input?.addEventListener("input", () => {
        const value = input.value;
        const cursor = input.selectionStart ?? value.length;
        const removedBeforeCursor = value
          .slice(0, cursor)
          .replace(/\d/g, "").length;
        const digits = value.replace(/\D/g, "");

        if (value === digits) return;
        input.value = digits;
        const nextCursor = Math.max(0, cursor - removedBeforeCursor);
        input.setSelectionRange(nextCursor, nextCursor);
      });
    });

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

    // "You're interested in" chips: multi-select, sent as a comma list
    const interestChips = [...formEl.querySelectorAll("[data-interest-chip]")];
    interestChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const on = chip.getAttribute("aria-pressed") !== "true";
        chip.setAttribute("aria-pressed", String(on));
      });
    });
    const selectedInterest = () =>
      interestChips
        .filter((c) => c.getAttribute("aria-pressed") === "true")
        .map((c) => c.dataset.value)
        .join(", ");

    const submitViaMailto = (data) => {
      const method = String(data.get("contact_method") || "").trim();
      const rawContact = String(data.get("contact") || "").trim();
      const contact =
        method === "email" ? rawContact : rawContact.replace(/\D/g, "");
      const contactLabel =
        { email: "Email", whatsapp: "WhatsApp", telegram: "Telegram" }[
          method
        ] || "Contact";
      const subject = encodeURIComponent("OSAM — new request");
      const body = encodeURIComponent(
        [
          `Name: ${data.get("name") || ""}`,
          `${contactLabel}: ${contact}`,
          `Interested in: ${selectedInterest()}`,
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
      const contactMethod = String(data.get("contact_method") || "").trim();
      const rawContact = String(data.get("contact") || "").trim();
      const contact =
        contactMethod === "email"
          ? rawContact
          : rawContact.replace(/\D/g, "");
      const legacyEmail =
        contactMethod === "email"
          ? contact
          : `${contact.replace(/^@/, "").replace(/\s+/g, "")}@${
              contactMethod || "contact"
            }.contact`;
      const payload = {
        name: String(data.get("name") || "").trim(),
        email: legacyEmail,
        contactMethod,
        contact,
        interest: selectedInterest(),
        message: String(data.get("message") || "").trim(),
        osamNote: String(data.get("osam_note") || "").trim(),
      };

      if (!payload.name || !payload.contactMethod || !payload.contact) {
        setStatus("Please enter your name and preferred contact.", "error");
        return;
      }

      if (
        payload.contactMethod === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact)
      ) {
        setStatus("Please enter a valid email address.", "error");
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

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "generate_lead",
          form_name: "contact_form",
          interest: payload.interest,
        });
        if (typeof window.gtag === "function") {
          window.gtag("event", "generate_lead", {
            form_name: "contact_form",
            interest: payload.interest,
          });
        }
        if (typeof window.fbq === "function") {
          window.fbq("track", "Lead", {
            content_name: "contact_form",
          });
        }

        setStatus("Thank you! Your message has been sent.", "success");
        formEl.reset();
        resetContactMethods();
        interestChips.forEach((c) => c.setAttribute("aria-pressed", "false"));
      } catch {
        setStatus(
          "We couldn't send your message. Please try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    });
  }

  // Full-screen glass popup shared by Career and the contact (book a call)
  // form: fade in/out, body scroll lock, Escape and the close button.
  function createOverlay(popup, { closeSelector, focusSelector, onClosed }) {
    const FADE_MS = 500;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let closeTimer = 0;
    let lastTrigger = null;

    const open = (trigger) => {
      lastTrigger = trigger || null;
      window.clearTimeout(closeTimer);
      popup.hidden = false;
      popup.scrollTop = 0;
      document.body.classList.add("has-detail-open");
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => popup.classList.add("is-open"))
      );
      popup.querySelector(focusSelector)?.focus({ preventScroll: true });
    };

    const close = () => {
      if (popup.hidden) return;
      popup.classList.remove("is-open");
      document.body.classList.remove("has-detail-open");
      closeTimer = window.setTimeout(
        () => {
          popup.hidden = true;
          onClosed?.();
        },
        reduced ? 0 : FADE_MS
      );
      lastTrigger?.focus?.({ preventScroll: true });
    };

    popup.querySelector(closeSelector)?.addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !popup.hidden) close();
    });

    return { open, close };
  }

  function initContactPopup() {
    const popup = document.querySelector("[data-contact-popup]");
    if (!popup) return;

    const overlay = createOverlay(popup, {
      closeSelector: "[data-contact-close]",
      focusSelector: 'input[name="name"]',
      onClosed: () => {
        const status = popup.querySelector(".contact-form__status");
        if (status) {
          status.textContent = "";
          status.hidden = true;
        }
      },
    });

    document.querySelectorAll('a[href="#contact"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        overlay.open(link);
      });
    });

    // Project pages link to /#contact: open the form when the home page loads
    const openFromHash = () => {
      if (window.location.hash === "#contact") overlay.open(null);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  }

  function initCareerPopup() {
    const popup = document.querySelector("[data-career-popup]");
    const openBtns = [...document.querySelectorAll("[data-career-open]")];
    const formEl = popup?.querySelector("[data-career-form]");
    if (!popup || !openBtns.length || !formEl) return;

    const statusEl = formEl.querySelector(".career-form__status");
    const submitBtn = formEl.querySelector(".career-submit");
    const endpoint = (window.SITE_CONFIG?.contactFormUrl?.trim() || "").replace(
      /\/$/,
      ""
    );

    const setStatus = (message, type) => {
      statusEl.textContent = message;
      statusEl.hidden = !message;
      statusEl.classList.toggle("is-error", type === "error");
      statusEl.classList.toggle("is-success", type === "success");
    };

    const setFieldError = (key, message) => {
      const errorEl = formEl.querySelector(`#career-error-${key}`);
      const input = formEl.querySelector(`[name="${key}"]`);
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = !message;
      }
      if (key === "role" || key === "format") {
        formEl
          .querySelector(`[data-career-group="${key}"]`)
          ?.classList.toggle("is-invalid", !!message);
        return;
      }
      if (key === "privacy") {
        input?.closest(".career-consent")?.classList.toggle("is-invalid", !!message);
      } else {
        input?.setAttribute("aria-invalid", String(!!message));
      }
      if (input) {
        if (message) input.setAttribute("aria-describedby", `career-error-${key}`);
        else input.removeAttribute("aria-describedby");
      }
    };

    const FIELD_KEYS = ["role", "format", "name", "contact", "salary", "privacy"];
    const clearFieldErrors = () =>
      FIELD_KEYS.forEach((key) => setFieldError(key, ""));

    ["name", "contact", "salary", "privacy"].forEach((key) => {
      formEl
        .querySelector(`[name="${key}"]`)
        ?.addEventListener(key === "privacy" ? "change" : "input", () =>
          setFieldError(key, "")
        );
    });

    const successPopup = document.querySelector("[data-success-popup]");
    const successOverlay = successPopup
      ? createOverlay(successPopup, {
          closeSelector: "[data-success-close]",
          focusSelector: "[data-success-close]",
        })
      : null;

    const overlay = createOverlay(popup, {
      closeSelector: "[data-career-close]",
      focusSelector: 'input[name="name"]',
      onClosed: () => {
        setStatus("", "");
        clearFieldErrors();
      },
    });

    openBtns.forEach((btn) =>
      btn.addEventListener("click", () => overlay.open(btn))
    );

    const openFromHash = () => {
      if (window.location.hash === "#career") overlay.open(null);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    formEl.querySelectorAll("[data-career-chip]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.closest("[data-career-group]");
        const next = chip.getAttribute("aria-pressed") !== "true";
        if (!group.hasAttribute("data-multi")) {
          group
            .querySelectorAll("[data-career-chip]")
            .forEach((c) => c.setAttribute("aria-pressed", "false"));
        }
        chip.setAttribute("aria-pressed", String(next));
      });
    });

    const chosen = (group) =>
      [
        ...formEl.querySelectorAll(
          `[data-career-group="${group}"] [aria-pressed="true"]`
        ),
      ]
        .map((c) => c.dataset.value)
        .join(", ");

    formEl.querySelectorAll("[data-career-chip]").forEach((chip) => {
      chip.addEventListener("click", () =>
        setFieldError(chip.closest("[data-career-group]").dataset.careerGroup, "")
      );
    });

    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("", "");
      clearFieldErrors();

      const data = new FormData(formEl);
      const payload = {
        kind: "career",
        name: String(data.get("name") || "").trim(),
        contactMethod: "email",
        contact: String(data.get("contact") || "").trim(),
        role: chosen("role"),
        format: chosen("format"),
        salary: String(data.get("salary") || "").trim(),
        portfolio: String(data.get("portfolio") || "").trim(),
        message: String(data.get("message") || "").trim(),
        osamNote: String(data.get("osam_note") || "").trim(),
      };

      const errors = {};
      if (!payload.role) errors.role = "Please choose at least one role.";
      if (!payload.format) errors.format = "Please choose a work format.";
      if (!payload.name) errors.name = "Please enter your name.";
      if (!payload.contact) {
        errors.contact = "Please enter your email.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact)) {
        errors.contact = "Please enter a valid email address.";
      }
      if (!payload.salary) errors.salary = "Please enter your monthly rate.";
      if (!formEl.querySelector('input[name="privacy"]')?.checked) {
        errors.privacy = "Please accept the Privacy Policy.";
      }
      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([key, msg]) => setFieldError(key, msg));
        formEl
          .querySelector(
            '.career-chips.is-invalid .career-chip, [aria-invalid="true"], .is-invalid input'
          )
          ?.focus();
        return;
      }

      if (!endpoint) {
        const body = encodeURIComponent(
          [
            `Name: ${payload.name}`,
            `Email: ${payload.contact}`,
            `Role: ${payload.role}`,
            `Format: ${payload.format}`,
            `Monthly rate (net, €): ${payload.salary}`,
            `Portfolio: ${payload.portfolio}`,
            "",
            payload.message,
          ].join("\n")
        );
        window.location.href = `mailto:hello@osam.design?subject=${encodeURIComponent(
          "OSAM — career"
        )}&body=${body}`;
        return;
      }

      submitBtn.disabled = true;
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
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "career_application",
          form_name: "career_form",
          role: payload.role,
        });
        if (typeof window.gtag === "function") {
          window.gtag("event", "career_application", {
            form_name: "career_form",
            role: payload.role,
          });
        }
        formEl.reset();
        formEl
          .querySelectorAll("[data-career-chip]")
          .forEach((c) => c.setAttribute("aria-pressed", "false"));
        overlay.close();
        successOverlay?.open(null);
      } catch {
        setStatus("We couldn't send your message. Please try again.", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Scroll-snap carousel: arrow buttons step one slide, videos play while
  // they are on screen and pause otherwise.
  function initCarousels() {
    document.querySelectorAll("[data-carousel]").forEach((root) => {
      const track = root.querySelector("[data-carousel-track]");
      const prev = root.querySelector("[data-carousel-prev]");
      const next = root.querySelector("[data-carousel-next]");
      if (!track) return;

      // Endless loop: put a copy of the slides before and after the real set
      // and, once scrolling settles in a copy, jump back by exactly one set.
      // The copies are identical, so the jump is invisible.
      const single = track.children.length < 2;
      if (single) root.querySelector(".case-carousel__nav")?.setAttribute("hidden", "");
      const loop = root.hasAttribute("data-carousel-loop") && !single;
      let setWidth = 0;
      let base = 0;
      if (loop) {
        const originals = [...track.children];
        const copy = (node) => {
          const c = node.cloneNode(true);
          c.setAttribute("aria-hidden", "true");
          c.querySelectorAll("video").forEach((v) => {
            v.setAttribute("preload", "none");
            v.removeAttribute("aria-label");
          });
          return c;
        };
        track.prepend(...originals.map(copy));
        track.append(...originals.map(copy));
        // offsetLeft / scrollLeft share the same (layout) units even when the
        // page is scaled with CSS zoom; getBoundingClientRect does not.
        const measure = () => {
          const first = originals[0].offsetLeft;
          setWidth = track.children[originals.length * 2].offsetLeft - first;
          base = first;
        };
        const jump = () => {
          if (!setWidth) return;
          const pos = track.scrollLeft - base;
          let delta = 0;
          if (pos < 0) delta = setWidth;
          else if (pos >= setWidth) delta = -setWidth;
          if (!delta) return;
          const snap = track.style.scrollSnapType;
          track.style.scrollBehavior = "auto";
          track.style.scrollSnapType = "none";
          track.scrollLeft += delta;
          window.requestAnimationFrame(() => {
            track.style.scrollSnapType = snap;
            track.style.scrollBehavior = "";
          });
        };
        let settle = 0;
        track.addEventListener(
          "scroll",
          () => {
            window.clearTimeout(settle);
            settle = window.setTimeout(jump, 120);
          },
          { passive: true }
        );
        const start = () => {
          measure();
          track.style.scrollBehavior = "auto";
          track.scrollLeft = base;
          window.requestAnimationFrame(() => {
            track.style.scrollBehavior = "";
          });
        };
        start();
        window.addEventListener(
          "resize",
          () => {
            const pos = track.scrollLeft - base;
            measure();
            track.scrollLeft = base + pos;
          },
          { passive: true }
        );
      }

      // Step to the next / previous slide whose left edge is off the current
      // position. scrollIntoView keeps this correct under CSS zoom.
      const go = (dir) => {
        const tl = track.getBoundingClientRect().left;
        const slides = [...track.children];
        const target =
          dir > 0
            ? slides.find((c) => c.getBoundingClientRect().left > tl + 4)
            : [...slides].reverse().find((c) => c.getBoundingClientRect().left < tl - 4);
        target?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      };
      const sync = () => {
        if (loop) return;
        const max = track.scrollWidth - track.clientWidth - 2;
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max;
      };

      prev?.addEventListener("click", () => go(-1));
      next?.addEventListener("click", () => go(1));
      track.addEventListener("scroll", sync, { passive: true });
      track.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      });
      window.addEventListener("resize", sync, { passive: true });
      sync();

      const videos = [...track.querySelectorAll("video")];
      if (!videos.length || typeof IntersectionObserver === "undefined") return;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) video.play().catch(() => undefined);
            else video.pause();
          });
        },
        { root: track, threshold: 0.5 }
      );
      videos.forEach((video) => io.observe(video));
    });
  }

  // Project page: Brief / Services tabs and the "read more" toggle
  function initCasePage() {
    const root = document.querySelector("[data-case]");
    if (!root) return;

    const tabs = [...root.querySelectorAll("[data-case-tab]")];
    const panels = [...root.querySelectorAll("[data-case-panel]")];
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-case-tab");
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.classList.toggle("is-active", on);
        });
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute("data-case-panel") !== name;
        });
      });
    });

    const body = root.querySelector("[data-case-body]");
    const more = root.querySelector("[data-case-more]");
    if (body && more) {
      const fits = () => body.scrollHeight <= body.clientHeight + 1;
      const sync = () => {
        if (body.classList.contains("is-expanded")) return;
        more.hidden = fits();
      };
      more.addEventListener("click", () => {
        const expanded = body.classList.toggle("is-expanded");
        more.textContent = expanded ? "read less" : "read more";
        more.setAttribute("aria-expanded", String(expanded));
      });
      sync();
      window.addEventListener("resize", sync, { passive: true });
    }
  }

})();
