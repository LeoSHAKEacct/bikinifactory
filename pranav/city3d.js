/* Pencil drawing -> living tower -> 3D Dubai, all in one window (#bpSlot) of the "I build what I promise" panel.
   Stage 0: a tower is sketched in pencil on paper. Stage 1 (first scroll): it comes alive, glass and lights.
   Stage 2 (next scroll): the camera rises into a bird's-eye map of Dubai, the area guide.
   The page's scroll script sets the stage (window.bpStage + "pranav:stage" events); this file only draws.
   The view sits behind the page inside the window's box. Without WebGL the flat SVG map (#map) is shown instead. */
const $ = id => document.getElementById(id);
const slotA = $("bpSlot"), hs = $("hs");

if (slotA && hs) start();

async function start() {
  const t = document.createElement("canvas");
  if (!(t.getContext("webgl2") || t.getContext("webgl"))) return slotA.classList.add("no3d");
  try { build(await import("/vendor/three.module.min.js")); }
  catch (e) { console.warn("3D map unavailable", e); slotA.classList.add("no3d"); }
}

function build(THREE) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AREAS = window.PRANAV_AREAS || [];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const mix = (a, b, k) => a + (b - a) * k;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---- geography: lat/lon -> km, turned so the coast runs left to right and the sea is at the back (-z)
  const O = [25.15, 55.22], KX = 100.6, KZ = 111, BETA = 46.8 * Math.PI / 180, cb = Math.cos(BETA), sb = Math.sin(BETA);
  const P = (lat, lon) => { const x = (lon - O[1]) * KX, z = -(lat - O[0]) * KZ; return [x * cb - z * sb, x * sb + z * cb]; };
  const COAST = [[24.80, 54.83], [24.86, 54.89], [24.93, 54.96], [24.975, 55.005], [24.99, 55.03], [25.01, 55.055], [25.035, 55.085], [25.055, 55.11],
    [25.07, 55.125], [25.08, 55.135], [25.092, 55.145], [25.10, 55.155], [25.115, 55.17], [25.13, 55.18], [25.142, 55.19], [25.155, 55.205],
    [25.17, 55.215], [25.185, 55.228], [25.20, 55.24], [25.215, 55.252], [25.232, 55.262], [25.245, 55.27], [25.258, 55.275], [25.268, 55.285],
    [25.272, 55.296], [25.278, 55.305], [25.285, 55.313], [25.292, 55.322], [25.30, 55.338], [25.308, 55.352], [25.318, 55.367], [25.333, 55.385], [25.36, 55.41], [25.40, 55.45]].map(c => P(...c));
  const CREEK = [[25.275, 55.299], [25.266, 55.303], [25.258, 55.309], [25.25, 55.316], [25.24, 55.322], [25.23, 55.328], [25.222, 55.333],
    [25.212, 55.336], [25.203, 55.338], [25.195, 55.342], [25.188, 55.35], [25.183, 55.36]].map(c => P(...c));
  const CANAL = [[25.192, 55.334], [25.189, 55.315], [25.186, 55.295], [25.184, 55.28], [25.185, 55.265], [25.19, 55.253], [25.196, 55.245], [25.2015, 55.2385]].map(c => P(...c));
  const SZR = [[24.90, 54.99], [24.98, 55.06], [25.02, 55.10], [25.05, 55.13], [25.07, 55.147], [25.09, 55.163], [25.11, 55.182], [25.13, 55.202],
    [25.15, 55.222], [25.17, 55.243], [25.19, 55.266], [25.205, 55.276], [25.222, 55.284], [25.236, 55.291], [25.25, 55.30]].map(c => P(...c));
  const ROADS = [
    [[25.03, 55.17], [25.07, 55.20], [25.10, 55.228], [25.14, 55.262], [25.17, 55.29], [25.19, 55.31], [25.21, 55.33]],             // Al Khail
    [[24.93, 55.10], [25.00, 55.16], [25.06, 55.22], [25.11, 55.27], [25.16, 55.33], [25.20, 55.38], [25.25, 55.43]],             // Mohammed bin Zayed
    [[24.88, 55.05], [24.92, 55.12], [24.97, 55.17], [25.02, 55.22]],                                                             // to Dubai South
  ].map(r => r.map(c => P(...c)));
  const coastZ = x => { for (let i = 0; i < COAST.length - 1; i++) { const a = COAST[i], b = COAST[i + 1]; if (x >= a[0] && x <= b[0]) return mix(a[1], b[1], (x - a[0]) / (b[0] - a[0])); } return x < COAST[0][0] ? COAST[0][1] : COAST[COAST.length - 1][1]; };
  const distTo = (pts, x, z) => { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, k = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)); m = Math.min(m, Math.hypot(x - ax - k * dx, z - az - k * dz)); } return m; };
  const [BX, BZ] = P(25.1972, 55.2744);   // the tower being drawn stands where the Burj Khalifa is

  // ---- renderer, scene, camera
  const canvas = document.createElement("canvas"); canvas.id = "city3d"; canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);   // behind the panels: page text stays on top
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  const resize = () => R.setSize(innerWidth, innerHeight, false); resize(); addEventListener("resize", resize);
  R.setScissorTest(true);
  const scene = new THREE.Scene(), fog = new THREE.Fog(0x0a2340, 10, 45); scene.fog = fog;
  const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 600);
  const PAPER = new THREE.Color(0x05070c), DUSK = new THREE.Color(0x14263f), NIGHT = new THREE.Color(0x060a12), GRAPHITE = new THREE.Color(0xf1e9d6), clr = new THREE.Color(), tmpC = new THREE.Color();
  const CYAN = new THREE.Color(0x7fd6ff), WHITE = new THREE.Color(0xe6f6ff), GOLD = new THREE.Color(0xf3dca4);

  const geo = arr => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); return g; };
  const basic = (color, extra) => new THREE.MeshBasicMaterial(Object.assign({ color, transparent: true, opacity: 0, side: THREE.DoubleSide }, extra));
  const add = (o, order) => { o.renderOrder = order; scene.add(o); return o; };

  // sea, land and water
  const seaMat = basic(0x030912), landMat = basic(0x111c2f), waterMat = basic(0x0b2b47), roadMat = basic(0xd8b46a), road2Mat = basic(0x8fa3c0);
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 900), seaMat), 0); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.03;
  const shape = new THREE.Shape(), f0 = COAST[0], fl = COAST[COAST.length - 1];
  shape.moveTo(f0[0], -f0[1]); COAST.forEach(p => shape.lineTo(p[0], -p[1]));
  shape.lineTo(fl[0] + 120, -fl[1]); shape.lineTo(fl[0] + 120, -300); shape.lineTo(f0[0] - 120, -300); shape.lineTo(f0[0] - 120, -f0[1]);
  const land = add(new THREE.Mesh(new THREE.ShapeGeometry(shape), landMat), 1); land.rotation.x = -Math.PI / 2;
  const ribbon = (out, pts, w, y) => { for (let i = 0; i < pts.length - 1; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], l = Math.hypot(x2 - x1, z2 - z1) || 1, nx = -(z2 - z1) / l * w / 2, nz = (x2 - x1) / l * w / 2, ex = (x2 - x1) / l * w * .3, ez = (z2 - z1) / l * w * .3;
    out.push(x1 - nx - ex, y, z1 - nz - ez, x2 - nx + ex, y, z2 - nz + ez, x2 + nx + ex, y, z2 + nz + ez, x1 - nx - ex, y, z1 - nz - ez, x2 + nx + ex, y, z2 + nz + ez, x1 + nx - ex, y, z1 + nz - ez); } };
  const disc = (out, x, z, r, y, n = 10) => { for (let i = 0; i < n; i++) { const a = i / n * 6.2832, b = (i + 1) / n * 6.2832; out.push(x, y, z, x + Math.cos(a) * r, y, z + Math.sin(a) * r, x + Math.cos(b) * r, y, z + Math.sin(b) * r); } };
  const isl = [], water = [], roads = [], roads2 = [];
  ribbon(water, CREEK, .42, .008); ribbon(water, CANAL, .16, .008);
  ribbon(roads, SZR, .1, .012); ROADS.forEach(r => ribbon(roads2, r, .06, .012));

  // islands: the two Palms, The World, Burj Al Arab, Bluewaters
  const palms = [];
  const palm = (base, s) => {
    const [px, pz] = base, at = (u, v) => [px + v, pz - u], fronds = [];
    ribbon(isl, [at(-.1, 0), at(2.7 * s, 0)], .34 * s, .004);
    for (let i = 0; i < 8; i++) { const u = (.9 + i * .23) * s, L = (1.55 - i * .1) * s;
      for (const sd of [-1, 1]) { const a = at(u, 0), b = [a[0] + sd * L * .97, a[1] - L * .25]; ribbon(isl, [a, b], .11 * s, .004); fronds.push([a, b]); } }
    disc(isl, ...at(2.8 * s, 0), .2 * s, .004);
    const arc = []; for (let i = 0; i <= 36; i++) { const a = (-28 + i * (236 / 36)) * Math.PI / 180; arc.push([px + Math.cos(a) * 2.15 * s, pz - 1.75 * s - Math.sin(a) * 2.15 * s]); }
    ribbon(isl, arc, .22 * s, .004);
    palms.push({ fronds, top: [px, pz - 1.75 * s - 2.15 * s], s });
  };
  palm(P(25.0985, 55.1545), 1.25);       // Palm Jumeirah
  palm(P(24.986, 55.012), 1.55);         // Palm Jebel Ali
  { const [wx, wz] = P(25.223, 55.170); for (let i = -14; i <= 14; i++) for (let j = -10; j <= 10; j++) {
      const x = wx + i * .3 + (rnd() - .5) * .14, z = wz + j * .3 + (rnd() - .5) * .14;
      if (((x - wx) / 4.3) ** 2 + ((z - wz) / 2.9) ** 2 < 1 && rnd() > .22) disc(isl, x, z, .06 + rnd() * .07, .004, 7); } }
  const [aX, aZ] = P(25.1412, 55.1853); disc(isl, aX, aZ - .1, .12, .004, 12);
  const [wX, wZ] = P(25.0805, 55.1225); disc(isl, wX, wZ - .35, .32, .004, 16);
  add(new THREE.Mesh(geo(isl), landMat), 2);
  add(new THREE.Mesh(geo(water), waterMat), 3);
  add(new THREE.Mesh(geo(roads), roadMat), 4);
  add(new THREE.Mesh(geo(roads2), road2Mat), 4);

  // blueprint grids and the coastline
  const grid = add(new THREE.GridHelper(260, 260, 0x7fd6ff, 0x7fd6ff), 5); grid.position.y = .016;
  const fine = add(new THREE.GridHelper(16, 64, 0xcfeaff, 0xcfeaff), 5); fine.position.set(BX, .017, BZ);
  for (const g of [grid, fine]) { g.material.transparent = true; g.material.depthWrite = false; }
  const coastLine = add(new THREE.Line(geo(COAST.flatMap(p => [p[0], .02, p[1]])), new THREE.LineBasicMaterial({ color: 0xcfeaff, transparent: true })), 6);

  // ---- buildings (one merged mesh + one merged outline, grown by a shader)
  const fogU = THREE.UniformsLib.fog;
  const shared = `attribute float aDelay; attribute float aSeed; uniform float uT; uniform float uH; varying float vK;
    float grow(){ float k = clamp((uT - aDelay) * 3.0, 0.0, 1.0); return 1.0 - pow(1.0 - k, 3.0); }`;
  const fillMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([fogU, { uT: { value: 0 }, uH: { value: 1 }, uAlpha: { value: 1 }, uLit: { value: 1 }, uTime: { value: 0 } }]),
    fog: true, transparent: true, side: THREE.DoubleSide,
    vertexShader: `${shared} varying vec3 vW; varying vec3 vN; varying float vSeed; varying float vTop;
      #include <fog_pars_vertex>
      void main(){ float k = grow(); vK = k; vec3 p = position; p.y *= k * uH; vW = vec3(p.x, position.y * k, p.z); vN = normal; vSeed = aSeed; vTop = normal.y;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uAlpha; uniform float uLit; uniform float uTime; varying float vK; varying vec3 vW; varying vec3 vN; varying float vSeed; varying float vTop;
      #include <fog_pars_fragment>
      float h(vec3 v){ return fract(sin(dot(v, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){
        if (vK <= 0.001) discard;
        vec3 c = mix(vec3(.035, .055, .095), vec3(.10, .14, .22), clamp(vW.y / 1.6, 0.0, 1.0));
        if (vTop > .5) c = vec3(.07, .095, .14);
        else {
          float u = abs(vN.x) > abs(vN.z) ? vW.z : vW.x;
          vec2 g = vec2(u / .045, vW.y / .04), f = fract(g), id = floor(g);
          float win = step(.3, f.x) * step(.35, f.y), lit = step(.7, h(vec3(id, vSeed)));
          float aa = clamp(1.0 - max(fwidth(g.x), fwidth(g.y)) * 1.3, 0.0, 1.0);
          float glow = mix(.18, win * lit, aa) * (.6 + .4 * sin(uTime * .8 + h(vec3(id.yx, vSeed)) * 6.28));
          c *= .7 + .3 * abs(vN.x);
          c += vec3(.95, .75, .42) * glow * uLit;
        }
        gl_FragColor = vec4(c, uAlpha);
        #include <fog_fragment>
      }`,
  });
  const lineMat = color => new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([fogU, { uT: { value: 0 }, uH: { value: 1 }, uAlpha: { value: 0 }, uColor: { value: new THREE.Color(color) } }]),
    fog: true, transparent: true, depthWrite: false,
    vertexShader: `${shared}
      #include <fog_pars_vertex>
      void main(){ float k = grow(); vK = k; vec3 p = position; p.y *= k * uH; vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vK;
      #include <fog_pars_fragment>
      void main(){ if (vK <= 0.001) discard; gl_FragColor = vec4(uColor, uAlpha);
        #include <fog_fragment>
      }`,
  });

  const mk = () => ({ p: [], n: [], d: [], s: [], ep: [], ed: [], es: [], segs: [] });
  const city = mk(), hero = mk();
  // a prism over a convex footprint [[x,z],...], from y0 to y1
  const prism = (B, foot, y0, y1, delay, s, keepSegs) => {
    const n = foot.length, q = (i, y) => [foot[i % n][0], y, foot[i % n][1]];
    const tri = (a, b, c, nx, ny, nz) => { B.p.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) { B.n.push(nx, ny, nz); B.d.push(delay); B.s.push(s); } };
    for (let i = 0; i < n; i++) {
      const a = foot[i], b = foot[(i + 1) % n], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1, nx = ez / l, nz = -ex / l;
      tri(q(i, y0), q(i + 1, y0), q(i + 1, y1), nx, 0, nz); tri(q(i, y0), q(i + 1, y1), q(i, y1), nx, 0, nz);
    }
    for (let i = 1; i < n - 1; i++) tri(q(0, y1), q(i, y1), q(i + 1, y1), 0, 1, 0);
    const seg = (a, b) => { if (keepSegs) B.segs.push([a, b]); else { B.ep.push(...a, ...b); B.ed.push(delay, delay); B.es.push(s, s); } };
    for (let i = 0; i < n; i++) { seg(q(i, y0), q(i + 1, y0)); seg(q(i, y1), q(i + 1, y1)); seg(q(i, y0), q(i, y1)); }
  };
  const rect = (cx, cz, w, d, r) => { const c = Math.cos(r), s = Math.sin(r); return [[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, z]) => [cx + (x * c - z * s) / 2, cz + (x * s + z * c) / 2]); };
  const ngon = (cx, cz, r, n, rot = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + i / n * 6.2832) * r, cz + Math.sin(rot + i / n * 6.2832) * r]);
  const maxD = 38, delayAt = (x, z) => clamp(Math.hypot(x - BX, z - BZ) / maxD) * .62 + rnd() * .12;
  const onLand = (x, z) => z > coastZ(x) + .18 && distTo(CREEK, x, z) > .32 && distTo(CANAL, x, z) > .12 && Math.hypot(x - BX, z - BZ) > .75;
  const tower = (x, z, w, d, h, r) => prism(city, rect(x, z, w, d, r), 0, h, delayAt(x, z), rnd() * 100);
  const cluster = (lat, lon, rx, rz, count, hmin, hmax, fmin, fmax, pow = 1.7) => {
    const [cx, cz] = P(lat, lon); let made = 0, tries = 0;
    count = Math.round(count * 1.4); while (made < count && tries++ < count * 8) {
      const a = rnd() * 6.2832, k = Math.sqrt(rnd()), x = cx + Math.cos(a) * rx * k, z = cz + Math.sin(a) * rz * k;
      if (!onLand(x, z)) continue;
      const w = mix(fmin, fmax, rnd()), d = mix(fmin, fmax, rnd());
      tower(x, z, w, d, mix(hmin, hmax, Math.pow(rnd(), pow)), (rnd() - .5) * .3); made++;
    }
  };
  cluster(25.080, 55.140, 1.1, .55, 75, .3, 1.45, .1, .19);       // Dubai Marina
  cluster(25.0775, 55.132, .7, .22, 24, .3, .95, .1, .16);        // JBR
  cluster(25.070, 55.146, .75, .6, 38, .3, 1.05, .1, .17);         // JLT
  cluster(25.096, 55.141, .3, .2, 10, .45, .95, .09, .14);         // Emaar Beachfront
  cluster(25.094, 55.160, .9, .5, 28, .15, .5, .12, .22);          // Media / Internet City
  cluster(25.110, 55.200, 1.6, 1.1, 50, .07, .28, .12, .22, 2.2); // Al Barsha
  cluster(25.195, 55.277, .95, .7, 50, .25, 1.15, .1, .18);        // Downtown
  cluster(25.185, 55.272, 1.2, .8, 60, .3, 1.0, .1, .17);          // Business Bay
  cluster(25.2045, 55.3465, .65, .5, 20, .3, .9, .1, .17);         // Creek Harbour
  cluster(25.268, 55.318, 2.1, 1.3, 90, .05, .22, .12, .26, 2.4); // Deira
  cluster(25.245, 55.300, 1.5, 1.0, 60, .06, .24, .12, .24, 2.4); // Bur Dubai / Karama
  cluster(25.140, 55.232, 1.7, 1.0, 50, .04, .1, .16, .3, 2);     // Al Quoz
  cluster(25.060, 55.209, 1.0, .8, 45, .1, .32, .1, .2);           // JVC
  cluster(25.108, 55.248, 1.3, 1.0, 40, .06, .42, .1, .22, 2.4);  // Dubai Hills
  cluster(25.040, 55.222, 1.1, .8, 28, .08, .26, .12, .22);        // Sports / Motor City
  cluster(24.930, 55.155, 1.8, 1.4, 32, .05, .2, .14, .3, 2.4);   // Dubai South / Expo
  cluster(25.190, 55.245, 2.2, .45, 80, .03, .06, .06, .1);        // Jumeirah villas along the beach
  cluster(25.150, 55.210, 1.8, .4, 50, .03, .06, .06, .1);         // Umm Suqeim villas
  for (let i = 0; i < 46; i++) {                                     // the Sheikh Zayed Road towers (DIFC, Trade Centre)
    const k = rnd(), [x, z] = P(mix(25.199, 25.233, k), mix(55.272, 55.288, k)), side = rnd() < .5 ? -1 : 1, off = (.18 + rnd() * .14) * side;
    const t = 1, xx = x + off * cb * t, zz = z + off * sb * t;
    if (Math.hypot(xx - BX, zz - BZ) > .75) tower(xx, zz, mix(.09, .16, rnd()), mix(.09, .16, rnd()), mix(.4, 1.25, Math.pow(rnd(), 1.4)), .05);
  }
  for (let i = 0; i < 1500; i++) {
    const x = mix(-27, 21, rnd()), depth = Math.pow(rnd(), 1.6) * 10, z = coastZ(x) + .35 + depth;
    if (!onLand(x, z) || distTo(SZR, x, z) < .12) continue;
    prism(city, rect(x, z, mix(.08, .2, rnd()), mix(.08, .2, rnd()), (rnd() - .5) * .2), 0, mix(.02, .09, Math.pow(rnd(), 2)), delayAt(x, z), rnd() * 100);
  }
  for (const pl of palms) for (const [a, b] of pl.fronds) for (let i = 1; i < 9; i++) {   // villas along the fronds
    const k = i / 9, x = mix(a[0], b[0], k), z = mix(a[1], b[1], k);
    for (const sd of [-1, 1]) prism(city, rect(x, z + sd * .035 * pl.s, .035, .035, 0), 0, .02 + rnd() * .02, delayAt(x, z), rnd() * 100);
  }
  prism(city, rect(palms[0].top[0], palms[0].top[1] + .02, .5, .12, 0), 0, .28, delayAt(...palms[0].top), 3);   // Atlantis
  prism(city, ngon(aX, aZ - .1, .07, 3, -1.57), 0, .75, delayAt(aX, aZ), 7);                                       // Burj Al Arab

  // the hero tower: three wings stepping back in a spiral around a core, like the Burj Khalifa
  { const rot = -.35, wingTop = (w, j) => (j + 1) * .29 + w * .1;
    for (let w = 0; w < 3; w++) { const a = rot + w * 2.0944, dx = Math.cos(a), dz = Math.sin(a), nx = -dz, nz = dx;
      for (let j = 0; j < 9; j++) { const L = .62 * (1 - j / 9.5), hw = .1, y0 = j ? wingTop(w, j - 1) : 0;
        const f = [[BX - nx * hw, BZ - nz * hw], [BX + dx * L - nx * hw, BZ + dz * L - nz * hw], [BX + dx * L + nx * hw, BZ + dz * L + nz * hw], [BX + nx * hw, BZ + nz * hw]];
        prism(hero, f, y0, wingTop(w, j), 0, 40 + w * 9 + j, true); } }
    prism(hero, ngon(BX, BZ, .14, 6, rot), 0, 3.0, 0, 77, true);
    prism(hero, ngon(BX, BZ, .08, 6, rot), 3.0, 3.35, 0, 78, true);
    prism(hero, ngon(BX, BZ, .025, 6, rot), 3.35, 3.9, 0, 79, true);
  }
  // the drawing: plan circle, axes and a dimension line (drawn first), then the tower bottom to top
  const plan = [], ring = (r, n, y) => { for (let i = 0; i < n; i++) { const a = i / n * 6.2832, b = (i + 1) / n * 6.2832; plan.push([[BX + Math.cos(a) * r, y, BZ + Math.sin(a) * r], [BX + Math.cos(b) * r, y, BZ + Math.sin(b) * r]]); } };
  ring(1.15, 72, .02); ring(.72, 48, .02);
  for (let w = 0; w < 6; w++) { const a = -.35 + w * 1.0472; plan.push([[BX, .02, BZ], [BX + Math.cos(a) * 1.4, .02, BZ + Math.sin(a) * 1.4]]); }
  const DX = BX + Math.cos(-.35 + 1.0472) * 1.0, DZ = BZ + Math.sin(-.35 + 1.0472) * 1.0;
  const dim = [DX, 0, DZ, DX, 3.9, DZ]; for (let i = 0; i <= 13; i++) dim.push(DX - .06, i * .3, DZ, DX + .06, i * .3, DZ);
  hero.segs.sort((a, b) => Math.min(a[0][1], a[1][1]) - Math.min(b[0][1], b[1][1]) || a[0][1] - b[0][1]);
  const sketch = list => list.flatMap(([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1, o = Math.min(.05, L * .08);
    return [0, 1].map(k => { const j = () => (rnd() - .5) * .012 * (k + 1), d = [(b[0] - a[0]) / L * o, (b[1] - a[1]) / L * o, (b[2] - a[2]) / L * o];
      return [[a[0] - d[0] * k + j(), a[1] - d[1] * k + j(), a[2] - d[2] * k + j()], [b[0] + d[0] * (1 - k) + j(), b[1] + d[1] * (1 - k) + j(), b[2] + d[2] * (1 - k) + j()]]; }); });
  const heroSegs = sketch(plan).concat(sketch(hero.segs)), nPlan = plan.length * 2;

  const meshOf = (B, mat) => { const g = geo(B.p); g.setAttribute("normal", new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute("aDelay", new THREE.Float32BufferAttribute(B.d, 1)); g.setAttribute("aSeed", new THREE.Float32BufferAttribute(B.s, 1)); return new THREE.Mesh(g, mat); };
  add(meshOf(city, fillMat), 10);
  const cityEdgeMat = lineMat(0x7fd6ff);
  { const g = geo(city.ep); g.setAttribute("aDelay", new THREE.Float32BufferAttribute(city.ed, 1)); g.setAttribute("aSeed", new THREE.Float32BufferAttribute(city.es, 1)); add(new THREE.LineSegments(g, cityEdgeMat), 11); }
  const heroFillMat = fillMat.clone(); heroFillMat.uniforms.uT.value = 1;
  const heroG = new THREE.Group(); scene.add(heroG);
  const heroMesh = meshOf(hero, heroFillMat); heroMesh.renderOrder = 12; heroG.add(heroMesh);
  const heroLineMat = new THREE.LineBasicMaterial({ color: 0xe6f6ff, transparent: true, depthWrite: false });
  const heroLines = new THREE.LineSegments(geo(heroSegs.flatMap(([a, b]) => [...a, ...b])), heroLineMat); heroLines.renderOrder = 13; heroG.add(heroLines);
  const dimMat = new THREE.LineBasicMaterial({ color: 0xe6f6ff, transparent: true, depthWrite: false });
  const dimLine = new THREE.LineSegments(geo(dim), dimMat); dimLine.renderOrder = 13; heroG.add(dimLine);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true })); beacon.renderOrder = 14; beacon.position.set(BX, 3.93, BZ); heroG.add(beacon);

  // a tower crane next to it, like on the opening screen
  const craneMat = new THREE.LineBasicMaterial({ color: 0xd8b46a, transparent: true, depthWrite: false });
  const crane = new THREE.Group(); crane.position.set(BX + 1.05, 0, BZ + .55); add(crane, 13);
  { const m = []; for (let i = 0; i < 12; i++) { const y0 = i * .17, y1 = y0 + .17; m.push(-.04, y0, 0, -.04, y1, 0, .04, y0, 0, .04, y1, 0, -.04, y0, 0, .04, y1, 0); }
    crane.add(new THREE.LineSegments(geo(m), craneMat)); }
  const jib = new THREE.Group(); jib.position.y = 2.04; crane.add(jib);
  jib.add(new THREE.LineSegments(geo([-.55, 0, 0, 1.6, 0, 0, -.55, .08, 0, 1.6, .08, 0, 0, 0, 0, 0, .35, 0, 0, .35, 0, 1.6, .08, 0, 0, .35, 0, -.55, .08, 0, 1.1, 0, 0, 1.1, -.7, 0]), craneMat));
  // Ain Dubai wheel on Bluewaters
  { const m = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832, b = (i + 1) / 40 * 6.2832; m.push(Math.cos(a) * .22, .26 + Math.sin(a) * .22, 0, Math.cos(b) * .22, .26 + Math.sin(b) * .22, 0); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; m.push(0, .26, 0, Math.cos(a) * .22, .26 + Math.sin(a) * .22, 0); }
    const wheel = add(new THREE.LineSegments(geo(m), new THREE.LineBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0 })), 11); wheel.position.set(wX, 0, wZ - .35); wheel.rotation.y = .3; var wheelMat = wheel.material; }

  // ---- area pins: a gold beam and ring in 3D, a button label on top
  const pinMat = new THREE.LineBasicMaterial({ color: 0xf3dca4, transparent: true, opacity: 0, depthWrite: false });
  const pins = AREAS.filter(a => a.lat).map(a => {
    const [x, z] = P(a.lat, a.lon);
    const beam = add(new THREE.Line(geo([x, 0, z, x, 1, z]), pinMat), 15);
    const rg = add(new THREE.Mesh(new THREE.RingGeometry(.26, .34, 40), new THREE.MeshBasicMaterial({ color: 0xf3dca4, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })), 15);
    rg.rotation.x = -Math.PI / 2; rg.position.set(x, .03, z);
    return { a, x, z, beam, rg };
  });
  const ui = document.createElement("div"); ui.id = "cityUI";
  ui.innerHTML = `<svg class="cu-lines">${pins.map(() => "<line/>").join("")}</svg>` +
    pins.map(p => `<button type="button" class="cu-pin" data-id="${p.a.id}"><i></i>${p.a.name}</button>`).join("") +
    `<span class="cu-note" data-n="top">828 m · spire</span><span class="cu-note" data-n="base">level 0 · ±0.00</span><span class="cu-note" data-n="plan">plan · Y-core</span>` +
    `<svg class="cu-pencil" viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(45 32 32)"><rect x="26" y="4" width="12" height="40" rx="2" fill="#e8b64c"/><rect x="26" y="4" width="12" height="6" fill="#d98c8c"/><rect x="26" y="10" width="12" height="3" fill="#b9b9b9"/><path d="M26 44h12l-6 14z" fill="#f3dcb0"/><path d="M30 53h4l-2 5z" fill="#2b2b2b"/></g></svg>`;
  document.body.appendChild(ui);
  const pencil = ui.querySelector(".cu-pencil");
  const lines = [...ui.querySelectorAll("line")], btns = [...ui.querySelectorAll(".cu-pin")], notes = [...ui.querySelectorAll(".cu-note")];
  btns.forEach(b => b.onclick = () => window.showArea && window.showArea(b.dataset.id));
  let sel = window.currentArea || "marina";
  const mark = () => btns.forEach(b => b.classList.toggle("on", b.dataset.id === sel));
  document.addEventListener("pranav:area", e => { sel = e.detail; mark(); }); mark();

  // the flat map gives way to the 3D one
  slotA.classList.add("is3d");

  // drag the map to turn it (mouse only: on phones a swipe moves between panels)
  let drag = 0, dragGoal = 0, down = null;
  slotA.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" && (window.bpStage || 0) === 2) { down = e.clientX; slotA.setPointerCapture(e.pointerId); } });
  slotA.addEventListener("pointermove", e => { if (down != null) { dragGoal = clamp(dragGoal + (e.clientX - down) * .004, -.9, .9); down = e.clientX; } });
  addEventListener("pointerup", () => { down = null; });

  // ---- per frame
  const v = new THREE.Vector3(), tgt = new THREE.Vector3(), selT = new THREE.Vector3(), TB = new THREE.Vector3();
  const pts = pins.filter(p => p.a.id !== "south").map(p => [p.x, p.z]), minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0])), minZ = Math.min(...pts.map(p => p[1])), maxZ = Math.max(...pts.map(p => p[1]));
  TB.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2 - .2);
  selT.copy(TB);
  let drawStart = null, shown = false, sizes = null;
  const fovT = Math.tan(35 / 2 * Math.PI / 180);
  const toScreen = (x, y, z, r) => { v.set(x, y, z).project(cam); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height, v.z < 1]; };

  let ps = window.bpStage || 0, goal = ps, lastNow = 0;
  // arriving from the opening screen: the drawing carries on, at least almost finished
  document.addEventListener("pranav:stage", e => { goal = e.detail.stage; if (e.detail.reset) ps = goal; });

  // ---- the same drawing on the opening screen (#heroSketch): chalk-white pencil lines over the hero, no city
  const heroSlot = $("heroSketch"); let R2 = null, cam2, pencil2, h2w = 0, h2h = 0;
  const CHALK = new THREE.Color(0xf1e9d6);
  if (heroSlot) {
    const c2 = document.createElement("canvas"); c2.setAttribute("aria-hidden", "true"); heroSlot.appendChild(c2);
    R2 = new THREE.WebGLRenderer({ canvas: c2, antialias: true, alpha: true }); R2.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); R2.setClearColor(0x000000, 0);
    cam2 = new THREE.PerspectiveCamera(35, 1, .05, 600); cam2.layers.set(1);
    heroG.traverse(o => o.layers.enable(1)); crane.traverse(o => o.layers.enable(1));
    heroSlot.insertAdjacentHTML("beforeend", pencil.outerHTML); pencil2 = heroSlot.querySelector(".cu-pencil");
  }
  // on computers the opening screen's drawing sits exactly where page 2's window is, so the tower stays put between the two
  const alignHero = () => {
    if (!heroSlot) return;
    const p1 = slotA.closest(".pnl"), pr = p1.getBoundingClientRect(), sr = slotA.getBoundingClientRect(), top = sr.top - pr.top + p1.scrollTop;
    heroSlot.style.cssText = `left:${(sr.left - pr.left).toFixed(1)}px;top:${top.toFixed(1)}px;width:${sr.width.toFixed(1)}px;height:${sr.height.toFixed(1)}px;right:auto`;
    const heroEl = heroSlot.closest(".hero"); if (heroEl) heroEl.style.setProperty("--sk-bottom", (top + sr.height).toFixed(0) + "px");   // phones: the text starts below the drawing
  };
  alignHero(); let alT; addEventListener("resize", () => { clearTimeout(alT); alT = setTimeout(alignHero, 150); });
  if (document.fonts) document.fonts.ready.then(alignHero); setTimeout(alignHero, 1200);
  // while it is a drawing the tower stands right of centre in its window (clear of the headline on the opening screen)
  const shiftView = (c, w, h, k) => { const off = (innerWidth > 760 ? .2 : 0) * w * k; if (off > .5) c.setViewOffset(w, h, -off, 0, w, h); else c.clearViewOffset(); };
  const segAt = i => heroSegs[Math.max(0, Math.min(heroSegs.length - 1, i))];

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - (lastNow || now)) / 1000); lastNow = now;
    // stage 0 -> 1 -> 2, eased
    ps += (goal - ps) * (reduce ? 1 : 1 - Math.exp(-dt * 2.4)); if (Math.abs(goal - ps) < .002) ps = goal;
    const alive = clamp(ps), t = clamp(ps - 1);
    // the pencil drawing starts with the page (opening screen) and carries on in the window of page 2
    if (drawStart == null) drawStart = reduce || goal > 0 ? now - 1e6 : now;
    const tau = (now - drawStart) / 1000;
    const pPlan = Math.max(clamp(tau / 1.8), alive), pDraw = Math.max(clamp((tau - 1.8) / 6.5), sstep(0, .5, alive));
    const nDone = nPlan * pPlan + (pPlan >= 1 ? (heroSegs.length - nPlan) * pDraw : 0), nSeg = Math.floor(nDone);

    // opening screen: the drawing alone, chalk lines on a transparent canvas over the hero
    const hb = heroSlot && heroSlot.getBoundingClientRect();
    if (hb && hb.width > 20 && hb.right > 0 && hb.left < innerWidth && hb.bottom > 0 && hb.top < innerHeight) {
      const w = Math.round(hb.width), h = Math.round(hb.height);
      if (w !== h2w || h !== h2h) { R2.setSize(w, h, false); h2w = w; h2h = h; }
      cam2.aspect = w / h; const ht = fovT * cam2.aspect, d2 = Math.max(2.3 / fovT, 2.1 / ht) * 1.05, th2 = .73 + (reduce ? 0 : tau * .035);
      cam2.position.set(BX + d2 * Math.sin(1.36) * Math.sin(th2), 1.75 + d2 * Math.cos(1.36), BZ + d2 * Math.sin(1.36) * Math.cos(th2)); cam2.lookAt(BX, 1.75, BZ); shiftView(cam2, w, h, 1); cam2.updateProjectionMatrix();
      heroLines.geometry.setDrawRange(0, 2 * nSeg); heroLineMat.color.copy(CHALK); heroLineMat.opacity = .92;
      dimMat.color.copy(CHALK); dimMat.opacity = .55 * Math.min(1, pDraw * 1.5); craneMat.color.copy(CHALK); craneMat.opacity = .7 * pPlan;
      jib.rotation.y = reduce ? .6 : Math.sin(now / 4000) * .7 + .6; heroG.scale.y = 1; heroFillMat.uniforms.uAlpha.value = 0; beacon.visible = false;   // invisible faces still hide the back lines, as on page 2
      const f0 = scene.fog; scene.fog = null; R2.render(scene, cam2); scene.fog = f0; beacon.visible = true;
      const going = nDone < heroSegs.length - .5; pencil2.style.opacity = going ? 1 : 0;
      if (going) { const [a0, a1] = segAt(nSeg), f = nDone - nSeg; v.set(mix(a0[0], a1[0], f), mix(a0[1], a1[1], f), mix(a0[2], a1[2], f)).project(cam2);
        pencil2.style.transform = `translate(${((v.x + 1) / 2 * w - 10).toFixed(1)}px,${((1 - v.y) / 2 * h - 36).toFixed(1)}px)`; }
    }

    const b = slotA.getBoundingClientRect(), r = { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom };
    const vis = r.width > 20 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
    if (!vis) { if (shown) { canvas.style.visibility = ui.style.visibility = "hidden"; shown = false; } return; }
    if (!shown) { canvas.style.visibility = ui.style.visibility = "visible"; shown = true; }
    canvas.style.clipPath = ui.style.clipPath = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 24px)`;
    // the paper fades softly into the page while it is a drawing; the edges sharpen as the tower comes alive
    { const fe = 1 - sstep(0, .6, ps), m = fe > .01 ? `radial-gradient(${(r.width * .68).toFixed(0)}px ${(r.height * .68).toFixed(0)}px at ${(r.left + r.width / 2).toFixed(0)}px ${(r.top + r.height / 2).toFixed(0)}px,#000 ${mix(100, 60, fe).toFixed(1)}%,transparent 100%)` : "none";
      canvas.style.webkitMaskImage = canvas.style.maskImage = m; }
    const pFill = sstep(.2, .9, alive), pLit = sstep(.45, 1, alive), night = sstep(.05, .7, alive);
    const e = ease(t), toMap = sstep(.12, .75, t), lab = sstep(.78, .98, t);
    const city3 = Math.max(.14 * sstep(.35, 1, alive), sstep(.04, .85, t));

    // camera: beside the tower (slowly walking round it) -> high above the city
    cam.aspect = r.width / r.height;
    const hTan = fovT * cam.aspect;
    const dA = Math.max(2.3 / fovT, 2.1 / hTan) * 1.05, dB = Math.max(((maxX - minX) / 2 + 2.5) / hTan, ((maxZ - minZ) / 2 + 4) / fovT) * .94;
    drag += (dragGoal - drag) * .08;
    const selP = pins.find(p => p.a.id === sel); if (selP) selT.lerp(v.set(mix(TB.x, selP.x, .22), 0, mix(TB.z, selP.z, .22)), .05);
    const orbit = reduce ? 0 : tau * .035;
    const thB = -.12 + drag, thA = thB + .85 + orbit * (1 - e) + .35 * alive;
    const th = mix(thA, thB, e), ph = mix(mix(1.36, 1.25, alive), .56, e), d = Math.exp(mix(Math.log(dA * mix(1, 1.12, alive)), Math.log(dB), e));
    tgt.set(mix(BX, selT.x, e), mix(1.75, 0, e), mix(BZ, selT.z, e));
    cam.position.set(tgt.x + d * Math.sin(ph) * Math.sin(th), tgt.y + d * Math.cos(ph), tgt.z + d * Math.sin(ph) * Math.cos(th));
    cam.lookAt(tgt); shiftView(cam, r.width, r.height, 1 - sstep(0, .8, ps)); cam.updateProjectionMatrix();

    // look: pencil on paper -> lit tower at dusk -> night map
    clr.copy(PAPER).lerp(DUSK, night).lerp(NIGHT, toMap); fog.color.copy(clr); fog.near = mix(9, 60, e); fog.far = mix(42, 190, e);
    seaMat.opacity = landMat.opacity = waterMat.opacity = toMap; roadMat.opacity = .45 * toMap; road2Mat.opacity = .18 * toMap;
    grid.material.opacity = mix(mix(.12, .16, night), .012, toMap) * Math.max(pPlan, e); fine.material.opacity = mix(.16, .26, night) * pPlan * (1 - sstep(0, .4, t));
    coastLine.material.opacity = mix(mix(.45, .5, night), .75, toMap); coastLine.material.color.copy(GRAPHITE).lerp(WHITE, night).lerp(CYAN, toMap);
    const hsc = mix(1, 2.3, e); heroG.scale.y = hsc; fillMat.uniforms.uH.value = cityEdgeMat.uniforms.uH.value = hsc;
    fillMat.uniforms.uT.value = city3; fillMat.uniforms.uTime.value = now / 1000; fillMat.uniforms.uLit.value = 1;
    cityEdgeMat.uniforms.uT.value = city3; cityEdgeMat.uniforms.uAlpha.value = mix(.55, .22, toMap);
    heroFillMat.uniforms.uAlpha.value = pFill; heroFillMat.uniforms.uLit.value = pLit; heroFillMat.uniforms.uTime.value = now / 1000;
    heroLines.geometry.setDrawRange(0, 2 * nSeg);
    heroLineMat.color.copy(GRAPHITE).lerp(GOLD, night); heroLineMat.opacity = mix(mix(.92, .5, night), .55, toMap);
    dimMat.color.copy(GRAPHITE).lerp(WHITE, night); dimMat.opacity = .75 * Math.min(1, pDraw * 1.5) * (1 - sstep(0, .25, t));
    beacon.material.opacity = sstep(.6, 1, alive) * (.5 + .5 * Math.sin(now / 260));
    craneMat.color.copy(GRAPHITE).lerp(tmpC.set(0xd8b46a), night); craneMat.opacity = .85 * pPlan * (1 - sstep(.15, .5, t)); jib.rotation.y = reduce ? .6 : Math.sin(now / 4000) * .7 + .6;
    wheelMat.opacity = .6 * toMap;
    pinMat.opacity = .75 * lab;
    const beamH = 1.2 * hsc + .6;
    for (const p of pins) { const on = p.a.id === sel; p.beam.scale.y = beamH; p.rg.material.opacity = lab * (on ? .9 : .4); p.rg.scale.setScalar(on ? 1.2 + .15 * Math.sin(now / 300) : 1); }

    // draw only into the window's box
    const sx = Math.max(0, r.left), sy = Math.max(0, innerHeight - r.bottom), sw = Math.min(innerWidth, r.right) - sx, sh = Math.min(innerHeight, innerHeight - r.top) - sy;
    R.setViewport(r.left, innerHeight - r.bottom, r.width, r.height); R.setScissor(sx, sy, Math.max(1, sw), Math.max(1, sh));
    R.setClearColor(clr, 1); R.render(scene, cam);

    // the pencil tip follows the stroke being drawn
    const drawing = nDone < heroSegs.length - .5 && alive < .02;
    pencil.style.opacity = drawing ? 1 : 0;
    if (drawing) { const [a0, a1] = segAt(nSeg), f = nDone - nSeg;
      const [px, py] = toScreen(mix(a0[0], a1[0], f), mix(a0[1], a1[1], f), mix(a0[2], a1[2], f), r);
      pencil.style.transform = `translate(${(px - 10).toFixed(1)}px,${(py - 36).toFixed(1)}px)`; }

    // labels: above each pin, pushed up when they would overlap, with a thin leader line
    ui.classList.toggle("labels", lab > .02); ui.style.setProperty("--lab", lab.toFixed(3));
    if (lab > .02) {
      if (!sizes) sizes = btns.map(b => [b.offsetWidth, b.offsetHeight]);
      const order = pins.map((p, i) => { const [x, y, ok] = toScreen(p.x, beamH, p.z, r); return { i, x, y, ok }; }).sort((a, b) => b.y - a.y), placed = [];
      for (const o of order) {
        const [w, h] = sizes[o.i]; let bx = o.x - w / 2, by = o.y - h - 6;
        bx = clamp(bx, r.left + 6, r.right - w - 6); by = clamp(by, r.top + 6, Math.min(r.bottom, innerHeight - 80) - h - 6);
        for (let k = 0; k < 12; k++) { const hit = placed.find(q => bx < q[0] + q[2] + 4 && bx + w + 4 > q[0] && by < q[1] + q[3] + 3 && by + h + 3 > q[1]); if (!hit) break; by = hit[1] - h - 4; }
        placed.push([bx, by, w, h]);
        btns[o.i].style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px)`; btns[o.i].style.visibility = o.ok ? "" : "hidden";
        const ln = lines[o.i]; ln.setAttribute("x1", o.x); ln.setAttribute("y1", o.y); ln.setAttribute("x2", bx + w / 2); ln.setAttribute("y2", by + h);
      }
    }
    // handwritten notes on the drawing
    const nv = pDraw * (1 - sstep(.02, .25, t));
    ui.style.setProperty("--note", nv.toFixed(3)); ui.style.setProperty("--paper", (1 - night).toFixed(3));
    if (nv > .01) {
      const spots = { top: [DX + .12, 3.9 * hsc, DZ], base: [DX + .12, .05, DZ], plan: [BX + Math.cos(-.35 - 1.0472) * 1.3, .02, BZ + Math.sin(-.35 - 1.0472) * 1.3] };
      notes.forEach(n => { const [x, y] = toScreen(...spots[n.dataset.n], r); n.style.transform = `translate(${x.toFixed(1)}px,${(y - 8).toFixed(1)}px)`; });
    }
  }
  requestAnimationFrame(frame);
}
