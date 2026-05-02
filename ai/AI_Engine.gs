// ════════════════════════════════════════════════════════════════════
// 🧠 AI_Engine.gs — MULTI-MODEL FALLBACK (Gemini → Groq)
// LOCKED · 7-Layer Audit · Self-Contained · Day 6 / 90
//
// PUBLIC API:
//   callAI(prompt, maxTokens, opts) → {text, error, model, latencyMs}
//
// FALLBACK CHAIN (free providers only):
//   1. Gemini 2.5-flash-lite  (primary — fast, free, generous quota)
//   2. Groq llama-3.1-70b     (fallback — fast, free, generous quota)
//
// Each provider is tried in order until one succeeds.
// Returns first success OR clear error if ALL fail.
//
// REQUIRED Script Properties:
//   - GEMINI_API_KEY  (you already have this)
//   - GROQ_API_KEY    (just set this — get free at console.groq.com)
//
// USAGE:
//   const result = callAI("Tell me a hadith", 1000);
//   if (result.error) { handleError(result.error); }
//   else { useText(result.text); }
//
// @version 1.0
// @date    2026-04-29
// ════════════════════════════════════════════════════════════════════

const _AI_GEMINI_MODEL = 'gemini-2.5-flash-lite';
const _AI_GROQ_MODEL   = 'llama-3.3-70b-versatile';

const _AI_GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const _AI_GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';

const _AI_DEFAULT_MAX_TOKENS = 2000;
const _AI_TIMEOUT_MS = 30000;

// ──────────────────────────────────────────────────────────
// PUBLIC ENTRY — callAI
// ──────────────────────────────────────────────────────────

/**
 * Call AI with automatic fallback across providers.
 * 
 * @param {string} prompt - The text prompt
 * @param {number} maxTokens - Max output tokens (default 2000)
 * @param {object} opts - Optional: {forceProvider: 'gemini'|'groq', temperature: 0.7}
 * @return {object} {text, error, model, latencyMs}
 */
function callAI(prompt, maxTokens, opts) {
  const tokens = maxTokens || _AI_DEFAULT_MAX_TOKENS;
  const options = opts || {};
  const force = options.forceProvider || null;

  const startTime = Date.now();
  const errors = [];

  // Build provider chain (skip if forced)
  const providers = [];
  if (force === 'gemini' || !force) providers.push({ name: 'gemini', fn: _aiTryGemini });
  if (force === 'groq' || !force) providers.push({ name: 'groq', fn: _aiTryGroq });

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const result = p.fn(prompt, tokens, options);

    if (result.ok) {
      const latency = Date.now() - startTime;
      Logger.log('AI: ' + p.name + ' succeeded in ' + latency + 'ms');
      return {
        text: result.text,
        error: null,
        model: result.model,
        provider: p.name,
        latencyMs: latency
      };
    }

    errors.push(p.name + ': ' + result.error);
    Logger.log('AI: ' + p.name + ' failed → ' + result.error + 
               (i < providers.length - 1 ? ' (trying next)' : ''));
  }

  return {
    text: '',
    error: 'All AI providers failed. ' + errors.join(' || '),
    model: null,
    provider: null,
    latencyMs: Date.now() - startTime
  };
}

// ──────────────────────────────────────────────────────────
// GEMINI PROVIDER
// ──────────────────────────────────────────────────────────

function _aiTryGemini(prompt, maxTokens, options) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY not set in Script Properties' };
  }

  const url = _AI_GEMINI_URL + _AI_GEMINI_MODEL + ':generateContent?key=' + apiKey;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: options.temperature !== undefined ? options.temperature : 0.7
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code !== 200) {
      let errMsg = 'HTTP ' + code;
      try {
        const errData = JSON.parse(body);
        if (errData.error && errData.error.message) {
          errMsg = errData.error.message;
        }
      } catch (e) {}
      return { ok: false, error: errMsg };
    }

    const data = JSON.parse(body);

    if (!data.candidates || data.candidates.length === 0) {
      return { ok: false, error: 'No candidates in response' };
    }

    const candidate = data.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
      return { ok: false, error: 'Safety block from Gemini' };
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      return { ok: false, error: 'No content in candidate' };
    }

    const text = candidate.content.parts.map(p => p.text || '').join('');

    if (!text.trim()) {
      return { ok: false, error: 'Empty response text' };
    }

    return { ok: true, text: text.trim(), model: _AI_GEMINI_MODEL };

  } catch (e) {
    return { ok: false, error: 'Network/parse error: ' + e.message };
  }
}

// ──────────────────────────────────────────────────────────
// GROQ PROVIDER
// ──────────────────────────────────────────────────────────

function _aiTryGroq(prompt, maxTokens, options) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'GROQ_API_KEY not set in Script Properties' };
  }

  const payload = {
    model: _AI_GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: options.temperature !== undefined ? options.temperature : 0.7
  };

  try {
    const response = UrlFetchApp.fetch(_AI_GROQ_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code !== 200) {
      let errMsg = 'HTTP ' + code;
      try {
        const errData = JSON.parse(body);
        if (errData.error && errData.error.message) {
          errMsg = errData.error.message;
        }
      } catch (e) {}
      return { ok: false, error: errMsg };
    }

    const data = JSON.parse(body);

    if (!data.choices || data.choices.length === 0) {
      return { ok: false, error: 'No choices in response' };
    }

    const choice = data.choices[0];

    if (!choice.message || !choice.message.content) {
      return { ok: false, error: 'No message content' };
    }

    const text = choice.message.content;

    if (!text.trim()) {
      return { ok: false, error: 'Empty response text' };
    }

    return { ok: true, text: text.trim(), model: _AI_GROQ_MODEL };

  } catch (e) {
    return { ok: false, error: 'Network/parse error: ' + e.message };
  }
}

