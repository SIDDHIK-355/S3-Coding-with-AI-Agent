// ─── Gemini API ────────────────────────────────────────────────────────────────
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SYSTEM_PROMPT =
  'You are a helpful Indian property rental assistant. ' +
  'Help users find prices for PGs, rooms, 1BHK, 2BHK, and 3BHK flats in Indian cities. ' +
  'Always use the tools provided to get accurate data — do not guess prices from memory. ' +
  'Use geocode_location first to confirm the location, then get_property_prices for price data, ' +
  'then calculate_total_cost to show the full cost breakdown. Be concise and friendly.';

// ─── Tool Declarations (sent to Gemini) ────────────────────────────────────────
const TOOL_DECLARATIONS = [
  {
    name: 'geocode_location',
    description:
      'Validates a location name and returns geographic details. Always call this first to confirm the area exists.',
    parameters: {
      type: 'OBJECT',
      properties: {
        location_name: {
          type: 'STRING',
          description: "Full location string e.g. 'Koramangala Bangalore' or 'Bandra Mumbai'"
        }
      },
      required: ['location_name']
    }
  },
  {
    name: 'get_property_prices',
    description:
      'Returns rental price data (min, max, average) for a given city, area, and property type.',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: "City name e.g. 'Bangalore', 'Mumbai', 'Pune'" },
        area: { type: 'STRING', description: "Area/locality e.g. 'Koramangala', 'Bandra'" },
        property_type: {
          type: 'STRING',
          description: "One of: 'PG', 'room', '1BHK', '2BHK', '3BHK'"
        }
      },
      required: ['city', 'area', 'property_type']
    }
  },
  {
    name: 'calculate_total_cost',
    description:
      'Calculates total move-in cost and yearly expense given a monthly rent, security deposit, and brokerage.',
    parameters: {
      type: 'OBJECT',
      properties: {
        monthly_rent: { type: 'NUMBER', description: 'Monthly rent in INR' },
        security_deposit_months: {
          type: 'NUMBER',
          description: 'Security deposit expressed in months of rent (usually 2–3)'
        },
        brokerage_months: {
          type: 'NUMBER',
          description: 'Brokerage fee in months of rent (0 if no broker)'
        }
      },
      required: ['monthly_rent', 'security_deposit_months', 'brokerage_months']
    }
  }
];

