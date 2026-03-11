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
    const LATEST_URL = 'https://script.google.com/macros/s/AKfycbyvHoumM7_wq3MqAYSsjVvgfx9xoeAB0VGfvCJobBMF9jDFMC8VeC6iM-KaIx70ZXib0A/exec';
    let scriptUrl = LATEST_URL;
    
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
    const LATEST_URL = 'https://script.google.com/macros/s/AKfycbyvHoumM7_wq3MqAYSsjVvgfx9xoeAB0VGfvCJobBMF9jDFMC8VeC6iM-KaIx70ZXib0A/exec';
    let scriptUrl = LATEST_URL;

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
        if (!text) return false;
        const t = text.trim().toUpperCase();
        
        // 1. Exact matches (most common for simple scripts)
        if (t === "PAID" || t === "TRUE" || t === "SUCCESS" || t === "OK" || t === "ĐÃ THANH TOÁN") return true;
        
        // 2. JSON Handling
        try {
          const json = JSON.parse(text);
          
          // If it's an array (e.g., a row from the sheet), check all elements
          if (Array.isArray(json)) {
            return json.some(item => {
              const s = String(item).toUpperCase();
              return s === "PAID" || s === "ĐÃ THANH TOÁN" || s === "SUCCESS";
            });
          }
          
          // If it's an object, check common field names
          if (typeof json === 'object' && json !== null) {
            const fields = ['status', 'result', 'payment', 'paid', 'data', 'value', 'msg', 'message'];
            for (const field of fields) {
              const val = String(json[field] || "").toUpperCase();
              if (val === "PAID" || val === "SUCCESS" || val === "TRUE" || val === "ĐÃ THANH TOÁN") return true;
            }
            
            // Deep search: check if any string value in the object is "PAID"
            return Object.values(json).some(v => String(v).toUpperCase() === "PAID");
          }
        } catch (e) {
          // Not valid JSON, continue to string checks
        }
        
        // 3. String inclusion (be careful with UNPAID)
        // If "PAID" exists but "UNPAID" doesn't, it's likely a success message
        if (t.includes("PAID") && !t.includes("UNPAID")) return true;
        if (t.includes("ĐÃ THANH TOÁN") || t.includes("THANH TOÁN THÀNH CÔNG")) return true;
        
        // 4. Handle quoted strings like "PAID"
        if (t.replace(/['"]+/g, '') === "PAID") return true;

        return false;
      };

      let result = await tryStatus('checkStatus');
      
      // If not paid, try 'status' action as fallback without logging it as a "failure"
      if (!isPaid(result.text)) {
        result = await tryStatus('status');
      }

      if (isPaid(result.text)) {
        console.log(`[Status Proxy] Order ${orderId} is confirmed as PAID. Response: ${result.text.substring(0, 50)}`);
        return res.json({ status: "PAID" });
      }

      console.log(`[Status Proxy] Order ${orderId} is still UNPAID. Response: ${result.text.substring(0, 100)}`);
      res.json({ status: "UNPAID", raw: result.text.substring(0, 200) });
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
