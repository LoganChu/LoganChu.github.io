/* 
 * Minimal JavaScript for portfolio
 * Philosophy: Only add interactivity that enhances clarity or functionality
 * No unnecessary animations or bloat.
 */

(function() {
    'use strict';

    // ========================================================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ========================================================================
    // Modern browsers support smooth scroll via CSS, but we add polyfill behavior
    // for better UX when clicking navigation links.

    document.addEventListener('DOMContentLoaded', function() {
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Don't prevent default for the logo (which links to #)
                if (href === '#') {
                    return;
                }
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    // Scroll to target
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Update URL without full page reload
                    window.history.pushState(null, null, href);
                }
            });
        });
    });

    // ========================================================================
    // ACTIVE NAVIGATION INDICATOR
    // ========================================================================
    // Highlight the current section in the navigation as the user scrolls

    function updateActiveNav() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
        
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop - 200) {
                currentSection = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.style.color = '';
            link.style.borderBottom = '';
            
            if (link.getAttribute('href') === '#' + currentSection) {
                link.style.color = 'var(--color-dark-gray)';
                link.style.borderBottom = '2px solid var(--color-accent)';
            }
        });
    }

    // Only run on desktop (nav is more relevant on larger screens)
    if (window.innerWidth > 768) {
        window.addEventListener('scroll', updateActiveNav);
    }

    // ========================================================================
    // KEYBOARD NAVIGATION
    // ========================================================================
    // Allow users to navigate sections with arrow keys (arrow down = next section)

    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const sections = Array.from(document.querySelectorAll('section[id]'));
            const currentScroll = window.scrollY;
            
            let targetSection;
            
            if (e.key === 'ArrowDown') {
                targetSection = sections.find(s => s.offsetTop > currentScroll + 100);
            } else {
                targetSection = sections.reverse().find(s => s.offsetTop < currentScroll - 100);
            }
            
            if (targetSection) {
                e.preventDefault();
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    // ========================================================================
    // LIGHT PERFORMANCE MONITORING (OPTIONAL)
    // ========================================================================
    // Log performance metrics for debugging. Can be removed in production.

    if (window.performance && window.performance.timing) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log('📊 Page load time:', pageLoadTime + 'ms');
            }, 0);
        });
    }

    // ========================================================================
    // EXTERNAL LINKS
    // ========================================================================
    // Open external links in new tab (optional but user-friendly)

    document.addEventListener('DOMContentLoaded', function() {
        const externalLinks = document.querySelectorAll('a[href^="http"]');
        
        externalLinks.forEach(link => {
            if (link.hostname !== window.location.hostname) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    });

})();
