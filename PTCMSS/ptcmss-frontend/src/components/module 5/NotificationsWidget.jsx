import React from "react";
import {
    Bell,
    ShieldAlert,
    AlertTriangle,
    CalendarDays,
    Car,
    UserRound,
    BadgePercent,
    Check,
    X,
    RefreshCw,
} from "lucide-react";

/**
 * NotificationsWidget – phiên bản light (giống AdminBranchListPage)
 *
 * Màu & component rules copy từ AdminBranchListPage:
 * - Card: rounded-xl bg-white border border-slate-200 shadow-sm
 * - Header: bg-slate-50 border-b border-slate-200 text-slate-900
 * - Text chính: text-slate-900 / text-slate-700
 * - Subtext: text-slate-500
 * - Button primary-ish: border-sky-600 bg-sky-600 text-white (nếu cần). Ở đây duyệt / từ chối là outline màu emerald / rose giống InvoiceManagement light.
 * - Button ghost: border-slate-300 bg-white text-slate-700 hover:bg-slate-50
 */

const ENDPOINTS = {
    LIST: "/api/v1/coordinator/notifications",
    APPROVE_LEAVE: (id) =>
        `/api/v1/coordinator/leave-requests/${id}/approve`,
    APPROVE_DISCOUNT: (id) =>
        `/api/v1/coordinator/discount-requests/${id}/approve`,
};

// giả định reject endpoint
const REJECT_ENDPOINTS = {
    leave: (id) =>
        `/api/v1/coordinator/leave-requests/${id}/reject`,
    discount: (id) =>
        `/api/v1/coordinator/discount-requests/${id}/reject`,
};

