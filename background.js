/*
 * Animation de fond discrète (p5.js, mode instance).
 * Réseau de particules qui dérivent doucement et se relient quand elles
 * sont proches, dans la couleur d'accent du site. Volontairement léger :
 * faible opacité, densité de pixels bridée, pause quand l'onglet est caché,
 * et désactivé si l'utilisateur préfère moins d'animations.
 */
(function () {
  if (typeof p5 === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sketch = (p) => {
    let particles = [];
    let rgb = [31, 95, 91]; // fallback = --accent
    let mouse = { x: -9999, y: -9999, active: false };
    // "Lumière" au curseur : baseX/baseY suit la souris (avec retard),
    // x/y = position réellement affichée = base + décalage vers les
    // particules proches, intensity = apparition/disparition en fondu.
    let light = { baseX: -9999, baseY: -9999, x: -9999, y: -9999, intensity: 0 };

    const LINK_DIST = 130;   // distance max pour relier deux particules
    const MOUSE_DIST = 170;  // rayon d'influence du curseur

    const readAccent = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim();
      const c = p.color(raw || '#1f5f5b');
      return [p.red(c), p.green(c), p.blue(c)];
    };

    const targetCount = () => {
      const n = Math.floor((p.width * p.height) / 17000);
      return Math.max(26, Math.min(84, n));
    };

    const makeParticle = () => ({
      x: p.random(p.width),
      y: p.random(p.height),
      vx: p.random(-0.28, 0.28),
      vy: p.random(-0.28, 0.28),
      r: p.random(1.4, 2.6),
    });

    const syncParticles = () => {
      const want = targetCount();
      while (particles.length < want) particles.push(makeParticle());
      if (particles.length > want) particles.length = want;
    };

    p.setup = () => {
      const c = p.createCanvas(p.windowWidth, p.windowHeight);
      c.parent('p5-bg');
      p.pixelDensity(1); // fond décoratif : inutile de surcharger les écrans HiDPI
      rgb = readAccent();
      syncParticles();

      if (prefersReduced) {
        p.noLoop();
        p.redraw(); // une seule image statique, sans mouvement
      }
    };

    p.draw = () => {
      p.clear();
      const r = Math.round(rgb[0]);
      const g = Math.round(rgb[1]);
      const b = Math.round(rgb[2]);

      // --- 1. Position de la lumière -------------------------------------
      // Fondu d'apparition / disparition
      const target = mouse.active ? 1 : 0;
      light.intensity += (target - light.intensity) * 0.08;

      // Suivi de la souris avec un léger retard (uniquement quand active,
      // pour que la lumière s'éteigne sur place au lieu de filer au coin)
      if (mouse.active) {
        if (light.baseX < -1000) {
          light.baseX = mouse.x;
          light.baseY = mouse.y;
        }
        light.baseX = p.lerp(light.baseX, mouse.x, 0.18);
        light.baseY = p.lerp(light.baseY, mouse.y, 0.18);
      }

      // Décalage vers les particules proches : c'est ce qui fait "bouger"
      // la lumière quand elle interagit avec le réseau.
      let ax = 0;
      let ay = 0;
      let near = 0;
      for (const a of particles) {
        const d = p.dist(a.x, a.y, light.baseX, light.baseY);
        if (d < MOUSE_DIST) {
          const w = 1 - d / MOUSE_DIST;
          ax += (a.x - light.baseX) * w;
          ay += (a.y - light.baseY) * w;
          near++;
        }
      }
      if (near > 0) {
        ax /= near;
        ay /= near;
      }
      let ox = ax * 0.35;
      let oy = ay * 0.35;
      const olen = Math.hypot(ox, oy);
      const maxPull = 16; // décalage max en pixels
      if (olen > maxPull) {
        ox = (ox / olen) * maxPull;
        oy = (oy / olen) * maxPull;
      }
      light.x = light.baseX + ox;
      light.y = light.baseY + oy;

      const lit = light.intensity > 0.02;

      // --- 2. Halo diffus (derrière le réseau) ---------------------------
      if (lit) {
        const pulse = 1 + 0.09 * Math.sin(p.frameCount * 0.06);
        const R = 46 * pulse;
        p.noStroke();
        for (let k = 5; k >= 1; k--) {
          p.fill(r, g, b, 9 * light.intensity); // s'empile => centre plus clair
          p.circle(light.x, light.y, R * (k / 5) * 2);
        }
      }

      // --- 3. Liens entre particules proches -----------------------------
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        if (!prefersReduced) {
          a.x += a.vx;
          a.y += a.vy;
          // rebouclage doux sur les bords
          if (a.x < -20) a.x = p.width + 20;
          if (a.x > p.width + 20) a.x = -20;
          if (a.y < -20) a.y = p.height + 20;
          if (a.y > p.height + 20) a.y = -20;
        }

        for (let j = i + 1; j < particles.length; j++) {
          const c2 = particles[j];
          const d = p.dist(a.x, a.y, c2.x, c2.y);
          if (d < LINK_DIST) {
            const alpha = p.map(d, 0, LINK_DIST, 42, 0);
            p.stroke(r, g, b, alpha);
            p.strokeWeight(1);
            p.line(a.x, a.y, c2.x, c2.y);
          }
        }
      }

      // --- 4. Liens du réseau vers la lumière ----------------------------
      if (lit) {
        for (const a of particles) {
          const dm = p.dist(a.x, a.y, light.x, light.y);
          if (dm < MOUSE_DIST) {
            const alpha = p.map(dm, 0, MOUSE_DIST, 70, 0) * light.intensity;
            p.stroke(r, g, b, alpha);
            p.strokeWeight(1);
            p.line(a.x, a.y, light.x, light.y);
          }
        }
      }

      // --- 5. Points du réseau -------------------------------------------
      p.noStroke();
      for (const a of particles) {
        p.fill(r, g, b, 78);
        p.circle(a.x, a.y, a.r * 2);
      }

      // --- 6. Cœur lumineux net (par-dessus tout) ------------------------
      if (lit) {
        const ctx = p.drawingContext;
        ctx.save();
        ctx.shadowBlur = 22 * light.intensity;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.7 * light.intensity})`;
        p.noStroke();
        p.fill(r, g, b, 200 * light.intensity);
        p.circle(light.x, light.y, 7);
        ctx.restore();
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      syncParticles();
      if (prefersReduced) p.redraw();
    };

    // Suivi de la souris au niveau de la fenêtre (le canvas est en
    // pointer-events:none, il ne reçoit donc pas les évènements lui-même).
    if (!prefersReduced) {
      window.addEventListener(
        'mousemove',
        (e) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
          mouse.active = true;
        },
        { passive: true }
      );
      window.addEventListener('mouseout', () => {
        mouse.active = false;
      });

      // Pause quand l'onglet n'est pas visible (perf + batterie)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) p.noLoop();
        else p.loop();
      });
    }
  };

  new p5(sketch);
})();
