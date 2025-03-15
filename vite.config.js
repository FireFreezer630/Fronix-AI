import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tempo } from "tempo-devtools/dist/vite"; // Add Tempo plugin import

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  // Add conditional plugins for Tempo
  const conditionalPlugins = [];
  if (process.env.TEMPO === "true") {
    conditionalPlugins.push("tempo-devtools/dist/babel-plugin");
  }

  return {
    plugins: [
      react({
        babel: {
          plugins: [...conditionalPlugins],
        },
      }),
      tempo(), // Add the tempo plugin
    ],
    server: {
      port: 3000,
      open: false, // Changed from true to false to prevent xdg-open error
      // Allow all hosts when running in Tempo
      allowedHosts: process.env.TEMPO === "true" ? true : undefined,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
    // Expose environment variables to the client
    define: {
      "process.env": env,
    },
  };
});
