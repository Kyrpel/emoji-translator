# ✨ Emoji Translator

Turn any text into emoji vibes. Fun first. Accuracy never. 🎲

<!-- Video Demo -->
<div align="center">
  <video width="600" controls>
    <source src="./docs/demo.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</div>

## What is This?

A playful web app that translates your text into emojis using AI or smart word matching. Perfect for adding some emoji flair to your messages!

## Features

- 🎨 **4 Translation Modes**:
  - **Vibe**: Captures the emotion and feeling (8-12 emojis)
  - **Literal**: One emoji per word
  - **Chaos**: Random fun mix (8-15 emojis)
  - **Minimal**: Exactly 3 emojis that capture the essence
- 🤖 **AI-Powered (Optional)**: Supports OpenAI API for complex sentences
- 🧠 **Smart Fallback**: Uses intelligent word matching when no API key is provided
- 🌓 **Dark/Light Theme**: Toggle with the sun/moon button
- 📋 **Copy & Share**: Copy to clipboard or share on social media
- 🔄 **Shuffle**: Get different emoji combinations for the same text
- 📜 **History**: View your last 5 translations
- 📱 **Responsive**: Works on mobile and desktop

## How to Use

1. **Type your text** in the text area (e.g., "I am late for the meeting again")
2. **Choose a mode** (Vibe, Literal, Chaos, or Minimal)
3. **See your emojis** appear instantly
4. **Copy, Share, or Shuffle** as needed!

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup AI API (Optional)

The app works **perfectly fine without any API key** using smart word matching. However, you can optionally add an OpenAI API key for better results on complex sentences.

#### Option A: Use OpenAI API (Optional - Only for Complex Sentences)

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Create a `.env` file in the root directory:
```bash
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

**When the API is used:**
- **Only** for sentences with 15+ words, multiple clauses, or question words
- **Only** in "Vibe" mode
- **Only** if you have the API key set

**What Makes a Sentence "Complex"?**

A sentence is considered "complex" if it meets **ANY** of these criteria:

- **More than 15 words**: `"I am going to the store because I need to buy groceries for dinner tonight"` (16 words)
- **Contains multiple clauses**: Has words like `but`, `however`, `although`, `because`, `if`, `when`, `while`, `since`
  - Example: `"I wanted to go but I was tired"`
  - Example: `"When I arrived, the meeting had already started"`
- **Contains question words**: `what`, `where`, `when`, `why`, `how`, `who`, `which`
  - Example: `"What time is the meeting?"`
  - Example: `"How do I get there?"`

**Examples that would use API (if key exists):**
- ✅ `"I wanted to go to the party but I was too tired because I worked all day"` (15+ words)
- ✅ `"What time should we meet and where should we go?"` (question words)
- ✅ `"When I arrived at the office, the meeting had already started"` (multiple clauses)

**Examples that use word matching (even with API key):**
- ❌ `"I love pizza"` (simple, < 15 words)
- ❌ `"Happy birthday!"` (simple, < 15 words)
- ❌ Any sentence in Literal, Chaos, or Minimal mode (API only works in Vibe mode)

**Without API key**: The app uses intelligent word matching, sentiment analysis, and fuzzy search - works great for all sentences!

#### Option B: No API Key (Default)

Just skip this step! The app uses:
- Smart word-to-emoji mapping (1000+ words)
- Fuzzy search for typos
- Sentiment analysis for mood
- Natural language processing

**Note**: The app automatically falls back to word matching if the API fails or no key is provided.

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## How It Works

### Translation Flow

1. **Input Processing**: Your text is analyzed for sentiment, important words, and complexity
2. **API Check** (only if OpenAI key exists):
   - ✅ Complex sentence + Vibe mode → Tries OpenAI API first
   - ❌ API fails or no key → Falls back to word matching
   - ❌ Not complex or not Vibe mode → Uses word matching directly
3. **Word Matching** (default/fallback):
   - Extracts verbs, nouns, and adjectives
   - Matches words to emoji database (1000+ words)
   - Uses fuzzy search for typos
   - Applies sentiment analysis for mood emojis
4. **Mode Processing**:
   - **Vibe**: Combines sentiment + important words (8-12 emojis)
   - **Literal**: One emoji per word
   - **Chaos**: Random fun mix (8-15 emojis)
   - **Minimal**: Top 3 most relevant emojis

### API Support Summary

- ✅ **OpenAI**: Supported (GPT-3.5-turbo) - Only for complex sentences in Vibe mode
- ⚠️ **ZAI**: Utility code exists but not currently integrated in main app
- ✅ **No API**: Fully functional with smart word matching for all cases

## Examples

- "I am late for the meeting again" → ⏰🚨💼📅😤
- "Happy birthday!" → 🎂🎉🎈🎊✨
- "I love pizza" → ❤️🍕😍

## License

MIT
