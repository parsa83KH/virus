// Configuration Template
// Copy this file to config.js and add your API key
// config.js is gitignored and will not be committed to the repository

// Get your Gemini API key from: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';

// Export the configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GEMINI_API_KEY };
}

