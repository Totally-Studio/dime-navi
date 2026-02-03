# DimeNotes Dashboard - User Guide

**Document Version:** 1.0
**Last Updated:** 2025-11-18

---

## Table of Contents

- [What is DimeNotes Notebook?](#what-is-dimenotes-notebook)
- [Dashboard Layout](#dashboard-layout)
- [How to Use DimeNotes](#how-to-use-dimenotes)
- [Key Features](#key-features)
- [Common Workflows](#common-workflows)
- [Best Practices](#best-practices)
- [Understanding Responses](#understanding-responses)
- [Troubleshooting](#troubleshooting)
- [Summary](#summary)

---

## What is DimeNotes Notebook?

DimeNotes Notebook is an AI-powered research assistant that helps digital health technology professionals find answers from a curated knowledge base. It generates well-cited, structured responses in various formats.

### Core Purpose
- Ask questions about digital health technology topics
- Get answers synthesized from trusted knowledge sources
- Generate outputs in different formats (summaries, FAQs, timelines, etc.)
- Save and organize research outputs
- Have multi-turn conversations with context awareness

### Technology
- **Frontend:** React with TypeScript
- **AI Engine:** Google Gemini 2.5 Flash (streaming)
- **Database:** Firebase Firestore
- **Authentication:** Google Sign-In

---

## Dashboard Layout

The dashboard is organized into three main columns:

```
┌─────────────────────────────────────────────────────────────────┐
│                          HEADER                                 │
│  DiMe Notebook              [User Name]  [Logout Button]        │
├────────────────┬─────────────────────────┬─────────────────────┤
│                │                         │                     │
│ KNOWLEDGE BASE │   CHAT WINDOW           │  SAVED OUTPUTS      │
│                │                         │                     │
│ Select sources │  Ask questions          │  Quick actions      │
│ to include in  │  View AI responses      │  Save outputs       │
│ your research  │  Continue conversation  │  View history       │
│                │                         │                     │
└────────────────┴─────────────────────────┴─────────────────────┘
```

### Left Column: Knowledge Base
- Browse available knowledge resources
- Select which sources to include (checkboxes)
- Filter by category (Patient-Centric, Regulatory, Clinical Trials)
- View full resource details

### Center Column: Chat Window
- Type your questions
- See AI-generated responses stream in real-time
- Continue conversations with follow-up questions
- View chat history

### Right Column: Saved Outputs
- Quick action buttons to generate common outputs
- List of your saved research outputs
- Click to view or download as PDF

---

## How to Use DimeNotes

### Step 1: Sign In
- Click "Sign in with Google"
- Authenticate with your Google account
- Dashboard loads with knowledge base and your saved outputs

### Step 2: Select Knowledge Sources
- Browse the knowledge base on the left
- Check/uncheck sources you want to include
- Use "Select All" or "Deselect All" for convenience
- Filter by category if needed

### Step 3: Ask a Question
**Two ways to start:**

**Option A: Type Your Own Question**
- Type your question in the input box at bottom of chat
- Click Submit or press Enter
- Watch the response stream in real-time

**Option B: Use Quick Actions**
- Click a template button (New Summary, New FAQ, etc.)
- System automatically generates an appropriate query
- Response begins immediately

### Step 4: Review the Response
- AI generates response based on selected knowledge sources
- Every claim includes citations in format: `[Source: Title]`
- Click citations to view the full source document
- Toggle "References" button to show/hide reference list

### Step 5: Interact with the Response
**Available Actions:**
- **Save to Outputs** - Add to your personal library
- **Copy** - Copy full text to clipboard
- **Add to Chat** - Select text and click "Add to Chat" to ask follow-up questions
- **Thumbs Up/Down** - Provide feedback on response quality

### Step 6: Continue or Start New
- Ask follow-up questions to continue conversation
- Click "New Chat" to start fresh (clears conversation context)
- Click "History" to view and reload previous chats

---

## Key Features

### Multi-Turn Conversations

Have natural back-and-forth conversations. The AI remembers what you discussed earlier in the same chat session.

**How it works:**
- Each response is added to conversation history
- Next question includes full conversation as context
- AI can reference previous exchanges
- "New Chat" button clears history to start fresh

**Example:**
```
You: What are the regulatory requirements for wearables?
AI: [Detailed response about FDA requirements...]

You: How do these differ from requirements in Europe?
AI: [Compares FDA to EU regulations, referencing previous answer...]
```

### Citation System

Every response includes citations to ensure transparency and traceability.

**Citation Format:** `[Source: Resource Title]`

**Example:**
```
Wearable devices must demonstrate clinical validity through
rigorous testing [Source: FDA Digital Health Guidelines].
The validation process typically requires both laboratory
and real-world studies [Source: Clinical Trial Standards].
```

**UI Features:**
- Citations are clickable - opens full resource
- References section lists all cited sources
- Citation count displayed after generation

### Text Selection Feature

Select any part of the AI's response to ask follow-up questions.

**How to use:**
1. Highlight text in the response
2. Click "Add to Chat" button that appears
3. Text is added to your query input
4. Modify and submit for follow-up

**Use case:** Ask specific questions about interesting points without retyping.

### Quick Actions

Pre-configured buttons that generate common outputs instantly.

**Available Quick Actions (placeholder examples):**
- New Summary
- New FAQ
- New Timeline
- New Comparison
- New Study Guide
- New Document
- New Data Extract

**How they work:**
- Click button → automatic query generated
- Starts new chat (clears previous context)
- Uses all currently selected knowledge sources
- Begins generating immediately

**Note:** These quick actions are currently placeholders and serve as examples of potential output formats.

### Chat History

All your queries and responses are saved automatically.

| Aspect | Details |
|--------|---------|
| **Features** | Persists across browser sessions, organized by timestamp (newest first), click any item to reload into chat window, shows query preview and template type |

### Saved Outputs

Build a personal library of research outputs.

| Aspect | Details |
|--------|---------|
| **Features** | Save any response to outputs, auto-generated title from your query, view in modal overlay, download as PDF, organized by save date, includes metadata (template type, source count) |

---

## Common Workflows

| Workflow | Steps |
|----------|-------|
| **Research a New Topic** | 1. Select relevant knowledge sources<br>2. Click "New Summary" quick action<br>3. Review AI-generated summary<br>4. Ask follow-up questions for details<br>5. Save output to library |
| **Compare Multiple Sources** | 1. Select sources to compare<br>2. Click "New Comparison" quick action<br>3. Review side-by-side analysis<br>4. Select interesting text → Add to Chat<br>5. Ask specific comparison questions |
| **Create Study Materials** | 1. Select educational resources<br>2. Click "New Study Guide" quick action<br>3. Review generated study guide<br>4. Save or download as PDF |
| **Extract Specific Data** | 1. Select data-rich sources<br>2. Click "New Data Extract" quick action<br>3. Review structured data extraction<br>4. Save for reference<br>5. Use in reports or presentations |
| **Continue Previous Research** | 1. Click "History" button<br>2. Browse previous chats<br>3. Click chat to reload<br>4. Continue with follow-up questions<br>5. Save new insights |

---

## Best Practices

| Practice | Recommendations |
|----------|----------------|
| **Select Relevant Sources** | Choose sources directly related to your question; fewer, relevant sources better than many tangential ones |
| **Ask Clear Questions** | Be specific about what you want to know; include context if helpful |
| **Use Appropriate Templates** | Summary for overviews, FAQ for common questions, Timeline for chronological understanding, Comparison for analyzing differences |
| **Review Citations** | Click citations to verify source material, check that interpretations match sources, use citations in your own work |
| **Build on Conversations** | Ask follow-up questions in same chat, reference previous answers, use "Add to Chat" for specific points |
| **Organize Your Work** | Save important outputs, use descriptive titles (edit if needed), download PDFs for offline access |

### When to Use Features

| Feature | Best Used For |
|---------|--------------|
| **New Chat** | Starting a different topic (clears context) |
| **Quick Actions** | Standard outputs, initial exploration |
| **Add to Chat** | Deep diving into specific points |
| **Save Output** | Keeping for reference, sharing with team |
| **History** | Returning to previous research, building on past work |

---

## Understanding Responses

### What to Expect

**Every Response Includes:**
- Direct answer to your question
- Citations for all claims
- Structured formatting (headings, bullets, etc.)
- Information from ONLY your selected sources

**Response Quality:**
- Based on quality and relevance of selected sources
- More sources = more comprehensive (but ensure relevance)
- Citations ensure transparency
- Objective presentation without bias

### Evaluating Responses

**Check for:**

| Quality Indicator | What to Look For |
|------------------|------------------|
| Citations | Present for all major claims |
| Information accuracy | Matches selected sources |
| Structure | Clear and readable |
| Relevance | Answers your actual question |
| Tone | Objective presentation |

**Red Flags:**

| Warning Sign | What It Means |
|--------------|---------------|
| Uncited claims | Shouldn't happen with current prompts |
| Outside information | Seems beyond selected sources |
| Unclear structure | Confusing or poorly organized |

Use thumbs up/down to provide feedback!

---

## Troubleshooting

### Common Issues

**Issue:** "Please login to generate a response"
- **Solution:** Sign in with Google account

**Issue:** Response seems incomplete or generic
- **Solution:** Check that you selected relevant knowledge sources

**Issue:** No citations in response
- **Solution:** Report with thumbs down (this shouldn't happen)

**Issue:** Response doesn't answer my question
- **Solution:** Try rephrasing question, ensure relevant sources selected

**Issue:** Can't find saved output
- **Solution:** Check right panel, scroll down, ensure you're logged in

**Issue:** Citation links don't work
- **Solution:** Ensure source is still in knowledge base, refresh page

---

## Summary

**DimeNotes Dashboard** helps you:

| Capability | Description |
|------------|-------------|
| **Research efficiently** | AI synthesizes multiple sources |
| **Get cited answers** | All claims backed by sources |
| **Format flexibly** | 7 output templates available |
| **Continue conversations** | Multi-turn context awareness |
| **Save work** | Personal library of outputs |
| **Share knowledge** | Download PDFs for distribution |
| **Track history** | All chats automatically saved |
| **Work confidently** | Transparent citations, no hallucinations |

### The Process in Brief

```
Select Sources → Ask Question → Review Response → Save or Continue
```

Everything is designed to help you find answers faster while maintaining research integrity through strict citation requirements.
