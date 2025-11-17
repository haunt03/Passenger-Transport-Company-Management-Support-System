import React from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../../api/auth";
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

    const canSubmit =
        email.trim() !== "" &&
        password.trim() !== "" &&
        !loading;

    // preview body để hiển thị panel phải
    const payloadPreview = React.useMemo(
        () => ({
            email: email || "...",
            password: password ? "***" : "",
            remember_me: rememberMe,
        }),
        [email, password, rememberMe]
    );

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
            // Optional: store username/role for UI
            if (rememberMe) {
                try {
                    localStorage.setItem("username", data?.username || creds.username);
                    localStorage.setItem("roleName", data?.roleName || "");
                } catch {}
            }
            navigate("/analytics/admin", { replace: true });
        } catch (err) {
            setError("Email hoặc mật khẩu không chính xác.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                {/* LEFT: LOGIN CARD */}
                <form
                    onSubmit={handleLogin}
                    noValidate
                    className={cls(
                        "rounded-xl border border-slate-200 bg-white shadow-sm",
                        "flex flex-col gap-6 p-6 md:p-8"
                    )}
                >
                    {/* HEADER / BRAND */}
                    <div className="space-y-3 text-center md:text-left">
                        {/* badge */}
                        <div className="inline-flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-600 text-white shadow-[0_10px_30px_rgba(2,132,199,.35)] ring-1 ring-sky-500/50">
                                <ShieldCheck className="h-5 w-5" />
                            </div>

                            <div className="flex flex-col leading-tight">
                                <div className="text-slate-900 text-sm font-semibold">
                                    FleetOps Console
                                </div>
                                <div className="text-[11px] text-slate-500 leading-snug">
                                    Internal Access Portal
                                </div>
                            </div>
                        </div>

                        {/* big title */}
                        <div className="text-xl md:text-[22px] font-semibold text-slate-900 leading-tight tracking-tight">
                            Đăng nhập hệ thống điều hành
                        </div>

                        <div className="text-[12px] leading-relaxed text-slate-500 max-w-[320px]">
                            Truy cập dashboard vận hành đội xe, tài chính và điều phối.
                            Quyền hiển thị tùy vai trò &amp; chi nhánh.
                        </div>
                    </div>

                    {/* EMAIL FIELD */}
                    <div className="space-y-2">
                        <label className="text-[11px] text-slate-600 flex items-center gap-2">
                            <span>Email / Tài khoản</span>
                            <span className="text-[10px] text-slate-400">(bắt buộc)</span>
                        </label>

                        <div className="group flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30">
                            <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-sky-600" />
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                                placeholder="tentaikhoan ho?c a@example.com"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* PASSWORD FIELD */}
                    <div className="space-y-2">
                        <div className="flex items-start justify-between text-[11px]">
                            <label className="text-slate-600 flex items-center gap-2">
                                <span>Mật khẩu</span>
                                <span className="text-[10px] text-slate-400">(bắt buộc)</span>
                            </label>

                            <button
                                type="button"
                                className="text-[10px] text-sky-600 hover:text-sky-500 font-medium"
                                onClick={() => {
                                    alert(
                                        "Đi tới luồng 'Quên mật khẩu' (prototype)."
                                    );
                                }}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        <div className="group flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30">
                            <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-sky-600" />
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                                placeholder="••••••"
                                autoComplete="current-password"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                title={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                {showPw ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        {/* remember + info */}
                        <div className="flex flex-wrap items-start justify-between gap-3 text-[11px] leading-relaxed">
                            <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 accent-sky-600"
                                    checked={rememberMe}
                                    onChange={(e) =>
                                        setRememberMe(e.target.checked)
                                    }
                                />
                                <span>Ghi nhớ đăng nhập</span>
                            </label>

                            <div className="text-slate-500 flex items-start gap-1 max-w-[220px]">
                                <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <span>
                                    Tài khoản sẽ bị tạm khoá nếu đăng nhập sai
                                    quá nhiều lần.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ERROR BOX */}
                    {error ? (
                        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 leading-relaxed flex items-start gap-2 shadow-sm">
                            <Info className="h-4 w-4 flex-shrink-0 text-rose-500" />
                            <div>{error}</div>
                        </div>
                    ) : null}

                    {/* SUBMIT BUTTON */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={cls(
                            "w-full rounded-md px-3 py-2.5 text-sm font-medium shadow-sm",
                            "flex items-center justify-center gap-2 transition-colors",
                            canSubmit && !loading
                                ? "bg-sky-600 text-white hover:bg-sky-500"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span>Đang đăng nhập...</span>
                            </>
                        ) : (
                            <>
                                <span>Đăng nhập</span>
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>

                    {/* TRUST ROW */}
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 leading-relaxed">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>
                            Kết nối bảo mật · Phiên đăng nhập được mã hoá
                        </span>
                    </div>
                </form>

                {/* RIGHT: TECH PANEL / PREVIEW */}
                <aside className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 text-[11px] leading-relaxed flex flex-col gap-4">
                    {/* headline */}
                    <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-sky-600" />
                            <span>Thông tin kỹ thuật</span>
                        </div>
                        <div className="text-slate-600 text-[11px] leading-relaxed">
                            Sau khi đăng nhập thành công, hệ thống trả về{" "}
                            <span className="text-slate-900 font-medium">
                                token
                            </span>{" "}
                            và thông tin người dùng. Token dùng cho các API nội bộ.
                        </div>
                    </div>

                    {/* endpoint preview */}
                    <section className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                            Endpoint
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-[11px] text-slate-700 break-all leading-relaxed shadow-sm">
                            POST /api/auth/login
                        </div>
                    </section>

                    {/* request body preview */}
                    <section className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                            Request Body Preview
                        </div>
                        <pre className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-words leading-relaxed shadow-sm">
{JSON.stringify(payloadPreview, null, 2)}
                        </pre>
                    </section>

                    {/* success preview */}
                    <section className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                            Response (200 OK) – ví dụ
                        </div>
                        <pre className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-words leading-relaxed shadow-sm">
{`{
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": 10,
    "role": "DRIVER",
    "branch_id": 1
  }
}`}
                        </pre>
                    </section>

                    {/* tips */}
                    <section className="text-[10px] text-slate-500 leading-relaxed">
                        Nếu đăng nhập thành công:
                        <br />
                        • Lưu token an toàn (localStorage / cookie httpOnly tuỳ mô hình).{"\n"}
                        • Điều hướng theo vai trò:
                        <span className="text-slate-800">
                            {" "}
                            Admin → Admin Dashboard · Manager → Manager Dashboard ·
                            Accountant → Accountant Dashboard · Driver → Driver App
                        </span>
                    </section>

                    <footer className="pt-2 text-center text-[10px] text-slate-400">
                        © 2025 FleetOps Prototype · Internal Only
                    </footer>
                </aside>
            </div>
        </div>
    );
}
