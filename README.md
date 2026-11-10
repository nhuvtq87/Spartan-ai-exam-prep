# Spartan Prep: AI-Powered Exam Assistant

[![Project Site](https://img.shields.io/badge/Google%20Site-Spartan%20Prep%20Hub-0055A2?style=for-the-badge&logo=google)](https://sites.google.com/view/spartan-exam-prep/home)

> **Live Project Site & Documentation:** [https://sites.google.com/view/spartan-exam-prep/home](https://sites.google.com/view/spartan-exam-prep/home)

**Spartan Prep** is a specialized academic assistant built for San José State University (SJSU) students to mitigate information overload and manual study inefficiencies during high-stakes exam periods. Utilizing a **Retrieval-Augmented Generation (RAG)** architecture, the application converts unstructured course materials—such as PDFs, PowerPoints (PPTX), Word documents (DOCX), and web articles—into structured, exam-aligned study assets.

---

## 🌐 Project Hub & Live Resources

* **Official Google Site:** [Spartan Exam Prep Project Hub](https://sites.google.com/view/spartan-exam-prep/home)
* **GitHub Repository:** [nhuvtq87/Spartan-ai-exam-prep](https://github.com/nhuvtq87/Spartan-ai-exam-prep)

---

## 🚀 Core Modules

* **Active Recall Flashcards:** Extracts high-yield definitions and formulas from uploaded text with interactive mastery tracking ("Mastered" vs. "Review").
* **Spartan Quiz Simulator:** Generates practice exams with configurable modes ("Study Mode" featuring professor-style rationale and "Timed Exam Mode").
* **Concept Simplifier:** Breaks down dense academic jargon using structured outputs (plain English explanation, contextual analogy, and 3 key takeaways) across selectable styles including *Plain English*, *Use Analogies*, *Explain Like I'm 5*, *Spartan Style*, and *Gaming Style*.
* **FAQ Matrix:** Acts as a centralized course research engine, extracting high-value Q&A pairs directly from lecture materials to establish an instant "Source of Truth."
* **Study Notes (`NotesView.tsx`):** Provides a persistent digital scratchpad for capturing personal lecture insights, mnemonics, and reflections alongside AI outputs.
* **Study Planner & Roadmap:** A fully editable task management dashboard with dynamic deadline calculation, urgency tags, and visual exam readiness tracking.
* **Study Timer:** A Pomodoro-style interval focus tool supporting standard and custom cycles with subject tracking.
* **AI Tutor:** A conversational chat assistant anchored strictly to uploaded course context to provide targeted academic support without hallucinating external information.

---

## 🛠️ Architecture & Technical Strategy

* **Primary Engine:** Google Gemini 3 Flash (via Google AI Studio) for low-latency (< 5s response time) processing.
* **Multi-Model Failover Redundancy:** Automatic secondary failover to OpenAI (GPT-4o) to guarantee continuous availability during peak traffic and campus exam seasons.
* **RAG Document Ingestion:** Stateless parsing supporting PDF, PPTX, DOCX, and URL imports, stripping web noise (headers/ads) and lecture metadata to isolate syllabus and lecture content.
* **Privacy & FERPA Compliance:** Stateless document handling without persistent PII, user tracking, or camera/microphone access requirements.

---

## 🎨 UI/UX Design

* **SJSU Spartan Identity:** Styled with official SJSU Royal Blue and Gold themes.
* **Glassmorphism UI:** Modern translucent containers and sidebars optimized for low cognitive strain.
* **Responsive Layout:** Designed for cross-device access across desktop and mobile workflows.

---

## 📈 Success Metrics & Benchmarks

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Relevance %** | > 95% | Tester review comparing AI study outputs to source lecture materials. |
| **Coverage %** | 100% | Verification that all essential concepts in source documents are captured. |
| **Study Efficiency** | 40% Reduction | User-reported reduction in time spent preparing study aids vs. manual workflows. |
| **Ease of Use** | < 3 Minutes | Average time required to complete the end-to-end "upload-to-study" walkthrough. |
| **System Latency** | < 5 Seconds | End-to-end response delivery duration for AI-generated assets. |

---

## 💻 Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS / Glassmorphism UI
* **AI Providers:** Google Gemini 3 Flash (Primary), OpenAI GPT-4o (Failover)
* **Document Parsing:** PDF.js, Mammoth.js, JSZip (client-side extraction)

---

## ⚙️ Getting Started

### Prerequisites

* Node.js (v18 or higher)
* Active API keys for Google Gemini and/or OpenAI

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nhuvtq87/Spartan-ai-exam-prep.git
   cd Spartan-ai-exam-prep
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the local development server:
   ```bash
   npm run dev
   ```

---

## 👥 Contributors & Acknowledgements

* **Nhu Vo** – Developer (Gemini modules, RAG pipeline, system integration, documentation)
* **Project Team:** Usaid Shaikh (PM), Ryann Clark (Assistant PM), Rohan Posanipally (Systems Architect), Brandon Ly (Developer)
* **Sponsors & Advising:** Sharon Qi, Sree Gandikoda, Amy Segeren, Ravi Pisupati, Ramamurti Sridar
* **Project Site:** [Spartan Exam Prep on Google Sites](https://sites.google.com/view/spartan-exam-prep/home)
