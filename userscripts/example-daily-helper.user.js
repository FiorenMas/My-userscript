// ==UserScript==
// @name         Daily Helper Example
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Example userscript for daily web browsing enhancements
// @author       FiorenMas
// @match        *://*/*
// @grant        none
// @license      GPL-3.0
// ==/UserScript==

(function() {
    'use strict';

    // This is an example userscript template for daily use
    // Customize it based on your needs

    console.log('Daily Helper userscript loaded');

    // Example: Add a keyboard shortcut
    document.addEventListener('keydown', function(e) {
        // Example: Press Ctrl+Shift+H to show an alert
        if (e.ctrlKey && e.shiftKey && e.key === 'H') {
            alert('Daily Helper is active!');
        }
    });

    // Example: Add custom CSS
    const style = document.createElement('style');
    style.textContent = `
        /* Add your custom styles here */
        /* Example: Highlight all links */
        /* a:hover { outline: 2px solid #00f; } */
    `;
    document.head.appendChild(style);

})();
