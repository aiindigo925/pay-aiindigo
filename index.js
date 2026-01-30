import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Config
const PRICE_CENTS = 1; // $0.01 per query
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '0xA6Bba2453673196ae22fb249C7eA9FA118a87150';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://pay.openfacilitator.io';

app.use(cors());
app.use(express.json());

// Tools data (simplified - in production, fetch from main site or DB)
const tools = [
  { id: '1', name: 'ChatGPT', category: 'chatbots', description: 'OpenAI conversational AI', url: 'https://chat.openai.com' },
  { id: '2', name: 'Claude', category: 'chatbots', description: 'Anthropic thoughtful AI', url: 'https://claude.ai' },
  { id: '3', name: 'Midjourney', category: 'image', description: 'AI image generation', url: 'https://midjourney.com' },
  { id: '4', name: 'Cursor', category: 'coding', description: 'AI-powered code editor', url: 'https://cursor.sh' },
  { id: '5', name: 'v0', category: 'coding', description: 'AI UI generator by Vercel', url: 'https://v0.dev' },
];

// Landing page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Indigo API — x402 Payments</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: #888; font-size: 1.2rem; margin-bottom: 2rem; }
    .price-badge {
      display: inline-block;
      background: #00d4aa;
      color: #000;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-weight: bold;
      margin-bottom: 2rem;
    }
    .section { background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 1rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.3rem; margin-bottom: 1rem; color: #00d4aa; }
    pre {
      background: #000;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      font-size: 0.9rem;
    }
    code { color: #00d4aa; }
    .endpoint { color: #fff; background: #333; padding: 0.3rem 0.6rem; border-radius: 0.3rem; font-family: monospace; }
    ul { padding-left: 1.5rem; }
    li { margin: 0.5rem 0; }
    a { color: #00d4aa; }
    .footer { margin-top: 3rem; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 AI Indigo API</h1>
    <p class="subtitle">880+ AI tools. Search programmatically. Pay with x402.</p>
    
    <div class="price-badge">$0.01 USDC per query</div>
    
    <div class="section">
      <h2>How it works</h2>
      <ol>
        <li>Send a GET request to <span class="endpoint">/api/tools?q=your+query</span></li>
        <li>Receive HTTP 402 with payment requirements</li>
        <li>Pay via x402 (USDC on Base)</li>
        <li>Get your search results</li>
      </ol>
    </div>
    
    <div class="section">
      <h2>Endpoints</h2>
      <ul>
        <li><span class="endpoint">GET /</span> — This page</li>
        <li><span class="endpoint">GET /api/tools?q=query</span> — Search tools (x402)</li>
        <li><span class="endpoint">GET /api/categories</span> — List categories (free)</li>
        <li><span class="endpoint">GET /health</span> — Health check (free)</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>Example</h2>
      <pre><code>curl https://pay.aiindigo.com/api/tools?q=chatbot

# Returns 402 with x-payment header
# Pay via x402, then retry to get results</code></pre>
    </div>
    
    <div class="section">
      <h2>For AI Agents</h2>
      <p>This API is designed for autonomous AI agents. No API keys needed — just pay and query.</p>
      <p style="margin-top: 1rem;">Built on <a href="https://x402.org" target="_blank">x402 protocol</a> using <a href="https://openfacilitator.io" target="_blank">OpenFacilitator</a>.</p>
    </div>
    
    <div class="footer">
      <p>🌐 <a href="https://aiindigo.com">aiindigo.com</a> — AI tools directory</p>
    </div>
  </div>
</body>
</html>
  `);
});

// Health check (free)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Categories (free)
app.get('/api/categories', (req, res) => {
  const categories = ['chatbots', 'coding', 'image', 'video', 'audio', 'writing', 'productivity'];
  res.json({ success: true, categories });
});

// Tools search (x402 paywall)
app.get('/api/tools', async (req, res) => {
  const query = req.query.q?.toLowerCase() || '';
  const paymentHeader = req.headers['x-payment'];
  
  // Check for x402 payment
  if (!paymentHeader) {
    // Return 402 Payment Required
    res.status(402).json({
      error: 'Payment Required',
      x402: {
        version: '1',
        scheme: 'exact',
        network: 'base',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        amount: (PRICE_CENTS * 10000).toString(), // $0.01 in USDC decimals
        payTo: WALLET_ADDRESS,
        facilitator: FACILITATOR_URL,
      },
      message: `Search AI Indigo tools for $${(PRICE_CENTS / 100).toFixed(2)} USDC`,
    });
    return;
  }
  
  // TODO: Verify payment with OpenFacilitator
  // For now, accept any payment header (dev mode)
  // In production: call facilitator /verify and /settle endpoints
  
  // Filter tools
  let results = tools;
  if (query) {
    results = tools.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.includes(query)
    );
  }
  
  // Limit results for MVP
  const category = req.query.category;
  if (category) {
    results = results.filter(t => t.category === category);
  }
  
  res.json({
    success: true,
    query,
    count: results.length,
    tools: results,
    note: 'Full dataset available at aiindigo.com'
  });
});

app.listen(PORT, () => {
  console.log(`🔍 AI Indigo x402 API running on port ${PORT}`);
  console.log(`   Price: $${(PRICE_CENTS / 100).toFixed(2)} per query`);
  console.log(`   Wallet: ${WALLET_ADDRESS}`);
});
