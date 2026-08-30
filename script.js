/*
 * Logan Chu — portfolio interactions
 *
 * Deliberately small. One rAF loop owns everything that reads scroll
 * position, so nothing thrashes layout.
 *
 *   1. Theme toggle       — persisted, resolved pre-paint in index.html
 *   2. External links     — open off-site links in a new tab
 *   3. Reveal on scroll   — one IntersectionObserver, fires once per element
 *   4. Nav state          — hairline on scroll, current section underlined
 *   5. Work count         — keeps the section total honest as cards change
 *   6. Falling keys       — a piano roll raining down behind the page
 *   7. Paging             — one screen per gesture, glided rather than snapped
 *   8. Back to top        — taken as a jump shot
 */

(function () {
    'use strict';

    var $  = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Modules registered here are ticked at most once per frame, and only on
    // frames where something they care about actually moved — so an idle page
    // does no layout reads at all.
    var frameTasks = [];
    var dirty = true;
    var onFrame = function (fn) { frameTasks.push(fn); };
    var invalidate = function () { dirty = true; };

    addEventListener('scroll', invalidate, { passive: true });
    addEventListener('resize', invalidate, { passive: true });
    addEventListener('load', invalidate);

    // --------------------------------------------------------------- 1. theme

    (function theme() {
        var btn = $('#themeToggle');
        if (!btn) return;

        btn.addEventListener('click', function () {
            var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
            document.documentElement.dataset.theme = next;
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    }());

    // ------------------------------------------------------- 2. external links

    (function links() {
        $$('a[href^="http"]').forEach(function (a) {
            if (a.hostname === location.hostname) return;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
    }());

    // ---------------------------------------------------- 3. reveal on scroll

    (function reveal() {
        var els = $$('[data-reveal]');
        if (!els.length) return;

        if (REDUCED || !('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('in'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                e.target.classList.add('in');
                io.unobserve(e.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

        els.forEach(function (el) { io.observe(el); });
    }());

    // ------------------------------------------------------------- 4. nav state

    (function nav() {
        var bar = $('#nav');
        if (!bar) return;

        var links = $$('.nav-links a[href^="#"]');
        var targets = links
            .map(function (a) {
                return { link: a, el: document.getElementById(a.getAttribute('href').slice(1)) };
            })
            .filter(function (t) { return t.el; });

        var stuck = false;
        var current = null;

        onFrame(function () {
            var y = scrollY;

            var want = y > 8;
            if (want !== stuck) {
                stuck = want;
                bar.classList.toggle('is-stuck', stuck);
            }

            // Probe a third of the way down rather than right under the navbar,
            // so the highlight follows what you are actually reading.
            var mark = y + Math.min(innerHeight * 0.35, 280);
            var found = null;
            for (var i = 0; i < targets.length; i++) {
                var box = targets[i].el.getBoundingClientRect();
                var top = box.top + y;
                if (mark >= top && mark < top + box.height) found = targets[i].link;
            }

            // At the very bottom the probe can still sit above the last
            // section, so the footer would highlight the wrong link.
            var max = document.documentElement.scrollHeight - innerHeight;
            if (max > 0 && y >= max - 2 && targets.length) {
                found = targets[targets.length - 1].link;
            }

            if (found !== current) {
                if (current) current.classList.remove('is-here');
                if (found) found.classList.add('is-here');
                current = found;
            }
        });
    }());

    // ----------------------------------------------------------- 5. work count
    // The section total is written into the HTML so it is right without JS, but
    // the weekly routine only has to add or remove a .wcard — this keeps the
    // number in step either way.

    (function workCount() {
        var rail = $('#workRail');
        var track = $('#workTrack');
        if (!rail || !track) return;

        var out = $('.count', rail);
        var n = $$('.wcard', track).length;
        if (out && n) out.textContent = n < 10 ? '0' + n : String(n);
    }());

    // -------------------------------------------------------- 6. falling keys
    // A piano roll behind the page. Lanes follow the chromatic pattern, so the
    // accidentals land where a keyboard would put them; notes are drawn onto
    // three planes that fall at different rates, and each plane's pattern
    // repeats every CYCLE px, so translating by (scroll x rate) mod CYCLE
    // rains keys down the page and rejoins itself without a seam.

    (function keyfall() {
        var layer = $('#keyfall');
        if (!layer) return;

        var CYCLE = 760;               // px of pattern before it repeats
        var LANE  = 46;                // lane pitch, px
        var BLACK = [1, 3, 6, 8, 10];  // the accidentals in a chromatic octave
        var PLANES = [
            { cls: 'is-far',  rate: 0.06 },
            { cls: 'is-mid',  rate: 0.13 },
            { cls: 'is-near', rate: 0.22 }
        ];

        var planes = [];
        var lastW = -1, lastH = -1;

        // Deterministic, so a resize rebuilds the same sky rather than a new one.
        function rand(seed) {
            var x = Math.sin(seed * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        }

        function build(w, h) {
            layer.textContent = '';
            planes = [];

            var lanes = Math.ceil(w / LANE) + 1;
            var reps = Math.ceil((h + CYCLE) / CYCLE) + 1;

            for (var p = 0; p < PLANES.length; p++) {
                var plane = document.createElement('div');
                plane.className = 'kf-plane ' + PLANES[p].cls;
                plane.style.top = (-CYCLE) + 'px';
                plane.style.height = (reps * CYCLE) + 'px';

                for (var i = 0; i < lanes; i++) {
                    var seed = p * 131 + i * 7 + 1;
                    if (rand(seed) > 0.26) continue;   // not every lane sounds

                    var black = BLACK.indexOf(i % 12) !== -1;
                    var nw = black ? LANE - 22 : LANE - 12;
                    var left = i * LANE + (LANE - nw) / 2;
                    var top = rand(seed + 1) * (CYCLE - 170);
                    var tall = 44 + rand(seed + 2) * 130;

                    // Drawn once per repeat, so the loop has no visible seam.
                    for (var r = 0; r < reps; r++) {
                        var note = document.createElement('span');
                        note.className = black ? 'kf-note is-black' : 'kf-note';
                        note.style.cssText =
                            'left:' + left.toFixed(1) + 'px;' +
                            'width:' + nw + 'px;' +
                            'top:' + (top + r * CYCLE).toFixed(1) + 'px;' +
                            'height:' + tall.toFixed(0) + 'px';
                        plane.appendChild(note);
                    }
                }

                layer.appendChild(plane);
                planes.push({ el: plane, rate: PLANES[p].rate });
            }
        }

        onFrame(function () {
            var w = layer.clientWidth;
            var h = layer.clientHeight;
            if (w !== lastW || h !== lastH) { build(w, h); lastW = w; lastH = h; }

            // Under reduced motion the keys are simply there, and hold still.
            if (REDUCED) return;

            for (var i = 0; i < planes.length; i++) {
                planes[i].el.style.transform = 'translate3d(0,' +
                    ((scrollY * planes[i].rate) % CYCLE).toFixed(1) + 'px,0)';
            }
        });
    }());

    // ------------------------------------------------------------- 7. paging
    // Above 900px the page moves a screen at a time. The browser's own snap
    // lands in a single frame, which reads as a jump, so this takes the wheel
    // and glides instead: one gesture, one screen, eased over GLIDE ms, with
    // snapping switched off for the duration so it cannot tug against the
    // animation. A section taller than its screen scrolls through itself
    // first, so nothing is ever out of reach.

    (function paging() {
        if (REDUCED) return;

        var pages = $$('main > section');
        var foot = $('.footer');
        if (foot) pages.push(foot);        // so the tail stays reachable
        if (pages.length < 2) return;

        var wide = matchMedia('(min-width: 901px)');
        var NAV = 74;      // the snap offset the stylesheet uses
        var GLIDE = 900;   // ms to cross one screen
        var REST = 140;    // ms of quiet after, to swallow trackpad inertia

        var root = document.documentElement;
        var busy = false;
        var idle = 0;

        function ease(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        // Whichever page sits nearest the top is the one we are on, so anchor
        // links and the back-to-top shot stay in step with no bookkeeping.
        function current() {
            var best = 0, near = Infinity;
            for (var i = 0; i < pages.length; i++) {
                var d = Math.abs(pages[i].getBoundingClientRect().top - NAV);
                if (d < near) { near = d; best = i; }
            }
            return best;
        }

        function glideTo(i) {
            if (i < 0 || i >= pages.length) return;

            var from = scrollY;
            var max = document.documentElement.scrollHeight - innerHeight;
            var to = Math.max(0, Math.min(max,
                pages[i].getBoundingClientRect().top + scrollY - NAV));
            if (Math.abs(to - from) < 2) return;

            busy = true;
            root.style.scrollSnapType = 'none';
            var t0 = performance.now();

            requestAnimationFrame(function step(now) {
                var t = Math.min(1, (now - t0) / GLIDE);
                scrollTo({ top: from + (to - from) * ease(t), behavior: 'instant' });

                if (t < 1) { requestAnimationFrame(step); return; }
                root.style.scrollSnapType = '';
                idle = performance.now() + REST;
                busy = false;
            });
        }

        addEventListener('wheel', function (e) {
            if (!wide.matches || e.ctrlKey) return;   // a pinch-zoom is not a page turn

            var dir = e.deltaY > 0 ? 1 : (e.deltaY < 0 ? -1 : 0);
            if (!dir) return;

            // An overlong section reads through itself before the page turns.
            var sec = pages[current()];
            if (sec.scrollHeight > sec.clientHeight + 1) {
                var atTop = sec.scrollTop <= 0;
                var atEnd = sec.scrollTop + sec.clientHeight >= sec.scrollHeight - 1;
                if ((dir > 0 && !atEnd) || (dir < 0 && !atTop)) return;
            }

            e.preventDefault();
            if (busy || performance.now() < idle) return;
            glideTo(current() + dir);
        }, { passive: false });
    }());

    // ----------------------------------------- 8. back to top, taken as a shot
    // The hoop appears only in the back half of the page. Clicking it takes the
    // shot, and the page follows the ball up.

    (function hoop() {
        var btn = $('#hoop');
        if (!btn) return;

        var ballEl = $('.hoop-ball', btn);
        var shown = false;
        var firing = false;
        var scrolled = false;

        onFrame(function () {
            var max = document.documentElement.scrollHeight - innerHeight;
            var want = max > 0 && scrollY / max > 0.55;
            if (want !== shown) {
                shown = want;
                btn.classList.toggle('is-in', shown);
            }
        });

        function toTop() {
            scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
        }

        // Quadratic through release, apex, and the front of the rim; then a
        // short straight drop through the net.
        var P0 = [-54, 90], P1 = [-14, -60], P2 = [32, 14];
        var THROUGH = 46, UP = 620, DROP = 240;

        btn.addEventListener('click', function () {
            if (REDUCED || !ballEl) { toTop(); return; }
            if (firing) return;

            firing = true;
            scrolled = false;
            ballEl.style.opacity = '1';
            var t0 = performance.now();

            requestAnimationFrame(function step(now) {
                var ms = now - t0;

                if (ms < UP) {
                    var t = ms / UP;
                    var u = 1 - t;
                    var x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0];
                    var y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
                    ballEl.style.transform =
                        'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) ' +
                        'rotate(' + (-t * 430).toFixed(1) + 'deg)';
                    requestAnimationFrame(step);
                    return;
                }

                if (ms < UP + DROP) {
                    var d = (ms - UP) / DROP;
                    if (d < 0.08) btn.classList.add('swish');
                    var y2 = P2[1] + (THROUGH - P2[1]) * d;
                    ballEl.style.transform =
                        'translate(' + P2[0] + 'px,' + y2.toFixed(1) + 'px) ' +
                        'rotate(' + (-430 - d * 130).toFixed(1) + 'deg) ' +
                        'scale(' + (1 - d * 0.3).toFixed(3) + ')';
                    ballEl.style.opacity = (1 - Math.max(0, d - 0.4) / 0.6).toFixed(3);
                    // The page leaves as the ball clears the rim.
                    if (!scrolled && d > 0.3) { scrolled = true; toTop(); }
                    requestAnimationFrame(step);
                    return;
                }

                ballEl.style.opacity = '0';
                ballEl.style.transform = '';
                btn.classList.remove('swish');
                firing = false;
                if (!scrolled) toTop();
            });
        });
    }());

    // ------------------------------------------------------------ frame loop

    (function tick() {
        if (dirty) {
            dirty = false;
            for (var i = 0; i < frameTasks.length; i++) frameTasks[i]();
        }
        requestAnimationFrame(tick);
    }());

}());
