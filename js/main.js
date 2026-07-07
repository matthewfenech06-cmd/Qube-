/* ==========================================================================
   QUBE NIGHTCLUB — v2 JS
   All editable contact details live in CONFIG below.
   3D globe uses Three.js (loaded via CDN in each page's <head>).
   ========================================================================== */

const CONFIG = {
  WHATSAPP_NUMBER: "35699121802", // Cameron — international format, no + or spaces
  EMAIL: "info@trinvestmalta.com",
  PHONE_ERIC: "+356 9982 5320",
  PHONE_CAMERON: "+356 9912 1802",
  INSTAGRAM_URL: "https://instagram.com/qubemalta",
  OPENING_DATE: "2026-09-01T22:00:00+02:00", // TODO: confirm exact opening night date/time with client
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Lite mode for phones: smaller particle budgets, native (1x) render resolution,
// fewer effects per frame — same design, tuned to mobile GPU limits.
const LITE = window.matchMedia("(max-width: 820px)").matches;

// Mark that JS is running. Reveal elements only start hidden when this class is
// present, so if JS ever fails the content stays visible (never a black screen).
document.documentElement.classList.add("js");

/* ------------------------------ whatsapp -------------------------------- */
function waLink(message) {
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
function openWhatsApp(message) {
  window.open(waLink(message), "_blank", "noopener");
}
function bindWa(selector, message) {
  document.querySelectorAll(selector).forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openWhatsApp(message);
    })
  );
}
bindWa("[data-wa-quick]", "Hi QUBE! I'd like some info.");
bindWa("[data-wa-reserve]", "Hi QUBE! I'd like to reserve a table.");

/* ------------------------- full-screen 3D galaxy ------------------------- */
/* Custom-shader spiral galaxy: differential rotation (arms swirl), per-star
   twinkle, a glowing core, layered starfield and shooting stars. The cursor
   drags a "gravity vortex" through the disc that swirls + lifts nearby stars. */
