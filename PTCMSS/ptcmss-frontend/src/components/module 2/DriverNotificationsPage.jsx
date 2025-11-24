import React from "react";
import {
    Bell,
    AlertCircle,
    Check,
    RefreshCw,
    Clock,
} from "lucide-react";

/**
 * DriverNotificationsPage – Light theme version
 *
 * API dự kiến:
 *  GET /api/driver/notifications?page=1&limit=20
 *     → [{ id, type, message, created_at, unread }]
 *
 *  PUT /api/driver/notifications/{notificationId}/read
 *     → đánh dấu 1 thông báo đã đọc
 *
 * Tính năng:
 * - Sort: mới nhất lên đầu
 * - Chưa đọc: nền sáng nổi bật + chấm xanh
 * - Đánh dấu tất cả đã đọc
 * - Phân trang
 */

// small helpers
const cls = (...a) => a.filter(Boolean).join(" ");
const fmtDateTime = (iso) => {
    // "2025-10-26T14:05:00" -> "26/10 14:05"
    if (!iso) return "--/-- --:--";
    const dd = iso.slice(8, 10);
    const mm = iso.slice(5, 7);
    const hhmm = iso.slice(11, 16);
    return dd + "/" + mm + " " + hhmm;
};

// toast system (light style)
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2200) => {
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
                        t.kind === "info" &&
                        "bg-blue-50 border-blue-200 text-blue-700",
                        !["success", "error", "info"].includes(t.kind) &&
                        "bg-white border-slate-200 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

// Removed DEMO_NOTIFS - chỉ dùng data từ API, báo lỗi nếu không fetch được

// icon + màu theo loại thông báo
function NotificationIcon({ type }) {
    if (type === "VEHICLE_INSPECTION") {
        return (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-300 text-amber-700 shadow-sm">
                <AlertCircle className="h-4 w-4" />
            </span>
        );
    }
    if (type === "ASSIGN_TRIP") {
        return (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 shadow-sm">
                <Bell className="h-4 w-4" />
            </span>
        );
    }
    if (type === "LEAVE_APPROVED") {
        return (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 border border-sky-300 text-sky-700 shadow-sm">
                <Check className="h-4 w-4" />
            </span>
        );
    }
    return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 border border-slate-300 text-slate-600 shadow-sm">
            <Bell className="h-4 w-4" />
        </span>
    );
}

// 1 dòng thông báo
function NotificationRow({ notif, onMarkRead }) {
    return (
        <div
            className={cls(
                "relative flex gap-3 rounded-xl border px-4 py-3 text-sm transition",
                notif.unread
                    ? "bg-sky-50 border-sky-300 shadow-[0_20px_60px_rgba(14,165,233,0.08)]"
                    : "bg-white border-slate-200 shadow-sm"
            )}
        >
            {/* cột icon + dot */}
            <div className="shrink-0 flex flex-col items-center pt-0.5">
                <NotificationIcon type={notif.type} />
                {notif.unread ? (
                    <span className="mt-2 inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,.6)]" />
                ) : (
                    <span className="mt-2 inline-flex h-2 w-2 rounded-full bg-slate-300" />
                )}
            </div>

            {/* nội dung + timestamp */}
            <div className="flex-1 min-w-0">
                <div
                    className={cls(
                        "leading-snug",
                        notif.unread
                            ? "text-slate-900 font-medium"
                            : "text-slate-700"
                    )}
                >
                    {notif.message}
                </div>

                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{fmtDateTime(notif.created_at)}</span>
                    {notif.unread ? (
                        <span className="text-emerald-600 font-semibold uppercase tracking-wide text-[10px]">
                            Mới
                        </span>
                    ) : null}
                </div>
            </div>

            {/* nút đánh dấu đã đọc */}
            {notif.unread ? (
                <div className="shrink-0 flex items-start">
                    <button
                        onClick={() => onMarkRead(notif.id)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] px-2 py-1 flex items-center gap-1 font-medium shadow-sm"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Đã đọc
                    </button>
                </div>
            ) : (
                <div className="shrink-0 flex items-start">
                    <span className="rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-[10px] px-2 py-1 cursor-default">
                        Đã đọc
                    </span>
                </div>
            )}

            {/* viền accent nhẹ cho unread */}
            {notif.unread ? (
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-sky-400/20" />
            ) : null}
        </div>
    );
}

