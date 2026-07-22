(function () {
  const budgetChips = document.querySelectorAll(".budget-chip");
  const form = document.querySelector(".contact-form");

  initHeaderMenu();
  initEdgeBlur();
  initHelpPanel();

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

    const submitViaMailto = (data) => {
      const budget = String(data.get("budget") || "").trim();
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
        budget: String(data.get("budget") || "").trim(),
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
          budget: payload.budget,
        });

        setStatus("Thank you! Your message has been sent.", "success");
        formEl.reset();
        resetContactMethods();
        budgetChips.forEach((c) => c.classList.remove("is-active"));
        budgetChips[budgetChips.length - 1]?.classList.add("is-active");
        if (budgetInput) budgetInput.value = "$5-10k";
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

  initServicesIntro();
  initAwardsMarquee();
  initProjectsFilters();
  initProjectsShowcase();

  function bindEdgeBlur({ scrollEl, topBlur, bottomBlur, getScrollY, getMaxScroll }) {
    let lastY = getScrollY();
    let direction = "down";

    const update = () => {
      const y = getScrollY();
      if (Math.abs(y - lastY) > 2) {
        direction = y > lastY ? "down" : "up";
        lastY = y;
      }

      const maxY = getMaxScroll();
      const atTop = y <= 8;
      const atBottom = y >= maxY;

      bottomBlur.classList.toggle(
        "is-visible",
        direction === "down" && !atBottom
      );
      topBlur.classList.toggle("is-visible", direction === "up" && !atTop);
    };

    const onScroll = () => update();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    return {
      update,
      reset() {
        lastY = getScrollY();
        direction = "down";
        topBlur.classList.remove("is-visible");
        bottomBlur.classList.remove("is-visible");
        update();
      },
    };
  }

  function initEdgeBlur() {
    const topBlur = document.querySelector("[data-edge-blur-page-top]");
    const bottomBlur = document.querySelector("[data-edge-blur-page-bottom]");
    if (!topBlur || !bottomBlur) return;

    const pageBlur = bindEdgeBlur({
      scrollEl: window,
      topBlur,
      bottomBlur,
      getScrollY: () => window.scrollY,
      getMaxScroll: () =>
        document.documentElement.scrollHeight - window.innerHeight - 4,
    });

    pageBlur.update();

    window.addEventListener(
      "resize",
      () => {
        if (!document.body.classList.contains("has-detail-open")) {
          pageBlur.update();
        }
      },
      { passive: true }
    );
  }

  function initHelpPanel() {
    const panel = document.querySelector("[data-help-panel]");
    const viewport = panel?.querySelector("[data-help-viewport]");
    const listScreen = panel?.querySelector("[data-help-list]");
    const answerScreen = panel?.querySelector("[data-help-answer]");
    const chat = panel?.querySelector("[data-help-chat]");
    const subtitle = panel?.querySelector(".help-panel__subtitle");
    const backBtn = panel?.querySelector("[data-help-back]");
    if (!panel || !viewport || !listScreen || !answerScreen || !chat || !backBtn) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let animating = false;

    const topics = [
      {
        question: "Our product needs a new UX/UI design",
        answers: [
          "We can redesign your product to make it intuitive and easy to use, prioritising user needs and business goals.",
          "It would not only look great but create an enjoyable experience for your users.",
        ],
        messageStart: "Hi, my product needs UX/UI design...",
      },
      {
        question: "We need a consistent look and feel across our product",
        answers: [
          "We build a visual system with typography, colors, and components that stay consistent across screens and platforms.",
          "Your product will feel like one brand — clear, polished, and easy to scale as you grow.",
        ],
        messageStart: "Hi, we need a consistent design system across our product...",
      },
      {
        question: "We need a new website",
        answers: [
          "We design landing pages, websites, and online shops that explain your product fast and convert visitors into customers.",
          "From structure and copy to UI and launch-ready design — everything in one focused package.",
        ],
        messageStart: "Hi, we need a new website...",
      },
      {
        question: "We need an icon for our App",
        answers: [
          "We design app icons and store visuals that stand out on the home screen and App Store grid.",
          "You get a clear, memorable mark that fits your product and works at every size.",
        ],
        messageStart: "Hi, our app needs a new icon...",
      },
      {
        question: "Our app needs new ASO",
        answers: [
          "We create App Store and Play Market screenshots that show your value in the first seconds.",
          "Strong visuals and clear messaging help more people understand your app and tap Install.",
        ],
        messageStart: "Hi, our app needs new ASO visuals...",
      },
    ];

    const measureScreen = (screen) => {
      const wasHidden = screen.hidden;
      screen.hidden = false;
      screen.style.position = "absolute";
      screen.style.visibility = "hidden";
      screen.style.width = "100%";
      screen.style.left = "0";
      screen.style.top = "0";
      const height = screen.scrollHeight;
      screen.hidden = wasHidden;
      screen.style.position = "";
      screen.style.visibility = "";
      screen.style.width = "";
      screen.style.left = "";
      screen.style.top = "";
      return height;
    };

    const setViewportHeight = (height, instant = false) => {
      if (instant || reducedMotion) {
        viewport.style.transition = "none";
        viewport.style.height = `${height}px`;
        viewport.offsetHeight;
        viewport.style.transition = "";
        return;
      }

      viewport.style.height = `${height}px`;
    };

    const syncViewport = (instant = false) => {
      const activeScreen = listScreen.hidden ? answerScreen : listScreen;
      setViewportHeight(activeScreen.scrollHeight, instant);
    };

    const resetList = () => {
      subtitle?.classList.remove("is-hiding");
      panel.querySelectorAll(".help-panel__question-item").forEach((item) => {
        item.classList.remove("is-hiding");
      });
    };

    const revealBubbles = async (topic) => {
      chat.innerHTML = "";
      backBtn.classList.remove("is-visible");
      syncViewport(true);

      const messageField = document.querySelector('.contact-form textarea[name="message"]');

      const addMessageStart = (button) => {
        if (!messageField) return;

        const currentMessage = messageField.value.trim();
        if (!currentMessage) {
          messageField.value = topic.messageStart;
        } else if (!currentMessage.includes(topic.messageStart)) {
          messageField.value = `${topic.messageStart}\n\n${currentMessage}`;
        }

        messageField.dispatchEvent(new Event("input", { bubbles: true }));
        messageField.dispatchEvent(new Event("change", { bubbles: true }));
        messageField.focus();
        messageField.setSelectionRange(
          messageField.value.length,
          messageField.value.length
        );
        button.textContent = "Added to message";
        button.classList.add("is-selected");
        button.disabled = true;
      };

      const parts = [
        {
          className: "help-bubble help-bubble--user",
          text: topic.question,
        },
        ...topic.answers.map((text) => ({
          className: "help-bubble help-bubble--assistant",
          text,
        })),
        {
          className: "help-bubble help-bubble--assistant",
          text: "Is this what you're looking for?",
        },
        {
          className: "help-bubble help-bubble--user help-bubble--cta",
          text: "Yes, I need this",
          isButton: true,
        },
      ];

      const createPart = ({ className, text, isButton }) => {
        const bubble = document.createElement(isButton ? "button" : "p");
        bubble.className = className;
        bubble.textContent = text;
        if (isButton) {
          bubble.type = "button";
          bubble.addEventListener("click", () => addMessageStart(bubble));
        }
        return bubble;
      };

      if (reducedMotion) {
        parts.forEach((part) => {
          const bubble = createPart(part);
          bubble.classList.add("is-visible");
          chat.appendChild(bubble);
        });
        backBtn.classList.add("is-visible");
        syncViewport(true);
        return;
      }

      for (const [index, part] of parts.entries()) {
        const bubble = createPart(part);
        chat.appendChild(bubble);
        setViewportHeight(answerScreen.scrollHeight);

        await wait(60);
        bubble.classList.add("is-visible");
        await wait(index === 0 ? 80 : 220);
      }

      backBtn.classList.add("is-visible");
      setViewportHeight(answerScreen.scrollHeight);
      await wait(180);
    };

    const showList = async () => {
      if (animating) return;
      animating = true;

      if (!reducedMotion) {
        backBtn.classList.remove("is-visible");
        chat.querySelectorAll(".help-bubble.is-visible").forEach((bubble) => {
          bubble.classList.remove("is-visible");
        });
        setViewportHeight(answerScreen.scrollHeight);
        await wait(120);

        const listHeight = measureScreen(listScreen);
        setViewportHeight(listHeight);
        await wait(420);
      }

      answerScreen.hidden = true;
      listScreen.hidden = false;
      resetList();
      syncViewport(true);
      animating = false;
    };

    const showAnswer = async (button, index) => {
      if (animating) return;
      const topic = topics[index];
      if (!topic) return;

      animating = true;
      chat.innerHTML = "";
      backBtn.classList.remove("is-visible");

      if (!reducedMotion) {
        subtitle?.classList.add("is-hiding");
        panel.querySelectorAll(".help-panel__question-item").forEach((item) => {
          if (!item.contains(button)) item.classList.add("is-hiding");
        });
        await wait(340);
      }

      const answerHeight = measureScreen(answerScreen);
      const currentHeight = viewport.offsetHeight;

      listScreen.hidden = true;
      answerScreen.hidden = false;
      resetList();

      setViewportHeight(currentHeight, true);
      requestAnimationFrame(() => {
        setViewportHeight(answerHeight);
      });

      if (!reducedMotion) {
        await wait(420);
      }

      await revealBubbles(topic);
      animating = false;
    };

    syncViewport(true);
    window.addEventListener("resize", () => syncViewport(true), { passive: true });

    panel.querySelectorAll("[data-help-index]").forEach((button) => {
      button.addEventListener("click", () => {
        showAnswer(button, Number(button.getAttribute("data-help-index")));
      });
    });

    backBtn.addEventListener("click", showList);
  }

  function initHeaderMenu() {
    const menu = document.querySelector("[data-menu]");
    const toggle = menu?.querySelector("[data-menu-toggle]");
    const panel = menu?.querySelector("[data-menu-panel]");
    if (!menu || !toggle || !panel) return;

    const setOpen = (open) => {
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => {
      setOpen(!menu.classList.contains("is-open"));
    });

    menu.querySelector("[data-menu-close]")?.addEventListener("click", () => {
      setOpen(false);
      toggle.focus();
    });

    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("click", (event) => {
      if (menu.classList.contains("is-open") && !menu.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  function initServicesIntro() {
    const copy = document.querySelector("[data-service-copy]");
    const tabs = document.querySelectorAll(".service-tab[data-service]");
    if (!copy || !tabs.length) return;

    const serviceCopy = {
      websites:
        "<span>We design </span><strong>landing pages, websites,</strong><span> and </span><strong>online shops</strong><span> that people love, helping businesses thrive.</span>",
      "app-design":
        "<span>We design UX/UI for </span><strong>iOS</strong><span>, </span><strong>macOS</strong><span>, and </span><strong>Android</strong><span> apps that feel clear, native, and ready to build.</span>",
      aso:
        "<span>We create visually appealing </span><strong>app screenshots</strong><span> for the </span><strong>App Store</strong><span> and </span><strong>Play Market</strong><span> that make your product stand out.</span>",
      "ux-audit":
        "<span>We </span><strong>audit interfaces</strong><span>, </span><strong>user journeys</strong><span>, and </span><strong>key flows</strong><span> to show what feels confusing, broken, or unfinished.</span>",
      "business-app":
        "<span>For </span><strong>businesses</strong><span> that don’t need a huge tech team — just a </span><strong>clear app that works</strong><span>.</span>",
    };

    let copyFadeTimer = null;
    let currentKey = "websites";

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.getAttribute("data-service");
        if (!key || !serviceCopy[key]) return;

        tabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });

        if (key === currentKey) return;
        currentKey = key;

        clearTimeout(copyFadeTimer);
        copy.classList.add("is-fading");
        copyFadeTimer = setTimeout(() => {
          copy.innerHTML = serviceCopy[key];
          copy.classList.remove("is-fading");
        }, 220);
      });
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
      let inner = detail.querySelector(".project-showcase__detail-inner");
      if (!inner) {
        inner = document.createElement("div");
        inner.className = "project-showcase__detail-inner";
        while (detail.firstChild) inner.appendChild(detail.firstChild);
        detail.appendChild(inner);
      }

      const gallery = inner.querySelector(".project-showcase__detail-gallery");
      const head = inner.querySelector(".project-showcase__detail-head");
      const firstMedia = gallery?.querySelector(
        ":scope > .project-showcase__detail-gallery-item"
      );

      if (
        gallery &&
        head &&
        firstMedia &&
        head.previousElementSibling !== firstMedia
      ) {
        firstMedia.insertAdjacentElement("afterend", head);
      }

      const body = head?.querySelector(".project-showcase__detail-body");
      const title = head?.querySelector(".project-showcase__detail-title");
      const done = head?.querySelector(".project-showcase__detail-done");

      if (head && !head.querySelector(".project-showcase__detail-tabs")) {
        const tabs = document.createElement("div");
        tabs.className = "project-showcase__detail-tabs";
        tabs.setAttribute("role", "tablist");
        tabs.setAttribute("aria-label", `${title?.textContent?.trim() || "Project"} details`);

        const briefTab = document.createElement("button");
        briefTab.type = "button";
        briefTab.className = "project-showcase__detail-tab is-active";
        briefTab.textContent = "brief";
        briefTab.setAttribute("role", "tab");
        briefTab.setAttribute("aria-selected", "true");

        const workTab = document.createElement("button");
        workTab.type = "button";
        workTab.className = "project-showcase__detail-tab";
        workTab.textContent = "services";
        workTab.setAttribute("role", "tab");
        workTab.setAttribute("aria-selected", "false");

        const setView = (showWork) => {
          head.classList.toggle("is-work-view", showWork);
          briefTab.classList.toggle("is-active", !showWork);
          workTab.classList.toggle("is-active", showWork);
          briefTab.setAttribute("aria-selected", String(!showWork));
          workTab.setAttribute("aria-selected", String(showWork));
        };

        briefTab.addEventListener("click", () => setView(false));
        workTab.addEventListener("click", () => setView(true));
        tabs.append(briefTab, workTab);
        head.prepend(tabs);
      }

      if (done) done.setAttribute("role", "tabpanel");
      if (!body || head.querySelector(".project-showcase__detail-more")) return;

      const more = document.createElement("button");
      body.id = body.id || `${detail.id || "project-detail"}-summary`;
      more.type = "button";
      more.className = "project-showcase__detail-more";
      more.textContent = "Read more";
      more.hidden = true;
      more.setAttribute("aria-controls", body.id);
      more.setAttribute("aria-expanded", "false");
      body.insertAdjacentElement("afterend", more);

      more.addEventListener("click", () => {
        const expanded = body.classList.toggle("is-expanded");
        more.textContent = expanded ? "Read less" : "Read more";
        more.setAttribute("aria-expanded", String(expanded));
      });
    };

    const updateDetailReadMore = (detail) => {
      const body = detail.querySelector(".project-showcase__detail-body");
      const more = detail.querySelector(".project-showcase__detail-more");
      if (!body || !more) return;

      body.classList.remove("is-collapsible", "is-expanded");
      more.hidden = true;
      more.textContent = "Read more";
      more.setAttribute("aria-expanded", "false");

      const lineHeight = Number.parseFloat(getComputedStyle(body).lineHeight);
      if (!Number.isFinite(lineHeight)) return;

      if (body.scrollHeight > lineHeight * 3 + 2) {
        body.classList.add("is-collapsible");
        more.hidden = false;
      }
    };

    const preloadDetailImages = (detail) => {
      const images = [
        ...detail.querySelectorAll(
          ".project-showcase__detail-figure img[src], .project-showcase__detail-gallery img[src]"
        ),
      ];
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

    const setDetailVideoState = (detail, play) => {
      detail
        .querySelectorAll(".project-showcase__detail-gallery-item--video video")
        .forEach((video) => {
          if (play) {
            video.play().catch(() => undefined);
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
    };

    const setUiState = (item, open) => {
      const toggle = item.querySelector(".project-showcase__toggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      item.classList.toggle("is-open", open);
      document.body.classList.toggle("has-detail-open", open);
    };

    const getRevealTargets = (detail) =>
      detail.querySelectorAll(
        ".project-showcase__detail-figure, .project-showcase__detail-gallery-item"
      );

    const revealObservers = new WeakMap();

    const startRevealOnScroll = (detail) => {
      if (reducedMotion || typeof IntersectionObserver === "undefined") {
        getRevealTargets(detail).forEach((el) => el.classList.add("is-revealed"));
        return;
      }

      let observer = revealObservers.get(detail);
      if (!observer) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            });
          },
          { root: detail, rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
        );
        revealObservers.set(detail, observer);
      }

      getRevealTargets(detail).forEach((el) => observer.observe(el));
    };

    const resetReveal = (detail) => {
      const observer = revealObservers.get(detail);
      getRevealTargets(detail).forEach((el) => {
        el.classList.remove("is-revealed");
        observer?.unobserve(el);
      });
    };

    const prepNext = new WeakMap();

    const projectColors = new WeakMap();

    const extractProjectColor = (item) => {
      if (projectColors.has(item)) {
        return Promise.resolve(projectColors.get(item));
      }

      const cover = item.querySelector(".project-showcase__media img");
      const src = cover?.currentSrc || cover?.src;
      if (!src) return Promise.resolve(null);

      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          try {
            const size = 16;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            // Quantize to coarse RGB buckets, weighting saturated mid-tone
            // pixels so the pick stays vibrant instead of muddy-average
            const buckets = new Map();
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const lightness = (max + min) / 510;
              if (lightness > 0.94 || lightness < 0.06) continue;
              const saturation =
                max === min
                  ? 0
                  : (max - min) / (255 - Math.abs(max + min - 255));
              const weight =
                0.15 + saturation * (1 - Math.abs(lightness - 0.5));
              const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
              const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, w: 0 };
              bucket.r += r * weight;
              bucket.g += g * weight;
              bucket.b += b * weight;
              bucket.w += weight;
              buckets.set(key, bucket);
            }

            let best = null;
            buckets.forEach((bucket) => {
              if (!best || bucket.w > best.w) best = bucket;
            });

            const color = best
              ? [
                  Math.round(best.r / best.w),
                  Math.round(best.g / best.w),
                  Math.round(best.b / best.w),
                ]
              : null;
            projectColors.set(item, color);
            resolve(color);
          } catch {
            projectColors.set(item, null);
            resolve(null);
          }
        };
        img.onerror = () => {
          projectColors.set(item, null);
          resolve(null);
        };
        img.src = src;
      });
    };

    const applyProjectBackground = async (item, detail) => {
      const color = await extractProjectColor(item);
      if (!color) {
        detail.style.background = "";
        return;
      }
      const [r, g, b] = color;
      detail.style.background = [
        `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.5) 0%,`,
        `rgba(${r}, ${g}, ${b}, 0.22) 48%, rgba(255, 255, 255, 0.5) 100%),`,
        "rgba(255, 255, 255, 0.55)",
      ].join(" ");
    };

    const buildNextSection = (detail) => {
      const inner = detail.querySelector(".project-showcase__detail-inner");
      const wrap = document.createElement("div");
      wrap.className = "project-next";
      wrap.setAttribute("data-project-next", "");
      wrap.innerHTML = [
        '<div class="project-next__sticky">',
        '  <figure class="project-next__media">',
        '    <span class="project-next__label">next up...</span>',
        '    <span class="project-next__hint">keep scrolling !</span>',
        '    <img alt="" loading="lazy" decoding="async" />',
        "  </figure>",
        '  <h3 class="project-next__title"></h3>',
        '  <div class="project-next__bar"><span class="project-next__bar-fill"></span></div>',
        "</div>",
      ].join("");
      inner.appendChild(wrap);
      return wrap;
    };

    const closeProject = async (item) => {
      const detail = item.querySelector(".project-showcase__detail");
      if (!detail || detail.hidden) return;

      if (reducedMotion) {
        setUiState(item, false);
        setDetailVideoState(detail, false);
        detail.hidden = true;
        return;
      }

      setDetailVideoState(detail, false);
      detail.classList.add("is-closing");
      await nextFrame();
      setUiState(item, false);
      await wait(CLOSE_MS);
      detail.classList.remove("is-closing");
      detail.hidden = true;
      resetReveal(detail);
    };

    const openProject = async (item) => {
      const detail = item.querySelector(".project-showcase__detail");
      if (!detail) return;

      ensureDetailInner(detail);
      await Promise.race([
        Promise.all([preloadDetailImages(detail), applyProjectBackground(item, detail)]),
        wait(400),
      ]);

      detail.hidden = false;
      detail.classList.remove("is-closing");
      detail.scrollTop = 0;
      prepNext.get(item)?.();
      await nextFrame();
      updateDetailReadMore(detail);

      if (reducedMotion) {
        setUiState(item, true);
        setDetailVideoState(detail, true);
        startRevealOnScroll(detail);
        return;
      }

      setUiState(item, true);
      setDetailVideoState(detail, true);
      startRevealOnScroll(detail);
      await wait(OPEN_MS);
    };

    const switchProject = async (fromItem, toItem) => {
      const fromDetail = fromItem.querySelector(".project-showcase__detail");
      const toDetail = toItem.querySelector(".project-showcase__detail");
      if (!fromDetail || !toDetail) return;

      ensureDetailInner(toDetail);
      await Promise.race([
        Promise.all([
          preloadDetailImages(toDetail),
          applyProjectBackground(toItem, toDetail),
        ]),
        wait(400),
      ]);

      toDetail.hidden = false;
      toDetail.classList.remove("is-closing");
      toDetail.scrollTop = 0;
      toDetail.style.zIndex = "310";
      prepNext.get(toItem)?.();
      await nextFrame();
      updateDetailReadMore(toDetail);

      if (reducedMotion) {
        setUiState(fromItem, false);
        setUiState(toItem, true);
        setDetailVideoState(fromDetail, false);
        setDetailVideoState(toDetail, true);
        fromDetail.hidden = true;
        resetReveal(fromDetail);
        toDetail.style.zIndex = "";
        startRevealOnScroll(toDetail);
        return;
      }

      // Crossfade: the next overlay fades in on top while the current fades out
      toItem.classList.add("is-open");
      const toToggle = toItem.querySelector(".project-showcase__toggle");
      if (toToggle) toToggle.setAttribute("aria-expanded", "true");
      setDetailVideoState(toDetail, true);
      startRevealOnScroll(toDetail);

      fromDetail.classList.add("is-closing");
      setDetailVideoState(fromDetail, false);

      await wait(CLOSE_MS);

      fromItem.classList.remove("is-open");
      const fromToggle = fromItem.querySelector(".project-showcase__toggle");
      if (fromToggle) fromToggle.setAttribute("aria-expanded", "false");
      fromDetail.classList.remove("is-closing");
      fromDetail.hidden = true;
      resetReveal(fromDetail);
      toDetail.style.zIndex = "";
      document.body.classList.add("has-detail-open");
    };

    items.forEach((item) => {
      const toggle = item.querySelector(".project-showcase__toggle");
      const card = item.querySelector(".project-showcase__card");
      const detail = item.querySelector(".project-showcase__detail");
      const close = item.querySelector(".project-showcase__close");
      if (!toggle || !detail) return;
      ensureDetailInner(detail);

      let animating = false;

      const nextSection = buildNextSection(detail);
      const nextImg = nextSection.querySelector(".project-next__media img");
      const nextTitle = nextSection.querySelector(".project-next__title");
      const nextBarFill = nextSection.querySelector(".project-next__bar-fill");
      let nextItem = null;

      const updateNextPreview = () => {
        const visible = [...items].filter(
          (i) => !i.classList.contains("is-filter-hidden")
        );
        const index = visible.indexOf(item);
        nextItem =
          visible.length > 1 && index !== -1
            ? visible[(index + 1) % visible.length]
            : null;
        nextSection.hidden = !nextItem;
        nextBarFill.style.transform = "scaleX(0)";
        if (!nextItem) return;

        const previewImg = nextItem.querySelector(".project-showcase__media img");
        nextImg.src = previewImg?.currentSrc || previewImg?.src || "";
        nextTitle.textContent =
          nextItem.querySelector(".project-showcase__title")?.textContent.trim() ||
          "";
      };

      prepNext.set(item, updateNextPreview);

      detail.addEventListener(
        "scroll",
        () => {
          if (detail.hidden || nextSection.hidden || !nextItem) return;

          const runway = nextSection.offsetHeight - detail.clientHeight;
          if (runway <= 0) return;

          const top = nextSection.getBoundingClientRect().top;
          const progress = Math.min(Math.max(-top / runway, 0), 1);
          nextBarFill.style.transform = `scaleX(${progress})`;

          if (progress >= 1 && !animating) {
            animating = true;
            switchProject(item, nextItem).finally(() => {
              animating = false;
            });
          }
        },
        { passive: true }
      );

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

      card?.addEventListener("mouseenter", primeDetail);
      card?.addEventListener("click", () => {
        handleToggle();
      });

      close?.addEventListener("click", () => {
        if (animating || detail.hidden) return;
        animating = true;
        closeProject(item).finally(() => {
          animating = false;
        });
      });

      detail.addEventListener("click", (event) => {
        if (event.target !== detail) return;
        if (animating || detail.hidden) return;
        animating = true;
        closeProject(item).finally(() => {
          animating = false;
        });
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openItem = document.querySelector("[data-project].is-open");
      if (openItem) closeProject(openItem);
    });
  }

  function initProjectsFilters() {
    const filters = document.querySelectorAll("[data-project-filter]");
    const projects = document.querySelectorAll("[data-project]");
    if (!filters.length || !projects.length) return;

    filters.forEach((filter) => {
      filter.addEventListener("click", () => {
        const value = filter.getAttribute("data-project-filter") || "all";

        filters.forEach((item) => {
          item.classList.toggle("is-active", item === filter);
        });

        projects.forEach((project) => {
          const type = project.getAttribute("data-project-type");
          project.classList.toggle(
            "is-filter-hidden",
            value !== "all" && type !== value
          );
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
