# DimeNotes - Features Reference

**Document Version:** 1.0
**Last Updated:** 2025-11-18

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
  - [Multi-Turn Conversations](#1-multi-turn-conversations)
  - [Citation System](#2-citation-system)
  - [Text Selection and Add to Chat](#3-text-selection-and-add-to-chat)
  - [Quick Actions](#4-quick-actions)
  - [Chat History](#5-chat-history)
  - [Saved Outputs](#6-saved-outputs)
- [UI Features](#ui-features)
- [Navigation and Session](#navigation-and-session)
- [Data and Privacy](#data-and-privacy)
- [Summary](#summary)

---

## Overview

This document provides a complete reference for all DimeNotes features and functionality.

---

## Core Features

### 1. Multi-Turn Conversations

Have natural back-and-forth conversations with context awareness.

**What It Does:**
- Remembers previous questions and answers in same chat
- Includes conversation history in AI context
- Enables follow-up questions without repeating context
- Maintains thread continuity

**How It Works:**
- Each Q&A pair is saved to conversation history
- History is formatted and included in next prompt
- AI can reference and build on previous exchanges
- "New Chat" clears history to start fresh

**Example:**
```
You: What are the regulatory requirements for wearables?
AI: [Detailed response about FDA requirements...]

You: How do these differ from requirements in Europe?
AI: [Compares FDA to EU regulations, referencing previous answer...]
```

**When to Use:**
- Deep diving into topics
- Asking related follow-up questions
- Building understanding progressively
- Exploring different angles of same topic

**When to Clear (New Chat):**
- Switching to completely different topic
- Previous context no longer relevant
- Starting fresh research question

---

### 2. Citation System

Every response includes citations to ensure transparency.

**Citation Format:** `[Source: Resource Title]`

**Requirements:**
- Every claim must be cited
- Citations must match selected sources
- Multiple sources cited when synthesizing
- Every paragraph needs at least one citation

**Example Response:**
```
Wearable devices must demonstrate clinical validity through rigorous
testing [Source: FDA Digital Health Guidelines]. The validation process
typically requires both laboratory and real-world studies [Source:
Clinical Trial Standards]. Regulatory submissions should include detailed
performance data [Source: Regulatory Submission Guide].
```

**UI Features:**

| Feature | Description |
|---------|-------------|
| **Inline Citations** | Appear immediately after claims, formatted as `[Source: Title]`, clickable to view full source |
| **References Section** | Toggle button to show/hide, lists all cited sources, provides quick overview |
| **Citation Count** | Displayed after generation completes, shows citation total, indicates thoroughness |

**Verifying Citations:**
1. Click citation in text
2. Modal opens with full source content
3. Verify AI interpretation matches source
4. Close modal to continue reading

**Why Important:**
- Ensures transparency
- Prevents hallucinations
- Enables verification
- Maintains research integrity

---

### 3. Text Selection and Add to Chat

Select text from AI responses to ask focused follow-up questions.

**How to Use:**
1. Click and drag to highlight text in response
2. "Add to Chat" button appears above selection
3. Click button
4. Selected text appears in query input (in quotes)
5. Modify or add context as needed
6. Submit for follow-up

**Example Workflow:**
```
AI Response: "...Wearable devices must demonstrate clinical validity
through rigorous testing..."

You select: "clinical validity through rigorous testing"
Click "Add to Chat"

Query Input Now Shows:
"clinical validity through rigorous testing"

You Add:
"clinical validity through rigorous testing" - Can you explain what
specific tests are required?

Submit → AI provides detailed answer about testing requirements
```

**Use Cases:**
- Clarifying specific points
- Deep diving into details
- Asking about technical terms
- Following up on interesting findings

**Benefits:**

| Benefit | Value |
|---------|-------|
| No retyping | Select and add directly |
| Exact quote preserved | Original text maintained |
| Context maintained | Continuity in conversation |
| Faster follow-ups | Streamlined workflow |

---

### 4. Quick Actions

Pre-configured buttons for instant output generation.

**Available Quick Actions (placeholder examples):**

| Button | Auto-Generated Query | Best For |
|--------|---------------------|----------|
| **New Summary** | "Generate a comprehensive summary of the selected knowledge sources." | Overview of topic |
| **New FAQ** | "Generate a list of frequently asked questions (FAQs) with answers based on the selected sources." | Common questions |
| **New Timeline** | "Create a timeline of the key events and dates in the selected sources." | Chronological understanding |
| **New Comparison** | "Compare and contrast the key themes and findings across the selected knowledge sources." | Analyzing differences |
| **New Study Guide** | "Create a study guide covering the main topics from the selected sources." | Educational materials |
| **New Document** | "Synthesize the information from the selected sources into a detailed document." | Comprehensive synthesis |
| **New Data Extract** | "Extract key data points from the selected sources and present them in a structured format." | Structured data |

**Note:** These templates are currently placeholders and serve as examples of potential output formats.

| Aspect | Details |
|--------|---------|
| **How They Work** | Click button → Automatic query generated → New chat started (clears previous context) → Uses currently selected sources → Response begins immediately |
| **Benefits** | No typing required, optimized queries, consistent results, fast exploration |
| **When to Use** | Initial topic exploration, standard output needs, quick overviews, common formats |

---

### 5. Chat History

Automatic saving of all queries and responses.

| Aspect | Details |
|--------|---------|
| **What Gets Saved** | Query text, AI response, template used, source count, timestamp |
| **Persistent Storage** | Saved to cloud database, persists across browser sessions, available after logout/login, never expires (until manually deleted) |
| **Organization** | Sorted by timestamp (newest first), shows query preview, displays template type, shows when created |
| **Accessing History** | Click "History" button → View list of previous chats → Click any chat to reload → Chat loads into current window → Can continue conversation |
| **History View Shows** | Query preview (first 50 characters), template badge, relative timestamp ("2 hours ago"), source count used |
| **Loading from History** | Replaces current chat content, clears conversation context (starts fresh), can ask new follow-ups, original context not restored |
| **Use Cases** | Returning to previous research, finding past answers, building on old work, referencing earlier findings |

---

### 6. Saved Outputs

Personal library of important responses.

| Aspect | Details |
|--------|---------|
| **How to Save** | Generate response → Click "Save to Outputs" button → Output saved with auto-generated title → Appears in right panel |
| **What Gets Saved** | Full response text, auto-generated title (from query), template type, source count, timestamp |
| **Viewing Outputs** | Click output in right panel → Opens in modal overlay → Full response displayed → Close to return |
| **Download as PDF** | Click PDF button in modal → Generates formatted PDF → Downloads to your computer → Includes all formatting and citations |
| **Organization** | Sorted by save date (newest first), shows template badge, shows source count, shows title |
| **Title Generation** | Uses first 30 characters of query, adds "..." if truncated; for Quick Actions uses template name (e.g., "Summary") |
| **Use Cases** | Keeping important findings, building research library, sharing with team, offline reference, report preparation |

---

## UI Features

### Streaming Response Display

Real-time response rendering as AI generates.

| Phase | Visual Elements | Benefits |
|-------|----------------|----------|
| **During Generation** | Progressive thinking messages ("thinking about your request..." → "researched knowledge sources" → "formulating response"), blinking cursor at end of text, text appears character by character, auto-scroll to follow content | Immediate feedback, progress indication, engaging experience, faster perceived performance |
| **After Completion** | Buttons enabled, final response visible, citation count shown, all formatting rendered | Clear completion signal, full interactivity available |

### Response Actions Bar

Bottom toolbar with response interaction buttons.

**Available Actions:**

| Button | Function | When Enabled |
|--------|----------|-------------|
| **Save to Outputs** | Save response to library | When response complete |
| **Copy** | Copy text to clipboard | When response exists |
| **References** | Toggle reference list | When response exists |
| **👍** | Positive feedback | Anytime |
| **👎** | Negative feedback | Anytime |

**Copy Function:**
- Copies full response text
- Includes citations
- Preserves formatting (as text)
- Shows "Copied!" confirmation

**References Toggle:**
- Shows/hides reference list
- Preference saved to browser
- Persists across sessions
- List appears at end of response

**Feedback Buttons:**
- Visual state change on click
- Can toggle on/off
- Click again to remove vote
- Used for quality tracking

---

## Navigation and Session

### New Chat

Clear conversation context to start fresh.

| Aspect | Details |
|--------|---------|
| **What It Clears** | Response display, conversation history, query input field, error messages |
| **What It Keeps** | Selected knowledge sources, category filter, saved outputs, chat history (in History view) |
| **When to Use** | Switching topics, starting unrelated query, clearing cluttered conversation, fresh perspective |

### History View

Browse and reload previous chats.

| Aspect | Details |
|--------|---------|
| **Accessing** | Click "History" button → Replaces chat display → Shows chronological list → Click chat to load |
| **Exiting** | Click any chat (loads it), click "New Chat" (returns to empty chat), or start new query (automatically exits) |

### Modals

Overlay windows for detailed views.

| Modal Type | Features |
|------------|----------|
| **Resource Modal** | Shows full resource content, triggered by clicking resource title or citation, close button to dismiss |
| **Saved Output Modal** | Shows full saved output, download PDF button, close button to dismiss |

---

## Data and Privacy

| Aspect | Details |
|--------|---------|
| **Your Personal Data** | Saved outputs (in your account), chat history (in your account), user preferences (browser local storage) |
| **Shared Data** | Knowledge base resources (read-only, all users) |
| **Data Isolation** | Each user's data is separate, cannot see other users' data, requires authentication for access, secure cloud storage |
| **Sign In** | Google OAuth, single click, no password needed, secure authentication |
| **Sign Out** | Click Logout → Clears session → Returns to login screen → Data remains saved in cloud |

---

## Summary

DimeNotes provides comprehensive features for AI-powered research:

| Feature | Description |
|---------|-------------|
| **Conversation Context** | Multi-turn awareness |
| **Citation Transparency** | Every claim sourced |
| **Text Selection** | Quick follow-ups |
| **Quick Actions** | Instant outputs |
| **History Tracking** | Never lose research |
| **Output Library** | Personal knowledge base |
| **Real-Time Streaming** | Engaging experience |
| **Flexible Interaction** | Multiple ways to work |
| **Secure Storage** | Cloud-based, private |

All features work together to create a powerful, intuitive research environment that maintains academic rigor while being easy to use.