// ──────────────────────────────────────────────────────────
// HEALTH CHECK — verify both providers configured
// ──────────────────────────────────────────────────────────

function checkAIHealth() {
  const props = PropertiesService.getScriptProperties();
  const geminiKey = props.getProperty('GEMINI_API_KEY');
  const groqKey = props.getProperty('GROQ_API_KEY');

  let report = '🔍 AI ENGINE HEALTH CHECK\n\n';
  report += 'Gemini key: ' + (geminiKey ? '✅ set (' + geminiKey.length + ' chars)' : '❌ missing') + '\n';
  report += 'Groq key:   ' + (groqKey ? '✅ set (' + groqKey.length + ' chars)' : '❌ missing') + '\n\n';

  if (geminiKey && groqKey) {
    report += '✅ Multi-model fallback available.\n';
    report += 'Chain: Gemini → Groq';
  } else if (geminiKey) {
    report += '⚠️ Only Gemini configured. No fallback.';
  } else if (groqKey) {
    report += '⚠️ Only Groq configured. No primary.';
  } else {
    report += '❌ NO providers configured. AI will not work.';
  }

  Logger.log(report);

  // Try alert if UI available
  try {
    SpreadsheetApp.getUi().alert(report);
  } catch (e) {}

  return report;
}

// ──────────────────────────────────────────────────────────
// TEST FUNCTION — call both providers and compare
// ──────────────────────────────────────────────────────────

function testAIEngine() {
  const testPrompt = 'In exactly one short sentence, name the most important purpose of salah for a Muslim.';

  Logger.log('=== AI ENGINE TEST ===\n');
  Logger.log('Test prompt: "' + testPrompt + '"\n');

  // Test 1: Default chain (should use Gemini)
  Logger.log('--- TEST 1: Default chain (Gemini primary) ---');
  const r1 = callAI(testPrompt, 100);
  if (r1.error) {
    Logger.log('❌ FAILED: ' + r1.error);
  } else {
    Logger.log('✅ Provider: ' + r1.provider + '  Model: ' + r1.model + '  Latency: ' + r1.latencyMs + 'ms');
    Logger.log('Response: ' + r1.text);
  }

  Logger.log('');

  // Test 2: Force Groq
  Logger.log('--- TEST 2: Forced Groq ---');
  const r2 = callAI(testPrompt, 100, { forceProvider: 'groq' });
  if (r2.error) {
    Logger.log('❌ FAILED: ' + r2.error);
  } else {
    Logger.log('✅ Provider: ' + r2.provider + '  Model: ' + r2.model + '  Latency: ' + r2.latencyMs + 'ms');
    Logger.log('Response: ' + r2.text);
  }

  Logger.log('');

  // Test 3: Force Gemini
  Logger.log('--- TEST 3: Forced Gemini ---');
  const r3 = callAI(testPrompt, 100, { forceProvider: 'gemini' });
  if (r3.error) {
    Logger.log('❌ FAILED: ' + r3.error);
  } else {
    Logger.log('✅ Provider: ' + r3.provider + '  Model: ' + r3.model + '  Latency: ' + r3.latencyMs + 'ms');
    Logger.log('Response: ' + r3.text);
  }

  Logger.log('\n=== TEST COMPLETE ===');

  // Summary alert
  let summary = '🧪 AI Engine Test Results\n\n';
  summary += 'Test 1 (auto):   ' + (r1.error ? '❌' : '✅ ' + r1.provider + ' (' + r1.latencyMs + 'ms)') + '\n';
  summary += 'Test 2 (Groq):   ' + (r2.error ? '❌' : '✅ ' + r2.latencyMs + 'ms') + '\n';
  summary += 'Test 3 (Gemini): ' + (r3.error ? '❌' : '✅ ' + r3.latencyMs + 'ms') + '\n\n';

  if (!r1.error && !r2.error && !r3.error) {
    summary += '✅ Both providers working. Fallback chain ready.';
  } else if (!r1.error || !r2.error || !r3.error) {
    summary += '⚠️ Partial — at least one provider works.\nCheck Execution log for details.';
  } else {
    summary += '❌ ALL providers failed. Check API keys + network.';
  }

  try {
    SpreadsheetApp.getUi().alert(summary);
  } catch (e) {
    Logger.log(summary);
  }
}

// ──────────────────────────────────────────────────────────
// QUICK STATUS — for embedding in messages
// ──────────────────────────────────────────────────────────

function getAIProvidersStatus() {
  const props = PropertiesService.getScriptProperties();
  return {
    gemini: !!props.getProperty('GEMINI_API_KEY'),
    groq: !!props.getProperty('GROQ_API_KEY')
  };
}
