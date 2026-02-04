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
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
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

})();