// ─── Price Database (curated realistic Indian rental data) ─────────────────────
const PRICES = {
  bangalore: {
    koramangala:       { PG: [8000,15000],  room: [7000,12000], '1BHK': [18000,28000], '2BHK': [28000,45000], '3BHK': [42000,65000] },
    indiranagar:       { PG: [9000,16000],  room: [8000,14000], '1BHK': [20000,32000], '2BHK': [32000,50000], '3BHK': [48000,75000] },
    'hsr layout':      { PG: [7000,13000],  room: [6000,11000], '1BHK': [15000,25000], '2BHK': [25000,40000], '3BHK': [38000,60000] },
    'btm layout':      { PG: [6500,12000],  room: [5500,10000], '1BHK': [14000,22000], '2BHK': [22000,35000], '3BHK': [33000,52000] },
    whitefield:        { PG: [6000,12000],  room: [5000,10000], '1BHK': [13000,22000], '2BHK': [22000,35000], '3BHK': [32000,50000] },
    marathahalli:      { PG: [5500,11000],  room: [4500,9000],  '1BHK': [12000,20000], '2BHK': [20000,32000], '3BHK': [30000,48000] },
    'electronic city': { PG: [5000,10000],  room: [4000,8500],  '1BHK': [10000,18000], '2BHK': [18000,28000], '3BHK': [26000,42000] },
    'jp nagar':        { PG: [6000,11000],  room: [5000,9500],  '1BHK': [13000,21000], '2BHK': [21000,34000], '3BHK': [32000,50000] },
    default:           { PG: [6000,12000],  room: [5000,10000], '1BHK': [14000,22000], '2BHK': [22000,35000], '3BHK': [33000,52000] }
  },
  mumbai: {
    bandra:            { PG: [12000,22000], room: [10000,18000], '1BHK': [35000,60000], '2BHK': [55000,100000], '3BHK': [85000,160000] },
    andheri:           { PG: [10000,18000], room: [8000,15000],  '1BHK': [25000,45000], '2BHK': [40000,75000],  '3BHK': [60000,120000] },
    powai:             { PG: [9000,16000],  room: [7500,13000],  '1BHK': [22000,38000], '2BHK': [35000,65000],  '3BHK': [52000,100000] },
    thane:             { PG: [7000,13000],  room: [5500,11000],  '1BHK': [15000,25000], '2BHK': [25000,42000],  '3BHK': [38000,65000]  },
    'lower parel':     { PG: [13000,24000], room: [11000,20000], '1BHK': [38000,65000], '2BHK': [60000,110000], '3BHK': [90000,170000] },
    borivali:          { PG: [7000,13000],  room: [6000,11000],  '1BHK': [16000,27000], '2BHK': [26000,44000],  '3BHK': [40000,68000]  },
    default:           { PG: [10000,18000], room: [8000,15000],  '1BHK': [25000,45000], '2BHK': [40000,75000],  '3BHK': [60000,120000] }
  },
  delhi: {
    'connaught place': { PG: [10000,18000], room: [8500,15000],  '1BHK': [25000,45000], '2BHK': [40000,75000], '3BHK': [60000,110000] },
    'lajpat nagar':    { PG: [8000,14000],  room: [6500,12000],  '1BHK': [18000,32000], '2BHK': [30000,52000], '3BHK': [45000,80000]  },
    dwarka:            { PG: [6000,11000],  room: [5000,9000],   '1BHK': [12000,20000], '2BHK': [20000,35000], '3BHK': [30000,52000]  },
    'rohini':          { PG: [6000,11000],  room: [5000,9000],   '1BHK': [12000,20000], '2BHK': [20000,34000], '3BHK': [30000,50000]  },
    default:           { PG: [7000,13000],  room: [6000,11000],  '1BHK': [15000,28000], '2BHK': [25000,45000], '3BHK': [38000,68000]  }
  },
  gurgaon: {
    'cyber city':      { PG: [8000,15000],  room: [7000,13000],  '1BHK': [18000,30000], '2BHK': [28000,50000], '3BHK': [42000,75000] },
    'golf course':     { PG: [9000,16000],  room: [8000,14000],  '1BHK': [20000,35000], '2BHK': [32000,60000], '3BHK': [50000,90000] },
    sohna:             { PG: [5000,9000],   room: [4000,8000],   '1BHK': [10000,16000], '2BHK': [16000,28000], '3BHK': [24000,42000] },
    default:           { PG: [7000,13000],  room: [6000,11000],  '1BHK': [15000,25000], '2BHK': [24000,40000], '3BHK': [36000,60000] }
  },
  noida: {
    'sector 62':       { PG: [6000,11000],  room: [5000,9500],  '1BHK': [12000,20000], '2BHK': [20000,32000], '3BHK': [30000,48000] },
    'sector 18':       { PG: [7000,13000],  room: [6000,11000], '1BHK': [14000,24000], '2BHK': [22000,38000], '3BHK': [34000,56000] },
    default:           { PG: [5500,10000],  room: [4500,9000],  '1BHK': [11000,18000], '2BHK': [18000,30000], '3BHK': [27000,45000] }
  },
  hyderabad: {
    'hitech city':     { PG: [7000,14000],  room: [6000,12000], '1BHK': [15000,25000], '2BHK': [24000,40000], '3BHK': [36000,60000] },
    gachibowli:        { PG: [7000,13000],  room: [5500,11000], '1BHK': [14000,24000], '2BHK': [22000,38000], '3BHK': [33000,56000] },
    'banjara hills':   { PG: [9000,16000],  room: [7500,13000], '1BHK': [18000,32000], '2BHK': [28000,50000], '3BHK': [42000,75000] },
    madhapur:          { PG: [7000,13000],  room: [6000,11000], '1BHK': [14000,23000], '2BHK': [22000,37000], '3BHK': [33000,55000] },
    default:           { PG: [6000,12000],  room: [5000,10000], '1BHK': [13000,22000], '2BHK': [20000,35000], '3BHK': [30000,52000] }
  },
  pune: {
    hinjewadi:         { PG: [6000,11000],  room: [5000,9500],  '1BHK': [12000,20000], '2BHK': [20000,32000], '3BHK': [30000,48000] },
    kothrud:           { PG: [6500,12000],  room: [5500,10000], '1BHK': [13000,22000], '2BHK': [22000,36000], '3BHK': [33000,54000] },
    wakad:             { PG: [6000,11000],  room: [5000,9000],  '1BHK': [12000,20000], '2BHK': [20000,33000], '3BHK': [30000,50000] },
    'koregaon park':   { PG: [8000,15000],  room: [7000,13000], '1BHK': [16000,28000], '2BHK': [26000,45000], '3BHK': [40000,68000] },
    baner:             { PG: [6500,12000],  room: [5500,10000], '1BHK': [13000,21000], '2BHK': [21000,35000], '3BHK': [32000,52000] },
    default:           { PG: [5500,10000],  room: [4500,8500],  '1BHK': [11000,19000], '2BHK': [19000,32000], '3BHK': [28000,48000] }
  },
  chennai: {
    't nagar':         { PG: [7000,13000],  room: [6000,11000], '1BHK': [14000,24000], '2BHK': [22000,38000], '3BHK': [33000,57000] },
    'anna nagar':      { PG: [7000,13000],  room: [6000,11000], '1BHK': [15000,26000], '2BHK': [24000,42000], '3BHK': [36000,62000] },
    omr:               { PG: [6000,11000],  room: [5000,9500],  '1BHK': [12000,20000], '2BHK': [18000,32000], '3BHK': [27000,48000] },
    velachery:         { PG: [6000,11000],  room: [5000,9000],  '1BHK': [12000,19000], '2BHK': [18000,30000], '3BHK': [27000,46000] },
    default:           { PG: [6000,11000],  room: [5000,9000],  '1BHK': [12000,20000], '2BHK': [20000,34000], '3BHK': [30000,50000] }
  }
};

