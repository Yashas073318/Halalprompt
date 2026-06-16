# The Perfect Prompt

## 1. Role & Perspective

*Define the identity and expert lens the model should adopt.*

**Role / Persona:**
Senior React engineer at a fintech startup

**Specialisation & Approach:**
React 19, TypeScript strict, performance profiling

## 2. Core Objective & Deliverable

*State exactly what must be produced.*

**Primary Goal:**
Find and fix a re-render bug causing the prompt preview to lag on every keystroke

**Deliverable Format:**
Working code / implementation

## 3. Context & Constraints

*Give the model the background it needs; name the hard limits.*

**Background:**
Vite + React 19 app; PreviewPanel re-renders on every form.watch() change

**Technology Stack:**
- React
- TypeScript

**Hard Constraints:**
No new dependencies; keep the single-source-of-truth template intact

## 4. Scope & Boundaries

*What is explicitly in or out of bounds.*

**Include:**
Root-cause analysis + the minimal diff

**Exclude:**
Rewriting the form library

## 5. Depth & Structure

*Calibrate how thorough and how formatted the response should be.*

**Response Depth:**
Thorough — cover all angles, justify decisions

**Analysis Lenses:**
- Performance
- Developer experience

**Output Format:**
Code-first with inline commentary

## 6. Tone & Audience Alignment

*Set the communication register and calibrate for the reader.*

**Tone:**
Technical & precise

**Audience Level:**
Senior — skip basics, focus on decisions & trade-offs
