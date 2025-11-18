# UI/UX Polish Design Document

## Overview

This design document outlines a comprehensive UI/UX transformation for the Agentic Multi-Model Chat application, drawing inspiration from industry-leading chat interfaces like ChatGPT (chat.openai.com) and Claude (claude.ai). The goal is to create a smooth, polished, and professional experience that feels modern, responsive, and delightful to use.

## Design References

### Primary Inspiration Sources

1. **ChatGPT (chat.openai.com)**
   - Floating input container with subtle shadow
   - Auto-growing textarea with smooth expansion
   - Clean message bubbles with proper spacing
   - Smooth fade-in animations for new messages
   - Minimal, distraction-free interface
   - Clear visual hierarchy with whitespace

2. **Claude (claude.ai)**
   - Elegant typography and spacing
   - Subtle hover effects on interactive elements
   - Smooth transitions between states
   - Professional color palette
   - Clear conversation organization
   - Polished sidebar with session management

3. **Linear (linear.app)**
   - Smooth animations and micro-interactions
   - Keyboard shortcuts overlay
   - Command palette pattern
   - Subtle shadows and depth

4. **Notion (notion.so)**
   - Clean, organized interface
   - Collapsible sections with smooth animations
   - Hover effects that reveal actions
   - Consistent spacing and typography

## Design System

### Color Palette

```css
/* Dark Theme (Primary) */
--bg-primary: #0d0d0d;           /* Main background */
--bg-secondary: #1a1a1a;         /* Elevated surfaces */
--bg-tertiary: #2d2d2d;          /* Cards, inputs */
--bg-hover: #3d3d3d;             /* Hover states */

--border-subtle: #2d2d2d;        /* Subtle dividers */
--border-default: #404040;       /* Default borders */
--border-strong: #525252;        /* Emphasized borders */

--text-primary: #ececec;         /* Primary text */
--text-secondary: #a1a1a1;       /* Secondary text */
--text-tertiary: #737373;        /* Tertiary text */
--text-disabled: #525252;        /* Disabled text */

--brand-primary: #3b82f6;        /* Primary brand color (blue) */
--brand-hover: #2563eb;          /* Brand hover state */
--brand-active: #1d4ed8;         /* Brand active state */

--success: #10b981;              /* Success states */
--warning: #f59e0b;              /* Warning states */
--error: #ef4444;                /* Error states */
--info: #06b6d4;                 /* Info states */

/* Message Colors */
--msg-user-bg: #3b82f6;          /* User message background */
--msg-user-text: #ffffff;        /* User message text */
--msg-assistant-bg: #2d2d2d;     /* AI message background */
--msg-assistant-text: #ececec;   /* AI message text */

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
```

### Typography Scale

```css
/* Font Family */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 
             Consolas, 'Courier New', monospace;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;   /* Fully rounded */
```

### Animation Timing

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;

--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

## Component Designs

### 1. Modern Input Section

**Design Pattern**: Floating input container inspired by ChatGPT

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │ Type your message...                          │ ↑  │
│  │                                               │    │
│  │                                               │ ⏎  │
│  └───────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:
- Floating container with `shadow-lg` and `radius-xl`
- Auto-growing textarea (min 1 line, max 8 lines)
- Send button appears as icon (paper plane) on the right
- Send button disabled state: opacity 0.4, no hover effect
- Send button active state: full opacity, scale on hover
- Smooth height transition when expanding (300ms ease-out)
- Focus ring with brand color (2px solid, slight glow)
- Placeholder fades to 0.4 opacity on focus

**CSS Implementation**:
```css
.chat-input-container {
  position: sticky;
  bottom: 0;
  padding: var(--space-6);
  background: linear-gradient(
    to top,
    var(--bg-primary) 0%,
    var(--bg-primary) 70%,
    transparent 100%
  );
}

.chat-input-wrapper {
  max-width: 48rem;
  margin: 0 auto;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transition: all var(--duration-normal) var(--ease-out);
}

.chat-input-wrapper:focus-within {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
              var(--shadow-lg);
}

.chat-input {
  width: 100%;
  min-height: 52px;
  max-height: 200px;
  padding: var(--space-4);
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  resize: none;
  transition: height var(--duration-slow) var(--ease-out);
}

.send-button {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  width: 36px;
  height: 36px;
  background: var(--brand-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.send-button:hover:not(:disabled) {
  background: var(--brand-hover);
  transform: scale(1.05);
}

.send-button:active:not(:disabled) {
  transform: scale(0.95);
}

.send-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### 2. Enhanced Message Bubbles

**Design Pattern**: Clean bubbles with subtle shadows, inspired by Claude

**Visual Design**:
```
User Message (Right-aligned):
                    ┌─────────────────────────┐
                    │ Hello, how are you?     │
                    │                         │
                    └─────────────────────────┘
                                    You • 2:30 PM

