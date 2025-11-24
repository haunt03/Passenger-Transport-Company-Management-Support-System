import { getCookie } from '../../utils/cookies';
// src/components/driver/DriverLeaveRequestPage.jsx
import React from "react";
import { getDriverProfileByUser, requestDayOff } from "../../api/drivers";
import {
    Calendar,
    Send,
    Info,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";

/**
 * DriverLeaveRequestPage – Module 2.S5 (LIGHT THEME)
 * - Tài xế gửi yêu cầu nghỉ phép.
 * - Light UI: bg-slate-50, card trắng, border-slate-200, accent sky/emerald.
 */

const cls = (...a) => a.filter(Boolean).join(" ");

// mini toast (light)
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2500) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
    };
    return { toasts, push };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-lg px-3 py-2 text-sm border shadow-lg",
                        t.kind === "success" &&
                        "bg-emerald-50 border-emerald-200 text-emerald-700",
                        t.kind === "error" &&
                        "bg-rose-50 border-rose-200 text-rose-700",
                        t.kind === "info" && "bg-blue-50 border-blue-200 text-blue-700",
                        !["success", "error", "info"].includes(t.kind) && "bg-white border-slate-200 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

// tính số ngày nghỉ (cả ngày đầu và cuối)
function diffDaysInclusive(startISO, endISO) {
    if (!startISO || !endISO) return 0;
    const s = new Date(startISO + "T00:00:00");
    const e = new Date(endISO + "T00:00:00");
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
    const ms = e.getTime() - s.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days + 1;
}

