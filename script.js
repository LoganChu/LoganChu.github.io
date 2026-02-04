/* 
 * Minimal JavaScript for multi-page portfolio
 * Philosophy: Only add functionality that enhances UX
 * No unnecessary animations or bloat.
 */

(function() {
    'use strict';

    // ========================================================================
    // DARK MODE TOGGLE
    // ========================================================================
    
    const moonIcon = document.querySelector('.moon-icon');
    
    // Check for saved mode preference or default to light mode
    const savedMode = localStorage.getItem('theme-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialMode = savedMode || (prefersDark ? 'dark-mode' : 'light-mode');
    document.body.classList.add(initialMode);
    updateMoonIcon();
    
    function updateMoonIcon() {
        if (document.body.classList.contains('dark-mode')) {
            moonIcon.textContent = '🌙';
        } else {
            moonIcon.textContent = '☀️';
        }
    }
    
    if (moonIcon) {
        moonIcon.addEventListener('click', function(e) {
            e.preventDefault();
            document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode');
            
            const currentMode = document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
            localStorage.setItem('theme-mode', currentMode);
            updateMoonIcon();
        });
        
        moonIcon.style.cursor = 'pointer';
    }

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
