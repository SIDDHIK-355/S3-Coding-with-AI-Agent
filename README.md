<p align="center">
  <img src="assets/title.svg" alt="🧠 LeetCode AI Mentor — Your Agentic AI Coding Coach" width="100%">
</p>

<p align="center">
  <b>Think through LeetCode problems step by step — instead of just being handed the answer.</b>
</p>

<p align="center">
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Groq" src="https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-f55036">
  <img alt="Agentic" src="https://img.shields.io/badge/Agentic-3%20Custom%20Tools-8A2BE2">
</p>

---

A personal project exploring **agentic AI in the browser** — the Groq API (LLaMA 3.3 70B) drives a full multi-step reasoning chain with custom tool calling.

---

## 📸 Preview

| Main Panel | Reasoning Chain |
|---|---|
| Scan any coding problem and get a guided breakdown | View the full agent reasoning — tool calls, results, and final answer |

---

## ✨ Features

- **Agentic Loop** — The AI calls 3 custom tools before answering, just like a real agent
- **Reasoning Chain Viewer** — See every tool call and result the agent made (full transparency)
- **Progressive Answer Reveal** — Answer is split into locked steps so you think before peeking
- **Chat Assistant** — Ask follow-up questions below the analysis (ChatGPT-style)
- **VS Code Syntax Highlighting** — Code blocks with line numbers and dark theme colors
- **28 Languages Supported** — Python, Java, C++, JavaScript, Go, Rust, and more
- **Clickable Links** — Any URL in the response opens in a new tab
- **Collapsible Reasoning Steps** — Clean view by default, expand each step to inspect

---

## 🤖 How the Agent Works

The agent runs a **multi-step agentic loop** using 3 custom tools:

```
User clicks "Scan & Analyze Problem"
        ↓
Agent calls Tool 1: scan_problem()
  → Reads the LeetCode page (title, description, difficulty)
        ↓
Agent calls Tool 2: identify_patterns()
  → Detects algorithmic patterns (Sliding Window, DP, BFS, etc.)
  → Suggests data structures and thinking hints
        ↓
Agent calls Tool 3: analyze_complexity()
  → Returns time complexity, space complexity, and trade-offs
        ↓
Agent generates final structured answer
  → How to Think, Data Structure Choice, Pseudocode, Solution, Comparison Table
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome MV3 (Manifest Version 3) |
| AI Model | LLaMA 3.3 70B via Groq API |
| API Format | OpenAI-compatible (tool calling) |
| Highlighting | Custom JS tokenizer (VS Code Dark+ theme) |
| Storage | Chrome Storage API (saves API key + language) |

---

## 🚀 Installation

> [!NOTE]
> Setup takes about 3 minutes — all you need is **Google Chrome** and a **free Groq account**.

### <img src="assets/step1.svg" alt="Step 1 — Clone or download" height="40">

```bash
git clone https://github.com/SIDDHIK-355/S3-Coding-with-AI-Agent.git
```

### <img src="assets/step2.svg" alt="Step 2 — Grab a free Groq API key" height="40">

Head to [console.groq.com](https://console.groq.com) → sign up → **Create API Key** → copy it.

> [!TIP]
> A valid key starts with `gsk_` — if yours doesn't, you copied the wrong thing.

### <img src="assets/step3.svg" alt="Step 3 — Load the extension in Chrome" height="40">

Open <kbd>chrome://extensions</kbd> &nbsp;→&nbsp; toggle <kbd>Developer mode</kbd> on &nbsp;→&nbsp; click <kbd>Load unpacked</kbd> &nbsp;→&nbsp; select this folder (the one containing `manifest.json`).

The 🧠 **LeetCode AI Mentor** card should now appear in your extensions list.

### <img src="assets/step4.svg" alt="Step 4 — Open the sidebar & save your key" height="40">

Click the extension icon in the toolbar — the sidebar opens on the right. Paste your Groq key and hit <kbd>Save</kbd>.

> [!IMPORTANT]
> **Test drive:** open any LeetCode problem and hit 🔍 **Scan & Analyze** — the reasoning chain lights up in real time.

---

## 📁 Project Structure

```
Coding-AI-Agent-main/
├── manifest.json       # Chrome MV3 config
├── background.js       # Opens sidebar on extension click
├── sidepanel.html      # Sidebar UI layout
├── sidepanel.js        # All logic — agent loop, tools, rendering
├── styles.css          # Dark theme, VS Code colors, layout
└── README.md
```

---

## 🔧 The 3 Custom Tools

### `scan_problem()`
Injects a script into the active tab and extracts the problem title, description, difficulty, and URL using DOM selectors.

### `identify_patterns(args)`
Runs regex pattern matching against the problem text to detect:
- Algorithmic patterns (Sliding Window, Two Pointers, DP, BFS/DFS, etc.)
- Recommended data structures
- Thinking hints to guide the student

### `analyze_complexity(args)`
Looks up the time complexity, space complexity, and trade-off notes for a given approach from a built-in database of 17 common algorithms.

---

## 📋 What's Under the Hood

- [x] Chrome Extension with Side Panel
- [x] Calls LLM multiple times (agentic loop — up to 10 iterations)
- [x] At least 3 custom tool functions
- [x] Shows full reasoning chain (tool calls + results + final answer)
- [x] Chat interface for follow-up questions
- [x] Groq API with OpenAI-compatible tool calling format

---

## 👨‍💻 Author

Made with ❤️ by [Siddhi](https://github.com/SIDDHIK-355)  
Powered by [Groq](https://groq.com) · LLaMA 3.3 70B
