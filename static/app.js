/**
 * ReadFaster - RSVP Speed Reading Engine
 * Rapid Serial Visual Presentation with Markdown support
 */

class RSVPReader {
    constructor() {
        // State
        this.tokens = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.wpm = 300;
        this.intervalId = null;
        
        // DOM Elements
        this.wordEl = document.getElementById('word');
        this.docSelect = document.getElementById('doc-select');
        this.scrubBar = document.getElementById('scrub-bar');
        this.speedSlider = document.getElementById('speed-slider');
        this.wpmDisplay = document.getElementById('wpm-display');
        this.currentWordEl = document.getElementById('current-word');
        this.totalWordsEl = document.getElementById('total-words');
        this.playStatus = document.getElementById('play-status');
        
        this.init();
    }
    
    async init() {
        await this.loadDocumentList();
        this.bindEvents();
        this.updateDisplay();
    }
    
    // ========================================
    // Document Loading
    // ========================================
    
    async loadDocumentList() {
        try {
            const response = await fetch('/api/docs');
            const data = await response.json();
            
            if (data.docs && data.docs.length > 0) {
                this.docSelect.innerHTML = '<option value="">Select a document...</option>';
                data.docs.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc;
                    option.textContent = doc.replace('.md', '');
                    this.docSelect.appendChild(option);
                });
                
                // Auto-select first document
                if (data.docs.length === 1) {
                    this.docSelect.value = data.docs[0];
                    await this.loadDocument(data.docs[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load document list:', error);
            this.showMessage('Failed to load documents');
        }
    }
    
    async loadDocument(filename) {
        if (!filename) return;
        
        try {
            this.showMessage('Loading...');
            const response = await fetch(`/api/docs/${encodeURIComponent(filename)}`);
            const data = await response.json();
            
            if (data.content) {
                this.parseMarkdown(data.content);
                this.currentIndex = 0;
                this.updateScrubBar();
                this.updateDisplay();
                this.showMessage('Press Space to Start');
            }
        } catch (error) {
            console.error('Failed to load document:', error);
            this.showMessage('Failed to load document');
        }
    }
    
    // ========================================
    // Markdown Parsing
    // ========================================
    
    parseMarkdown(content) {
        this.tokens = [];
        
        // Remove YAML frontmatter
        content = content.replace(/^---[\s\S]*?---\n*/m, '');
        
        // Split into lines for block-level processing
        const lines = content.split('\n');
        
        let inCodeBlock = false;
        let inBlockquote = false;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) {
                inBlockquote = false;
                continue;
            }
            
            // Skip image lines
            if (trimmedLine.match(/^!\[.*\]\(.*\)$/) || trimmedLine.match(/^\[?\s*!\[/)) {
                continue;
            }
            
            // Skip pure link lines (usually images or buttons)
            if (trimmedLine.match(/^\[[\s\S]*\]\(http[^)]+\)$/)) {
                continue;
            }
            
            // Skip horizontal rules
            if (trimmedLine.match(/^[\*\-_]{3,}$/)) {
                continue;
            }
            
            // Code blocks
            if (trimmedLine.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                continue;
            }
            
            if (inCodeBlock) {
                this.addTokens(trimmedLine, 'code');
                continue;
            }
            
            // Headings
            const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const text = this.cleanInlineMarkdown(headingMatch[2]);
                this.addTokens(text, `h${level}`);
                continue;
            }
            
            // Blockquotes
            if (trimmedLine.startsWith('>')) {
                inBlockquote = true;
                const text = trimmedLine.replace(/^>\s*/, '');
                this.parseInlineMarkdown(text, 'blockquote');
                continue;
            }
            
            // List items - treat as regular text
            const listMatch = trimmedLine.match(/^[\-\*\+]\s+(.+)$|^\d+\.\s+(.+)$/);
            if (listMatch) {
                const text = listMatch[1] || listMatch[2];
                this.parseInlineMarkdown(text, 'paragraph');
                continue;
            }
            
            // Regular paragraph
            this.parseInlineMarkdown(trimmedLine, 'paragraph');
        }
        
        this.totalWordsEl.textContent = this.tokens.length;
        this.scrubBar.max = Math.max(0, this.tokens.length - 1);
    }
    
    parseInlineMarkdown(text, baseStyle) {
        // Clean and process inline markdown
        let cleanText = this.cleanInlineMarkdown(text);
        
        // Split into segments with style info
        const segments = this.extractStyledSegments(text);
        
        for (const segment of segments) {
            this.addTokens(segment.text, this.combineStyles(baseStyle, segment.style));
        }
    }
    
