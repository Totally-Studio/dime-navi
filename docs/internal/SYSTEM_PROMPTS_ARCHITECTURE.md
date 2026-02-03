# DimeNotes System Prompts & Architecture

## Overview

This document provides a comprehensive overview of the system prompts, prompt hierarchies, variables, and guardrails in the DimeNotes application.

---

## 1. Core System Prompts

The application uses a **two-part system instruction** defined in [src/constants.ts](../src/constants.ts):

### SYSTEM_PROMPT_START (Line 23)

```
You are an expert research assistant specializing in synthesizing information from multiple documents. Your task is to generate a clear, concise, and accurate response to the user's query based *only* on the provided knowledge sources.
```

### SYSTEM_PROMPT_END (Lines 25-38)

```
When generating the response, adhere to the following guidelines:

1.  **Cite Sources - CRITICAL:** You MUST cite sources for every claim, fact, or piece of information you present. Use inline citations in the format [Source: Title] immediately after each statement. For example:
    - "Wearable technologies are increasingly used in clinical trials [Source: Wearables in Cancer Clinical Trials]."
    - "Standardized measurement methodologies are needed [Source: Standardizing Physical Activity Measurement in COPD]."
    - When synthesizing information from multiple sources, cite all relevant sources: "Multiple studies emphasize the need for standardization [Source: Wearables in Cancer Clinical Trials, Source: Standardizing Physical Activity Measurement in COPD]."

2.  **Stay Relevant:** Only use information explicitly stated in the provided knowledge sources above. Do not add external knowledge or make assumptions.

3.  **Be Objective:** Present information accurately without bias. Avoid making assumptions or adding information not present in the sources.

4.  **Structure Your Response:** Use clear headings, bullet points, and formatting to enhance readability, especially for comparisons or summaries.

5.  **Citation Completeness:** Every paragraph should contain at least one citation. If you cannot cite a source for a statement, do not include that statement.
```

---

## 2. Prompt Hierarchy & Construction

The full prompt is constructed in [src/services/backendService.ts](../src/services/backendService.ts) (lines 30-44):

```typescript
// USER PROMPT (constructed)
const fullPrompt = `USER QUERY: "${query}"\n\nGENERATE RESPONSE USING TEMPLATE: "${template}"`;

// SYSTEM INSTRUCTION (assembled)
const systemInstruction = `${SYSTEM_PROMPT_START}\n\n${context}\n\n${SYSTEM_PROMPT_END}`;

// API CALL
await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: fullPrompt,          // User input + template
  config: {
    systemInstruction: systemInstruction,  // System rules + knowledge context
  },
});
```

### Hierarchy

1. **System Instruction** (highest authority - defines AI behavior)
   - `SYSTEM_PROMPT_START` (role definition)
   - `CONTEXT` (knowledge base content injected here)
   - `SYSTEM_PROMPT_END` (citation rules & guardrails)

2. **User Prompt** (user query + template selection)
   - `Query`: User's question
   - `Template`: Output format (SUMMARY, FAQ, etc.)

### Visual Flow

```
┌─────────────────────────────────────┐
│     SYSTEM INSTRUCTION              │
│  ┌───────────────────────────────┐  │
│  │  SYSTEM_PROMPT_START          │  │
│  │  (Role Definition)            │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  CONTEXT                      │  │
│  │  (Knowledge Base Injection)   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  SYSTEM_PROMPT_END            │  │
│  │  (Citation Rules & Guardrails)│  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│     USER PROMPT                     │
│  ┌───────────────────────────────┐  │
│  │  USER QUERY                   │  │
│  │  + TEMPLATE                   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
            ↓
      Gemini 2.5 Flash
```

---

## 3. Template System (Output Formats)

Defined in [src/types.ts](../src/types.ts) (lines 1-9):

```typescript
export enum Template {
  SUMMARY = 'SUMMARY',           // Synthesized summary
  TIMELINE = 'TIMELINE',         // Chronological view
  FAQ = 'FAQ',                   // Question & answer format
  COMPARISON = 'COMPARISON',     // Side-by-side comparison
  STUDY_GUIDE = 'STUDY_GUIDE',   // Learning-focused format
  DOCUMENT = 'DOCUMENT',         // Full document synthesis
  DATA_EXTRACT = 'DATA_EXTRACT', // Structured data extraction
}
```

### Template Descriptions

