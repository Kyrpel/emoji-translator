// ZAI GLM-4.5-Flash API integration for emoji translation

const ZAI_API_BASE = 'https://api.z.ai/api/paas/v4';
const ZAI_MODEL = 'glm-4.5-flash';

/**
 * Translate text to emojis using ZAI GLM-4.5-Flash API
 * @param {string} text - Input text to translate
 * @param {string} mode - Translation mode: 'vibe', 'literal', 'chaos', 'minimal'
 * @param {string} apiKey - ZAI API key (optional, can be set via env)
 * @returns {Promise<string>} - Emoji string result
 */
export async function translateWithZAI(text, mode = 'vibe', apiKey = null) {
  if (!text.trim()) return '';

  const key = apiKey || import.meta.env.VITE_ZAI_API_KEY;
  if (!key) {
    console.warn('⚠️ ZAI API key not found. Set VITE_ZAI_API_KEY in .env');
    return null;
  }

  // Build prompt based on mode
  const modePrompts = {
    vibe: `Translate the following text into emojis that capture the vibe and emotion. Use 8-12 emojis that best represent the meaning, feeling, and context. Only return emojis, no text.`,
    literal: `Translate each word in the following text into its most literal emoji representation. Use one emoji per word. Only return emojis, no text.`,
    chaos: `Translate the following text into a random, chaotic mix of 8-15 emojis that loosely relate to the text. Be creative and fun. Only return emojis, no text.`,
    minimal: `Translate the following text into exactly 3 emojis that best capture the essence. Only return emojis, no text.`
  };

  const systemPrompt = modePrompts[mode] || modePrompts.vibe;
  
  try {
    console.log(`🤖 Calling ZAI API - Mode: ${mode}, Text: "${text}"`);
    
    const response = await fetch(`${ZAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: ZAI_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 50,
        temperature: mode === 'chaos' ? 0.9 : mode === 'minimal' ? 0.3 : 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limit errors specifically
      if (errorData.error?.includes('concurrency') || errorData.error?.includes('rate limit')) {
        console.warn('⚠️ ZAI API rate limit reached. Using fallback.');
        return null;
      }
      
      throw new Error(`ZAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const emojiResult = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean up result - remove any text, keep only emojis
    const cleanEmojis = emojiResult.replace(/[^\p{Emoji}\s]/gu, '').trim();
    
    console.log(`✅ ZAI API result: ${cleanEmojis}`);
    return cleanEmojis || null;
  } catch (error) {
    console.error('❌ ZAI API error:', error.message || error);
    return null;
  }
}

/**
 * Check if ZAI API is available (has API key)
 */
export function isZAIAvailable() {
  return !!(import.meta.env.VITE_ZAI_API_KEY);
}
