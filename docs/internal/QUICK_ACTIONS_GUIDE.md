# DiMe Notebook Quick Actions Guide

This document explains how each quick action button works in simple, non-technical language.

---

## What Are Quick Actions?

Quick actions are pre-configured buttons that automatically generate specific types of content from your selected knowledge sources. When you click one, the system automatically creates a specialized query and generates a response - no typing required!

---

## How Quick Actions Work (General Process)

### Step 1: User Clicks a Quick Action Button
You click one of the template buttons (Summary, Timeline, FAQ, etc.)

### Step 2: System Collects Your Selected Sources
The system looks at which knowledge sources you've checked in the Knowledge Sources panel on the left.

### Step 3: System Builds Context
For each selected source, the system takes:
- The source title (e.g., "Defining Nocturnal Scratch")
- The complete description/content from that source

All of this information is formatted together like this:
```
## First Source Title
Full description text...

---

## Second Source Title
Full description text...

---

## Third Source Title
Full description text...
```

### Step 4: System Creates a Specialized Query
The system automatically creates a query specific to the quick action you clicked. For example:
- Summary button → "Generate a comprehensive summary of the selected knowledge sources."
- Timeline button → "Create a timeline of the key events and dates in the selected sources."

### Step 5: AI Instructions Are Added
The AI is given special instructions:
- Act as an expert research assistant
- Only use information from the provided sources
- Stay objective and accurate
- Format the response clearly with headings and bullet points

### Step 6: AI Generates Response
The Google Gemini AI reads all your selected sources and the query, then generates a response that follows the template format you requested.

### Step 7: Response Streams to You
You see the response being typed out in real-time, character by character, in the chat window.

---

## Individual Quick Action Details

### 1. 📄 SUMMARY

**What It Does:**
Creates a comprehensive overview that combines and synthesizes information from all your selected sources into one cohesive summary.

**The Query Sent to AI:**
"Generate a comprehensive summary of the selected knowledge sources."

**What the AI Does:**
- Reads through all selected sources
- Identifies main themes and key points
- Combines related information across sources
- Creates a unified summary that captures the big picture

**Best Used For:**
- Getting a quick overview of multiple documents
- Understanding common themes across sources
- Creating executive summaries
- Preparing for presentations or meetings

**Example Use Case:**
You have 5 sources about digital health technologies and want to understand the overall landscape without reading each one individually.

---

### 2. 📅 TIMELINE

**What It Does:**
Extracts dates, events, and chronological information from your sources and organizes them in order.

**The Query Sent to AI:**
"Create a timeline of the key events and dates in the selected sources."

**What the AI Does:**
- Scans all selected sources for dates and time references
- Identifies significant events and milestones
- Orders them chronologically from earliest to latest
- Presents them as a clear timeline

**Best Used For:**
- Understanding the history of a topic
- Seeing how things evolved over time
- Identifying key milestones
- Creating historical context

**Example Use Case:**
You have sources about regulatory changes and want to see how policies evolved from 2018 to 2024.

---

### 3. ❓ FAQ

**What It Does:**
Generates a list of frequently asked questions with answers based on the information in your selected sources.

**The Query Sent to AI:**
"Generate a list of frequently asked questions (FAQs) with answers based on the selected sources."

**What the AI Does:**
- Identifies common topics and themes in the sources
- Formulates natural questions people would ask about these topics
- Provides clear, concise answers using only information from the sources
- Organizes in Q&A format

**Best Used For:**
- Creating help documentation
- Preparing for presentations or Q&A sessions
- Onboarding new team members
- Creating study materials

**Example Use Case:**
You have sources about clinical trial protocols and want to anticipate questions stakeholders might ask.

---

### 4. 🔄 COMPARISON

**What It Does:**
Analyzes multiple sources to identify similarities, differences, and contrasting viewpoints.

**The Query Sent to AI:**
"Compare and contrast the key themes and findings across the selected knowledge sources."

**What the AI Does:**
- Identifies main themes in each source
- Finds areas where sources agree
- Highlights where sources differ or contradict
- Presents similarities and differences side-by-side

**Best Used For:**
- Analyzing different approaches to the same problem
- Understanding competing viewpoints
- Making informed decisions between options
- Identifying gaps in research

**Example Use Case:**
You have 3 sources about different measurement methodologies and want to understand the pros and cons of each approach.

---

### 5. 📚 STUDY GUIDE

**What It Does:**
Creates structured learning materials organized by topics and concepts from your sources.

**The Query Sent to AI:**
"Create a study guide covering the main topics from the selected sources."