AI Message (Left-aligned):
┌─────────────────────────────────────┐
│ I'm doing well, thank you!          │
│ How can I help you today?           │
│                                     │
└─────────────────────────────────────┘
Claude Haiku • 2:30 PM
```

**Key Features**:
- User messages: right-aligned, brand color background
- AI messages: left-aligned, tertiary background
- Max width: 75% of container
- Padding: 12px 16px
- Border radius: 12px (top corners), 4px (bottom corner on sender side)
- Subtle shadow for depth
- Timestamp appears on hover with fade-in
- Smooth fade-in + slide-up animation on new messages
- Code blocks with syntax highlighting and copy button

**CSS Implementation**:
```css
.message {
  display: flex;
  flex-direction: column;
  max-width: 75%;
  margin-bottom: var(--space-4);
  animation: messageSlideIn var(--duration-slow) var(--ease-out);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-bubble {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

.message.user .message-bubble {
  background: var(--msg-user-bg);
  color: var(--msg-user-text);
  border-bottom-right-radius: var(--radius-sm);
}

.message.assistant .message-bubble {
  background: var(--msg-assistant-bg);
  color: var(--msg-assistant-text);
  border-bottom-left-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.message-bubble:hover {
  box-shadow: var(--shadow-md);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.message:hover .message-meta {
  opacity: 1;
}
```

### 3. Smooth Sidebar Transitions

**Design Pattern**: Collapsible sidebar with smooth width animation

**Key Features**:
- Width transition: 300ms ease-in-out
- Content fades out before width collapses
- Toggle button rotates 180° when collapsed
- Session items have hover effect (background + border)
- Active session has distinct highlight
- Smooth scroll with momentum
- New session button has subtle pulse animation

**CSS Implementation**:
```css
.session-history {
  width: 260px;
  transition: width var(--duration-slow) var(--ease-in-out),
              opacity var(--duration-normal) var(--ease-out);
  overflow: hidden;
}

.session-history.collapsed {
  width: 0;
  opacity: 0;
}

.session-history-content {
  width: 260px;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.session-history.collapsed .session-history-content {
  opacity: 0;
}

.toggle-sidebar-btn {
  transition: transform var(--duration-normal) var(--ease-out);
}

.session-history.collapsed + * .toggle-sidebar-btn {
  transform: rotate(180deg);
}

.session-item {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-2);
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.session-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
  transform: translateX(2px);
}

.session-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--brand-primary);
}
```

### 4. Loading States

**Design Pattern**: Skeleton screens and typing indicators

**Typing Indicator**:
```
┌─────────────────────────┐
│  ●  ●  ●                │  (animated dots)
└─────────────────────────┘
Claude is typing...
```

**Skeleton Screen**:
```
┌─────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────────────┘
```

**CSS Implementation**:
```css
.typing-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  border-bottom-left-radius: var(--radius-sm);
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: var(--text-tertiary);
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 0%,
    var(--bg-hover) 50%,
    var(--bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: skeletonLoading 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeletonLoading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

### 5. Enhanced Conversation Tree

**Design Pattern**: Hierarchical tree with connecting lines

**Visual Design**:
```
Conversations
├─ ▼ 1. Claude Haiku - "Tell me a joke"
│  ├─ ▶ 1.1 Branch - "Tell another"
│  └─ ▼ 1.2 Branch - "Make it funnier"
│     └─ ○ 1.2.1 Branch - "Even funnier"
├─ ○ 2. Gemini Pro - "Tell me a joke"
└─ ○ 3. Claude Haiku - "Tell me a joke"
```

**Key Features**:
- Connecting lines show hierarchy
- Expand/collapse arrows rotate smoothly
- Hover highlights entire branch path
- Active conversation has distinct background
- Smooth height animation on expand/collapse
- Icons indicate conversation state (root, branch, active)

**CSS Implementation**:
```css
.conversation-tree {
  position: relative;
}

.tree-node {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  margin-left: calc(var(--depth) * var(--space-6));
  background: var(--bg-tertiary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.tree-node::before {
  content: '';
  position: absolute;
  left: calc(var(--space-6) * -1);
  top: 50%;
  width: var(--space-6);
  height: 1px;
  background: var(--border-default);
  opacity: 0.5;
}

.tree-node:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}

.tree-node.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: var(--brand-primary);
}

.tree-arrow {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-normal) var(--ease-out);
}

.tree-node.expanded .tree-arrow {
  transform: rotate(90deg);
}

.tree-children {
  overflow: hidden;
  transition: max-height var(--duration-slow) var(--ease-in-out),
              opacity var(--duration-normal) var(--ease-out);
}

.tree-node.collapsed + .tree-children {
  max-height: 0;
  opacity: 0;
}
```

### 6. Micro-interactions

**Button Press Animation**:
```css
.button {
  transition: all var(--duration-fast) var(--ease-out);
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

**Copy Feedback**:
```css
.copy-button {
  position: relative;
}

.copy-tooltip {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%) translateY(5px);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  opacity: 0;
  pointer-events: none;
  transition: all var(--duration-normal) var(--ease-out);
}

.copy-button.copied .copy-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

**Hover Glow Effect**:
```css
.interactive-element {
  position: relative;
  overflow: hidden;
}

.interactive-element::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  transform: translate(-50%, -50%);
  transition: width var(--duration-slow) var(--ease-out),
              height var(--duration-slow) var(--ease-out);
}

.interactive-element:hover::before {
  width: 300px;
  height: 300px;
}
```

## Layout Structure

### Desktop Layout (>1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────┐ ┌──────────────────┐  │
│ │          │ │                        │ │                  │  │
│ │ Session  │ │    Main Chat Area      │ │   Agent Panel    │  │
│ │ History  │ │                        │ │                  │  │
│ │ (260px)  │ │    (Flexible)          │ │   (400px)        │  │
│ │          │ │                        │ │                  │  │
│ │          │ │  ┌──────────────────┐  │ │                  │  │
│ │          │ │  │  Input Section   │  │ │                  │  │
│ │          │ │  └──────────────────┘  │ │                  │  │
│ └──────────┘ └────────────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px - 1024px)

```
┌─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────┐    │
│ │          │ │                            │    │
│ │ Session  │ │    Main Chat Area          │    │
│ │ History  │ │                            │    │
│ │ (240px)  │ │    (Flexible)              │    │
│ │          │ │                            │    │
│ │          │ │  ┌──────────────────────┐  │    │
│ │          │ │  │  Input Section       │  │    │
│ │          │ │  └──────────────────────┘  │    │
│ └──────────┘ └────────────────────────────┘    │
│ ┌─────────────────────────────────────────┐    │
│ │         Agent Panel (Collapsed)         │    │
│ └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌─────────────────────────┐
│ ☰  Conversations        │
├─────────────────────────┤
│                         │
│    Main Chat Area       │
│                         │
│                         │
│                         │
│  ┌───────────────────┐  │
│  │  Input Section    │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Accessibility Features

### Keyboard Navigation

```
Tab Order:
1. Sidebar toggle button
2. Session list items
3. New session button
4. Conversation tree nodes
5. Main chat input
6. Send button
7. Agent panel sections
8. Model management controls
```

### ARIA Labels

```html
<!-- Input Section -->
<div role="region" aria-label="Message composition">
  <textarea 
    aria-label="Type your message"
    aria-describedby="input-hint"
  ></textarea>
  <button 
    aria-label="Send message"
    aria-disabled="true"
  ></button>
</div>

<!-- Message List -->
<div role="log" aria-label="Conversation messages" aria-live="polite">
  <div role="article" aria-label="Message from Claude Haiku">
    ...
  </div>
</div>

<!-- Conversation Tree -->
<nav aria-label="Conversation navigation">
  <button 
    aria-expanded="true"
    aria-controls="conversation-1-children"
  >
    Conversation 1
  </button>
</nav>
```

### Focus Indicators

```css
*:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  *:focus-visible {
    outline-width: 3px;
    outline-offset: 3px;
  }
}
```

## Performance Optimizations

### Virtual Scrolling

```javascript
// Implement virtual scrolling for long message lists
// Only render messages in viewport + buffer
const BUFFER_SIZE = 5;
const MESSAGE_HEIGHT = 100; // Average height

