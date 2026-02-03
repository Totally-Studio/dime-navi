# DimeNotes Dashboard - Simple Overview

**Document Version:** 1.0
**Last Updated:** 2025-11-18

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
- **Simplify** - Regenerate in plain language for non-experts
- **Add to Chat** - Select text and click "Add to Chat" to ask follow-up questions
- **Thumbs Up/Down** - Provide feedback on response quality

### Step 6: Continue or Start New
- Ask follow-up questions to continue conversation
- Click "New Chat" to start fresh (clears conversation context)
- Click "History" to view and reload previous chats

---

## How Prompts Are Built

When you submit a question, the system constructs a comprehensive prompt for the AI in several layers:

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

## Output Templates

DimeNotes can generate responses in 7 different formats:

| Template | What It Does |
|----------|-------------|
| **SUMMARY** | Synthesizes key points into a concise overview |
| **FAQ** | Creates question-and-answer pairs |
| **TIMELINE** | Orders events and findings chronologically |
| **COMPARISON** | Compares and contrasts themes across sources |
| **STUDY_GUIDE** | Creates educational material for learning |
| **DOCUMENT** | Produces a comprehensive synthesis document |
| **DATA_EXTRACT** | Extracts structured data points |

---

## Key Features Explained

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

### Simplify Mode

Regenerate the last response in plain language for non-technical audiences.

**What it does:**
- Takes your last question
- Adds instructions to avoid jargon
- Explains technical terms in everyday language
- Uses analogies and examples
- Same sources and template

**When to use:** Sharing research with stakeholders outside the DHT industry.

### Quick Actions

Pre-configured buttons that generate common outputs instantly.

**Available Quick Actions:**
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

### Chat History

All your queries and responses are saved automatically.

**Features:**
- Persists across browser sessions
- Organized by timestamp (newest first)
- Click any item to reload into chat window
- Shows query preview and template type

### Saved Outputs

Build a personal library of research outputs.

**Features:**
- Save any response to outputs
- Auto-generated title from your query
- View in modal overlay
- Download as PDF
- Organized by save date
- Includes metadata (template type, source count)

---

## The Knowledge Base

### What's in the Knowledge Base?

Curated collection of documents about digital health technology, organized into three categories:

**Patient-Centric**
- Patient engagement strategies
- User experience design
- Patient-reported outcomes

**Regulatory**
- FDA guidelines
- Regulatory frameworks
- Compliance requirements

**Clinical Trials**
- Trial design methodologies
- Endpoint definitions
- Validation standards

### How Sources Are Used

When you select knowledge sources:
1. System extracts the full content of each source
2. Combines them into a knowledge context
3. Inserts into the AI prompt
4. AI answers based ONLY on these sources
5. AI must cite sources for all claims

**Important:** AI cannot add information from outside your selected sources.

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

## Data Storage

### What Gets Saved

**Your Personal Data (requires login):**
- Saved outputs
- Chat history
- User preferences (like showing/hiding references)

**Shared Data (public):**
- Knowledge base resources (read-only)

### Where It's Stored

All data stored in Firebase Firestore cloud database:
- **Saved Outputs:** Your personal library
- **Chat History:** Your conversation logs
- **Knowledge Base:** Shared resource library

### Data Privacy

- Each user's data is isolated (you can't see others' data)
- Authentication required for all personal operations
- Knowledge base is read-only for all users

---

## Common Workflows

### Research a New Topic

1. Select relevant knowledge sources
2. Click "New Summary" quick action
3. Review AI-generated summary
4. Ask follow-up questions for details
5. Save output to library

### Compare Multiple Sources

1. Select sources to compare
2. Click "New Comparison" quick action
3. Review side-by-side analysis
4. Select interesting text → Add to Chat
5. Ask specific comparison questions

### Create Study Materials

1. Select educational resources
2. Click "New Study Guide" quick action
3. Review generated study guide
4. Click "Simplify" for broader audience
5. Download as PDF

### Extract Specific Data

1. Select data-rich sources
2. Click "New Data Extract" quick action
3. Review structured data extraction
4. Save for reference
5. Use in reports or presentations

### Continue Previous Research

1. Click "History" button
2. Browse previous chats
3. Click chat to reload
4. Continue with follow-up questions
5. Save new insights

---

## Best Practices

### For Better Results

1. **Select Relevant Sources**
   - Choose sources directly related to your question
   - Fewer, relevant sources better than many tangential ones

2. **Ask Clear Questions**
   - Be specific about what you want to know
   - Include context if helpful

3. **Use Appropriate Templates**
   - Summary for overviews
   - FAQ for common questions
   - Timeline for chronological understanding
   - Comparison for analyzing differences

4. **Review Citations**
   - Click citations to verify source material
   - Check that interpretations match sources
   - Use citations in your own work

5. **Build on Conversations**
   - Ask follow-up questions in same chat
   - Reference previous answers
   - Use "Add to Chat" for specific points

6. **Organize Your Work**
   - Save important outputs
   - Use descriptive titles (edit if needed)
   - Download PDFs for offline access

### When to Use Features

**New Chat:** Starting a different topic (clears context)

**Simplify:** Explaining to non-experts, stakeholder presentations

**Quick Actions:** Standard outputs, initial exploration

**Add to Chat:** Deep diving into specific points

**Save Output:** Keeping for reference, sharing with team

**History:** Returning to previous research, building on past work

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
- ✅ Citations present for all major claims
- ✅ Information matches selected sources
- ✅ Clear structure and readability
- ✅ Answers your actual question
- ✅ Objective tone

**Red Flags:**
- ❌ Uncited claims (shouldn't happen with current prompts)
- ❌ Information seems outside selected sources
- ❌ Unclear or confusing structure

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

1. ✅ **Research efficiently** - AI synthesizes multiple sources
2. ✅ **Get cited answers** - All claims backed by sources
3. ✅ **Format flexibly** - 7 output templates available
4. ✅ **Continue conversations** - Multi-turn context awareness
5. ✅ **Save work** - Personal library of outputs
6. ✅ **Share knowledge** - Download PDFs, simplify for audiences
7. ✅ **Track history** - All chats automatically saved
8. ✅ **Work confidently** - Transparent citations, no hallucinations

### The Process in Brief

```
Select Sources → Ask Question → Review Response → Save or Continue
```

Everything is designed to help you find answers faster while maintaining research integrity through strict citation requirements.

---

**For more detailed technical documentation, see:** `DIMENOTES_DASHBOARD_OVERVIEW.md`