| Template | Purpose | Output Style |
|----------|---------|--------------|
| `SUMMARY` | Synthesized summary | Concise overview with key points |
| `TIMELINE` | Chronological view | Time-ordered sequence of events/findings |
| `FAQ` | Question & answer format | Q&A pairs addressing common queries |
| `COMPARISON` | Side-by-side comparison | Comparative analysis of sources |
| `STUDY_GUIDE` | Learning-focused format | Educational material with emphasis on comprehension |
| `DOCUMENT` | Full document synthesis | Comprehensive document combining sources |
| `DATA_EXTRACT` | Structured data extraction | Extracted data points in structured format |

---

## 4. Environment Variables & Configuration

### Gemini AI API

Location: [src/services/backendService.ts](../src/services/backendService.ts) (lines 11-15)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | ✅ **YES** | Gemini API access token |

**Model Used:** `gemini-2.5-flash` (streaming generation)

### Firebase Configuration

Location: [src/services/firebaseConfig.ts](../src/services/firebaseConfig.ts) (lines 7-13)

| Variable | Required | Default Value |
|----------|----------|---------------|
| `VITE_FIREBASE_API_KEY` | ✅ **YES** | (none) |
| `VITE_FIREBASE_AUTH_DOMAIN` | ⚠️ Optional | `dimenotesv2.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ⚠️ Optional | `dimenotesv2` |
| `VITE_FIREBASE_STORAGE_BUCKET` | ⚠️ Optional | `dimenotesv2.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ⚠️ Optional | `253073039735` |
| `VITE_FIREBASE_APP_ID` | ⚠️ Optional | `1:253073039735:web:3d99ae9f1c09dff11b8172` |

---

## 5. Security Guardrails

### Authentication Layer

Location: [src/services/backendService.ts](../src/services/backendService.ts) (lines 20-27)

```typescript
private _authenticate(user: User | null): string {
  if (!user) {
    throw new Error("Unauthorized: You must be logged in to perform this action.");
  }
  return user.uid;
}
```

### Operation-Level Security

| Operation | Authentication Required | Firestore Path |
|-----------|------------------------|----------------|
| Generate content | ✅ YES | N/A (API call) |
| Save outputs | ✅ YES | `/users/{uid}/outputs/` |
| Get outputs | ✅ YES | `/users/{uid}/outputs/` |
| Save chat history | ✅ YES | `/users/{uid}/chatHistory/` |
| Get chat history | ✅ YES | `/users/{uid}/chatHistory/` |
| Get knowledge | ⚠️ NO | `/knowledgeBase/` (public) |

### Data Isolation

- **User Outputs**: `/users/{uid}/outputs/` - Each user's generated outputs
- **Chat History**: `/users/{uid}/chatHistory/` - Each user's conversation logs
- **Knowledge Base**: `/knowledgeBase/` - Shared, read-only resource library

All user-specific data is isolated by Firebase UID, ensuring users can only access their own data.

---

## 6. Citation Enforcement (Critical Guardrail)

The system has **strict citation requirements** enforced at the prompt level:

### Citation Rules

1. ✅ **MUST** cite sources using `[Source: Title]` format
2. ✅ Every paragraph **requires at least one citation**
3. ✅ Multiple sources **must be cited** when synthesizing
4. ❌ **No statement without citation** allowed

### Citation Examples

**Single Source:**
```
Wearable technologies are increasingly used in clinical trials [Source: Wearables in Cancer Clinical Trials].
```

**Multiple Sources:**
```
Multiple studies emphasize the need for standardization [Source: Wearables in Cancer Clinical Trials, Source: Standardizing Physical Activity Measurement in COPD].
```

**Comparison with Multiple Sources:**
```
Patient-centric approaches are recommended [Source: Patient-Centric DHTs], while regulatory frameworks require validation [Source: Regulatory Guidelines for DHTs].
```

---

## 7. Knowledge Context Injection

The `context` parameter contains the knowledge base text that gets injected between `SYSTEM_PROMPT_START` and `SYSTEM_PROMPT_END`.

### Resource Structure

Each knowledge resource has the following metadata:

```typescript
interface Resource {
  id: number;
  title: string;
  description: string;
  summary: string;           // ← Actual content injected into context
  tags: string[];
  group: 'Patient-Centric' | 'Regulatory' | 'Clinical Trials';
}
```

### Context Construction Process

1. **User Selection** → User chooses which knowledge sources to include
2. **Resource Retrieval** → System fetches selected resources from Firestore
3. **Context Assembly** → Summaries are concatenated into context string
4. **Injection** → Context inserted between prompt start and end

### Example Context Format

```
## Resource 1: Defining Nocturnal Scratch

A consensus on a uniform definition of nocturnal scratch is lacking...

## Resource 2: Physical Activity in Cancer Cachexia

This resource focuses on the critical need for improved physical activity measurement...

## Resource 3: Wearables in Cancer Clinical Trials

The use of wearable and sensor technologies in cancer clinical trials is rapidly increasing...
```