function galaxy() {
  const canvas = document.getElementById("galaxy");
  if (!canvas || !window.THREE || reduceMotion) return;
  const THREE = window.THREE;

  // Size from the canvas's CSS box (100vw/100vh), with a viewport fallback so
  // init never latches a 0×0 buffer if it runs before first layout.
  const sizeOf = () => [canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight];
  let [W, H] = sizeOf();
  const DPR = LITE ? 1 : Math.min(window.devicePixelRatio || 1, 2); // native res on phones
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 100);
  camera.position.set(0, 2.6, 6.6);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // no WebGL — CSS glow stays as fallback
  }
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, false); // false: don't overwrite the CSS 100vw/vh box

  // soft round sprite for stars / core / meteors
  const sprite = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(255,255,255,.85)");
    g.addColorStop(0.5, "rgba(255,255,255,.25)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const group = new THREE.Group();
  group.rotation.x = 0.22;
  scene.add(group);

  // ---- spiral galaxy (shader points) ----
  const COUNT = LITE ? 4500 : 14000, RADIUS = 6.2, BRANCHES = 5, SPIN = 1.0, RAND = 0.5, POW = 2.6;
  const cInside = new THREE.Color("#DEC9F7");
  const cMid = new THREE.Color("#8B5FD0");
  const cOutside = new THREE.Color("#241046");
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const scl = new Float32Array(COUNT);
  const rnd = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 1.6) * RADIUS;
    const branch = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
    const rx = Math.pow(Math.random(), POW) * (Math.random() < 0.5 ? 1 : -1) * RAND * (r * 0.5 + 0.4);
    const ry = Math.pow(Math.random(), POW) * (Math.random() < 0.5 ? 1 : -1) * RAND * (r * 0.5 + 0.4) * 0.32;
    const rz = Math.pow(Math.random(), POW) * (Math.random() < 0.5 ? 1 : -1) * RAND * (r * 0.5 + 0.4);
    pos[i3] = Math.cos(branch) * r + rx;
    pos[i3 + 1] = ry;
    pos[i3 + 2] = Math.sin(branch) * r + rz;
    const t = Math.min(1, r / RADIUS);
    const c = (t < 0.5 ? cInside.clone().lerp(cMid, t / 0.5) : cMid.clone().lerp(cOutside, (t - 0.5) / 0.5));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    scl[i] = 0.5 + Math.random() * 1.6;
    rnd[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(scl, 1));
  geo.setAttribute("aRandom", new THREE.BufferAttribute(rnd, 1));

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: 26 * DPR },
    uMouse: { value: new THREE.Vector2(999, 999) },
    uStrength: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime; uniform float uSize; uniform vec2 uMouse; uniform float uStrength;
      attribute vec3 aColor; attribute float aScale; attribute float aRandom;
      varying vec3 vColor; varying float vTw;
      void main() {
        vec3 p = position;
        float dist = length(p.xz);
        float angle = atan(p.z, p.x);
        angle += uTime * (0.18 / (dist * 0.5 + 0.35)); // differential rotation, inner faster
        p.x = cos(angle) * dist;
        p.z = sin(angle) * dist;
        // cursor gravity vortex: swirl + lift stars near the pointer
        vec2 toM = p.xz - uMouse;
        float md = length(toM);
        float infl = uStrength * exp(-md * md * 0.5);
        float a = infl * 4.0;
        mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
        p.xz = uMouse + rot * toM + normalize(toM + 0.0001) * infl * 0.6;
        p.y += infl * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float sz = uSize * aScale * (1.0 / -mv.z);
        gl_PointSize = clamp(sz, 1.0, 26.0 * ${DPR.toFixed(1)});
        vColor = aColor;
        vTw = 0.55 + 0.45 * sin(uTime * 2.2 + aRandom * 6.283);
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vTw;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        float alpha = smoothstep(0.5, 0.0, d);
        alpha = pow(alpha, 1.6);
        gl_FragColor = vec4(vColor * vTw, alpha);
      }`,
  });
  const spiral = new THREE.Points(geo, mat);
  group.add(spiral);

  // ---- glowing core ----
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0x9a6fd4, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(3.2, 3.2, 1);
  group.add(core);

  // ---- layered deep starfield (near bright + far faint) ----
  function starLayer(n, near, far, size, color, opacity) {
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const i3 = i * 3, rr = near + Math.random() * (far - near);
      const t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      sp[i3] = rr * Math.sin(p) * Math.cos(t);
      sp[i3 + 1] = rr * Math.sin(p) * Math.sin(t);
      sp[i3 + 2] = rr * Math.cos(p);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size, map: sprite, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  }
  const starsFar = starLayer(LITE ? 1100 : 3200, 16, 40, 0.08, 0x9a86d0, 0.6);
  const starsNear = starLayer(LITE ? 500 : 1400, 9, 16, 0.14, 0xffffff, 0.9);
  scene.add(starsFar); scene.add(starsNear);

  // ---- shooting stars ----
  const meteors = [];
  for (let i = 0; i < (LITE ? 1 : 2); i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const colr = new Float32Array([1, 1, 1, 0.6, 0.5, 1]);
    g.setAttribute("color", new THREE.BufferAttribute(colr, 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(line);
    meteors.push({ line, active: false, delay: 2 + Math.random() * 6, t: 0, from: new THREE.Vector3(), dir: new THREE.Vector3() });
  }
  function fireMeteor(m) {
    m.from.set((Math.random() - 0.5) * 24, 4 + Math.random() * 6, -6 - Math.random() * 8);
    m.dir.set(-1 - Math.random(), -0.5 - Math.random() * 0.5, 0).normalize().multiplyScalar(0.9);
    m.active = true; m.t = 0;
  }

  // ---- cursor interaction ----
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const mTarget = new THREE.Vector2(0, 0);
  let px = 0, py = 0, boost = 0;
  const onMove = (cx, cy) => {
    px = cx / window.innerWidth - 0.5;
    py = cy / window.innerHeight - 0.5;
    ndc.set(px * 2, -py * 2);
    raycaster.setFromCamera(ndc, camera);
    // intersect the tilted galaxy plane (group is rotated on X)
    plane.normal.set(0, 1, 0).applyEuler(group.rotation);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      const local = hit.clone().applyEuler(new THREE.Euler(-group.rotation.x, 0, 0));
      mTarget.set(local.x, local.z);
      boost = 1;
    }
  };
  window.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY));
  window.addEventListener("touchmove", (e) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  const clock = new THREE.Clock();
  let cx2 = 0, cy2 = 0, scrollEase = 0, raf = null;
  function render() {
    // keep the drawing buffer matched to the CSS box every frame (self-heals
    // a 0-size init if the page rendered before the viewport had a size)
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw && ch && (cw !== W || ch !== H)) {
      W = cw; H = ch;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    // ease vortex position + strength (decays when the pointer is still)
    uniforms.uMouse.value.x += (mTarget.x - uniforms.uMouse.value.x) * 0.12;
    uniforms.uMouse.value.y += (mTarget.y - uniforms.uMouse.value.y) * 0.12;
    boost *= 0.94;
    uniforms.uStrength.value += (0.55 + boost * 0.9 - uniforms.uStrength.value) * 0.08;
    core.material.opacity = 0.5 + Math.sin(t * 1.3) * 0.08;
    starsFar.rotation.y = t * 0.01;
    starsNear.rotation.y = -t * 0.014;
    spiral.rotation.y = t * 0.03;
    // scroll = flight: the camera orbits around the galaxy as you travel down
    // the page, rising slowly, so every scroll moves the whole universe.
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollEase += ((window.scrollY || 0) / maxScroll - scrollEase) * 0.05;
    const ang = scrollEase * 1.5;
    // cursor parallax layers on top of the orbital position
    cx2 += (px - cx2) * 0.04; cy2 += (py - cy2) * 0.04;
    camera.position.x = Math.sin(ang) * 6.6 + cx2 * 2.6;
    camera.position.z = Math.cos(ang) * 6.6;
    camera.position.y = 2.6 + scrollEase * 1.8 - cy2 * 1.8;
    camera.lookAt(0, 0, 0);
    // shooting stars
    meteors.forEach((m) => {
      if (!m.active) { m.delay -= dt; if (m.delay <= 0) fireMeteor(m); return; }
      m.t += dt;
      const head = m.from.clone().add(m.dir.clone().multiplyScalar(m.t * 14));
      const tail = head.clone().add(m.dir.clone().multiplyScalar(-1.6));
      const arr = m.line.geometry.attributes.position.array;
      arr[0] = head.x; arr[1] = head.y; arr[2] = head.z;
      arr[3] = tail.x; arr[4] = tail.y; arr[5] = tail.z;
      m.line.geometry.attributes.position.needsUpdate = true;
      m.line.material.opacity = Math.max(0, 1 - m.t / 1.1);
      if (m.t > 1.1) { m.active = false; m.delay = 4 + Math.random() * 8; m.line.material.opacity = 0; }
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(render);
  }
  function start() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(render); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  render();

  const resize = () => {
    [W, H] = sizeOf();
    if (!W || !H) return;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
  };
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  // Full-strength in the hero, then settle to a strong steady level — the
  // orbital flight must stay clearly visible for the whole journey down.
  const fade = () => {
    const f = Math.max(0, 1 - window.scrollY / window.innerHeight);
    canvas.style.opacity = (0.5 + 0.5 * f).toFixed(3);
  };
  fade();
  window.addEventListener("scroll", fade, { passive: true });

  // Self-heal: if the page loaded before the viewport had a real size, the
  // first frame can init at 0×0. Re-sync size + fade over the next moments.
  const heal = () => { resize(); fade(); };
  [50, 200, 600].forEach((d) => setTimeout(heal, d));
  window.addEventListener("load", heal);
}
// Boot once Three.js (CDN) is ready — tolerates script load-order races.
// Wrapped so a galaxy/WebGL failure can NEVER halt the rest of this file.
(function bootGalaxy(tries) {
  if (reduceMotion) return;
  if (window.THREE && document.getElementById("galaxy")) {
    try { galaxy(); } catch (e) { console.error("galaxy init failed:", e); }
    return;
  }
  if (tries > 0) setTimeout(() => bootGalaxy(tries - 1), 100);
})(50);

/* --------------------------------- nav ---------------------------------- */
(function nav() {
  const el = document.querySelector(".nav");
  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".menu");

  let lastY = window.scrollY || 0;
  const onScroll = () => {
    if (!el) return;
    const y = window.scrollY || 0;
    el.classList.toggle("scrolled", y > 20);
    // hide when scrolling down past the hero, return the moment you scroll up
    const menuOpen = menu && menu.classList.contains("open");
    if (!menuOpen) el.classList.toggle("nav--hidden", y > lastY + 4 && y > 280);
    if (Math.abs(y - lastY) > 4) lastY = y;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        burger.classList.remove("open");
        document.body.style.overflow = "";
      })
    );
  }

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__links a, .menu a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || ((path === "" || path === "index.html") && href === "index.html")) a.classList.add("active");
  });
})();

/* ----------------------------- scroll reveal ---------------------------- */
(function reveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  // stagger index is per .stagger group so each grid/list cascades on its own
  document.querySelectorAll(".stagger").forEach((g) => {
    [...g.children].forEach((c, i) => c.style.setProperty("--i", i));
  });
  if (reduceMotion) { items.forEach((i) => i.classList.add("in")); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }),
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((it) => io.observe(it));
  // safety net: if any intersection is missed, force everything visible
  setTimeout(() => items.forEach((it) => it.classList.add("in")), 2500);
})();

/* --------------------------- scroll progress ---------------------------- */
(function progress() {
  const bar = document.getElementById("progress");
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const st = window.scrollY || document.documentElement.scrollTop || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, st / max) : 0) + ")";
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* --------------------------- count-up stats ----------------------------- */
(function counters() {
  const nums = document.querySelectorAll("[data-count]");
  if (!nums.length) return;
  const run = (el) => {
    const target = parseFloat(el.getAttribute("data-count")) || 0;
    const pad = parseInt(el.getAttribute("data-pad") || "0", 10);
    if (reduceMotion) { el.textContent = String(target).padStart(pad, "0"); return; }
    const dur = 1300, start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const val = Math.round(target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
      el.textContent = String(val).padStart(pad, "0");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
  }), { threshold: 0.4 });
  nums.forEach((n) => io.observe(n));
})();

/* ---------------------- scroll-scrub (tied to scroll) ------------------- */
/* Continuous, reversible transforms driven by scroll position — the "alive"
   feel of premium sites. Transform/opacity-only and reduced-motion-gated;
   elements are visible by default so nothing can hide. */
(function scrub() {
  const els = [...document.querySelectorAll("[data-scrub]")];
  if (!els.length || reduceMotion) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let ticking = false;
  function frame() {
    const vh = window.innerHeight;
    for (const el of els) {
      const type = el.getAttribute("data-scrub");
      if (type === "heroOut") {
        // hero lifts + fades as you scroll past the first screen
        const p = clamp((window.scrollY || 0) / vh, 0, 1);
        el.style.transform = `translateY(${(-p * 70).toFixed(1)}px)`;
        el.style.opacity = (1 - p * 0.85).toFixed(3);
        continue;
      }
      const r = el.getBoundingClientRect();
      if (type === "drift") {
        // continuous drift + gentle rotate as the element passes through the viewport
        const p2 = clamp((vh - r.top) / (vh + r.height), 0, 1);
        el.style.transform = `translateY(${((0.5 - p2) * 60).toFixed(1)}px) rotate(${((0.5 - p2) * 3).toFixed(2)}deg)`;
        continue;
      }
      // entrance-through progress: 0 below viewport → 1 at ~40% up
      const center = r.top + r.height / 2;
      const p = clamp(1 - (center - vh * 0.4) / (vh * 0.7), 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      if (type === "slideL" || type === "slideR") {
        // continuous slide-in that reverses when you scroll back up
        const dir = type === "slideL" ? -1 : 1;
        el.style.opacity = e.toFixed(3);
        el.style.transform = `translateX(${(dir * (1 - e) * 90).toFixed(1)}px)`;
        continue;
      }
      if (type === "zoom") {
        el.style.opacity = e.toFixed(3);
        el.style.transform = `scale(${(0.88 + e * 0.12).toFixed(3)})`;
        continue;
      }
      if (type === "rise3d") {
        if (e >= 0.995) {
          // settled: release the inline transform so hover/tilt effects can act
          if (el.__scrubDone !== true) { el.style.transform = ""; el.__scrubDone = true; }
        } else {
          el.__scrubDone = false;
          el.style.transform =
            `perspective(1200px) translateY(${((1 - e) * 80).toFixed(1)}px) ` +
            `rotateX(${((1 - e) * 18).toFixed(1)}deg) scale(${(0.9 + e * 0.1).toFixed(3)})`;
        }
      }
    }
    ticking = false;
  }
  const onScroll = () => { if (!ticking) { requestAnimationFrame(frame); ticking = true; } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", frame);
  frame();
  // run again once layout/fonts settle so the initial state is correct
  window.addEventListener("load", frame);
  [100, 400, 900].forEach((d) => setTimeout(frame, d));
})();

/* ----------------- marquee reacts to scroll velocity -------------------- */
(function tickerVelocity() {
  const ticker = document.querySelector(".ticker");
  if (!ticker || reduceMotion) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let last = window.scrollY || 0, vel = 0, raf = null;
  function loop() {
    const now = window.scrollY || 0;
    vel = vel * 0.82 + (now - last) * 0.18;
    last = now;
    const skew = clamp(vel * 0.18, -6, 6);
    ticker.style.transform = `skewX(${skew.toFixed(2)}deg)`;
    if (Math.abs(vel) > 0.06 || Math.abs(skew) > 0.04) raf = requestAnimationFrame(loop);
    else { ticker.style.transform = "skewX(0deg)"; raf = null; }
  }
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
})();

/* ------------------------------ parallax -------------------------------- */
/* Decorative elements drift at their own speed for depth. transform-only. */
(function parallax() {
  const items = [...document.querySelectorAll("[data-parallax]")];
  if (!items.length || reduceMotion) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    items.forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
      const r = el.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = "translate3d(0," + (off * speed * -100).toFixed(1) + "px,0)";
    });
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* ------------------------- 3D tilt on hover ----------------------------- */
/* Cards tilt in perspective toward the cursor. Desktop pointers only. */
(function tilt() {
  if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    let raf = null;
    el.addEventListener("pointermove", (e) => {
      if (el.__scrubDone === false) return; // still entering via scroll-scrub
      const r = el.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -9;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
      if (!raf) raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
        raf = null;
      });
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
})();

/* --------------------------- magnetic buttons --------------------------- */
(function magnetic() {
  if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll(".btn").forEach((btn) => {
    let pressed = false;
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.18;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` + (pressed ? " scale(.97)" : "");
    });
    btn.addEventListener("pointerdown", () => { pressed = true; btn.style.transform += " scale(.97)"; });
    btn.addEventListener("pointerup", () => { pressed = false; });
    btn.addEventListener("pointerleave", () => { pressed = false; btn.style.transform = ""; });
  });
})();

