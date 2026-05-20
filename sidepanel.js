const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const LANGUAGES = [
  'Python', 'Python3', 'Java', 'C++', 'C', 'C#',
  'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin',
  'Swift', 'Ruby', 'PHP', 'Scala', 'Dart', 'R',
  'Haskell', 'Erlang', 'Elixir', 'Perl', 'Lua',
  'Bash', 'SQL', 'MATLAB', 'Racket', 'OCaml', 'F#'
];

let selectedLanguage = 'Python';

// ─── Tool Declarations (OpenAI format for Groq) ────────────────────────────────
const TOOL_DECLARATIONS = [
  {
    type: 'function',
    function: {
      name: 'scan_problem',
      description: 'Reads the current browser tab and extracts the LeetCode problem title, description, difficulty and constraints. Always call this first.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'identify_patterns',
      description: 'Analyzes the problem text and identifies algorithmic patterns (e.g. sliding window, DP, BFS), best data structures, and thinking hints.',
      parameters: {
        type: 'object',
        properties: {
          problem_text: {
            type: 'string',
            description: 'Full problem title + description combined'
          }
        },
        required: ['problem_text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_complexity',
      description: 'Returns time complexity, space complexity, and trade-off notes for a given algorithmic approach.',
      parameters: {
        type: 'object',
        properties: {
          approach: {
            type: 'string',
            description: 'Approach name e.g. "hash map", "two pointers", "dynamic programming"'
          }
        },
        required: ['approach']
      }
    }
  }
];

// ─── Tool 1: scan_problem ──────────────────────────────────────────────────────
async function scanProblem() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('leetcode.com/problems')) {
      return { found: false, error: 'Please open a LeetCode problem page first.' };
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title =
          document.querySelector('[data-cy="question-title"]')?.innerText?.trim() ||
          document.querySelector('.text-title-large a')?.innerText?.trim() ||
          document.title.split(' -')[0].trim();

        const descEl =
          document.querySelector('[data-track-load="description_content"]') ||
          document.querySelector('[class*="description_content"]') ||
          document.querySelector('.question-content__JfgR');

        const description =
          descEl?.innerText?.trim().substring(0, 3000) ||
          document.querySelector('meta[name="description"]')?.content ||
          'Description not extracted';

        const difficulty =
          ['Easy', 'Medium', 'Hard'].find(d =>
            document.querySelector(`[class*="${d.toLowerCase()}"]`)?.innerText?.includes(d)
          ) || 'Unknown';

        return { found: true, title, description, difficulty, url: window.location.href };
      }
    });
    return results[0]?.result || { found: false, error: 'Could not read page content' };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