---

## 8. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INPUT                           │
│  • Selects knowledge resources                              │
│  • Chooses template (SUMMARY, FAQ, etc.)                    │
│  • Enters query                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   App.tsx (React UI)                        │
│  • Manages state                                            │
│  • Handles user interactions                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              apiClient.ts (Client Layer)                    │
│  • Gets Firebase auth token                                 │
│  • Routes requests to backend                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│           backendService.ts (Backend Logic)                 │
│  • Authenticates user (_authenticate)                       │
│  • Constructs full prompt (query + template)                │
│  • Constructs system instruction (START + context + END)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Google GenAI (Gemini 2.5 Flash)                │
│  • Processes request with system instruction                │
│  • Generates response via streaming                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   STREAMING RESPONSE                        │
│  backendService.ts → onChunk callback                       │
│           ↓                                                 │
│  apiClient.ts → Passes chunks to React                      │
│           ↓                                                 │
│  App.tsx → Updates UI in real-time                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Additional Guardrails

### 9.1 Environment Validation

Location: [src/services/firebaseConfig.ts](../src/services/firebaseConfig.ts) (lines 15-17)

```typescript
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
  throw new Error("Firebase API key is not configured. Please replace 'YOUR_API_KEY' in firebaseConfig.ts with your actual Firebase API key.");
}
```

**Purpose:** Prevents application from running with placeholder or missing Firebase credentials.

### 9.2 Streaming Error Handling

Location: [src/services/backendService.ts](../src/services/backendService.ts) (lines 60-66)

```typescript
catch (error) {
  console.error("BACKEND: Error generating content:", error);
  if (error instanceof Error) {
    throw new Error(`An error occurred while communicating with the API: ${error.message}`);
  }
  throw new Error("An unknown error occurred on the backend.");
}
```

**Purpose:** Gracefully handles API failures and provides user-friendly error messages.

### 9.3 Firestore Timestamp Consistency

**Implementation:** Uses `serverTimestamp()` for all saved documents

**Purpose:** Ensures consistent timestamps across clients regardless of local clock differences.

### 9.4 No External Knowledge Allowed

**Enforcement:** System instruction explicitly states:

> "Only use information explicitly stated in the provided knowledge sources above. Do not add external knowledge or make assumptions."

**Purpose:** Prevents hallucination and ensures all responses are grounded in provided sources.

---

## 10. Summary Table

| Component | Description | Location |
|-----------|-------------|----------|
| **System Role** | Research assistant with strict citation requirements | [src/constants.ts](../src/constants.ts) |
| **Prompt Layers** | System Instruction → Context → User Input | [src/services/backendService.ts](../src/services/backendService.ts) |
| **Templates** | 7 output formats (SUMMARY, FAQ, TIMELINE, etc.) | [src/types.ts](../src/types.ts) |
| **Security** | Firebase Auth required for all user operations | [src/services/backendService.ts](../src/services/backendService.ts) |
| **Guardrails** | Citation enforcement, authentication, data isolation, error handling | Multiple files |
| **Environment Variables** | 7 variables (1 Gemini, 6 Firebase) | [src/services/firebaseConfig.ts](../src/services/firebaseConfig.ts) |
| **AI Model** | Gemini 2.5 Flash (streaming) | [src/services/backendService.ts](../src/services/backendService.ts) |

---

## 11. Key Principles

This architecture ensures that all AI-generated content is:

1. ✅ **Grounded in provided sources** - No external knowledge allowed
2. ✅ **Properly attributed** - Strict citation requirements enforced
3. ✅ **Access-controlled** - All user data isolated by Firebase UID
4. ✅ **Consistently formatted** - Templates provide structured outputs
5. ✅ **Error-resistant** - Comprehensive error handling throughout
6. ✅ **Audit-friendly** - All operations logged with console statements
7. ✅ **Scalable** - Streaming responses handle large outputs efficiently

---

## 12. File Reference Map

| Purpose | File Path |
|---------|-----------|
| System prompts | [src/constants.ts](../src/constants.ts) |
| Backend logic | [src/services/backendService.ts](../src/services/backendService.ts) |
| Client API layer | [src/services/apiClient.ts](../src/services/apiClient.ts) |
| Firebase config | [src/services/firebaseConfig.ts](../src/services/firebaseConfig.ts) |
| Type definitions | [src/types.ts](../src/types.ts) |
| Main app UI | [src/App.tsx](../src/App.tsx) |

---

**Document Version:** 1.0
**Last Updated:** 2025-11-03
**Maintainer:** DimeNotes Development Team
