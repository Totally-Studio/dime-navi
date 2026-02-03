# DimeNotes - Knowledge Base

**Document Version:** 1.0
**Last Updated:** 2025-11-18

---

## Table of Contents

- [Overview](#overview)
- [What's in the Knowledge Base?](#whats-in-the-knowledge-base)
- [Resource Structure](#resource-structure)
- [How Resources Are Used](#how-resources-are-used)
- [Selection Strategies](#selection-strategies)
- [Filtering and Search](#filtering-and-search)
- [Viewing Resources](#viewing-resources)
- [How AI Uses Knowledge](#how-ai-uses-knowledge)
- [Managing Selections](#managing-selections)
- [Knowledge Base Updates](#knowledge-base-updates)
- [Best Use Cases](#best-use-cases)
- [Quality Assurance](#quality-assurance)
- [Common Questions](#common-questions)
- [Summary](#summary)

---

## Overview

The Knowledge Base is the foundation of DimeNotes. It contains curated documents about digital health technology that the AI uses to generate responses.

---

## What's in the Knowledge Base?

Curated collection of documents about digital health technology, organized into three categories:

### Patient-Centric

Focus on patient engagement, user experience, and patient outcomes.

**Topics Include:**
- Patient engagement strategies
- User experience design for health apps
- Patient-reported outcomes (PROs)
- Patient-centric DHT development
- User interface best practices
- Accessibility considerations
- Patient compliance and adherence

**Use When:**
- Designing patient-facing features
- Understanding user needs
- Developing engagement strategies
- Creating patient-centric solutions

### Regulatory

Focus on FDA guidelines, compliance requirements, and regulatory frameworks.

**Topics Include:**
- FDA digital health guidelines
- Regulatory submission requirements
- Compliance frameworks
- Validation and verification standards
- Clinical evidence requirements
- Post-market surveillance
- International regulatory considerations

**Use When:**
- Preparing regulatory submissions
- Understanding compliance requirements
- Planning validation studies
- Navigating FDA processes

### Clinical Trials

Focus on trial design, endpoints, and validation methodologies.

**Topics Include:**
- Clinical trial design methodologies
- Endpoint definitions and selection
- Validation standards
- Measurement methodologies
- Statistical considerations
- Real-world evidence
- Decentralized clinical trials

**Use When:**
- Designing clinical studies
- Selecting appropriate endpoints
- Planning validation approaches
- Understanding trial requirements

---

## Resource Structure

Each knowledge resource contains:

### Metadata
- **Title** - Resource name
- **Description** - Full content of the resource
- **Summary** - Condensed version for quick reference
- **Tags** - Keywords for categorization
- **Group** - Category (Patient-Centric, Regulatory, Clinical Trials)

### Content Format

Resources are stored as text documents with:
- Clear structure (headings, sections)
- Key findings and recommendations
- References to original sources
- Context and background information

---

## How Resources Are Used

### Selection Process

1. **You Select Sources**
   - Check boxes for resources to include
   - Filter by category if needed
   - Use "Select All" or "Deselect All"

2. **System Extracts Content**
   - Gets full description text from each selected resource
   - Formats as individual sections
   - Combines into knowledge context

3. **Context Injection**
   - Knowledge context inserted into AI prompt
   - Positioned between system instructions
   - Forms the basis for AI responses

### Example Context Format

```
## Resource 1: Defining Nocturnal Scratch

A consensus on a uniform definition of nocturnal scratch is lacking...
[Full resource content]

---

## Resource 2: Physical Activity in Cancer Cachexia

This resource focuses on the critical need for improved physical activity
measurement...
[Full resource content]

---

## Resource 3: Wearables in Cancer Clinical Trials

The use of wearable and sensor technologies in cancer clinical trials is
rapidly increasing...
[Full resource content]
```

---

## Selection Strategies

### Selection Approaches

| Strategy | Approach | Example Use |
|----------|----------|-------------|
| **Topic-Focused** | Select all resources related to specific topic | All regulatory resources for FDA submission |
| **Question-Specific** | Choose only resources that directly address your question | Endpoint-related resources for endpoint questions |
| **Comprehensive** | Select broad range for general overview | All categories for understanding DHT landscape |
| **Comparative** | Select resources representing different perspectives | Patient-Centric + Regulatory for balanced view |

### Best Practices

| Practice | Guidelines |
|----------|-----------|
| **Fewer, Relevant Sources Better Than Many** | 3-5 highly relevant sources often better than 15 tangential ones; AI can provide more focused synthesis; responses are clearer and more actionable |
| **Match Sources to Question** | Regulatory question → Regulatory sources; Design question → Patient-Centric sources; Validation question → Clinical Trials sources |
| **Use Filtering** | Filter by category to narrow options; easier to find relevant resources; reduces clutter in selection |
| **Review Source Descriptions** | Click resource to view full content; ensure it contains information you need; deselect if not relevant |

---

## Filtering and Search

### Category Filter

**Available Filters:**
- Patient-Centric
- Regulatory
- Clinical Trials
- All (default)

**How to Use:**
- Click category button at top of Knowledge Base
- List shows only resources in that category
- Selection persists (previously checked sources remain checked)

### Visual Indicators

**Selection Status:**
- ✅ Checked = Included in AI context
- ☐ Unchecked = Not included

**Selection Count:**
- Displayed at bottom of Knowledge Base
- Shows how many sources currently selected
- Updates in real-time

---

## Viewing Resources

### Full Resource View

**How to View:**
- Click on any resource title
- Opens modal overlay with full content

**What You See:**
- Complete resource description
- Full text as it appears in AI context
- Structured formatting

**Why View:**
- Verify resource relevance
- Understand content before selection
- Review details cited in responses

---

## How AI Uses Knowledge

### Citation System

Every claim in AI responses must cite a source from your selected resources.

**Citation Format:** `[Source: Resource Title]`

**Example:**
```
Wearable devices must demonstrate clinical validity [Source: FDA
Digital Health Guidelines]. The validation process typically requires
both laboratory and real-world studies [Source: Clinical Trial Standards].
```

### Synthesis Process

The AI:
1. Reads all selected resource content
2. Identifies relevant information for your query
3. Synthesizes across multiple sources
4. Cites each claim to specific source
5. Formats according to selected template

### Limitations

**AI Cannot:**

| Restriction | Reason |
|-------------|--------|
| Add outside information | Only uses selected sources |
| Use general knowledge | Not in provided sources |
| Make assumptions | Beyond source content |
| Provide uncited claims | Every statement must cite source |

**Result:**

| Outcome | Benefit |
|---------|---------|
| Traceable information | All claims link to sources |
| No hallucinations | Grounded in evidence |
| Transparent sourcing | Clear attribution |
| Verifiable claims | Can check original sources |

---

## Managing Selections

### Quick Actions

**Select All:**
- Checks all visible resources
- Respects current filter (only selects filtered resources)
- Use for comprehensive analysis

**Deselect All:**
- Unchecks all visible resources
- Respects current filter (only deselects filtered resources)
- Use to start fresh selection

### Selection Persistence

| Aspect | Details |
|--------|---------|
| **Persists** | Within a chat session, across multiple queries, until you manually change them |
| **Does NOT Persist** | Across browser sessions, when you refresh the page, after logout |
| **Default on Load** | All sources selected, no filter applied, ready to use immediately |

---

## Knowledge Base Updates

| Aspect | Details |
|--------|---------|
| **How Resources Are Added** | Curated by administrators: new research findings, updated guidelines, emerging best practices, community contributions |
| **When You'll See Updates** | After administrator adds them, on next page refresh, immediately available for selection |

---

## Best Use Cases

| Use Case | Recommended Sources | Rationale |
|----------|-------------------|-----------|
| **Research Questions** | Broad range across categories | Comprehensive understanding of topic |
| **Regulatory Submissions** | Regulatory + relevant Clinical Trials resources | Understand requirements and evidence needs |
| **Product Design** | Patient-Centric + specific use case resources | User-focused design decisions |
| **Clinical Study Design** | Clinical Trials + relevant Regulatory resources | Methodologically sound and compliant studies |
| **Stakeholder Communication** | Resources matching stakeholder interests | Tailored, relevant information |

---

## Quality Assurance

| Aspect | Details |
|--------|---------|
| **Resource Quality** | Curated by domain experts, based on authoritative sources, regularly reviewed and updated, categorized accurately |
| **Source Verification** | Click citation in AI response → Opens source resource → Review original content → Confirm AI interpretation |

---

## Common Questions

**Q: How many sources should I select?**
A: 3-7 highly relevant sources typically optimal. Quality over quantity.

**Q: Can I mix categories?**
A: Yes! Cross-category selections often provide valuable perspectives.

**Q: What if I don't find relevant sources?**
A: Contact administrators to request new resource additions.

**Q: Do more sources = better responses?**
A: Not necessarily. Relevant sources > number of sources.

**Q: Can I save selection sets?**
A: Not currently. Select sources for each query session.

**Q: How often are sources updated?**
A: Resources are reviewed and updated regularly by administrators.

---

## Summary

The Knowledge Base is curated, categorized, and quality-controlled to ensure:

| Quality Aspect | Implementation |
|----------------|----------------|
| **Authoritative Information** | Based on trusted sources |
| **Organized Access** | Three clear categories |
| **Flexible Selection** | Choose what's relevant |
| **Transparent Usage** | See exactly what AI uses |
| **Verifiable Claims** | Click citations to verify |
| **Quality Responses** | Good sources equal good answers |

**Remember:** The quality of AI responses depends on selecting relevant knowledge sources. Take time to choose sources that directly address your question.
