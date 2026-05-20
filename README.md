# 🧠 Leetcode AI Mentor — Chrome Extension

An agentic AI-powered Chrome sidebar that helps you **think through** Coding problems step by step — instead of just handing you the answer.

Built as **Assignment 3: Agentic AI Chrome Plugin** using the Groq API (LLaMA 3.3 70B) with a full multi-step reasoning chain.

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

### 1. Clone or Download
```bash
git clone https://github.com/YOUR_USERNAME/coding-ai-mentor.git
```

### 2. Get a Free Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → Create API Key → Copy it

### 3. Load the Extension in Chrome
1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the project folder (`day2/`)

### 4. Open the Sidebar
1. Click the extension icon in the Chrome toolbar
2. The sidebar opens on the right
3. Paste your Groq API key → click **Save**

---

## 📁 Project Structure

```
day2/
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

## 📋 Assignment Requirements Checklist

- [x] Chrome Extension with Side Panel
- [x] Calls LLM multiple times (agentic loop — up to 10 iterations)
- [x] At least 3 custom tool functions
- [x] Shows full reasoning chain (tool calls + results + final answer)
- [x] Chat interface for follow-up questions
- [x] Groq API with OpenAI-compatible tool calling format

---

## 👨‍💻 Author

Made with ❤️ for Assignment 3 — Agentic AI  
Powered by [Groq](https://groq.com) · LLaMA 3.3 70B
