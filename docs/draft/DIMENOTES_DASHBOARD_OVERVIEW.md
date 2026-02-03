# DimeNotes Dashboard (Notebook) - Complete Overview

**Document Version:** 1.0
**Application Route:** `/` (root)
**Last Updated:** 2025-11-18

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Dashboard Layout](#dashboard-layout)
3. [User Workflow](#user-workflow)
4. [Prompt Construction Process](#prompt-construction-process)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Core Components](#core-components)
7. [State Management](#state-management)
8. [Backend Processing](#backend-processing)
9. [Streaming Response System](#streaming-response-system)
10. [Knowledge Base System](#knowledge-base-system)
11. [Key Features](#key-features)
12. [Technical Details](#technical-details)

---

## Application Overview

**DimeNotes Notebook** is an AI-powered research assistant for digital health technology (DHT) professionals. It synthesizes information from curated knowledge sources to generate various output formats with strict citation requirements.

### Core Purpose
- Query a curated knowledge base about digital health technology
- Generate structured outputs in multiple formats (Summary, FAQ, Timeline, etc.)
- Maintain conversation threads with context awareness
- Save and retrieve outputs and chat history

### Technology Stack
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **AI Engine:** Google Gemini 2.5 Flash (streaming)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth

---

## Dashboard Layout

The dashboard uses a **3-column responsive grid layout**:

```
┌─────────────────────────────────────────────────────────────────┐
│                          HEADER                                 │
│  DiMe Notebook    [Environment Badge]    [User]  [Logout]      │
├────────────────┬─────────────────────────┬─────────────────────┤
│ LEFT (4 cols)  │   CENTER (5 cols)       │  RIGHT (3 cols)     │
│                │                         │                     │
│ KNOWLEDGE BASE │   CHAT WINDOW           │  SAVED OUTPUTS      │
│                │                         │                     │
│ [Group Filter] │  [New Chat] [History]   │  Quick Actions:     │
│                │                         │  - New Summary      │
│ □ Resource 1   │  ┌───────────────────┐  │  - New FAQ         │
│ ✓ Resource 2   │  │                   │  │  - New Timeline    │
│ ✓ Resource 3   │  │  Response Area    │  │  ...               │
│ □ Resource 4   │  │                   │  │                     │
│ ...            │  │  with streaming   │  │ Saved Outputs:      │
│                │  │                   │  │ • Output 1         │
│ [Select All]   │  │                   │  │ • Output 2         │
│ [Deselect All] │  └───────────────────┘  │ • Output 3         │
│                │                         │ ...                │
│  12 selected   │  [Save] [Copy] [Refs]   │                     │
│                │  [Simplify] [👍] [👎]   │                     │
│                │                         │                     │
│                │  ┌───────────────────┐  │                     │
│                │  │ Query Input       │  │                     │
│                │  │ [Type question...] │  │                     │
│                │  │ [Submit]          │  │                     │
│                │  └───────────────────┘  │                     │
└────────────────┴─────────────────────────┴─────────────────────┘
```

### Layout Specifications
- **Grid:** `grid-cols-1 lg:grid-cols-12`
- **Left Column (Knowledge):** 4/12 columns (`lg:col-span-4`)
- **Center Column (Chat):** 5/12 columns (`lg:col-span-5`)
- **Right Column (Outputs):** 3/12 columns (`lg:col-span-3`)
- **Height:** `calc(100vh - 128px)` (full viewport minus header)

---

## User Workflow

### 1. Authentication Flow

```
User Lands on App
       ↓
   Not Logged In? → Show LoginScreen
       ↓
   Click "Sign in with Google"
       ↓
   Firebase Auth (Google OAuth)
       ↓
   Success → Load Main Dashboard
       ↓
   Fetch Knowledge Base + User's Saved Outputs
```

### 2. Query Submission Flow

```
User selects knowledge sources (checkboxes)
       ↓
User types query in input field
       ↓
User clicks Submit (or presses Enter)
       ↓
Query is cleared from input immediately
       ↓
Response area shows "You: [query]"
       ↓
Streaming response begins
       ↓
"Assistant: [streaming text...]"
       ↓
Complete → Enable Save/Copy/Feedback buttons
```

### 3. Quick Action Flow

```
User clicks "New Summary" (or other template)
       ↓
Auto-generates template-specific query
       ↓
Clears response area (starts new chat)
       ↓
Begins generation immediately
       ↓
No manual input required
```

---

## Prompt Construction Process

### Overview

The AI receives TWO main inputs:
1. **System Instruction** (defines AI behavior + knowledge context)
2. **User Prompt** (user's query + selected template)

### Step-by-Step Construction

#### 1. Knowledge Context Assembly

**Location:** [App.tsx:88-92](../src/App.tsx#L88-L92)

```typescript
const knowledgeContext = resources
  .filter(r => selectedResources.includes(r.id))
  .map(r => `## ${r.title}\n\n${r.description}`)
  .join('\n\n---\n\n');
```

**Output Example:**
```
## Resource 1: Defining Nocturnal Scratch
A consensus on a uniform definition...

---

## Resource 2: Physical Activity in Cancer Cachexia
This resource focuses on the critical need...
```

#### 2. Conversation History Context

**Location:** [App.tsx:101-107](../src/App.tsx#L101-L107)

```typescript
let conversationContext = '';
if (conversationHistory.length > 0) {
  conversationContext = '\n\n## CONVERSATION HISTORY:\n\n' +
    conversationHistory.map((turn, idx) =>
      `### Exchange ${idx + 1}:\nUser: ${turn.query}\nAssistant: ${turn.response}`
    ).join('\n\n');
}
```

This enables **multi-turn conversations** with context awareness.

#### 3. ELI5 (Simplify) Mode

**Location:** [App.tsx:109-113](../src/App.tsx#L109-L113)

If user clicks "Simplify" button:

```typescript
if (isELI5) {
  queryWithInstructions = `${currentQuery}\n\nIMPORTANT: Please explain this using simple, clear language for someone who is not in the digital health technology industry...`;
}
```

#### 4. Full Context Merging

**Location:** [App.tsx:115](../src/App.tsx#L115)

```typescript
const fullContext = knowledgeContext + conversationContext;
```

#### 5. System Instruction Construction

**Location:** [backendService.ts:37](../src/services/backendService.ts#L37)

```typescript
const systemInstruction = `${SYSTEM_PROMPT_START}\n\n${context}\n\n${SYSTEM_PROMPT_END}`;
```

**Visual Structure:**
```
┌─────────────────────────────────────────┐
│ SYSTEM_PROMPT_START                     │
│ "You are an expert research assistant..." │
├─────────────────────────────────────────┤
│ KNOWLEDGE CONTEXT                       │
│ ## Resource 1: Title                    │
│ Description...                          │
│ ---                                     │
│ ## Resource 2: Title                    │
│ Description...                          │
├─────────────────────────────────────────┤
│ CONVERSATION HISTORY (if any)           │
│ ### Exchange 1:                         │
│ User: previous query                    │
│ Assistant: previous response            │
├─────────────────────────────────────────┤
│ SYSTEM_PROMPT_END                       │
│ "When generating the response, adhere..."│
│ "1. Cite Sources - CRITICAL..."        │
│ "2. Stay Relevant..."                  │
└─────────────────────────────────────────┘
```

#### 6. User Prompt Construction

**Location:** [backendService.ts:36](../src/services/backendService.ts#L36)

```typescript
const fullPrompt = `USER QUERY: "${query}"\n\nGENERATE RESPONSE USING TEMPLATE: "${template}"`;
```

**Example:**
```
USER QUERY: "What are the regulatory requirements for wearables?"

GENERATE RESPONSE USING TEMPLATE: "SUMMARY"
```

#### 7. Final API Call

**Location:** [backendService.ts:40-46](../src/services/backendService.ts#L40-L46)

```typescript
const response = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: fullPrompt,          // User query + template
  config: {
    systemInstruction: systemInstruction,  // System behavior + context
  },
});
```

---

## Data Flow Architecture

### Complete Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION (App.tsx)                                │
│    - User types query                                        │
│    - Selects template (SUMMARY, FAQ, etc.)                   │
│    - Selects knowledge sources                               │
│    - Clicks Submit                                           │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. STATE MANAGEMENT (App.tsx)                                │
│    - setQuery('')  (clear input)                             │
│    - setIsLoading(true)                                      │
│    - setResponse(prev => prev + userMessage)                 │
│    - Build contexts (knowledge + conversation)               │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. API CLIENT (apiClient.ts)                                 │
│    - Gets Firebase auth token                                │
│    - Calls backendService.generate()                         │
│    - Passes onChunk callback                                 │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. BACKEND SERVICE (backendService.ts)                       │
│    - Authenticates user                                      │
│    - Constructs system instruction                           │
│    - Constructs user prompt                                  │
│    - Calls Gemini API                                        │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. GEMINI API (Google GenAI)                                 │
│    - Processes request                                       │
│    - Generates streaming response                            │
│    - Returns chunks asynchronously                           │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. STREAMING BACK TO UI                                      │
│    backendService → onChunk callback                         │
│            ↓                                                 │
│    apiClient → passes chunk to React                         │
│            ↓                                                 │
│    App.tsx → flushSync() for immediate render                │
│            ↓                                                 │
│    ResponseDisplay → StreamingMarkdown renders               │
└──────────────────────────────────────────────────────────────┘
```

### File Reference Map

| Layer | File | Purpose |
|-------|------|---------|
| UI Layer | [App.tsx](../src/App.tsx) | Main application logic, state management |
| Display | [ResponseDisplay.tsx](../src/components/ResponseDisplay.tsx) | Renders response, handles streaming display |
| API Layer | [apiClient.ts](../src/services/apiClient.ts) | Routes requests, handles auth |
| Backend | [backendService.ts](../src/services/backendService.ts) | Constructs prompts, calls Gemini API |
| Types | [types.ts](../src/types.ts) | TypeScript interfaces |
| Constants | [constants.ts](../src/constants.ts) | System prompts |

---

## Core Components

### 1. Knowledge Base Display

**Component:** `KnowledgeBaseDisplay`
**Location:** Left column (4/12 grid)

**Features:**
- Lists all available knowledge resources
- Checkbox selection interface
- Group filtering (Patient-Centric, Regulatory, Clinical Trials)
- Select All / Deselect All buttons
- Shows selection count
- Click to view full resource details in modal

**State:**
```typescript
const [resources, setResources] = useState<Resource[]>([]);
const [selectedResources, setSelectedResources] = useState<number[]>([]);
const [activeGroupFilter, setActiveGroupFilter] = useState<Resource['group'] | null>(null);
```

### 2. Chat Window (Response Display)

**Component:** `ResponseDisplay`
**Location:** Center column (5/12 grid)

**Features:**
- Streaming markdown rendering
- Thinking animation (progressive: "thinking" → "researched" → "formulating")
- Citation display with toggle
- Text selection → "Add to Chat" button
- Auto-scroll to bottom
- Copy to clipboard
- Save to outputs
- Simplify (ELI5) button
- Thumbs up/down feedback

**State:**
```typescript
const [response, setResponse] = useState<string>('');
const [isLoading, setIsLoading] = useState<boolean>(false);
const [showReferences, setShowReferences] = useState<boolean>(true);
```

### 3. Query Controls

**Component:** `QueryControls`
**Location:** Below chat window

**Features:**
- Text input for user query
- Submit button
- Shows selected resource count
- Disabled during loading

### 4. Saved Outputs Panel

**Component:** `SavedOutputsPanel`
**Location:** Right column (3/12 grid)

**Features:**
- Lists user's saved outputs
- Quick action buttons (templates)
- Click to view full output in modal
- Shows template type badge
- Shows source count

---

## State Management

### Main Application State

**Location:** [App.tsx:20-31](../src/App.tsx#L20-L31)

```typescript
// User input
const [query, setQuery] = useState<string>('');
const [selectedTemplate, setSelectedTemplate] = useState<Template>(Template.SUMMARY);

// Response state
const [response, setResponse] = useState<string>('');
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);

// Data
const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);
const [resources, setResources] = useState<Resource[]>([]);
const [selectedResources, setSelectedResources] = useState<number[]>([]);

// Conversation tracking
const [conversationHistory, setConversationHistory] = useState<Array<{query: string, response: string}>>([]);
const [lastSubmittedQuery, setLastSubmittedQuery] = useState<string>('');

// History view
const [showHistory, setShowHistory] = useState<boolean>(false);
const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
```

### State Update Patterns

#### Streaming Response Updates

**Uses `flushSync` for immediate rendering:**

```typescript
flushSync(() => {
  setResponse(prev => {
    const newResponse = prev + chunk;
    return newResponse;
  });
});
```

This ensures each chunk renders immediately without batching.

#### Conversation History Updates

**After successful generation:**

```typescript
setConversationHistory(prev => [...prev, { query: currentQuery, response: fullResponse }]);
```

**On new chat:**

```typescript
setConversationHistory([]); // Clear thread
```

---

## Backend Processing

### Authentication

**Location:** [backendService.ts:21-28](../src/services/backendService.ts#L21-L28)

```typescript
private _authenticate(user: User | null): string {
  if (!user) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }
  return user.uid;
}
```

All operations require authentication.

### Generate Method

**Location:** [backendService.ts:31-68](../src/services/backendService.ts#L31-L68)

**Process:**
1. Authenticate user
2. Construct full prompt
3. Construct system instruction
4. Call Gemini streaming API
5. Iterate chunks and call `onChunk` callback
6. Handle errors

**Signature:**
```typescript
async generate(
  query: string,
  template: Template,
  context: string,
  user: User | null,
  onChunk: (chunk: string) => void
): Promise<void>
```

### Firestore Operations

**Collections Structure:**
```
users/
  └── {uid}/
      ├── outputs/          # Saved outputs
      │   └── {outputId}
      └── chatHistory/      # Chat history
          └── {chatId}

knowledgeBase/              # Shared resources
  └── {resourceId}
```

**Save Output:**
```typescript
collection(db, 'users', uid, 'outputs')
```

**Get Outputs:**
```typescript
query(userOutputsCollection, orderBy('timestamp', 'desc'))
```

---

## Streaming Response System

### How Streaming Works

1. **Backend calls Gemini API:**
   ```typescript
   const response = await ai.models.generateContentStream({...});
   ```

2. **Iterate async stream:**
   ```typescript
   for await (const chunk of response) {
     if (chunk.text) {
       onChunk(chunk.text);
     }
   }
   ```

3. **Callback chains back to UI:**
   - `backendService` → `onChunk(text)`
   - `apiClient` → passes to React callback
   - `App.tsx` → `flushSync(() => setResponse(prev => prev + chunk))`
   - `ResponseDisplay` → `StreamingMarkdown` renders

### Streaming Markdown Component

**Component:** `StreamingMarkdown`
**Purpose:** Renders markdown in real-time as chunks arrive

**Features:**
- Parses markdown with `react-markdown`
- Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
- Detects citations `[Source: Title]`
- Clickable citations that open resource modal
- References section at bottom (toggleable)

---

## Knowledge Base System

### Resource Structure

```typescript
interface Resource {
  id: number;
  title: string;
  description: string;  // Full content
  summary: string;      // Condensed version
  tags: string[];
  group: 'Patient-Centric' | 'Regulatory' | 'Clinical Trials';
}
```

### Resource Groups

| Group | Purpose |
|-------|---------|
| **Patient-Centric** | Patient engagement, user experience, DHT design |
| **Regulatory** | FDA guidelines, compliance, regulatory frameworks |
| **Clinical Trials** | Clinical trial design, endpoints, validation |

### Knowledge Loading

**Location:** [App.tsx:40-52](../src/App.tsx#L40-L52)

```typescript
useEffect(() => {
  const fetchKnowledge = async () => {
    try {
      const knowledge = await getKnowledge();
      setResources(knowledge);
      setSelectedResources(knowledge.map(r => r.id)); // Select all by default
    } catch (e) {
      setError("Could not load knowledge.");
    }
  };
  fetchKnowledge();
}, []);
```

---

## Key Features

### 1. Multi-Turn Conversations

Users can have back-and-forth conversations. Each new query includes previous exchanges as context.

**Implementation:**
- `conversationHistory` state tracks all Q&A pairs
- Appended to system instruction before each request
- "New Chat" button clears history

### 2. Quick Actions (Template Buttons)

Pre-defined queries for each template type.

**Example Queries:**
```typescript
const autoQueryMap = {
  [Template.SUMMARY]: "Generate a comprehensive summary of the selected knowledge sources.",
  [Template.FAQ]: "Generate a list of frequently asked questions (FAQs)...",
  [Template.TIMELINE]: "Create a timeline of the key events and dates...",
  // ... etc
};
```

### 3. Citation System

**Enforcement:** System prompt requires `[Source: Title]` format for all claims.

**UI Features:**
- Inline citations in response
- Clickable citations open resource modal
- Toggle "References" to show/hide reference list
- Citation count displayed after generation

### 4. Text Selection → Add to Chat

**Flow:**
1. User selects text in response
2. Floating button appears: "Add to Chat"
3. Click button → text appended to query input
4. User can modify and submit

**Use Case:** Follow-up questions based on specific parts of response.

### 5. Simplify (ELI5) Mode

**Purpose:** Regenerate last response in plain language for non-experts.

**Implementation:**
- Appends simplification instructions to query
- Uses same knowledge sources and template
- Generates entirely new response

### 6. Chat History

**Features:**
- Saves all queries/responses to Firestore
- Click "History" button to view list
- Click any history item to load into chat
- Persists across sessions

### 7. Saved Outputs

**Features:**
- Save any response to personal library
- Auto-generates title from query
- View in modal
- Download as PDF
- Organized by timestamp

---

## Technical Details

### Templates (Output Formats)

```typescript
export enum Template {
  SUMMARY = 'SUMMARY',           // Concise overview
  TIMELINE = 'TIMELINE',         // Chronological events
  FAQ = 'FAQ',                   // Q&A format
  COMPARISON = 'COMPARISON',     // Side-by-side analysis
  STUDY_GUIDE = 'STUDY_GUIDE',   // Learning-focused
  DOCUMENT = 'DOCUMENT',         // Full synthesis
  DATA_EXTRACT = 'DATA_EXTRACT', // Structured data
}
```

### System Prompts

**SYSTEM_PROMPT_START:**
```
You are an expert research assistant specializing in synthesizing information from multiple documents. Your task is to generate a clear, concise, and accurate response to the user's query based *only* on the provided knowledge sources.
```

**SYSTEM_PROMPT_END:**
```
When generating the response, adhere to the following guidelines:

1. **Cite Sources - CRITICAL:** You MUST cite sources for every claim, fact, or piece of information you present. Use inline citations in the format [Source: Title] immediately after each statement.

2. **Stay Relevant:** Only use information explicitly stated in the provided knowledge sources above. Do not add external knowledge or make assumptions.

3. **Be Objective:** Present information accurately without bias. Avoid making assumptions or adding information not present in the sources.

4. **Structure Your Response:** Use clear headings, bullet points, and formatting to enhance readability, especially for comparisons or summaries.

5. **Citation Completeness:** Every paragraph should contain at least one citation. If you cannot cite a source for a statement, do not include that statement.
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GEMINI_API_KEY` | ✅ YES | Gemini API access |
| `VITE_FIREBASE_API_KEY` | ✅ YES | Firebase authentication |
| `VITE_FIREBASE_PROJECT_ID` | ✅ YES | Firebase project |

### Performance Optimizations

1. **flushSync for streaming:** Immediate DOM updates during streaming
2. **Auto-scroll:** Follows streaming content automatically
3. **Memoization:** `useMemo` for filtered resources and thinking messages
4. **Firestore indexing:** `orderBy('timestamp', 'desc')` queries

### Error Handling

**Authentication Errors:**
```typescript
if (!user) {
  return <LoginScreen onLogin={handleLogin} error={authError || error} />;
}
```

**API Errors:**
```typescript
try {
  await generateContent(...);
} catch (err) {
  setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
}
```

**Display:**
- Red error banner in response area
- Specific error messages from backend
- Graceful fallbacks

---

## Summary

The DimeNotes Dashboard is a sophisticated AI-powered research assistant that:

1. **Authenticates users** via Firebase Auth
2. **Loads knowledge** from Firestore on mount
3. **Accepts user queries** with template selection
4. **Constructs multi-part prompts** with system instructions + knowledge context + conversation history
5. **Streams responses** from Gemini API in real-time
6. **Renders markdown** with citations and formatting
7. **Saves outputs and history** to user-specific Firestore collections
8. **Maintains conversation threads** with context awareness
9. **Enforces strict citations** through system prompts
10. **Provides rich UX** with quick actions, text selection, simplification, and more

### Key Files

- [App.tsx](../src/App.tsx) - Main application logic (400 lines)
- [ResponseDisplay.tsx](../src/components/ResponseDisplay.tsx) - Response rendering (580 lines)
- [backendService.ts](../src/services/backendService.ts) - Backend logic (169 lines)
- [types.ts](../src/types.ts) - Type definitions (38 lines)

---

**For questions or modifications, refer to the source files linked throughout this document.**