export default function NotificationsWidget() {
    const [alerts, setAlerts] = React.useState([]);
    const [pending, setPending] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [busyIds, setBusyIds] = React.useState(new Set()); // các item đang xử lý

    const fetchAll = React.useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const r = await fetch(ENDPOINTS.LIST);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const json = await r.json();
            setAlerts(
                Array.isArray(json.alerts) ? json.alerts : []
            );
            setPending(
                Array.isArray(json.pending) ? json.pending : []
            );
        } catch {
            setError(
                "Không lấy được dữ liệu thông báo. Hiển thị mẫu."
            );
            const demo = demoData();
            setAlerts(demo.alerts);
            setPending(demo.pending);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const setIdBusy = (id, on) => {
        setBusyIds((s) => {
            const next = new Set(s);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    // ===== Hành động duyệt / từ chối =====
    const approveLeave = async (id) => {
        setIdBusy(`leave-${id}`, true);
        try {
            const r = await fetch(
                ENDPOINTS.APPROVE_LEAVE(id),
                { method: "POST" }
            );
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            setPending((list) =>
                list.filter(
                    (it) =>
                        !(
                            it.kind === "leave" &&
                            String(it.id) ===
                            String(id)
                        )
                )
            );
        } catch (e) {
            console.error(e);
            alert(
                "Duyệt nghỉ phép thất bại. Vui lòng thử lại."
            );
        } finally {
            setIdBusy(`leave-${id}`, false);
        }
    };

    const approveDiscount = async (id) => {
        setIdBusy(`discount-${id}`, true);
        try {
            const r = await fetch(
                ENDPOINTS.APPROVE_DISCOUNT(id),
                { method: "POST" }
            );
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            setPending((list) =>
                list.filter(
                    (it) =>
                        !(
                            it.kind === "discount" &&
                            String(it.id) ===
                            String(id)
                        )
                )
            );
        } catch (e) {
            console.error(e);
            alert(
                "Duyệt giảm giá thất bại. Vui lòng thử lại."
            );
        } finally {
            setIdBusy(`discount-${id}`, false);
        }
    };

    const rejectItem = async (kind, id) => {
        setIdBusy(`${kind}-${id}`, true);
        try {
            const make = REJECT_ENDPOINTS[kind];
            if (!make)
                throw new Error(
                    "Reject endpoint chưa cấu hình"
                );
            const r = await fetch(make(id), {
                method: "POST",
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            setPending((list) =>
                list.filter(
                    (it) =>
                        !(
                            it.kind === kind &&
                            String(it.id) ===
                            String(id)
                        )
                )
            );
        } catch (e) {
            console.error(e);
            alert(
                "Từ chối thất bại. Vui lòng xác nhận endpoint với backend."
            );
        } finally {
            setIdBusy(`${kind}-${id}`, false);
        }
    };

    // ======= Render helpers (light theme) =======

    // Header nhỏ cho mỗi cột ("Cảnh báo", "Chờ duyệt")
    const SectionHeader = ({
                               icon,
                               title,
                               count,
                               right,
                           }) => (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 text-slate-700 text-sm">
            <span className="text-slate-600 flex items-center">
                {icon}
            </span>
            <div className="font-medium text-slate-900">
                {title}
            </div>
            <span className="ml-1 text-[11px] text-slate-500">
                {count}
            </span>
            <div className="ml-auto flex items-center gap-2">
                {right}
            </div>
        </div>
    );

    // 1 dòng cảnh báo
    const AlertItem = ({ a }) => {
        // icon theo loại
        const iconEl =
            a.type === "vehicle_inspection_due" ? (
                <Car className="h-4 w-4" />
            ) : (
                <UserRound className="h-4 w-4" />
            );

        // màu icon theo mức độ
        const colorCls =
            a.severity === "critical"
                ? "text-rose-600"
                : a.severity === "warning"
                    ? "text-amber-600"
                    : "text-slate-500";

        return (
            <div className="flex items-start gap-3 px-3 py-3 border-b border-slate-200 text-sm">
                <div
                    className={cls(
                        "mt-0.5 flex items-center",
                        colorCls
                    )}
                >
                    {iconEl}
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        className="text-slate-900 font-medium text-sm truncate"
                        title={a.message}
                    >
                        {a.message}
                    </div>

                    {a.detail && (
                        <div className="text-[12px] leading-4 text-slate-500 mt-0.5">
                            {a.detail}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // 1 dòng "chờ duyệt"
    const PendingItem = ({ p }) => {
        const idKey = `${p.kind}-${p.id}`;
        const working = busyIds.has(idKey);

        let icon = null;
        let title = "";
        let subtitle = "";

        if (p.kind === "leave") {
            icon = (
                <CalendarDays className="h-4 w-4 text-slate-500" />
            );
            title = `Tài xế ${p.driverName} xin nghỉ`;
            subtitle = p.date
                ? `Ngày ${p.date}${
                    p.reason ? ` · ${p.reason}` : ""
                }`
                : p.reason || "";
        } else if (p.kind === "discount") {
            icon = (
                <BadgePercent className="h-4 w-4 text-slate-500" />
            );
            const pct =
                typeof p.percent === "number"
                    ? `${p.percent}%`
                    : "";
            title = `Đơn ${p.orderCode} xin giảm ${pct}`;
            subtitle = p.reason || "";
        }

        return (
            <div className="flex items-start gap-3 px-3 py-3 border-b border-slate-200">
                <div className="mt-0.5 flex items-center">
                    {icon}
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        className="text-slate-900 font-medium text-sm truncate"
                        title={title}
                    >
                        {title}
                    </div>
                    {subtitle && (
                        <div
                            className="text-[12px] leading-4 text-slate-500 mt-0.5 truncate"
                            title={subtitle}
                        >
                            {subtitle}
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                    <button
                        disabled={working}
                        onClick={() =>
                            p.kind === "leave"
                                ? approveLeave(p.id)
                                : approveDiscount(p.id)
                        }
                        className={cls(
                            "inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium shadow-sm transition-colors",
                            working
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                        )}
                        title="Duyệt"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Duyệt
                    </button>

                    <button
                        disabled={working}
                        onClick={() =>
                            rejectItem(p.kind, p.id)
                        }
                        className={cls(
                            "inline-flex items-center gap-1 rounded-md border border-rose-600 bg-white text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 text-[12px] font-medium shadow-sm transition-colors",
                            working
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                        )}
                        title="Từ chối"
                    >
                        <X className="h-3.5 w-3.5" />
                        Từ chối
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm overflow-hidden">
            {/* Header tổng của widget */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                    <Bell className="h-5 w-5" />
                </div>

                <div className="flex flex-col">
                    <div className="text-[11px] text-slate-500 leading-none mb-1">
                        Trung tâm cảnh báo / phê duyệt
                    </div>
                    <div className="text-slate-900 font-semibold leading-tight">
                        Thông báo nội bộ
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={fetchAll}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                        title="Làm mới"
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-slate-600",
                                loading ? "animate-spin" : ""
                            )}
                        />
                        {loading ? "Đang tải" : "Làm mới"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Cột Cảnh báo */}
                <div className="min-h-[260px] max-h-[420px] overflow-y-auto text-sm">
                    <SectionHeader
                        icon={
                            <ShieldAlert className="h-4 w-4" />
                        }
                        title="Cảnh báo"
                        count={alerts.length}
                    />

                    {error && (
                        <div className="px-3 py-2 text-[12px] leading-4 text-amber-700 bg-amber-50 border-b border-slate-200 flex items-start gap-1">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {alerts.length === 0 && !loading && (
                        <div className="px-3 py-6 text-sm text-slate-500">
                            Không có cảnh báo.
                        </div>
                    )}

                    {alerts.map((a) => (
                        <AlertItem
                            key={
                                a.id ??
                                `${a.type}-${a.message}`
                            }
                            a={a}
                        />
                    ))}

                    {loading && (
                        <div className="px-3 py-4 text-sm text-slate-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-slate-400" />
                            Đang tải…
                        </div>
                    )}
                </div>

                {/* Cột Chờ duyệt */}
                <div className="min-h-[260px] max-h-[420px] overflow-y-auto text-sm">
                    <SectionHeader
                        icon={
                            <CalendarDays className="h-4 w-4" />
                        }
                        title="Chờ duyệt"
                        count={pending.length}
                    />

                    {pending.length === 0 && !loading && (
                        <div className="px-3 py-6 text-sm text-slate-500">
                            Không có mục chờ duyệt.
                        </div>
                    )}

                    {pending.map((p) => (
                        <PendingItem
                            key={`${p.kind}-${p.id}`}
                            p={p}
                        />
                    ))}

                    {loading && (
                        <div className="px-3 py-4 text-sm text-slate-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-slate-400" />
                            Đang tải…
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===== Demo data khi API chưa sẵn =====
function demoData() {
    return {
        alerts: [
            {
                id: 1,
                type: "vehicle_inspection_due",
                message:
                    "Xe [29A-123] sắp đến hạn đăng kiểm (3 ngày)",
                detail: "Cần đăng kiểm lại trước 02/11",
                severity: "warning",
            },
            {
                id: 2,
                type: "driver_license_expiry",
                message:
                    "Tài xế [Văn A] sắp hết hạn bằng lái (12 ngày)",
                detail: "GPLX B2 hết hạn 11/11",
                severity: "warning",
            },
        ],
        pending: [
            {
                id: 101,
                kind: "leave",
                driverName: "Văn A",
                date: "2025-11-02",
                reason: "Việc gia đình",
            },
            {
                id: 102,
                kind: "discount",
                orderCode: "ORD-889",
                percent: 20,
                reason: "Khách VIP",
            },
        ],
    };
}

// tiny util
function cls(...a) {
    return a.filter(Boolean).join(" ");
}
