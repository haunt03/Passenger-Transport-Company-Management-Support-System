import React from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, forgotPassword as apiForgotPassword } from "../../api/auth";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowRight,
    ShieldCheck,
    Info,
    CheckCircle2,
} from "lucide-react";

/**
 * LoginPage – Light Theme version
 *
 * - Giao diện sáng, đồng bộ với các màn admin light (sky/slate)
 * - Giữ nguyên logic login mock, payload preview, validate
 *
 * API dự kiến:
 * POST /api/auth/login
 * body = { email, password, remember_me }
 * response -> { token, user { role, branch_id ... } }
 */

const cls = (...a) => a.filter(Boolean).join(" ");

export default function LoginPage() {
    const navigate = useNavigate();
    // form state
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPw, setShowPw] = React.useState(false);
    const [rememberMe, setRememberMe] = React.useState(true);

    // ui state
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [showForgotPassword, setShowForgotPassword] = React.useState(false);
    const [forgotEmail, setForgotEmail] = React.useState("");
    const [forgotLoading, setForgotLoading] = React.useState(false);
    const [forgotSuccess, setForgotSuccess] = React.useState(false);

    const canSubmit =
        email.trim() !== "" &&
        password.trim() !== "" &&
        !loading;

    async function handleLogin(e) {
        e.preventDefault();
        if (!canSubmit) return;

        setLoading(true);
        setError("");

        const creds = {
            username: email.trim(),
            password: password.trim(),
        };

        try {
            const data = await apiLogin(creds);
            console.log("Login response:", data);

            // Store user info
            if (rememberMe) {
                try {
                    localStorage.setItem("username", data?.username || creds.username);
                    localStorage.setItem("roleName", data?.roleName || "");
                    if (data?.userId) {
                        localStorage.setItem("userId", String(data.userId));
                    }
                } catch (err) {
                    console.error("Failed to save user info:", err);
                }
            }

            // Navigate based on role
            const role = data?.roleName || "";
            console.log("User role:", role);

            if (role === "ADMIN") {
                navigate("/analytics/admin", { replace: true });
            } else if (role === "MANAGER") {
                navigate("/analytics/manager", { replace: true });
            } else if (role === "DRIVER") {
                navigate("/driver/dashboard", { replace: true });
            } else if (role === "CONSULTANT") {
                navigate("/orders/dashboard", { replace: true });
            } else if (role === "COORDINATOR") {
                navigate("/dispatch", { replace: true });
            } else if (role === "ACCOUNTANT") {
                navigate("/accounting", { replace: true });
            } else {
                // Default fallback
                navigate("/analytics/admin", { replace: true });
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err?.data?.message || "Email hoặc mật khẩu không chính xác.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 text-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-100 rounded-full blur-3xl opacity-30"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* LOGIN CARD */}
                <form
                    onSubmit={handleLogin}
                    noValidate
                    className={cls(
                        "rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-900/5",
                        "flex flex-col gap-6 p-8 md:p-10"
                    )}
                >
                    {/* HEADER / BRAND */}
                    <div className="space-y-4 text-center">
                        {/* Logo badge */}
                        <div className="inline-flex items-center justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/40 ring-4 ring-sky-100">
                                <ShieldCheck className="h-8 w-8" strokeWidth={2} />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                FleetOps Console
                            </div>
                            <div className="text-sm text-slate-500 font-medium">
                                Đăng nhập hệ thống điều hành
                            </div>
                        </div>
                    </div>

                    {/* EMAIL FIELD */}
                    <div className="space-y-2.5">
                        <label className="text-sm font-medium text-slate-700">
                            Email / Tên đăng nhập
                        </label>

                        <div className="group relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all"
                                placeholder="Nhập email hoặc tên đăng nhập"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* PASSWORD FIELD */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">
                                Mật khẩu
                            </label>

                            <button
                                type="button"
                                className="text-xs text-sky-600 hover:text-sky-700 font-medium hover:underline transition-colors"
                                onClick={() => setShowForgotPassword(true)}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        <div className="group relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all"
                                placeholder="Nhập mật khẩu của bạn"
                                autoComplete="current-password"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                title={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                {showPw ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* REMEMBER ME */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none group">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/30 cursor-pointer"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="group-hover:text-slate-900 transition-colors">Ghi nhớ đăng nhập</span>
                        </label>
                    </div>

                    {/* ERROR BOX */}
                    {error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
                            <Info className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
                            <div className="font-medium">{error}</div>
                        </div>
                    ) : null}

                    {/* SUBMIT BUTTON */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={cls(
                            "w-full rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg",
                            "flex items-center justify-center gap-2 transition-all duration-200",
                            canSubmit && !loading
                                ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.98]"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Đang đăng nhập...</span>
                            </>
                        ) : (
                            <>
                                <span>Đăng nhập</span>
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>

                    {/* SECURITY INFO */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Kết nối bảo mật · Mã hóa end-to-end</span>
                    </div>

                    {/* FOOTER */}
                    <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
                        © 2025 FleetOps Console · Internal Access Portal
                    </div>
                </form>
            </div>

            {/* FORGOT PASSWORD MODAL */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-8 space-y-5 animate-slideUp">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">
                                Quên mật khẩu
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setForgotEmail("");
                                    setForgotSuccess(false);
                                    setError("");
                                }}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {forgotSuccess ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />
                                        <div>
                                            <p className="font-semibold">Email đã được gửi!</p>
                                            <p className="mt-1.5 text-emerald-600">
                                                Chúng tôi đã gửi link đặt lại mật khẩu đến email <strong>{forgotEmail}</strong>.
                                                Vui lòng kiểm tra hộp thư của bạn.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPassword(false);
                                        setForgotEmail("");
                                        setForgotSuccess(false);
                                    }}
                                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-3 text-sm font-semibold text-white hover:from-sky-600 hover:to-sky-700 transition-all"
                                >
                                    Đóng
                                </button>
                            </div>
                        ) : (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!forgotEmail.trim()) {
                                        setError("Vui lòng nhập email");
                                        return;
                                    }

                                    setForgotLoading(true);
                                    setError("");

                                    try {
                                        await apiForgotPassword(forgotEmail.trim());
                                        setForgotSuccess(true);
                                    } catch (err) {
                                        setError(err.message || "Không thể gửi email. Vui lòng thử lại sau.");
                                    } finally {
                                        setForgotLoading(false);
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div className="space-y-2.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        Email đăng ký
                                    </label>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                                        placeholder="Nhập email của bạn"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
                                        <Info className="h-5 w-5 flex-shrink-0 text-red-500" />
                                        <div className="font-medium">{error}</div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setForgotEmail("");
                                            setError("");
                                        }}
                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!forgotEmail.trim() || forgotLoading}
                                        className={cls(
                                            "flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                                            forgotEmail.trim() && !forgotLoading
                                                ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700"
                                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        )}
                                    >
                                        {forgotLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                                Đang gửi...
                                            </>
                                        ) : (
                                            "Gửi email"
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}