import { supabase } from "../lib/supabase";

// Profile functions
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
  return data;
};

// Conversation functions
export const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getConversation = async (conversationId) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, messages(*)")
    .eq("id", conversationId)
    .single();

  if (error) throw error;
  return data;
};

export const createConversation = async (conversation) => {
  const { data, error } = await supabase
    .from("conversations")
    .insert(conversation)
    .select();

  if (error) throw error;
  return data[0];
};

export const updateConversation = async (conversationId, updates) => {
  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteConversation = async (conversationId) => {
  // First delete all messages in the conversation
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (messagesError) throw messagesError;

  // Then delete the conversation
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) throw error;
  return true;
};

// Message functions
export const getMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: true });

  if (error) throw error;
  return data;
};

export const createMessage = async (message) => {
  const { data, error } = await supabase
    .from("messages")
    .insert(message)
    .select();

  if (error) throw error;
  return data[0];
};

// Function to sync local conversations to Supabase
export const syncConversationsToSupabase = async (
  userId,
  localConversations,
) => {
  try {
    // Get existing conversations from Supabase
    const { data: existingConversations, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId);

    if (error) throw error;

    // Create a set of existing conversation IDs for quick lookup
    const existingIds = new Set(existingConversations.map((conv) => conv.id));

    // Process each local conversation
    for (const conversation of localConversations) {
      if (existingIds.has(conversation.id)) {
        // Update existing conversation
        await updateConversation(conversation.id, {
          title: conversation.title,
          updated_at: new Date().toISOString(),
        });

        // Get existing messages
        const { data: existingMessages } = await supabase
          .from("messages")
          .select("timestamp")
          .eq("conversation_id", conversation.id);

        const existingTimestamps = new Set(
          existingMessages.map((msg) => msg.timestamp),
        );

        // Add new messages
        for (const message of conversation.messages) {
          if (!existingTimestamps.has(message.timestamp)) {
            await createMessage({
              conversation_id: conversation.id,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              image_url: message.imageUrl || null,
              uploaded_image: message.uploadedImage || null,
              reasoning_data: message.reasoningData || null,
            });
          }
        }
      } else {
        // Create new conversation
        await createConversation({
          id: conversation.id,
          user_id: userId,
          title: conversation.title,
        });

        // Add all messages
        for (const message of conversation.messages) {
          await createMessage({
            conversation_id: conversation.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            image_url: message.imageUrl || null,
            uploaded_image: message.uploadedImage || null,
            reasoning_data: message.reasoningData || null,
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error syncing conversations:", error);
    throw error;
  }
};

// Function to load conversations from Supabase
export const loadConversationsFromSupabase = async (userId) => {
  try {
    // Get all conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // For each conversation, get its messages
    const fullConversations = [];
    for (const conversation of conversations) {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("timestamp", { ascending: true });

      if (messagesError) throw messagesError;

      // Format messages to match the app's expected structure
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        imageUrl: msg.image_url,
        uploadedImage: msg.uploaded_image,
        reasoningData: msg.reasoning_data,
      }));

      fullConversations.push({
        id: conversation.id,
        title: conversation.title,
        messages: formattedMessages,
      });
    }

    return fullConversations;
  } catch (error) {
    console.error("Error loading conversations from Supabase:", error);
    throw error;
  }
};