// ─── Tool 2: identify_patterns ────────────────────────────────────────────────
function identifyPatterns(args) {
  const text = (args.problem_text || '').toLowerCase();
  const patterns = [];
  const ds = new Set();
  const hints = [];

  const rules = [
    { re: /subarray|substring|window|consecutive|contiguous/, pattern: 'Sliding Window', ds: ['Array', 'Hash Map'], hint: 'Expand right pointer, shrink left when condition breaks' },
    { re: /two sum|pair.*sum|complement|sorted.*array|target.*sum/, pattern: 'Two Pointers', ds: ['Sorted Array'], hint: 'Left and right pointers moving toward each other' },
    { re: /\btree\b|root|leaf|binary tree|bst|node.*child/, pattern: 'Tree Traversal (DFS/BFS)', ds: ['Stack (DFS)', 'Queue (BFS)', 'Recursion'], hint: 'Think recursively: what should a single node do?' },
    { re: /graph|path|network|connected|island|visited|neighbor/, pattern: 'Graph Traversal (DFS/BFS)', ds: ['Adjacency List', 'Visited Set', 'Queue'], hint: 'Model connections as edges, track visited to avoid cycles' },
    { re: /maximum|minimum|longest|shortest.*path|ways|count.*ways|how many/, pattern: 'Dynamic Programming', ds: ['DP Array (1D or 2D)', 'Memo Hash Map'], hint: 'Define dp[i] clearly. Do subproblems overlap? Cache them.' },
    { re: /sorted.*array|binary search|rotated|find.*position/, pattern: 'Binary Search', ds: ['Sorted Array'], hint: 'Each step eliminate HALF — left or right?' },
    { re: /bracket|parenthes|valid.*string|matching|next greater|monoton/, pattern: 'Stack', ds: ['Stack'], hint: 'LIFO — push when open, pop when close/compare' },
    { re: /top.*k|kth largest|kth smallest|k.*frequent|priority/, pattern: 'Heap / Priority Queue', ds: ['Min-Heap', 'Max-Heap'], hint: 'Heap gives you min/max in O(log k) — perfect for top-K' },
    { re: /anagram|permutation|frequency|count.*char|group.*string/, pattern: 'Hash Map / Frequency Count', ds: ['Hash Map', 'Array[26] for chars'], hint: 'Count occurrences — what patterns emerge?' },
    { re: /interval|merge.*interval|overlap|meeting|schedule/, pattern: 'Interval Merging', ds: ['Sorted Intervals'], hint: 'Sort by start, greedily merge if overlap' },
    { re: /all.*subset|all.*combination|backtrack|generate all possible/, pattern: 'Backtracking', ds: ['Recursion', 'Path Array'], hint: 'Try each option → recurse → undo (backtrack)' },
    { re: /\bbit\b|xor|power.*2|bitwise/, pattern: 'Bit Manipulation', ds: ['Integer bits'], hint: 'XOR cancels pairs, AND checks bits' },
    { re: /linked list|next.*pointer|reverse.*list|cycle/, pattern: 'Linked List (Fast/Slow Pointers)', ds: ['prev, curr, next pointers'], hint: 'Draw it out! Two pointers — fast and slow' },
    { re: /matrix|grid|2d.*array|island/, pattern: 'Matrix / Grid Traversal', ds: ['2D Array', 'Directions Array'], hint: 'DFS or BFS from each cell. Track visited.' },
    { re: /prefix.*sum|range.*query|subarray.*sum/, pattern: 'Prefix Sum', ds: ['Prefix Sum Array'], hint: 'prefix[i] = sum of first i elements. Range sum = O(1).' }
  ];

  for (const rule of rules) {
    if (rule.re.test(text)) {
      patterns.push(rule.pattern);
      rule.ds.forEach(d => ds.add(d));
      hints.push(rule.hint);
    }
  }

  if (patterns.length === 0) {
    patterns.push('Array / Hash Map (start here)');
    ds.add('Array'); ds.add('Hash Map');
    hints.push('Write brute force first. Then ask: what repeated work can be cached?');
  }

  return {
    detected_patterns: patterns.slice(0, 3),
    suggested_data_structures: [...ds].slice(0, 5),
    thinking_hints: hints.slice(0, 3),
    primary_approach: patterns[0]
  };
}

