// ==UserScript==
// @name         Voz Emoji
// @namespace    Voz Emoji
// @version      2.0
// @icon         https://www.google.com/s2/favicons?sz=64&domain=voz.vn
// @description  Add emoji button to toolbar
// @author       Fioren
// @license      GPL-3.0
// @match        https://voz.vn/*
// @match        https://5.pik.vn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      api.imgur.com
// @connect      i.imgur.com
// @connect      5.pik.vn
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/FiorenMas/My-userscript/refs/heads/main/voz_emoji.user.js
// @updateURL    https://raw.githubusercontent.com/FiorenMas/My-userscript/refs/heads/main/voz_emoji.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.location.hostname === '5.pik.vn') {
        initPikvnHelper();
        return;
    }

    function initPikvnHelper() {

        window.addEventListener('message', async (event) => {
            if (!event.origin.includes('voz.vn')) return;

            const data = event.data;
            if (data.type === 'VOZ_EMOJI_PING') {
                event.source.postMessage({ type: 'VOZ_EMOJI_PONG' }, event.origin);
            }

            if (data.type === 'VOZ_EMOJI_UPLOAD') {
                try {
                    const response = await fetch(data.fileData);
                    const blob = await response.blob();
                    const file = new File([blob], data.fileName, { type: blob.type });
                    let turnstileToken = null;
                    let attempts = 0;

                    while (!turnstileToken && attempts < 30) {
                        const hiddenInput = document.querySelector('input[name="cf-turnstile-response"]');
                        if (hiddenInput && hiddenInput.value && hiddenInput.value.length > 10) {
                            turnstileToken = hiddenInput.value;
                            break;
                        }
                        if (window.turnstile && typeof turnstile.getResponse === 'function') {
                            const apiToken = turnstile.getResponse();
                            if (apiToken && apiToken.length > 10) {
                                turnstileToken = apiToken;
                                break;
                            }
                        }

                        await new Promise(r => setTimeout(r, 500));
                        attempts++;
                    }

                    if (!turnstileToken) {
                        event.source.postMessage({
                            type: 'VOZ_EMOJI_UPLOAD_RESULT',
                            success: false,
                            error: 'Turnstile chưa sẵn sàng - vui lòng đợi widget Cloudflare hoàn tất trong cửa sổ 5.pik.vn',
                            fileId: data.fileId
                        }, event.origin);
                        return;
                    }
                    const processedBlob = await processImageForUpload(file);
                    const arrayBuffer = await processedBlob.arrayBuffer();
                    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    const formData = new FormData();
                    formData.append('file', processedBlob, `${hashHex}.webp`);
                    formData.append('cf-turnstile-response', turnstileToken);

                    const uploadResponse = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (uploadResponse.ok) {
                        const result = await uploadResponse.json();
                        event.source.postMessage({
                            type: 'VOZ_EMOJI_UPLOAD_RESULT',
                            success: true,
                            url: result.url,
                            deleteUrl: result.deleteUrl,
                            fileId: data.fileId
                        }, event.origin);
                    } else {
                        throw new Error(`HTTP ${uploadResponse.status}`);
                    }
                } catch (error) {
                    event.source.postMessage({
                        type: 'VOZ_EMOJI_UPLOAD_RESULT',
                        success: false,
                        error: error.message,
                        fileId: data.fileId
                    }, event.origin);
                }
            }
        });
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'VOZ_EMOJI_READY' }, '*');
        }
        async function processImageForUpload(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1920;
                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(blob => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to blob failed'));
                    }, 'image/webp', 0.85);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        }
    }
    const DB_KEY = 'voz_emoji_albums';
    const RECENT_KEY = 'voz_emoji_recent';
    const MAX_RECENT = 30;
    const _k = 'c_id';
    const PARALLEL_DOWNLOADS = 5;

    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const colors = {
        light: {
            bg: '#ffffff',
            text: '#333333',
            border: '#e0e0e0',
            hover: '#f5f5f5',
            primary: '#2196F3',
            success: '#4CAF50',
            danger: '#f44336',
            secondary: '#666666',
            lightBg: '#f9f9f9',
            lightText: '#999999',
            infoBox: '#e3f2fd',
            infoText: '#1565c0',
            warningBox: '#fff3cd',
            warningText: '#856404',
            successBox: '#e8f5e9',
            successText: '#2e7d32',
            errorBox: '#ffebee',
            errorText: '#c62828'
        },
        dark: {
            bg: '#1e1e1e',
            text: '#e0e0e0',
            border: '#404040',
            hover: '#2a2a2a',
            primary: '#2196F3',
            success: '#4CAF50',
            danger: '#f44336',
            secondary: '#999999',
            lightBg: '#2a2a2a',
            lightText: '#b0b0b0',
            infoBox: '#1a3a52',
            infoText: '#64b5f6',
            warningBox: '#4a3f1f',
            warningText: '#ffd54f',
            successBox: '#1b5e20',
            successText: '#81c784',
            errorBox: '#3f1f1f',
            errorText: '#ef9a9a'
        }
    };

    const theme = isDarkMode ? colors.dark : colors.light;

    let _x = GM_getValue(_k, '66850c248e91c93');

    function initDatabase() {
        if (!GM_getValue(DB_KEY)) {
            GM_setValue(DB_KEY, []);
        }
        if (!GM_getValue(RECENT_KEY)) {
            GM_setValue(RECENT_KEY, []);
        }
    }

    function getAlbums() {
        return GM_getValue(DB_KEY, []);
    }

    function getRecentEmojis() {
        let recent = GM_getValue(RECENT_KEY, []);

        if (recent.length > 0 && typeof recent[0] === 'string') {
            console.log('[VOZ Emoji] Migrating old recent emojis format to base64...');
            recent = recent.map(url => ({
                url: url,
                base64: null
            }));
            GM_setValue(RECENT_KEY, recent);
        }

        return recent;
    }

    async function addRecentEmoji(emojiUrl, emojiBase64 = null) {
        let recent = getRecentEmojis();

        recent = recent.filter(item =>
            (typeof item === 'string' ? item : item.url) !== emojiUrl
        );

        let base64 = emojiBase64;

        if (!base64) {
            try {
                base64 = await urlToBase64(emojiUrl);
            } catch (e) {
                console.warn('[VOZ Emoji] Could not convert emoji to base64:', e);
                base64 = null;
            }
        }

        recent.unshift({
            url: emojiUrl,
            base64: base64
        });

        recent = recent.slice(0, MAX_RECENT);
        GM_setValue(RECENT_KEY, recent);
    }

    function saveAlbum(album) {
        const albums = getAlbums();
        albums.push(album);
        GM_setValue(DB_KEY, albums);
    }

    function deleteAlbum(index) {
        const albums = getAlbums();
        albums.splice(index, 1);
        GM_setValue(DB_KEY, albums);
    }

    function saveAlbumOrder(albums) {
        GM_setValue(DB_KEY, albums);
    }

    function extractAlbumId(url) {
        console.log('Trích xuất Album ID từ:', url);

        const match = url.match(/imgur\.com\/a\/(.+?)(?:\/|$)/i);

        if (!match) {
            console.error('Không tìm thấy khớp trong URL');
            return null;
        }

        let albumPath = match[1];
        console.log('Đường dẫn album được trích xuất:', albumPath);

        const parts = albumPath.split('-');

        if (parts.length > 1) {
            const potentialId = parts[parts.length - 1];
            console.log('ID tiềm năng từ phần cuối:', potentialId);
            return potentialId;
        }

        console.log('ID (không có dấu gạch ngang):', albumPath);
        return albumPath;
    }

    async function fetchImgurAlbumImages(albumId) {
        return new Promise((resolve, reject) => {
            console.log('Đang lấy album imgur:', albumId);
            console.log('Sử dụng Client ID: [PROTECTED]');
            console.log('API Key length:', _x.length);

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.imgur.com/3/album/${albumId}/images`,
                headers: {
                    'Authorization': `Client-ID ${_x}`
                },
                timeout: 15000,
                onload: (response) => {
                    console.log('Trạng thái phản hồi:', response.status);
                    console.log('Độ dài văn bản phản hồi:', response.responseText.length);

                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            console.log('JSON được phân tích cú pháp thành công');
                            console.log('Trường thành công của dữ liệu:', data.success);
                            console.log('Độ dài mảng dữ liệu:', data.data ? data.data.length : 0);

                            if (data.success === true && data.data && Array.isArray(data.data) && data.data.length > 0) {
                                const images = data.data.filter(img =>
                                    img && img.link && typeof img.link === 'string' && img.link.includes('imgur.com')
                                );

                                console.log('Số lượng hình ảnh được lọc:', images.length);

                                if (images.length === 0) {
                                    reject('Album không có hình ảnh hợp lệ để hiển thị');
                                } else {
                                    resolve(images);
                                }
                            } else {
                                reject(`Album không được tìm thấy hoặc trống. API trả về: success=${data.success}, data_count=${data.data ? data.data.length : 0}`);
                            }
                        } catch (e) {
                            console.error('Lỗi phân tích cú pháp JSON:', e);
                            reject('Không thể phân tích phản hồi API: ' + e.message);
                        }
                    } else if (response.status === 401) {
                        reject('Truy cập không được phép (401) - Client ID không hợp lệ hoặc hết hạn');
                    } else if (response.status === 404) {
                        reject('Không tìm thấy (404) - Album ID không tồn tại');
                    } else {
                        reject(`HTTP ${response.status} - ${response.statusText}`);
                    }
                },
                onerror: (e) => {
                    console.error('Lỗi yêu cầu:', e);
                    reject('Lỗi mạng - Vui lòng kiểm tra kết nối của bạn');
                },
                ontimeout: () => {
                    reject('Hết thời gian chờ yêu cầu - imgur.com mất quá lâu để phản hồi');
                }
            });
        });
    }

    async function resizeImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                const MAX_SIZE = 400;
                let width = img.width;
                let height = img.height;
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/webp', 0.8);
                URL.revokeObjectURL(url);
                resolve(base64);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Image conversion failed'));
            };
            img.src = url;
        });
    }

    async function urlToBase64(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                timeout: 15000,
                onload: async (response) => {
                    if (response.status === 200) {
                        try {
                            const base64 = await resizeImage(response.response);
                            resolve(base64);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(`HTTP ${response.status}`);
                    }
                },
                onerror: () => reject('Network error'),
                ontimeout: () => reject('Timeout')
            });
        });
    }

    async function downloadImagesInParallel(images) {
        const base64Images = [];
        const errors = [];

        for (let i = 0; i < images.length; i += PARALLEL_DOWNLOADS) {
            const batch = images.slice(i, i + PARALLEL_DOWNLOADS);
            const batchPromises = batch.map(async (img, batchIndex) => {
                try {
                    const globalIndex = i + batchIndex;
                    console.log(`Đang chuyển đổi hình ảnh ${globalIndex + 1}/${images.length}...`);
                    const base64 = await urlToBase64(img.link);
                    return { url: img.link, base64: base64, index: globalIndex, error: null };
                } catch (e) {
                    console.warn(`Không thể chuyển đổi hình ảnh:`, e);
                    return { url: img.link, base64: null, index: i + batchIndex, error: e };
                }
            });

            const results = await Promise.all(batchPromises);
            results.forEach(result => {
                if (result.error) {
                    errors.push({ url: result.url, error: result.error });
                } else {
                    base64Images.push({ url: result.url, base64: result.base64 });
                }
            });
        }

        return { base64Images, errors };
    }

    let pikvnIframe = null;
    let pikvnIframeReady = false;
    let pikvnUploadCallbacks = {};
    window.addEventListener('message', (event) => {
        if (!event.origin.includes('5.pik.vn')) return;

        const data = event.data;

        if (data.type === 'VOZ_EMOJI_READY' || data.type === 'VOZ_EMOJI_PONG') {
            pikvnIframeReady = true;
        }

        if (data.type === 'VOZ_EMOJI_UPLOAD_RESULT') {
            const callback = pikvnUploadCallbacks[data.fileId];
            if (callback) {
                if (data.success) {
                    reloadPikvnIframe().then(() => {
                        callback.resolve({
                            url: data.url,
                            deleteUrl: data.deleteUrl
                        });
                    });
                } else {
                    callback.reject(data.error);
                }
                delete pikvnUploadCallbacks[data.fileId];
            }
        }
    });

    async function reloadPikvnIframe() {
        pikvnIframeReady = false;

        if (pikvnIframe) {
            pikvnIframe.src = 'https://5.pik.vn/?t=' + Date.now();
        }

        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (pikvnIframeReady) {
                return;
            }
        }
    }

    function createPikvnIframe() {
        if (pikvnIframe && document.body.contains(pikvnIframe)) {
            return pikvnIframe;
        }

        pikvnIframe = document.createElement('iframe');
        pikvnIframe.id = 'voz-emoji-pikvn-iframe';
        pikvnIframe.src = 'https://5.pik.vn/';
        pikvnIframe.style.cssText = `
            position: fixed;
            bottom: -9999px;
            right: -9999px;
            width: 400px;
            height: 300px;
            border: none;
            z-index: -1;
            opacity: 0;
            pointer-events: none;
        `;
        pikvnIframe.onload = () => {
            pikvnIframe.style.pointerEvents = 'auto';
        };

        document.body.appendChild(pikvnIframe);

        return pikvnIframe;
    }

    function destroyPikvnIframe() {
        if (pikvnIframe) {
            pikvnIframe.remove();
            pikvnIframe = null;
            pikvnIframeReady = false;
        }
        const closeBtn = document.getElementById('voz-emoji-pikvn-close');
        if (closeBtn) closeBtn.remove();
    }

    function showPikvnVerifyModal(onComplete) {
        const iframe = createPikvnIframe();

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10005;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            width: 95%;
            text-align: center;
            border: 1px solid ${theme.border};
        `;

        content.innerHTML = `
            <h3 style="margin-bottom: 20px;">🔐 Xác thực Cloudflare - 5.pik.vn</h3>
            <div style="background: ${theme.infoBox}; border-left: 4px solid ${theme.primary}; padding: 15px; margin-bottom: 20px; border-radius: 4px; font-size: 13px; color: ${theme.infoText}; text-align: left;">
                <strong>Hướng dẫn:</strong><br>
                1. Một cửa sổ nhỏ 5.pik.vn đã xuất hiện ở góc phải dưới màn hình<br>
                2. Hoàn thành xác thực Cloudflare trong cửa sổ đó<br>
                3. Khi thấy trang upload, nhấn nút "Đã xác thực xong" bên dưới<br>
                <br>
                <strong style="color: ${theme.danger};">⚠️ Giữ cửa sổ 5.pik.vn mở trong khi upload!</strong>
            </div>
        `;

        const doneBtn = document.createElement('button');
        doneBtn.textContent = '✓ Đã xác thực xong';
        doneBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        `;
        doneBtn.onclick = () => {
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'VOZ_EMOJI_PING' }, 'https://5.pik.vn');
            }
            modal.remove();
            if (onComplete) onComplete();
        };
        content.appendChild(doneBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.cssText = `
            width: 100%;
            padding: 10px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;
        cancelBtn.onclick = () => modal.remove();
        content.appendChild(cancelBtn);

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    async function uploadToPikvn(file) {
        if (!pikvnIframe || !document.body.contains(pikvnIframe)) {
            throw new Error('Chưa xác thực Pikvn. Nhấn nút "🔐 Xác thực Pikvn" trước.');
        }
        const base64 = await fileToBase64(file);

        return new Promise((resolve, reject) => {
            const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            pikvnUploadCallbacks[fileId] = { resolve, reject };
            setTimeout(() => {
                if (pikvnUploadCallbacks[fileId]) {
                    delete pikvnUploadCallbacks[fileId];
                    reject('Upload timeout - Turnstile có thể chưa sẵn sàng. Vui lòng kiểm tra cửa sổ 5.pik.vn');
                }
            }, 90000);
            try {
                pikvnIframe.contentWindow.postMessage({
                    type: 'VOZ_EMOJI_UPLOAD',
                    fileData: base64,
                    fileName: file.name,
                    fileId: fileId
                }, 'https://5.pik.vn');
            } catch (e) {
                delete pikvnUploadCallbacks[fileId];
                reject('Không thể gửi đến iframe: ' + e.message);
            }
        });
    }

    async function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject('Failed to read file');
            reader.readAsDataURL(file);
        });
    }

    function showCreatePikvnAlbumDialog() {
        createPikvnIframe();

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 700px;
            width: 95%;
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.textContent = 'Tạo album pikvn';
        title.style.marginBottom = '20px';
        content.appendChild(title);

        const nameLabel = document.createElement('label');
        nameLabel.textContent = '📝 Tên Album:';
        nameLabel.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        `;
        content.appendChild(nameLabel);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Ví dụ: Pepe Collection';
        nameInput.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid ${theme.border};
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            background: ${theme.lightBg};
            color: ${theme.text};
        `;
        content.appendChild(nameInput);

        const dropZone = document.createElement('div');
        dropZone.style.cssText = `
            border: 3px dashed ${theme.border};
            border-radius: 8px;
            padding: 40px 20px;
            text-align: center;
            margin-bottom: 20px;
            cursor: pointer;
            transition: all 0.3s;
            background: ${theme.lightBg};
        `;
        dropZone.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Kéo thả hình ảnh vào đây</div>
            <div style="font-size: 13px; color: ${theme.lightText};">hoặc nhấp để chọn file (có thể chọn nhiều file)</div>
        `;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        dropZone.onclick = () => fileInput.click();

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = theme.primary;
            dropZone.style.background = isDarkMode ? '#2a4a6a' : '#e3f2fd';
        };

        dropZone.ondragleave = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = theme.border;
            dropZone.style.background = theme.lightBg;
        };

        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = theme.border;
            dropZone.style.background = theme.lightBg;
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                handleFiles(files);
            }
        };

        fileInput.onchange = () => {
            const files = Array.from(fileInput.files);
            if (files.length > 0) {
                handleFiles(files);
            }
        };

        content.appendChild(dropZone);
        content.appendChild(fileInput);

        const logContainer = document.createElement('div');
        logContainer.style.cssText = `
            background: ${theme.lightBg};
            border: 1px solid ${theme.border};
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            max-height: 150px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            display: none;
        `;
        content.appendChild(logContainer);

        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            display: none;
            margin-bottom: 20px;
        `;

        const previewTitle = document.createElement('div');
        previewTitle.style.cssText = `
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 14px;
        `;
        previewTitle.textContent = '📷 Xem trước (kéo thả để sắp xếp):';
        previewContainer.appendChild(previewTitle);

        const previewGrid = document.createElement('div');
        previewGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
        `;
        previewContainer.appendChild(previewGrid);
        content.appendChild(previewContainer);

        let uploadedImages = [];

        function addLog(message, isError = false) {
            logContainer.style.display = 'block';
            const logLine = document.createElement('div');
            logLine.style.cssText = `
                padding: 4px 0;
                border-bottom: 1px solid ${theme.border};
                color: ${isError ? theme.danger : theme.text};
            `;
            logLine.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logContainer.appendChild(logLine);
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        function renderPreviews() {
            previewGrid.innerHTML = '';
            if (uploadedImages.length === 0) {
                previewContainer.style.display = 'none';
                return;
            }
            previewContainer.style.display = 'block';

            uploadedImages.forEach((img, index) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.style.cssText = `
                    position: relative;
                    border: 2px solid ${theme.border};
                    border-radius: 6px;
                    padding: 4px;
                    cursor: grab;
                    transition: all 0.2s;
                    background: ${theme.bg};
                `;
                imgWrapper.draggable = true;
                imgWrapper.dataset.index = index;

                imgWrapper.onmouseover = function () {
                    this.style.borderColor = theme.primary;
                    this.style.transform = 'scale(1.05)';
                };
                imgWrapper.onmouseout = function () {
                    this.style.borderColor = theme.border;
                    this.style.transform = 'scale(1)';
                };

                const imgEl = document.createElement('img');
                imgEl.src = img.base64;
                imgEl.style.cssText = `
                    width: 100%;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 4px;
                `;
                imgWrapper.appendChild(imgEl);

                const indexBadge = document.createElement('div');
                indexBadge.style.cssText = `
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    background: ${theme.primary};
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                indexBadge.textContent = index + 1;
                imgWrapper.appendChild(indexBadge);

                imgWrapper.addEventListener('dragstart', (e) => {
                    imgWrapper.style.opacity = '0.5';
                    e.dataTransfer.setData('text/plain', index);
                });

                imgWrapper.addEventListener('dragend', () => {
                    imgWrapper.style.opacity = '1';
                });

                imgWrapper.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    imgWrapper.style.borderColor = theme.success;
                });

                imgWrapper.addEventListener('dragleave', () => {
                    imgWrapper.style.borderColor = theme.border;
                });

                imgWrapper.addEventListener('drop', (e) => {
                    e.preventDefault();
                    imgWrapper.style.borderColor = theme.border;
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;
                    if (fromIndex !== toIndex) {
                        const [movedItem] = uploadedImages.splice(fromIndex, 1);
                        uploadedImages.splice(toIndex, 0, movedItem);
                        renderPreviews();
                    }
                });

                previewGrid.appendChild(imgWrapper);
            });
        }

        async function handleFiles(files) {
            addLog(`Bắt đầu upload ${files.length} hình ảnh...`);
            dropZone.style.display = 'none';
            saveBtn.disabled = true;

            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                addLog(`Đang upload ${i + 1}/${files.length}: ${file.name}`);

                try {
                    const [uploadResult, base64] = await Promise.all([
                        uploadToPikvn(file),
                        resizeImage(file)
                    ]);

                    uploadedImages.push({
                        url: uploadResult.url,
                        deleteUrl: uploadResult.deleteUrl,
                        base64: base64
                    });

                    successCount++;
                    addLog(`✓ ${successCount}/${files.length} đã upload: ${file.name}`);
                    renderPreviews();
                } catch (error) {
                    errorCount++;
                    addLog(`✗ Lỗi upload ${file.name}: ${error}`, true);
                }
            }

            addLog(`Hoàn tất: ${successCount} thành công, ${errorCount} lỗi`);

            if (uploadedImages.length > 0) {
                saveBtn.disabled = false;
                dropZone.style.display = 'block';
                dropZone.innerHTML = `
                    <div style="font-size: 24px; margin-bottom: 5px;">➕</div>
                    <div style="font-size: 13px;">Thêm hình ảnh khác</div>
                `;
            } else {
                dropZone.style.display = 'block';
            }
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Lưu Album';
        saveBtn.disabled = true;
        saveBtn.style.cssText = `
            flex: 1;
            min-width: 150px;
            padding: 12px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            opacity: 0.5;
        `;

        saveBtn.onclick = () => {
            if (!nameInput.value.trim()) {
                alert('Vui lòng nhập tên album');
                nameInput.focus();
                return;
            }

            if (uploadedImages.length === 0) {
                alert('Vui lòng upload ít nhất một hình ảnh');
                return;
            }

            const album = {
                name: nameInput.value.trim(),
                type: 'pikvn',
                preview: uploadedImages[0].base64,
                images: uploadedImages.map(img => ({
                    url: img.url,
                    base64: img.base64,
                    deleteUrl: img.deleteUrl
                })),
                savedAt: new Date().toISOString()
            };

            saveAlbum(album);
            addLog(`✅ Đã lưu album "${album.name}" với ${uploadedImages.length} hình ảnh`);

            setTimeout(() => {
                modal.remove();
                showSettingsDialog();
            }, 1000);
        };
        const originalDisabled = Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'disabled');
        Object.defineProperty(saveBtn, 'disabled', {
            set: function (value) {
                originalDisabled.set.call(this, value);
                this.style.opacity = value ? '0.5' : '1';
                this.style.cursor = value ? 'not-allowed' : 'pointer';
            },
            get: function () {
                return originalDisabled.get.call(this);
            }
        });

        buttonContainer.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.cssText = `
            flex: 1;
            min-width: 100px;
            padding: 12px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onclick = () => {
            modal.remove();
            showSettingsDialog();
        };
        buttonContainer.appendChild(cancelBtn);

        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        setTimeout(() => nameInput.focus(), 100);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                showSettingsDialog();
            }
        };
    }

    function showPikvnDeleteConfirmDialog(indices, selectedAlbums, parentModal) {
        const confirmModal = document.createElement('div');
        confirmModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10003;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            width: 95%;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.style.cssText = `
            margin-bottom: 20px;
            color: ${theme.danger};
        `;
        title.textContent = '⚠️ Xác nhận xóa album pikvn';
        content.appendChild(title);

        const pikvnAlbums = selectedAlbums.filter(a => a.type === 'pikvn');
        const imgurAlbums = selectedAlbums.filter(a => a.type !== 'pikvn');

        const warning = document.createElement('div');
        warning.style.cssText = `
            background: ${theme.warningBox};
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 13px;
            color: ${theme.warningText};
        `;
        warning.innerHTML = `
            <strong>⚠️ Lưu ý:</strong><br>
            Bạn đang xóa <strong>${pikvnAlbums.length}</strong> album pikvn${imgurAlbums.length > 0 ? ` và <strong>${imgurAlbums.length}</strong> album imgur` : ''}.<br><br>
            Hình ảnh đã upload lên 5.pik.vn sẽ <strong>không bị xóa khỏi server</strong>.<br>
            Chỉ có dữ liệu album trong script sẽ bị xóa.
        `;
        content.appendChild(warning);

        const albumList = document.createElement('div');
        albumList.style.cssText = `
            background: ${theme.lightBg};
            border: 1px solid ${theme.border};
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
            max-height: 150px;
            overflow-y: auto;
            font-size: 13px;
        `;
        albumList.innerHTML = '<strong>Albums sẽ bị xóa:</strong><br>' +
            selectedAlbums.map(a => `• ${escapeHtml(a.name)} (${a.type || 'imgur'})`).join('<br>');
        content.appendChild(albumList);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Xác nhận xóa';
        confirmBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.danger};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        confirmBtn.onclick = () => {
            indices.forEach(index => deleteAlbum(index));
            confirmModal.remove();
            parentModal.remove();
            showSettingsDialog();
        };
        buttonContainer.appendChild(confirmBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.onclick = () => confirmModal.remove();
        buttonContainer.appendChild(cancelBtn);

        content.appendChild(buttonContainer);
        confirmModal.appendChild(content);
        document.body.appendChild(confirmModal);

        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        };
    }

    function exportBackup() {
        try {
            const backupData = {
                version: '1.2',
                exportDate: new Date().toISOString(),
                albums: GM_getValue(DB_KEY, []),
                recent: GM_getValue(RECENT_KEY, []),
                clientId: GM_getValue(_k, '66850c248e91c93')
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `voz-emoji-backup-${dateStr}_${timeStr}.json`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('[VOZ Emoji] Backup exported successfully');
            alert(`✅ Đã xuất bản sao lưu thành công!\n\nFile: ${filename}\n\nAlbums: ${backupData.albums.length}\nRecent Emojis: ${backupData.recent.length}`);
        } catch (e) {
            console.error('[VOZ Emoji] Export error:', e);
            alert('❌ Lỗi khi xuất dữ liệu: ' + e.message);
        }
    }

    function exportSingleAlbum(index) {
        try {
            const albums = getAlbums();
            if (index < 0 || index >= albums.length) {
                alert('❌ Album không tồn tại');
                return;
            }

            const album = albums[index];
            const exportData = {
                version: '1.3',
                exportDate: new Date().toISOString(),
                addOnly: true,
                albums: [album]
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const safeName = album.name.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_').substring(0, 30);
            const filename = `voz-emoji-album-${safeName}.json`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`✅ Đã xuất album "${album.name}" thành công!\n\nFile: ${filename}`);
        } catch (e) {
            alert('❌ Lỗi khi xuất album: ' + e.message);
        }
    }

    function showImportDialog() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 550px;
            width: 95%;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.textContent = '📥 Nhập Dữ Liệu';
        title.style.marginBottom = '20px';
        content.appendChild(title);

        const warning = document.createElement('div');
        warning.style.cssText = `
            background: ${theme.warningBox};
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 13px;
            color: ${theme.warningText};
        `;
        warning.innerHTML = `
            <strong>⚠️ Cảnh báo:</strong><br>
            Nhập dữ liệu sẽ <strong>ghi đè hoàn toàn</strong> tất cả cài đặt hiện tại của bạn.<br>
            Hãy chắc chắn bạn đã sao lưu dữ liệu hiện tại trước khi tiếp tục.
        `;
        content.appendChild(warning);

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 2px dashed ${theme.border};
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            background: ${theme.lightBg};
            color: ${theme.text};
            cursor: pointer;
        `;
        content.appendChild(fileInput);

        const statusMsg = document.createElement('div');
        statusMsg.style.cssText = `
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
            display: none;
            word-wrap: break-word;
            font-size: 13px;
        `;
        content.appendChild(statusMsg);

        function showStatus(message, isError = false) {
            statusMsg.textContent = message;
            statusMsg.style.display = 'block';
            if (isError) {
                statusMsg.style.background = theme.errorBox;
                statusMsg.style.color = theme.errorText;
                statusMsg.style.border = `1px solid ${theme.danger}`;
            } else {
                statusMsg.style.background = theme.successBox;
                statusMsg.style.color = theme.successText;
                statusMsg.style.border = `1px solid ${theme.success}`;
            }
        }

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (!data.albums || !Array.isArray(data.albums)) {
                    throw new Error('Định dạng file không hợp lệ: thiếu mảng albums');
                }

                showStatus(`✓ File hợp lệ!\n\nAlbums: ${data.albums.length}\nRecent Emojis: ${data.recent ? data.recent.length : 0}\nExported: ${data.exportDate ? new Date(data.exportDate).toLocaleString('vi-VN') : 'Unknown'}`);

                importBtn.disabled = false;
                importBtn.style.opacity = '1';
                importBtn.backupData = data;
            } catch (e) {
                console.error('[VOZ Emoji] Import parse error:', e);
                showStatus('❌ Lỗi đọc file: ' + e.message, true);
                importBtn.disabled = true;
                importBtn.style.opacity = '0.5';
            }
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        const importBtn = document.createElement('button');
        importBtn.textContent = 'Nhập & Ghi Đè';
        importBtn.disabled = true;
        importBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            opacity: 0.5;
        `;
        importBtn.onclick = () => {
            if (!importBtn.backupData) return;

            try {
                const data = importBtn.backupData;

                if (data.addOnly) {
                    const existingAlbums = GM_getValue(DB_KEY, []);
                    const existingNames = new Set(existingAlbums.map(a => a.name));
                    let addedCount = 0;
                    let skippedCount = 0;

                    for (const album of data.albums) {
                        if (existingNames.has(album.name)) {
                            skippedCount++;
                        } else {
                            existingAlbums.push(album);
                            existingNames.add(album.name);
                            addedCount++;
                        }
                    }

                    GM_setValue(DB_KEY, existingAlbums);
                    alert(`✅ Đã thêm album thành công!\n\nĐã thêm: ${addedCount}\nBỏ qua (trùng tên): ${skippedCount}\n\nTrang sẽ được tải lại để áp dụng thay đổi.`);
                } else {
                    if (!confirm('⚠️ Xác nhận ghi đè tất cả dữ liệu hiện tại?\n\nHành động này KHÔNG THỂ hoàn tác!')) {
                        return;
                    }

                    GM_setValue(DB_KEY, data.albums || []);
                    GM_setValue(RECENT_KEY, data.recent || []);

                    if (data.clientId) {
                        GM_setValue(_k, data.clientId);
                        _x = data.clientId;
                    }

                    alert(`✅ Đã nhập dữ liệu thành công!\n\nAlbums: ${data.albums.length}\nRecent Emojis: ${data.recent ? data.recent.length : 0}\n\nTrang sẽ được tải lại để áp dụng thay đổi.`);
                }

                setTimeout(() => {
                    location.reload();
                }, 500);
            } catch (e) {
                showStatus('❌ Lỗi khi nhập dữ liệu: ' + e.message, true);
            }
        };
        buttonContainer.appendChild(importBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.onclick = () => modal.remove();
        buttonContainer.appendChild(cancelBtn);

        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    function showBackupDialog() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            width: 95%;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.textContent = '💾 Sao Lưu Dữ Liệu';
        title.style.marginBottom = '20px';
        content.appendChild(title);

        const info = document.createElement('div');
        info.style.cssText = `
            background: ${theme.infoBox};
            border-left: 4px solid ${theme.primary};
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 13px;
            color: ${theme.infoText};
        `;

        const albums = getAlbums();
        const recent = getRecentEmojis();

        info.innerHTML = `
            <strong>Dữ liệu hiện tại:</strong><br>
            • Albums: ${albums.length}<br>
            • Recent Emojis: ${recent.length}<br>
            • API Key: ${_x ? 'Đã cấu hình' : 'Chưa cấu hình'}
        `;
        content.appendChild(info);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        const exportBtn = document.createElement('button');
        exportBtn.textContent = '📤 Xuất File JSON';
        exportBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        exportBtn.onclick = () => {
            exportBackup();
            modal.remove();
        };
        buttonContainer.appendChild(exportBtn);

        const importBtn = document.createElement('button');
        importBtn.textContent = '📥 Nhập File JSON';
        importBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.primary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        importBtn.onclick = () => {
            modal.remove();
            showImportDialog();
        };
        buttonContainer.appendChild(importBtn);

        content.appendChild(buttonContainer);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Đóng';
        closeBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        `;
        closeBtn.onclick = () => modal.remove();
        content.appendChild(closeBtn);

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    function showSettingsDialog() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 20px;
            border-radius: 8px;
            max-width: 700px;
            max-height: 70vh;
            overflow-y: auto;
            width: 95%;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.textContent = 'Quản lý Emoji';
        title.style.marginBottom = '20px';
        content.appendChild(title);

        const infoMsg = document.createElement('div');
        infoMsg.style.cssText = `
            background: ${theme.infoBox};
            border-left: 4px solid ${theme.primary};
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 4px;
            font-size: 12px;
            color: ${theme.infoText};
        `;
        infoMsg.innerHTML = `💡 Kéo thả các dòng để sắp xếp thứ tự album`;
        content.appendChild(infoMsg);

        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        `;

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background: ${theme.lightBg}; border-bottom: 2px solid ${theme.border};">
                <th style="padding: 10px; text-align: center; width: 40px;"><input type="checkbox" id="selectAll"></th>
                <th style="padding: 10px; text-align: left;">Tên</th>
                <th style="padding: 10px; text-align: center; width: 90px;">Dịch vụ</th>
                <th style="padding: 10px; text-align: center; width: 70px;">Hình ảnh</th>
                <th style="padding: 10px; text-align: center; width: 100px;">Xem trước</th>
                <th style="padding: 10px; text-align: center; width: 60px;">Lưu</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const albums = getAlbums();

        if (albums.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="padding: 20px; text-align: center; color: ${theme.lightText};">Chưa có album. Nhấp vào "Thêm Album" để bắt đầu.</td>`;
            tbody.appendChild(tr);
        } else {
            albums.forEach((album, index) => {
                const tr = document.createElement('tr');
                tr.style.cssText = `border-bottom: 1px solid ${theme.border}; cursor: grab; transition: all 0.2s;`;
                tr.draggable = true;
                tr.dataset.index = index;

                tr.onmouseover = function () {
                    this.style.background = theme.hover;
                };
                tr.onmouseout = function () {
                    this.style.background = 'transparent';
                };

                const imageCount = album.images ? album.images.length : 0;
                const serviceType = album.type || 'imgur';
                tr.innerHTML = `
                    <td style="padding: 10px; text-align: center;">
                        <input type="checkbox" class="album-select" data-index="${index}">
                    </td>
                    <td style="padding: 10px; font-weight: bold;">${escapeHtml(album.name)}</td>
                    <td style="padding: 10px; text-align: center; font-size: 12px;">
                        <span style="padding: 4px 8px; border-radius: 4px; background: ${serviceType === 'pikvn' ? '#ff6b6b' : '#4CAF50'}; color: white; font-weight: bold;">${serviceType}</span>
                    </td>
                    <td style="padding: 10px; text-align: center; font-size: 12px; background: ${theme.lightBg};">${imageCount}</td>
                    <td style="padding: 10px; text-align: center;">
                        <img src="${album.preview}" style="max-width: 60px; max-height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid ${theme.border};">
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <button class="album-export-btn" data-index="${index}" style="padding: 6px 10px; background: transparent; color: ${theme.text}; border: 1px solid ${theme.border}; border-radius: 4px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;" title="Xuất album này">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        table.appendChild(tbody);
        content.appendChild(table);

        let draggedRow = null;
        const rows = tbody.querySelectorAll('tr[data-index]');

        rows.forEach(row => {
            row.addEventListener('dragstart', (e) => {
                draggedRow = row;
                row.style.opacity = '0.5';
                row.style.cursor = 'grabbing';
                e.dataTransfer.effectAllowed = 'move';
            });

            row.addEventListener('dragend', (e) => {
                row.style.opacity = '1';
                row.style.cursor = 'grab';
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (row !== draggedRow) {
                    row.style.borderTop = `3px solid ${theme.primary}`;
                }
            });

            row.addEventListener('dragleave', (e) => {
                row.style.borderTop = '';
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.style.borderTop = '';

                if (row !== draggedRow) {
                    const allRows = Array.from(tbody.querySelectorAll('tr[data-index]'));
                    const draggedIndex = allRows.indexOf(draggedRow);
                    const targetIndex = allRows.indexOf(row);

                    if (draggedIndex < targetIndex) {
                        row.parentNode.insertBefore(draggedRow, row.nextSibling);
                    } else {
                        row.parentNode.insertBefore(draggedRow, row);
                    }

                    const newOrder = Array.from(tbody.querySelectorAll('tr[data-index]')).map(r => {
                        return albums[parseInt(r.dataset.index)];
                    });

                    saveAlbumOrder(newOrder);
                    console.log('Album order saved');
                }
            });
        });
        tbody.addEventListener('click', (e) => {
            if (e.target.classList.contains('album-export-btn')) {
                const index = parseInt(e.target.dataset.index);
                exportSingleAlbum(index);
            }
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-bottom: 20px;
            flex-wrap: wrap;
        `;

        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Thêm album imgur';
        addBtn.style.cssText = `
            padding: 10px 20px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        addBtn.onclick = () => {
            modal.remove();
            showAddAlbumDialog();
        };
        buttonContainer.appendChild(addBtn);

        const addPikvnBtn = document.createElement('button');
        addPikvnBtn.textContent = '+ Tạo album pikvn';
        addPikvnBtn.style.cssText = `
            padding: 10px 20px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        addPikvnBtn.onclick = () => {
            modal.remove();
            showCreatePikvnAlbumDialog();
        };
        buttonContainer.appendChild(addPikvnBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Xóa được chọn';
        deleteBtn.style.cssText = `
            padding: 10px 20px;
            background: ${theme.danger};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        deleteBtn.onclick = () => {
            const checkboxes = tbody.querySelectorAll('.album-select:checked');
            if (checkboxes.length === 0) {
                alert('Vui lòng chọn các album để xóa');
                return;
            }

            const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index)).sort((a, b) => b - a);
            const selectedAlbums = indices.map(i => albums[i]);
            const hasPikvnAlbums = selectedAlbums.some(a => a.type === 'pikvn');

            if (hasPikvnAlbums) {
                showPikvnDeleteConfirmDialog(indices, selectedAlbums, modal);
            } else {
                if (confirm(`Xóa ${checkboxes.length} album? Hành động này không thể được hoàn tác.`)) {
                    indices.forEach(index => deleteAlbum(index));
                    modal.remove();
                    showSettingsDialog();
                }
            }
        };
        buttonContainer.appendChild(deleteBtn);

        content.appendChild(buttonContainer);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Đóng';
        closeBtn.style.cssText = `
            padding: 10px 20px;
            background: ${theme.primary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-size: 14px;
        `;
        closeBtn.onclick = () => modal.remove();
        content.appendChild(closeBtn);

        const selectAll = content.querySelector('#selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                tbody.querySelectorAll('.album-select').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });
        }

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    function showAddAlbumDialog() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 600px;
            width: 95%;
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.textContent = 'Thêm Emoji Mới';
        title.style.marginBottom = '20px';
        content.appendChild(title);

        const nameLabel = document.createElement('label');
        nameLabel.textContent = '📝 Tên Emoji:';
        nameLabel.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        `;
        content.appendChild(nameLabel);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Ví dụ: Pepe';
        nameInput.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid ${theme.border};
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            background: ${theme.lightBg};
            color: ${theme.text};
        `;
        content.appendChild(nameInput);

        const linkLabel = document.createElement('label');
        linkLabel.textContent = '🔗 URL Album Imgur:';
        linkLabel.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        `;
        content.appendChild(linkLabel);

        const linkInput = document.createElement('input');
        linkInput.type = 'text';
        linkInput.placeholder = 'Ví dụ: https://imgur.com/a/liverpool-emoticons-saitlzr';
        linkInput.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid ${theme.border};
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            background: ${theme.lightBg};
            color: ${theme.text};
        `;
        content.appendChild(linkInput);

        const infoSection = document.createElement('div');
        infoSection.style.cssText = `
            background: ${theme.infoBox};
            border-left: 4px solid ${theme.primary};
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 13px;
            color: ${theme.infoText};
        `;
        infoSection.innerHTML = `
            <strong>✓ Hỗ trợ cả hai định dạng URL:</strong><br>
            • <code>https://imgur.com/a/saitlzr</code><br>
            • <code>https://imgur.com/a/liverpool-emoticons-saitlzr</code><br>
        `;
        content.appendChild(infoSection);

        const statusMsg = document.createElement('div');
        statusMsg.style.cssText = `
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
            display: none;
            word-wrap: break-word;
            font-size: 13px;
        `;
        content.appendChild(statusMsg);

        function showStatus(message, isError = false) {
            statusMsg.textContent = message;
            statusMsg.style.display = 'block';
            if (isError) {
                statusMsg.style.background = theme.errorBox;
                statusMsg.style.color = theme.errorText;
                statusMsg.style.border = `1px solid ${theme.danger}`;
            } else {
                statusMsg.style.background = theme.successBox;
                statusMsg.style.color = theme.successText;
                statusMsg.style.border = `1px solid ${theme.success}`;
            }
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Lưu & Tải xuống Hình ảnh';
        saveBtn.style.cssText = `
            flex: 1;
            min-width: 150px;
            padding: 12px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        saveBtn.onclick = async () => {
            if (!nameInput.value.trim()) {
                showStatus('❌ Vui lòng nhập tên album', true);
                nameInput.focus();
                return;
            }
            if (!linkInput.value.trim()) {
                showStatus('❌ Vui lòng nhập URL album imgur', true);
                linkInput.focus();
                return;
            }

            const albumId = extractAlbumId(linkInput.value.trim());
            if (!albumId) {
                showStatus('❌ Định dạng URL album imgur không hợp lệ. Dự kiến: https://imgur.com/a/ALBUMID', true);
                return;
            }

            console.log('Album ID được trích xuất:', albumId);

            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Đang tải...';
                showStatus(`📡 Đang lấy hình ảnh từ imgur (Album ID: ${albumId})...`);

                const images = await fetchImgurAlbumImages(albumId);

                if (images.length === 0) {
                    showStatus('❌ Không tìm thấy hình ảnh trong album', true);
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lưu & Tải xuống Hình ảnh';
                    return;
                }

                showStatus(`✓ Đã tìm thấy ${images.length} hình ảnh. Đang chuyển đổi sang base64 (tải ${PARALLEL_DOWNLOADS} hình song song)...`);

                let preview = null;
                try {
                    preview = await urlToBase64(images[0].link);
                    showStatus(`✓ Đã chuyển đổi xem trước. Đang xử lý ${images.length} hình ảnh...`);
                } catch (e) {
                    console.warn('Chuyển đổi xem trước không thành công:', e);
                    preview = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23ddd" width="80" height="80"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="11">Không có xem trước</text></svg>';
                }

                const { base64Images, errors } = await downloadImagesInParallel(images);

                if (base64Images.length === 0) {
                    showStatus('❌ Không thể chuyển đổi bất kỳ hình ảnh nào', true);
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Lưu & Tải xuống Hình ảnh';
                    return;
                }

                const album = {
                    name: nameInput.value.trim(),
                    link: linkInput.value.trim(),
                    albumId: albumId,
                    preview: preview,
                    images: base64Images,
                    savedAt: new Date().toISOString()
                };

                saveAlbum(album);

                let successMsg = `✅ Thành công! Đã lưu ${base64Images.length}/${images.length} hình ảnh.`;
                if (errors.length > 0) {
                    successMsg += ` (${errors.length} lỗi)`;
                }
                showStatus(successMsg);

                setTimeout(() => {
                    modal.remove();
                    showSettingsDialog();
                }, 1500);
            } catch (e) {
                console.error('Lỗi:', e);
                showStatus(`❌ Lỗi: ${e}`, true);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Lưu & Tải xuống Hình ảnh';
            }
        };
        buttonContainer.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.cssText = `
            flex: 1;
            min-width: 100px;
            padding: 12px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onclick = () => {
            modal.remove();
            showSettingsDialog();
        };
        buttonContainer.appendChild(cancelBtn);

        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        setTimeout(() => nameInput.focus(), 100);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                showSettingsDialog();
            }
        };
    }

    function showClientIDEditor() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 30px;
            border-radius: 8px;
            max-width: 550px;
            width: 95%;
            border: 1px solid ${theme.border};
        `;

        const title = document.createElement('h2');
        title.textContent = '🔑 Cài đặt API Key';
        title.style.marginBottom = '20px';
        content.appendChild(title);

        const info = document.createElement('div');
        info.style.cssText = `
            background: ${theme.warningBox};
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 13px;
            color: ${theme.warningText};
        `;
        info.innerHTML = `
            <strong>Để có được Key của riêng bạn:</strong><br>
            1. Truy cập <a href="https://imgur.com/account/settings/apps" target="_blank" style="color: inherit;">imgur.com/account/settings/apps</a><br>
            2. Đăng ký ứng dụng mới<br>
            3. Sao chép <strong>Key</strong> và dán ở đây
        `;
        content.appendChild(info);

        const label = document.createElement('label');
        label.textContent = 'API Key:';
        label.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        `;
        content.appendChild(label);

        const input = document.createElement('input');
        input.type = 'password';
        input.placeholder = 'Nhập API Key mới để thay đổi';
        input.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid ${theme.border};
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
            font-family: monospace;
            background: ${theme.lightBg};
            color: ${theme.text};
        `;
        content.appendChild(input);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Lưu';
        saveBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.success};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        saveBtn.onclick = () => {
            if (!input.value.trim()) {
                alert('Vui lòng nhập API Key mới');
                return;
            }
            _x = input.value.trim();
            GM_setValue(_k, _x);
            alert('✓ API Key đã được cập nhật!');
            modal.remove();
        };
        buttonContainer.appendChild(saveBtn);

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Đặt lại về mặc định';
        resetBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #ff9800;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        resetBtn.onclick = () => {
            input.value = '';
            input.placeholder = 'Nhập API Key mới để thay đổi';
            _x = '66850c248e91c93';
            GM_setValue(_k, _x);
            alert('✓ API Key đã được đặt lại về mặc định!');
            modal.remove();
            showClientIDEditor();
        };
        buttonContainer.appendChild(resetBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Hủy';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: ${theme.secondary};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        cancelBtn.onclick = () => modal.remove();
        buttonContainer.appendChild(cancelBtn);

        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);

        setTimeout(() => input.focus(), 100);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    function showEmojiPicker(editorElement) {
        const albums = getAlbums();
        const recentEmojis = getRecentEmojis();

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10003;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: ${theme.bg};
            color: ${theme.text};
            padding: 20px;
            border-radius: 8px;
            max-width: 1000px;
            max-height: 75vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            width: 98%;
            border: 1px solid ${theme.border};
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-shrink: 0;
        `;

        const title = document.createElement('h2');
        title.textContent = '😀 Chọn Emoji';
        title.style.cssText = `
            margin: 0;
            font-size: 20px;
        `;
        header.appendChild(title);

        const closeXBtn = document.createElement('button');
        closeXBtn.innerHTML = '✕';
        closeXBtn.style.cssText = `
            background: ${theme.lightBg};
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${theme.text};
            transition: all 0.2s;
            padding: 0;
        `;
        closeXBtn.onmouseover = function () {
            this.style.background = theme.border;
        };
        closeXBtn.onmouseout = function () {
            this.style.background = theme.lightBg;
        };
        closeXBtn.onclick = () => {
            modal.remove();
        };
        header.appendChild(closeXBtn);

        content.appendChild(header);

        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = `
            display: flex;
            gap: 8px;
            border-bottom: 2px solid ${theme.border};
            overflow-x: auto;
            padding-bottom: 10px;
            margin-bottom: 15px;
            flex-shrink: 0;
        `;

        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            border: 1px solid ${theme.border};
            border-radius: 4px;
            padding: 10px;
        `;

        const tabsData = [];

        let shouldShowRecent = true;
        if (recentEmojis.length > 0) {
            const recentTabButton = document.createElement('button');
            recentTabButton.textContent = 'Gần đây';
            recentTabButton.style.cssText = `
                padding: 10px 16px;
                background: ${theme.primary};
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                font-size: 13px;
                font-weight: bold;
                transition: all 0.3s;
            `;

            tabsData.push({
                button: recentTabButton,
                album: {
                    name: 'Gần đây',
                    images: recentEmojis
                },
                index: -1,
                isRecent: true
            });

            tabContainer.appendChild(recentTabButton);
        } else {
            shouldShowRecent = false;
        }

        albums.forEach((album, index) => {
            const tabButton = document.createElement('button');
            tabButton.textContent = album.name;
            tabButton.style.cssText = `
                padding: 10px 16px;
                background: ${shouldShowRecent || index > 0 ? theme.lightBg : theme.primary};
                color: ${shouldShowRecent || index > 0 ? theme.text : 'white'};
                border: none;
                border-radius: 4px;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                font-size: 13px;
                font-weight: ${shouldShowRecent || index > 0 ? 'normal' : 'bold'};
                transition: all 0.3s;
            `;

            tabsData.push({
                button: tabButton,
                album: album,
                index: index,
                isRecent: false
            });

            tabButton.onmouseover = function () {
                if (this.style.color !== 'white') {
                    this.style.opacity = '0.8';
                }
            };

            tabButton.onmouseout = function () {
                this.style.opacity = '1';
            };

            tabContainer.appendChild(tabButton);
        });

        content.appendChild(tabContainer);
        content.appendChild(contentContainer);

        function renderAlbumContent(album, isRecent = false) {
            contentContainer.innerHTML = '';

            if (!album.images || album.images.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = isRecent ? 'Không có emoji nào' : 'Album trống';
                emptyMsg.style.cssText = `
                    padding: 40px 20px;
                    text-align: center;
                    color: ${theme.lightText};
                    font-size: 14px;
                `;
                contentContainer.appendChild(emptyMsg);
                return;
            }

            const imagesGrid = document.createElement('div');
            imagesGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                gap: 12px;
            `;

            album.images.forEach((img) => {
                const imgContainer = document.createElement('div');
                imgContainer.style.cssText = `
                    cursor: pointer;
                    text-align: center;
                    padding: 8px;
                    border-radius: 6px;
                    border: 2px solid ${theme.border};
                    transition: all 0.2s;
                `;

                imgContainer.onmouseover = function () {
                    this.style.borderColor = theme.primary;
                    this.style.background = isDarkMode ? '#2a4a6a' : '#f0f7ff';
                    this.style.transform = 'scale(1.05)';
                };

                imgContainer.onmouseout = function () {
                    this.style.borderColor = theme.border;
                    this.style.background = 'transparent';
                    this.style.transform = 'scale(1)';
                };

                const image = document.createElement('img');
                image.src = img.base64 || img.url;
                image.alt = 'emoji';
                image.style.cssText = `
                    max-width: 100%;
                    max-height: 80px;
                    object-fit: contain;
                `;

                image.onerror = function () {
                    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23f0f0f0" width="80" height="80"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">Lỗi</text></svg>';
                };

                imgContainer.appendChild(image);

                imgContainer.onclick = () => {
                    const emojiUrl = img.url;
                    const emojiBase64 = img.base64;

                    addRecentEmoji(emojiUrl, emojiBase64);

                    const bbcode = `[IMG size="80x80"]${emojiUrl}[/IMG]`;

                    const editor = editorElement.querySelector('.fr-element');

                    if (editor) {
                        editor.focus();
                        document.execCommand('insertText', false, bbcode);
                    } else {
                        const contentEditable = editorElement.querySelector('[contenteditable="true"]');
                        const textarea = editorElement.querySelector('textarea');

                        if (contentEditable) {
                            contentEditable.focus();
                            document.execCommand('insertText', false, bbcode);
                        } else if (textarea) {
                            textarea.focus();
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            textarea.value = textarea.value.substring(0, start) + bbcode + textarea.value.substring(end);
                            textarea.selectionStart = textarea.selectionEnd = start + bbcode.length;
                        }
                    }

                    modal.remove();
                };

                imgContainer.title = 'Nhấp để chèn';
                imagesGrid.appendChild(imgContainer);
            });

            contentContainer.appendChild(imagesGrid);
        }

        if (shouldShowRecent) {
            const recentAlbum = tabsData[0].album;
            renderAlbumContent(recentAlbum, true);
        } else if (albums.length > 0) {
            renderAlbumContent(albums[0], false);
        }

        tabsData.forEach((tabData, tabIndex) => {
            tabData.button.onclick = () => {
                tabsData.forEach((td) => {
                    td.button.style.background = theme.lightBg;
                    td.button.style.color = theme.text;
                    td.button.style.fontWeight = 'normal';
                });
                tabData.button.style.background = theme.primary;
                tabData.button.style.color = 'white';
                tabData.button.style.fontWeight = 'bold';

                renderAlbumContent(tabData.album, tabData.isRecent);
            };
        });

        modal.appendChild(content);
        document.body.appendChild(modal);

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addEmojiButton() {
        const toolbars = document.querySelectorAll('.fr-toolbar');

        if (toolbars.length === 0) return;

        toolbars.forEach((toolbar) => {
            if (toolbar.querySelector('.voz-emoji-btn')) return;

            try {
                const editor = toolbar.closest('.fr-box') || toolbar.closest('form') || toolbar.parentElement;

                if (!editor) return;

                const moreRichBtn = toolbar.querySelector('[data-cmd="moreRich"]');

                if (moreRichBtn) {
                    const btnGroup = document.createElement('div');
                    btnGroup.className = 'fr-btn-grp fr-float-left';
                    btnGroup.style.cssText = 'display: inline-flex; gap: 0;';

                    const emojiBtn = document.createElement('button');
                    emojiBtn.type = 'button';
                    emojiBtn.tabIndex = '-1';
                    emojiBtn.className = 'fr-command fr-btn voz-emoji-btn';
                    emojiBtn.title = 'Emoji';
                    emojiBtn.innerHTML = '😀';
                    emojiBtn.style.cssText = `
                        font-size: 18px;
                        line-height: 1;
                        padding: 8px 12px;
                        background: inherit;
                        border: 1px solid transparent;
                        cursor: pointer;
                        margin: 0;
                        color: ${theme.text};
                    `;

                    emojiBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showEmojiPicker(editor);
                    };

                    emojiBtn.onmouseover = function () {
                        this.style.background = theme.lightBg;
                    };

                    emojiBtn.onmouseout = function () {
                        this.style.background = 'inherit';
                    };

                    btnGroup.appendChild(emojiBtn);
                    moreRichBtn.parentElement.insertAdjacentElement('afterend', btnGroup);

                    console.log('[VOZ Emoji] Nút được thêm thành công cho toolbar');
                }
            } catch (e) {
                console.error('[VOZ Emoji] Lỗi khi thêm nút:', e);
            }
        });
    }

    function registerMenuCommands() {
        GM_registerMenuCommand('📚 Cài đặt Emoji', () => {
            showSettingsDialog();
        });

        GM_registerMenuCommand('🔑 Chỉnh sửa API Key', () => {
            showClientIDEditor();
        });

        GM_registerMenuCommand('💾 Sao lưu dữ liệu', () => {
            showBackupDialog();
        });
    }

    function init() {
        initDatabase();
        registerMenuCommands();

        setTimeout(() => {
            addEmojiButton();
        }, 1000);

        const observer = new MutationObserver(() => {
            addEmojiButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
