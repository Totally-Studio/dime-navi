# DimeNotes - Prompts and Architecture

**Last Updated:** 19-NOV-25

## Table of Contents

- [Overview](#overview)
- [How Prompts Are Built](#how-prompts-are-built)
- [System Prompts](#system-prompts)
- [Output Templates](#output-templates)
- [How Information Flows](#how-information-flows)
- [Streaming Response System](#streaming-response-system)
- [Quality Controls](#quality-controls)
- [Context Awareness](#context-awareness)
- [Quick Action Queries](#quick-action-queries)
- [Limitations](#limitations)
- [Summary](#summary)

---

## Overview

This document explains how DimeNotes constructs prompts and uses AI to generate responses.

---

## How Prompts Are Built

When you submit a question, the system constructs a comprehensive prompt for the AI in several layers.

### The Three-Layer System

**Layer 1: System Instructions**
- Defines the AI's role as a research assistant
- Sets citation requirements (must cite every claim)
- Establishes rules (stay relevant, be objective, structure clearly)

**Layer 2: Knowledge Context**
- Inserts the full text of selected knowledge resources
- Formats as individual sections with titles
- Includes conversation history from current chat thread

**Layer 3: Your Query + Template**
- Your question exactly as written
- Specified output format (Summary, FAQ, Timeline, etc.)

### Visual Flow

```
┌─────────────────────────────────────────┐
│ SYSTEM INSTRUCTIONS                     │
│ "You are an expert research assistant..." │
│ "You must cite all sources..."         │
├─────────────────────────────────────────┤
│ KNOWLEDGE SOURCES                       │
│ Resource 1: Full text...                │
│ Resource 2: Full text...                │
│ Resource 3: Full text...                │
├─────────────────────────────────────────┤
│ CONVERSATION HISTORY                    │
│ Previous Q&A exchanges (if any)         │
├─────────────────────────────────────────┤
│ YOUR QUERY + TEMPLATE                   │
│ "What are the regulatory requirements?"│
│ Template: SUMMARY                       │
└─────────────────────────────────────────┘
         ↓
   Gemini AI generates response
         ↓
   Streams back to your screen
```

---

## System Prompts

The AI follows strict instructions defined in two system prompts:

### System Prompt (Start)
Defines the AI's role:
- Expert research assistant
- Specializes in synthesizing multiple documents
- Generates clear, concise, accurate responses
- Based ONLY on provided knowledge sources

### System Prompt (End)
Establishes core rules:

1. **Citation Requirement (CRITICAL)**
   - MUST cite sources for every claim
   - Format: `[Source: Title]`
   - Multiple sources when synthesizing
   - Every paragraph needs at least one citation

2. **Stay Relevant**
   - Only use provided knowledge sources
   - No external knowledge allowed
   - No assumptions

3. **Be Objective**
   - Present information accurately
   - No bias
   - No unsupported claims

4. **Structure Response**
   - Clear headings
   - Bullet points
   - Enhanced readability

5. **Citation Completeness**
   - If no source for a statement → don't include it

---

## Output Templates

DimeNotes can generate responses in 7 different formats (placeholder examples):

| Template | What It Does |
|----------|-------------|
| **SUMMARY** | Synthesizes key points into a concise overview |
| **FAQ** | Creates question-and-answer pairs |
| **TIMELINE** | Orders events and findings chronologically |
| **COMPARISON** | Compares and contrasts themes across sources |
| **STUDY_GUIDE** | Creates educational material for learning |
| **DOCUMENT** | Produces a comprehensive synthesis document |
| **DATA_EXTRACT** | Extracts structured data points |

**Note:** These templates are currently placeholders and serve as examples of potential output formats.

---

## How Information Flows

### Complete Process Flow

```
1. You type a question and click Submit
       ↓
2. System builds the multi-layer prompt
       ↓
3. Prompt sent to Google Gemini API
       ↓
4. AI processes request and generates response
       ↓
5. Response streams back in real-time chunks
       ↓
6. Each chunk appears immediately on screen
       ↓
7. Complete response with citations displayed
       ↓
8. Conversation saved to your history
```

---

## Streaming Response System

Responses appear in real-time as they're generated, not all at once.

### How Streaming Works

```
AI generates: "Wearable devices..."
    ↓ (sends chunk)
You see: "Wearable devices..."

AI generates: " must demonstrate clinical..."
    ↓ (sends chunk)
You see: "Wearable devices must demonstrate clinical..."

AI generates: " validity [Source: FDA Guidelines]."
    ↓ (sends chunk)
You see: "Wearable devices must demonstrate clinical validity [Source: FDA Guidelines]."
```

### Visual Indicators

**During generation:**
- Thinking animation with progressive messages:
  - "thinking about your request..."
  - "researched knowledge sources"
  - "formulating response"
- Blinking cursor at end of streamed text

**After completion:**
- Buttons enabled (Save, Copy, etc.)
- Full response with all citations visible

---

## Quality Controls

### How We Ensure Quality

| Quality Control | Implementation |
|----------------|----------------|
| **Strict System Prompts** | Clear role definition, explicit citation requirements, no external knowledge allowed |
| **Knowledge-Grounded Responses** | AI can only use provided sources, must cite every claim, transparent sourcing |
| **Structured Output** | Template-based formatting, consistent structure, professional presentation |
| **User Feedback** | Thumbs up/down buttons track response quality and help improve system |

### What This Prevents

| Prevention | How It Works |
|------------|--------------|
| **No hallucinations** | Only uses provided sources |
| **No bias** | Objective presentation required |
| **No uncited claims** | Every statement must have a source |
| **No off-topic content** | Stays relevant to query and sources |

---

## Context Awareness

### Multi-Turn Conversations

The system maintains conversation context to enable natural follow-up questions.

**How Context Works:**
1. Each query and response is saved
2. Conversation history is formatted as context
3. Context is included in next prompt
4. AI can reference previous exchanges

**Example with Context:**
```
FIRST EXCHANGE:
User: What are the regulatory requirements for wearables?
AI: [Detailed FDA requirements...]

SECOND EXCHANGE (with context):
System includes previous Q&A in prompt
User: How do these differ in Europe?
AI: [Compares FDA to EU, referencing previous answer...]
```

**Benefits:**
- Natural conversation flow
- No need to repeat context
- Build on previous answers
- Deep dives into topics

### When Context Clears

Context is cleared when:
- You click "New Chat"
- You use a Quick Action (auto-starts new chat)
- You reload a chat from history

---

## Quick Action Queries

Each Quick Action uses a pre-defined query optimized for that template.

**Examples:**

**Summary:**
```
Generate a comprehensive summary of the selected knowledge sources.
```

**FAQ:**
```
Generate a list of frequently asked questions (FAQs) with answers
based on the selected sources.
```

**Timeline:**
```
Create a timeline of the key events and dates in the selected sources.
```

**Comparison:**
```
Compare and contrast the key themes and findings across the selected
knowledge sources.
```

---

## Limitations

### What the AI Cannot Do

| Limitation | Specifics |
|-----------|-----------|
| **No External Information** | Cannot add facts from outside selected sources, cannot use general knowledge, cannot make assumptions |
| **No Opinions** | Cannot provide subjective opinions, cannot make recommendations beyond source content, cannot predict future trends |
| **No Uncited Claims** | Every statement must have a citation; if no source supports it, won't include it; cannot synthesize beyond what sources explicitly state |

### Query Guidelines

| Query Type | Examples |
|-----------|----------|
| **Good Queries** | "Summarize FDA requirements from selected sources"<br>"Compare patient engagement approaches in the studies"<br>"What clinical endpoints are discussed?" |
| **Problematic Queries** | "What will FDA require next year?" (prediction)<br>"Which approach is best?" (opinion without source basis)<br>"Tell me about wearables" (too broad, needs specific sources) |

**Solution:** Select relevant sources and ask specific questions about what those sources contain.

---

## Summary

DimeNotes uses a sophisticated prompt construction system to ensure:

| Feature | Benefit |
|---------|---------|
| **Accurate responses** | Grounded in selected sources |
| **Complete citations** | Every claim traced to source |
| **Flexible formats** | 7 templates for different needs |
| **Context awareness** | Natural conversations |
| **Quality controls** | Strict system prompts prevent errors |
| **Transparent process** | Clear how AI generates responses |

The three-layer prompt system (System Instructions + Knowledge + Query) ensures responses are trustworthy, traceable, and tailored to your needs.
