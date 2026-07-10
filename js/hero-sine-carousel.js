(function () {
  const PROJECTS = [
    { src: "assets/images/projects/namu-right.png", alt: "Namu Buro" },
    { src: "assets/images/projects/lim-right.png", alt: "Lim CC" },
    { src: "assets/images/projects/langy-right.png", alt: "Langy App" },
    { src: "assets/images/projects/foremost-right.png", alt: "Foremost" },
    { src: "assets/images/projects/ps-right.png", alt: "Architectural bureau" },
    { src: "assets/images/projects/quinky-right.png", alt: "Quinky" },
    { src: "assets/images/projects/namu-mid.png", alt: "" },
    { src: "assets/images/projects/lim-mid.png", alt: "" },
    { src: "assets/images/projects/langy-mid.png", alt: "" },
  ];

  const CARD_SIZE_STOPS = [
    { width: 622, height: 373 },
    { width: 345, height: 207 },
    { width: 288, height: 173 },
    { width: 228, height: 138 },
    { width: 175, height: 105 },
  ];

  const TOP_CARD_CENTER_Y_STOPS = [
    172 + 373 / 2,
    149 + 207 / 2,
    126 + 173 / 2,
    105 + 138 / 2,
    90 + 105 / 2,
  ];

  const BOTTOM_CARD_CENTER_Y_STOPS = [
    172 + 373 / 2,
    172 + 373 / 2 + (172 + 373 / 2 - (149 + 207 / 2)),
    172 + 373 / 2 + (172 + 373 / 2 - (126 + 173 / 2)),
    172 + 373 / 2 + (172 + 373 / 2 - (105 + 138 / 2)),
    172 + 373 / 2 + (172 + 373 / 2 - (90 + 105 / 2)),
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function initHeroSineCarousel(root) {
    if (!root || root.dataset.ready === "true") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const track = document.createElement("div");
    track.className = "hero-sine-carousel__track";

    const cards = PROJECTS.map((project, index) => {
      const card = document.createElement("figure");
      card.className = "hero-sine-carousel__card";
      card.dataset.index = String(index);

      const img = document.createElement("img");
      img.src = project.src;
      img.alt = project.alt;
      img.loading = index < 3 ? "eager" : "lazy";
      img.decoding = "async";
      img.draggable = false;

      card.appendChild(img);
      track.appendChild(card);
      img.addEventListener("load", layout, { passive: true });
      return card;
    });

    root.appendChild(track);
    root.dataset.ready = "true";

    let active = 0;
    let target = 0;
    let frame = null;
    let dragging = false;
    let pointerId = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartActive = 0;
    let dragAxis = null;

    const wrapDelta = (index, pivot) => {
      let delta = index - pivot;
      const half = PROJECTS.length / 2;
      while (delta > half) delta -= PROJECTS.length;
      while (delta <= -half) delta += PROJECTS.length;
      return delta;
    };

    const getMetrics = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      const mobile = width < 760;

      return {
        width,
        height,
        mobile,
        centerX: width * 0.5,
        dragPxPerCard: mobile ? height * 0.16 : height * 0.12,
        sizeScale: mobile ? width / 390 : width / 1200,
        pageOffsetY: root.getBoundingClientRect().top + window.scrollY,
      };
    };

    const getCardPose = (delta, metrics) => {
      const distance = Math.abs(delta);
      const lowerIndex = Math.floor(distance);
      const upperIndex = Math.min(lowerIndex + 1, CARD_SIZE_STOPS.length - 1);
      const progress = clamp(distance - lowerIndex, 0, 1);
      const lowerSize =
        CARD_SIZE_STOPS[Math.min(lowerIndex, CARD_SIZE_STOPS.length - 1)];
      const upperSize = CARD_SIZE_STOPS[upperIndex];
      const width =
        (lowerSize.width + (upperSize.width - lowerSize.width) * progress) *
        metrics.sizeScale;
      const height =
        (lowerSize.height + (upperSize.height - lowerSize.height) * progress) *
        metrics.sizeScale;
      const yStops = delta < 0 ? TOP_CARD_CENTER_Y_STOPS : BOTTOM_CARD_CENTER_Y_STOPS;
      const lowerCenterY = yStops[Math.min(lowerIndex, yStops.length - 1)];
      const upperCenterY = yStops[upperIndex];
      const stackCenterY =
        (lowerCenterY + (upperCenterY - lowerCenterY) * progress) *
        metrics.sizeScale;
      const mainCenterY = TOP_CARD_CENTER_Y_STOPS[0] * metrics.sizeScale;
      const y = stackCenterY - mainCenterY;
      const opacity = distance > 4.45 ? 0 : 1;
      const zIndex = 200 - Math.round(distance * 20);

      return {
        x: 0,
        y,
        top: mainCenterY - metrics.pageOffsetY,
        width,
        height,
        opacity,
        zIndex,
        isFocus: distance < 0.5,
      };
    };

    function layout() {
      const metrics = getMetrics();

      cards.forEach((card, index) => {
        const delta = wrapDelta(index, active);
        const pose = getCardPose(delta, metrics);

        card.classList.toggle("is-focus", pose.isFocus);
        card.style.left = `${metrics.centerX}px`;
        card.style.top = `${pose.top}px`;
        card.style.width = `${pose.width}px`;
        card.style.height = `${pose.height}px`;
        card.style.zIndex = String(pose.zIndex);
        card.style.opacity = String(pose.opacity);
        card.style.visibility = pose.opacity <= 0.02 ? "hidden" : "visible";
        card.style.transform = [
          "translate(-50%, -50%)",
          `translate3d(${pose.x}px, ${pose.y}px, 0)`,
        ].join(" ");
      });
    }

    const normalizeTarget = () => {
      target %= PROJECTS.length;
      if (target < 0) target += PROJECTS.length;
    };

    const animateToTarget = () => {
      frame = null;
      const delta = wrapDelta(target, active);

      if (Math.abs(delta) < 0.001 || reducedMotion) {
        active = target;
        layout();
        return;
      }

      active += delta * 0.16;
      if (active >= PROJECTS.length) active -= PROJECTS.length;
      if (active < 0) active += PROJECTS.length;
      layout();
      frame = requestAnimationFrame(animateToTarget);
    };

    const startAnimation = () => {
      if (!frame) frame = requestAnimationFrame(animateToTarget);
    };

    const snapToNearest = () => {
      target = Math.round(active);
      normalizeTarget();
      startAnimation();
    };

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
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
      active %= PROJECTS.length;
      if (active < 0) active += PROJECTS.length;
      target = active;
      layout();
    };

    const endDrag = (event) => {
      if (!dragging || (event.pointerId && event.pointerId !== pointerId)) {
        return;
      }

      dragging = false;
      pointerId = null;
      dragAxis = null;
      root.classList.remove("is-dragging");

      if (event.pointerId && root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }

      snapToNearest();
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", layout, { passive: true });

    layout();
  }

  document
    .querySelectorAll("[data-hero-sine-carousel]")
    .forEach(initHeroSineCarousel);
})();