    extractStyledSegments(text) {
        const segments = [];
        let remaining = text;
        
        // Pattern to find bold-italic, bold, italic, code, and links
        const patterns = [
            { regex: /\*\*\*(.+?)\*\*\*/g, style: 'bold-italic' },
            { regex: /___(.+?)___/g, style: 'bold-italic' },
            { regex: /\*\*(.+?)\*\*/g, style: 'bold' },
            { regex: /__(.+?)__/g, style: 'bold' },
            { regex: /\*([^*]+?)\*/g, style: 'italic' },
            { regex: /_([^_]+?)_/g, style: 'italic' },
            { regex: /`([^`]+)`/g, style: 'code' },
            { regex: /\[([^\]]+)\]\([^)]+\)/g, style: 'link' },
        ];
        
        // Simple approach: clean all markdown and treat as base style
        // For more complex highlighting, we'd need a proper parser
        const cleanedText = this.cleanInlineMarkdown(text);
        
        if (cleanedText.trim()) {
            segments.push({ text: cleanedText, style: '' });
        }
        
        return segments;
    }
    
    cleanInlineMarkdown(text) {
        return text
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove bold-italic
            .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
            .replace(/___(.+?)___/g, '$1')
            // Remove bold
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/__(.+?)__/g, '$1')
            // Remove italic
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            // Remove inline code
            .replace(/`([^`]+)`/g, '$1')
            // Remove footnote references
            .replace(/\[\d+\]/g, '')
            // Clean up extra spaces
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    combineStyles(baseStyle, inlineStyle) {
        if (!inlineStyle) return baseStyle;
        if (baseStyle === 'paragraph') return inlineStyle;
        return baseStyle;
    }
    
    addTokens(text, style) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        for (const word of words) {
            // Clean up any remaining special characters
            const cleanWord = word
                .replace(/^["""''`]+|["""''`]+$/g, '')
                .replace(/^[\(\[]+|[\)\]]+$/g, (match) => match); // Keep parentheses
            
            if (cleanWord) {
                this.tokens.push({
                    word: cleanWord,
                    style: style
                });
            }
        }
    }
    
    // ========================================
    // Playback Control
    // ========================================
    
    play() {
        if (this.tokens.length === 0) return;
        if (this.currentIndex >= this.tokens.length) {
            this.currentIndex = 0;
        }
        
        this.isPlaying = true;
        this.updatePlayStatus();
        
        const interval = this.calculateInterval();
        this.intervalId = setInterval(() => this.advance(), interval);
    }
    
    pause() {
        this.isPlaying = false;
        this.updatePlayStatus();
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    advance() {
        if (this.currentIndex >= this.tokens.length) {
            this.pause();
            this.showMessage('— End —');
            return;
        }
        
        this.displayToken(this.tokens[this.currentIndex]);
        this.currentIndex++;
        this.updateScrubBar();
    }
    
    skipForward(count = 5) {
        this.currentIndex = Math.min(this.tokens.length - 1, this.currentIndex + count);
        this.updateScrubBar();
        if (!this.isPlaying && this.tokens[this.currentIndex]) {
            this.displayToken(this.tokens[this.currentIndex]);
        }
    }
    
    skipBackward(count = 5) {
        this.currentIndex = Math.max(0, this.currentIndex - count);
        this.updateScrubBar();
        if (!this.isPlaying && this.tokens[this.currentIndex]) {
            this.displayToken(this.tokens[this.currentIndex]);
        }
    }
    
    seekTo(index) {
        this.currentIndex = Math.max(0, Math.min(this.tokens.length - 1, index));
        this.updateScrubBar();
        if (this.tokens[this.currentIndex]) {
            this.displayToken(this.tokens[this.currentIndex]);
        }
    }
    
    restart() {
        this.pause();
        this.currentIndex = 0;
        this.updateScrubBar();
        this.showMessage('Press Space to Start');
    }
    
    // ========================================
    // Display
    // ========================================
    
    displayToken(token) {
        this.wordEl.textContent = token.word;
        this.wordEl.className = 'word';
        
        if (token.style && token.style !== 'paragraph') {
            this.wordEl.classList.add(token.style);
        }
    }
    
    showMessage(message) {
        this.wordEl.textContent = message;
        this.wordEl.className = 'word';
    }
    
    updateDisplay() {
        this.currentWordEl.textContent = this.currentIndex;
    }
    
    updateScrubBar() {
        this.scrubBar.value = this.currentIndex;
        this.currentWordEl.textContent = this.currentIndex;
    }
    
    updatePlayStatus() {
        if (this.isPlaying) {
            this.playStatus.classList.remove('paused');
            this.playStatus.classList.add('playing');
            this.playStatus.innerHTML = '<span class="status-icon">▶</span><span class="status-text">PLAYING</span>';
        } else {
            this.playStatus.classList.remove('playing');
            this.playStatus.classList.add('paused');
            this.playStatus.innerHTML = '<span class="status-icon">⏸</span><span class="status-text">PAUSED</span>';
        }
    }
    
    // ========================================
    // Speed Control
    // ========================================
    
    setSpeed(wpm) {
        this.wpm = wpm;
        this.wpmDisplay.textContent = `${wpm} WPM`;
        
        // Restart interval if playing
        if (this.isPlaying) {
            clearInterval(this.intervalId);
            const interval = this.calculateInterval();
            this.intervalId = setInterval(() => this.advance(), interval);
        }
    }
    
    calculateInterval() {
        // Convert WPM to milliseconds per word
        return Math.round(60000 / this.wpm);
    }
    
    // ========================================
    // Event Binding
    // ========================================
    
    bindEvents() {
        // Document selection
        this.docSelect.addEventListener('change', (e) => {
            this.pause();
            this.loadDocument(e.target.value);
        });
        
        // Speed slider
        this.speedSlider.addEventListener('input', (e) => {
            this.setSpeed(parseInt(e.target.value, 10));
        });
        
        // Scrub bar
        this.scrubBar.addEventListener('input', (e) => {
            const wasPlaying = this.isPlaying;
            if (wasPlaying) this.pause();
            this.seekTo(parseInt(e.target.value, 10));
        });
        
        this.scrubBar.addEventListener('change', (e) => {
            this.seekTo(parseInt(e.target.value, 10));
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Ignore if focused on select
            if (e.target.tagName === 'SELECT') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggle();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.skipBackward(5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.skipForward(5);
                    break;
                case 'KeyR':
                    if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        this.restart();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.speedSlider.value = Math.min(800, parseInt(this.speedSlider.value) + 25);
                    this.setSpeed(parseInt(this.speedSlider.value));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.speedSlider.value = Math.max(100, parseInt(this.speedSlider.value) - 25);
                    this.setSpeed(parseInt(this.speedSlider.value));
                    break;
            }
        });
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.reader = new RSVPReader();
});