/* ----------------------------- cursor glow ------------------------------ */
(function cursorGlow() {
  if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const glow = document.getElementById("cursor-glow");
  if (!glow) return;
  let tx = -1000, ty = -1000, x = tx, y = ty, raf = null;
  const loop = () => {
    x += (tx - x) * 0.12; y += (ty - y) * 0.12;
    glow.style.transform = `translate(${(x - 300).toFixed(1)}px, ${(y - 300).toFixed(1)}px)`;
    if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(loop);
    else raf = null;
  };
  window.addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(loop);
  });
})();

/* --------------------------- floating dust ------------------------------ */
/* A few glowing motes drift up through every section — ambient space feel. */
(function dust() {
  if (reduceMotion) return;
  document.querySelectorAll("main .section").forEach((sec) => {
    for (let i = 0; i < (LITE ? 3 : 5); i++) {
      const d = document.createElement("span");
      d.className = "dust";
      d.setAttribute("aria-hidden", "true");
      d.style.left = (Math.random() * 100).toFixed(1) + "%";
      const s = (2 + Math.random() * 2.5).toFixed(1) + "px";
      d.style.width = s; d.style.height = s;
      d.style.animationDuration = (8 + Math.random() * 9).toFixed(1) + "s";
      d.style.animationDelay = (-Math.random() * 14).toFixed(1) + "s";
      sec.appendChild(d);
    }
  });
})();