// ─── Tool 3: analyze_complexity ───────────────────────────────────────────────
function analyzeComplexity(args) {
  const approach = (args.approach || '').toLowerCase();
  const db = {
    'brute force':         { time: 'O(n²)',        space: 'O(1)',   note: 'Too slow for n > 10⁴. Good starting point.' },
    'hash map':            { time: 'O(n)',          space: 'O(n)',   note: 'O(1) lookup — trade memory for speed.' },
    'two pointers':        { time: 'O(n)',          space: 'O(1)',   note: 'Optimal — fast AND memory efficient.' },
    'sliding window':      { time: 'O(n)',          space: 'O(k)',   note: 'k = unique elements in window.' },
    'binary search':       { time: 'O(log n)',      space: 'O(1)',   note: 'Lightning fast but needs sorted data.' },
    'dfs':                 { time: 'O(V+E)',        space: 'O(V)',   note: 'V = vertices, E = edges.' },
    'bfs':                 { time: 'O(V+E)',        space: 'O(V)',   note: 'Best for shortest path in unweighted graphs.' },
    'dynamic programming': { time: 'O(n²)',         space: 'O(n)',   note: 'Varies — define your state carefully.' },
    'memoization':         { time: 'O(n)',          space: 'O(n)',   note: 'Top-down DP with caching.' },
    'sorting':             { time: 'O(n log n)',    space: 'O(1)',   note: 'Often unlocks two-pointer or binary search.' },
    'heap':                { time: 'O(n log k)',    space: 'O(k)',   note: 'k = heap size. Great for top-K.' },
    'backtracking':        { time: 'O(2ⁿ) worst',  space: 'O(n)',   note: 'Exponential — prune aggressively.' },
    'greedy':              { time: 'O(n log n)',    space: 'O(1)',   note: 'Fast, but must prove correctness.' },
    'trie':                { time: 'O(m)',          space: 'O(m·n)', note: 'm = word length. Great for prefix search.' },
    'union find':          { time: 'O(α(n))≈O(1)', space: 'O(n)',   note: 'Near-constant per op with path compression.' },
    'monotonic stack':     { time: 'O(n)',          space: 'O(n)',   note: 'Each element pushed and popped exactly once.' },
    'prefix sum':          { time: 'O(n) build',    space: 'O(n)',   note: 'O(1) range queries after O(n) setup.' }
  };
  const key = Object.keys(db).find(k => approach.includes(k) || k.split(' ').some(w => approach.startsWith(w)));
  const info = key ? db[key] : { time: 'Count nested loops', space: 'Count extra arrays/maps', note: 'Analyze manually' };
  return { approach: args.approach, time_complexity: info.time, space_complexity: info.space, trade_off: info.note };
}

// ─── Execute Tool ──────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case 'scan_problem':        return await scanProblem();
    case 'identify_patterns':   return identifyPatterns(args);
    case 'analyze_complexity':  return analyzeComplexity(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ─── Agentic Loop (Groq / OpenAI format) ──────────────────────────────────────
async function runAgent(apiKey, onStep) {
  const systemPrompt = `You are a coding problem-solving MENTOR. Guide students to THINK — do not just hand them the answer.

STEP 1: Call scan_problem() to read the problem.
STEP 2: Call identify_patterns() with the full problem text.
STEP 3: Call analyze_complexity() for the primary pattern from step 2.

After all 3 tool calls, respond in EXACTLY this structure:

## 🎯 How to Think About This
What do we have (inputs/outputs)? Key observation that unlocks the problem.

## 🗂️ Data Structure Choice
What to use and precisely WHY.

## 📝 Pseudocode
Step-by-step plain English logic. No real code yet.

## 💻 Solution in ${selectedLanguage}
Clean, commented working solution.

## ⚡ Approaches Comparison
| Approach | Time | Space | Notes |
Show brute force vs optimal.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Help me solve this coding problem. Language: ${selectedLanguage}. Use all 3 tools first, then give the full breakdown.` }
  ];

  let iter = 0;
  while (iter < 10) {
    iter++;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        tools: TOOL_DECLARATIONS,
        tool_choice: 'auto'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const message = data.choices[0].message;
    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || '{}');

        onStep({ type: 'tool_call', tool: name, args, iter });
        const result = await executeTool(name, args);
        onStep({ type: 'tool_result', tool: name, result, iter });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    } else {
      const finalText = message.content || 'No response';
      onStep({ type: 'final', text: finalText, iter });
      return finalText;
    }
  }
  return 'Agent reached max steps.';
}