// ─── Tool Implementations ──────────────────────────────────────────────────────
async function geocodeLocation(args) {
  try {
    const q = encodeURIComponent(args.location_name + ', India');
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`;
    const resp = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'PropertyPriceAgent/1.0' }
    });
    const data = await resp.json();
    if (data.length > 0) {
      return {
        found: true,
        display_name: data[0].display_name,
        type: data[0].type,
        lat: parseFloat(data[0].lat).toFixed(4),
        lng: parseFloat(data[0].lon).toFixed(4)
      };
    }
    return { found: false, message: 'Location not found in India' };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

function getPropertyPrices(args) {
  const city  = args.city.toLowerCase().trim();
  const area  = args.area.toLowerCase().trim();
  const ptype = args.property_type.trim();

  // Normalise type
  const typeMap = { pg: 'PG', room: 'room', '1bhk': '1BHK', '2bhk': '2BHK', '3bhk': '3BHK' };
  const key = typeMap[ptype.toLowerCase()] || '1BHK';

  const cityData = PRICES[city] || PRICES['bangalore'];
  // Fuzzy area match
  const areaKey = Object.keys(cityData).find(k => area.includes(k) || k.includes(area)) || 'default';
  const areaData = cityData[areaKey];
  const [minP, maxP] = areaData[key] || areaData['1BHK'];
  const avg = Math.round((minP + maxP) / 2);

  return {
    city: args.city,
    area: args.area,
    property_type: key,
    min_rent: minP,
    max_rent: maxP,
    average_rent: avg,
    currency: 'INR',
    note: `Market data for ${key} in ${args.area}, ${args.city}`
  };
}

function calculateTotalCost(args) {
  const rent      = args.monthly_rent;
  const deposit   = Math.round(rent * args.security_deposit_months);
  const brokerage = Math.round(rent * args.brokerage_months);
  const moveIn    = rent + deposit + brokerage;
  const annual    = rent * 12;

  return {
    monthly_rent:       `₹${rent.toLocaleString('en-IN')}`,
    security_deposit:   `₹${deposit.toLocaleString('en-IN')} (${args.security_deposit_months} months)`,
    brokerage:          `₹${brokerage.toLocaleString('en-IN')} (${args.brokerage_months} months)`,
    total_move_in_cost: `₹${moveIn.toLocaleString('en-IN')}`,
    annual_expense:     `₹${annual.toLocaleString('en-IN')}`,
    tip: deposit === 0 ? 'No deposit — likely a PG with all-inclusive rent' :
         'Negotiate 2 months deposit if the landlord asks for more'
  };
}

async function executeTool(name, args) {
  switch (name) {
    case 'geocode_location':    return await geocodeLocation(args);
    case 'get_property_prices': return getPropertyPrices(args);
    case 'calculate_total_cost': return calculateTotalCost(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ─── Agentic Loop ──────────────────────────────────────────────────────────────
async function runAgent(userMessage, apiKey, onStep) {
  const conversation = [
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  let iter = 0;
  const MAX = 10;

  while (iter < MAX) {
    iter++;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: conversation,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }]
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const parts = data.candidates[0].content.parts;

    conversation.push({ role: 'model', parts });

    const funcPart = parts.find(p => p.functionCall);
    const textPart = parts.find(p => p.text);

    if (funcPart) {
      const { name, args } = funcPart.functionCall;

      onStep({ type: 'tool_call', tool: name, args, iter });

      const result = await executeTool(name, args);

      onStep({ type: 'tool_result', tool: name, result, iter });

      conversation.push({
        role: 'user',
        parts: [{ functionResponse: { name, response: result } }]
      });

    } else {
      const finalText = textPart?.text || 'No response';
      onStep({ type: 'final', text: finalText, iter });
      return finalText;
    }
  }

  return 'Reached maximum steps.';
}

// ─── UI Helpers ────────────────────────────────────────────────────────────────
function addMessage(role, text) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addThinking() {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'message thinking';
  div.innerHTML = '<span class="dot-anim">thinking</span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addReasoningStep(step) {
  const container = document.getElementById('reasoningContent');

  // Remove empty placeholder
  const empty = container.querySelector('.reasoning-empty');
  if (empty) empty.remove();

  const wrap = document.createElement('div');
  wrap.className = `reasoning-step step-type-${step.type}`;

  let headerText = '';
  let bodyText   = '';

  if (step.type === 'tool_call') {
    headerText = `🔧 TOOL CALL  ·  ${step.tool}  ·  iter ${step.iter}`;
    bodyText   = JSON.stringify(step.args, null, 2);
  } else if (step.type === 'tool_result') {
    headerText = `✅ RESULT  ·  ${step.tool}`;
    bodyText   = JSON.stringify(step.result, null, 2);
  } else {
    headerText = `💬 FINAL ANSWER  ·  iter ${step.iter}`;
    bodyText   = step.text;
  }

  wrap.innerHTML =
    `<div class="step-header">${headerText}</div>` +
    `<div class="step-body">${escHtml(bodyText)}</div>`;

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function clearReasoning() {
  const c = document.getElementById('reasoningContent');
  c.innerHTML = '<div class="reasoning-empty">Agent reasoning steps will appear here...</div>';
}

function fillInput(text) {
  document.getElementById('userInput').value = text;
  document.getElementById('userInput').focus();
}

// ─── Send Message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const input   = document.getElementById('userInput');
  const keyInput = document.getElementById('apiKey');
  const sendBtn  = document.getElementById('sendBtn');

  const text   = input.value.trim();
  const apiKey = keyInput.value.trim();

  if (!text)   { alert('Please type a question.'); return; }
  if (!apiKey) { alert('Please enter your Gemini API Key.'); return; }

  // Save key
  chrome.storage.local.set({ geminiKey: apiKey });

  input.value = '';
  sendBtn.disabled = true;
  clearReasoning();

  addMessage('user', text);
  const thinkingEl = addThinking();

  try {
    const answer = await runAgent(text, apiKey, (step) => {
      addReasoningStep(step);
    });
    thinkingEl.remove();
    addMessage('assistant', answer);
  } catch (err) {
    thinkingEl.remove();
    addMessage('assistant', '❌ Error: ' + err.message);
  }

  sendBtn.disabled = false;
}

// ─── Restore saved key & wire up reasoning toggle ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('geminiKey', (data) => {
    if (data.geminiKey) document.getElementById('apiKey').value = data.geminiKey;
  });

  document.getElementById('showReasoning').addEventListener('change', (e) => {
    document.getElementById('reasoningPanel').style.display =
      e.target.checked ? 'flex' : 'none';
  });
});
