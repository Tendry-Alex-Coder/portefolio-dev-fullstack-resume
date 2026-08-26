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
      const [r, g, b] = rgb;

      // Liens entre particules proches
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

        // Lien discret vers le curseur
        if (mouse.active) {
          const dm = p.dist(a.x, a.y, mouse.x, mouse.y);
          if (dm < MOUSE_DIST) {
            const alpha = p.map(dm, 0, MOUSE_DIST, 60, 0);
            p.stroke(r, g, b, alpha);
            p.strokeWeight(1);
            p.line(a.x, a.y, mouse.x, mouse.y);
          }
        }
      }

      // Points par-dessus les liens
      p.noStroke();
      for (const a of particles) {
        p.fill(r, g, b, 78);
        p.circle(a.x, a.y, a.r * 2);
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
