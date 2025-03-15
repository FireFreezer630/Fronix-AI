import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabase";

export const AuthContext = createContext();

// Define the hook as a named function declaration for Fast Refresh compatibility
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to handle account linking
  const linkAccounts = async (email) => {
    try {
      // Check if an account with this email already exists
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (data && !error) {
        // Account exists, we would link them here
        console.log("Account with same email exists, linking accounts");
        // In a real implementation, you would merge user data here
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking for existing account:", error);
      return false;
    }
  };

  useEffect(() => {
    // Check for active session on mount
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // If user logged in with Google, check if we need to link accounts
          if (session.user.app_metadata?.provider === "google") {
            await linkAccounts(session.user.email);
          }
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        // If this is a Google sign-in, check for account linking
        if (
          event === "SIGNED_IN" &&
          session.user.app_metadata?.provider === "google"
        ) {
          await linkAccounts(session.user.email);
        }
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);

      // First check if Google provider is enabled
      const { data: authSettings } = await supabase.auth.getSettings();
      const isGoogleEnabled = authSettings?.external?.google?.enabled;

      if (!isGoogleEnabled) {
        throw new Error(
          "Google login is not enabled. Please contact the administrator.",
        );
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError(
        error.message ||
          "Failed to sign in with Google. Please try again later.",
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update password
  const updatePassword = async (password) => {
    try {
      setError(null);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
