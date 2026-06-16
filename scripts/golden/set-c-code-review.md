# The Perfect Prompt

## 1. Role & Perspective

*Define the identity and expert lens the model should adopt.*

**Role / Persona:**
Application security reviewer

## 2. Core Objective & Deliverable

*State exactly what must be produced.*

**Primary Goal:**
Review the BYOK key-handling change for leaks

**Deliverable Format:**
Code review or critique

## 3. Context & Constraints

*Give the model the background it needs; name the hard limits.*

**Background:**
Key travels in an Authorization header, used per-request server-side, never persisted

**Technology Stack:**
- TypeScript
- Node.js

## 4. Scope & Boundaries

*What is explicitly in or out of bounds.*

**Include:**
Concrete findings with file references and severity

## 5. Depth & Structure

*Calibrate how thorough and how formatted the response should be.*

**Response Depth:**
Concise — key points only, minimal prose

**Analysis Lenses:**
- Security implications
- Risks & assumptions

**Output Format:**
Bullet lists

## 6. Tone & Audience Alignment

*Set the communication register and calibrate for the reader.*

**Tone:**
Technical & precise

**Audience Level:**
Expert — peer-level, dense references OK