function getVisibleMessages(scrollTop, viewportHeight, allMessages) {
  const startIndex = Math.max(0, 
    Math.floor(scrollTop / MESSAGE_HEIGHT) - BUFFER_SIZE
  );
  const endIndex = Math.min(allMessages.length,
    Math.ceil((scrollTop + viewportHeight) / MESSAGE_HEIGHT) + BUFFER_SIZE
  );
  
  return allMessages.slice(startIndex, endIndex);
}
```

### CSS Optimization

```css
/* Use transform instead of top/left for animations */
.animated-element {
  transform: translateY(0);
  transition: transform var(--duration-normal) var(--ease-out);
}

/* Use will-change for frequently animated elements */
.message {
  will-change: transform, opacity;
}

/* Remove will-change after animation completes */
.message.animated {
  will-change: auto;
}

/* Use contain for isolated components */
.message-bubble {
  contain: layout style paint;
}
```

### Debouncing

```javascript
// Debounce input events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const handleInput = debounce((value) => {
  // Process input
}, 300);
```

### 6. Inline Branch Visualization

**Design Pattern**: Vertical dot indicator inspired by AI Studio's branch view

**Visual Design**:
```
Main Chat Area                    Branch Indicator
┌─────────────────────────────┐  │
│ Message 1                   │  ●  ← Current
│                             │  │
├─────────────────────────────┤  │
│ Message 2                   │  ●
│                             │  │
├─────────────────────────────┤  ├─ Branch point
│ Message 3 (Branch A)        │  ●
│                             │  │
├─────────────────────────────┤  ●
│ Message 4                   │  │
└─────────────────────────────┘  │
```

**Key Features**:
- Fixed position on right side of chat area (20px from edge)
- Dots represent messages or conversation points
- Vertical line connects dots (1px solid, subtle color)
- Current message dot is larger (12px) and highlighted
- Other dots are smaller (8px) with reduced opacity
- Branch points show connecting lines to indicate splits
- Smooth scroll animation when clicking dots
- Tooltip shows message preview on hover
- Fades out when not hovering over chat area
- Hidden on mobile (<768px)

**CSS Implementation**:
```css
.branch-indicator {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  z-index: 10;
  opacity: 0.6;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.branch-indicator:hover {
  opacity: 1;
}

.branch-line {
  position: absolute;
  width: 1px;
  height: 100%;
  background: var(--border-default);
  left: 50%;
  transform: translateX(-50%);
  z-index: -1;
}

.branch-dot {
  width: 8px;
  height: 8px;
  background: var(--text-tertiary);
  border: 2px solid var(--bg-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
}

.branch-dot:hover {
  transform: scale(1.3);
  background: var(--brand-primary);
}

.branch-dot.active {
  width: 12px;
  height: 12px;
  background: var(--brand-primary);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.branch-dot.branch-point::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 1px;
  background: var(--border-default);
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
}

.branch-tooltip {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-md);
}

.branch-dot:hover .branch-tooltip {
  opacity: 1;
}

/* Hide on mobile */
@media (max-width: 768px) {
  .branch-indicator {
    display: none;
  }
}
```

**JavaScript Behavior**:
```javascript
// Calculate dot positions based on messages
function updateBranchIndicator(messages, currentMessageId) {
  const dots = messages.map((msg, index) => ({
    id: msg.id,
    position: index,
    isCurrent: msg.id === currentMessageId,
    isBranchPoint: msg.children && msg.children.length > 1,
    preview: msg.content.substring(0, 50) + '...'
  }));
  
  renderBranchDots(dots);
}

// Smooth scroll to message on dot click
function handleDotClick(messageId) {
  const messageElement = document.getElementById(`message-${messageId}`);
  messageElement.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center' 
  });
}

