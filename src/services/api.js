import OpenAI from 'openai';
import axios from 'axios';

// Get environment variables with fallbacks
const defaultEndpoint = import.meta.env.VITE_API_ENDPOINT || 'https://models.inference.ai.azure.com';
const defaultOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || '';
const defaultTavilyKey = import.meta.env.VITE_TAVILY_API_KEY || '';

export const generateChatName = async (messages, settings) => {
  try {
    const client = new OpenAI({
      baseURL: settings.endpoint || defaultEndpoint,
      apiKey: settings.apiKey || defaultOpenAIKey,
      dangerouslyAllowBrowser: true,
    });

    // Take first 5 exchanges or fewer
    const initialMessages = messages.slice(0, 10);
    
    // Create the summarization prompt based on message count
    const messageCount = messages.length;
    const prompt = [
      {
        role: "system",
        content: "You are a highly efficient chat summarizer. Create a concise, relevant title (5 words or fewer) that captures the conversation theme. For first message, focus on the initial topic. For subsequent messages (2-3), refine the title based on how the conversation evolves, possibly generating a completely different title if the topic shifts significantly."
      },
      {
        role: "user",
        content: `Please summarize this ${messageCount === 1 ? 'initial message' : 'conversation'} in 5 or fewer words:\n${initialMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`
      }
    ];

    const response = await client.chat.completions.create({
      messages: prompt,
      temperature: 0.7,
      max_tokens: 30,
      model: "Phi-4",
    });

    const chatName = response.choices[0].message.content.trim();
    return chatName;
  } catch (error) {
    console.error('Error in generateChatName:', error);
    throw new Error(error.message || 'Failed to generate chat name');
  }
};

export const fetchChatCompletion = async (messages, settings, toolResponses = []) => {
  try {
    const client = new OpenAI({
      baseURL: settings.endpoint || defaultEndpoint,
      apiKey: settings.apiKey || defaultOpenAIKey,
      dangerouslyAllowBrowser: true,
    });

    // Define available tools
    const tools = [
      {
        type: 'function',
        function: {
          name: 'performWebSearch',
          description: 'Performs a web search using the Tavily API and returns the results.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to perform on the web',
              },
              search_depth: {
                type: 'string',
                description: 'The depth of the search. A basic search costs 1 API Credit, while an advanced search costs 2 API Credits.',
                enum: ['basic', 'advanced'],
              },
              max_results: {
                type: 'integer',
                description: 'The maximum number of search results to return (0-20).',
                minimum: 1,
                maximum: 20,
              },
              time_range: {
                type: 'string',
                description: 'The time range back from the current date to filter results.',
                enum: ['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y'],
              },
              days: {
                type: 'integer',
                description: 'Number of days back from the current date to include. Available only if topic is news.',
                minimum: 0,
              },
              include_answer: {
                type: 'boolean',
                description: 'Include an LLM-generated answer to the provided query. basic or true returns a quick answer. advanced returns a more detailed answer.',
              },
              include_raw_content: {
                type: 'boolean',
                description: 'Include the cleaned and parsed HTML content of each search result.',
              },
              include_images: {
                type: 'boolean',
                description: 'Also perform an image search and include the results in the response.',
              },
              include_image_descriptions: {
                type: 'boolean',
                description: 'When include_images is true, also add a descriptive text for each image.',
              },
              include_domains: {
                type: 'array',
                description: 'A list of domains to specifically include in the search results.',
                items: {
                  type: 'string'
                }
              },
              exclude_domains: {
                type: 'array',
                description: 'A list of domains to specifically exclude from the search results.',
                items: {
                  type: 'string'
                }
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'generateImage',
          description: 'Generates an image using Pollinations.ai based on a text prompt.',
          parameters: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'A detailed description of the image to generate. Be specific and descriptive for best results.',
              }
            },
            required: ['prompt'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'performReasoning',
          description: 'Performs extended reasoning using Pollinations AI reasoning model to help with complex problems.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The problem or question that requires deeper reasoning before answering.',
              },
              depth: {
                type: 'string',
                description: 'The depth of reasoning to perform.',
                enum: ['basic', 'advanced'],
                default: 'advanced'
              }
            },
            required: ['query'],
          },
        },
      }
    ];

    // If there are tool responses, append them to messages
    const finalMessages = toolResponses.length > 0 
      ? [...messages, ...toolResponses]
      : messages;

    const response = await client.chat.completions.create({
      messages: finalMessages,
      tools: toolResponses.length === 0 ? tools : undefined, // Only include tools on initial request
      temperature: settings.temperature || 0.7,
      max_tokens: parseInt(settings.maxTokens) || 8000,
      model: settings.modelName,
    });

    const completion = response.choices[0];
    
    // If the response indicates tool calls are needed
    if (completion.finish_reason === 'tool_calls' && completion.message.tool_calls) {
      // Return the tool calls for processing
      return {
        ...completion,
        requiresToolCalls: true
      };
    }

    // Otherwise return the regular completion
    return completion;
  } catch (error) {
    console.error('Error in fetchChatCompletion:', error);
    throw new Error(error.message || 'Failed to get completion from API');
  }
};

export const performWebSearch = async (query, tavilyApiKey, options = {}) => {
  const tavilyEndpoint = 'https://api.tavily.com/search';
  try {
    // Prepare search parameters
    const searchParams = {
      query,
      api_key: tavilyApiKey || defaultTavilyKey,
      search_depth: options.search_depth || 'basic',
      max_results: options.max_results || 5,
      include_answer: options.include_answer !== undefined ? options.include_answer : true,
    };

    // Add optional parameters if they exist
    if (options.time_range) searchParams.time_range = options.time_range;
    if (options.days) searchParams.days = options.days;
    if (options.include_raw_content !== undefined) searchParams.include_raw_content = options.include_raw_content;
    if (options.include_images !== undefined) searchParams.include_images = options.include_images;
    if (options.include_image_descriptions !== undefined) searchParams.include_image_descriptions = options.include_image_descriptions;
    if (options.include_domains) searchParams.include_domains = options.include_domains;
    if (options.exclude_domains) searchParams.exclude_domains = options.exclude_domains;

    const response = await axios.post(tavilyEndpoint, searchParams);
    return JSON.stringify(response.data); // Return results as a string
  } catch (error) {
    console.error('Error in performWebSearch:', error);
    return JSON.stringify({ error: 'Failed to perform web search', details: error.message });
  }
};

export const generateImage = async (prompt) => {
  try {
    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Create the Pollinations.ai URL
    const imageUrl = `https://pollinations.ai/prompt/${encodedPrompt}`;
    
    console.log('Generated image URL:', imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('Error in generateImage:', error);
    throw new Error('Failed to generate image');
  }
};

export const performReasoning = async (query, options = {}) => {
  try {
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);
    
    // Prepare the URL for the reasoning API
    const reasoningUrl = `https://text.pollinations.ai/${encodedQuery}/model=openai-reasoning`;
    
    console.log('Fetching reasoning from:', reasoningUrl);
    
    // Fetch the reasoning result
    const response = await axios.get(reasoningUrl);
    
    // Check if we got a valid response
    if (response.data) {
      console.log('Reasoning response received');
      return JSON.stringify({
        reasoning: response.data,
        query: query
      });
    } else {
      throw new Error('Empty response from reasoning API');
    }
  } catch (error) {
    console.error('Error in performReasoning:', error);
    return JSON.stringify({ 
      error: 'Failed to perform reasoning', 
      details: error.message 
    });
  }
};
