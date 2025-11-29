'use strict';
(function () {
    const App = {
        projectFiles: {},
        activeTab: 'web',
        detectedLang: null,
        elements: {},
        exampleIndex: 0,
        inputValues: [],

        async runCode() {
            this.switchTab('terminal');
            if (!this.detectedLang) return;

            const terminal = this.elements.terminalView;
            const rawStdinVal = document.getElementById('rawStdin').value;
            let finalStdin = rawStdinVal;
            const dynamicContainer = document.getElementById('dynamicInputs');

            // --- GİRİŞ KONTROLÜ (GÜVENLİK) ---
            // Eğer dinamik inputlar aktifse ve boşsa çalıştırma
            if (dynamicContainer.style.display !== 'none' && this.inputValues.length > 0) {
                const hasEmptyInputs = this.inputValues.some(val => val.trim() === "");

                if (hasEmptyInputs) {
                    this.showToast("Girdiler eksik! Lütfen doldurun.", "warning");

                    // Paneli aç
                    this.elements.stdinWrapper.classList.remove('collapsed');

                    // Hatalı inputları salla
                    const inputs = dynamicContainer.querySelectorAll('input');
                    inputs.forEach(input => {
                        if (!input.value.trim()) {
                            input.classList.add('error');
                            setTimeout(() => input.classList.remove('error'), 300);
                        }
                    });
                    return; // ÇALIŞTIRMAYI DURDUR
                }
                finalStdin = this.inputValues.join('\n');
            }
            // ------------------------------------

            terminal.innerHTML = '<div class="terminal-info">Sunucuya bağlanılıyor...</div>';

            let language = 'python';
            let fileName = 'main.py';

            if (this.projectFiles['main.c']) { language = 'c'; fileName = 'main.c'; }
            else if (this.projectFiles['main.cpp']) { language = 'cpp'; fileName = 'main.cpp'; }
            else if (this.projectFiles['index.js'] && !this.projectFiles['index.html']) { language = 'javascript'; fileName = 'index.js'; }
            else if (this.projectFiles['main.py']) { language = 'python'; fileName = 'main.py'; }

            const content = this.projectFiles[fileName];

            try {
                const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: language,
                        version: "*",
                        files: [{ content: content }],
                        stdin: finalStdin
                    })
                });

                const data = await response.json();
                terminal.innerHTML = '';

                if (data.run && data.run.stdout) terminal.innerHTML += `<div class="terminal-line">${this.escapeHtml(data.run.stdout)}</div>`;
                if (data.run && data.run.stderr) terminal.innerHTML += `<div class="terminal-line terminal-error">${this.escapeHtml(data.run.stderr)}</div>`;
                if (!data.run) terminal.innerHTML += `<div class="terminal-line terminal-error">API Hatası</div>`;

                terminal.innerHTML += `<div class="terminal-info" style="margin-top:10px;">--- İşlem tamamlandı ---</div>`;

            } catch (error) {
                terminal.innerHTML = `<div class="terminal-line terminal-error">Bağlantı Hatası: ${error.message}</div>`;
            }
        },

        escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); },

        init() { this.cacheElements(); this.addEventListeners(); this.updateEditorStats(); },
        cacheElements() {
            const ids = ['projectInput', 'parseBtn', 'downloadBtn', 'refreshBtn', 'fullscreenBtn',
                'pasteBtn', 'helpBtn', 'helpModal', 'closeHelpModalBtn', 'copyCodeBtn',
                'statsBar', 'fileCount', 'totalSize', 'fileBadge', 'fileListContainer',
                'previewContainer', 'appContainer', 'splitter', 'temizleBtn',
                'ornekYukleBtn', 'undoBtn', 'downloadModal', 'closeDownloadModalBtn',
                'projectNameInput', 'confirmDownloadBtn', 'cancelDownloadBtn', 'editorStats',
                'dropOverlay', 'webFrame', 'terminalContainer', 'terminalView', 'runCodeBtn',
                'tabWeb', 'tabTerminal', 'emptyView', 'manualToggle', 'dynamicInputs', 'rawStdin',
                'stdinWrapper', 'stdinHeader', 'stdinResizer'];

            ids.forEach(id => this.elements[id] = document.getElementById(id));
        },
        addEventListeners() {
            this.elements.parseBtn.addEventListener('click', () => this.parseProject());
            this.elements.downloadBtn.addEventListener('click', () => this.openDownloadModal());
            this.elements.refreshBtn.addEventListener('click', () => this.updatePreview(true));
            this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
            this.elements.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
            this.elements.helpBtn.addEventListener('click', () => this.toggleModal('help', true));
            this.elements.closeHelpModalBtn.addEventListener('click', () => this.toggleModal('help', false));
            this.elements.helpModal.addEventListener('click', (e) => { if (e.target === this.elements.helpModal) this.toggleModal('help', false); });
            this.elements.copyCodeBtn.addEventListener('click', () => this.copyHelpText());
            this.elements.temizleBtn.addEventListener('click', () => this.clearEditor());
            this.elements.ornekYukleBtn.addEventListener('click', () => this.loadNextExample());
            this.elements.undoBtn.addEventListener('click', () => this.undo());
            this.elements.closeDownloadModalBtn.addEventListener('click', () => this.toggleModal('download', false));
            this.elements.cancelDownloadBtn.addEventListener('click', () => this.toggleModal('download', false));
            this.elements.confirmDownloadBtn.addEventListener('click', () => this.downloadZip());
            this.elements.downloadModal.addEventListener('click', (e) => { if (e.target === this.elements.downloadModal) this.toggleModal('download', false); });
            this.elements.projectNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.downloadZip(); });
            this.elements.projectInput.addEventListener('input', () => this.updateEditorStats());
            this.elements.projectInput.addEventListener('keydown', function (e) {
                if (e.key === 'Tab') { e.preventDefault(); const s = this.selectionStart; this.value = this.value.substring(0, this.selectionStart) + "    " + this.value.substring(this.selectionEnd); this.selectionStart = this.selectionEnd = s + 4; }
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.toggleModal('help', false); this.toggleModal('download', false); } if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); } });
            this.elements.runCodeBtn.addEventListener('click', () => this.runCode());
            this.elements.tabWeb.addEventListener('click', () => this.switchTab('web'));
            this.elements.tabTerminal.addEventListener('click', () => this.switchTab('terminal'));
            this.elements.splitter.addEventListener('mousedown', (e) => this.initSplitterDrag(e));

            this.elements.manualToggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Header click'i engelle
                const isRawVisible = this.elements.rawStdin.classList.contains('visible');
                if (isRawVisible) {
                    this.elements.rawStdin.classList.remove('visible');
                    this.elements.dynamicInputs.style.display = 'flex';
                    this.elements.manualToggle.textContent = 'Manuel Düzenle';
                } else {
                    this.elements.rawStdin.classList.add('visible');
                    this.elements.dynamicInputs.style.display = 'none';
                    this.elements.manualToggle.textContent = 'Akıllı Mod';
                }
            });

            // --- PANEL KOZMETİK İŞLEMLERİ ---
            this.elements.stdinHeader.addEventListener('click', () => {
                this.elements.stdinWrapper.classList.toggle('collapsed');
            });

            // Resizer Logic
            this.elements.stdinResizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const startY = e.clientY;
                const startHeight = this.elements.stdinWrapper.offsetHeight;
                this.elements.stdinWrapper.classList.add('dragging'); // Animasyonu kapat

                const onMouseMove = (ev) => {
                    const newHeight = startHeight - (ev.clientY - startY);
                    if (newHeight > 36 && newHeight < 600) {
                        this.elements.stdinWrapper.style.height = `${newHeight}px`;
                    }
                };

                const onMouseUp = () => {
                    this.elements.stdinWrapper.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        },

        generateInputFields(code) {
            this.inputValues = [];
            const container = this.elements.dynamicInputs;
            container.innerHTML = '';

            if (!code) return;

            let match;
            let count = 0;
            const matches = [];

            // Sadece ilgili dile göre regex kullan
            if (this.detectedLang === 'c' || this.detectedLang === 'cpp') {
                // C/C++ için sadece magic comment kullan: // input("Label")
                const cMagicRegex = /\/\/\s*input\s*\(\s*["']([^"']+)["']\s*\)/g;
                while ((match = cMagicRegex.exec(code)) !== null) {
                    matches.push({ label: match[1], index: match.index });
                }
            } else {
                // Python için normal input() kullan
                const pyRegex = /input\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
                while ((match = pyRegex.exec(code)) !== null) {
                    matches.push({ label: match[1], index: match.index });
                }
            }

            // Sıralı olması için index'e göre diz (kod akışına göre)
            matches.sort((a, b) => a.index - b.index);

            matches.forEach((m) => {
                count++;
                const row = document.createElement('div');
                row.className = 'input-row';

                const label = document.createElement('label');
                label.textContent = m.label;
                // C magic comment ise yanına küçük bir işaret koy
                if (this.detectedLang === 'c' || this.detectedLang === 'cpp') {
                    const badge = document.createElement('span');
                    badge.style.fontSize = '10px';
                    badge.style.opacity = '0.6';
                    badge.style.marginLeft = '4px';
                    badge.textContent = '(C magic)';
                    label.appendChild(badge);
                }

                const input = document.createElement('input');
                input.type = 'text';
                input.dataset.index = count - 1;
                input.placeholder = 'Değer girin...';

                input.addEventListener('input', (e) => {
                    this.inputValues[e.target.dataset.index] = e.target.value;
                    this.elements.rawStdin.value = this.inputValues.join('\n');
                });

                row.appendChild(label);
                row.appendChild(input);
                container.appendChild(row);
                this.inputValues.push("");
            });

            if (count === 0) {
                let msg = 'Kodda input() algılanmadı.';
                if (this.detectedLang === 'c' || this.detectedLang === 'cpp') {
                    msg += ' <br><small>İpucu: <code>// input("Label")</code> kullanın.</small>';
                }
                container.innerHTML = `<div class="empty-inputs-msg">${msg}</div>`;
                // Input yoksa paneli kapat
                this.elements.stdinWrapper.classList.add('collapsed');
            } else {
                this.elements.stdinWrapper.classList.remove('collapsed');
            }
        },

        switchTab(tab) {
            this.activeTab = tab;
            this.elements.tabWeb.classList.toggle('active', tab === 'web');
            this.elements.tabTerminal.classList.toggle('active', tab === 'terminal');

            const hasFiles = Object.keys(this.projectFiles).length > 0;

            if (tab === 'web') {
                if (hasFiles) {
                    this.elements.webFrame.classList.add('active');
                    this.elements.emptyView.style.display = 'none';
                } else {
                    this.elements.webFrame.classList.remove('active');
                    this.elements.emptyView.style.display = 'flex';
                }
                this.elements.terminalContainer.classList.remove('active');
                this.elements.refreshBtn.style.display = 'inline-flex';
            } else {
                if (hasFiles) {
                    this.elements.terminalContainer.classList.add('active');
                    this.elements.emptyView.style.display = 'none';
                } else {
                    this.elements.terminalContainer.classList.remove('active');
                    this.elements.emptyView.style.display = 'flex';
                }
                this.elements.webFrame.classList.remove('active');
                this.elements.refreshBtn.style.display = 'none';
            }
        },

        undoStack: [],
        maxUndoSteps: 10,
        saveToUndoStack() {
            this.undoStack.push({ files: JSON.parse(JSON.stringify(this.projectFiles)), input: this.elements.projectInput.value });
            if (this.undoStack.length > this.maxUndoSteps) this.undoStack.shift();
            this.elements.undoBtn.disabled = false;
        },

        undo() {
            if (this.undoStack.length === 0) return;
            const state = this.undoStack.pop();
            this.projectFiles = state.files;
            this.elements.projectInput.value = state.input;

            // Dosya varsa normal güncelle
            if (Object.keys(this.projectFiles).length > 0) {
                this.updateUI();
                this.updatePreview();
            } else {
                // Dosya yoksa temiz slate - clearEditor gibi davran
                this.updateUI();
                this.switchTab('web');
                this.elements.webFrame.srcdoc = '';
                this.elements.webFrame.classList.remove('active');
                this.elements.terminalContainer.classList.remove('active');
                this.elements.emptyView.style.display = 'flex';
                this.elements.refreshBtn.disabled = true;
                this.elements.runCodeBtn.style.display = 'none';
            }

            this.elements.undoBtn.disabled = this.undoStack.length === 0;
            this.showToast('Geri alındı!', 'info');
        },

        parseProject() {
            // Mevcut durumu kaydet (değişiklik yapmadan önce!)
            this.saveToUndoStack();

            const raw = this.elements.projectInput.value;
            const headerRegex = /^\s*\/\/\s*-{3,}\s*(.+?)\s*-{3,}/;
            const lines = raw.replace(/\r\n?/g, '\n').split('\n');
            const parsedFiles = {}; let currentFile = null; let currentContent = [];
            for (const line of lines) {
                const match = line.match(headerRegex);
                if (match) { if (currentFile) parsedFiles[currentFile] = currentContent.join('\n').trim(); currentFile = match[1].trim(); currentContent = []; }
                else if (currentFile !== null) currentContent.push(line);
            }
            if (currentFile) parsedFiles[currentFile] = currentContent.join('\n').trim();
            if (Object.keys(parsedFiles).length === 0 && raw.trim()) { this.projectFiles = {}; this.showToast("Format yok!", "error"); }
            else {
                this.projectFiles = parsedFiles;
                this.showToast(`${Object.keys(parsedFiles).length} dosya!`, "success");
                const activeCode = parsedFiles['main.py'] || parsedFiles['main.c'] || parsedFiles['main.cpp'] || '';
                this.generateInputFields(activeCode);
            }
            this.updateUI(); this.updatePreview();
        },

        updateUI() {
            const paths = Object.keys(this.projectFiles), count = paths.length;
            this.updateEditorStats();
            const hasFiles = count > 0;
            this.elements.statsBar.style.display = hasFiles ? "flex" : "none"; this.elements.fileBadge.style.display = hasFiles ? "inline-block" : "none"; this.elements.downloadBtn.disabled = !hasFiles;
            if (hasFiles) {
                const totalSize = paths.reduce((acc, path) => acc + new Blob([this.projectFiles[path]]).size, 0);
                this.elements.fileCount.textContent = count; this.elements.totalSize.textContent = (totalSize / 1024).toFixed(1); this.elements.fileBadge.textContent = count;
                this.elements.fileListContainer.innerHTML = `<div class="file-tree">${this.renderFileTree(this.buildFileTree())}</div>`;
            } else this.elements.fileListContainer.innerHTML = `<div class="empty-state"><p><strong>Dosya yok</strong></p></div>`;
        },

        updateEditorStats() { const text = this.elements.projectInput.value; this.elements.editorStats.textContent = `${text.split('\n').length} satır • ${text.length} krk`; this.elements.temizleBtn.disabled = text.length === 0; this.elements.undoBtn.disabled = this.undoStack.length === 0; },
        buildFileTree() { const tree = {}; Object.keys(this.projectFiles).forEach(path => { const parts = path.split('/').filter(Boolean); let currentLevel = tree; parts.forEach((part, index) => { if (index === parts.length - 1) currentLevel[part] = { __isFile: true, size: new Blob([this.projectFiles[path]]).size }; else { if (!currentLevel[part]) currentLevel[part] = { __isFolder: true, children: {} }; currentLevel = currentLevel[part].children; } }); }); return tree; },
        renderFileTree(node) { if (!node || Object.keys(node).length === 0) return ''; const sortedKeys = Object.keys(node).sort((a, b) => { const aIsFolder = node[a].__isFolder, bIsFolder = node[b].__isFolder; if (aIsFolder && !bIsFolder) return -1; if (!aIsFolder && bIsFolder) return 1; return a.localeCompare(b); }); let html = '<ul>'; sortedKeys.forEach(key => { const item = node[key]; if (item.__isFolder) html += `<li class="folder"><div class="file-details"><span class="file-name">${key}</span></div>${this.renderFileTree(item.children)}</li>`; else if (item.__isFile) html += `<li class="file"><div class="file-details"><span class="file-name">${key}</span><span class="file-size">${(item.size / 1024).toFixed(2)} KB</span></div></li>`; }); return html + '</ul>'; },

        updatePreview(isRefresh = false) {
            const hasIndexHtml = this.projectFiles["index.html"];
            const hasMainPy = this.projectFiles["main.py"];
            const hasMainC = this.projectFiles["main.c"];
            const hasMainCpp = this.projectFiles["main.cpp"];
            const hasAnyFile = Object.keys(this.projectFiles).length > 0;

            // ÖNEMLİ: Hiç dosya yoksa direkt empty state göster
            if (!hasAnyFile) {
                this.elements.webFrame.srcdoc = "";
                this.elements.webFrame.classList.remove('active');
                this.elements.terminalContainer.classList.remove('active');
                this.elements.emptyView.style.display = 'flex';
                this.elements.refreshBtn.disabled = true;
                this.elements.runCodeBtn.style.display = 'none';
                return;
            }

            // HTML dosyası bulma: Önce index.html, yoksa herhangi bir .html
            let htmlFileName = null;
            if (hasIndexHtml) {
                htmlFileName = "index.html";
            } else {
                const htmlFiles = Object.keys(this.projectFiles).filter(f => f.endsWith('.html'));
                if (htmlFiles.length > 0) {
                    htmlFileName = htmlFiles[0];
                }
            }

            if (htmlFileName) {
                if (isRefresh) this.showToast("Önizleme yenilendi", "info");
                let htmlContent = this.projectFiles[htmlFileName];
                const cssFiles = Object.keys(this.projectFiles).filter(f => f.endsWith('.css'));
                let inlineCss = cssFiles.map(cssFile => this.projectFiles[cssFile]).join('\n');
                const jsFiles = Object.keys(this.projectFiles).filter(f => f.endsWith('.js'));
                let inlineJs = jsFiles.map(jsFile => this.projectFiles[jsFile]).join('\n');
                htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
                htmlContent = htmlContent.replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '');
                if (inlineCss) { if (htmlContent.includes('</head>')) htmlContent = htmlContent.replace('</head>', '<style>' + inlineCss + '</style></head>'); else htmlContent = '<style>' + inlineCss + '</style>' + htmlContent; }
                if (inlineJs) { if (htmlContent.includes('</body>')) htmlContent = htmlContent.replace('</body>', '<script>' + inlineJs + '<\/script></body>'); else htmlContent += '<script>' + inlineJs + '<\/script>'; }
                this.elements.webFrame.srcdoc = htmlContent;
                this.elements.emptyView.style.display = 'none';
                if (this.activeTab !== 'terminal') this.elements.webFrame.classList.add('active');
            } else this.elements.webFrame.srcdoc = "";

            this.detectedLang = null;
            if (hasMainPy) this.detectedLang = 'python';
            else if (hasMainC) this.detectedLang = 'c';
            else if (hasMainCpp) this.detectedLang = 'cpp';

            if (this.detectedLang) {
                this.elements.runCodeBtn.style.display = 'inline-flex';
                if (!htmlFileName) this.switchTab('terminal');
            } else {
                this.elements.runCodeBtn.style.display = 'none';
                if (!htmlFileName) {
                    this.elements.emptyView.style.display = 'flex';
                    this.elements.webFrame.classList.remove('active');
                    this.elements.terminalContainer.classList.remove('active');
                }
            }
            this.elements.refreshBtn.disabled = !htmlFileName;
        },

        openDownloadModal() { if (Object.keys(this.projectFiles).length === 0) return; this.elements.projectNameInput.value = 'proje'; this.toggleModal('download', true); setTimeout(() => this.elements.projectNameInput.select(), 100); },
        async downloadZip() { const projectName = this.elements.projectNameInput.value.trim() || 'proje'; const fileName = projectName.endsWith('.zip') ? projectName : `${projectName}.zip`; this.toggleModal('download', false); if (Object.keys(this.projectFiles).length === 0) return; const zip = new JSZip(); for (const [filename, content] of Object.entries(this.projectFiles)) zip.file(filename, content); const blob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); this.showToast(`${fileName} indirildi!`, 'success'); },
        toggleFullscreen() { if (!document.fullscreenElement) this.elements.previewContainer.requestFullscreen(); else document.exitFullscreen(); },
        toggleModal(type, show) { const modal = type === 'help' ? this.elements.helpModal : this.elements.downloadModal; modal.style.display = show ? 'flex' : 'none'; },
        copyHelpText() { const commandText = document.querySelector('#ai-command-wrapper pre code').textContent; if (commandText) navigator.clipboard.writeText(commandText).then(() => this.showToast('Kopyalandı!', 'success')).catch(() => this.showToast('Hata!', 'error')); },
        clearEditor() {
            if (!this.elements.projectInput.value.trim()) return;
            this.saveToUndoStack();
            this.elements.projectInput.value = '';
            this.projectFiles = {};
            this.detectedLang = null;

            // Sağ paneli varsayılan 'Web' sekmesine zorla
            this.switchTab('web');

            // Önizleme ve terminali gizle, sadece 'Önizleme Yok' göster
            this.elements.webFrame.srcdoc = '';
            this.elements.webFrame.classList.remove('active');
            this.elements.terminalContainer.classList.remove('active');
            this.elements.emptyView.style.display = 'flex';

            // UI elemanlarını boş duruma göre güncelle
            this.elements.refreshBtn.disabled = true;
            this.elements.runCodeBtn.style.display = 'none';

            this.updateUI();
            this.showToast('Temizlendi.', 'info');
        },
        loadNextExample() { this.saveToUndoStack(); const examples = ['examplePy', 'exampleC', 'exampleWeb']; const types = ['Python', 'C', 'Web']; this.exampleIndex = (this.exampleIndex + 1) % examples.length; const elId = examples[this.exampleIndex]; this.elements.projectInput.value = document.getElementById(elId).value; this.parseProject(); this.showToast(`${types[this.exampleIndex]} örneği!`, 'success'); },
        pasteFromClipboard() { navigator.clipboard.readText().then(text => { if (text) { this.elements.projectInput.value = text; this.parseProject(); this.showToast('Yapıştırıldı!', 'success'); } }).catch(() => this.showToast('Pano hatası', 'error')); },
        showToast(message, type = 'success', duration = 3500) { const existing = document.querySelector('.toast'); if (existing) existing.remove(); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span>${message}</span>`; document.body.appendChild(toast); setTimeout(() => toast.remove(), duration); },
        initSplitterDrag(e) { e.preventDefault(); const iframe = this.elements.webFrame; if (iframe) iframe.style.pointerEvents = 'none'; const onMouseMove = (moveEvent) => { const newLeftWidth = Math.max(300, Math.min(moveEvent.clientX, document.body.clientWidth - 300)); this.elements.appContainer.style.gridTemplateColumns = `${newLeftWidth}px 2px 1fr`; }; const onMouseUp = () => { if (iframe) iframe.style.pointerEvents = 'auto'; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }
    };
    App.init();
})();
