/*
 * Logan Chu — portfolio interactions
 *
 * One rAF loop drives every effect. Scroll handlers only record scrollY;
 * all reads/writes happen inside the frame so we never thrash layout.
 *
 * Effects, in order of appearance:
 *   1. Hero collapse   — FLIP the hero title into the navbar as you scroll
 *   2. Cursor reveal   — a colour disc tracks the pointer over art + portrait
 *   3. Horizontal pan  — vertical scroll pans the work track, cards drift
 *   4. Column slider   — four vertical marquees, alternating direction
 */

(function () {
    'use strict';

    // ------------------------------------------------------------------ utils

    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var FINE = matchMedia('(pointer: fine)').matches;
    var HOVERS = matchMedia('(hover: hover)').matches;

    if (REDUCED) document.body.classList.add('reduced');
    if (!HOVERS) document.body.classList.add('no-hover');

    // Modules registered here are ticked once per frame.
    var frameTasks = [];
    var onFrame = function (fn) { frameTasks.push(fn); };

    // ------------------------------------------------------------------ theme

    (function theme() {
        var btn = $('#themeToggle');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
            document.documentElement.dataset.theme = next;
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    }());

    // ------------------------------------------------- external links + nav state

    (function links() {
        $$('a[href^="http"]').forEach(function (a) {
            if (a.hostname === location.hostname) return;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
    }());

    // -------------------------------------------------------------- reveal-on-scroll

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
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
        els.forEach(function (el) { io.observe(el); });
    }());

    // -------------------------------------------------------------- custom cursor

    (function cursor() {
        if (!FINE || REDUCED) return;
        var ring = $('.cursor-ring');
        var dot = $('.cursor-dot');
        if (!ring || !dot) return;

        var tx = innerWidth / 2, ty = innerHeight / 2;
        var rx = tx, ry = ty;
        var live = false;

        addEventListener('pointermove', function (e) {
            tx = e.clientX; ty = e.clientY;
            if (!live) {
                live = true;
                rx = tx; ry = ty;
                document.body.classList.add('cursor-live');
            }
        }, { passive: true });

        addEventListener('pointerdown', function () { document.body.classList.add('cursor-hot'); });
        addEventListener('pointerup', function () { document.body.classList.remove('cursor-hot'); });

        // Grow the ring over anything clickable.
        var HOT = 'a, button, .wcard, .chip';
        addEventListener('pointerover', function (e) {
            if (e.target.closest && e.target.closest(HOT)) document.body.classList.add('cursor-hot');
        }, { passive: true });
        addEventListener('pointerout', function (e) {
            if (e.target.closest && e.target.closest(HOT)) document.body.classList.remove('cursor-hot');
        }, { passive: true });

        onFrame(function () {
            if (!live) return;
            rx = lerp(rx, tx, 0.18);
            ry = lerp(ry, ty, 0.18);
            ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
            dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
        });
    }());

    // ------------------------------------------------- nav state + scroll progress

    (function progress() {
        var nav = $('#nav');
        var bar = $('#progress');
        var stuck = false;

        onFrame(function () {
            var y = scrollY;
            var isStuck = y > 10;
            if (nav && isStuck !== stuck) {
                stuck = isStuck;
                nav.classList.toggle('is-stuck', stuck);
            }
            if (bar) {
                var max = document.documentElement.scrollHeight - innerHeight;
                bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
            }
        });
    }());

    // ================================================================== 1. HERO

    (function hero() {
        var section = $('#hero');
        var title = $('#heroTitle');
        var brand = $('#navBrand');
        var stage = section && $('.hero-stage', section);
        if (!section || !title || !brand || !stage) return;

        // --- split the title so each glyph can rise in on load ---------------
        if (!REDUCED) {
            var text = title.textContent;
            var html = '';
            for (var i = 0; i < text.length; i++) {
                // A literal space inside an inline-block collapses to zero
                // width, which would break the FLIP measurement; use nbsp.
                var ch = text[i] === ' ' ? ' ' : text[i];
                html += '<span class="char" style="animation-delay:' + (i * 42 + 120) + 'ms">' + ch + '</span>';
            }
            title.innerHTML = html;
        }

        if (REDUCED) {
            brand.style.opacity = 1;
            brand.style.pointerEvents = 'auto';
            return;
        }

        brand.style.transition = 'none';

        // --- FLIP measurement: hero title -> nav brand -----------------------
        var flip = { dx: 0, dy: 0, s: 1 };

        function measure() {
            title.style.transform = 'none';
            var a = title.getBoundingClientRect();
            var b = brand.getBoundingClientRect();
            var fa = parseFloat(getComputedStyle(title).fontSize) || 1;
            var fb = parseFloat(getComputedStyle(brand).fontSize) || 1;
            flip.s = fb / fa;
            flip.dx = b.left - a.left;
            flip.dy = b.top - a.top;
            // measure() clears the transform, so force the next frame to
            // rewrite it even if the scroll position has not changed.
            lastP = -1;
        }

        measure();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
        addEventListener('resize', measure);

        // --- pointer spotlight over the dot grid -----------------------------
        var spot = { x: 50, y: 50, r: 0, tx: 50, ty: 50, tr: 0 };
        // Portrait colour disc is driven by the same pointer, in portrait space.
        var portrait = $('#portrait');
        var pr = { x: 50, y: 50, r: 0, tx: 50, ty: 50, tr: 0 };

        if (HOVERS) {
            stage.addEventListener('pointermove', function (e) {
                var r = stage.getBoundingClientRect();
                spot.tx = ((e.clientX - r.left) / r.width) * 100;
                spot.ty = ((e.clientY - r.top) / r.height) * 100;
                spot.tr = 300;

                if (portrait) {
                    var q = portrait.getBoundingClientRect();
                    pr.tx = ((e.clientX - q.left) / q.width) * 100;
                    pr.ty = ((e.clientY - q.top) / q.height) * 100;
                    pr.tr = 155;
                }
            }, { passive: true });

            stage.addEventListener('pointerleave', function () {
                spot.tr = 0;
                pr.tr = 0;
            });
        } else if (portrait) {
            // No hover: skip the reveal entirely rather than leave it grey.
            var col = $('.layer-color', portrait);
            if (col) { col.style.webkitMaskImage = 'none'; col.style.maskImage = 'none'; }
        }

        var lastP = -1;

        onFrame(function () {
            var rect = section.getBoundingClientRect();
            var total = section.offsetHeight - innerHeight;
            var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

            if (p !== lastP) {
                lastP = p;
                section.style.setProperty('--hp', p.toFixed(4));

                var s = 1 + (flip.s - 1) * p;
                title.style.transform =
                    'translate3d(' + (flip.dx * p).toFixed(2) + 'px,' +
                    (flip.dy * p).toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';

                // Hand off from the hero title to the real nav brand at the end.
                var hand = clamp((p - 0.88) / 0.12, 0, 1);
                title.style.opacity = 1 - hand;
                brand.style.opacity = hand;
                brand.style.pointerEvents = hand > 0.5 ? 'auto' : 'none';
            }

            // Spotlight + portrait reveal lerps (run every frame for smoothness).
            spot.x = lerp(spot.x, spot.tx, 0.12);
            spot.y = lerp(spot.y, spot.ty, 0.12);
            spot.r = lerp(spot.r, spot.tr, 0.09);
            stage.style.setProperty('--mx', spot.x.toFixed(2) + '%');
            stage.style.setProperty('--my', spot.y.toFixed(2) + '%');
            stage.style.setProperty('--spot', spot.r.toFixed(1) + 'px');

            if (portrait && HOVERS) {
                pr.x = lerp(pr.x, pr.tx, 0.16);
                pr.y = lerp(pr.y, pr.ty, 0.16);
                pr.r = lerp(pr.r, pr.tr, 0.11);
                portrait.style.setProperty('--rx', pr.x.toFixed(2) + '%');
                portrait.style.setProperty('--ry', pr.y.toFixed(2) + '%');
                portrait.style.setProperty('--rr', pr.r.toFixed(1) + 'px');
            }
        });
    }());

    // ========================================== 2. ACTIVE WORK (horizontal pan)

    (function activeWork() {
        var section = $('#work');
        if (!section || REDUCED) return;

        var track = $('#workTrack');
        var viewport = $('#workViewport');
        var ghost = $('#workGhost');
        var rail = $('#workRail');
        var counter = $('#workCount');
        var cards = $$('.wcard', track);
        if (!track || !viewport || !cards.length) return;

        var enabled = false;
        var dist = 0;
        var shown = -1;

        function layout() {
            enabled = innerWidth > 900;
            if (!enabled) {
                section.style.height = '';
                track.style.setProperty('--tx', '0px');
                if (ghost) ghost.style.setProperty('--gx', '0px');
                return;
            }
            // Cards never resize, so this is measured once and stays true.
            dist = Math.max(0, track.scrollWidth - viewport.clientWidth);
            // 1:1 — one pixel of scroll is one pixel of pan. The track can
            // therefore never outrun the scroll or snap to the end.
            section.style.height = (innerHeight + dist) + 'px';
        }

        layout();
        addEventListener('resize', layout);
        addEventListener('load', layout);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

        // Pointer state per card for the colour reveal. Purely visual — it
        // never touches layout, so it cannot feed back into the pan.
        var reveals = [];
        if (HOVERS) {
            cards.forEach(function (card) {
                var st = { el: card, x: 50, y: 50, r: 0, tx: 50, ty: 50, tr: 0, on: false };
                card.addEventListener('pointermove', function (e) {
                    var r = card.getBoundingClientRect();
                    st.tx = ((e.clientX - r.left) / r.width) * 100;
                    st.ty = ((e.clientY - r.top) / r.height) * 100;
                    st.tr = 190;
                    st.on = true;
                }, { passive: true });
                card.addEventListener('pointerleave', function () { st.tr = 0; });
                reveals.push(st);
            });
        }

        onFrame(function () {
            if (!enabled) return;

            var rect = section.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > innerHeight) return;

            var total = section.offsetHeight - innerHeight;
            var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

            track.style.setProperty('--tx', (-dist * p).toFixed(2) + 'px');
            if (ghost) ghost.style.setProperty('--gx', (-dist * p * 0.35).toFixed(2) + 'px');
            if (rail) rail.style.setProperty('--wp', p.toFixed(4));

            // Depth: each card drifts a little against the track as it
            // crosses, so the row separates into layers instead of sliding
            // as one rigid block.
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                var r = card.getBoundingClientRect();
                if (r.right < -240 || r.left > innerWidth + 240) continue;
                var t = (r.left + r.width / 2) / innerWidth;   // 1 -> 0 moving left
                var depth = parseFloat(card.style.getPropertyValue('--depth')) || 14;
                card.style.setProperty('--ox', ((t - 0.5) * depth).toFixed(1) + 'px');
            }

            // Which card is nearest the middle of the viewport, for the counter.
            if (counter) {
                var best = 0, bestD = Infinity;
                for (var k = 0; k < cards.length; k++) {
                    var cr = cards[k].getBoundingClientRect();
                    var d = Math.abs((cr.left + cr.width / 2) - innerWidth / 2);
                    if (d < bestD) { bestD = d; best = k; }
                }
                if (best !== shown) {
                    shown = best;
                    counter.textContent = ('0' + (best + 1)).slice(-2);
                }
            }

            for (var j = 0; j < reveals.length; j++) {
                var st = reveals[j];
                if (!st.on) continue;
                st.x = lerp(st.x, st.tx, 0.2);
                st.y = lerp(st.y, st.ty, 0.2);
                st.r = lerp(st.r, st.tr, 0.14);
                if (st.tr === 0 && st.r < 0.6) { st.r = 0; st.on = false; }
                st.el.style.setProperty('--rx', st.x.toFixed(2) + '%');
                st.el.style.setProperty('--ry', st.y.toFixed(2) + '%');
                st.el.style.setProperty('--rr', st.r.toFixed(1) + 'px');
            }
        });
    }());

    // ================================================== 3. COLUMN SLIDER (skills)

    (function columnSlider() {
        var wrap = $('#columns');
        if (!wrap || REDUCED) return;

        var cols = [];
        var built = false;

        // The loop period is the measured height of one un-cloned column. That
        // measurement is only valid once webfonts have swapped in — measuring
        // at parse time yields a short period and a visible seam in the loop.
        function build() {
            if (built) return;
            var gap = parseFloat(getComputedStyle(wrap).gap) || 12;

            cols = $$('.col', wrap).map(function (col) {
                var inner = $('.col-inner', col);
                var period = inner.getBoundingClientRect().height + gap;
                if (period < 2) return null;

                // Clone until the strip covers the frame at any offset. The
                // spare copy absorbs the taller frame used at <900px.
                var copies = Math.max(2, Math.ceil((col.clientHeight + period) / period) + 2);
                var seed = inner.innerHTML;
                for (var i = 1; i < copies; i++) inner.insertAdjacentHTML('beforeend', seed);

                return {
                    inner: inner,
                    period: period,
                    speed: parseFloat(col.dataset.speed) || 20,   // px per second
                    dir: parseFloat(col.dataset.dir) || -1,
                    y: 0
                };
            }).filter(Boolean);

            built = cols.length > 0;
        }

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
        else build();
        setTimeout(build, 1200);   // fallback if fonts.ready never settles

        // Hover slows the whole block to a crawl so labels are readable.
        var hoverT = 1, hover = 1;
        wrap.addEventListener('pointerenter', function () { hoverT = 0.12; });
        wrap.addEventListener('pointerleave', function () { hoverT = 1; });

        // Scroll velocity gives the columns a momentary shove.
        var lastY = scrollY, boost = 0, last = 0;

        onFrame(function (now) {
            if (!built) return;

            var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
            last = now;

            var dv = Math.abs(scrollY - lastY);
            lastY = scrollY;
            boost = boost * 0.90 + Math.min(dv, 70) * 0.018;
            hover = lerp(hover, hoverT, 0.08);

            var mul = (1 + boost) * hover;

            for (var i = 0; i < cols.length; i++) {
                var c = cols[i];
                c.y += c.dir * c.speed * mul * dt;
                while (c.y <= -c.period) c.y += c.period;
                while (c.y > 0) c.y -= c.period;
                c.inner.style.setProperty('--y', c.y.toFixed(2) + 'px');
            }
        });
    }());

    // ------------------------------------------------------------------ the loop

    (function loop() {
        if (!frameTasks.length) return;
        var run = function (now) {
            for (var i = 0; i < frameTasks.length; i++) frameTasks[i](now);
            requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
    }());

}());
