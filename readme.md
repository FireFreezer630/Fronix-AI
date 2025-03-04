# AI Chat Assistant

A ChatGPT-like clone built with React that integrates with the OpenAI API. This application features a user-friendly interface with conversation management, API settings configuration, and chat functionality.

## Features

- Chat interface similar to ChatGPT
- Sidebar for managing multiple conversations
  - Close sidebar by clicking outside or using the arrow button
  - Automatically collapses on mobile for better space utilization
- Settings panel for configuring API connection details
- Support for Markdown in messages
- Modern, responsive UI design with glassmorphic elements
- Client-side storage for saving conversations and settings
- Web search capabilities with customizable parameters
- Image generation using Pollinations.ai
- Dark/Light mode toggle
- Environment variables support for API keys

## Prerequisites

- Node.js (v14.0.0 or later)
- npm or yarn

## Installation

1. Clone this repository
   ```
   git clone https://github.com/yourusername/ai-chat-assistant.git
   cd ai-chat-assistant
   ```

2. Install dependencies
   ```
   npm install
   ```
   or
   ```
   yarn
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file and add your API keys:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_TAVILY_API_KEY=your_tavily_api_key_here
   VITE_API_ENDPOINT=https://models.inference.ai.azure.com
   ```

4. Start the development server
   ```
   npm run dev
   ```
   or
   ```
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

### Setting up the API Connection

You can configure your API settings in two ways:

1. **Using environment variables (recommended)**:
   - Set the variables in the `.env` file as described in the installation section
   - The app will automatically use these values

2. **Using the Settings UI**:
   - Click on the "Settings" button in the sidebar
   - Enter your API key (required)
   - Enter your Tavily API key for web search functionality
   - Optionally modify other settings:
     - Endpoint URL (defaults to Azure AI endpoint)
     - Model name (select from gpt-4o, gpt-4o-mini, Phi-4, or Llama-3.3-70B-Instruct)
     - Temperature (controls randomness, 0-2)
     - Max tokens (controls response length)
   - Click "Save Settings"

### Managing Conversations

- Click "New Chat" to start a new conversation
- Click on a conversation in the sidebar to switch between conversations
- Hover over a conversation to see the delete button
- All conversations are stored in your browser's localStorage
- Close the sidebar by:
  - Clicking the arrow button in the top right of the sidebar
  - Clicking anywhere outside the sidebar
  - Using the menu button in the header on mobile

### Sending Messages

- Type your message in the input field at the bottom of the chat window
- Press Enter or click the send button to send your message
- Use Shift+Enter for a new line without sending

### Web Search

The assistant can perform web searches to answer questions about current events or topics that require up-to-date information:

- Simply ask a question that might require web search
- The AI will automatically decide when to use web search
- The AI will customize search parameters based on your query type
- You'll see a search indicator showing what parameters were chosen

### Image Generation

The assistant can generate images based on your descriptions:

- Ask for an image with a detailed description
- The AI will use Pollinations.ai to generate the image
- The generated image will be displayed directly in the chat

## UI Features

- **Dark/Light Mode**: Toggle between dark and light themes in the settings panel
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Glassmorphic UI**: Modern, translucent interface elements
- **Markdown Support**: Format your messages with markdown syntax
- **Collapsible Sidebar**: Save space by collapsing the sidebar when not needed

## Project Structure

```
ai-chat-assistant/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── ChatWindow.jsx
│   │   └── SettingsModal.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── public/
│   └── index.html
├── .env.example
├── .env (create this from .env.example)
├── vite.config.js
└── package.json
```

## Customization

- Modify the `App.css` file to change the appearance
- Add additional models or settings in the `SettingsModal.jsx` component
- Extend the conversation functionality in `App.jsx`

## Data Storage

All data is stored locally in your browser using localStorage:
- Conversations and messages
- API settings
- UI preferences
- Sidebar state

No data is sent to any server except for the API requests to the configured endpoints.

## License

MIT