# Claude Code Handover: Streaming Markdown Implementation for NaVi

## Objective
Replace/improve the current markdown rendering in the NaVi widget to use streaming-markdown library with properly styled output matching NaVi's design system.

---

## Current State (What Exists)

### Files to Review
1. **`widget.css`** - Currently deployed at `https://dimenotesv2.web.app/widget.css`
   - Contains `.smd-content` styles (lines ~3800-4000 approx)
   - Has NaVi CSS variables defined at top
   - Multiple competing style rules for lists, headings, etc.

2. **`response-test.html`** - Local test file at `Z:/Application Prototypes/dimenotes/response-test.html`
   - Used for testing formatting locally

3. **Main widget component** - Likely in React/TypeScript, renders chat responses
   - Currently uses streaming-markdown from `https://thetarnav.github.io/streaming-markdown/`
   - Need to locate: `ChatArea.tsx`, `MessageBubble.tsx`, or similar

### Known Issues
- List items not displaying bullet points correctly
- Definition-style lists (`**Term**: Description`) not styled properly  
- Citations `[Source: ...]` not rendering as clickable superscripts
- Inconsistent heading hierarchy styling
- Blockquotes not standing out for key takeaways

---

## Target State (What We Want)

### Markdown Format (from AI prompt guidelines)
```markdown
## Major Section (H2)
### Subsection (H3)  
#### Sub-subsection (H4)

- **Key Term**: Definition or description [+]
- **Another Term**: More details
  - Nested item
  - Another nested item

> **Key Requirement**: Important callout text

| Column 1 | Column 2 |
|----------|----------|
| Data     | Data     |
```

### Visual Output
- H2: Teal accent colour, border-bottom, 1.25rem
- H3: Teal accent, no border, 1.125rem
- H4: White/primary text, 1rem
- Lists: Visible bullets/numbers, proper indentation
- Definition items: Bold term in accent colour, description in primary text
- Blockquotes: Left border accent, subtle background
- Citations: Superscript `[+]` in accent colour, clickable

---

## Implementation Tasks

### Task 1: Audit Current CSS Structure
```bash
# Find all smd-content related styles
grep -n "smd-content" widget.css
grep -n "navi-message-bubble" widget.css

# Check for conflicting list styles
grep -n "list-style" widget.css
grep -n "display.*list-item" widget.css
```

### Task 2: Consolidate CSS
Current widget.css has multiple competing rules. Consolidate into single source of truth:

```css
/* ============================================
   STREAMING-MARKDOWN CONTENT STYLES
   Single source of truth - remove duplicates
   ============================================ */

.smd-content {
    font-family: var(--navi-font-family);
    font-size: 0.9375rem;
    line-height: 1.65;
    color: var(--navi-text-primary);
}

/* Paragraphs */
.smd-content p {
    margin: 0 0 1rem 0;
    line-height: 1.65;
}

/* Headings - following prompt hierarchy */
.smd-content h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--navi-accent);
    margin: 1.5rem 0 0.75rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--navi-border);
}

.smd-content h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--navi-accent);
    margin: 1.25rem 0 0.5rem 0;
}

.smd-content h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--navi-text-primary);
    margin: 1rem 0 0.5rem 0;
}

/* CRITICAL: Lists must have explicit styles */
.smd-content ul {
    list-style-type: disc !important;
    list-style-position: outside !important;
    margin: 0.75rem 0 !important;
    padding-left: 1.5rem !important;
}

.smd-content ol {
    list-style-type: decimal !important;
    list-style-position: outside !important;
    margin: 0.75rem 0 !important;
    padding-left: 1.5rem !important;
}

.smd-content li {
    display: list-item !important;
    margin: 0.375rem 0 !important;
    line-height: 1.6 !important;
}

/* Definition-style: **Term**: Description */
.smd-content li > strong:first-child {
    color: var(--navi-accent) !important;
    font-weight: 600 !important;
}

/* Nested lists */
.smd-content ul ul,
.smd-content ol ul {
    list-style-type: circle !important;
    margin: 0.25rem 0 0.5rem 0 !important;
    padding-left: 1.25rem !important;
}

/* Blockquotes for key callouts */
.smd-content blockquote {
    border-left: 4px solid var(--navi-accent) !important;
    background: rgba(77, 200, 191, 0.1) !important;
    margin: 1rem 0 !important;
    padding: 0.75rem 1rem !important;
    border-radius: 0 8px 8px 0 !important;
}

.smd-content blockquote p {
    margin: 0 !important;
}

.smd-content blockquote strong {
    color: var(--navi-accent) !important;
}

/* Citations */
.smd-content sup,
.smd-content .citation-link {
    font-size: 0.7em !important;
    font-weight: 600 !important;
    color: var(--navi-accent) !important;
    vertical-align: super !important;
    cursor: pointer !important;
}

.smd-content sup:hover,
.smd-content .citation-link:hover {
    color: var(--navi-text-dark) !important;
    background: var(--navi-accent) !important;
    border-radius: 3px !important;
    padding: 0.125rem 0.25rem !important;
}

/* Tables */
.smd-content table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 1rem 0 !important;
    font-size: 0.875rem !important;
}

.smd-content th,
.smd-content td {
    border: 1px solid var(--navi-border) !important;
    padding: 0.5rem 0.75rem !important;
    text-align: left !important;
}

.smd-content th {
    background: rgba(77, 200, 191, 0.2) !important;
    font-weight: 600 !important;
}

/* Horizontal rules */
.smd-content hr {
    border: none !important;
    border-top: 1px solid var(--navi-border-light) !important;
    margin: 1.5rem 0 !important;
}

/* Streaming cursor */
.smd-content.streaming::after {
    content: "▋";
    animation: blink 1s step-end infinite;
    color: var(--navi-accent);
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
```

