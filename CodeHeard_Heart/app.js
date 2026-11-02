(() => {
  "use strict";

  // 颜色与形态独立：单指换色，另外三种手势只负责切换粒子构图。
  const PALETTES = [
    {
      name: "心动粉",
      accent: "#ff5fa8",
      accentTwo: "#ffd0e4",
      accentRgb: "255, 95, 168",
      accentTwoRgb: "255, 208, 228",
      glow: "rgba(255, 77, 161, 0.32)",
      particles: ["#fffafd", "#ffd0e2", "#ff5aa6"],
    },
    {
      name: "樱花粉",
      accent: "#ff9cc5",
      accentTwo: "#ffe8f1",
      accentRgb: "255, 156, 197",
      accentTwoRgb: "255, 232, 241",
      glow: "rgba(255, 151, 198, 0.3)",
      particles: ["#fffdfd", "#ffdce9", "#ff9ac5"],
    },
    {
      name: "星雾紫",
      accent: "#c49aff",
      accentTwo: "#ffb9dc",
      accentRgb: "196, 154, 255",
      accentTwoRgb: "255, 185, 220",
      glow: "rgba(189, 133, 242, 0.28)",
      particles: ["#fff8ff", "#f0d2ff", "#c49aff"],
    },
    {
      name: "月光白",
      accent: "#dcf6ff",
      accentTwo: "#8fdcff",
      accentRgb: "220, 246, 255",
      accentTwoRgb: "143, 220, 255",
      glow: "rgba(148, 223, 255, 0.25)",
      particles: ["#ffffff", "#e4f9ff", "#9de5ff"],
    },
    {
      name: "晨曦金",
      accent: "#ffd08a",
      accentTwo: "#ff9c8f",
      accentRgb: "255, 208, 138",
      accentTwoRgb: "255, 156, 143",
      glow: "rgba(255, 181, 117, 0.24)",
      particles: ["#fffdf2", "#ffe3a6", "#ff9b98"],
    },
    {
      name: "极光青",
      accent: "#70f1dc",
      accentTwo: "#86bfff",
      accentRgb: "112, 241, 220",
      accentTwoRgb: "134, 191, 255",
      glow: "rgba(97, 225, 216, 0.24)",
      particles: ["#f4fffd", "#b9fff2", "#8dccff"],
    },
  ];
  const FORMS = [
    {
      name: "星环浮光心",
      chapter: "01 · ROSE RING",
      lead: "万千微光，汇成一颗心。",
      note: "星环浮光心 · 光环与粒子一同转动",
    },
    {
      name: "流光丝线心",
      chapter: "02 · LUMINOUS SILK",
      lead: "让光线，沿着心跳流淌。",
      note: "流光丝线心 · 每一束光都在向你靠近",
    },
    {
      name: "粉雾粒子心",
      chapter: "03 · STELLAR CURRENT",
      lead: "让粉色星尘，落成温柔的裙摆。",
      note: "粉雾粒子心 · 粉色星尘垂落成光",
    },
  ];
  const SURFACES = [
    { dark: [74, 7, 42], mid: [231, 72, 137], light: [255, 205, 226] },
    { dark: [55, 14, 3], mid: [218, 87, 30], light: [255, 214, 137] },
    { dark: [22, 9, 52], mid: [111, 74, 201], light: [191, 184, 255] },
  ];

  const canvas = document.querySelector("#heartCanvas");
  const context = canvas.getContext("2d", { alpha: true });
  const volumeCanvas = document.querySelector("#volumeCanvas");
  const frontCanvas = document.querySelector("#frontCanvas");
  const frontContext = frontCanvas.getContext("2d", { alpha: true });
  const titleWrap = document.querySelector("#titleWrap");
  const titleLineOne = document.querySelector("#titleLineOne");
  const titleLineTwo = document.querySelector("#titleLineTwo");
  const chapterLabel = document.querySelector("#chapterLabel");
  const leadText = document.querySelector("#leadText");
  const pulseButton = document.querySelector("#pulseButton");
  const soundToggle = document.querySelector("#soundToggle");
  const soundLabel = document.querySelector("#soundLabel");
  const statusText = document.querySelector("#statusText");
  const toast = document.querySelector("#toast");
  const cameraToggle = document.querySelector("#cameraToggle");
  const cameraLabel = document.querySelector("#cameraLabel");
  const cameraConsole = document.querySelector("#cameraConsole");
  const cameraClose = document.querySelector("#cameraClose");
  const cameraLoading = document.querySelector("#cameraLoading");
  const cameraLoadingText = document.querySelector("#cameraLoadingText");
  const cameraRetry = document.querySelector("#cameraRetry");
  const handVideo = document.querySelector("#handVideo");
  const handOverlay = document.querySelector("#handOverlay");
  const handContext = handOverlay.getContext("2d");
  const gestureName = document.querySelector("#gestureName");
  const gestureSymbol = document.querySelector("#gestureSymbol");
  const gestureLock = document.querySelector("#gestureLock");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ?still=1 便于用无界面浏览器生成稳定的作品截图，不影响正常打开。
  const urlParameters = new URLSearchParams(window.location.search);
  const stillMode = urlParameters.has("still");
  if (stillMode) document.documentElement.classList.add("still");

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    time: 0,
    themeIndex: 0,
    formIndex: 0,
    theme: PALETTES[0],
    pointerX: -9999,
    pointerY: -9999,
    pulseStartedAt: -10,
    soundOn: false,
    autoRotate: true,
    rotation: -0.22,
    cameraRunning: false,
    cameraRequestId: 0,
    cameraStream: null,
    handLandmarker: null,
    visionLoadPromise: null,
    lastVideoTime: -1,
    cameraFrame: 0,
    candidateGesture: "",
    candidateSince: 0,
    lastGesture: "",
    lastGestureAt: 0,
    toastTimer: 0,
    lastFrame: performance.now(),
  };

  let particles = [];
  let heartPolygon = [];
  let contourPoints = [];
  let orbitLights = [];
  let stars = [];
  let ambientMotes = [];
  let floatingHearts = [];
  let ripples = [];
  let sparks = [];
  let volumeRenderer = null;

  // 固定随机种子让每次打开都拥有相同的主构图，便于截图与评审。
  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function heartPoint(t) {
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: x / 18, y: -y / 18 };
  }

  function createHeartPolygon(segments = 220) {
    return Array.from({ length: segments }, (_, index) => heartPoint((index / segments) * Math.PI * 2));
  }

  function isInsideHeart(x, y, polygon) {
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
      const first = polygon[current];
      const second = polygon[previous];
      const crosses =
        first.y > y !== second.y > y &&
        x < ((second.x - first.x) * (y - first.y)) / (second.y - first.y || 1e-9) + first.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function sampleHeartInterior(random, polygon) {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const x = (random() * 2 - 1) * 0.91;
      const y = (random() * 2 - 1) * 0.84;
      if (isInsideHeart(x, y, polygon)) return { x, y };
    }
    return heartPoint(random() * Math.PI * 2);
  }

  function buildScene() {
    const random = seededRandom(20261105);
    const compact = state.width < 720;
    const particleCount = compact ? 4200 : 9200;
    const starCount = compact ? 65 : 130;
    const contourCount = compact ? 190 : 300;
    heartPolygon = createHeartPolygon();

    particles = Array.from({ length: particleCount }, (_, index) => {
      const t = random() * Math.PI * 2;
      const edge = heartPoint(t);
      const filled = sampleHeartInterior(random, heartPolygon);
      const isEdge = index % 4 === 0;
      const depth = random();

      return {
        x: filled.x,
        y: filled.y,
        edgeX: edge.x,
        edgeY: edge.y,
        edgeT: t,
        size: 0.42 + random() * 1.22 + (isEdge ? 0.35 : 0),
        alpha: 0.38 + random() * 0.55,
        phase: random() * Math.PI * 2,
        speed: 0.55 + random() * 1.2,
        drift: random() * 0.0035 + 0.0008,
        depth,
        layer: random(),
        z: (random() - 0.5) * 0.52,
        isEdge,
        colorIndex: Math.floor(random() * 3),
      };
    });

    stars = Array.from({ length: starCount }, () => ({
      x: random(),
      y: random(),
      size: 0.3 + random() * 1.35,
      alpha: 0.08 + random() * 0.35,
      phase: random() * Math.PI * 2,
      speed: 0.15 + random() * 0.7,
    }));

    contourPoints = Array.from({ length: contourCount }, (_, index) => {
      const t = (index / contourCount) * Math.PI * 2;
      const point = heartPoint(t);
      return {
        x: point.x,
        y: point.y,
        z: Math.sin(t * 2.5) * 0.035 + (random() - 0.5) * 0.015,
        phase: t,
        isEdge: true,
        depth: 0.8,
      };
    });

    orbitLights = Array.from({ length: compact ? 10 : 18 }, () => ({
      angle: random() * Math.PI * 2,
      radius: 1.02 + random() * 0.32,
      speed: 0.09 + random() * 0.16,
      size: 0.45 + random() * 1.1,
      phase: random() * Math.PI * 2,
    }));

    ambientMotes = Array.from({ length: compact ? 90 : 180 }, () => ({
      x: random(),
      y: random(),
      size: 0.35 + random() * 1.2,
      alpha: 0.08 + random() * 0.34,
      phase: random() * Math.PI * 2,
      speed: 0.2 + random() * 0.75,
    }));

    floatingHearts = Array.from({ length: compact ? 18 : 38 }, () => ({
      x: random(),
      y: random(),
      size: 2.6 + random() * 9.5,
      alpha: 0.09 + random() * 0.24,
      phase: random() * Math.PI * 2,
      speed: 0.12 + random() * 0.36,
      rotation: random() * Math.PI * 2,
      drift: 12 + random() * 34,
    }));
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    frontCanvas.width = canvas.width;
    frontCanvas.height = canvas.height;
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    frontContext.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    if (volumeRenderer) {
      volumeCanvas.width = Math.round(state.width * Math.min(state.dpr, 1.5));
      volumeCanvas.height = Math.round(state.height * Math.min(state.dpr, 1.5));
      volumeRenderer.resize(volumeCanvas.width, volumeCanvas.height);
    }
    buildScene();
  }

  function gaussianPulse(phase, center, width) {
    const distance = ((phase - center + 1.5) % 1) - 0.5;
    return Math.exp(-(distance * distance) / (2 * width * width));
  }

  function heartbeat(time) {
    const phase = (time * 1.08) % 1;
    return 0.012 + gaussianPulse(phase, 0.08, 0.035) * 0.035 + gaussianPulse(phase, 0.26, 0.05) * 0.018;
  }

  function getHeartLayout() {
    const compact = state.width < 760;
    return {
      x: state.width * 0.5,
      y: compact ? state.height * 0.37 : state.height * 0.49,
      radius: compact
        ? Math.min(state.width * 0.4, state.height * 0.3)
        : Math.min(state.width * 0.245, state.height * 0.43),
    };
  }

  function getFormCoordinates(particle, time) {
    let x = particle.x;
    let y = particle.y;

    if (state.formIndex === 1) {
      const angle = Math.atan2(y, x);
      const petal = 1 + Math.sin(angle * 5 + particle.phase * 0.35) * (particle.isEdge ? 0.045 : 0.018);
      x *= petal;
      y = y * (0.965 + Math.cos(angle * 3) * 0.025) - Math.sin(time * 0.8 + particle.phase) * 0.007;
    } else if (state.formIndex === 2) {
      const shell = particle.isEdge ? 1.035 : 0.94;
      x *= shell;
      y *= shell;
    }

    return { x, y, z: particle.z };
  }

  function projectParticle(particle, layout, scale, time, push = 0) {
    const point = getFormCoordinates(particle, time);
    const cos = Math.cos(state.rotation);
    const sin = Math.sin(state.rotation);
    // 保留最小侧身宽度，让旋转经过侧面时仍是可辨认的心，而不是一条线。
    const horizontalScale = Math.sign(cos || 1) * (0.34 + Math.abs(cos) * 0.66);
    const rotatedX = point.x * horizontalScale + point.z * sin;
    const rotatedZ = -point.x * sin + point.z * cos;
    const perspective = 1 + rotatedZ * 0.16;

    return {
      x: layout.x + rotatedX * scale * (1 + push) * perspective,
      y: layout.y + point.y * scale * (1 + push) * perspective - rotatedZ * scale * 0.025,
      depth: rotatedZ,
    };
  }

  function drawMiniHeart(paint, x, y, size, rotation, color, alpha) {
    paint.save();
    paint.translate(x, y);
    paint.rotate(rotation);
    paint.beginPath();
    paint.moveTo(0, size * 0.36);
    paint.bezierCurveTo(-size * 0.58, size * 0.04, -size * 0.54, -size * 0.42, -size * 0.18, -size * 0.42);
    paint.bezierCurveTo(-size * 0.02, -size * 0.42, 0, -size * 0.27, 0, -size * 0.17);
    paint.bezierCurveTo(0, -size * 0.27, size * 0.02, -size * 0.42, size * 0.18, -size * 0.42);
    paint.bezierCurveTo(size * 0.54, -size * 0.42, size * 0.58, size * 0.04, 0, size * 0.36);
    paint.closePath();
    paint.globalAlpha = alpha;
    paint.fillStyle = color;
    paint.fill();
    paint.restore();
  }

  function drawScreenHearts(layout, time) {
    context.save();
    context.globalCompositeOperation = "lighter";

    const clouds = [
      { x: 0.1, y: 0.2, radius: 0.2, alpha: 0.08 },
      { x: 0.18, y: 0.75, radius: 0.28, alpha: 0.055 },
      { x: 0.86, y: 0.22, radius: 0.22, alpha: 0.06 },
      { x: 0.82, y: 0.78, radius: 0.26, alpha: 0.045 },
    ];
    for (const cloud of clouds) {
      const radius = Math.max(state.width, state.height) * cloud.radius;
      const gradient = context.createRadialGradient(
        cloud.x * state.width,
        cloud.y * state.height,
        0,
        cloud.x * state.width,
        cloud.y * state.height,
        radius,
      );
      gradient.addColorStop(0, `rgba(${state.theme.accentRgb}, ${cloud.alpha})`);
      gradient.addColorStop(0.45, `rgba(${state.theme.accentTwoRgb}, ${cloud.alpha * 0.28})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, state.width, state.height);
    }

    for (const mote of ambientMotes) {
      const drift = Math.sin(time * mote.speed + mote.phase) * 20;
      const x = (mote.x * state.width + drift + state.width) % state.width;
      const y = mote.y * state.height + Math.cos(time * mote.speed * 0.7 + mote.phase) * 16;
      context.globalAlpha = mote.alpha * (0.55 + Math.sin(time + mote.phase) * 0.3);
      context.fillStyle = state.theme.particles[(mote.size * 10 | 0) % 3];
      context.fillRect(x, y, mote.size, mote.size);
    }

    for (const heart of floatingHearts) {
      const x =
        heart.x * state.width +
        Math.sin(time * heart.speed + heart.phase) * heart.drift;
      const y =
        heart.y * state.height +
        Math.cos(time * heart.speed * 0.72 + heart.phase) * heart.drift * 0.6;
      drawMiniHeart(
        context,
        x,
        y,
        heart.size,
        heart.rotation + time * heart.speed * 0.2,
        heart.size > 6 ? state.theme.accent : state.theme.particles[0],
        heart.alpha,
      );
    }

    if (state.formIndex === 1) {
      const centerY = layout.y + layout.radius * 0.34;
      for (let lineIndex = 0; lineIndex < 13; lineIndex += 1) {
        const offset = (lineIndex - 6) * layout.radius * 0.065;
        const sway = Math.sin(time * 0.42 + lineIndex * 0.61) * layout.radius * 0.08;
        const gradient = context.createLinearGradient(0, centerY, state.width, centerY);
        gradient.addColorStop(0, `rgba(${state.theme.accentRgb}, 0)`);
        gradient.addColorStop(0.3, `rgba(${state.theme.accentTwoRgb}, 0.23)`);
        gradient.addColorStop(0.5, `rgba(255, 244, 228, 0.34)`);
        gradient.addColorStop(0.7, `rgba(${state.theme.accentTwoRgb}, 0.22)`);
        gradient.addColorStop(1, `rgba(${state.theme.accentRgb}, 0)`);
        context.beginPath();
        context.moveTo(-30, centerY + offset + 50);
        context.bezierCurveTo(
          state.width * 0.28,
          centerY + offset - 105 + sway,
          state.width * 0.72,
          centerY + offset + 105 - sway,
          state.width + 30,
          centerY + offset - 34,
        );
        context.strokeStyle = gradient;
        context.lineWidth = lineIndex % 4 === 0 ? 1.15 : 0.6;
        context.setLineDash([2, 11]);
        context.lineDashOffset = -time * (10 + lineIndex * 1.7);
        context.shadowColor = `rgba(${state.theme.accentTwoRgb}, 0.3)`;
        context.shadowBlur = lineIndex % 4 === 0 ? 8 : 0;
        context.stroke();
      }
      context.setLineDash([]);
      context.shadowBlur = 0;

      for (let index = 0; index < 46; index += 1) {
        const x = ((index / 46) * state.width + time * (13 + (index % 5) * 2)) % state.width;
        const y =
          centerY +
          Math.sin((x / state.width) * Math.PI * 3 + time * 0.4 + index) * layout.radius * 0.16 +
          (index % 7 - 3) * 12;
        context.fillStyle = `rgba(${state.theme.accentTwoRgb}, ${0.25 + (index % 4) * 0.05})`;
        context.fillRect(x, y, index % 9 === 0 ? 1.8 : 0.8, index % 9 === 0 ? 1.8 : 0.8);
      }
    }

    if (state.formIndex !== 1) {
      const floorY = layout.y + layout.radius * 0.96;
      for (let rayIndex = 0; rayIndex < 34; rayIndex += 1) {
        const angle = (rayIndex / 33) * Math.PI;
        const endX = layout.x + Math.cos(angle) * layout.radius * 3.8;
        const endY = floorY + Math.sin(angle) * layout.radius * 0.52;
        context.beginPath();
        context.moveTo(layout.x, floorY - layout.radius * 0.08);
        context.quadraticCurveTo(
          layout.x + Math.cos(angle) * layout.radius * 0.6,
          floorY + Math.sin(angle) * layout.radius * 0.14,
          endX,
          endY,
        );
        context.strokeStyle = `rgba(${state.theme.accentRgb}, 0.095)`;
        context.lineWidth = 0.45;
        context.stroke();
      }

      for (let ringIndex = 1; ringIndex <= 8; ringIndex += 1) {
        const width = layout.radius * (0.8 + ringIndex * 0.56);
        const height = width * (0.105 + ringIndex * 0.006);
        const count = state.width < 720 ? 54 : 92;
        for (let index = 0; index < count; index += 1) {
          const angle = (index / count) * Math.PI * 2 + time * 0.045 * (ringIndex % 2 ? 1 : -1);
          const x = layout.x + Math.cos(angle) * width;
          const y = floorY + Math.sin(angle) * height + ringIndex * 2.2;
          context.fillStyle = `rgba(${state.theme.accentTwoRgb}, ${0.15 + (8 - ringIndex) * 0.018})`;
          context.fillRect(x, y, index % 8 === 0 ? 1.75 : 0.75, index % 8 === 0 ? 1.75 : 0.75);
        }
      }
    }

    context.restore();
  }

  function drawBackdrop(layout, time) {
    const { x, y, radius } = layout;
    const aura = context.createRadialGradient(x, y, 0, x, y, radius * 1.35);
    aura.addColorStop(0, state.theme.glow);
    aura.addColorStop(0.32, state.theme.glow);
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = aura;
    context.fillRect(0, 0, state.width, state.height);

    context.save();
    context.globalCompositeOperation = "lighter";
    for (const star of stars) {
      const twinkle = 0.46 + Math.sin(time * star.speed + star.phase) * 0.38;
      context.beginPath();
      context.arc(star.x * state.width, star.y * state.height, star.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 244, 235, ${star.alpha * twinkle})`;
      context.fill();
    }
    context.restore();

    drawScreenHearts(layout, time);

    context.save();
    context.strokeStyle = `rgba(${state.theme.accentRgb}, 0.06)`;
    context.lineWidth = 0.7;
    for (let index = 1; index <= 3; index += 1) {
      const ringRadius = radius * (1.12 + index * 0.15) + Math.sin(time * 0.45 + index) * 4;
      context.beginPath();
      context.ellipse(x, y + radius * 0.02, ringRadius * 0.91, ringRadius * 0.77, -0.08, 0, Math.PI * 2);
      context.stroke();
    }

    for (const light of orbitLights) {
      const angle = time * light.speed + light.angle;
      const orbitX = x + Math.cos(angle) * radius * light.radius;
      const orbitY =
        y +
        Math.sin(angle) * radius * light.radius * 0.58 +
        Math.cos(angle * 2 + light.phase) * radius * 0.035;
      const strength = 0.35 + Math.sin(time * 1.4 + light.phase) * 0.25;
      context.beginPath();
      context.arc(orbitX, orbitY, light.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${state.theme.accentTwoRgb}, ${strength})`;
      context.fill();
    }

    if (state.formIndex === 2) {
      for (let index = 0; index < 3; index += 1) {
        const orbitRadius = radius * (1.05 + index * 0.18);
        const orbitTilt = -0.32 + Math.sin(time * 0.4 + index) * 0.2;
        context.beginPath();
        context.ellipse(x, y, orbitRadius, orbitRadius * (0.16 + index * 0.035), orbitTilt, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${state.theme.accentTwoRgb}, ${0.12 - index * 0.025})`;
        context.lineWidth = 0.8;
        context.stroke();

        const satelliteAngle = time * (0.52 - index * 0.09) + index * 2.1;
        const satelliteX = x + Math.cos(satelliteAngle) * orbitRadius * Math.cos(orbitTilt);
        const satelliteY = y + Math.cos(satelliteAngle) * orbitRadius * Math.sin(orbitTilt);
        context.beginPath();
        context.arc(satelliteX, satelliteY, 1.6 - index * 0.25, 0, Math.PI * 2);
        context.fillStyle = `rgba(${state.theme.accentTwoRgb}, 0.8)`;
        context.fill();
      }
    }
    context.restore();
  }

  function getOrbitPoint(ring, angle, layout) {
    const radius = layout.radius * ring.radius;
    const localX = Math.cos(angle) * radius;
    const localZ = Math.sin(angle) * radius * ring.aspect;
    const tiltedY = localZ * Math.sin(ring.tilt);
    const depth = localZ * Math.cos(ring.tilt);
    const rollCos = Math.cos(ring.roll);
    const rollSin = Math.sin(ring.roll);
    const perspective = 1 + depth / (layout.radius * 5.8);

    return {
      x: layout.x + (localX * rollCos - tiltedY * rollSin) * perspective,
      y: layout.y + (localX * rollSin + tiltedY * rollCos) * perspective,
      depth,
    };
  }

  function drawOrbitSystem(layout, time, frontLayer) {
    const rings = [
      { radius: 1.34, aspect: 0.68, tilt: 1.08, roll: -0.3, speed: 0.16, phase: 0.5 },
      { radius: 1.5, aspect: 0.42, tilt: 0.9, roll: 0.62, speed: -0.11, phase: 2.2 },
      { radius: 1.17, aspect: 0.82, tilt: 1.24, roll: -0.7, speed: 0.08, phase: 4.3 },
    ];
    const pointCount = state.width < 720 ? 86 : 150;
    const paint = frontLayer ? frontContext : context;

    paint.save();
    paint.globalCompositeOperation = "lighter";

    rings.forEach((ring, ringIndex) => {
      const points = Array.from({ length: pointCount }, (_, index) => {
        const angle = (index / pointCount) * Math.PI * 2 + time * ring.speed + ring.phase;
        return getOrbitPoint(ring, angle, layout);
      });

      let pathOpen = false;
      paint.beginPath();
      points.forEach((point, index) => {
        const visible = frontLayer ? point.depth >= 0 : point.depth < 0;
        if (!visible) {
          pathOpen = false;
          return;
        }
        if (!pathOpen) paint.moveTo(point.x, point.y);
        else paint.lineTo(point.x, point.y);
        pathOpen = true;

        if (index % 7 === 0) {
          paint.moveTo(point.x + 0.7, point.y);
          paint.arc(point.x, point.y, 0.7, 0, Math.PI * 2);
        }
      });
      paint.strokeStyle = `rgba(${ringIndex === 1 ? state.theme.accentTwoRgb : state.theme.accentRgb}, ${frontLayer ? 0.2 : 0.08})`;
      paint.lineWidth = frontLayer ? 0.85 : 0.55;
      paint.stroke();

      const nodeAngle = time * (ring.speed * 2.4 + 0.18) + ring.phase + ringIndex;
      const node = getOrbitPoint(ring, nodeAngle, layout);
      if ((node.depth >= 0) === frontLayer) {
        const glow = paint.createRadialGradient(node.x, node.y, 0, node.x, node.y, 12);
        glow.addColorStop(0, `rgba(${state.theme.accentTwoRgb}, 0.9)`);
        glow.addColorStop(1, `rgba(${state.theme.accentTwoRgb}, 0)`);
        paint.fillStyle = glow;
        paint.fillRect(node.x - 12, node.y - 12, 24, 24);
        paint.beginPath();
        paint.arc(node.x, node.y, frontLayer ? 2.2 : 1.2, 0, Math.PI * 2);
        paint.fillStyle = state.formIndex === 2 ? "#d8fbff" : state.theme.particles[0];
        paint.fill();
      }
    });
    paint.restore();
  }

  function rotateVolumePoint(x, y, z) {
    const yawCos = Math.cos(state.rotation);
    const yawSin = Math.sin(state.rotation);
    const tilt = 0.17 + Math.sin(state.time * 0.48) * 0.11;
    const tiltCos = Math.cos(tilt);
    const tiltSin = Math.sin(tilt);
    const yawX = x * yawCos + z * yawSin;
    const yawZ = -x * yawSin + z * yawCos;

    return {
      x: yawX,
      y: y * tiltCos - yawZ * tiltSin,
      z: y * tiltSin + yawZ * tiltCos,
    };
  }

  function projectVolumePoint(x, y, z, layout, scale) {
    const rotated = rotateVolumePoint(x, y, z);
    const perspective = 1 + rotated.z * 0.24;
    return {
      x: layout.x + rotated.x * scale * perspective,
      y: layout.y + rotated.y * scale * perspective,
      z: rotated.z,
      world: rotated,
    };
  }

  function createHeartVolumeRenderer(targetCanvas) {
    const gl = targetCanvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    if (!gl) return null;

    const vertexSource = `
      attribute vec3 a_position;
      attribute vec3 a_normal;
      uniform vec2 u_resolution;
      uniform vec2 u_center;
      uniform float u_scale;
      uniform float u_rotation;
      varying vec3 v_normal;
      varying vec3 v_position;

      void main() {
        float cy = cos(u_rotation);
        float sy = sin(u_rotation);
        float tilt = 0.16 + sin(u_rotation * 0.55) * 0.035;
        float ct = cos(tilt);
        float st = sin(tilt);

        vec3 p = a_position;
        p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
        vec3 n = a_normal;
        n = vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);
        p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
        n = vec3(n.x, n.y * ct - n.z * st, n.y * st + n.z * ct);

        float perspective = 1.0 + p.z * 0.2;
        vec2 pixel = u_center + p.xy * u_scale * perspective;
        vec2 clip = vec2(
          pixel.x / (u_resolution.x * 0.5) - 1.0,
          1.0 - pixel.y / (u_resolution.y * 0.5)
        );

        v_normal = normalize(n);
        v_position = p;
        gl_Position = vec4(clip, -p.z * 0.7, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      varying vec3 v_normal;
      varying vec3 v_position;
      uniform vec3 u_dark;
      uniform vec3 u_mid;
      uniform vec3 u_light;
      uniform vec3 u_glow;
      uniform float u_time;

      void main() {
        vec3 normal = normalize(v_normal);
        if (!gl_FrontFacing) normal = -normal;
        vec3 light = normalize(vec3(-0.48, -0.76, 0.9));
        vec3 viewDirection = vec3(0.0, 0.0, 1.0);
        vec3 halfVector = normalize(light + viewDirection);

        float diffuse = clamp(dot(normal, light) * 0.5 + 0.5, 0.0, 1.0);
        float specular = pow(clamp(dot(normal, halfVector), 0.0, 1.0), 34.0);
        float rim = pow(1.0 - clamp(abs(normal.z), 0.0, 1.0), 2.2);
        float vertical = clamp(v_position.y * 0.48 + 0.5, 0.0, 1.0);
        float glowWave = 0.5 + 0.5 * sin(v_position.y * 13.0 - u_time * 1.35);
        vec2 shineOffset = v_position.xy - vec2(-0.34, -0.28);
        float broadShine = exp(-dot(shineOffset * vec2(3.2, 2.7), shineOffset * vec2(3.2, 2.7)));

        vec3 color = mix(u_dark, u_mid, 0.32 + diffuse * 0.68);
        color = mix(color, u_light, 0.1 + pow(diffuse, 3.2) * 0.42);
        color *= 0.88 + vertical * 0.16;
        color += u_glow * rim * (0.15 + glowWave * 0.08);
        color += vec3(specular * 0.82 + rim * 0.13 + broadShine * 0.14);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    try {
      const program = gl.createProgram();
      gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }

      const segments = 180;
      const rings = 36;
      const positions = [];
      const indices = [];
      for (let ringIndex = 0; ringIndex < rings; ringIndex += 1) {
        const normalizedZ = (ringIndex / (rings - 1)) * 2 - 1;
        const radial = Math.pow(Math.max(0, 1 - Math.abs(normalizedZ) ** 2.7), 0.42);
        for (let segment = 0; segment < segments; segment += 1) {
          const t = (segment / segments) * Math.PI * 2;
          const contour = heartPoint(t);
          positions.push(
            contour.x * radial,
            contour.y * radial,
            normalizedZ * 0.34 * (0.95 + Math.sin(t * 3) * 0.025),
          );
        }
      }
      for (let ringIndex = 0; ringIndex < rings - 1; ringIndex += 1) {
        for (let segment = 0; segment < segments; segment += 1) {
          const next = (segment + 1) % segments;
          const a = ringIndex * segments + segment;
          const b = ringIndex * segments + next;
          const c = (ringIndex + 1) * segments + segment;
          const d = (ringIndex + 1) * segments + next;
          indices.push(a, c, b, b, c, d);
        }
      }

      const normals = new Float32Array(positions.length);
      for (let index = 0; index < indices.length; index += 3) {
        const ia = indices[index] * 3;
        const ib = indices[index + 1] * 3;
        const ic = indices[index + 2] * 3;
        const abX = positions[ib] - positions[ia];
        const abY = positions[ib + 1] - positions[ia + 1];
        const abZ = positions[ib + 2] - positions[ia + 2];
        const acX = positions[ic] - positions[ia];
        const acY = positions[ic + 1] - positions[ia + 1];
        const acZ = positions[ic + 2] - positions[ia + 2];
        const nx = abY * acZ - abZ * acY;
        const ny = abZ * acX - abX * acZ;
        const nz = abX * acY - abY * acX;
        for (const vertex of [ia, ib, ic]) {
          normals[vertex] += nx;
          normals[vertex + 1] += ny;
          normals[vertex + 2] += nz;
        }
      }
      for (let index = 0; index < normals.length; index += 3) {
        const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1;
        normals[index] /= length;
        normals[index + 1] /= length;
        normals[index + 2] /= length;
      }

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

      const attributes = {
        position: gl.getAttribLocation(program, "a_position"),
        normal: gl.getAttribLocation(program, "a_normal"),
      };
      const uniforms = {};
      [
        "u_resolution", "u_center", "u_scale", "u_rotation",
        "u_dark", "u_mid", "u_light", "u_glow", "u_time",
      ].forEach((name) => {
        uniforms[name] = gl.getUniformLocation(program, name);
      });

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0);

      return {
        resize(width, height) {
          gl.viewport(0, 0, width, height);
        },
        render(layout, time) {
          const width = targetCanvas.width;
          const height = targetCanvas.height;
          const scale = layout.radius * (height / state.height) * (1 + heartbeat(time));
          gl.viewport(0, 0, width, height);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.useProgram(program);

          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.enableVertexAttribArray(attributes.position);
          gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
          gl.enableVertexAttribArray(attributes.normal);
          gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

          const colors = SURFACES[state.formIndex];
          const accent = state.theme.accentRgb.split(",").map(Number);
          gl.uniform2f(uniforms.u_resolution, width, height);
          gl.uniform2f(
            uniforms.u_center,
            layout.x * (width / state.width),
            layout.y * (height / state.height),
          );
          gl.uniform1f(uniforms.u_scale, scale);
          gl.uniform1f(uniforms.u_rotation, state.rotation);
          gl.uniform1f(uniforms.u_time, time);
          gl.uniform3fv(uniforms.u_dark, new Float32Array(colors.dark.map((value) => value / 255)));
          gl.uniform3fv(uniforms.u_mid, new Float32Array(colors.mid.map((value) => value / 255)));
          gl.uniform3fv(uniforms.u_light, new Float32Array(colors.light.map((value) => value / 255)));
          gl.uniform3fv(uniforms.u_glow, new Float32Array(accent.map((value) => value / 255)));
          gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        },
      };
    } catch (error) {
      console.warn("WebGL heart renderer unavailable:", error);
      volumeCanvas.style.display = "none";
      return null;
    }
  }

  function normalizeVector(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length,
    };
  }

  function mixColor(from, to, amount) {
    return [
      Math.round(from[0] + (to[0] - from[0]) * amount),
      Math.round(from[1] + (to[1] - from[1]) * amount),
      Math.round(from[2] + (to[2] - from[2]) * amount),
    ];
  }

  function projectHeartRing(phi, layout, scale, time, pointCount = contourPoints.length) {
    const zNorm = Math.sin(phi);
    const radial = Math.pow(Math.max(0, 1 - Math.abs(zNorm) ** 2.7), 0.42);
    const pulseWave = Math.sin(time * 1.5 + phi * 3) * 0.004;
    const projected = [];

    for (let index = 0; index < pointCount; index += 1) {
      const particle = contourPoints[Math.floor((index * contourPoints.length) / pointCount)];
      const form = getFormCoordinates(particle, time);
      const organic = 1 + Math.sin(index * 0.17 + time * 0.55 + phi * 1.6) * 0.006;
      const x = form.x * radial * organic;
      const y = form.y * radial * organic;
      const z = zNorm * 0.3 * (0.9 + Math.cos(index * 0.13) * 0.08);
      projected.push(projectVolumePoint(x, y, z, layout, scale * (1 + pulseWave)));
    }
    return projected;
  }

  function drawSurfaceRim(layout, scale, time, phi, alpha) {
    const ring = projectHeartRing(phi, layout, scale, time);
    const gradient = context.createLinearGradient(
      layout.x - layout.radius,
      layout.y - layout.radius,
      layout.x + layout.radius,
      layout.y + layout.radius,
    );
    gradient.addColorStop(0, `rgba(${state.theme.accentTwoRgb}, ${alpha})`);
    gradient.addColorStop(0.48, `rgba(255, 247, 238, ${alpha * 0.8})`);
    gradient.addColorStop(1, `rgba(${state.theme.accentRgb}, ${alpha})`);

    context.beginPath();
    ring.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.strokeStyle = gradient;
    context.lineWidth = 0.75;
    context.stroke();
  }

  function drawVolumetricHeart(layout, time) {
    const beat = heartbeat(time);
    const scale = layout.radius * (1 + beat);
    const compact = state.width < 720;
    const ringCount = compact ? 14 : 18;
    const segmentCount = compact ? 92 : 132;
    const surface = SURFACES[state.formIndex];
    const globalPulse = Math.max(0, 1 - (time - state.pulseStartedAt) / 2.4);
    const scaleWithPulse = scale * (1 + globalPulse * 0.035);
    const rings = [];

    // Build a closed, lenticular heart surface. The outer silhouette is the
    // familiar curve; the receding rings create the beveled 3D volume.
    for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
      const phi = -Math.PI / 2 + (ringIndex / (ringCount - 1)) * Math.PI;
      rings.push(projectHeartRing(phi, layout, scaleWithPulse, time, segmentCount));
    }

    context.save();
    context.globalCompositeOperation = "source-over";

    const equator = projectHeartRing(0, layout, scaleWithPulse, time);
    context.save();
    context.globalCompositeOperation = "lighter";
    context.beginPath();
    equator.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.strokeStyle = `rgba(${state.theme.accentRgb}, 0.28)`;
    context.lineWidth = 8;
    context.shadowColor = state.theme.accent;
    context.shadowBlur = 38 + beat * 90;
    context.stroke();
    context.restore();

    const faces = [];
    for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex += 1) {
      const back = rings[ringIndex];
      const front = rings[ringIndex + 1];
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const next = (segment + 1) % segmentCount;
        const a = back[segment];
        const b = back[next];
        const c = front[next];
        const d = front[segment];
        const edge1 = {
          x: b.world.x - a.world.x,
          y: b.world.y - a.world.y,
          z: b.world.z - a.world.z,
        };
        const edge2 = {
          x: c.world.x - a.world.x,
          y: c.world.y - a.world.y,
          z: c.world.z - a.world.z,
        };
        let normal = normalizeVector({
          x: edge1.y * edge2.z - edge1.z * edge2.y,
          y: edge1.z * edge2.x - edge1.x * edge2.z,
          z: edge1.x * edge2.y - edge1.y * edge2.x,
        });
        if (normal.z < 0) {
          normal = { x: -normal.x, y: -normal.y, z: -normal.z };
        }

        const light = normalizeVector({ x: -0.52, y: -0.72, z: 0.92 });
        const diffuse = Math.max(0, normal.x * light.x + normal.y * light.y + normal.z * light.z);
        const halfVector = normalizeVector({
          x: light.x,
          y: light.y,
          z: light.z + 1,
        });
        const specular = Math.pow(
          Math.max(0, normal.x * halfVector.x + normal.y * halfVector.y + normal.z * halfVector.z),
          24,
        );
        const rim = Math.pow(1 - Math.max(0, normal.z), 2);
        let color = mixColor(surface.dark, surface.mid, 0.2 + diffuse * 0.8);
        color = mixColor(color, surface.light, specular * 0.58 + rim * 0.12);

        faces.push({
          points: [a, b, c, d],
          color: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
          depth: (a.z + b.z + c.z + d.z) / 4,
        });
      }
    }

    faces.sort((left, right) => left.depth - right.depth);
    context.lineJoin = "round";
    context.lineWidth = 0.65;
    for (const face of faces) {
      context.beginPath();
      context.moveTo(face.points[0].x, face.points[0].y);
      context.lineTo(face.points[1].x, face.points[1].y);
      context.lineTo(face.points[2].x, face.points[2].y);
      context.lineTo(face.points[3].x, face.points[3].y);
      context.closePath();
      context.fillStyle = face.color;
      context.strokeStyle = face.color;
      context.fill();
      context.stroke();
    }

    // A fine, bright equator traces the form and makes the rounded edge read
    // as polished crystal rather than a flat illustration.
    context.globalCompositeOperation = "lighter";
    drawSurfaceRim(layout, scaleWithPulse, time, 0.03, 0.56);
    drawSurfaceRim(layout, scaleWithPulse, time, -0.16, 0.16);

    // The specular bloom is anchored to the object and follows its rotation.
    const highlightPoint = projectVolumePoint(-0.33, -0.28, 0.27, layout, scaleWithPulse);
    const highlight = context.createRadialGradient(
      highlightPoint.x,
      highlightPoint.y,
      0,
      highlightPoint.x,
      highlightPoint.y,
      scaleWithPulse * 0.34,
    );
    highlight.addColorStop(0, "rgba(255, 252, 245, 0.5)");
    highlight.addColorStop(0.24, `rgba(${state.theme.accentTwoRgb}, 0.16)`);
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = highlight;
    context.fillRect(
      highlightPoint.x - scaleWithPulse * 0.36,
      highlightPoint.y - scaleWithPulse * 0.36,
      scaleWithPulse * 0.72,
      scaleWithPulse * 0.72,
    );

    // Sparse pearls sit on the front surface and make the fill feel alive.
    const pearlCount = compact ? 350 : 680;
    for (let index = 0; index < pearlCount; index += 1) {
      const particle = particles[index];
      const frontBias = 0.08 + particle.depth * 0.16;
      const point = projectVolumePoint(particle.x, particle.y, frontBias, layout, scaleWithPulse);
      const twinkle = 0.4 + Math.sin(time * 2 + particle.phase) * 0.3;
      context.beginPath();
      context.arc(point.x, point.y, particle.size * 0.62, 0, Math.PI * 2);
      context.fillStyle = state.theme.particles[particle.colorIndex];
      context.globalAlpha = Math.min(0.72, particle.alpha * twinkle);
      context.fill();
    }
    context.globalAlpha = 1;

    const core = context.createRadialGradient(
      layout.x,
      layout.y,
      0,
      layout.x,
      layout.y,
      scaleWithPulse * 0.82,
    );
    core.addColorStop(0, `rgba(${state.theme.accentRgb}, ${0.12 + beat * 0.45})`);
    core.addColorStop(0.48, `rgba(${state.theme.accentRgb}, 0.025)`);
    core.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = core;
    context.fillRect(layout.x - scaleWithPulse, layout.y - scaleWithPulse, scaleWithPulse * 2, scaleWithPulse * 2);
    context.restore();
  }

  function drawHeartGlints(layout, time) {
    const paint = frontContext;
    const compact = state.width < 720;
    const count = compact ? 240 : 560;
    const scale = layout.radius * (1 + heartbeat(time));

    paint.save();
    paint.globalCompositeOperation = "lighter";
    for (let index = 0; index < count; index += 1) {
      const particle = particles[index];
      const point = projectVolumePoint(
        particle.x,
        particle.y,
        0.19 + particle.depth * 0.12,
        layout,
        scale,
      );
      const shimmer = 0.3 + Math.sin(time * 2.3 + particle.phase) * 0.22;
      paint.beginPath();
      paint.arc(point.x, point.y, particle.size * (index % 17 === 0 ? 1.25 : 0.55), 0, Math.PI * 2);
      paint.fillStyle = state.theme.particles[particle.colorIndex];
      paint.globalAlpha = Math.max(0.08, particle.alpha * shimmer);
      paint.fill();
    }

    const rim = projectHeartRing(0.58, layout, scale, time, compact ? 92 : 150);
    for (let index = 0; index < rim.length; index += 7) {
      const point = rim[index];
      const strength = 0.22 + Math.sin(time * 2 + index * 0.7) * 0.13;
      paint.beginPath();
      paint.arc(point.x, point.y, index % 21 === 0 ? 1.2 : 0.55, 0, Math.PI * 2);
      paint.fillStyle = `rgba(${state.theme.accentTwoRgb}, ${strength})`;
      paint.fill();
    }

    const edge = projectHeartRing(0, layout, scale, time, compact ? 92 : 150);
    const edgeGradient = paint.createLinearGradient(
      layout.x - layout.radius,
      layout.y - layout.radius,
      layout.x + layout.radius,
      layout.y + layout.radius,
    );
    edgeGradient.addColorStop(0, `rgba(${state.theme.accentTwoRgb}, 0.5)`);
    edgeGradient.addColorStop(0.5, "rgba(255, 248, 239, 0.3)");
    edgeGradient.addColorStop(1, `rgba(${state.theme.accentRgb}, 0.42)`);
    paint.beginPath();
    edge.forEach((point, index) => {
      if (index === 0) paint.moveTo(point.x, point.y);
      else paint.lineTo(point.x, point.y);
    });
    paint.closePath();
    paint.strokeStyle = edgeGradient;
    paint.lineWidth = 0.8;
    paint.shadowColor = state.theme.accent;
    paint.shadowBlur = 9;
    paint.stroke();
    paint.restore();
  }

  function drawLacePedestal(paint, layout, time) {
    const compact = state.width < 720;
    const centerX = layout.x;
    const baseY = layout.y + layout.radius * 0.8;
    const span = layout.radius * (compact ? 1.22 : 1.38);
    const aura = paint.createRadialGradient(
      centerX,
      baseY + layout.radius * 0.08,
      0,
      centerX,
      baseY + layout.radius * 0.08,
      span * 1.1,
    );
    aura.addColorStop(0, `rgba(${state.theme.accentTwoRgb}, 0.2)`);
    aura.addColorStop(0.4, `rgba(${state.theme.accentRgb}, 0.055)`);
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");

    paint.save();
    paint.globalCompositeOperation = "lighter";
    paint.lineCap = "round";
    paint.lineJoin = "round";
    paint.fillStyle = aura;
    paint.fillRect(centerX - span, baseY - span * 0.62, span * 2, span * 1.24);

    // Dotted elliptical layers beneath the heart create the lace-like floor
    // visible in the pink-particle reference.
    for (let ringIndex = 1; ringIndex <= 15; ringIndex += 1) {
      const progress = ringIndex / 15;
      const width = layout.radius * (0.12 + progress * 1.28);
      const height = layout.radius * (0.04 + progress * 0.3);
      const ringY = baseY - layout.radius * 0.055 + progress * layout.radius * 0.07;
      paint.globalAlpha = 0.2 + (1 - progress) * 0.22;
      paint.strokeStyle = `rgba(${ringIndex % 2 ? state.theme.accentTwoRgb : "255, 247, 252"}, 0.72)`;
      paint.lineWidth = ringIndex % 4 === 0 ? 0.9 : 0.48;
      paint.setLineDash([1, ringIndex % 3 === 0 ? 4 : 6]);
      paint.lineDashOffset = time * (ringIndex % 2 ? 8 : -8);
      paint.beginPath();
      paint.ellipse(centerX, ringY, width, height, 0, 0, Math.PI * 2);
      paint.stroke();

      const dotCount = compact ? 46 : 78;
      paint.setLineDash([]);
      for (let dotIndex = 0; dotIndex < dotCount; dotIndex += 1) {
        const angle = (dotIndex / dotCount) * Math.PI * 2 + time * 0.03 * (ringIndex % 2 ? 1 : -1);
        const x = centerX + Math.cos(angle) * width;
        const y = ringY + Math.sin(angle) * height;
        paint.beginPath();
        paint.arc(x, y, dotIndex % 8 === 0 ? 1.35 : 0.65, 0, Math.PI * 2);
        paint.fillStyle = `rgba(${state.theme.accentTwoRgb}, ${0.34 + (1 - progress) * 0.32})`;
        paint.fill();
      }
    }

    // Long curved filaments form the jellyfish-like lace skirt below the heart.
    const petalCount = compact ? 34 : 52;
    for (let petal = 0; petal < petalCount; petal += 1) {
      const progress = petal / (petalCount - 1);
      const side = progress * 2 - 1;
      const endX = centerX + side * span * 0.98;
      const endY =
        baseY +
        layout.radius * (0.08 + (1 - Math.abs(side)) * 0.35) +
        Math.sin(petal * 1.7 + time * 0.35) * layout.radius * 0.012;
      paint.beginPath();
      paint.moveTo(centerX, baseY - layout.radius * 0.14);
      paint.bezierCurveTo(
        centerX + side * layout.radius * 0.055,
        baseY + layout.radius * 0.12,
        centerX + side * layout.radius * 0.64,
        baseY + layout.radius * 0.06 + Math.sin(time * 0.45 + petal) * layout.radius * 0.014,
        endX,
        endY,
      );
      paint.globalAlpha = 0.3 + (1 - Math.abs(side)) * 0.24;
      paint.strokeStyle = `rgba(${petal % 5 === 0 ? state.theme.accentTwoRgb : "255, 245, 251"}, 0.78)`;
      paint.lineWidth = petal % 6 === 0 ? 1.05 : 0.5;
      paint.setLineDash(petal % 3 === 0 ? [] : [1.5, 5.5]);
      paint.lineDashOffset = time * (petal % 2 ? 7 : -7);
      paint.stroke();
    }

    paint.setLineDash([]);
    paint.globalAlpha = 1;
    paint.restore();
  }

  function drawJellyRings(paint, layout, time) {
    const ringCount = state.width < 720 ? 2 : 3;
    paint.save();
    paint.globalCompositeOperation = "lighter";
    paint.lineCap = "round";
    for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
      const ringY = layout.y + layout.radius * (0.31 + ringIndex * 0.072);
      const ringWidth = layout.radius * (1.18 - ringIndex * 0.105);
      const ringHeight = layout.radius * (0.18 - ringIndex * 0.022);
      const tilt = (ringIndex % 2 ? -1 : 1) * 0.055 + Math.sin(time * 0.5 + ringIndex) * 0.025;
      paint.beginPath();
      paint.ellipse(layout.x, ringY, ringWidth, ringHeight, tilt, 0, Math.PI * 2);
      paint.strokeStyle = ringIndex === 0
        ? "rgba(255, 250, 253, 0.84)"
        : `rgba(${state.theme.accentTwoRgb}, ${0.56 - ringIndex * 0.1})`;
      paint.lineWidth = ringIndex === 0 ? 2.1 : 1.1;
      paint.shadowColor = state.theme.accentTwo;
      paint.shadowBlur = ringIndex === 0 ? 14 : 8;
      paint.stroke();
    }
    paint.restore();
  }

  function drawSilkBase(paint, layout, time) {
    const compact = state.width < 720;
    const centerX = layout.x;
    const baseY = layout.y + layout.radius * 0.77;
    const span = layout.radius * (compact ? 1.9 : 2.5);
    const bloom = paint.createRadialGradient(centerX, baseY, 0, centerX, baseY, span);
    bloom.addColorStop(0, "rgba(255, 254, 255, 0.42)");
    bloom.addColorStop(0.16, `rgba(${state.theme.accentTwoRgb}, 0.18)`);
    bloom.addColorStop(0.55, `rgba(${state.theme.accentRgb}, 0.045)`);
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");

    paint.save();
    paint.globalCompositeOperation = "lighter";
    paint.lineCap = "round";
    paint.fillStyle = bloom;
    paint.fillRect(centerX - span, baseY - span * 0.32, span * 2, span * 0.76);

    // Long threads leave the heart tip and open into the luminous floor wave.
    const strandCount = compact ? 34 : 58;
    for (let strand = 0; strand < strandCount; strand += 1) {
      const progress = strand / (strandCount - 1);
      const sideways = progress * 2 - 1;
      const endX = centerX + sideways * span;
      const endY = baseY + Math.abs(sideways) * layout.radius * 0.14 + Math.sin(strand * 1.23 + time * 0.4) * layout.radius * 0.025;
      paint.beginPath();
      paint.moveTo(centerX, baseY - layout.radius * 0.08);
      paint.bezierCurveTo(
        centerX + sideways * layout.radius * 0.12,
        baseY - layout.radius * 0.02,
        centerX + sideways * layout.radius * 0.92,
        endY - layout.radius * 0.18 + Math.sin(time * 0.8 + strand) * layout.radius * 0.025,
        endX,
        endY,
      );
      paint.globalAlpha = 0.14 + (1 - Math.abs(sideways)) * 0.22;
      paint.strokeStyle = strand % 7 === 0
        ? "rgba(255, 255, 255, 0.92)"
        : `rgba(${state.theme.accentTwoRgb}, 0.72)`;
      paint.lineWidth = strand % 7 === 0 ? 1.1 : 0.48;
      paint.shadowColor = `rgba(${state.theme.accentTwoRgb}, 0.55)`;
      paint.shadowBlur = strand % 7 === 0 ? 8 : 2;
      paint.stroke();
    }

    for (let rippleIndex = 0; rippleIndex < 6; rippleIndex += 1) {
      const rippleY = baseY + rippleIndex * layout.radius * 0.032;
      paint.beginPath();
      for (let pointIndex = 0; pointIndex <= 72; pointIndex += 1) {
        const progress = pointIndex / 72;
        const x = centerX + (progress * 2 - 1) * span;
        const y =
          rippleY +
          Math.sin(progress * Math.PI * 4 + time * (0.55 + rippleIndex * 0.04) + rippleIndex) *
            layout.radius *
            (0.018 + rippleIndex * 0.004);
        if (pointIndex === 0) paint.moveTo(x, y);
        else paint.lineTo(x, y);
      }
      paint.globalAlpha = 0.13 + (6 - rippleIndex) * 0.02;
      paint.lineWidth = rippleIndex < 2 ? 0.95 : 0.52;
      paint.strokeStyle = `rgba(${state.theme.accentTwoRgb}, 0.82)`;
      paint.shadowBlur = rippleIndex < 2 ? 6 : 0;
      paint.stroke();
    }

    paint.globalAlpha = 1;
    paint.shadowBlur = 0;
    paint.restore();
  }

  function drawSilkThreads(paint, layout, time) {
    const compact = state.width < 720;
    const lineCount = compact ? 28 : 46;
    const pointCount = compact ? 170 : 260;
    const scale = layout.radius * (1 + heartbeat(time));
    const centerGlow = paint.createRadialGradient(
      layout.x,
      layout.y - layout.radius * 0.08,
      0,
      layout.x,
      layout.y,
      layout.radius * 1.08,
    );
    centerGlow.addColorStop(0, `rgba(${state.theme.accentTwoRgb}, 0.16)`);
    centerGlow.addColorStop(0.46, `rgba(${state.theme.accentRgb}, 0.055)`);
    centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

    paint.save();
    paint.globalCompositeOperation = "lighter";
    paint.fillStyle = centerGlow;
    paint.fillRect(
      layout.x - layout.radius * 1.15,
      layout.y - layout.radius * 1.15,
      layout.radius * 2.3,
      layout.radius * 2.3,
    );
    paint.lineCap = "round";
    paint.lineJoin = "round";

    // Clip fine luminous filaments to the heart so the silhouette reads as
    // thousands of light threads rather than a flat translucent fill.
    paint.save();
    paint.beginPath();
    contourPoints.forEach((source, index) => {
      const projected = projectParticle(source, layout, scale, time);
      if (index === 0) paint.moveTo(projected.x, projected.y);
      else paint.lineTo(projected.x, projected.y);
    });
    paint.closePath();
    paint.clip();

    const filamentCount = compact ? 86 : 142;
    const filamentSteps = compact ? 30 : 46;
    for (let filament = 0; filament < filamentCount; filament += 1) {
      const progress = filament / (filamentCount - 1);
      const baseX = layout.x + (progress - 0.5) * layout.radius * 2.12;
      const accentLine = filament % 9 === 0;
      paint.beginPath();

      for (let step = 0; step <= filamentSteps; step += 1) {
        const vertical = step / filamentSteps;
        const y = layout.y + (vertical - 0.5) * layout.radius * 2.3;
        const wave =
          Math.sin(y * 0.018 + time * 1.08 + filament * 0.17) * layout.radius * 0.012 +
          Math.cos(y * 0.008 - time * 0.72 + filament * 0.09) * layout.radius * 0.007;
        const x = baseX + wave;
        if (step === 0) paint.moveTo(x, y);
        else paint.lineTo(x, y);
      }

      paint.globalAlpha = accentLine ? 0.36 : 0.11;
      paint.lineWidth = accentLine ? 1.05 : 0.46;
      paint.strokeStyle = accentLine
        ? "rgba(255, 253, 255, 0.96)"
        : `rgba(${filament % 2 ? state.theme.accentTwoRgb : state.theme.accentRgb}, 0.82)`;
      paint.shadowColor = `rgba(${state.theme.accentTwoRgb}, 0.7)`;
      paint.shadowBlur = accentLine ? 8 : 2;
      paint.stroke();
    }
    paint.restore();

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const progress = lineIndex / (lineCount - 1);
      const radial = 0.61 + progress * 0.47;
      const phase = lineIndex * 0.43;
      const bright = lineIndex % 7 === 0;
      paint.beginPath();

      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const source = contourPoints[
          Math.floor((pointIndex * contourPoints.length) / pointCount)
        ];
        const angle = (pointIndex / pointCount) * Math.PI * 2;
        const silkWave = 1 + Math.sin(angle * 3 + time * 0.95 + phase) * 0.012;
        const verticalWave =
          Math.sin(angle * 2 - time * 0.72 + phase * 0.45) *
          (0.004 + progress * 0.006);
        const projected = projectParticle(
          {
            x: source.x * silkWave,
            y: source.y * silkWave + verticalWave,
            z: source.z + Math.sin(angle + time * 0.48 + phase) * 0.014,
          },
          layout,
          scale * radial,
          time,
        );

        if (pointIndex === 0) paint.moveTo(projected.x, projected.y);
        else paint.lineTo(projected.x, projected.y);
      }
      paint.closePath();
      paint.globalAlpha = bright ? 0.68 : 0.2 + progress * 0.22;
      paint.lineWidth = bright ? 1.35 : 0.62;
      paint.strokeStyle = bright
        ? "rgba(255, 252, 255, 0.96)"
        : `rgba(${lineIndex % 2 ? state.theme.accentTwoRgb : state.theme.accentRgb}, 0.72)`;
      paint.shadowColor = `rgba(${state.theme.accentTwoRgb}, 0.78)`;
      paint.shadowBlur = bright ? 13 : 5;
      paint.stroke();
    }

    // Fine gold-like highlights travel along the silk in opposite directions.
    for (let strand = 0; strand < 8; strand += 1) {
      const tint = strand % 2 === 0 ? "255, 250, 253" : state.theme.accentTwoRgb;
      paint.beginPath();
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const source = contourPoints[
          Math.floor((pointIndex * contourPoints.length) / pointCount)
        ];
        const angle = (pointIndex / pointCount) * Math.PI * 2;
        const radial = 0.76 + strand * 0.032;
        const projected = projectParticle(
          {
            x: source.x * (1 + Math.sin(angle * 5 - time + strand) * 0.007),
            y: source.y * (1 + Math.cos(angle * 4 + time * 0.74 + strand) * 0.006),
            z: source.z + Math.sin(angle * 2 + time * 0.55 + strand) * 0.02,
          },
          layout,
          scale * radial,
          time,
        );
        if (pointIndex === 0) paint.moveTo(projected.x, projected.y);
        else paint.lineTo(projected.x, projected.y);
      }
      paint.closePath();
      paint.globalAlpha = 0.25 + strand * 0.025;
      paint.lineWidth = 0.62;
      paint.strokeStyle = `rgba(${tint}, 0.9)`;
      paint.setLineDash([2, 17]);
      paint.lineDashOffset = time * (strand % 2 === 0 ? -18 : 18);
      paint.stroke();
    }

    paint.setLineDash([]);
    paint.restore();
  }

  function drawParticleHeart(layout, time) {
    const paint = frontContext;
    const compact = state.width < 720;
    const beat = heartbeat(time);
    const scale = layout.radius * (1 + beat);
    const palette = state.theme.particles;
    const mode = state.formIndex;

    paint.save();
    paint.globalCompositeOperation = "lighter";

    const halo = paint.createRadialGradient(
      layout.x,
      layout.y,
      0,
      layout.x,
      layout.y,
      layout.radius * 1.16,
    );
    halo.addColorStop(0, `rgba(${state.theme.accentRgb}, ${mode === 1 ? 0.05 : 0.1})`);
    halo.addColorStop(0.56, `rgba(${state.theme.accentRgb}, ${mode === 1 ? 0.02 : 0.038})`);
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    paint.fillStyle = halo;
    paint.fillRect(
      layout.x - layout.radius * 1.2,
      layout.y - layout.radius * 1.2,
      layout.radius * 2.4,
      layout.radius * 2.4,
    );

    if (mode === 1) {
      drawSilkBase(paint, layout, time);
      drawSilkThreads(paint, layout, time);
    } else if (mode === 0) {
      drawLacePedestal(paint, layout, time);
    } else if (mode === 2) {
      drawLacePedestal(paint, layout, time);
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      let x;
      let y;
      let z;

      if (mode === 1) {
        const outerShell = particle.layer < 0.76;
        const echo = index % 3 === 0 ? 0.76 : index % 3 === 1 ? 0.58 : 0.92;
        const radial = outerShell
          ? 1 + Math.sin(particle.edgeT * 7 + time * 0.45) * 0.012
          : echo + (particle.layer - 0.5) * 0.025;
        x = particle.edgeX * radial;
        y = particle.edgeY * radial;
        z =
          Math.sin(particle.edgeT * 5 + time * 0.72 + particle.phase * 0.2) * 0.13 +
          (particle.layer - 0.5) * 0.12;
      } else if (mode === 2) {
        const useOutline = particle.layer < 0.58;
        const sourceX = useOutline ? particle.edgeX : particle.x;
        const sourceY = useOutline ? particle.edgeY : particle.y;
        const angle = Math.atan2(sourceY, sourceX);
        const radius = Math.hypot(sourceX, sourceY);
        const breathe = 1 + Math.sin(particle.edgeT * 10 + time * 0.95 + particle.phase) * 0.008;
        const dustWave = Math.sin(radius * 15 - angle * 2.4 + time * 0.85 + particle.phase * 0.1);
        x = sourceX * breathe + Math.cos(angle + Math.PI / 2) * dustWave * 0.006;
        y = sourceY * breathe + Math.sin(angle + Math.PI / 2) * dustWave * 0.006;
        z =
          particle.z * 0.72 +
          Math.sin(angle * 3 + time * 0.72 + particle.phase) * 0.065 +
          (useOutline ? 0.055 : 0);
      } else {
        const useEdge = particle.layer < 0.46;
        const edgeScale = 0.992 + Math.sin(particle.edgeT * 9 + time * 0.5) * 0.018;
        x = useEdge ? particle.edgeX * edgeScale : particle.x;
        y = useEdge ? particle.edgeY * edgeScale : particle.y;
        z =
          particle.z * (0.68 + Math.sin(time * 0.65 + particle.phase) * 0.16) +
          Math.sin(particle.x * 5 + particle.y * 4 + time * 0.75) * 0.035;
      }

      const projected = projectVolumePoint(x, y, z, layout, scale);
      const depth = Math.max(0.35, Math.min(1, 0.7 + projected.z * 0.58));
      const twinkle = 0.58 + Math.sin(time * 2.4 + particle.phase) * 0.32;
      const alpha = Math.min(
        0.98,
        particle.alpha *
          (0.72 + twinkle * 0.5) *
          (0.74 + depth * 0.26) *
          (mode === 0 && particle.layer >= 0.46 ? 0.46 : 1),
      );
      const formScale = mode === 1 ? 0.86 : mode === 2 ? 1.04 : 1;
      const interiorScale = mode === 0 && particle.layer >= 0.46 ? 0.74 : 1;
      const size =
        particle.size *
        (compact ? 0.82 : 1.04) *
        (0.76 + depth * 0.38) *
        formScale *
        interiorScale;
      const color = palette[particle.colorIndex];

      if ((particle.isEdge || mode === 1) && index % 13 === 0) {
        paint.beginPath();
        paint.arc(projected.x, projected.y, size * 4.8, 0, Math.PI * 2);
        paint.fillStyle = `rgba(${state.theme.accentRgb}, ${alpha * 0.07})`;
        paint.fill();
      }

      paint.globalAlpha = alpha;
      paint.fillStyle = color;
      paint.fillRect(projected.x - size * 0.5, projected.y - size * 0.5, size, size);
    }

    if (mode === 0) {
      drawJellyRings(paint, layout, time);
    }

    // Scattered bright grains catch the light and keep the volume readable.
    paint.globalAlpha = 1;
    for (let index = 0; index < particles.length; index += 37) {
      const particle = particles[index];
      const sourceX = mode === 1 ? particle.edgeX : particle.x;
      const sourceY = mode === 1 ? particle.edgeY : particle.y;
      const point = projectVolumePoint(sourceX, sourceY, 0.18 + particle.depth * 0.16, layout, scale);
      paint.beginPath();
      paint.arc(point.x, point.y, 0.5 + particle.size * 0.52, 0, Math.PI * 2);
      paint.fillStyle = state.theme.particles[(index + 1) % 3];
      paint.globalAlpha = 0.48 + Math.sin(time * 2 + particle.phase) * 0.24;
      paint.fill();
    }

    paint.restore();
  }

  function drawHeart(layout, time) {
    const { x: centerX, y: centerY, radius } = layout;
    const beat = heartbeat(time);
    const scale = radius * (1 + beat);
    const palette = state.theme.particles;

    const bodyPath = () => {
      context.beginPath();
      contourPoints.forEach((particle, index) => {
        const projected = projectParticle(particle, layout, scale, time);
        if (index === 0) context.moveTo(projected.x, projected.y);
        else context.lineTo(projected.x, projected.y);
      });
      context.closePath();
    };

    // A translucent solid body gives the heart volume; particles and filigree
    // then float over it instead of reading as an empty outline.
    context.save();
    context.globalCompositeOperation = "source-over";
    const bodyGradient = context.createLinearGradient(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius,
    );
    bodyGradient.addColorStop(0, "#220710");
    bodyGradient.addColorStop(0.3, state.theme.accent);
    bodyGradient.addColorStop(0.62, state.theme.bodyMid);
    bodyGradient.addColorStop(1, "#15040d");
    bodyPath();
    context.shadowColor = state.theme.accent;
    context.shadowBlur = 32 + beat * 100;
    context.globalAlpha = 0.88;
    context.fillStyle = bodyGradient;
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 1;

    context.save();
    bodyPath();
    context.clip();
    const innerLight = context.createRadialGradient(
      centerX - radius * 0.28,
      centerY - radius * 0.34,
      0,
      centerX,
      centerY,
      radius * 0.9,
    );
    innerLight.addColorStop(0, `rgba(${state.theme.accentTwoRgb}, 0.42)`);
    innerLight.addColorStop(0.25, `rgba(${state.theme.accentRgb}, 0.18)`);
    innerLight.addColorStop(0.72, "rgba(12, 2, 8, 0.08)");
    innerLight.addColorStop(1, "rgba(4, 1, 4, 0.42)");
    context.fillStyle = innerLight;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

    const sweep = context.createLinearGradient(
      centerX - radius,
      centerY + radius * 0.5,
      centerX + radius,
      centerY - radius,
    );
    sweep.addColorStop(0, "rgba(255, 255, 255, 0)");
    sweep.addColorStop(0.48, "rgba(255, 255, 255, 0.1)");
    sweep.addColorStop(0.56, "rgba(255, 255, 255, 0.025)");
    sweep.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = sweep;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

    context.lineCap = "round";
    for (let index = 0; index < 3; index += 1) {
      const drift = Math.sin(time * 0.42 + index * 1.7) * radius * 0.025;
      context.beginPath();
      context.moveTo(centerX - radius * 0.62, centerY + radius * (0.12 + index * 0.1) + drift);
      context.bezierCurveTo(
        centerX - radius * 0.2,
        centerY - radius * (0.23 - index * 0.04),
        centerX + radius * 0.22,
        centerY + radius * (0.27 - index * 0.035),
        centerX + radius * 0.64,
        centerY - radius * (0.08 + index * 0.055) + drift,
      );
      context.setLineDash([1.5, 12 - index * 2]);
      context.lineDashOffset = -time * (5 + index * 2);
      context.strokeStyle = `rgba(${state.theme.accentTwoRgb}, ${0.11 + index * 0.035})`;
      context.lineWidth = 0.65;
      context.stroke();
    }
    context.setLineDash([]);
    context.restore();
    context.restore();

    context.save();
    context.globalCompositeOperation = "lighter";

    const outlineGradient = context.createLinearGradient(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius,
    );
    outlineGradient.addColorStop(0, state.theme.accentTwo);
    outlineGradient.addColorStop(0.48, state.theme.particles[0]);
    outlineGradient.addColorStop(1, state.theme.accent);

    const drawOutline = (scaleFactor, lineWidth, alpha, dash = []) => {
      context.beginPath();
      contourPoints.forEach((particle, index) => {
        const pulseWave = Math.sin(time * 1.8 + particle.phase) * 0.004;
        const projected = projectParticle(particle, layout, scale * scaleFactor, time, pulseWave);
        if (index === 0) context.moveTo(projected.x, projected.y);
        else context.lineTo(projected.x, projected.y);
      });
      context.closePath();
      context.setLineDash(dash);
      context.globalAlpha = alpha;
      context.lineWidth = lineWidth;
      context.strokeStyle = outlineGradient;
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha = 1;
    };

    // 三层有序心形轮廓提供清晰结构，外围虚线与粒子共同形成辉光。
    drawOutline(1.045, 6.5, 0.055);
    drawOutline(1.016, 1.1, 0.2, [1, 8]);
    drawOutline(1, 0.85, 0.72);
    drawOutline(0.955, 0.55, 0.14, [2, 5]);

    const globalPulse = Math.max(0, 1 - (time - state.pulseStartedAt) / 2.4);
    for (const particle of particles) {
      const breathe = Math.sin(time * particle.speed + particle.phase) * 0.008;
      const wave = Math.sin(particle.y * 8.4 + time * 1.55 + particle.phase) * 0.0045;
      const pulsePush = particle.isEdge ? globalPulse * 0.065 : globalPulse * 0.024;
      const projected = projectParticle(particle, layout, scale, time, breathe + wave + pulsePush);
      let px = projected.x;
      let py = projected.y;

      // 指针经过时粒子轻微避让，像呼吸时被触碰的光。
      const dx = px - state.pointerX;
      const dy = py - state.pointerY;
      const pointerDistanceSquared = dx * dx + dy * dy;
      const influenceRadius = state.width < 720 ? 56 : 86;
      if (pointerDistanceSquared < influenceRadius * influenceRadius) {
        const distance = Math.max(1, Math.sqrt(pointerDistanceSquared));
        const force = (1 - distance / influenceRadius) * (state.width < 720 ? 8 : 14);
        px += (dx / distance) * force;
        py += (dy / distance) * force;
      }

      const twinkle = 0.62 + Math.sin(time * 2.2 + particle.phase) * 0.25;
      const depthLight = Math.max(0.58, Math.min(1, 0.82 + projected.depth * 0.72));
      const alpha = particle.alpha * twinkle * depthLight;
      const color = palette[particle.colorIndex];
      context.globalAlpha = 1;

      if (particle.isEdge && particle.depth > 0.62) {
        context.beginPath();
        context.arc(px, py, particle.size * 3.8, 0, Math.PI * 2);
        context.fillStyle = `rgba(${state.theme.accentRgb}, ${alpha * 0.055})`;
        context.fill();
      }

      context.beginPath();
      context.arc(px, py, particle.size, 0, Math.PI * 2);
      context.fillStyle = color;
      context.globalAlpha = alpha;
      context.fill();
    }

    // 核心光晕随心跳明暗变化，使画面不依赖外部图片也有层次。
    const core = context.createRadialGradient(
      centerX - scale * 0.05,
      centerY - scale * 0.06,
      0,
      centerX,
      centerY,
      scale * 0.9,
    );
    core.addColorStop(0, `rgba(${state.theme.accentRgb}, ${0.09 + beat})`);
    core.addColorStop(0.46, `rgba(${state.theme.accentRgb}, 0.025)`);
    core.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.globalAlpha = 1;
    context.fillStyle = core;
    context.fillRect(centerX - scale, centerY - scale, scale * 2, scale * 2);
    context.restore();
  }

  function drawInteraction(layout, time) {
    const { x: centerX, y: centerY, radius } = layout;
    const paint = frontContext;

    paint.save();
    paint.globalCompositeOperation = "lighter";
    ripples = ripples.filter((ripple) => time - ripple.createdAt < 2.4);
    for (const ripple of ripples) {
      const age = (time - ripple.createdAt) / 2.4;
      const ringRadius = radius * (0.35 + age * 1.1);
      paint.beginPath();
      paint.ellipse(centerX, centerY, ringRadius, ringRadius * 0.82, 0, 0, Math.PI * 2);
      paint.strokeStyle = `rgba(${state.theme.accentRgb}, ${(1 - age) * 0.34})`;
      paint.lineWidth = 1.2;
      paint.stroke();
    }

    sparks = sparks.filter((spark) => time - spark.createdAt < spark.life);
    for (const spark of sparks) {
      const age = (time - spark.createdAt) / spark.life;
      const distance = spark.speed * (1 - (1 - age) ** 2);
      const x = spark.originX + Math.cos(spark.angle) * distance;
      const y = spark.originY + Math.sin(spark.angle) * distance + age * age * 9;
      paint.beginPath();
      paint.arc(x, y, spark.size * (1 - age), 0, Math.PI * 2);
      paint.fillStyle = `rgba(${state.theme.accentTwoRgb}, ${(1 - age) * 0.8})`;
      paint.fill();
    }
    paint.restore();
  }

  function animate(now) {
    const delta = Math.min(0.05, (now - state.lastFrame) / 1000 || 0);
    state.time += reduceMotion ? delta * 0.28 : delta;
    if (state.autoRotate) {
      // The silhouette swings through a wide 3D arc while retaining a minimum
      // readable width, so every form visibly gains depth and perspective.
      state.rotation = Math.sin(state.time * (reduceMotion ? 0.2 : 0.58)) * 0.5;
    }
    state.lastFrame = now;

    const layout = getHeartLayout();
    context.clearRect(0, 0, state.width, state.height);
    frontContext.clearRect(0, 0, state.width, state.height);
    drawBackdrop(layout, state.time);
    drawOrbitSystem(layout, state.time, false);
    drawParticleHeart(layout, state.time);
    drawOrbitSystem(layout, state.time, true);
    drawInteraction(layout, state.time);
    requestAnimationFrame(animate);
  }

  function emitSparks(originX, originY, amount = 42) {
    const now = state.time;
    for (let index = 0; index < amount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      sparks.push({
        originX,
        originY,
        angle,
        speed: 40 + Math.random() * 150,
        size: 0.7 + Math.random() * 1.8,
        life: 1.2 + Math.random() * 1.2,
        createdAt: now,
      });
    }
  }

  function triggerHeartbeat(origin) {
    const layout = getHeartLayout();
    const center = origin || {
      x: layout.x,
      y: layout.y,
    };

    state.pulseStartedAt = state.time;
    ripples.push({ createdAt: state.time });
    emitSparks(center.x, center.y);
    showToast(FORMS[state.formIndex].note);

    if (state.soundOn) {
      audioEngine.playHeartbeat(state.themeIndex);
    }
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function setPalette(index) {
    const nextIndex = (index + PALETTES.length) % PALETTES.length;
    state.themeIndex = nextIndex;
    state.theme = PALETTES[nextIndex];
    const root = document.documentElement;
    root.style.setProperty("--accent", state.theme.accent);
    root.style.setProperty("--accent-2", state.theme.accentTwo);
    root.style.setProperty("--accent-rgb", state.theme.accentRgb);
    root.style.setProperty("--accent-2-rgb", state.theme.accentTwoRgb);
    root.style.setProperty("--glow", state.theme.glow);

    titleWrap.classList.remove("changing");
    void titleWrap.offsetWidth;
    titleWrap.classList.add("changing");

    if (state.soundOn) audioEngine.playTheme(nextIndex % 3);
  }

  function setForm(index) {
    const nextIndex = (index + FORMS.length) % FORMS.length;
    if (nextIndex === state.formIndex && document.documentElement.dataset.ready === "true") {
      triggerHeartbeat();
      return;
    }

    state.formIndex = nextIndex;
    const form = FORMS[nextIndex];
    chapterLabel.textContent = form.chapter;
    leadText.textContent = form.lead;
    titleLineOne.textContent = "心迹";
    titleLineTwo.textContent = "";
    state.pulseStartedAt = state.time;
    titleWrap.classList.remove("changing");
    void titleWrap.offsetWidth;
    titleWrap.classList.add("changing");
  }

  class HeartAudio {
    constructor() {
      this.audioContext = null;
      this.master = null;
    }

    ensureStarted() {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.audioContext = new AudioContextClass();
        this.master = this.audioContext.createGain();
        this.master.gain.value = 0.32;
        this.master.connect(this.audioContext.destination);
      }
      if (this.audioContext.state === "suspended") this.audioContext.resume();
      return true;
    }

    note(frequency, startOffset, duration = 1.7, volume = 0.12, type = "sine") {
      if (!this.ensureStarted()) return;
      const now = this.audioContext.currentTime + startOffset;
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3200, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
    }

    playTheme(index) {
      const scales = [
        [523.25, 659.25, 783.99, 1046.5],
        [493.88, 587.33, 739.99, 987.77],
        [440, 554.37, 659.25, 880],
      ];
      scales[index % scales.length].forEach((frequency, noteIndex) => {
        this.note(frequency, noteIndex * 0.11, 1.9, 0.075);
        this.note(frequency / 2, noteIndex * 0.11, 2.2, 0.025, "triangle");
      });
    }

    playHeartbeat(index) {
      const roots = [261.63, 246.94, 220];
      const root = roots[index % roots.length];
      this.note(root, 0, 2.3, 0.1);
      this.note(root * 1.5, 0.09, 1.8, 0.055);
      this.note(root * 2, 0.22, 1.4, 0.035);
    }
  }

  const audioEngine = new HeartAudio();

  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
  ];

  const GESTURES = {
    point: { name: "指尖循环换色", symbol: "☝", action: "color" },
    fist: { name: "星环浮光心", symbol: "✊", action: "form", form: 0 },
    peace: { name: "流光丝线心", symbol: "✌", action: "form", form: 1 },
    open: { name: "粉雾粒子心", symbol: "✋", action: "form", form: 2 },
  };

  function distance2D(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function classifyGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return "";
    const wrist = landmarks[0];
    const palmCenter = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
      y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
      z: (landmarks[0].z + landmarks[5].z + landmarks[17].z) / 3,
    };

    const fingersExtended = [
      distance2D(landmarks[4], palmCenter) > distance2D(landmarks[3], palmCenter) * 1.16,
      distance2D(landmarks[8], wrist) > distance2D(landmarks[6], wrist) * 1.13,
      distance2D(landmarks[12], wrist) > distance2D(landmarks[10], wrist) * 1.13,
      distance2D(landmarks[16], wrist) > distance2D(landmarks[14], wrist) * 1.13,
      distance2D(landmarks[20], wrist) > distance2D(landmarks[18], wrist) * 1.13,
    ];
    const extendedCount = fingersExtended.filter(Boolean).length;

    if (extendedCount >= 4) return "open";
    if (fingersExtended[1] && fingersExtended[2] && !fingersExtended[3] && !fingersExtended[4]) {
      return "peace";
    }
    if (fingersExtended[1] && !fingersExtended[2] && !fingersExtended[3] && !fingersExtended[4]) {
      return "point";
    }
    if (extendedCount <= 1) return "fist";
    return "";
  }

  function drawHandLandmarks(landmarks) {
    const width = handOverlay.width;
    const height = handOverlay.height;
    handContext.clearRect(0, 0, width, height);
    if (!landmarks) return;

    handContext.save();
    handContext.lineCap = "round";
    handContext.lineJoin = "round";
    handContext.strokeStyle = state.theme.accentTwo;
    handContext.lineWidth = Math.max(2, width / 180);
    for (const [from, to] of HAND_CONNECTIONS) {
      handContext.beginPath();
      handContext.moveTo(landmarks[from].x * width, landmarks[from].y * height);
      handContext.lineTo(landmarks[to].x * width, landmarks[to].y * height);
      handContext.stroke();
    }

    for (const point of landmarks) {
      handContext.beginPath();
      handContext.arc(point.x * width, point.y * height, Math.max(2.2, width / 150), 0, Math.PI * 2);
      handContext.fillStyle = state.theme.particles[0];
      handContext.fill();
    }
    handContext.restore();
  }

  function applyStableGesture(gesture, now) {
    const definition = GESTURES[gesture];
    if (!definition) return;

    const isColorCycle = definition.action === "color";
    const elapsed = now - state.lastGestureAt;
    if (gesture === state.lastGesture) {
      if (!isColorCycle || elapsed < 1700) return;
    } else if (elapsed < 620) {
      return;
    }

    state.lastGesture = gesture;
    state.lastGestureAt = now;
    if (isColorCycle) {
      setPalette(state.themeIndex + 1);
    } else {
      setForm(definition.form);
    }
    showToast(
      isColorCycle
        ? `${definition.symbol} ${state.theme.name} · 继续停留可循环换色`
        : `${definition.symbol} ${definition.name}`,
    );
  }

  function updateGesture(gesture, now) {
    if (!gesture) {
      state.candidateGesture = "";
      state.candidateSince = 0;
      state.lastGesture = "";
      gestureName.textContent = "未检测到手势";
      gestureSymbol.textContent = "○";
      gestureLock.textContent = "SCAN";
      gestureLock.classList.remove("locked");
      return;
    }

    if (gesture !== state.candidateGesture) {
      state.candidateGesture = gesture;
      state.candidateSince = now;
    }

    const definition = GESTURES[gesture];
    const holdTime = now - state.candidateSince;
    gestureName.textContent = definition.name;
    gestureSymbol.textContent = definition.symbol;

    if (holdTime >= 750) {
      gestureLock.textContent = "LOCKED";
      gestureLock.classList.add("locked");
      applyStableGesture(gesture, now);
    } else {
      gestureLock.textContent = `${Math.round(Math.min(100, (holdTime / 750) * 100))}%`;
      gestureLock.classList.remove("locked");
    }
  }

  function loadHandLandmarker() {
    if (state.handLandmarker) return Promise.resolve(state.handLandmarker);
    if (state.visionLoadPromise) return state.visionLoadPromise;

    state.visionLoadPromise = (async () => {
      try {
        const moduleUrl = new URL("./vendor/mediapipe/vision_bundle.mjs", window.location.href).href;
        const wasmPath = new URL("./vendor/mediapipe/wasm/", window.location.href).href;
        const modelPath = new URL("./vendor/mediapipe/hand_landmarker.task", window.location.href).href;
        const vision = await import(moduleUrl);
        const fileset = await vision.FilesetResolver.forVisionTasks(wasmPath);
        const options = {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        };

        try {
          state.handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, options);
        } catch {
          options.baseOptions.delegate = "CPU";
          state.handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, options);
        }
        return state.handLandmarker;
      } catch (error) {
        // A failed model load must be retryable instead of caching a rejected promise.
        state.visionLoadPromise = null;
        state.handLandmarker = null;
        throw error;
      }
    })();

    return state.visionLoadPromise;
  }

  function cameraLoop() {
    if (!state.cameraRunning) return;
    state.cameraFrame = requestAnimationFrame(cameraLoop);

    if (handVideo.readyState < 2 || handVideo.currentTime === state.lastVideoTime) return;
    state.lastVideoTime = handVideo.currentTime;

    if (handOverlay.width !== handVideo.videoWidth || handOverlay.height !== handVideo.videoHeight) {
      handOverlay.width = handVideo.videoWidth;
      handOverlay.height = handVideo.videoHeight;
    }

    try {
      const results = state.handLandmarker.detectForVideo(handVideo, performance.now());
      const landmarks = results.landmarks?.[0];
      drawHandLandmarks(landmarks);
      updateGesture(classifyGesture(landmarks), performance.now());
    } catch (error) {
      gestureName.textContent = "识别暂停";
      gestureSymbol.textContent = "!";
      gestureLock.textContent = "RETRY";
      gestureLock.classList.remove("locked");
      console.warn("Hand tracking frame failed:", error);
    }
  }

  async function requestCameraStream() {
    const attempts = [
      {
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      },
      { audio: false, video: true },
    ];
    let lastError = null;

    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
        if (["NotAllowedError", "PermissionDeniedError", "NotFoundError", "NotReadableError"].includes(error?.name)) {
          throw error;
        }
      }
    }
    throw lastError || new Error("无法打开摄像头");
  }

  async function startCamera() {
    if (state.cameraRunning) return;
    const requestId = ++state.cameraRequestId;
    let startStage = "camera";
    cameraConsole.hidden = false;
    cameraConsole.classList.remove("is-error", "is-live");
    cameraLoadingText.textContent = "正在请求摄像头权限";
    cameraRetry.hidden = true;
    cameraToggle.setAttribute("aria-pressed", "true");
    cameraLabel.textContent = "关闭识别";

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("当前浏览器不支持摄像头访问");
      }

      state.cameraStream = await requestCameraStream();
      if (requestId !== state.cameraRequestId) {
        state.cameraStream.getTracks().forEach((track) => track.stop());
        return;
      }
      handVideo.srcObject = state.cameraStream;
      await handVideo.play();
      startStage = "model";
      cameraLoadingText.textContent = "摄像头已连接，正在加载本地手势模型";
      await loadHandLandmarker();
      if (requestId !== state.cameraRequestId) return;

      state.cameraRunning = true;
      cameraConsole.classList.add("is-live");
      cameraRetry.hidden = true;
      gestureName.textContent = "等待手势";
      gestureSymbol.textContent = "○";
      cameraLoop();
    } catch (error) {
      if (requestId !== state.cameraRequestId) return;
      state.cameraStream?.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
      handVideo.srcObject = null;
      cameraConsole.classList.add("is-error");
      cameraLoading.hidden = false;
      cameraRetry.hidden = false;
      const cameraErrors = {
        NotAllowedError: "摄像头权限被拒绝，请允许后重试",
        PermissionDeniedError: "摄像头权限被拒绝，请允许后重试",
        NotFoundError: "没有检测到可用摄像头",
        NotReadableError: "摄像头正被其他程序占用",
        SecurityError: "请双击“启动作品.bat”后使用摄像头",
      };
      cameraLoadingText.textContent =
        window.location.protocol === "file:"
          ? "请双击“启动作品.bat”后使用摄像头"
          : cameraErrors[error?.name] ||
            (startStage === "model"
              ? "摄像头已连接，但手势模型加载失败。请使用最新版 Edge 或 Chrome 后重试"
              : "摄像头启动失败，请检查权限或关闭占用摄像头的程序后重试");
      gestureName.textContent = "无法启动识别";
      gestureSymbol.textContent = "!";
      gestureLock.textContent = "ERROR";
      cameraToggle.setAttribute("aria-pressed", "false");
      cameraLabel.textContent = "手势识别";
      console.error("Camera gesture recognition unavailable:", error);
    }
  }

  function stopCamera() {
    state.cameraRequestId += 1;
    state.cameraRunning = false;
    cancelAnimationFrame(state.cameraFrame);
    state.cameraStream?.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
    handVideo.srcObject = null;
    handContext.clearRect(0, 0, handOverlay.width, handOverlay.height);
    cameraConsole.hidden = true;
    cameraToggle.setAttribute("aria-pressed", "false");
    cameraLabel.textContent = "手势识别";
    state.candidateGesture = "";
  }

  function toggleCamera() {
    if (state.cameraRunning || (!cameraConsole.hidden && state.cameraStream)) {
      stopCamera();
    } else {
      startCamera();
    }
  }

  function setAutoRotate(enabled) {
    state.autoRotate = enabled;
  }

  soundToggle.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    soundToggle.setAttribute("aria-pressed", String(state.soundOn));
    soundToggle.setAttribute("aria-label", state.soundOn ? "关闭声音" : "开启声音");
    soundLabel.textContent = state.soundOn ? "声音 · 开" : "声音 · 关";
    if (state.soundOn) {
      audioEngine.playTheme(state.themeIndex % 3);
      showToast("声景已开启，轻触爱心试试看。");
    } else {
      showToast("声音已关闭，心动仍在继续。");
    }
  });

  pulseButton.addEventListener("click", () => triggerHeartbeat());
  cameraToggle.addEventListener("click", toggleCamera);
  cameraClose.addEventListener("click", stopCamera);
  cameraRetry.addEventListener("click", startCamera);

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = event.clientX - rect.left;
    state.pointerY = event.clientY - rect.top;
  });

  canvas.addEventListener("pointerleave", () => {
    state.pointerX = -9999;
    state.pointerY = -9999;
  });

  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const layout = getHeartLayout();
    const normalizedX = (x - layout.x) / (layout.radius * 1.05);
    const normalizedY = (y - layout.y) / (layout.radius * 0.92);
    if (normalizedX * normalizedX + normalizedY * normalizedY < 1.4) {
      triggerHeartbeat({
        x,
        y,
      });
    } else {
      emitSparks(x, y, 14);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && document.activeElement?.tagName !== "BUTTON") {
      event.preventDefault();
      triggerHeartbeat();
    }
    if (event.key.toLowerCase() === "m") {
      soundToggle.click();
    }
    if (event.key.toLowerCase() === "c") {
      toggleCamera();
    }
    if (event.key === "Escape" && !cameraConsole.hidden) {
      stopCamera();
    }
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("pointermove", (event) => {
    // 粒子避让只在画布范围内生效。
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      state.pointerX = -9999;
      state.pointerY = -9999;
    }
  });

  // 心跳数字随粒子节拍轻微变化，不声称是真实医疗测量。
  window.setInterval(() => {
    const bpm = 70 + Math.round(Math.sin(state.time * 1.08) * 2);
    statusText.textContent = `${FORMS[state.formIndex].name} · ${bpm} BPM`;
  }, 900);

  const requestedTheme = Number(urlParameters.get("theme"));
  const initialTheme = Number.isInteger(requestedTheme) && requestedTheme >= 0 && requestedTheme < PALETTES.length
    ? requestedTheme
    : 0;
  const requestedForm = Number(urlParameters.get("form"));
  const initialForm = Number.isInteger(requestedForm) && requestedForm >= 0 && requestedForm < FORMS.length
    ? requestedForm
    : 0;

  volumeRenderer = null;
  volumeCanvas.style.display = "none";
  resizeCanvas();
  setPalette(initialTheme);
  setForm(initialForm);
  if (urlParameters.get("rotate") === "0") setAutoRotate(false);
  document.documentElement.dataset.ready = "true";
  requestAnimationFrame(animate);
  if (urlParameters.has("burst")) {
    window.setTimeout(() => triggerHeartbeat(), 120);
  }
  if (!stillMode && urlParameters.get("camera") !== "0") {
    window.setTimeout(startCamera, 900);
  }
  if (urlParameters.has("debug")) {
    window.__codeHeardDebug = {
      classifyGesture,
      setForm,
      setPalette,
      setAutoRotate,
      state,
    };
  }
})();
