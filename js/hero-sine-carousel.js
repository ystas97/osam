(function () {
  // The homepage hero is curated independently from the project list.
  // Add media here only when it is explicitly selected for the hero gallery.
  const HERO_GALLERY_ITEMS = [
    {
      src: "assets/images/projects/namu-video.mp4",
      alt: "Namu Buro",
      type: "video",
    },
    { src: "assets/images/projects/lim-right.png", alt: "Lim CC" },
    { src: "assets/images/projects/foremost-gallery-3.png", alt: "Foremost" },
    { src: "assets/images/projects/namu-gallery-4.png", alt: "Namu Buro" },
    {
      src: "assets/images/projects/quinky-video-mosaic.mp4",
      alt: "Quinky",
      type: "video",
    },
    { src: "assets/images/projects/winrun-gallery-1.png", alt: "Winrun" },
    {
      src: "assets/images/projects/corpsoft24-gallery-1.jpg",
      alt: "Corpsoft24",
    },
    {
      src: "assets/images/projects/ps-video-web.mp4",
      alt: "",
      type: "video",
    },
    { src: "assets/images/projects/lim-gallery-3.png", alt: "" },
    {
      src: "assets/images/projects/quinky-video-pink.mp4",
      alt: "Quinky",
      type: "video",
    },
  ];

  const CARD_SCALES = [1, 0.55, 0.46, 0.37, 0.28];
  const CARD_CENTER_OFFSETS = [0, 0.24, 0.365, 0.47, 0.555];
  const INTRO_HOLD_MS = 850;
  const INTRO_DURATION_MS = 1050;
  const AUTO_ADVANCE_MS = 3200;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  function initHeroSineCarousel(root) {
    if (!root || root.dataset.ready === "true") return;

    const hero = root.closest(".hero");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const track = document.createElement("div");
    track.className = "hero-sine-carousel__track";

    let active = 0;
    let target = 0;
    let frame = null;
    let introFrame = null;
    let autoTimer = null;
    let introProgress = reducedMotion ? 1 : 0;
    let introComplete = reducedMotion;
    let titleExpanded = reducedMotion;
    let dragging = false;
    let pointerId = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartActive = 0;
    let dragAxis = null;

    const cards = HERO_GALLERY_ITEMS.map((project, index) => {
      const card = document.createElement("figure");
      card.className = "hero-sine-carousel__card";
      card.dataset.index = String(index);

      const media =
        project.type === "video"
          ? document.createElement("video")
          : document.createElement("img");

      media.draggable = false;

      if (project.type === "video") {
        media.muted = true;
        media.defaultMuted = true;
        media.loop = true;
        media.autoplay = true;
        media.playsInline = true;
        media.preload = "auto";
        media.setAttribute("muted", "");
        media.setAttribute("autoplay", "");
        media.setAttribute("loop", "");
        media.setAttribute("playsinline", "");
        media.setAttribute("aria-hidden", "true");
        media.addEventListener(
          "canplay",
          () => {
            media.play().catch(() => {});
          },
          { once: true }
        );
      } else {
        media.alt = project.alt;
        media.loading = index < 3 ? "eager" : "lazy";
        media.decoding = "async";
      }

      media.src = project.src;
      card.appendChild(media);
      track.appendChild(card);
      media.addEventListener(
        project.type === "video" ? "loadedmetadata" : "load",
        layout,
        { passive: true }
      );
      return card;
    });

    root.appendChild(track);
    root.dataset.ready = "true";
    root.classList.toggle("is-intro-complete", introComplete);
    hero?.classList.toggle("is-carousel-revealed", introComplete);
    hero?.classList.toggle("is-title-expanded", titleExpanded);

    const wrapDelta = (index, pivot) => {
      let delta = index - pivot;
      const half = HERO_GALLERY_ITEMS.length / 2;
      while (delta > half) delta -= HERO_GALLERY_ITEMS.length;
      while (delta <= -half) delta += HERO_GALLERY_ITEMS.length;
      return delta;
    };

    const getMetrics = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      const mobile = width < 760;
      const stageWidth = mobile
        ? Math.min(width * 0.88, 430)
        : Math.min(width * 0.6, 820);
      const stageHeight = stageWidth * 0.6;

      return {
        width,
        height,
        mobile,
        centerX: width * 0.5,
        centerY: height * (mobile ? 0.455 : 0.5),
        stageWidth,
        stageHeight,
        stackSpread: mobile ? 2.05 : 1,
        dragPxPerCard: mobile ? height * 0.16 : height * 0.13,
      };
    };

    const getStop = (stops, distance) => {
      const lowerIndex = Math.min(Math.floor(distance), stops.length - 1);
      const upperIndex = Math.min(lowerIndex + 1, stops.length - 1);
      const progress = clamp(distance - lowerIndex, 0, 1);
      return stops[lowerIndex] + (stops[upperIndex] - stops[lowerIndex]) * progress;
    };

    const getCardPose = (delta, metrics) => {
      const distance = Math.abs(delta);
      const scale = getStop(CARD_SCALES, distance);
      const offset = getStop(CARD_CENTER_OFFSETS, distance);
      const direction = delta === 0 ? 0 : Math.sign(delta);
      const y =
        direction * offset * metrics.stageHeight * metrics.stackSpread;
      const opacity = distance > 4.45 ? 0 : 1;

      return {
        x: 0,
        y,
        width: metrics.stageWidth * scale,
        height: metrics.stageHeight * scale,
        opacity,
        zIndex: 200 - Math.round(distance * 25),
        isFocus: distance < 0.5,
      };
    };

    function layout() {
      const metrics = getMetrics();

      cards.forEach((card, index) => {
        const delta = wrapDelta(index, active);
        const pose = getCardPose(delta, metrics);
        const revealDelay = Math.min(Math.abs(delta), 4) * 0.055;
        const localIntro = clamp(
          (introProgress - revealDelay) / (1 - revealDelay),
          0,
          1
        );
        const reveal = easeOutCubic(localIntro);
        const startScale = 0.18;
        const width = pose.width * (startScale + (1 - startScale) * reveal);
        const height = pose.height * (startScale + (1 - startScale) * reveal);
        const y = pose.y * reveal;

        card.classList.toggle("is-focus", pose.isFocus);
        card.style.left = `${metrics.centerX}px`;
        card.style.top = `${metrics.centerY}px`;
        card.style.width = `${width}px`;
        card.style.height = `${height}px`;
        card.style.zIndex = String(pose.zIndex);
        card.style.opacity = String(pose.opacity * reveal);
        card.style.visibility =
          pose.opacity * reveal <= 0.02 ? "hidden" : "visible";
        card.style.transform = [
          "translate(-50%, -50%)",
          `translate3d(${pose.x}px, ${y}px, 0)`,
        ].join(" ");
      });
    }

    const normalizeTarget = () => {
      target %= HERO_GALLERY_ITEMS.length;
      if (target < 0) target += HERO_GALLERY_ITEMS.length;
    };

    const animateToTarget = () => {
      frame = null;
      const delta = wrapDelta(target, active);

      if (Math.abs(delta) < 0.001 || reducedMotion) {
        active = target;
        layout();
        return;
      }

      active += delta * 0.14;
      if (active >= HERO_GALLERY_ITEMS.length) active -= HERO_GALLERY_ITEMS.length;
      if (active < 0) active += HERO_GALLERY_ITEMS.length;
      layout();
      frame = requestAnimationFrame(animateToTarget);
    };

    const startAnimation = () => {
      if (!frame) frame = requestAnimationFrame(animateToTarget);
    };

    const clearAutoAdvance = () => {
      if (autoTimer) {
        window.clearTimeout(autoTimer);
        autoTimer = null;
      }
    };

    const scheduleAutoAdvance = () => {
      clearAutoAdvance();
      if (reducedMotion || !introComplete || document.hidden || dragging) return;

      autoTimer = window.setTimeout(() => {
        target = Math.round(active) + 1;
        normalizeTarget();
        startAnimation();
        scheduleAutoAdvance();
      }, AUTO_ADVANCE_MS);
    };

    const finishIntro = () => {
      introProgress = 1;
      introComplete = true;
      titleExpanded = true;
      root.classList.add("is-intro-complete");
      hero?.classList.add("is-carousel-revealed");
      hero?.classList.add("is-title-expanded");
      layout();
      scheduleAutoAdvance();
    };

    const runIntro = (startTime) => {
      const elapsed = performance.now() - startTime;
      if (!titleExpanded && elapsed >= 80) {
        titleExpanded = true;
        hero?.classList.add("is-title-expanded");
      }
      introProgress = clamp(
        (elapsed - INTRO_HOLD_MS) / INTRO_DURATION_MS,
        0,
        1
      );
      layout();

      if (introProgress < 1) {
        introFrame = requestAnimationFrame(() => runIntro(startTime));
      } else {
        introFrame = null;
        finishIntro();
      }
    };

    const snapToNearest = () => {
      target = Math.round(active);
      normalizeTarget();
      startAnimation();
    };

    const onPointerDown = (event) => {
      if (!introComplete) return;
      if (event.button !== undefined && event.button !== 0) return;

      clearAutoAdvance();
      dragging = true;
      pointerId = event.pointerId;
      dragAxis = null;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartActive = active;
      target = active;

      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      root.setPointerCapture(event.pointerId);
      root.classList.add("is-dragging");
    };

    const onPointerMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      if (!dragAxis && Math.hypot(deltaX, deltaY) > 8) {
        dragAxis = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
      }

      const metrics = getMetrics();
      const dragDelta = dragAxis === "x" ? deltaX : deltaY;
      active = dragStartActive - dragDelta / metrics.dragPxPerCard;
      active %= HERO_GALLERY_ITEMS.length;
      if (active < 0) active += HERO_GALLERY_ITEMS.length;
      target = active;
      layout();
    };

    const endDrag = (event) => {
      if (!dragging || (event.pointerId && event.pointerId !== pointerId)) return;

      dragging = false;
      pointerId = null;
      dragAxis = null;
      root.classList.remove("is-dragging");

      if (event.pointerId && root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }

      snapToNearest();
      scheduleAutoAdvance();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearAutoAdvance();
      } else {
        scheduleAutoAdvance();
      }
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", layout, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    layout();

    if (reducedMotion) {
      finishIntro();
    } else {
      introFrame = requestAnimationFrame((startTime) => runIntro(startTime));
    }
  }

  document
    .querySelectorAll("[data-hero-sine-carousel]")
    .forEach(initHeroSineCarousel);
})();
