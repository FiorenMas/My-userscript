// ==UserScript==
// @name         Voz.vn Xóa Post Spam
// @namespace    https://voz.vn/
// @version      1.0
// @author       Fioren
// @match        https://voz.vn/*
// @version      1.0
// @icon         https://www.google.com/s2/favicons?sz=64&domain=voz.vn
// @grant        none
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/FiorenMas/My-userscript/refs/heads/main/voz-remove-spam.user.js
// @updateURL    https://raw.githubusercontent.com/FiorenMas/My-userscript/refs/heads/main/voz-remove-spam.user.js
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .voz-bulk-delete-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s, color 0.2s;
            color: #c0392b;
            font-size: 18px;
            vertical-align: middle;
            padding: 0;
            margin-left: 4px;
        }
        .voz-bulk-delete-btn:hover {
            background: #e74c3c;
            color: #fff;
        }
        .voz-bulk-delete-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }
        .voz-modal-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.55);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .voz-modal-box {
            background: #1e2a3a;
            color: #e0e0e0;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            padding: 28px 32px;
            min-width: 380px;
            max-width: 480px;
        }
        .voz-modal-box h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #e74c3c;
        }
        .voz-modal-box p {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: #b0b0b0;
        }
        .voz-modal-box label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            color: #ccc;
        }
        .voz-modal-box input[type="text"] {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #3a4a5c;
            border-radius: 6px;
            background: #0d1b2a;
            color: #e0e0e0;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 18px;
        }
        .voz-modal-box input[type="text"]:focus {
            outline: none;
            border-color: #e74c3c;
        }
        .voz-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .voz-modal-actions button {
            padding: 8px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .voz-modal-btn-cancel {
            background: #3a4a5c;
            color: #ccc;
        }
        .voz-modal-btn-cancel:hover {
            background: #4a5a6c;
        }
        .voz-modal-btn-delete {
            background: #e74c3c;
            color: #fff;
        }
        .voz-modal-btn-delete:hover {
            background: #c0392b;
        }
        .voz-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e2a3a;
            color: #e0e0e0;
            padding: 14px 22px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            z-index: 100001;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            max-width: 420px;
            line-height: 1.5;
            border-left: 4px solid #e74c3c;
            transition: opacity 0.4s;
        }
        .voz-toast.success {
            border-left-color: #27ae60;
        }
        .voz-toast.error {
            border-left-color: #e74c3c;
        }
    `;
    document.head.appendChild(style);

    function getCSRFToken() {
        if (typeof XF !== 'undefined' && XF.config && XF.config.csrf) {
            return XF.config.csrf;
        }
        const input = document.querySelector('input[name="_xfToken"]');
        return input ? input.value : '';
    }

    let currentToast = null;

    function showToast(message, type = 'info', duration = 0) {
        if (currentToast) currentToast.remove();
        const toast = document.createElement('div');
        toast.className = 'voz-toast' + (type !== 'info' ? ' ' + type : '');
        toast.innerHTML = message;
        document.body.appendChild(toast);
        currentToast = toast;
        if (duration > 0) {
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 400);
            }, duration);
        }
        return toast;
    }

    function showDeleteConfirm(displayName) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'voz-modal-overlay';
            overlay.innerHTML = `
                <div class="voz-modal-box">
                    <h3>🗑️ Delete All Posts</h3>
                    <p>Delete all posts by <strong>${displayName}</strong>?</p>
                    <label for="voz-delete-reason">Reason for deletion:</label>
                    <input type="text" id="voz-delete-reason" value="Spam" placeholder="Enter reason...">
                    <div class="voz-modal-actions">
                        <button class="voz-modal-btn-cancel" id="voz-delete-cancel">Cancel</button>
                        <button class="voz-modal-btn-delete" id="voz-delete-confirm">🗑️ Delete All</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const reasonInput = overlay.querySelector('#voz-delete-reason');
            reasonInput.focus();
            reasonInput.select();

            overlay.querySelector('#voz-delete-cancel').addEventListener('click', () => {
                overlay.remove();
                resolve(null);
            });

            overlay.querySelector('#voz-delete-confirm').addEventListener('click', () => {
                const reason = reasonInput.value.trim() || 'Spam';
                overlay.remove();
                resolve(reason);
            });

            reasonInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const reason = reasonInput.value.trim() || 'Spam';
                    overlay.remove();
                    resolve(reason);
                } else if (e.key === 'Escape') {
                    overlay.remove();
                    resolve(null);
                }
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(null);
                }
            });
        });
    }

    async function fetchSearchId(userId) {
        const resp = await fetch(`/search/member?user_id=${userId}`, {
            method: 'GET',
            credentials: 'same-origin',
            redirect: 'follow'
        });
        if (!resp.ok) throw new Error(`Failed to search user content: HTTP ${resp.status}`);
        const finalUrl = resp.url;
        const match = finalUrl.match(/\/search\/(\d+)\//);
        if (!match) throw new Error('Could not extract search ID from URL: ' + finalUrl);
        return { searchId: match[1], html: await resp.text() };
    }

    async function fetchSearchPage(searchId, username, page = 1) {
        const url = `/search/${searchId}/?mod=post&c[users]=${encodeURIComponent(username)}&o=date` + (page > 1 ? `&page=${page}` : '');
        const resp = await fetch(url, { method: 'GET', credentials: 'same-origin' });
        if (!resp.ok) throw new Error(`Failed to fetch search page ${page}: HTTP ${resp.status}`);
        return await resp.text();
    }

    function extractPostIds(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const postIds = [];

        const checkboxes = doc.querySelectorAll('input[type="checkbox"][name="mod_ids[]"], input[type="checkbox"].js-inlineModToggle');
        checkboxes.forEach(cb => { if (cb.value) postIds.push(cb.value); });

        if (postIds.length === 0) {
            doc.querySelectorAll('[data-content-type="post"]').forEach(item => {
                const contentId = item.getAttribute('data-content-id');
                if (contentId) postIds.push(contentId);
            });
        }

        if (postIds.length === 0) {
            doc.querySelectorAll('label.iconic input[type="checkbox"]').forEach(cb => {
                if (cb.value) postIds.push(cb.value);
            });
        }

        return postIds;
    }

    function hasNextPage(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return !!doc.querySelector('.pageNav-jump--next, a.pageNav-jump--next');
    }

    async function deletePostsByIds(postIds, reason) {
        const token = getCSRFToken();
        if (!token) throw new Error('Could not find CSRF token (_xfToken)');

        const formData = new FormData();
        formData.append('type', 'post');
        formData.append('action', 'delete');
        formData.append('confirmed', '1');
        formData.append('reason', reason);
        formData.append('hard_delete', '0');
        formData.append('_xfToken', token);
        formData.append('_xfResponseType', 'json');
        postIds.forEach(id => formData.append('ids[]', id));

        const resp = await fetch('/inline-mod/', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });
        if (!resp.ok) throw new Error(`Delete failed: HTTP ${resp.status}`);
        return await resp.json();
    }

    async function bulkDeleteUserPosts(username, userId, displayName, reason) {
        let totalDeleted = 0;
        try {
            showToast(`🔍 Searching for all posts by <strong>${displayName}</strong>...`);
            const { searchId } = await fetchSearchId(userId);

            let page = 1;
            let hasMore = true;

            while (hasMore) {
                showToast(`📄 Fetching page ${page}...`);
                const html = await fetchSearchPage(searchId, username, page);
                const postIds = extractPostIds(html);

                if (postIds.length === 0) break;

                showToast(`🗑️ Deleting ${postIds.length} posts on page ${page}...`);

                try {
                    await deletePostsByIds(postIds, reason);
                    totalDeleted += postIds.length;
                } catch (err) {
                    showToast(`⚠️ Error on page ${page}: ${err.message}. Continuing...`, 'error', 3000);
                    await new Promise(r => setTimeout(r, 1500));
                }

                hasMore = hasNextPage(html);
                if (hasMore) {
                    page++;
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            showToast(`✅ Done! Deleted <strong>${totalDeleted}</strong> posts by <strong>${displayName}</strong>.`, 'success', 5000);
        } catch (err) {
            showToast(`❌ Error: ${err.message}`, 'error', 8000);
        }
    }

    const BIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
        <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64s14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32l21.2 339C55.5 487.8 73.8 512 100 512h248c26.2 0 44.5-24.2 46.8-45l21.2-339z"/>
    </svg>`;

    function injectBinIcon(memberTooltipEl) {
        if (!memberTooltipEl || memberTooltipEl.querySelector('.voz-bulk-delete-btn')) return;

        const usernameLink = memberTooltipEl.querySelector('.memberTooltip-name a.username, a.username');
        if (!usernameLink) return;

        const href = usernameLink.getAttribute('href') || '';
        const match = href.match(/\/u\/([^.]+)\.(\d+)\/?/);
        if (!match) return;

        const userInfo = {
            username: match[1],
            userId: parseInt(match[2], 10),
            displayName: usernameLink.textContent.trim()
        };

        const btn = document.createElement('button');
        btn.className = 'voz-bulk-delete-btn';
        btn.title = `Delete all posts by ${userInfo.displayName}`;
        btn.innerHTML = BIN_SVG;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const tooltipEl = btn.closest('.tooltip--member') || btn.closest('.tooltip');
            if (tooltipEl) tooltipEl.style.display = 'none';

            const reason = await showDeleteConfirm(userInfo.displayName);
            if (reason === null) return;

            await bulkDeleteUserPosts(userInfo.username, userInfo.userId, userInfo.displayName, reason);
        });

        const actionsRow = memberTooltipEl.querySelector('.memberTooltip-actions');
        if (actionsRow) {
            const buttonGroup = actionsRow.querySelector('.buttonGroup');
            if (buttonGroup) {
                buttonGroup.appendChild(btn);
            } else {
                actionsRow.appendChild(btn);
            }
            return;
        }

        const statsRow = memberTooltipEl.querySelector('.memberTooltip-stats');
        if (statsRow) {
            const pairJustifier = statsRow.querySelector('.pairJustifier');
            const container = pairJustifier || statsRow;
            const wrapper = document.createElement('dl');
            wrapper.className = 'pairs pairs--rows pairs--rows--centered';
            wrapper.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;';
            wrapper.appendChild(btn);
            container.appendChild(wrapper);
            return;
        }

        memberTooltipEl.appendChild(btn);
    }

    function tryInjectIntoTooltip(tooltipWrapper) {
        const memberTooltip = tooltipWrapper.querySelector('.memberTooltip');
        if (memberTooltip) {
            injectBinIcon(memberTooltip);
            return true;
        }
        return false;
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                if (node.classList && node.classList.contains('memberTooltip')) {
                    injectBinIcon(node);
                    continue;
                }

                if (node.querySelectorAll) {
                    node.querySelectorAll('.memberTooltip').forEach(mt => injectBinIcon(mt));
                }

                if (node.classList && node.classList.contains('tooltip--member')) {
                    if (!tryInjectIntoTooltip(node)) {
                        let attempts = 0;
                        const interval = setInterval(() => {
                            attempts++;
                            if (tryInjectIntoTooltip(node) || attempts > 20) {
                                clearInterval(interval);
                            }
                        }, 150);
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('.memberTooltip').forEach(mt => injectBinIcon(mt));
})();
