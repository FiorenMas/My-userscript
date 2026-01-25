# Contributing to My Userscripts

Thank you for your interest in contributing! This document provides guidelines for adding new userscripts to this repository.

## Adding a New Userscript

### 1. Create Your Userscript

- Create a new `.user.js` file in the `userscripts/` directory
- Use a descriptive filename (e.g., `youtube-enhancer.user.js`)
- Include proper metadata in the userscript header

### 2. Userscript Metadata

Every userscript must include these metadata fields:

```javascript
// ==UserScript==
// @name         Descriptive Name
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Clear description of what the script does
// @author       Your Name
// @match        *://example.com/*
// @grant        none
// @license      GPL-3.0
// ==/UserScript==
```

### Required Fields:
- `@name`: Clear, descriptive name
- `@version`: Semantic version (e.g., 1.0.0)
- `@description`: Brief explanation of functionality
- `@author`: Your name or username
- `@match` or `@include`: URL patterns where the script runs
  - Use specific patterns like `*://example.com/*` for site-specific scripts
  - Use `*://*/*` only if your script needs to work on all websites
- `@license`: GPL-3.0 (to match repository license)

### 3. Code Quality

- Use `'use strict';` mode
- Wrap code in an IIFE to avoid global scope pollution
- Add comments explaining complex logic
- Test your script on the target websites
- Avoid conflicts with other scripts

### 4. Update Documentation

After adding your userscript, update the README.md to include:
- Script name and file location
- Brief description of features
- Any keyboard shortcuts or special instructions

## Best Practices

### Performance
- Minimize DOM queries
- Use event delegation when possible
- Avoid blocking the main thread

### Compatibility
- Test in multiple browsers if possible
- Use standard Web APIs when available
- Document any browser-specific features

### Security
- Never include sensitive data in scripts
- Be careful with `@grant` permissions
- Validate user input if applicable
- Don't bypass security features maliciously

## Code Style

```javascript
(function() {
    'use strict';

    // Constants at the top
    const CONSTANT_VALUE = 'value';

    // Functions
    function helperFunction() {
        // Function body
    }

    // Main logic
    document.addEventListener('DOMContentLoaded', function() {
        helperFunction();
    });

})();
```

## Testing

Before submitting:
1. Install the userscript in your browser
2. Test on target websites
3. Check browser console for errors
4. Verify no conflicts with other scripts

## Questions?

Feel free to open an issue if you have questions about contributing!
