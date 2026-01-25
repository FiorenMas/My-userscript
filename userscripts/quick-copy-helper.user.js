// ==UserScript==
// @name         Quick Copy Helper
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Quickly copy text with keyboard shortcuts and formatting options
// @author       FiorenMas
// @match        *://*/*
// @grant        GM_setClipboard
// @license      GPL-3.0
// ==/UserScript==

(function() {
    'use strict';

    console.log('Quick Copy Helper loaded');

    // Add keyboard shortcut to copy page title and URL
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+C: Copy page title and URL in markdown format
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            const title = document.title;
            const url = window.location.href;
            const markdown = `[${title}](${url})`;

            // Copy to clipboard
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(markdown);
                showNotification('Copied as markdown: ' + markdown);
            } else {
                navigator.clipboard.writeText(markdown)
                    .then(function() {
                        showNotification('Copied as markdown: ' + markdown);
                    })
                    .catch(function(err) {
                        console.error('Failed to copy to clipboard:', err);
                        showNotification('Failed to copy to clipboard');
                    });
            }
            e.preventDefault();
        }
    });

    // Function to show temporary notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(function() {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

})();
