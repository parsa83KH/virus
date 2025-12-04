# AI in Molecular Behavior Modeling of Viruses

A web-based interactive presentation about using Artificial Intelligence in virology and molecular behavior prediction.

## Setup Instructions

### API Key Configuration

This project uses Google's Gemini API for AI-powered analysis. To use the application, you need to configure your API key:

1. **Get your API key:**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key or use an existing one

2. **Configure the API key:**
   - Copy `config.example.js` to `config.js`
   - Open `config.js` and replace `YOUR_API_KEY_HERE` with your actual API key

   ```javascript
   const GEMINI_API_KEY = 'your-actual-api-key-here';
   ```

3. **Important Security Notes:**
   - `config.js` is already in `.gitignore` and will NOT be committed to version control
   - Never share your API key publicly
   - Never commit `config.js` to Git
   - If your API key is exposed, revoke it immediately in Google AI Studio

### Running the Application

1. Open `index.html` in a web browser
2. The application will automatically load your API key from `config.js`
3. If the API key is missing, you'll see an error message with instructions

## Project Structure

- `index.html` - Main HTML file
- `script.js` - Application logic
- `styles.css` - Styling
- `config.js` - **Your API key (gitignored, not in repository)**
- `config.example.js` - Template for API key configuration
- `.gitignore` - Ensures config.js is never committed

## Features

- Interactive virus mutation prediction
- AI-powered molecular behavior analysis
- Pandemic simulation
- Vaccine design visualization

## Security Best Practices

✅ **DO:**
- Keep `config.js` in `.gitignore`
- Use environment variables for production
- Rotate API keys regularly
- Add API key restrictions in Google Cloud Console

❌ **DON'T:**
- Commit `config.js` to version control
- Share your API key publicly
- Hardcode API keys in source files
- Use the same API key for multiple projects

## Troubleshooting

**Error: "API Key Missing"**
- Make sure `config.js` exists and contains a valid API key
- Check that `config.js` is in the same directory as `index.html`
- Verify the API key is correct in Google AI Studio

**API Key Locked/Revoked**
- If your API key was exposed, Google may lock it automatically
- Create a new API key in Google AI Studio
- Update `config.js` with the new key
- Consider adding restrictions to your new key

## License

[Your License Here]