export default function DriverLeaveRequestPage() {
    // giả lập quota còn lại trong tháng
    const remainingDays = 2;

    const { toasts, push } = useToasts();

    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [reason, setReason] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState("");

    const requestedDays = diffDaysInclusive(startDate, endDate);

    const validDateOrder =
        startDate && endDate ? new Date(startDate) <= new Date(endDate) : false;

    // Kiểm tra ngày bắt đầu không được trong quá khứ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = startDate ? new Date(startDate + "T00:00:00") : null;
    const isStartDateValid = startDateObj ? startDateObj >= today : false;

    const withinAllowance = requestedDays > 0 && requestedDays <= remainingDays;

    const hasReason = reason.trim().length >= 10;

    const canSubmit = validDateOrder && withinAllowance && hasReason && isStartDateValid && !submitting;

    async function onSubmit() {
        if (!canSubmit) {
            setErrorMsg("Vui lòng kiểm tra lại ngày nghỉ và lý do trước khi gửi.");
            return;
        }

        setSubmitting(true);
        setErrorMsg("");

        const payload = {
            start_date: startDate,
            end_date: endDate,
            reason: reason.trim(),
        };

        try {
            const uid = getCookie("userId");
            if (!uid) throw new Error("NO_USER");
            const profile = await getDriverProfileByUser(uid);
            await requestDayOff(profile.driverId, { startDate, endDate, reason: reason.trim() });
            await new Promise((r) => setTimeout(r, 500));

            push(
                `Đã gửi yêu cầu nghỉ ${payload.start_date} → ${payload.end_date} (${requestedDays} ngày)`,
                "success"
            );

            setStartDate("");
            setEndDate("");
            setReason("");
        } catch {
            setErrorMsg("Không thể gửi yêu cầu nghỉ. Vui lòng thử lại hoặc báo quản lý.");
            push("Gửi thất bại", "error");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 p-6">
            <Toasts toasts={toasts} />

            {/* HEADER CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 px-5 py-6 mb-6 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-semibold text-xl leading-tight flex flex-wrap items-center gap-2">
                            Đăng ký nghỉ
                            <span className="rounded-md border border-sky-300 bg-sky-50 text-sky-700 text-[10px] font-medium px-2 py-[2px]">
                                Driver Portal
                            </span>
                        </div>

                        <div className="text-[12px] text-slate-600 leading-snug mt-1">
                            Gửi yêu cầu nghỉ phép để điều phối và kế toán nắm lịch. Hệ thống sẽ
                            từ chối nếu vượt quá hạn mức nghỉ trong tháng hoặc trùng chuyến đã gán.
                        </div>
                    </div>

                    <div className="flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm min-w-[220px]">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                            <Info className="h-3.5 w-3.5 text-sky-600" />
                            <span>Ngày nghỉ còn lại trong tháng</span>
                        </div>
                        <div className="text-slate-900 font-semibold text-lg leading-none flex items-center gap-2">
                            {remainingDays}{" "}
                            <span className="text-[11px] font-medium text-slate-500">ngày</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2 leading-normal">
                            Tính theo chính sách HR / MAX_DRIVER_LEAVE_DAYS.
                        </div>
                    </div>
                </div>

                <div className="text-[11px] text-slate-600 leading-relaxed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    Lưu ý: Nếu bạn có chuyến đã gán trong khoảng thời gian xin nghỉ, điều phối viên
                    có thể từ chối hoặc yêu cầu đổi người chạy.
                </div>
            </div>

            {/* FORM CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 max-w-3xl mx-auto">
                <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2 text-sm bg-slate-50/70">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <div className="font-medium text-slate-700">Thông tin yêu cầu nghỉ</div>
                    <div className="ml-auto text-[11px] text-slate-500">
                        POST /api/driver/leave-requests
                    </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Ngày bắt đầu */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[12px] text-slate-600 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Ngày bắt đầu nghỉ</span>
                        </div>
                        <input
                            type="date"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        {startDate && !isStartDateValid ? (
                            <div className="text-[11px] text-rose-600">
                                Ngày bắt đầu không được trong quá khứ
                            </div>
                        ) : null}
                    </div>

                    {/* Ngày kết thúc */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[12px] text-slate-600 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Ngày kết thúc nghỉ</span>
                        </div>
                        <input
                            type="date"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    {/* Tổng số ngày xin nghỉ */}
                    <div className="md:col-span-2 flex flex-col gap-1">
                        <div className="text-[12px] text-slate-600 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                            <span>Tổng số ngày xin nghỉ (tính cả ngày đầu & cuối)</span>
                        </div>

                        <div
                            className={cls(
                                "rounded-lg px-3 py-2 text-sm border shadow-sm flex items-center gap-2",
                                requestedDays > 0
                                    ? "text-slate-900 bg-white border-slate-300"
                                    : "text-slate-500 bg-slate-50 border-slate-200"
                            )}
                        >
                            <span className="text-slate-900 font-medium text-base tabular-nums">
                                {requestedDays}
                            </span>
                            <span className="text-[11px] text-slate-500">ngày</span>

                            {requestedDays > remainingDays ? (
                                <span className="ml-auto flex items-center gap-1 text-[11px] text-rose-600">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Vượt quá số ngày cho phép
                                </span>
                            ) : requestedDays > 0 && requestedDays <= remainingDays && validDateOrder ? (
                                <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Hợp lệ
                                </span>
                            ) : null}
                        </div>

                        {!validDateOrder && startDate && endDate ? (
                            <div className="text-[11px] text-rose-600">
                                Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.
                            </div>
                        ) : null}
                    </div>

                    {/* Lý do */}
                    <div className="md:col-span-2 flex flex-col gap-1">
                        <div className="text-[12px] text-slate-600 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                            <span>Lý do xin nghỉ</span>
                        </div>
                        <textarea
                            rows={4}
                            className={cls(
                                "w-full border rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 text-sm resize-none shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
                                reason.trim().length > 0 && reason.trim().length < 10
                                    ? "border-rose-400 bg-rose-50"
                                    : "border-slate-300 bg-white"
                            )}
                            placeholder="VD: Việc gia đình, khám sức khỏe, ..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={500}
                        />
                        <div className="flex items-center justify-between mt-1">
                            {reason.trim().length > 0 && reason.trim().length < 10 ? (
                                <div className="text-xs text-rose-600">
                                    Lý do phải có ít nhất 10 ký tự
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400">
                                    {reason.length}/500 ký tự
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Policy note */}
                    <div className="md:col-span-2 text-[11px] leading-relaxed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                        Sau khi gửi, yêu cầu sẽ chờ duyệt. Bạn sẽ nhận thông báo khi trạng thái
                        cập nhật (Được duyệt / Từ chối).
                    </div>

                    {errorMsg ? (
                        <div className="md:col-span-2 text-[12px] text-rose-600">{errorMsg}</div>
                    ) : null}
                </div>

                {/* FOOTER */}
                <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap items-center gap-3 justify-between bg-slate-50/60">
                    <div className="text-[11px] text-slate-600 leading-relaxed">
                        Endpoint dự kiến:{" "}
                        <code className="bg-slate-100 text-slate-700 px-1 py-[1px] rounded">
                            /api/driver/leave-requests
                        </code>
                    </div>

                    <button
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        className={cls(
                            "rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 shadow-sm",
                            canSubmit
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        <Send className="h-4 w-4" />
                        {submitting ? "Đang gửi..." : "Gửi yêu cầu nghỉ"}
                    </button>
                </div>
            </div>
        </div>
    );
}