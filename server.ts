import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Proxy for Google Apps Script registration
  app.all("/api/register", async (req, res) => {
    const LATEST_URL = 'https://script.google.com/macros/s/AKfycbx_auPCmmiKOAXw_PL7MKIelkk4J9ohSZyyKuAy6N97pAuER_vKtLZVQh7ZDFKRcPkjtg/exec';
    let scriptUrl = process.env.VITE_APPS_SCRIPT_URL || LATEST_URL;
    
    // Force override if it's the known old/broken URL
    if (scriptUrl.includes('AKfycbyT8jkAupz6dk4T1sqX6ESwHeE92RLRqMuGcxVYyYOiH7Kjkoe2f3AVVCUfOpo9htZCjg')) {
      scriptUrl = LATEST_URL;
    }
    
    console.log(`[Registration Proxy] Using Script URL: ${scriptUrl}`);
    
    const data = { ...req.query, ...req.body };
    
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(data)) {
        params.append(key, String(value));
      }

      const separator = scriptUrl.includes("?") ? "&" : "?";
      const finalUrl = `${scriptUrl}${separator}${params.toString()}`;
      
      console.log(`[Registration Proxy] Fetching: ${finalUrl}`);
      let response = await fetch(finalUrl, { 
        method: 'GET', 
        redirect: 'follow',
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      
      console.log(`[Registration Proxy] Response status: ${response.status} ${response.statusText}`);
      let text = await response.text();
      console.log(`[Registration Proxy] Response body length: ${text.length}`);
      
      const isError = (t: string) => {
        const lower = t.toLowerCase();
        return lower.includes("<!doctype") || 
               lower.includes("<html") || 
               lower.includes("error") || 
               lower.includes("exception") || 
               lower.includes("找不到") || 
               lower.includes("script function not found") ||
               lower.includes("unauthorized");
      };

      if (isError(text)) {
        console.log(`[Registration Proxy] GET returned error/HTML or Unauthorized, attempting POST fallback...`);
        try {
          // Try POST with URLSearchParams
          const postResponse = await fetch(scriptUrl, {
            method: 'POST',
            body: params.toString(),
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json, text/plain, */*'
            },
            redirect: 'follow'
          });
          
          const postText = await postResponse.text();
          console.log(`[Registration Proxy] POST response status: ${postResponse.status}`);
          
          if (!isError(postText)) {
            console.log("[Registration Proxy] POST fallback succeeded.");
            response = postResponse;
            text = postText;
          } else {
            console.log("[Registration Proxy] POST fallback also returned error/HTML.");
            // If POST also fails, check if we can try JSON body
            try {
              const jsonResponse = await fetch(scriptUrl, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json, text/plain, */*'
                },
                redirect: 'follow'
              });
              const jsonText = await jsonResponse.text();
              if (!isError(jsonText)) {
                console.log("[Registration Proxy] POST with JSON fallback succeeded.");
                response = jsonResponse;
                text = jsonText;
              }
            } catch (jsonErr) {
              // Silent fail for JSON attempt
            }
          }
        } catch (e) {
          console.error("[Registration Proxy] POST attempt failed:", e);
        }
      }
      
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        console.log(`[Registration Proxy] Received HTML response from Google. Length: ${text.length}`);
        console.log(`[Registration Proxy] HTML Preview: ${text.substring(0, 200)}...`);
        
        let errorDetail = "Lỗi kịch bản hoặc quyền truy cập.";
        if (text.includes("doGet")) errorDetail = "Thiếu hàm doGet (Bạn cần dán mã chuẩn và Deploy lại).";
        if (text.includes("Unauthorized") || text.includes("401") || text.includes("<title>錯誤</title>") || text.includes("<title>错误</title>")) 
          errorDetail = "Lỗi quyền truy cập (Google đang chặn yêu cầu. Hãy chắc chắn chọn 'Anyone' khi Deploy và dùng Gmail cá nhân).";
        
        return res.status(500).json({ 
          error: "Google Script chưa được cấu hình đúng.",
          details: `Chi tiết: ${errorDetail}\n\nURL đang gọi: ${scriptUrl}\n\nVui lòng đảm bảo bạn đã chọn 'Anyone' (Bất kỳ ai) trong phần 'Who has access' khi Deploy.`
        });
      }

      res.send(text);
    } catch (error: any) {
      console.error("[Registration Proxy] Error:", error.message);
      res.status(500).json({ error: "Lỗi Proxy: " + error.message });
    }
  });

  // Proxy for Google Apps Script to avoid CORS
  app.get("/api/payment-status", async (req, res) => {
    const { orderId } = req.query;
    const LATEST_URL = 'https://script.google.com/macros/s/AKfycbx_auPCmmiKOAXw_PL7MKIelkk4J9ohSZyyKuAy6N97pAuER_vKtLZVQh7ZDFKRcPkjtg/exec';
    let scriptUrl = process.env.VITE_APPS_SCRIPT_URL || LATEST_URL;

    // Force override if it's the known old/broken URL
    if (scriptUrl.includes('AKfycbyT8jkAupz6dk4T1sqX6ESwHeE92RLRqMuGcxVYyYOiH7Kjkoe2f3AVVCUfOpo9htZCjg')) {
      scriptUrl = LATEST_URL;
    }

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    try {
      const separator = scriptUrl.includes("?") ? "&" : "?";
      
      const tryStatus = async (action: string) => {
        const finalUrl = `${scriptUrl}${separator}orderId=${orderId}&action=${action}`;
        console.log(`[Status Proxy] Fetching: ${finalUrl}`);
        const response = await fetch(finalUrl, { method: 'GET', redirect: 'follow' });
        const text = await response.text();
        return { ok: response.ok, text, status: response.status };
      };

      const isPaid = (text: string) => {
        const t = text.trim().toUpperCase();
        return t === "PAID" || t === "ĐÃ THANH TOÁN" || t.includes("\"PAID\"") || t.includes(":PAID") || t.includes("PAID");
      };

      let result = await tryStatus('checkStatus');
      
      // If not paid, try 'status' action as fallback without logging it as a "failure"
      if (!isPaid(result.text)) {
        result = await tryStatus('status');
      }

      if (isPaid(result.text)) {
        console.log(`[Status Proxy] Order ${orderId} is PAID`);
        return res.json({ status: "PAID" });
      }

      res.json({ status: "UNPAID", raw: result.text.substring(0, 100) });
    } catch (error: any) {
      console.error("[Status Proxy] Error:", error.message);
      res.status(500).json({ error: "Lỗi Proxy: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