// Update active dot on scroll
function updateActiveDot() {
  const messages = document.querySelectorAll('.message');
  const viewportCenter = window.innerHeight / 2;
  
  let closestMessage = null;
  let closestDistance = Infinity;
  
  messages.forEach(msg => {
    const rect = msg.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestMessage = msg;
    }
  });
  
  if (closestMessage) {
    updateActiveDotById(closestMessage.dataset.messageId);
  }
}
```

### 7. Settings Modal

**Design Pattern**: Centered modal dialog with backdrop overlay

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│                    [Backdrop Overlay]                   │
│                                                         │
│     ┌─────────────────────────────────────────┐       │
│     │  Settings                            ✕  │       │
│     ├─────────────────────────────────────────┤       │
│     │                                         │       │
│     │  API Key                                │       │
│     │  ┌───────────────────────┐  [Save]     │       │
│     │  │ ••••••••••••••••••••  │             │       │
│     │  └───────────────────────┘             │       │
│     │                                         │       │
│     │  Agent Model                            │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Gemini 2.5 Flash              ▼  │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  Active Models    [Load Preset... ▼]   │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Gemini 2.5 Flash      [Remove]   │ │       │
│     │  │ google/gemini-2.5-flash          │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  ┌─────────────┐  ┌──────────────┐    │       │
│     │  │ Model ID    │  │ Model Name   │    │       │
│     │  └─────────────┘  └──────────────┘    │       │
│     │  [Add Model]                           │       │
│     │                                         │       │
│     └─────────────────────────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:
- Gear icon button in top left (next to sidebar toggle)
- Modal centered on screen with max-width 600px
- Backdrop overlay with semi-transparent black (0.5 opacity)
- Modal slides in with scale animation (0.95 to 1.0)
- Close button (X) in top right of modal
- Click outside or Escape key to close
- Smooth fade-out animation on close
- Scrollable content if exceeds viewport height
- All settings from agent panel moved here

**CSS Implementation**:
```css
.settings-btn {
  width: 36px;
  height: 36px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-out);
}