// Pagination footer
function PaginationBar({ page, totalPages, pageSize, setPage, setPageSize }) {
    return (
        <div className="flex flex-wrap items-center gap-3 justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ‹
                </button>

                <div className="text-slate-700 text-sm">
                    Trang{" "}
                    <span className="font-medium text-slate-900">
                        {page}
                    </span>
                    /
                    <span className="font-medium text-slate-900">
                        {totalPages}
                    </span>
                </div>

                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ›
                </button>

                <select
                    value={pageSize}
                    onChange={(e) => {
                        const n = Number(e.target.value) || 10;
                        setPageSize(n);
                        setPage(1);
                    }}
                    className="bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                    {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                            {n}/trang
                        </option>
                    ))}
                </select>
            </div>

            <div className="text-[11px] text-slate-500">
                Các thông báo cũ hơn có thể đã được lưu trữ.
            </div>
        </div>
    );
}

// === MAIN PAGE ===
export default function DriverNotificationsPage() {
    const { toasts, push } = useToasts();

    const [loading, setLoading] = React.useState(false);
    const [notifs, setNotifs] = React.useState([]);
    const [error, setError] = React.useState(null);

    // paging state
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);

    // sort newest first
    const sorted = React.useMemo(() => {
        const arr = [...notifs];
        arr.sort((a, b) => {
            const A = a.created_at;
            const B = b.created_at;
            if (A < B) return 1;
            if (A > B) return -1;
            return 0;
        });
        return arr;
    }, [notifs]);

    const totalPages = Math.max(
        1,
        Math.ceil(sorted.length / pageSize)
    );
    const current = sorted.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [totalPages, page]);

    // mark single notification as read
    const markRead = (id) => {
        setNotifs((arr) =>
            arr.map((n) =>
                n.id === id ? { ...n, unread: false } : n
            )
        );
        push("Đã đánh dấu đã đọc", "success");
        // TODO: PUT /api/driver/notifications/{id}/read
    };

    // mark all
    const markAllRead = () => {
        setNotifs((arr) =>
            arr.map((n) => ({ ...n, unread: false }))
        );
        push(
            "Toàn bộ thông báo đã được đánh dấu đã đọc",
            "success"
        );
        // TODO: gọi API hàng loạt nếu có
    };

    // Load notifications from API
    const loadNotifications = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { getDriverNotifications } = await import("../../api/notifications");
            const { getStoredUserId } = await import("../../utils/session");
            const userId = getStoredUserId();

            if (!userId) {
                throw new Error("Bạn cần đăng nhập để xem thông báo");
            }

            const response = await getDriverNotifications({ userId, page, limit: pageSize });
            const data = response?.data || response || [];
            setNotifs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load notifications:", err);
            const errorMsg = err.message || "Lỗi không xác định";
            setError("Không thể tải thông báo: " + errorMsg);
            push("Không thể tải thông báo: " + errorMsg, "error");
            setNotifs([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, push]);

    // Load on mount
    React.useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // refresh
    const onRefresh = () => {
        loadNotifications();
    };

    // count unread
    const unreadCount = notifs.filter((n) => n.unread).length;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER BAR */}
            <div className="mb-5 flex flex-wrap items-start gap-4">
                <div className="flex items-start gap-3 min-w-[200px]">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100 shadow-sm">
                        <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-lg font-semibold text-slate-900 leading-tight">
                            Thông báo
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">
                            Bạn có{" "}
                            <span className="text-emerald-600 font-semibold">
                                {unreadCount}
                            </span>{" "}
                            chưa đọc
                        </div>
                    </div>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                    <button
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700 shadow-sm hover:bg-emerald-100"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Đánh dấu tất cả đã đọc
                    </button>

                    <button
                        onClick={onRefresh}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw
                            className={cls(
                                "h-3.5 w-3.5 text-slate-500",
                                loading ? "animate-spin" : ""
                            )}
                        />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* LIST WRAPPER */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 text-sm text-slate-600 flex items-center gap-2">
                    Danh sách thông báo
                    <span className="text-[11px] text-slate-400">
                        (Mới nhất ở trên)
                    </span>
                </div>

                {/* danh sách */}
                <div className="p-4 space-y-3 text-sm">
                    {current.length === 0 ? (
                        <div className="text-slate-500 text-xs text-center py-10">
                            Không có thông báo.
                        </div>
                    ) : (
                        current.map((n) => (
                            <NotificationRow
                                key={n.id}
                                notif={n}
                                onMarkRead={markRead}
                            />
                        ))
                    )}
                </div>

                {/* pagination */}
                <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    setPage={setPage}
                    setPageSize={setPageSize}
                />

                {/* footer note */}
                <div className="px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 bg-white">
                    Sau khi đánh dấu là đã đọc, thông báo vẫn hiển thị để bạn
                    tra cứu lại lịch sử.
                </div>
            </div>
        </div>
    );
}