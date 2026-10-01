import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import ClerkWithRouter from "./auth/ClerkWithRouter";
import ApiProvider from "./lib/ApiProvider";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkWithRouter>
        <QueryClientProvider client={queryClient}>
          <ApiProvider>
            <App />
          </ApiProvider>
        </QueryClientProvider>
      </ClerkWithRouter>
    </BrowserRouter>
  </StrictMode>,
);
