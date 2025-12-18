import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { setPassword as setPasswordApi } from "../../api/auth";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Liên kết đặt mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có tối thiểu 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await setPasswordApi({ token, password, confirmPassword });
      navigate(
          "/verification-success?message=M%E1%BA%ADt+kh%E1%BA%A9u+%C4%91%C3%A3+%C4%91%C6%B0%E1%BB%A3c+thi%E1%BA%BFt+l%E1%BA%ADp"
      );
    } catch (err) {
      const message =
          err?.data?.message ||
          err?.message ||
          "Không thể thiết lập mật khẩu. Vui lòng thử lại.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
            <span className="rounded-xl bg-slate-100 text-slate-600 p-2">
              <Lock className="h-5 w-5" />
            </span>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Thiết lập mật khẩu
                </p>
                <p className="text-sm text-slate-500">
                  Chọn mật khẩu mới để bắt đầu sử dụng hệ thống
                </p>
              </div>
            </div>

            {!token ? (
                <div className="rounded-lg border border-info-200 bg-info-50 p-4 text-sm text-info-900 flex gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    Liên kết xác thực không hợp lệ hoặc đã được sử dụng trước đó.
                    Vui lòng yêu cầu quản trị viên gửi lại email kích hoạt.
                  </div>
                </div>
            ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Mật khẩu mới
                    </label>
                    <input
                        type="password"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Xác nhận mật khẩu
                    </label>
                    <input
                        type="password"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        autoComplete="new-password"
                    />
                  </div>

                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Tối thiểu 8 ký tự</li>
                    <li>• Khuyến nghị gồm chữ hoa, chữ thường và số</li>
                  </ul>

                  {error ? (
                      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {error}
                      </div>
                  ) : null}

                  <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
                  >
                    {submitting ? "Đang lưu..." : "Lưu mật khẩu"}
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </button>
                </form>
            )}

            <button
                onClick={() => navigate("/login")}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
  );
}

