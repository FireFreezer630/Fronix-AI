import OpenAI from "openai";
import axios from "axios";

// Get environment variables with fallbacks
const defaultEndpoint =
  import.meta.env.VITE_API_ENDPOINT || "https://models.inference.ai.azure.com";
const pollinationsEndpoint = "https://text.pollinations.ai/openai";
const defaultOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const defaultTavilyKey = import.meta.env.VITE_TAVILY_API_KEY || "";
const defaultPollinationsModel = "openai-large";

// Security utility functions
const secureStorage = {
  // Encrypt data before storing
  setItem: (key, value) => {
    try {
      // Simple obfuscation (not true encryption, but better than plaintext)
      const obfuscated = btoa(JSON.stringify(value));
      sessionStorage.setItem(key, obfuscated);
      return true;
    } catch (error) {
      console.error("Error storing secure data:", error);
      return false;
    }
  },

  // Decrypt data when retrieving
  getItem: (key) => {
    try {
      const obfuscated = sessionStorage.getItem(key);
      if (!obfuscated) return null;
      return JSON.parse(atob(obfuscated));
    } catch (error) {
      console.error("Error retrieving secure data:", error);
      return null;
    }
  },

  // Remove item securely
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Error removing secure data:", error);
      return false;
    }
  },
};

// Rate limiting implementation
const rateLimiter = {
  timestamps: [],
  maxRequests: 10, // Maximum requests allowed
  timeWindow: 60000, // Time window in milliseconds (1 minute)

  checkLimit: function () {
    const now = Date.now();
    // Remove timestamps older than the time window
    this.timestamps = this.timestamps.filter(
      (time) => now - time < this.timeWindow,
    );

    // Check if we've reached the limit
    if (this.timestamps.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current timestamp and allow the request
    this.timestamps.push(now);
    return true;
  },
};

export const generateChatName = async (messages, settings) => {
  try {
    // If Pollinations.ai mode is enabled, use it for generating the chat name
    if (settings.usePollinationsAi) {
      // Take first 5 exchanges or fewer
      const initialMessages = messages.slice(0, 10);

      // Create system message for the summarizer
      const systemMessage = {
        role: "system",
        content:
          "You are a highly efficient chat summarizer. Create a concise, relevant title (5 words or fewer) that captures the conversation theme.",
      };

      const userMessage = {
        role: "user",
        content: `Please summarize this ${messages.length === 1 ? "initial message" : "conversation"} in 5 or fewer words:\n${initialMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
      };

      const response = await axios.post("https://text.pollinations.ai/", {
        messages: [systemMessage, userMessage],
        seed: Math.floor(Math.random() * 1000),
        model: settings.pollinationsModel || defaultPollinationsModel,
      });

      // The response is the actual text content directly
      if (response.data) {
        return response.data.trim();
      } else {
        throw new Error("Invalid response from Pollinations.ai");
      }
    } else {
      // Use OpenAI/Azure as before
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
          content:
            "You are a highly efficient chat summarizer. Create a concise, relevant title (5 words or fewer) that captures the conversation theme. For first message, focus on the initial topic. For subsequent messages (2-3), refine the title based on how the conversation evolves, possibly generating a completely different title if the topic shifts significantly.",
        },
        {
          role: "user",
          content: `Please summarize this ${messageCount === 1 ? "initial message" : "conversation"} in 5 or fewer words:\n${initialMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
        },
      ];

      const response = await client.chat.completions.create({
        messages: prompt,
        temperature: 0.7,
        max_tokens: 30,
        model: "Phi-4",
      });

      const chatName = response.choices[0].message.content.trim();
      return chatName;
    }
  } catch (error) {
    console.error("Error in generateChatName:", error);
    throw new Error(error.message || "Failed to generate chat name");
  }
};

// Define available tools for reuse
const getAvailableTools = () => [
  {
    type: "function",
    function: {
      name: "performWebSearch",
      description:
        "Performs a web search using the Tavily API and returns the results.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to perform on the web",
          },
          search_depth: {
            type: "string",
            description:
              "The depth of the search. A basic search costs 1 API Credit, while an advanced search costs 2 API Credits.",
            enum: ["basic", "advanced"],
          },
          max_results: {
            type: "integer",
            description:
              "The maximum number of search results to return (0-20).",
            minimum: 1,
            maximum: 20,
          },
          time_range: {
            type: "string",
            description:
              "The time range back from the current date to filter results.",
            enum: ["day", "week", "month", "year", "d", "w", "m", "y"],
          },
          days: {
            type: "integer",
            description:
              "Number of days back from the current date to include. Available only if topic is news.",
            minimum: 0,
          },
          include_answer: {
            type: "boolean",
            description:
              "Include an LLM-generated answer to the provided query. basic or true returns a quick answer. advanced returns a more detailed answer.",
          },
          include_raw_content: {
            type: "boolean",
            description:
              "Include the cleaned and parsed HTML content of each search result.",
          },
          include_images: {
            type: "boolean",
            description:
              "Also perform an image search and include the results in the response.",
          },
          include_image_descriptions: {
            type: "boolean",
            description:
              "When include_images is true, also add a descriptive text for each image.",
          },
          include_domains: {
            type: "array",
            description:
              "A list of domains to specifically include in the search results.",
            items: {
              type: "string",
            },
          },
          exclude_domains: {
            type: "array",
            description:
              "A list of domains to specifically exclude from the search results.",
            items: {
              type: "string",
            },
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateImage",
      description:
        "Generates an image using Pollinations.ai based on a text prompt.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "A detailed description of the image to generate. Be specific and descriptive for best results.",
          },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "performReasoning",
      description:
        "Performs extended reasoning using Pollinations AI reasoning model to help with complex problems.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The problem or question that requires deeper reasoning before answering.",
          },
          depth: {
            type: "string",
            description: "The depth of reasoning to perform.",
            enum: ["basic", "advanced"],
            default: "advanced",
          },
        },
        required: ["query"],
      },
    },
  },
];

