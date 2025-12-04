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
            const rawStdinVal = this.elements.rawStdin.value;
            let finalStdin = rawStdinVal;
            const dynamicContainer = this.elements.dynamicInputs;

            // --- INPUT VALIDATION (SECURITY) ---
            // If dynamic inputs are active and empty, don't run
            if (dynamicContainer.style.display !== 'none' && this.inputValues.length > 0) {
                const hasEmptyInputs = this.inputValues.some(val => val.trim() === "");

                if (hasEmptyInputs) {
                    this.showToast("Inputs missing! Please fill them.", "warning");

                    // Open panel
                    this.elements.stdinWrapper.classList.remove('collapsed');

                    // Shake invalid inputs
                    const inputs = dynamicContainer.querySelectorAll('input');
                    inputs.forEach(input => {
                        if (!input.value.trim()) {
                            input.classList.add('error');
                            setTimeout(() => input.classList.remove('error'), 300);
                        }
                    });
                    return; // STOP EXECUTION
                }
                finalStdin = this.inputValues.join('\n');
            }
            // ------------------------------------

            terminal.innerHTML = '<div class="terminal-info">Connecting to server...</div>';

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
                if (!data.run) terminal.innerHTML += `<div class="terminal-line terminal-error">API Error</div>`;

                terminal.innerHTML += `<div class="terminal-info" style="margin-top:10px;">--- Process completed ---</div>`;

            } catch (error) {
                terminal.innerHTML = `<div class="terminal-line terminal-error">Connection Error: ${error.message}</div>`;
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
            this.elements.projectInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') { e.preventDefault(); const s = e.target.selectionStart; e.target.value = e.target.value.substring(0, e.target.selectionStart) + "    " + e.target.value.substring(e.target.selectionEnd); e.target.selectionStart = e.target.selectionEnd = s + 4; }
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this.parseProject(); }
            });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { this.toggleModal('help', false); this.toggleModal('download', false); } if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); } });
            this.elements.runCodeBtn.addEventListener('click', () => this.runCode());
            this.elements.tabWeb.addEventListener('click', () => this.switchTab('web'));
            this.elements.tabTerminal.addEventListener('click', () => this.switchTab('terminal'));
            this.elements.splitter.addEventListener('mousedown', (e) => this.initSplitterDrag(e));

            this.elements.manualToggle.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header click
                const isRawVisible = this.elements.rawStdin.classList.contains('visible');
                if (isRawVisible) {
                    this.elements.rawStdin.classList.remove('visible');
                    this.elements.dynamicInputs.style.display = 'flex';
                    this.elements.manualToggle.textContent = 'Manual Edit';
                } else {
                    this.elements.rawStdin.classList.add('visible');
                    this.elements.dynamicInputs.style.display = 'none';
                    this.elements.manualToggle.textContent = 'Smart Mode';
                }
            });

            // --- PANEL COSMETIC OPERATIONS ---
            this.elements.stdinHeader.addEventListener('click', () => {
                this.elements.stdinWrapper.classList.toggle('collapsed');
            });

            // Resizer Logic
            this.elements.stdinResizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const startY = e.clientY;
                const startHeight = this.elements.stdinWrapper.offsetHeight;
                this.elements.stdinWrapper.classList.add('dragging'); // Disable animation

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

            // --- DRAG & DROP FUNCTIONALITY ---
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                document.body.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            document.body.addEventListener('dragenter', () => {
                this.elements.dropOverlay.classList.add('visible');
            });

            document.body.addEventListener('dragleave', (e) => {
                if (e.target === document.body || e.target === this.elements.dropOverlay) {
                    this.elements.dropOverlay.classList.remove('visible');
                }
            });

            document.body.addEventListener('drop', async (e) => {
                this.elements.dropOverlay.classList.remove('visible');
                const files = e.dataTransfer.files;

                if (files.length > 0) {
                    await this.handleDroppedFiles(files);
                }
            });
        },

        generateInputFields(code) {
            this.inputValues = [];
            const container = this.elements.dynamicInputs;
            container.innerHTML = '';

            // Close panel if no code or web project (doesn't need stdin)
            if (!code || this.detectedLang === 'web') {
                container.innerHTML = '<div class="empty-inputs-msg">No input needed for this project.</div>';
                this.elements.stdinWrapper.classList.add('collapsed');
                return;
            }

            let match;
            let count = 0;
            const matches = [];

            // Use regex based on detected language only
            if (this.detectedLang === 'c' || this.detectedLang === 'cpp') {
                // For C/C++ use magic comment only: // input("Label")
                const cMagicRegex = /\/\/\s*input\s*\(\s*["']([^"']+)["']\s*\)/g;
                while ((match = cMagicRegex.exec(code)) !== null) {
                    matches.push({ label: match[1], index: match.index });
                }
            } else {
                // For Python use normal input()
                const pyRegex = /input\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
                while ((match = pyRegex.exec(code)) !== null) {
                    matches.push({ label: match[1], index: match.index });
                }
            }

            // Sort by index (by code flow)
            matches.sort((a, b) => a.index - b.index);

            matches.forEach((m) => {
                count++;
                const row = document.createElement('div');
                row.className = 'input-row';

                const label = document.createElement('label');
                label.textContent = m.label;
                // If C magic comment add a small marker
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
                input.placeholder = 'Enter value...';

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
                let msg = 'No input() detected in code.';
                if (this.detectedLang === 'c' || this.detectedLang === 'cpp') {
                    msg += ' <br><small>Tip: Use <code>// input("Label")</code>.</small>';
                }
                container.innerHTML = `<div class="empty-inputs-msg">${msg}</div>`;
                // Close panel if no inputs
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

            // Update normally if files exist
            if (Object.keys(this.projectFiles).length > 0) {
                this.updateUI();
                this.updatePreview();
            } else {
                // If no files, clean slate - behave like clearEditor
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
            this.showToast('Undone!', 'info');
        },

        parseProject() {
            // Save current state (before making changes!)
            this.saveToUndoStack();

            const raw = this.elements.projectInput.value;
            const headerRegex = /^\s*\/\/\s*-{3,}\s*([^\s]+\.[^\s]+)\s*-{3,}/;
            const lines = raw.replace(/\r\n?/g, '\n').split('\n');
            const parsedFiles = {}; let currentFile = null; let currentContent = [];
            for (const line of lines) {
                const match = line.match(headerRegex);
                if (match) { if (currentFile) parsedFiles[currentFile] = currentContent.join('\n').trim(); currentFile = match[1].trim(); currentContent = []; }
                else if (currentFile !== null) currentContent.push(line);
            }
            if (currentFile) parsedFiles[currentFile] = currentContent.join('\n').trim();
            if (Object.keys(parsedFiles).length === 0 && raw.trim()) { this.projectFiles = {}; this.showToast("No format!", "error"); }
            else {
                this.projectFiles = parsedFiles;
                this.showToast(`${Object.keys(parsedFiles).length} files!`, "success");
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

                // Add file click events (double-click to scroll to file)
                this.elements.fileListContainer.querySelectorAll('.file').forEach(fileEl => {
                    fileEl.addEventListener('dblclick', () => {
                        const filePath = fileEl.dataset.path;
                        this.scrollToFile(filePath);
                        // Highlight active file
                        this.elements.fileListContainer.querySelectorAll('.file').forEach(f => f.classList.remove('active'));
                        fileEl.classList.add('active');
                        // Remove highlight after 1.5 seconds
                        setTimeout(() => fileEl.classList.remove('active'), 1500);
                    });
                });

                // Add folder toggle events
                this.elements.fileListContainer.querySelectorAll('.folder > .file-details').forEach(folderDetails => {
                    folderDetails.addEventListener('click', () => {
                        const folderLi = folderDetails.parentElement;
                        folderLi.classList.toggle('collapsed');
                    });
                });
            } else this.elements.fileListContainer.innerHTML = `<div class="empty-state"><p><strong>No files</strong></p></div>`;
        },

        updateEditorStats() { const text = this.elements.projectInput.value; this.elements.editorStats.textContent = `${text.split('\n').length} lines • ${text.length} chars`; this.elements.temizleBtn.disabled = text.length === 0; this.elements.undoBtn.disabled = this.undoStack.length === 0; },

        scrollToFile(filePath) {
            const textarea = this.elements.projectInput;
            const text = textarea.value;
            // Find the file header pattern: //--- filePath ---
            const headerPattern = new RegExp(`^\\s*\\/\\/\\s*-{3,}\\s*${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-{3,}`, 'm');
            const match = text.match(headerPattern);
            if (match) {
                const index = text.indexOf(match[0]);

                // Create a mirror div to calculate exact pixel offset
                const div = document.createElement('div');
                const style = getComputedStyle(textarea);

                // Copy styles that affect layout
                const properties = [
                    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
                    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
                    'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
                    'tabSize', 'MozTabSize'
                ];

                properties.forEach(prop => {
                    div.style[prop] = style[prop];
                });

                // Reset some styles to ensure correct measurement
                div.style.position = 'absolute';
                div.style.top = '0px';
                div.style.left = '-9999px';
                div.style.visibility = 'hidden';
                div.style.whiteSpace = 'pre-wrap';
                div.style.wordWrap = 'break-word';
                div.style.width = textarea.clientWidth + 'px';
                div.style.height = 'auto';

                // Set content up to the target index
                div.textContent = text.substring(0, index);

                document.body.appendChild(div);

                // Calculate scroll position (height of text before target)
                // scrollHeight includes padding-top and padding-bottom
                // We want to scroll past the content + padding-top, but keep padding-top visible? 
                // No, scrollTop=0 shows padding-top. 
                // If we want the target line to be at the very top (hiding padding-top), we scroll height + padding-top.
                // But usually we want it to look like the first line.
                // Let's try div.scrollHeight - paddingBottom.
                const paddingBottom = parseFloat(style.paddingBottom) || 0;
                const topOffset = div.scrollHeight - paddingBottom;

                document.body.removeChild(div);

                textarea.scrollTop = topOffset;
                this.showToast(`Navigated to ${filePath}`, 'info');
            }
        },
        buildFileTree() { const tree = {}; Object.keys(this.projectFiles).forEach(path => { const parts = path.split('/').filter(Boolean); let currentLevel = tree; parts.forEach((part, index) => { if (index === parts.length - 1) currentLevel[part] = { __isFile: true, size: new Blob([this.projectFiles[path]]).size, fullPath: path }; else { if (!currentLevel[part]) currentLevel[part] = { __isFolder: true, children: {} }; currentLevel = currentLevel[part].children; } }); }); return tree; },
        renderFileTree(node) {
            if (!node || Object.keys(node).length === 0) return '';
            const sortedKeys = Object.keys(node).sort((a, b) => {
                const aIsFolder = node[a].__isFolder, bIsFolder = node[b].__isFolder;
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.localeCompare(b);
            });
            let html = '<ul>';
            sortedKeys.forEach(key => {
                const item = node[key];
                if (item.__isFolder) {
                    html += `<li class="folder"><div class="file-details"><span class="file-name">${key}</span><svg class="folder-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></div>${this.renderFileTree(item.children)}</li>`;
                } else if (item.__isFile) {
                    html += `<li class="file" data-path="${item.fullPath}"><div class="file-details"><span class="file-name">${key}</span><span class="file-size">${(item.size / 1024).toFixed(2)} KB</span></div></li>`;
                }
            });
            return html + '</ul>';
        },

        updatePreview(isRefresh = false) {
            const hasIndexHtml = this.projectFiles["index.html"];
            const hasMainPy = this.projectFiles["main.py"];
            const hasMainC = this.projectFiles["main.c"];
            const hasMainCpp = this.projectFiles["main.cpp"];
            const hasAnyFile = Object.keys(this.projectFiles).length > 0;

            // IMPORTANT: If no files, show empty state directly
            if (!hasAnyFile) {
                this.elements.webFrame.srcdoc = "";
                this.elements.webFrame.classList.remove('active');
                this.elements.terminalContainer.classList.remove('active');
                this.elements.emptyView.style.display = 'flex';
                this.elements.refreshBtn.disabled = true;
                this.elements.runCodeBtn.style.display = 'none';
                return;
            }

            // Find HTML file: First index.html, otherwise any .html
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
                if (isRefresh) this.showToast("Preview refreshed", "info");
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

            // === SMART TAB SWITCHING ===
            if (this.detectedLang) {
                this.elements.runCodeBtn.style.display = 'inline-flex';
                // Auto-switch to terminal if no HTML files exist (pure programming project)
                if (!htmlFileName) {
                    this.switchTab('terminal');
                }
                // If HTML exists, stay on preview (mixed project - HTML takes priority)
            } else {
                this.elements.runCodeBtn.style.display = 'none';
                // If no programming language and no HTML, show empty state
                if (!htmlFileName) {
                    this.elements.emptyView.style.display = 'flex';
                    this.elements.webFrame.classList.remove('active');
                    this.elements.terminalContainer.classList.remove('active');
                } else {
                    // Pure web project - ensure we're on preview tab
                    this.switchTab('web');
                }
            }
            this.elements.refreshBtn.disabled = !htmlFileName;
        },

        openDownloadModal() {
            if (Object.keys(this.projectFiles).length === 0) return;

            // Try to extract a smart project name
            let suggestedName = 'project';

            // 1. Try to get <title> from index.html
            const htmlContent = this.projectFiles['index.html'];
            if (htmlContent) {
                const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                    suggestedName = titleMatch[1].trim()
                        // Turkish character normalization
                        .replace(/ı/g, 'i').replace(/İ/g, 'i')
                        .replace(/ş/g, 's').replace(/Ş/g, 's')
                        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
                        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
                        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
                        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
                        .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
                        .replace(/\s+/g, '-') // Spaces to dashes
                        .toLowerCase()
                        .substring(0, 50); // Limit length
                }
            }

            // 2. If no HTML title, use main file name (without extension)
            if (suggestedName === 'project') {
                const mainFiles = ['main.py', 'main.c', 'main.cpp', 'app.js', 'script.js'];
                for (const file of mainFiles) {
                    if (this.projectFiles[file]) {
                        suggestedName = file.replace(/\.[^.]+$/, ''); // Remove extension
                        break;
                    }
                }
            }

            // 3. If still default, use first file name
            if (suggestedName === 'project') {
                const firstFile = Object.keys(this.projectFiles)[0];
                if (firstFile) {
                    suggestedName = firstFile.replace(/\.[^.]+$/, '').replace(/\//g, '-');
                }
            }

            this.elements.projectNameInput.value = suggestedName;
            this.toggleModal('download', true);
            setTimeout(() => this.elements.projectNameInput.select(), 100);
        },
        async downloadZip() { const projectName = this.elements.projectNameInput.value.trim() || 'project'; const fileName = projectName.endsWith('.zip') ? projectName : `${projectName}.zip`; this.toggleModal('download', false); if (Object.keys(this.projectFiles).length === 0) return; const zip = new JSZip(); for (const [filename, content] of Object.entries(this.projectFiles)) zip.file(filename, content); const blob = await zip.generateAsync({ type: "blob" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); this.showToast(`${fileName} downloaded!`, 'success'); },
        toggleFullscreen() { if (!document.fullscreenElement) this.elements.previewContainer.requestFullscreen(); else document.exitFullscreen(); },
        toggleModal(type, show) { const modal = type === 'help' ? this.elements.helpModal : this.elements.downloadModal; modal.style.display = show ? 'flex' : 'none'; },
        copyHelpText() { const commandText = document.querySelector('#ai-command-wrapper pre code').textContent; if (commandText) navigator.clipboard.writeText(commandText).then(() => this.showToast('Copied!', 'success')).catch(() => this.showToast('Error!', 'error')); },
        clearEditor() {
            if (!this.elements.projectInput.value.trim()) return;
            this.saveToUndoStack();
            this.elements.projectInput.value = '';
            this.projectFiles = {};
            this.detectedLang = null;

            // Force right panel to default 'Web' tab
            this.switchTab('web');

            // Hide preview and terminal, only show 'No Preview'
            this.elements.webFrame.srcdoc = '';
            this.elements.webFrame.classList.remove('active');
            this.elements.terminalContainer.classList.remove('active');
            this.elements.emptyView.style.display = 'flex';

            // Update UI elements to empty state
            this.elements.refreshBtn.disabled = true;
            this.elements.runCodeBtn.style.display = 'none';

            this.updateUI();
            this.showToast('Cleared.', 'info');
        },
        loadNextExample() { this.saveToUndoStack(); const examples = ['examplePy', 'exampleC', 'exampleWeb']; const types = ['Python', 'C', 'Web']; this.exampleIndex = (this.exampleIndex + 1) % examples.length; const elId = examples[this.exampleIndex]; this.elements.projectInput.value = document.getElementById(elId).value; this.parseProject(); this.showToast(`${types[this.exampleIndex]} example!`, 'success'); },
        pasteFromClipboard() { navigator.clipboard.readText().then(text => { if (text) { this.elements.projectInput.value = text; this.parseProject(); this.showToast('Pasted!', 'success'); } }).catch(() => this.showToast('Clipboard error', 'error')); },
        showToast(message, type = 'success', duration = 3500) { const existing = document.querySelector('.toast'); if (existing) existing.remove(); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span>${message}</span>`; document.body.appendChild(toast); setTimeout(() => toast.remove(), duration); },

        async handleDroppedFiles(files) {
            const file = files[0]; // Take first file only

            if (file.name.endsWith('.zip')) {
                // Handle ZIP file
                try {
                    this.showToast('Extracting ZIP...', 'info', 2000);
                    const zip = new JSZip();
                    const content = await zip.loadAsync(file);

                    let codeContent = '';
                    const filePromises = [];

                    // Get all files from ZIP
                    content.forEach((relativePath, zipEntry) => {
                        if (!zipEntry.dir) {
                            filePromises.push(
                                zipEntry.async('text').then(text => {
                                    return { path: relativePath, content: text };
                                })
                            );
                        }
                    });

                    const extractedFiles = await Promise.all(filePromises);

                    // Convert to our format
                    extractedFiles.forEach(({ path, content }) => {
                        codeContent += `//--- ${path} ---\n${content}\n\n`;
                    });

                    this.saveToUndoStack();
                    this.elements.projectInput.value = codeContent.trim();
                    this.parseProject();
                    this.showToast(`ZIP extracted: ${extractedFiles.length} files!`, 'success');

                } catch (error) {
                    this.showToast('ZIP extraction failed!', 'error');
                    console.error('ZIP Error:', error);
                }

            } else if (file.name.match(/\.(txt|html|css|js|py|c|cpp|h|hpp|java|json|md)$/i)) {
                // Handle text/code files
                try {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target.result;
                        this.saveToUndoStack();
                        this.elements.projectInput.value = content;
                        this.parseProject();
                        this.showToast(`File loaded: ${file.name}`, 'success');
                    };
                    reader.onerror = () => {
                        this.showToast('File read error!', 'error');
                    };
                    reader.readAsText(file);
                } catch (error) {
                    this.showToast('File load failed!', 'error');
                    console.error('File Error:', error);
                }
            } else {
                this.showToast('Unsupported file type!', 'warning');
            }
        },

        initSplitterDrag(e) { e.preventDefault(); const iframe = this.elements.webFrame; if (iframe) iframe.style.pointerEvents = 'none'; const onMouseMove = (moveEvent) => { const newLeftWidth = Math.max(300, Math.min(moveEvent.clientX, document.body.clientWidth - 300)); this.elements.appContainer.style.gridTemplateColumns = `${newLeftWidth}px 2px 1fr`; }; const onMouseUp = () => { if (iframe) iframe.style.pointerEvents = 'auto'; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }
    };
    App.init();
})();
