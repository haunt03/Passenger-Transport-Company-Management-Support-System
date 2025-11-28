import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function VerificationErrorPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const message =
        searchParams.get("message") || "Liên kết xác thực không khả dụng.";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 text-center">
                    <div className="flex justify-center">
            <span className="rounded-full bg-rose-50 border border-rose-100 p-3 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
            </span>
                    </div>

                    <h1 className="text-xl font-semibold text-slate-900">
                        Không thể xác thực
                    </h1>
                    <p className="text-sm text-slate-600">{message.replace(/\+/g, " ")}</p>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-left text-slate-500 space-y-1">
                        <p className="font-medium text-slate-700">Bạn có thể:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Kiểm tra lại xem link đã hết hạn hoặc dùng trước đó chưa.</li>
                            <li>Yêu cầu quản trị viên gửi lại email kích hoạt.</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => navigate("/login")}
                        className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-semibold shadow-sm"
                    >
                        Quay về đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
}