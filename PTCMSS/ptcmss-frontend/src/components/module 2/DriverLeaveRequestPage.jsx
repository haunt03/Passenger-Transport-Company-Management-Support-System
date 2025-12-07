import { getCookie } from '../../utils/cookies';
// src/components/driver/DriverLeaveRequestPage.jsx
import React from "react";
import { getDriverProfileByUser, requestDayOff, getDayOffHistory } from "../../api/drivers";
import {
    Calendar,
    Send,
    Info,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Clock,
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
        <div className="fixed top-4 right-4 z-50 space-y-2 animate-fade-in">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-xl px-4 py-3 text-sm border shadow-lg flex items-center gap-2",
                        t.kind === "success" &&
                        "bg-emerald-50 border-emerald-200 text-emerald-700",
                        t.kind === "error" &&
                        "bg-rose-50 border-rose-200 text-rose-700",
                        t.kind === "info" && "bg-blue-50 border-blue-200 text-blue-700",
                        !["success", "error", "info"].includes(t.kind) && "bg-white border-slate-200 text-slate-700"
                    )}
                >
                    {t.kind === "success" && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                    {t.kind === "error" && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
                    {t.kind === "info" && <Info className="h-4 w-4 flex-shrink-0" />}
                    <span>{t.msg}</span>
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
    const { toasts, push } = useToasts();

    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [reason, setReason] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState("");
    const [daysOffAllowed, setDaysOffAllowed] = React.useState(2);
    const [daysOffUsed, setDaysOffUsed] = React.useState(0);
    const [loading, setLoading] = React.useState(true);

    // Load driver's day off statistics
    React.useEffect(() => {
        async function loadDayOffStats() {
            try {
                const uid = getCookie("userId");
                if (!uid) return;

                const profile = await getDriverProfileByUser(uid);
                const dayOffList = await getDayOffHistory(profile.driverId);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Filter approved day-offs in current month
                const approvedDayOffs = Array.isArray(dayOffList)
                    ? dayOffList.filter((dayOff) => {
                        if (dayOff.status !== "APPROVED") return false;

                        const leaveDate = dayOff.date || dayOff.leaveDate || dayOff.startDate;
                        if (!leaveDate) return false;

                        const date = new Date(leaveDate);
                        if (isNaN(date.getTime())) return false;

                        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                    })
                    : [];

                // Count days
                let used = 0;
                approvedDayOffs.forEach((dayOff) => {
                    const startDate = new Date(dayOff.startDate || dayOff.date || dayOff.leaveDate);
                    const endDate = dayOff.endDate ? new Date(dayOff.endDate) : startDate;

                    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                        const monthStart = new Date(currentYear, currentMonth, 1);
                        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);
                        monthStart.setHours(0, 0, 0, 0);
                        monthEnd.setHours(23, 59, 59, 999);

                        const start = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
                        const end = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));

                        if (end >= start) {
                            const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            used += diffDays;
                        }
                    } else {
                        used += 1;
                    }
                });

                setDaysOffUsed(used);
                setDaysOffAllowed(profile.daysOffAllowed || 2);
            } catch (err) {
                console.error("Failed to load day off stats:", err);
            } finally {
                setLoading(false);
            }
        }

        loadDayOffStats();
    }, []);

    const remainingDays = daysOffAllowed - daysOffUsed;
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
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 p-6">
            <Toasts toasts={toasts} />

            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Calendar className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Xin nghỉ phép</h1>
                        <p className="text-sm text-slate-600 mt-1">Gửi yêu cầu nghỉ phép để điều phối và kế toán nắm lịch</p>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Ngày nghỉ còn lại trong tháng</div>
                                <div className="flex items-baseline gap-2">
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                    ) : (
                                        <>
                                            <span className="text-3xl font-bold text-slate-900">{remainingDays}</span>
                                            <span className="text-sm text-slate-600">ngày</span>
                                        </>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {loading ? "Đang tải..." : `Đã dùng ${daysOffUsed}/${daysOffAllowed} ngày trong tháng này`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900 leading-relaxed">
                            Lưu ý: Nếu bạn có chuyến đã gán trong khoảng thời gian xin nghỉ, điều phối viên có thể từ chối hoặc yêu cầu đổi người chạy.
                        </p>
                    </div>
                </div>
            </div>

            {/* FORM CARD */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
                <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Thông tin yêu cầu nghỉ</h2>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Ngày bắt đầu */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            Ngày bắt đầu nghỉ <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={cls(
                                "w-full border rounded-xl px-4 py-3 text-slate-900 text-sm transition-all duration-200",
                                startDate && !isStartDateValid
                                    ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                    : "border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            )}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        {startDate && !isStartDateValid && (
                            <div className="text-xs text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Ngày bắt đầu không được trong quá khứ
                            </div>
                        )}
                    </div>

                    {/* Ngày kết thúc */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            Ngày kết thúc nghỉ <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={cls(
                                "w-full border rounded-xl px-4 py-3 text-slate-900 text-sm transition-all duration-200",
                                endDate && startDate && !validDateOrder
                                    ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                    : "border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            )}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        {!validDateOrder && startDate && endDate && (
                            <div className="text-xs text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Ngày kết thúc phải sau hoặc bằng ngày bắt đầu
                            </div>
                        )}
                    </div>

                    {/* Tổng số ngày xin nghỉ */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Info className="h-4 w-4 text-slate-500" />
                            Tổng số ngày xin nghỉ (tính cả ngày đầu & cuối)
                        </label>

                        <div
                            className={cls(
                                "rounded-xl px-4 py-3 border flex items-center gap-3 transition-all duration-200",
                                requestedDays > 0 && requestedDays <= remainingDays && validDateOrder
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                    : requestedDays > remainingDays
                                        ? "bg-rose-50 border-rose-200 text-rose-900"
                                        : "bg-slate-50 border-slate-200 text-slate-500"
                            )}
                        >
                            <span className="text-2xl font-bold tabular-nums">
                                {requestedDays}
                            </span>
                            <span className="text-sm text-slate-600">ngày</span>

                            {requestedDays > remainingDays ? (
                                <span className="ml-auto flex items-center gap-2 text-sm font-medium">
                                    <AlertTriangle className="h-4 w-4" />
                                    Vượt quá số ngày cho phép
                                </span>
                            ) : requestedDays > 0 && requestedDays <= remainingDays && validDateOrder ? (
                                <span className="ml-auto flex items-center gap-2 text-sm font-medium">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Hợp lệ
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {/* Lý do */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Info className="h-4 w-4 text-slate-500" />
                            Lý do xin nghỉ <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={5}
                            className={cls(
                                "w-full border rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm resize-none transition-all duration-200",
                                reason.trim().length > 0 && reason.trim().length < 10
                                    ? "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                    : "border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            )}
                            placeholder="VD: Việc gia đình, khám sức khỏe, ..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                            {reason.trim().length > 0 && reason.trim().length < 10 ? (
                                <div className="text-xs text-rose-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Lý do phải có ít nhất 10 ký tự
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500">
                                    {reason.length}/500 ký tự
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Policy note */}
                    <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-900 leading-relaxed">
                                Sau khi gửi, yêu cầu sẽ chờ duyệt. Bạn sẽ nhận thông báo khi trạng thái cập nhật (Được duyệt / Từ chối).
                            </p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                            <div className="flex items-center gap-2 text-sm text-rose-700">
                                <AlertTriangle className="h-4 w-4" />
                                <span>{errorMsg}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 py-5 border-t border-slate-200 flex items-center justify-end gap-3 bg-gradient-to-r from-slate-50 to-slate-100">
                    <button
                        onClick={() => {
                            setStartDate("");
                            setEndDate("");
                            setReason("");
                            setErrorMsg("");
                        }}
                        className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200"
                    >
                        Đặt lại
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        className={cls(
                            "px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2 rounded-xl shadow-md transition-all duration-200",
                            canSubmit
                                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-lg transform hover:scale-105"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang gửi...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Gửi yêu cầu nghỉ
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}