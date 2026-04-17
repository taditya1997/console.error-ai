# Console Error AI

A Chrome extension that captures browser console errors and analyzes them with Google Gemini AI. Get instant explanations, root causes, and suggested code fixes.

## Features

- Captures `console.error`, uncaught exceptions, and unhandled promise rejections
- Badge count shows number of errors
- One-click AI analysis powered by Gemini Flash 2.0
- Markdown-rendered explanations with code snippets
- Dark theme matching Chrome DevTools
- Works on any webpage

## Setup

### 1. Get a Gemini API Key
- Go to [Google AI Studio](https://aistudio.google.com/apikey)
- Create a free API key

### 2. Install the Extension
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder
4. Click the extension icon → Settings → paste your API key

## How It Works

1. Browse the web normally
2. When any page throws an error, the extension badge turns red with a count
3. Click the extension icon to see all captured errors
4. Click **Analyze with AI** on any error
5. Get an explanation, root cause, and suggested fix

## Privacy

- Your API key is stored locally in Chrome sync storage
- Errors are stored locally in Chrome local storage
- Only the error message and stack trace are sent to Gemini for analysis
- No other data is collected or transmitted


Link to the video https://www.loom.com/share/205ad66e712e464b9e35f5df79814584
