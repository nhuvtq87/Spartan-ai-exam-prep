# Spartan Prep: AI-Powered Exam Assistant

**Spartan Prep** is a specialized academic assistant built for San José State University (SJSU) students to mitigate information overload and manual study inefficiencies during high-stakes exam periods[cite: 9, 10, 28]. Utilizing a **Retrieval-Augmented Generation (RAG)** architecture, the application converts unstructured course materials—such as PDFs, PowerPoints (PPTX), Word documents (DOCX), and web articles—into structured, exam-aligned study assets[cite: 10, 28, 32, 33, 40].

---

## 🚀 Core Modules

* **Active Recall Flashcards:** Extracts high-yield definitions and formulas from uploaded text with interactive mastery tracking ("Mastered" vs. "Review")[cite: 37, 45].
* **Spartan Quiz Simulator:** Generates 10-question practice exams with configurable modes ("Study Mode" featuring professor-style rationale and "Timed Exam Mode")[cite: 28, 37, 46].
* **Concept Simplifier:** Breaks down dense academic jargon using structured outputs (plain English explanation, contextual analogy, and 3 key takeaways) across selectable styles including *Plain English*, *Use Analogies*, *Explain Like I'm 5*, *Spartan Style*, and *Gaming Style*[cite: 3, 23, 31, 32, 37].
* **FAQ Matrix:** Acts as a centralized course research engine, extracting high-value Q&A pairs directly from lecture materials to establish an instant "Source of Truth"[cite: 30, 31, 37].
* **Study Notes (`NotesView.tsx`):** Provides a persistent digital scratchpad for capturing personal lecture insights, mnemonics, and reflections alongside AI outputs[cite: 34, 35].
* **Study Planner & Roadmap:** A fully editable task management dashboard with dynamic deadline calculation, urgency tags, and visual exam readiness tracking[cite: 29, 35, 36, 37].
* **Study Timer:** A Pomodoro-style interval focus tool supporting standard and custom cycles with subject tracking[cite: 29, 38].
* **AI Tutor:** A conversational chat assistant anchored strictly to uploaded course context to provide targeted academic support without hallucinating external information[cite: 30, 38].

---

## 🛠️ Architecture & Technical Strategy

* **Primary Engine:** Google Gemini 3 Flash (via Google AI Studio) for low-latency (< 5s response time) processing[cite: 1, 10, 28].
* **Multi-Model Failover Redundancy:** Automatic secondary failover to OpenAI (GPT-4o) to guarantee continuous availability during peak traffic and campus exam seasons[cite: 1, 36, 37].
* **RAG Document Ingestion:** Stateless parsing supporting PDF, PPTX, DOCX, and URL imports, stripping web noise (headers/ads) and lecture metadata to isolate syllabus and lecture content[cite: 1, 32, 33, 40, 41].
* **Privacy & FERPA Compliance:** Stateless document handling without persistent PII, user tracking, or camera/microphone access requirements[cite: 1, 11, 36, 41].

---

## 🎨 UI/UX Design

* **SJSU Spartan Identity:** Styled with official SJSU Royal Blue and Gold themes[cite: 28].
* **Glassmorphism UI:** Modern translucent containers and sidebars optimized for low cognitive strain[cite: 28, 29].
* **Responsive Layout:** Designed for cross-device access across desktop and mobile workflows[cite: 10, 28].

---

## 📈 Success Metrics & Benchmarks

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Relevance %** | > 95% | Tester review comparing AI study outputs to source lecture materials[cite: 17, 38]. |
| **Coverage %** | 100% | Verification that all essential concepts in source documents are captured[cite: 17, 38]. |
| **Study Efficiency** | 40% Reduction | User-reported reduction in time spent preparing study aids vs. manual workflows[cite: 17, 38]. |
| **Ease of Use** | < 3 Minutes | Average time required to complete the end-to-end "upload-to-study" walkthrough[cite: 38]. |
| **System Latency** | < 5 Seconds | End-to-end response delivery duration for AI-generated assets[cite: 10, 17, 28]. |

---

## 💻 Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS / Glassmorphism UI
* **AI Providers:** Google Gemini 3 Flash (Primary), OpenAI GPT-4o (Failover)[cite: 1, 28, 36, 42]
* **Document Parsing:** PDF.js, Mammoth.js, JSZip (client-side extraction)[cite: 45]

---

## ⚙️ Getting Started

### Prerequisites

* Node.js (v18 or higher)
* Active API keys for Google Gemini and/or OpenAI[cite: 36, 37]

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/nhuvtq87/Spartan-ai-exam-prep.git](https://github.com/nhuvtq87/Spartan-ai-exam-prep.git)
   cd Spartan-ai-exam-prep