// ─── Syntax Highlighter ───────────────────────────────────────────────────────
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const KEYWORDS = {
  python:     new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print len range list dict set int str float bool'.split(' ')),
  python3:    new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print len range list dict set int str float bool'.split(' ')),
  java:       new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new null package private protected public return short static super switch synchronized this throw throws transient try var void volatile while true false'.split(' ')),
  'c++':      new Set('alignas auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern false float for friend goto if inline int long mutable namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while'.split(' ')),
  javascript: new Set('async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield'.split(' ')),
  typescript: new Set('abstract any as async await boolean break case catch class const continue declare default delete do else enum export extends false finally for from function if implements import in instanceof interface is keyof let module namespace never new null number object of private protected public readonly return static string super switch symbol this throw true try type typeof undefined unique unknown var void while with yield'.split(' ')),
  go:         new Set('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(' ')),
  rust:       new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type union unsafe use where while'.split(' ')),
  kotlin:     new Set('abstract actual as break by catch class companion const constructor continue crossinline data do dynamic else enum expect external false final finally for fun get if import in infix inline inner interface internal is it lateinit noinline null object open operator out override package private protected public reified return sealed set super suspend tailrec this throw true try typealias typeof val var vararg when where while'.split(' ')),
  swift:      new Set('as associatedtype break case catch class continue convenience default defer deinit do dynamic else enum extension fallthrough false fileprivate final for func get guard if import in init inout internal is lazy let mutating nil nonmutating open operator optional override package precedencegroup private protocol public repeat required rethrows return self Self set some static struct subscript super switch throw throws true try type typealias unowned var weak where while'.split(' ')),
};

function highlightCode(code, lang) {
  lang = (lang || '').toLowerCase();
  const kws = KEYWORDS[lang] || KEYWORDS['javascript'];
  let result = '';
  let i = 0;

  while (i < code.length) {
    const ch = code[i];

    // Single-line comment # (Python, Ruby, Bash)
    if (['python','python3','ruby','bash','r'].includes(lang) && ch === '#') {
      const end = code.indexOf('\n', i);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end);
      result += `<span class="c-comment">${esc(slice)}</span>`;
      i += slice.length; continue;
    }
    // Single-line comment //
    if (ch === '/' && code[i+1] === '/') {
      const end = code.indexOf('\n', i);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end);
      result += `<span class="c-comment">${esc(slice)}</span>`;
      i += slice.length; continue;
    }
    // Multi-line comment /* */
    if (ch === '/' && code[i+1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      result += `<span class="c-comment">${esc(slice)}</span>`;
      i += slice.length; continue;
    }
    // Triple-quoted string Python
    if ((lang==='python'||lang==='python3') && (code.slice(i,i+3)==='"""'||code.slice(i,i+3)==="'''")) {
      const q = code.slice(i, i+3);
      const end = code.indexOf(q, i+3);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end+3);
      result += `<span class="c-string">${esc(slice)}</span>`;
      i += slice.length; continue;
    }
    // String " or '
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) { if (code[j]==='\\') j++; j++; }
      const slice = code.slice(i, j+1);
      result += `<span class="c-string">${esc(slice)}</span>`;
      i += slice.length; continue;
    }
    // Number
    if (/\d/.test(ch) && (i===0 || /\W/.test(code[i-1]))) {
      let j = i;
      while (j < code.length && /[\d.xXa-fA-F]/.test(code[j])) j++;
      result += `<span class="c-number">${esc(code.slice(i,j))}</span>`;
      i = j; continue;
    }
    // Identifier / keyword / function
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      const after = code.slice(j).trimStart();
      if (kws.has(word)) {
        result += `<span class="c-keyword">${esc(word)}</span>`;
      } else if (after.startsWith('(')) {
        result += `<span class="c-function">${esc(word)}</span>`;
      } else if (/^[A-Z]/.test(word)) {
        result += `<span class="c-class">${esc(word)}</span>`;
      } else {
        result += esc(word);
      }
      i = j; continue;
    }
    result += esc(ch); i++;
  }
  return result;
}

function buildCodeBlock(lang, rawCode) {
  const lines = highlightCode(rawCode, lang).split('\n');
  const numbered = lines.map((line, idx) =>
    `<div class="code-line"><span class="ln">${idx+1}</span><span class="lc">${line}</span></div>`
  ).join('');
  const id = 'cb_' + Math.random().toString(36).slice(2);
  return `<div class="code-block">
    <div class="code-header"><span class="code-lang">${lang||'code'}</span><button class="copy-btn" data-id="${id}">Copy</button></div>
    <pre id="${id}" class="code-pre"><code>${numbered}</code></pre>
  </div>`;
}