// New function for streaming chat completion
export const streamChatCompletion = async (
  messages,
  settings,
  toolResponses = [],
  onToken,
) => {
  try {
    // Check rate limit
    if (!rateLimiter.checkLimit()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Validate inputs for security
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Invalid messages format");
    }

    // Sanitize inputs to prevent injection attacks
    const sanitizedMessages = messages.map((msg) => ({
      role: String(msg.role).slice(0, 20), // Limit role length
      content:
        typeof msg.content === "string" ? msg.content : String(msg.content),
    }));

    // Define available tools
    const tools = getAvailableTools();

    // If Pollinations.ai mode is enabled, use streaming from Pollinations.ai
    if (settings.usePollinationsAi) {
      // Store API usage for auditing (without storing the actual messages content)
      const apiUsageLog = {
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
        model: settings.pollinationsModel || defaultPollinationsModel,
        userId: settings.userId || "anonymous",
      };
      secureStorage.setItem(`api_usage_${Date.now()}`, apiUsageLog);

      // If there are tool responses, append them to messages
      const finalMessages =
        toolResponses.length > 0
          ? [...sanitizedMessages, ...toolResponses]
          : sanitizedMessages;

      console.log("Using Pollinations.ai for streaming completion");

      let retries = 0;
      const maxRetries = 3;
      let response;

      while (retries < maxRetries) {
        response = await fetch(pollinationsEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: settings.pollinationsModel || defaultPollinationsModel,
            messages: finalMessages,
            tools: toolResponses.length === 0 ? tools : undefined,
            stream: true,
          }),
        });

        if (response.status === 500) {
          retries++;
          console.log(
            `Pollinations.ai 500 error, retrying attempt ${retries}/${maxRetries}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay for 1 second
        } else {
          break; // Exit loop if not a 500 error
        }
      }

      if (response.status === 500) {
        throw new Error(
          "Pollinations.ai request failed after multiple retries with 500 error",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedContent = "";
      let messageObj = { role: "assistant", content: "" };
      let toolCallsData = null;

      return new Promise((resolve, reject) => {
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk
                .split("\n")
                .filter((line) => line.trim() !== "");

              for (const line of lines) {
                if (line.startsWith("data:")) {
                  const eventData = JSON.parse(line.substring(5).trim());

                  if (
                    eventData.choices &&
                    eventData.choices[0] &&
                    eventData.choices[0].delta &&
                    eventData.choices[0].delta.tool_calls
                  ) {
                    if (!toolCallsData) {
                      toolCallsData = eventData.choices[0].delta.tool_calls;
                    } else {
                      eventData.choices[0].delta.tool_calls.forEach(
                        (newToolCall, i) => {
                          if (!toolCallsData[i]) {
                            toolCallsData[i] = newToolCall;
                          } else if (
                            newToolCall.function &&
                            newToolCall.function.arguments
                          ) {
                            toolCallsData[i].function.arguments +=
                              newToolCall.function.arguments;
                          }
                        },
                      );
                    }
                  } else if (
                    eventData.choices &&
                    eventData.choices[0] &&
                    eventData.choices[0].delta &&
                    eventData.choices[0].delta.content
                  ) {
                    accumulatedContent += eventData.choices[0].delta.content;
                    messageObj.content = accumulatedContent;

                    if (onToken) {
                      onToken(eventData.choices[0].delta.content);
                    }
                  }
                } else if (line.startsWith("event: error")) {
                  const errorData = JSON.parse(line.substring(6).trim());
                  console.error("SSE error:", errorData);
                  reject(new Error(`SSE error: ${errorData.message}`));
                  return;
                }
              }
            }

            if (toolCallsData) {
              resolve({
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: toolCallsData,
                },
                finish_reason: "tool_calls",
                requiresToolCalls: true,
              });
            } else {
              resolve({
                message: messageObj,
                finish_reason: "stop",
              });
            }
          } catch (error) {
            console.error("Error processing stream:", error);
            reject(error);
          } finally {
            reader.releaseLock();
          }
        };

        processStream();
      });
    } else {
      // Use OpenAI/Azure with streaming
      const client = new OpenAI({
        baseURL: settings.endpoint || defaultEndpoint,
        apiKey: settings.apiKey || defaultOpenAIKey,
        dangerouslyAllowBrowser: true,
      });

      // Store API usage for auditing (without storing the actual messages content)
      const apiUsageLog = {
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
        model: settings.modelName || "default",
        userId: settings.userId || "anonymous",
      };
      secureStorage.setItem(`api_usage_${Date.now()}`, apiUsageLog);

      // If there are tool responses, append them to messages
      const finalMessages =
        toolResponses.length > 0
          ? [...sanitizedMessages, ...toolResponses]
          : sanitizedMessages;

      const stream = await client.chat.completions.create({
        messages: finalMessages,
        tools: toolResponses.length === 0 ? tools : undefined,
        temperature: settings.temperature || 0.7,
        max_tokens: parseInt(settings.maxTokens) || 8000,
        model: settings.modelName,
        stream: true,
      });

      let accumulatedContent = "";
      let messageObj = { role: "assistant", content: "" };
      let toolCallsData = null;
      let finishReason = null;

      for await (const chunk of stream) {
        // Check if this is the final chunk with finish reason
        if (chunk.choices[0].finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // Check if this chunk contains tool calls
        if (chunk.choices[0].delta.tool_calls) {
          // Initialize tool calls data if this is the first tool call chunk
          if (!toolCallsData) {
            toolCallsData = chunk.choices[0].delta.tool_calls;
          } else {
            // Update existing tool calls with new content
            chunk.choices[0].delta.tool_calls.forEach((newToolCall, i) => {
              if (!toolCallsData[i]) {
                toolCallsData[i] = newToolCall;
              } else if (
                newToolCall.function &&
                newToolCall.function.arguments
              ) {
                toolCallsData[i].function.arguments +=
                  newToolCall.function.arguments;
              }
            });
          }
        }
        // Regular content update
        else if (chunk.choices[0].delta.content) {
          accumulatedContent += chunk.choices[0].delta.content;
          messageObj.content = accumulatedContent;

          // Call the token callback with the new content chunk
          if (onToken) {
            onToken(chunk.choices[0].delta.content);
          }
        }
      }

      // Return the final object based on completion type
      if (toolCallsData) {
        return {
          message: {
            role: "assistant",
            content: "",
            tool_calls: toolCallsData,
          },
          finish_reason: "tool_calls",
          requiresToolCalls: true,
        };
      } else {
        return {
          message: messageObj,
          finish_reason: finishReason || "stop",
        };
      }
    }
  } catch (error) {
    console.error("Error in streamChatCompletion:", error);
    throw new Error(
      error.message || "Failed to get streaming completion from API",
    );
  }
};

// Keep the non-streaming version for backward compatibility
export const fetchChatCompletion = async (
  messages,
  settings,
  toolResponses = [],
) => {
  try {
    // Check rate limit
    if (!rateLimiter.checkLimit()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    // Validate inputs for security
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Invalid messages format");
    }

    // Sanitize inputs to prevent injection attacks
    const sanitizedMessages = messages.map((msg) => ({
      role: String(msg.role).slice(0, 20), // Limit role length
      content:
        typeof msg.content === "string" ? msg.content : String(msg.content),
    }));

    // Define available tools
    const tools = getAvailableTools();

    // Store API usage for auditing (without storing the actual messages content)
    const apiUsageLog = {
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      model: settings.modelName || settings.pollinationsModel || "default",
      userId: settings.userId || "anonymous",
    };
    secureStorage.setItem(`api_usage_${Date.now()}`, apiUsageLog);

    // If Pollinations.ai mode is enabled, use the Pollinations.ai API
    if (settings.usePollinationsAi) {
      // If there are tool responses, append them to messages
      const finalMessages =
        toolResponses.length > 0
          ? [...sanitizedMessages, ...toolResponses]
          : sanitizedMessages;

      console.log("Using Pollinations.ai for completion");

      let retries = 0;
      const maxRetries = 3;
      let response;
      let data;

      while (retries < maxRetries) {
        try {
          response = await axios.post(
            pollinationsEndpoint,
            {
              model: settings.pollinationsModel || defaultPollinationsModel,
              messages: finalMessages,
              tools: toolResponses.length === 0 ? tools : undefined, // Include tools only on the initial request
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          // Parse the response as JSON
          data = await response.data;
          break; // Exit loop if successful
        } catch (error) {
          if (error.response && error.response.status === 500) {
            retries++;
            console.error(
              `Pollinations.ai 500 error, retrying attempt ${retries}/${maxRetries}`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay for 1 second
          } else {
            throw error; // Re-throw the error if it's not a 500
          }
        }
      }

      if (!data) {
        throw new Error(
          "Pollinations.ai request failed after multiple retries",
        );
      }

      // Check for tool calls or a regular completion
      if (
        data.choices &&
        data.choices[0].finish_reason === "tool_calls" &&
        data.choices[0].message.tool_calls
      ) {
        // Return the tool calls for processing
        return {
          message: data.choices[0].message,
          finish_reason: data.choices[0].finish_reason,
          requiresToolCalls: true,
        };
      } else if (data.choices && data.choices[0].message) {
        // Return the regular completion
        return {
          message: data.choices[0].message,
          finish_reason: data.choices[0].finish_reason || "stop", // Provide a default finish_reason
        };
      } else {
        throw new Error("Invalid response from Pollinations.ai");
      }
    } else {
      // Otherwise use OpenAI/Azure as before
      const client = new OpenAI({
        baseURL: settings.endpoint || defaultEndpoint,
        apiKey: settings.apiKey || defaultOpenAIKey,
        dangerouslyAllowBrowser: true,
      });

      // If there are tool responses, append them to messages
      const finalMessages =
        toolResponses.length > 0
          ? [...sanitizedMessages, ...toolResponses]
          : sanitizedMessages;

      const response = await client.chat.completions.create({
        messages: finalMessages,
        tools: toolResponses.length === 0 ? tools : undefined, // Include tools only on the initial request
        temperature: settings.temperature || 0.7,
        max_tokens: parseInt(settings.maxTokens) || 8000,
        model: settings.modelName,
      });

      const completion = response.choices[0];

      // If the response indicates tool calls are needed
      if (
        completion.finish_reason === "tool_calls" &&
        completion.message.tool_calls
      ) {
        // Return the tool calls for processing
        return {
          message: completion.message,
          finish_reason: completion.finish_reason,
          requiresToolCalls: true,
        };
      }

      // Otherwise return the regular completion
      return completion;
    }
  } catch (error) {
    console.error("Error in fetchChatCompletion:", error);
    throw new Error(error.message || "Failed to get completion from API");
  }
};

// Add a direct implementation of Pollinations.ai text generation for debugging
export const testPollinationsAi = async (message) => {
  try {
    const response = await axios.post(pollinationsEndpoint, {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
      seed: 42,
      model: defaultPollinationsModel,
    });

    console.log("Raw Pollinations.ai response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error testing Pollinations.ai:", error);
    throw new Error(error.message || "Failed to test Pollinations.ai");
  }
};

export const performWebSearch = async (query, tavilyApiKey, options = {}) => {
  const tavilyEndpoint = "https://api.tavily.com/search";
  try {
    // Prepare search parameters
    const searchParams = {
      query,
      api_key: tavilyApiKey || defaultTavilyKey,
      search_depth: options.search_depth || "basic",
      max_results: options.max_results || 5,
      include_answer:
        options.include_answer !== undefined ? options.include_answer : true,
    };

    // Add optional parameters if they exist
    if (options.time_range) searchParams.time_range = options.time_range;
    if (options.days) searchParams.days = options.days;
    if (options.include_raw_content !== undefined)
      searchParams.include_raw_content = options.include_raw_content;
    if (options.include_images !== undefined)
      searchParams.include_images = options.include_images;
    if (options.include_image_descriptions !== undefined)
      searchParams.include_image_descriptions =
        options.include_image_descriptions;
    if (options.include_domains)
      searchParams.include_domains = options.include_domains;
    if (options.exclude_domains)
      searchParams.exclude_domains = options.exclude_domains;

    const response = await axios.post(tavilyEndpoint, searchParams);
    return JSON.stringify(response.data); // Return results as a string
  } catch (error) {
    console.error("Error in performWebSearch:", error);
    return JSON.stringify({
      error: "Failed to perform web search",
      details: error.message,
    });
  }
};

export const generateImage = async (prompt) => {
  try {
    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);

    // Create the Pollinations.ai URL
    const imageUrl = `https://pollinations.ai/prompt/${encodedPrompt}`;

    console.log("Generated image URL:", imageUrl);

    return imageUrl;
  } catch (error) {
    console.error("Error in generateImage:", error);
    throw new Error("Failed to generate image");
  }
};

export const performReasoning = async (query, options = {}) => {
  try {
    // Directly use the POST endpoint for reasoning with the openai-reasoning model
    const response = await axios.post("https://text.pollinations.ai/", {
      messages: [
        {
          role: "system",
          content:
            "You are a reasoning assistant that thinks deeply about problems.",
        },
        { role: "user", content: query },
      ],
      seed: Math.floor(Math.random() * 1000),
      model: "openai-reasoning",
    });

    // Check if we got a valid response
    if (response.data) {
      console.log("Reasoning response received");
      return JSON.stringify({
        reasoning: response.data,
        query: query,
      });
    } else {
      throw new Error("Empty response from reasoning API");
    }
  } catch (error) {
    console.error("Error in performReasoning:", error);
    return JSON.stringify({
      error: "Failed to perform reasoning",
      details: error.message,
    });
  }
};
