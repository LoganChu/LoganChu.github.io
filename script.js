/* 
 * Minimal JavaScript for multi-page portfolio
 * Philosophy: Only add functionality that enhances UX
 * No unnecessary animations or bloat.
 */

(function() {
    'use strict';

    // ========================================================================
    // ACTIVE NAVIGATION HIGHLIGHTING
    // ========================================================================
    // Highlight the current page in navigation

    document.addEventListener('DOMContentLoaded', function() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-links a');
        const navTitle = document.querySelector('.nav-title');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show name on pages that are not the about page
        if (navTitle) {
            if (currentPage !== 'index.html' && currentPage !== '') {
                navTitle.textContent = 'Logan Chu';
                navTitle.setAttribute('href', 'index.html');
                navTitle.style.display = 'inline-block';
            } else {
                navTitle.style.display = 'none';
            }
        }
    });

    // ========================================================================
    // EXTERNAL LINKS
    // ========================================================================
    // Open external links in new tab

    document.addEventListener('DOMContentLoaded', function() {
        const externalLinks = document.querySelectorAll('a[href^="http"]');
        
        externalLinks.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    });

    // ========================================================================
    // SMOOTH SCROLL (for any hash links within page)
    // ========================================================================
    
    document.addEventListener('DOMContentLoaded', function() {
        const hashLinks = document.querySelectorAll('a[href^="#"]');
        
        hashLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#' && href !== '') {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
    });

    // ========================================================================
    // CAROUSEL CONTROLS FOR SKILLS
    // ========================================================================
    document.addEventListener('DOMContentLoaded', function() {
        const skillCategories = document.querySelectorAll('.skill-category');
        skillCategories.forEach(cat => {
            const carousel = cat.querySelector('.skill-carousel');
            const btnNext = cat.querySelector('.carousel-next');
            const btnPrev = cat.querySelector('.carousel-prev');

            if (!carousel) return;

            // make arrows scroll by 60% of visible width
            const step = () => Math.max(carousel.clientWidth * 0.6, 80);

            if (btnNext) btnNext.addEventListener('click', () => {
                carousel.scrollBy({ left: step(), behavior: 'smooth' });
            });

            if (btnPrev) btnPrev.addEventListener('click', () => {
                carousel.scrollBy({ left: -step(), behavior: 'smooth' });
            });

            // update button states based on scroll position
            function updateButtons() {
                if (!btnPrev || !btnNext) return;
                const atStart = carousel.scrollLeft <= 2;
                const atEnd = Math.ceil(carousel.scrollLeft + carousel.clientWidth) >= carousel.scrollWidth - 2;
                if (atStart) {
                    btnPrev.setAttribute('aria-hidden', 'true');
                } else {
                    btnPrev.removeAttribute('aria-hidden');
                }
                if (atEnd) {
                    btnNext.setAttribute('aria-hidden', 'true');
                } else {
                    btnNext.removeAttribute('aria-hidden');
                }
            }

            // attach listeners
            carousel.addEventListener('scroll', () => { updateButtons(); });
            window.addEventListener('resize', () => { updateButtons(); });
            // initial
            setTimeout(updateButtons, 50);

            // enable dragging with pointer events for desktop
            let isDown = false, startX, scrollLeft;
            carousel.addEventListener('pointerdown', (e) => {
                isDown = true;
                carousel.setPointerCapture(e.pointerId);
                startX = e.clientX;
                scrollLeft = carousel.scrollLeft;
            });
            carousel.addEventListener('pointermove', (e) => {
                if (!isDown) return;
                const dx = startX - e.clientX;
                carousel.scrollLeft = scrollLeft + dx;
            });
            carousel.addEventListener('pointerup', (e) => { isDown = false; carousel.releasePointerCapture(e.pointerId); });
            carousel.addEventListener('pointercancel', () => { isDown = false; });
        });
    });

})();