### Task 3: Update React Component (if applicable)

Locate the component that renders chat messages and ensure:

```tsx
// Example structure - adapt to actual component
import * as smd from 'streaming-markdown';

interface ChatMessageProps {
    content: string;
    isStreaming: boolean;
}

function ChatMessage({ content, isStreaming }: ChatMessageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const parserRef = useRef<any>(null);

    useEffect(() => {
        if (containerRef.current) {
            // Clear previous content
            containerRef.current.innerHTML = '';
            
            // Create new parser
            const renderer = smd.default_renderer(containerRef.current);
            parserRef.current = smd.parser(renderer);
        }
        
        return () => {
            if (parserRef.current) {
                smd.parser_end(parserRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (parserRef.current && content) {
            smd.parser_write(parserRef.current, content);
        }
    }, [content]);

    useEffect(() => {
        if (!isStreaming && parserRef.current) {
            smd.parser_end(parserRef.current);
            // Post-process citations
            postProcessCitations(containerRef.current);
        }
    }, [isStreaming]);

    return (
        <div 
            ref={containerRef} 
            className={`smd-content ${isStreaming ? 'streaming' : ''}`}
        />
    );
}

// Make citations interactive
function postProcessCitations(container: HTMLElement | null) {
    if (!container) return;
    
    const sups = container.querySelectorAll('sup');
    sups.forEach((sup, index) => {
        sup.classList.add('citation-link');
        sup.setAttribute('data-citation', String(index + 1));
        sup.style.cursor = 'pointer';
    });
}
```

### Task 4: Citation Preprocessing (Optional)

If the AI returns `[Source: Document Name]` format, preprocess before rendering:

```typescript
function preprocessMarkdown(markdown: string): string {
    // Convert [Source: ...] to superscript
    return markdown.replace(
        /\[Source:\s*([^\]]+)\]/g,
        '<sup class="citation-link" title="$1">[+]</sup>'
    );
}

// Usage
const processedContent = preprocessMarkdown(rawContent);
smd.parser_write(parser, processedContent);
```

---

## File Structure Recommendation

```
/src
  /components
    /chat
      ChatArea.tsx
      MessageBubble.tsx
      CitationTooltip.tsx
  /styles
    widget.css          # Main styles (or split below)
    _variables.css      # CSS custom properties
    _smd-content.css    # Streaming markdown styles only
    _components.css     # UI component styles
  /utils
    markdownProcessor.ts  # Preprocessing functions
```

Or keep single `widget.css` but organise with clear section comments.

---

## Testing Checklist

- [ ] H2, H3, H4 headings render with correct sizes and colours
- [ ] Bullet lists show disc markers
- [ ] Numbered lists show decimal markers
- [ ] Nested lists indent properly with different markers
- [ ] Definition lists (`**Term**: desc`) show term in accent colour
- [ ] Blockquotes have left border and background
- [ ] Tables render with borders and header styling
- [ ] Citations appear as superscript and are clickable
- [ ] Horizontal rules are subtle dividers
- [ ] Streaming cursor appears during generation
- [ ] No style conflicts with WordPress parent theme

---

## Files Attached

1. **`response-test.html`** - Complete test harness with working CSS
2. **`smd-improvements.css`** - Standalone CSS to merge

---

## Commands for Claude Code

```bash
# Clone/access the project
cd /path/to/dimenotes-widget

# Find current streaming-markdown usage
grep -r "streaming-markdown" --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "smd\." --include="*.ts" --include="*.tsx"

# Find CSS files
find . -name "*.css" -type f

# Check for style conflicts
grep -n "list-style" src/**/*.css

# After changes, build and deploy
npm run build
firebase deploy --only hosting
```

---

## Questions for Implementation

1. Is CSS currently in a single `widget.css` or split across files?
2. Is the widget built with React/TypeScript or vanilla JS?
3. How are styles currently bundled (Vite, Webpack, plain CSS)?
4. Is there a staging environment for testing before prod?
5. Should citations link to the references panel or show tooltips?
