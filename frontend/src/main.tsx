import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import "./styles.css";

const queryClient = new QueryClient();

function cleanDemoLabels(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const original = current.textContent ?? "";
    const cleaned = original
      .replace(/\s*\[DEMO\]\s*/gi, " ")
      .replace(/\bDEMO-/gi, "")
      .replace(/Dữ liệu PostgreSQL/gi, "")
      .replace(/ {2,}/g, " ")
      .trim();

    if (cleaned !== original.trim()) {
      current.textContent = cleaned;
    }

    current = walker.nextNode();
  }
}

const rootElement = document.getElementById("root")!;

const demoLabelObserver = new MutationObserver(() => {
  cleanDemoLabels(rootElement);
});

demoLabelObserver.observe(rootElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Chạy thêm sau khi React render và theo chu kỳ ngắn để xử lý dữ liệu tải bất đồng bộ
// từ API/React Query. Việc này chỉ thay đổi chữ hiển thị, không sửa dữ liệu PostgreSQL.
window.setTimeout(() => cleanDemoLabels(rootElement), 0);
window.setTimeout(() => cleanDemoLabels(rootElement), 300);
window.setInterval(() => cleanDemoLabels(rootElement), 1000);
