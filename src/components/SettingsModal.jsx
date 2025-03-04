import React, { useState, useEffect } from 'react';
import { XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export const SettingsModal = ({ settings, onSave, onClose }) => {
  // Initialize form data with environment variables first, then settings
  const [formData, setFormData] = useState({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || settings.apiKey || '',
    tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY || settings.tavilyApiKey || '',
    endpoint: import.meta.env.VITE_API_ENDPOINT || settings.endpoint || 'https://models.inference.ai.azure.com',
    modelName: settings.modelName || 'gpt-4o',
    temperature: settings.temperature || 0.7,
    maxTokens: settings.maxTokens || 8000,
    darkMode: settings.darkMode || false
  });

  // Update form data when environment variables change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || prev.apiKey,
      tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY || prev.tavilyApiKey,
      endpoint: import.meta.env.VITE_API_ENDPOINT || prev.endpoint
    }));
  }, [import.meta.env.VITE_OPENAI_API_KEY, import.meta.env.VITE_TAVILY_API_KEY, import.meta.env.VITE_API_ENDPOINT]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !formData.darkMode;
    setFormData({
      ...formData,
      darkMode: newDarkMode
    });
    const updatedSettings = { ...settings, darkMode: newDarkMode };
    onSave(updatedSettings);
  };

  return (
    <div className="modal-overlay">
      <div className="modal glassmorphic-card">
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <XMarkIcon className="icon" />
          </button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="theme-toggle-container">
                <label className="theme-toggle-label">Theme</label>
                <button 
                  type="button" 
                  className={`theme-toggle-btn ${formData.darkMode ? 'dark' : 'light'}`}
                  onClick={toggleDarkMode}
                >
                  {formData.darkMode ? (
                    <><MoonIcon className="icon-sm" /> Dark Mode</>
                  ) : (
                    <><SunIcon className="icon-sm" /> Light Mode</>
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="apiKey">API Key*</label>
              <input
                className="form-input neumorphic"
                type="password"
                id="apiKey"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                required
                placeholder="Enter your API key"
              />
              <p className="form-help">Your API key is stored locally and never sent to our servers. You can also set this in the .env file.</p>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="tavilyApiKey">Tavily API Key*</label>
              <input
                className="form-input neumorphic"
                type="password"
                id="tavilyApiKey"
                name="tavilyApiKey"
                value={formData.tavilyApiKey}
                onChange={handleChange}
                required
                placeholder="Enter your Tavily API key"
              />
              <p className="form-help">Required for web search functionality. Get your key from Tavily. You can also set this in the .env file.</p>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="endpoint">Endpoint URL</label>
              <input
                className="form-input neumorphic"
                type="text"
                id="endpoint"
                name="endpoint"
                value={formData.endpoint}
                onChange={handleChange}
                placeholder="https://models.inference.ai.azure.com"
              />
              <p className="form-help">The base URL for API requests. You can also set this in the .env file.</p>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="modelName">Model Name</label>
              <select
                className="form-select neumorphic"
                id="modelName"
                name="modelName"
                value={formData.modelName}
                onChange={handleChange}
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o-mini</option>
                <option value="Phi-4-multimodal-instruct">Phi-4-multimodal-instruct</option>
                <option value="Llama-3.3-70B-Instruct">Llama-3.3-70B-Instruct</option>
              </select>
              <p className="form-help">Select the AI model to use for generating responses.</p>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="temperature">Temperature</label>
              <input
                className="form-input neumorphic"
                type="range"
                id="temperature"
                name="temperature"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={handleChange}
              />
              <div className="range-labels">
                <span>Precise (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
              <p className="form-help">Controls the randomness of the AI's responses. Lower values make responses more deterministic.</p>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="maxTokens">Max Tokens</label>
              <input
                className="form-input neumorphic"
                type="number"
                id="maxTokens"
                name="maxTokens"
                min="100"
                max="8000"
                value={formData.maxTokens}
                onChange={handleChange}
              />
              <p className="form-help">Maximum length of the generated response. Higher values allow longer responses.</p>
            </div>
          </form>
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary neumorphic" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary neumorphic" onClick={handleSubmit}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};