.settings-btn:hover {
  background: var(--bg-hover);
  border-color: var(--brand-primary);
  transform: rotate(45deg);
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  animation: fadeIn var(--duration-normal) var(--ease-out) forwards;
}

.modal-backdrop.closing {
  animation: fadeOut var(--duration-normal) var(--ease-out) forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

@keyframes fadeOut {
  to { opacity: 0; }
}

.settings-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  transform: scale(0.95);
  animation: modalSlideIn var(--duration-normal) var(--ease-out) forwards;
}

.modal-backdrop.closing .settings-modal {
  animation: modalSlideOut var(--duration-normal) var(--ease-out) forwards;
}

@keyframes modalSlideIn {
  to {
    transform: scale(1);
  }
}

@keyframes modalSlideOut {
  to {
    transform: scale(0.95);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-default);
}

.modal-header h2 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
}

.modal-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-content {
  padding: var(--space-6);
}

.modal-section {
  margin-bottom: var(--space-8);
}

.modal-section:last-child {
  margin-bottom: 0;
}

.modal-section h3 {
  margin: 0 0 var(--space-4) 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

/* Scrollbar styling for modal */
.settings-modal::-webkit-scrollbar {
  width: 8px;
}

.settings-modal::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.settings-modal::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: var(--radius-full);
}

.settings-modal::-webkit-scrollbar-thumb:hover {
  background: var(--border-strong);
}
```

**JavaScript Behavior**:
```javascript
// Open modal
function openSettingsModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="settings-modal">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="modal-content">
        <!-- Settings content here -->
      </div>
    </div>
  `;
  
  document.body.appendChild(backdrop);
  
  // Close handlers
  const closeBtn = backdrop.querySelector('.modal-close-btn');
  closeBtn.addEventListener('click', closeModal);
  
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  
  document.addEventListener('keydown', handleEscape);
}

// Close modal
function closeModal() {
  const backdrop = document.querySelector('.modal-backdrop');
  if (!backdrop) return;
  
  backdrop.classList.add('closing');
  setTimeout(() => {
    backdrop.remove();
    document.removeEventListener('keydown', handleEscape);
  }, 200); // Match animation duration
}

// Handle Escape key
function handleEscape(e) {
  if (e.key === 'Escape') closeModal();
}
```

## Responsive Breakpoints

```css
/* Mobile First Approach */
:root {
  --sidebar-width: 0;
}

/* Tablet */
@media (min-width: 768px) {
  :root {
    --sidebar-width: 240px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  :root {
    --sidebar-width: 260px;
  }
}

/* Large Desktop */
@media (min-width: 1440px) {
  :root {
    --sidebar-width: 280px;
  }
}

/* Settings modal responsive */
@media (max-width: 768px) {
  .settings-modal {
    width: 95%;
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-content {
    padding: var(--space-4);
  }
}
```

## Implementation Priority

### Phase 1: Core Polish (High Priority)
1. Modern input section with auto-grow
2. Enhanced message bubbles with animations
3. Smooth transitions for all interactions
4. Improved color palette and typography

### Phase 2: Advanced Features (Medium Priority)
5. Loading states and typing indicators
6. Enhanced conversation tree with connecting lines
7. Micro-interactions and hover effects
8. Responsive layout improvements

### Phase 3: Optimization (Lower Priority)
9. Virtual scrolling for performance
10. Advanced accessibility features
11. Keyboard shortcuts overlay
12. Theme customization options

## Testing Checklist

- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iOS Safari and Android Chrome
- [ ] Test with keyboard navigation only
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Test with reduced motion preferences
- [ ] Test with high contrast mode
- [ ] Test with different zoom levels (100%, 150%, 200%)
- [ ] Test with slow network (loading states)
- [ ] Test with long messages and conversations
- [ ] Test responsive breakpoints
