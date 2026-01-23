# My Userscripts

A collection of userscripts for daily web browsing enhancements.

## What are Userscripts?

Userscripts are small JavaScript programs that run in your browser to modify web pages and add new features. They can customize your browsing experience by adding functionality, changing layouts, or automating repetitive tasks.

## Installation

### 1. Install a Userscript Manager

First, install a userscript manager extension for your browser:

- **Chrome/Edge**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
- **Safari**: [Tampermonkey](https://apps.apple.com/us/app/tampermonkey/id1482490089)

### 2. Install Userscripts

1. Browse to the `userscripts` folder in this repository
2. Click on a `.user.js` file you want to install
3. Click the "Raw" button
4. Your userscript manager should automatically detect the script and prompt you to install it

## Available Userscripts

### Example Daily Helper
**File**: `userscripts/example-daily-helper.user.js`

A template/example userscript that demonstrates:
- Basic userscript structure
- Keyboard shortcuts (Ctrl+Shift+H)
- Adding custom CSS to pages
- Console logging for debugging

This is a good starting point for creating your own custom userscripts.

### Quick Copy Helper
**File**: `userscripts/quick-copy-helper.user.js`

A practical utility for quickly copying information from web pages:
- **Ctrl+Shift+C**: Copy page title and URL in markdown format `[Title](URL)`
- Visual notifications when text is copied
- Works on all websites

Perfect for quickly gathering references while browsing.

## Creating Your Own Userscripts

1. Create a new `.user.js` file in the `userscripts` folder
2. Start with the userscript metadata block:
```javascript
// ==UserScript==
// @name         Your Script Name
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  What your script does
// @author       Your Name
// @match        *://*/*
// @grant        none
// @license      GPL-3.0
// ==/UserScript==
```
3. Add your JavaScript code inside an IIFE:
```javascript
(function() {
    'use strict';
    // Your code here
})();
```

## Useful Resources

- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
- [Greasemonkey Manual](https://wiki.greasespot.net/Greasemonkey_Manual)
- [OpenUserJS](https://openuserjs.org/) - Community userscript repository
- [GreasyFork](https://greasyfork.org/) - Another userscript repository

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.