// ─── Progressive Step Renderer ────────────────────────────────────────────────
function renderProgressive(text) {
  const parts = text.split(/(?=^## )/m).filter(p => p.trim());
  if (parts.length <= 1) return renderMarkdown(text);

  const uid = 'pg' + Date.now();
  let html = '';

  parts.forEach((part, i) => {
    const titleMatch = part.match(/^## (.+)/);
    const title = titleMatch ? titleMatch[1].replace(/[🎯🗂️📝💻⚡]/gu, '').trim() : `Step ${i + 1}`;
    const content = renderMarkdown(part);
    const boxId = `${uid}_${i}`;

    if (i === 0) {
      html += `<div class="prog-box prog-open">${content}</div>`;
    } else {
      html += `
        <div class="prog-box prog-closed" id="${boxId}">
          <div class="prog-header" data-box="${boxId}">
            <span class="prog-icon">🔒</span>
            <span class="prog-title">${escHtml(title)}</span>
            <span class="prog-hint">click to reveal</span>
            <span class="prog-arrow">▶</span>
          </div>
          <div class="prog-content" style="display:none">${content}</div>
        </div>`;
    }
  });

  return html;
}

// Event delegation for progressive boxes (CSP safe — no inline onclick)
document.addEventListener('click', e => {
  const header = e.target.closest('.prog-header');
  if (!header) return;
  const box     = document.getElementById(header.getAttribute('data-box'));
  const content = box.querySelector('.prog-content');
  const icon    = box.querySelector('.prog-icon');
  const hint    = box.querySelector('.prog-hint');
  const arrow   = box.querySelector('.prog-arrow');
  const isOpen  = content.style.display !== 'none';

  content.style.display = isOpen ? 'none' : 'block';
  icon.textContent  = isOpen ? '🔒' : '🔓';
  hint.textContent  = isOpen ? 'click to reveal' : 'click to hide';
  arrow.textContent = isOpen ? '▶' : '▼';
  box.className = isOpen ? 'prog-box prog-closed' : 'prog-box prog-revealed';
});

// ─── Markdown Renderer ─────────────────────────────────────────────────────────
function renderMarkdown(text) {
  let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    buildCodeBlock(lang, code.trim())
  );
  html = html
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#58a6ff">$1</a>')
    .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\|(.+)\|$/gm, row => {
      if (/^[\s|:-]+$/.test(row)) return '';
      const cells = row.split('|').filter(c => c.trim());
      return `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
    })
    .replace(/((<tr>[\s\S]*?<\/tr>\n?)+)/g, '<table>$1</table>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<div>${html}</div>`;
}

function escHtml(str) { return esc(str); }

// Copy buttons — event delegation (no inline onclick, avoids CSP issues)
document.addEventListener('click', e => {
  if (e.target.classList.contains('copy-btn')) {
    const id  = e.target.getAttribute('data-id');
    const pre = document.getElementById(id);
    if (pre) navigator.clipboard.writeText(pre.innerText);
    e.target.textContent = 'Copied!';
    setTimeout(() => (e.target.textContent = 'Copy'), 2000);
  }
});

// ─── UI Functions ──────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = `status-msg ${type ? 'status-' + type : ''}`;
  el.style.display = msg ? 'block' : 'none';
}

function formatStepBody(step) {
  if (step.type === 'tool_call') {
    if (step.tool === 'scan_problem') return 'Reading the active browser tab...';
    const entries = Object.entries(step.args || {});
    if (!entries.length) return '(no arguments)';
    return entries.map(([k, v]) => {
      const val = typeof v === 'string' && v.length > 120 ? v.substring(0, 120) + '...' : v;
      return `${k}: ${val}`;
    }).join('\n');
  }
  if (step.type === 'tool_result') {
    const r = step.result;
    if (step.tool === 'scan_problem') {
      if (!r.found) return `Error: ${r.error}`;
      const desc = (r.description || '').substring(0, 500) + ((r.description || '').length > 500 ? '...' : '');
      return `Title:       ${r.title}\nDifficulty:  ${r.difficulty}\nURL:         ${r.url}\n\nDescription:\n${desc}`;
    }
    if (step.tool === 'identify_patterns') {
      const lines = [
        `Patterns:    ${(r.detected_patterns || []).join(' · ')}`,
        `Structures:  ${(r.suggested_data_structures || []).join(' · ')}`,
        `Approach:    ${r.primary_approach}`,
        '',
        'Hints:',
        ...(r.thinking_hints || []).map(h => `  → ${h}`)
      ];
      return lines.join('\n');
    }
    if (step.tool === 'analyze_complexity') {
      return `Approach:    ${r.approach}\nTime:        ${r.time_complexity}\nSpace:       ${r.space_complexity}\nTrade-off:   ${r.trade_off}`;
    }
    return JSON.stringify(r, null, 2);
  }
  return step.text || '';
}

function addReasoningStep(step) {
  const container = document.getElementById('reasoningContent');
  container.querySelector('.reasoning-empty')?.remove();

  const wrap = document.createElement('div');
  wrap.className = `reasoning-step step-type-${step.type}`;

  let header = '';
  if (step.type === 'tool_call') {
    header = `🔧 TOOL CALL · ${step.tool}() · iter ${step.iter}`;
  } else if (step.type === 'tool_result') {
    header = `✅ RESULT · ${step.tool}`;
  } else {
    header = `💬 FINAL ANSWER · iter ${step.iter}`;
  }
  const body = formatStepBody(step);

  const stepBody = document.createElement('div');
  stepBody.className = 'step-body';
  stepBody.textContent = body;
  stepBody.style.display = 'none';

  const stepHeader = document.createElement('div');
  stepHeader.className = 'step-header';
  stepHeader.innerHTML = `<span class="step-arrow">▶</span> ${escHtml(header)}`;
  stepHeader.addEventListener('click', () => {
    const isOpen = stepBody.style.display !== 'none';
    stepBody.style.display = isOpen ? 'none' : 'block';
    stepHeader.querySelector('.step-arrow').textContent = isOpen ? '▶' : '▼';
  });

  wrap.appendChild(stepHeader);
  wrap.appendChild(stepBody);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function toggleReasoning() {
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('reasoningView').style.display = 'flex';
}

// ─── Chat Full View ────────────────────────────────────────────────────────────
function renderChatViewMessages() {
  const container = document.getElementById('chatViewMessages');
  container.innerHTML = '';
  if (chatHistory.length === 0) {
    container.innerHTML = '<div class="chat-view-empty">Ask anything about the problem below...</div>';
    return;
  }
  chatHistory.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`;
    div.innerHTML = msg.role === 'user' ? escHtml(msg.content) : renderMarkdown(msg.content);
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function openChatView() {
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('chatView').style.display = 'flex';
  renderChatViewMessages();
  document.getElementById('chatViewInput').focus();
}

function closeChatView() {
  document.getElementById('chatView').style.display = 'none';
  document.getElementById('mainView').style.display = 'flex';
}

async function sendChatFromView() {
  const apiKey  = document.getElementById('apiKey').value.trim();
  const input   = document.getElementById('chatViewInput');
  const message = input.value.trim();

  if (!message) return;
  if (!apiKey)  { alert('Please enter your Groq API Key first.'); return; }

  input.value = '';
  input.style.height = 'auto';

  const btn       = document.getElementById('chatViewBtn');
  const container = document.getElementById('chatViewMessages');
  btn.disabled    = true;

  container.querySelector('.chat-view-empty')?.remove();

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user-bubble';
  userBubble.textContent = message;
  container.appendChild(userBubble);

  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble ai-bubble';
  typingBubble.textContent = '⏳ thinking...';
  container.appendChild(typingBubble);
  container.scrollTop = container.scrollHeight;

  chatHistory.push({ role: 'user', content: message });

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: `You are a helpful coding mentor. Answer questions about data structures, algorithms, and programming clearly. Use examples. Preferred language: ${selectedLanguage}.` },
          ...chatHistory
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data  = await res.json();
    const reply = data.choices[0].message.content;
    chatHistory.push({ role: 'assistant', content: reply });

    typingBubble.className = 'chat-bubble ai-bubble';
    typingBubble.innerHTML = renderMarkdown(reply);
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    typingBubble.className = 'chat-bubble ai-bubble error-bubble';
    typingBubble.textContent = '❌ ' + err.message;
  }

  btn.disabled = false;
}

// ─── Language Dropdown ─────────────────────────────────────────────────────────
function initLangDropdown() {
  const input    = document.getElementById('langInput');
  const dropdown = document.getElementById('langDropdown');

  function render(filter = '') {
    dropdown.innerHTML = '';
    LANGUAGES.filter(l => l.toLowerCase().includes(filter.toLowerCase())).forEach(lang => {
      const opt = document.createElement('div');
      opt.className = 'lang-option' + (lang === selectedLanguage ? ' selected' : '');
      opt.textContent = lang;
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        selectedLanguage = lang;
        input.value = lang;
        dropdown.style.display = 'none';
        chrome.storage.local.set({ selectedLanguage: lang });
      });
      dropdown.appendChild(opt);
    });
  }

  input.addEventListener('focus', () => { render(input.value); dropdown.style.display = 'block'; });
  input.addEventListener('input', () => { render(input.value); dropdown.style.display = 'block'; });
  input.addEventListener('blur',  () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
}

// ─── Main Scan Action ──────────────────────────────────────────────────────────
async function scan() {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) { alert('Please enter your Groq API Key first.'); return; }

  const btn = document.getElementById('scanBtn');
  btn.disabled = true;

  document.getElementById('reasoningContent').innerHTML = '<div class="reasoning-empty">Running agent...</div>';
  document.getElementById('responseArea').style.display = 'none';
  document.getElementById('placeholder').style.display = 'none';
  setStatus('🔍 Scanning problem and running agent...', 'thinking');

  chrome.storage.local.set({ groqKey: apiKey });

  try {
    const answer = await runAgent(apiKey, addReasoningStep);
    setStatus('');
    const responseEl = document.getElementById('responseArea');
    responseEl.innerHTML = renderProgressive(answer);
    responseEl.style.display = 'block';
  } catch (err) {
    setStatus('❌ ' + err.message, 'error');
    document.getElementById('placeholder').style.display = 'block';
  }

  btn.disabled = false;
}

// ─── Chat History (shared with Chat Full View) ────────────────────────────────
const chatHistory = [];

// ─── Save Key ─────────────────────────────────────────────────────────────────
function saveKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) { alert('Please paste your API key first.'); return; }
  chrome.storage.local.set({ groqKey: apiKey });
  const btn = document.getElementById('saveKeyBtn');
  btn.textContent = 'Saved ✓';
  btn.style.background = '#238636';
  setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; }, 2000);
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLangDropdown();

  chrome.storage.local.get(['groqKey', 'selectedLanguage'], data => {
    if (data.groqKey) document.getElementById('apiKey').value = data.groqKey;
    if (data.selectedLanguage) {
      selectedLanguage = data.selectedLanguage;
      document.getElementById('langInput').value = data.selectedLanguage;
    }
  });

  document.getElementById('scanBtn').addEventListener('click', scan);
  document.getElementById('saveKeyBtn').addEventListener('click', saveKey);
  document.getElementById('toggleBtn').addEventListener('click', toggleReasoning);
  document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('reasoningView').style.display = 'none';
    document.getElementById('mainView').style.display = 'flex';
  });
  document.getElementById('openChatBtn').addEventListener('click', openChatView);
  document.getElementById('chatBackBtn').addEventListener('click', closeChatView);
  document.getElementById('chatViewBtn').addEventListener('click', sendChatFromView);

  const chatViewInputEl = document.getElementById('chatViewInput');
  chatViewInputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatFromView(); }
  });
  chatViewInputEl.addEventListener('input', () => {
    chatViewInputEl.style.height = 'auto';
    chatViewInputEl.style.height = Math.min(chatViewInputEl.scrollHeight, 120) + 'px';
  });

});