/* ------------------------------ newsletter ------------------------------ */
(function newsletter() {
  const form = document.querySelector("[data-newsletter]");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.querySelector("input").value) return;
    // TODO: connect to Mailchimp / Meta Conversions API once client provides access
    form.classList.add("hide");
    const ok = form.parentElement.querySelector(".form-ok");
    if (ok) ok.classList.add("show");
  });
})();

/* ---------------------------- whatsapp forms ---------------------------- */
function buildMessage(prefix, form) {
  const data = new FormData(form);
  const parts = [];
  for (const [k, v] of data.entries()) if (v) parts.push(`${k}: ${v}`);
  return `Hi QUBE! ${prefix}. ${parts.join(", ")}`;
}
document.querySelectorAll("[data-wa-form]").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    openWhatsApp(buildMessage(form.getAttribute("data-wa-form") || "Inquiry", form));
    form.classList.add("hide");
    const ok = form.parentElement.querySelector(".form-ok");
    if (ok) ok.classList.add("show");
  });
});

/* ------------------------------ wa fab / bar ---------------------------- */
(function fab() {
  const fabEl = document.querySelector(".wa-fab");
  const bar = document.querySelector(".sticky-bar.on");
  if (fabEl && bar) {
    const sync = () => {
      const mobile = window.innerWidth <= 720;
      fabEl.classList.toggle("hide", mobile);
      document.body.classList.toggle("has-bar", mobile);
    };
    sync();
    window.addEventListener("resize", sync);
  }
})();

