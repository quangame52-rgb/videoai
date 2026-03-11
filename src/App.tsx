/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  Video, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  PlayCircle, 
  ArrowRight, 
  Instagram, 
  Facebook, 
  Youtube,
  Menu,
  X,
  Star,
  Zap,
  ShieldCheck,
  MessageSquare,
  Clock,
  Globe,
  Lock,
  User,
  Phone,
  Mail,
  Gift,
  Code,
  AlertCircle,
  PartyPopper
} from "lucide-react";
import { useState, useEffect } from "react";

// Define global constant type
declare global {
  const __APPS_SCRIPT_URL__: string;
}

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 py-4">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
            <Code size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-xl tracking-tighter leading-none text-slate-900">ĐẦU GỖ</span>
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">AI.VIBE.CODE</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
          <Lock size={14} className="text-blue-600" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bảo mật SSL</span>
        </div>
      </div>
    </header>
  );
};

const RegistrationForm = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PAID" | "MANUAL">("UNPAID");
  const [showManualButton, setShowManualButton] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ZALO_GROUP_URL = "https://zalo.me/g/vqwndd990";

  const getScriptUrl = () => {
    const LATEST_URL = 'https://script.google.com/macros/s/AKfycbyvHoumM7_wq3MqAYSsjVvgfx9xoeAB0VGfvCJobBMF9jDFMC8VeC6iM-KaIx70ZXib0A/exec';
    let url = typeof __APPS_SCRIPT_URL__ !== 'undefined' ? __APPS_SCRIPT_URL__ : import.meta.env.VITE_APPS_SCRIPT_URL;
    
    // Always use the user-provided URL if it looks like a valid script URL
    if (LATEST_URL) return LATEST_URL;
    
    return url || LATEST_URL;
  };

  useEffect(() => {
    const scriptUrl = getScriptUrl();
    if (scriptUrl) {
      console.log("Apps Script URL initialized:", scriptUrl);
    } else {
      console.error("VITE_APPS_SCRIPT_URL is missing! Data will not be synced to Google Sheets.");
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRegistered && paymentStatus === "UNPAID") {
      interval = setInterval(async () => {
        if (paymentCode) {
          try {
            console.log(`Polling payment status for ${paymentCode} via proxy...`);
            const response = await fetch(`/api/payment-status?orderId=${paymentCode}`);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`[Payment Proxy] Received response for ${paymentCode}:`, data);
              
              if (data && data.status && String(data.status).toUpperCase() === "PAID") {
                console.log("[Payment] SUCCESS! Switching to PAID state.");
                setPaymentStatus("PAID");
              }
            }
          } catch (error) {
            console.error("Error polling payment status via proxy:", error);
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isRegistered, paymentStatus, paymentCode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRegistered && paymentStatus === "UNPAID") {
      timer = setTimeout(() => {
        setShowManualButton(true);
      }, 60000); // 1 minute
    }
    return () => clearTimeout(timer);
  }, [isRegistered, paymentStatus]);

  const handleRegister = async () => {
    if (isSubmitting) return;
    setError(null);
    console.log("handleRegister called with:", formData);

    if (!formData.name || !formData.phone || !formData.email) {
      setError("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    // Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Email không đúng định dạng!");
      return;
    }

    // Validate Phone format (Vietnam standard: 10 digits starting with 0)
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ""))) {
      setError("Số điện thoại không đúng định dạng (10 số)!");
      return;
    }

    setIsSubmitting(true);
    try {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const newOrderCode = `VIDEOAI${randomNum}`;
      
      console.log("Generated order code:", newOrderCode);
      setPaymentCode(newOrderCode);

      // Sync to Google Sheet via Proxy
      const params = new URLSearchParams();
      params.append("orderId", newOrderCode);
      params.append("name", formData.name);
      params.append("email", formData.email);
      params.append("phone", formData.phone);
      params.append("status", "UNPAID");
      params.append("action", "register");

      console.log("Initiating registration sync via proxy...");
      const response = await fetch(`/api/register?${params.toString()}`, {
        method: "GET",
      });
      
      const text = await response.text();
      console.log("Proxy sync response:", text);

      if (!response.ok || text.includes("Error") || text.includes("Exception") || text.includes("<!DOCTYPE")) {
        console.error("Proxy sync failed:", text);
        
        let errorMessage = "Không thể kết nối với Google Sheet qua máy chủ.";
        try {
          const errorData = JSON.parse(text);
          if (errorData.details) {
            errorMessage = errorData.details;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Not JSON, use default or check for common HTML patterns
          if (text.includes("<title>錯誤</title>") || text.includes("<title>错误</title>")) {
            errorMessage = "Lỗi quyền truy cập: Google đang chặn yêu cầu. Hãy chắc chắn chọn 'Anyone' khi Deploy và dùng Gmail cá nhân.";
          }
        }
        
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      setIsRegistered(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Có lỗi xảy ra khi kết nối máy chủ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRegistered) {
    if (paymentStatus === "PAID") {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] shadow-2xl shadow-emerald-100 border border-emerald-50 overflow-hidden sticky top-28 p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Chúc mừng thành công!</h3>
          <p className="text-slate-600 font-medium">
            Hệ thống đã ghi nhận thanh toán của bạn. Chào mừng bạn đến với khóa học Video AI thực chiến!
          </p>
          <a 
            href={ZALO_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 group"
          >
            VÀO NHÓM ZALO NGAY
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      );
    }

    if (paymentStatus === "MANUAL") {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] shadow-2xl shadow-blue-100 border border-blue-50 overflow-hidden sticky top-28 p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Đã gửi yêu cầu!</h3>
          <p className="text-slate-600 font-medium">
            Tôi sẽ kiểm tra thủ công và duyệt bạn vào nhóm sớm nhất có thể. Vui lòng tham gia nhóm Zalo bên dưới để chờ duyệt.
          </p>
          <a 
            href={ZALO_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 group"
          >
            VÀO NHÓM CHỜ DUYỆT
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      );
    }

    return (
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-100 border border-blue-50 overflow-hidden sticky top-28 animate-in fade-in zoom-in duration-500">
        <div className="bg-blue-600 p-6 text-white text-center">
          <h3 className="text-xl font-black tracking-tighter uppercase">Thanh toán giữ chỗ</h3>
          <p className="text-xs font-bold opacity-80 mt-1">Quét mã QR để hoàn tất đăng ký</p>
        </div>
        
        <div className="p-8 space-y-6 text-center">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 inline-block mx-auto relative">
            <img 
              src={`https://qr.sepay.vn/img?acc=962476LINQ&bank=BIDV&amount=597000&des=${paymentCode}&template=compact`}
              alt="SePay QR Payment"
              className="w-80 h-80 object-contain"
            />
            <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang chờ thanh toán...</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung chuyển khoản</p>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-xl font-black text-blue-600 tracking-wider">{paymentCode}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(paymentCode);
                  alert("Đã copy mã!");
                }}
                className="text-[10px] font-black text-blue-600 uppercase bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <p className="text-sm font-bold text-slate-900">Số tiền: <span className="text-blue-600">597.000 đ</span></p>
            
            <button 
              onClick={async () => {
                try {
                  const response = await fetch(`/api/payment-status?orderId=${paymentCode}`);
                  const data = await response.json();
                  if (data && data.status && String(data.status).toUpperCase() === "PAID") {
                    setPaymentStatus("PAID");
                  } else {
                    const rawInfo = data.raw ? `\n\nPhản hồi từ Script: ${data.raw}` : "";
                    alert(`Hệ thống chưa nhận được trạng thái PAID. Vui lòng đợi thêm giây lát hoặc kiểm tra lại nội dung chuyển khoản.${rawInfo}`);
                  }
                } catch (e) {
                  alert("Có lỗi khi kiểm tra qua máy chủ. Vui lòng thử lại sau.");
                }
              }}
              className="mt-2 text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all"
            >
              Kiểm tra ngay
            </button>

            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">
              * Sau khi chuyển khoản, hệ thống sẽ tự động nhận diện và chuyển hướng bạn.
            </p>
          </div>

          {showManualButton && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={async () => {
                if (paymentStatus === "MANUAL") return;
                setPaymentStatus("MANUAL");
                
                if (paymentCode) {
                  try {
                    const params = new URLSearchParams();
                    params.append("orderId", paymentCode);
                    params.append("name", formData.name);
                    params.append("email", formData.email);
                    params.append("phone", formData.phone);
                    params.append("status", "MANUAL");
                    params.append("action", "register");
                    
                    console.log("Sending manual confirmation via proxy...");
                    fetch(`/api/register?${params.toString()}`, { method: "GET" })
                      .then(res => res.text())
                      .then(text => console.log("Manual sync response via proxy:", text))
                      .catch(err => console.error("Manual sync error via proxy:", err));
                  } catch (e) {
                    console.error("Error updating manual status via proxy:", e);
                  }
                }
              }}
              className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <AlertCircle size={16} />
              Xác nhận đã thanh toán
            </motion.button>
          )}

          <button 
            onClick={() => setIsRegistered(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Quay lại chỉnh sửa thông tin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="registration-form" className="bg-white rounded-[2rem] shadow-2xl shadow-blue-100 border border-blue-50 overflow-hidden lg:sticky lg:top-28">
      <div className="bg-blue-50/50 p-4 flex items-center justify-center gap-8 border-b border-blue-100">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
          <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center">
            <CheckCircle2 size={12} />
          </div>
          Vào nhóm Zalo
        </div>
        <div className="text-slate-400 font-bold text-sm">Hướng dẫn trực tiếp</div>
      </div>

      <div className="p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">THAM GIA NHÓM HỌC</h3>
          <p className="text-sm text-slate-500 font-medium">Để được hướng dẫn trực tiếp và nhận tài liệu buổi học</p>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[11px] text-blue-700 font-bold leading-relaxed text-left space-y-2">
            <div className="flex gap-2">
              <div className="shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px]">1</div>
              <p>Bạn sẽ được vào <strong>nhóm Zalo riêng tư</strong> để được tư vấn và hỗ trợ tốt nhất.</p>
            </div>
            <div className="flex gap-2">
              <div className="shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px]">2</div>
              <p>Bạn sẽ nhận được <strong>Email</strong> và <strong>tin nhắn Zalo</strong> để xác thực thông tin.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Họ tên *</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Nhập tên của bạn..." 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Số điện thoại *</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="09xx..." 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email nhận tài liệu *</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                placeholder="example@gmail.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-blue-600" />
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Giá khóa học</p>
              <p className="text-xl font-black text-blue-600">597.000 đ</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleRegister}
          disabled={isSubmitting}
          className={`w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 group active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? "ĐANG XỬ LÝ..." : "ĐĂNG KÝ HỌC NGAY"}
          {!isSubmitting && <ArrowRight className="group-hover:translate-x-1 transition-transform" />}
        </button>

        {/* Debug Info for User */}
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-black">Công cụ kiểm tra kết nối</p>
          <div className="flex flex-wrap gap-2">
            <a 
              href={getScriptUrl()} 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors font-bold shadow-sm"
            >
              Mở Link Script Trực Tiếp
            </a>
            <button 
              type="button"
              onClick={() => alert(`URL hiện tại: ${getScriptUrl()}`)}
              className="text-[10px] bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors font-bold shadow-sm"
            >
              Xem URL Cấu Hình
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic font-medium leading-relaxed">
            * Nếu mở link trực tiếp mà không thấy chữ "READY", nghĩa là Script chưa được cấu hình đúng.
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-400 font-bold mt-6 flex items-center justify-center gap-2">
          <Lock size={12} />
          Cam kết: Hướng dẫn cho đến khi làm được video.
        </p>
      </div>
    </div>
  );
};

const ModuleCard = ({ id, title, desc, value }: { id: string, title: string, desc: string, value: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all flex gap-4"
  >
    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
      {id === "01" ? <Zap size={24} /> : id === "02" ? <Code size={24} /> : id === "03" ? <Video size={24} /> : <MessageSquare size={24} />}
    </div>
    <div>
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">// module_{id}</p>
      <h4 className="text-lg font-black text-slate-900 leading-tight mb-2">{title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">{desc}</p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
        <Gift size={12} className="text-blue-600" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valued at: <span className="text-blue-600">{value}</span></span>
      </div>
    </div>
  </motion.div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <Header />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        <div className="grid lg:grid-cols-[1fr_420px] gap-16">
          {/* Left Content */}
          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-8">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                Live • Workshop Online
              </div>
              
              <h1 className="font-display text-7xl lg:text-9xl font-black text-slate-900 leading-tight mb-12 tracking-tighter">
                HƯỚNG DẪN TẠO VIDEO <span className="text-blue-600">AI</span>_
              </h1>

              <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-50/50 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 bg-blue-600 h-full" />
                <p className="text-2xl font-bold text-slate-700 leading-relaxed mb-8">
                  Làm chủ công nghệ AI - Tự tay tạo video chuyên nghiệp triệu view, xây kênh Affiliate thần tốc.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-emerald-50 px-6 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100">
                    <Globe size={20} className="text-emerald-600" />
                    <span className="text-sm font-black text-emerald-600">Hình thức: Hướng dẫn trực tiếp trong nhóm cho đến khi làm được</span>
                  </div>
                </div>
              </div>

              <p className="mt-12 text-lg text-slate-500 font-medium leading-relaxed">
                Chương trình đào tạo thực chiến mới nhất. Đăng ký ngay để nhận <span className="text-slate-900 font-bold underline decoration-blue-500 decoration-2 underline-offset-4">Tài khoản Gemini Pro 1 năm</span> + <span className="text-slate-900 font-bold underline decoration-blue-500 decoration-2 underline-offset-4">Kho kịch bản triệu view</span> sau buổi học.
              </p>
            </motion.div>

            {/* Modules Grid */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ai_vibe_config.json</span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <ModuleCard 
                  id="01" 
                  title="Tài khoản Gemini Pro 1 năm (Chính chủ)" 
                  desc="Sử dụng đầy đủ tính năng AI mạnh nhất từ Google" 
                  value="1.200.000đ" 
                />
                <ModuleCard 
                  id="02" 
                  title="Quy trình tạo Video AI triệu view" 
                  desc="Xây kênh TikTok, Reels, Shorts tự động hóa" 
                  value="1.500.000đ" 
                />
                <ModuleCard 
                  id="03" 
                  title="Kỹ thuật Prompt Video AI chuyên sâu" 
                  desc="Làm chủ Veo 3, Kling AI, Luma Dream Machine" 
                  value="1.200.000đ" 
                />
                <ModuleCard 
                  id="04" 
                  title="Kho kịch bản & Prompt mẫu" 
                  desc="Tặng 1000+ kịch bản video AI chuyển đổi cao" 
                  value="900.000đ" 
                />
              </div>

              {/* New Chatbot Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden border border-slate-800 shadow-2xl"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -z-10" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 blur-[100px] -z-10" />
                
                <div className="flex flex-col md:flex-row gap-12 items-center">
                  <div className="shrink-0 w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                    <MessageSquare size={48} className="text-white" />
                  </div>
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                      Exclusive Bonus
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter leading-tight">
                      Chatbot chuyên sâu <br />
                      <span className="text-blue-500">Tối ưu riêng cho tạo video trên Veo 3</span>
                    </h3>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">
                      Tặng kho chatbot được tạo sẵn chỉ việc điền yêu cầu sẽ ra prompt tạo video chuyên nghiệp. Tiết kiệm 90% thời gian lên ý tưởng và viết kịch bản.
                    </p>
                    <div className="flex items-center gap-4 pt-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800" />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Đã kích hoạt cho 500+ học viên</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <div className="text-right">
                <p className="text-xl font-black text-slate-400 tracking-tighter">
                  total_value = <span className="text-blue-600">8.500.000 đ</span>;
                </p>
              </div>
            </div>

            {/* Instructor Section */}
            <section className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-12">
                <Users size={24} className="text-blue-600" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Người chia sẻ</h2>
              </div>

              <div className="grid md:grid-cols-[300px_1fr] gap-12 items-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] rotate-3 group-hover:rotate-6 transition-transform -z-10 opacity-10" />
                  <div className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[3/4] border-4 border-white bg-slate-100">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1duLP1od6WR_LzWOGN80I25BDXGO1CHbU" 
                      alt="Đầu Gỗ" 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white border-4 border-white shadow-xl">
                    <CheckCircle2 size={24} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Đầu Gỗ</h3>
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
                      Nhóm AI Nhanh Cho Người Mới
                    </span>
                  </div>

                  <ul className="space-y-4">
                    {[
                      "Kinh nghiệm 4 năm chuyên sâu về Video AI",
                      "Hướng dẫn cho đến khi bạn tự tay làm được video AI hoàn chỉnh",
                      "500.000++ followers trên TikTok về AI, Kinh Doanh & Marketing",
                      "Quản Trị Viên Group AI (200.000++ thành viên)",
                      "Triển khai Marketing cho nhiều công ty với các ngành hàng khác nhau"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-600 font-medium leading-relaxed">
                        <div className="mt-1.5 shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                          <Zap size={8} fill="currentColor" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Right Sidebar - Sticky Form */}
          <div className="block">
            <RegistrationForm />
            
            <div className="mt-12 text-center">
              <div className="flex justify-center -space-x-3 mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?img=${i + 30}`} alt="Member" referrerPolicy="no-referrer" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-4 border-white bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm">
                  +1k
                </div>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">1,000+ members joined</p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Form (at bottom) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50">
        <button 
          onClick={() => {
            document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
        >
          ĐĂNG KÝ HỌC NGAY
          <ArrowRight size={20} />
        </button>
      </div>

      <footer className="bg-slate-50 pt-12 pb-32 lg:pb-12 border-t border-slate-100 text-center">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">© 2024 ĐẦU GỖ • AI.VIBE.CODE</p>
      </footer>
    </div>
  );
}