**What the AI Does:**
- Identifies key concepts and learning objectives
- Organizes information into logical sections
- Highlights important definitions and terminology
- Creates a structured format for learning

**Best Used For:**
- Training materials
- Exam preparation
- Educational content creation
- Knowledge retention

**Example Use Case:**
You have sources about regulatory compliance and need to create training materials for new employees.

---

### 6. 📝 DOCUMENT

**What It Does:**
Synthesizes information into a formal, comprehensive document with proper structure and flow.

**The Query Sent to AI:**
"Synthesize the information from the selected sources into a detailed document."

**What the AI Does:**
- Organizes information logically with clear sections
- Creates a flowing narrative that connects ideas
- Includes proper headings and structure
- Produces a polished, professional document

**Best Used For:**
- Creating reports
- Writing white papers
- Preparing formal documentation
- Publishing content

**Example Use Case:**
You have multiple research sources and need to create a comprehensive report for stakeholders.

---

### 7. 📊 DATA EXTRACT

**What It Does:**
Pulls out specific data points, statistics, and structured information from your sources.

**The Query Sent to AI:**
"Extract key data points from the selected sources and present them in a structured format."

**What the AI Does:**
- Identifies numbers, statistics, and metrics
- Extracts specific data points and measurements
- Organizes data in tables or structured lists
- Highlights key findings

**Best Used For:**
- Creating data summaries
- Building comparison tables
- Extracting metrics for reports
- Quick reference sheets

**Example Use Case:**
You have sources with various statistics about patient outcomes and want all the numbers in one organized place.

---

## Important Notes

### What Gets Included:
✅ Only knowledge sources you have **checked** in the left panel
✅ The complete description/content of each selected source
✅ All information is sent to the AI for processing

### What Doesn't Get Included:
❌ Unchecked knowledge sources
❌ Information not in your selected sources
❌ Previous conversation history (each quick action starts fresh)

### Tips for Best Results:

1. **Select Relevant Sources**: Only check sources related to your topic
2. **Use Multiple Sources**: Quick actions work best with 2-5 sources
3. **Choose the Right Template**: Pick the format that matches your needs
4. **Review the Output**: Always verify the response meets your expectations
5. **Use Simplify Button**: If the response is too technical, click "Simplify" for plain language

---

## Technical Details (Optional Reading)

### The AI Model:
- Uses Google Gemini 2.5 Flash
- Streams responses in real-time
- Processes up to hundreds of thousands of tokens

### The Prompt Structure:
Every quick action sends two parts to the AI:

**Part 1 - User Query:**
```
USER QUERY: "[specific query for this template]"
GENERATE RESPONSE USING TEMPLATE: "[TEMPLATE_NAME]"
```

**Part 2 - System Instructions:**
```
You are an expert research assistant specializing in synthesizing
information from multiple documents. Your task is to generate a
clear, concise, and accurate response to the user's query based
*only* on the provided knowledge sources.

[All selected source content inserted here]

When generating the response, adhere to the following guidelines:
1. Cite Sources: [coming soon]
2. Stay Relevant: Only use information from the provided text.
3. Be Objective: Avoid making assumptions or adding information
   not present in the sources.
4. Structure Your Response: Use clear headings, bullet points,
   and formatting to enhance readability.
```

### Data Flow:
1. User clicks button → `handleQuickAction()` in App.tsx
2. Query is created → autoQueryMap lookup
3. Sources are collected → filtered by selectedResources
4. Context is built → formatted with titles and descriptions
5. Request sent → apiClient.generateContent()
6. Backend processes → backendService.generate()
7. AI called → Google Gemini API
8. Response streams → onChunk callback
9. Display updates → character by character with flushSync
10. Complete → saved to chat history

---

## Troubleshooting

### "Please select at least one knowledge source"
**Problem**: No sources are checked
**Solution**: Check at least one source in the Knowledge Sources panel

### Response seems incomplete
**Problem**: Not enough context in selected sources
**Solution**: Add more relevant sources to your selection

### Response is too technical
**Problem**: AI using industry jargon
**Solution**: Click the "Simplify" button to regenerate in plain language

### Response takes a long time
**Problem**: Processing many sources or generating long content
**Solution**: This is normal - you'll see thinking status messages while AI works

---

## Support

For questions or issues:
- Check the Firebase Console: https://console.firebase.google.com/project/dimenotesv2/overview
- Review the application logs in browser developer tools
- Contact the development team

---

**Last Updated**: 2025-01-XX
**Version**: 1.0
**Application**: DiMe Notebook v2
