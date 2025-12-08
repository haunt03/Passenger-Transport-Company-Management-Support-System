import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function VerificationSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [countdown, setCountdown] = useState(6);
    const message =
        searchParams.get("message") || "Mật khẩu đã được thiết lập thành công.";

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate("/login");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 text-center">
                    <div className="flex justify-center">
            <span className="rounded-full bg-emerald-50 border border-emerald-100 p-3 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </span>
                    </div>

                    <h1 className="text-xl font-semibold text-slate-900">
                        Hoàn tất thiết lập
                    </h1>
                    <p className="text-sm text-slate-600">{message.replace(/\+/g, " ")}</p>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
                        Bạn sẽ được chuyển về trang đăng nhập sau{" "}
                        <span className="font-semibold text-slate-800">{countdown}s</span>.
                    </div>

                    <button
                        onClick={() => navigate("/login")}
                        className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-semibold shadow-sm"
                    >
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        </div>
    );
}
