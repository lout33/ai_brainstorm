/**
 * Simple Markdown to HTML renderer
 * Handles common markdown syntax for chat messages
 */

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Parse inline markdown (bold, italic, code, links)
function parseInline(text) {
  // Escape HTML first
  let result = escapeHtml(text);

  // Code spans (must be done before other inline formatting)
  result = result.replace(/`([^`]+)`/g, '<code class="md-code-inline">$1</code>');

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (but not inside words for underscores)
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  return result;
}

// Parse a single line and return HTML
function parseLine(line, inList = false) {
  const trimmed = line.trim();

  // Empty line
  if (!trimmed) {
    return { html: '', type: 'empty' };
  }

  // Headers
  const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const text = parseInline(headerMatch[2]);
    return { html: `<h${level} class="md-h${level}">${text}</h${level}>`, type: 'header' };
  }

  // Horizontal rule
  if (/^[-*_]{3,}$/.test(trimmed)) {
    return { html: '<hr class="md-hr">', type: 'hr' };
  }

  // Blockquote
  if (trimmed.startsWith('>')) {
    const text = parseInline(trimmed.slice(1).trim());
    return { html: `<blockquote class="md-blockquote">${text}</blockquote>`, type: 'blockquote' };
  }

  // Unordered list item
  const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
  if (ulMatch) {
    const text = parseInline(ulMatch[1]);
    return { html: `<li>${text}</li>`, type: 'ul' };
  }

  // Ordered list item
  const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
  if (olMatch) {
    const text = parseInline(olMatch[1]);
    return { html: `<li>${text}</li>`, type: 'ol' };
  }

  // Regular paragraph
  return { html: parseInline(trimmed), type: 'p' };
}

/**
 * Parse markdown text and return HTML
 * @param {string} text - Markdown text to parse
 * @returns {string} - HTML string
 */
export function parseMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';
  let inList = null; // 'ul' or 'ol'
  let listItems = [];

  function flushList() {
    if (inList && listItems.length > 0) {
      const tag = inList;
      result.push(`<${tag} class="md-list md-${tag}">${listItems.join('')}</${tag}>`);
      listItems = [];
      inList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block handling
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockContent = [];
      } else {
        // End of code block
        const escapedCode = escapeHtml(codeBlockContent.join('\n'));
        const langClass = codeBlockLang ? ` data-lang="${escapeHtml(codeBlockLang)}"` : '';
        result.push(`<pre class="md-code-block"${langClass}><code>${escapedCode}</code></pre>`);
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Parse the line
    const parsed = parseLine(line);

    // Handle list continuity
    if (parsed.type === 'ul' || parsed.type === 'ol') {
      if (inList !== parsed.type) {
        flushList();
        inList = parsed.type;
      }
      listItems.push(parsed.html);
    } else {
      flushList();

      if (parsed.type === 'empty') {
        // Add spacing between paragraphs
        if (result.length > 0 && !result[result.length - 1].endsWith('</p>')) {
          continue;
        }
      } else if (parsed.type === 'p') {
        result.push(`<p class="md-p">${parsed.html}</p>`);
      } else {
        result.push(parsed.html);
      }
    }
  }

  // Flush any remaining list
  flushList();

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    const escapedCode = escapeHtml(codeBlockContent.join('\n'));
    result.push(`<pre class="md-code-block"><code>${escapedCode}</code></pre>`);
  }

  return result.join('');
}

/**
 * Render markdown to a DOM element
 * @param {string} text - Markdown text
 * @param {HTMLElement} element - Target element
 */
export function renderMarkdown(text, element) {
  element.innerHTML = parseMarkdown(text);
  element.classList.add('md-content');
}

export default { parseMarkdown, renderMarkdown };
