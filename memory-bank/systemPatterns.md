# System Patterns

## System Architecture

The application follows a client-side architecture built with React. It interacts with AI providers through their respective APIs. The application uses a component-based structure, with components for the sidebar, chat window, and settings modal.

## Key Technical Decisions

- Using React for the UI framework.
- Storing conversations and settings in localStorage.
- Using environment variables for API keys.

## Design Patterns in Use

- Component-based architecture.
- State management using React hooks.
- Asynchronous API calls using `fetch` or `axios`.

## Component Relationships

- `App` component is the main container.
- `Sidebar` component manages conversations.
- `ChatWindow` component displays the chat interface.
- `SettingsModal` component allows users to configure API settings.