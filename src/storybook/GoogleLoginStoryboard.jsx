import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { GoogleButton } from "../components/GoogleButton";

export default function GoogleLoginStoryboard() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
          <h2>Google Authentication</h2>
          <p>Click the button below to sign in with Google</p>
          <GoogleButton
            onClick={() => alert("Google sign-in would trigger here")}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