/* ------------------------------ filter pills ---------------------------- */
(function filters() {
  const pills = document.querySelectorAll("[data-filter]");
  const cards = document.querySelectorAll("[data-tags]");
  if (!pills.length || !cards.length) return;
  pills.forEach((pill) =>
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      const f = pill.getAttribute("data-filter");
      cards.forEach((c) => { c.hidden = !(f === "all" || (c.getAttribute("data-tags") || "").includes(f)); });
    })
  );
})();

/* ------------------------------- countdown ------------------------------ */
(function countdown() {
  const el = document.querySelector("[data-countdown]");
  if (!el) return;
  const target = new Date(CONFIG.OPENING_DATE).getTime();
  const set = (sel, val) => { const n = el.querySelector(sel); if (n) n.textContent = String(val).padStart(2, "0"); };
  const tick = () => {
    const d = Math.max(0, target - Date.now());
    set("[data-days]", Math.floor(d / 864e5));
    set("[data-hours]", Math.floor((d % 864e5) / 36e5));
    set("[data-mins]", Math.floor((d % 36e5) / 6e4));
    set("[data-secs]", Math.floor((d % 6e4) / 1e3));
  };
  tick();
  setInterval(tick, 1000);
})();

/* ------------------------------- lightbox ------------------------------- */
(function lightbox() {
  const items = document.querySelectorAll(".gallery-item");
  const box = document.querySelector(".lightbox");
  if (!items.length || !box) return;
  const content = box.querySelector(".lightbox__content");
  const close = () => { box.classList.remove("open"); document.body.style.overflow = ""; };
  items.forEach((it) =>
    it.addEventListener("click", () => {
      content.innerHTML = (it.querySelector(".media-fallback, img") || {}).outerHTML || "";
      box.classList.add("open");
      document.body.style.overflow = "hidden";
    })
  );
  box.querySelector(".lightbox__close")?.addEventListener("click", close);
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();

/* ------------------------------- accordion ------------------------------ */
(function accordion() {
  document.querySelectorAll(".acc-item").forEach((item) => {
    const trigger = item.querySelector(".acc-trigger");
    const panel = item.querySelector(".acc-panel");
    if (!trigger || !panel) return;
    trigger.addEventListener("click", () => {
      const open = item.classList.contains("open");
      item.parentElement.querySelectorAll(".acc-item").forEach((i) => {
        i.classList.remove("open");
        i.querySelector(".acc-panel").style.maxHeight = null;
        i.querySelector(".acc-trigger").setAttribute("aria-expanded", "false");
      });
      if (!open) {
        item.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });
})();

/* ----------------------- QUBE tower floor selector ---------------------- */
/* Interactive 3D tower: hover spins it, clicking a floor zooms the camera
   into that level and swaps the event panel. Fully wrapped so any failure
   can never halt the rest of this file.                                     */
(function towerSelector() {
  try {
    const tower = document.getElementById("tower");
    const panel = document.getElementById("tower-panel");
    if (!tower || !panel) return;
    const stage = document.getElementById("tower-stage");

    // Placeholder lineup — TODO: client to confirm real events per floor
    const EVENTS = {
      all:     { floor: "All Four Floors", name: "Grand Opening", date: "Sept 2026 · Doors 22:00", desc: "Every floor open at once. The full QUBE experience, one historic night in Paceville.", cta: "bookings.html", ctaLabel: "Book Tables" },
      rooftop: { floor: "Rooftop · Skyline", name: "Rooftop Sundowns", date: "Every Sunday · 19:00", desc: "Open-air sessions above St Julians with cocktails, shisha and the sunset skyline.", cta: "bookings.html", ctaLabel: "Book Rooftop" },
      f3:      { floor: "Level 03 · The Club Floor", name: "Reggaeton Takeover", date: "Oct 2026 · 23:00", desc: "The club floor surrenders to reggaeton. A second atmosphere, another gear.", cta: "bookings.html", ctaLabel: "Book Tables" },
      f2:      { floor: "Level 02 · VIP", name: "VIP Launch Night", date: "Sept 2026 · 22:00", desc: "Bottle service, dedicated hosts and a room set apart from it all.", cta: "vip-tables.html", ctaLabel: "Reserve VIP" },
      f1:      { floor: "Level 01 · The Main Room", name: "Latin Saturdays", date: "Every Saturday · 23:00", desc: "Commercial and Latin heat in the Main Room, where the night starts.", cta: "bookings.html", ctaLabel: "Book Tables" },
    };
    const out = {
      floor: panel.querySelector("[data-t-floor]"),
      name: panel.querySelector("[data-t-name]"),
      date: panel.querySelector("[data-t-date]"),
      desc: panel.querySelector("[data-t-desc]"),
      cta: panel.querySelector("[data-t-cta]"),
      reset: panel.querySelector("[data-t-reset]"),
    };
    const levels = [...tower.querySelectorAll(".tlevel")];
    let active = null;

    // Build the lit-window pattern on every face: random on/off mix with a few
    // windows flickering — like a real building at night.
    levels.forEach((lvl) => {
      const rows = lvl.classList.contains("tlevel--roof") ? 1
        : lvl.classList.contains("tlevel--main") ? 3 : 2;
      lvl.querySelectorAll("i").forEach((face, fi) => {
        if (LITE && fi >= 2) return; // phones: skip side-face windows (barely visible, costly)
        const grid = document.createElement("div");
        grid.className = "win-grid";
        grid.setAttribute("aria-hidden", "true");
        const cols = fi >= 2 ? 4 : (LITE ? 4 : 6); // side faces are narrower
        grid.style.setProperty("--wc", cols);
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        for (let i = 0; i < cols * rows; i++) {
          const w = document.createElement("span");
          w.className = "win" + (Math.random() < 0.55 ? " lit" : "");
          if (Math.random() < 0.18) {
            w.classList.add("flk");
            w.style.setProperty("--fd", (2.5 + Math.random() * 5).toFixed(1) + "s");
            w.style.setProperty("--fdel", (-Math.random() * 6).toFixed(1) + "s");
          }
          grid.appendChild(w);
        }
        face.appendChild(grid);
      });
    });

    function fill(key) {
      const ev = EVENTS[key] || EVENTS.all;
      panel.classList.add("swap");
      setTimeout(() => {
        if (out.floor) out.floor.textContent = ev.floor;
        if (out.name) out.name.textContent = ev.name;
        if (out.date) out.date.textContent = ev.date;
        if (out.desc) out.desc.textContent = ev.desc;
        if (out.cta) { out.cta.setAttribute("href", ev.cta); out.cta.textContent = ev.ctaLabel; }
        if (out.reset) out.reset.hidden = key === "all";
        panel.classList.remove("swap");
      }, 220);
    }
    /* One spring-physics pipeline drives EVERY tower pose — idle float,
       cursor spin and zoom are targets of the same continuous loop, so there
       are no CSS-animation hand-offs and nothing ever snaps. */
    let mode = "idle";           // idle | manual | zoom
    let zoomTarget = null;
    let cursorRy = -24;
    const pose = { rx: 8, ry: -30, s: 1, ty: 0 };
    const vel = { rx: 0, ry: 0, s: 0, ty: 0 };

    function applyInstant() { // reduced-motion path: jump-cut, no animation
      const t = mode === "zoom" && zoomTarget ? zoomTarget : { rx: 8, ry: -24, s: 1, ty: 0 };
      tower.style.transform = `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.s}) translateY(${t.ty}px)`;
    }
    function unzoom() {
      active = null;
      mode = "idle";
      tower.classList.remove("zoomed");
      levels.forEach((l) => l.classList.remove("active"));
      if (reduceMotion) applyInstant();
      fill("all");
    }
    function zoomTo(lvl) {
      if (active === lvl) return unzoom();
      active = lvl;
      levels.forEach((l) => l.classList.toggle("active", l === lvl));
      tower.classList.add("zoomed");
      // center the chosen floor: translateY sits after scale, so the unscaled
      // offset lands scaled — exactly the distance the floor moved outward
      const dy = tower.offsetHeight / 2 - (lvl.offsetTop + lvl.offsetHeight / 2);
      mode = "zoom";
      zoomTarget = { rx: 5, ry: -14, s: 1.72, ty: dy };
      if (reduceMotion) applyInstant();
      fill(lvl.getAttribute("data-floor"));
    }
    levels.forEach((lvl) => {
      lvl.addEventListener("click", () => zoomTo(lvl));
      lvl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zoomTo(lvl); }
      });
    });
    if (out.reset) out.reset.addEventListener("click", unzoom);

    tower.classList.add("jsdrive"); // switch off the CSS fallback animation
    if (reduceMotion) {
      applyInstant();
    } else {
      if (stage && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        stage.addEventListener("pointermove", (e) => {
          if (mode === "zoom") return;
          const r = stage.getBoundingClientRect();
          cursorRy = ((e.clientX - r.left) / r.width - 0.5) * 80;
          mode = "manual";
        });
        stage.addEventListener("pointerleave", () => { if (mode !== "zoom") mode = "idle"; });
      }
      const K = { idle: 0.045, manual: 0.16, zoom: 0.11 }; // spring stiffness per mode
      const DAMP = 0.72;
      let raf = null, frame = 0;
      const step = (now) => {
        raf = requestAnimationFrame(step);
        frame++;
        if (LITE && frame % 2) return; // phones: 30fps writes — half the compositing work
        const t = now / 1000;
        let target;
        if (mode === "zoom" && zoomTarget) target = zoomTarget;
        else if (mode === "manual") target = { rx: 8, ry: cursorRy, s: 1, ty: Math.sin(t * 0.8) * 4 };
        else target = { rx: 8 + Math.sin(t * 0.55) * 1.6, ry: Math.sin(t * 0.42) * 30, s: 1, ty: Math.sin(t * 0.8) * 6 };
        for (const k in pose) {
          vel[k] = (vel[k] + (target[k] - pose[k]) * K[mode]) * DAMP;
          pose[k] += vel[k];
        }
        tower.style.transform =
          `rotateX(${pose.rx.toFixed(2)}deg) rotateY(${pose.ry.toFixed(2)}deg) ` +
          `scale(${pose.s.toFixed(3)}) translateY(${pose.ty.toFixed(1)}px)`;
      };
      const start = () => { if (!raf) raf = requestAnimationFrame(step); };
      const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
      start();
      // run the spring only while the tower is actually on screen
      if (stage && "IntersectionObserver" in window) {
        new IntersectionObserver(
          (en) => (en[0].isIntersecting && !document.hidden ? start() : stop()),
          { rootMargin: "160px" }
        ).observe(stage);
      }
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    }
  } catch (e) { console.error("tower init failed:", e); }
})();
