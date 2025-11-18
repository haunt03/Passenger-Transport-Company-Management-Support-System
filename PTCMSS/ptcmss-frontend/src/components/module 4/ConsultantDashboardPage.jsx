// ConsultantDashboardPage.jsx (LIGHT THEME)
import React from "react";
import { getConsultantDashboard } from "../../api/bookings";
import {
    PlusCircle,
    ClipboardList,
    CheckCircle2,
    DollarSign,
    Clock,
    User,
    MapPin,
    ChevronRight,
} from "lucide-react";

/**
 * ConsultantDashboardPage – Module 4.S1
 * Light theme: card trắng, border-slate-200, CTA sky-600
 */

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

const fmtTime = (isoLike) => {
    if (!isoLike) return "—";
    const safe = isoLike.replace(" ", "T");
    const d = new Date(safe);
    if (Number.isNaN(d.getTime())) return isoLike;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    return `${hh}:${mm} ${dd}/${MM}`;
};

/* ---------------- Toast (light) ---------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2400) => {
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
        <div className="fixed top-4 right-4 z-[999] space-y-2 text-[13px]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-md px-3 py-2 shadow-sm border bg-white text-slate-700",
                        t.kind === "success" && "border-green-200 bg-green-50 text-green-700",
                        t.kind === "error" && "border-red-200 bg-red-50 text-red-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* ---------------- KPI Card ---------------- */
function StatCard({ icon, label, value, sub, colorClass }) {
    return (
        <div className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div
                    className={cls(
                        "h-9 w-9 rounded-lg flex items-center justify-center text-[13px] font-semibold",
                        // colorClass tuỳ theo thẻ: dùng nền nhạt + ring mảnh
                        colorClass || "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    )}
                >
                    {icon}
                </div>
                {sub ? (
                    <div className="text-[11px] text-slate-500 text-right leading-tight">
                        {sub}
                    </div>
                ) : null}
            </div>

            <div className="text-slate-500 text-[12px] font-medium mb-1">
                {label}
            </div>
            <div className="text-slate-900 text-2xl font-semibold tabular-nums">
                {value}
            </div>
        </div>
    );
}

/* ---------------- Queue Row ---------------- */
function QueueRow({ order, onClick }) {
    return (
        <button
            className="w-full text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors p-4 flex flex-col gap-3"
            onClick={() => onClick && onClick(order)}
            type="button"
        >
            <div className="flex flex-wrap items-start gap-2">
                <div className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-sky-600" />
                    <span>{order.code}</span>
                </div>

                <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Đón {fmtTime(order.pickup_time)}</span>
                </div>
            </div>

            <div className="grid gap-4 text-[12px] text-slate-700 sm:grid-cols-3">
                {/* Khách hàng */}
                <div className="flex flex-col">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wide flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-sky-600" />
                        Khách hàng
                    </div>
                    <div className="text-slate-900 font-medium leading-relaxed">
                        {order.customer_name}
                    </div>
                </div>

                {/* Lộ trình */}
                <div className="flex flex-col">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wide flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        Lộ trình
                    </div>
                    <div className="text-slate-900 font-medium leading-relaxed">
                        {order.pickup} → {order.dropoff}
                    </div>
                </div>

                {/* Trạng thái */}
                <div className="flex flex-col">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                        Trạng thái
                    </div>
                    <div className="text-slate-900 font-medium leading-relaxed">
                        {order.status === "WAITING_QUOTE"
                            ? "Chờ báo giá"
                            : order.status === "WAITING_CUSTOMER"
                                ? "Chờ khách xác nhận"
                                : order.status === "CONFIRMED"
                                    ? "Đã chốt"
                                    : order.status}
                    </div>
                </div>
            </div>
        </button>
    );
}

/* ---------------- Queue Card ---------------- */
function PendingQueueCard({ items, onSelect }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/70 flex items-center gap-2 text-[13px]">
                <ClipboardList className="h-4 w-4 text-sky-600" />
                <div className="text-slate-800 font-medium">
                    Đơn hàng đang chờ xử lý
                </div>
                <div className="text-[11px] text-slate-500 ml-auto">
                    {items.length} yêu cầu
                </div>
            </div>

            <div className="p-4 flex flex-col gap-3 max-h-[360px] overflow-y-auto">
                {items.length === 0 ? (
                    <div className="text-slate-500 text-[13px] text-center py-10">
                        Không có yêu cầu cần xử lý.
                    </div>
                ) : (
                    items.map((o) => (
                        <QueueRow key={o.id} order={o} onClick={onSelect} />
                    ))
                )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50 flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                Chỉ hiển thị yêu cầu mới nhất. Đơn đã chốt sẽ chuyển sang Kế toán / Điều phối.
            </div>
        </div>
    );
}

/* ---------------- MAIN PAGE ---------------- */
export default function ConsultantDashboardPage() {
    const { toasts, push } = useToasts();

    // stats từ backend
    const [stats, setStats] = React.useState({
        pending_quotes: 0,
        confirmed_orders: 0,
        revenue_this_month: 0,
    });

    // queue từ backend
    const [pendingOrders, setPendingOrders] = React.useState([
        {
            id: 921,
            code: "RQ-2025-0921",
            customer_name: "Công ty A",
            pickup: "Hà Nội",
            dropoff: "Hải Phòng",
            pickup_time: "2025-10-29 08:00",
            status: "WAITING_QUOTE",
        },
        {
            id: 938,
            code: "RQ-2025-0938",
            customer_name: "Mr. David",
            pickup: "Hà Nội",
            dropoff: "Ninh Bình",
            pickup_time: "2025-10-29 14:30",
            status: "WAITING_CUSTOMER",
        },
        {
            id: 944,
            code: "RQ-2025-0944",
            customer_name: "Công ty B",
            pickup: "Bắc Ninh",
            dropoff: "Hà Nội",
            pickup_time: "2025-10-30 07:15",
            status: "WAITING_QUOTE",
        },
    ]);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const d = await getConsultantDashboard();
                if (!mounted || !d) return;
                setStats({
                    pending_quotes: d.totalPendingCount ?? 0,
                    confirmed_orders: d.totalConfirmedCount ?? 0,
                    revenue_this_month: d.monthlyRevenue ?? 0,
                });
                const mapped = (d.pendingBookings || []).map(o => ({
                    id: o.id,
                    code: `RQ-${o.id}`,
                    customer_name: o.customerName,
                    pickup: (o.routeSummary || "?").split(" → ")[0] || "",
                    dropoff: (o.routeSummary || "?").split(" → ")[1] || "",
                    pickup_time: o.startDate,
                    status: "WAITING_QUOTE",
                }));
                setPendingOrders(mapped);
            } catch (e) {
                // keep mock if fails
                push("Không lấy được dữ liệu dashboard", "error");
            }
        })();
        return () => { mounted = false; };
    }, []);

    // CTA
    const handleCreateOrder = () => {
        push("Đi tới màn Tạo đơn hàng mới (M4.S2) - mock", "info");
        // navigate("/orders/new")
    };

    // click 1 đơn trong queue
    const handleSelectPending = (order) => {
        push("Mở chi tiết yêu cầu " + order.code + " (design-only)", "success");
        // navigate(`/orders/${order.id}`)
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-sky-600" />
                            <span>Consultant Dashboard</span>
                        </div>

                        <div className="rounded-md border border-slate-200 bg-slate-100 text-[11px] text-slate-600 font-medium px-2 py-[2px] flex items-center gap-1">
                            <span>Chi nhánh: Hà Nội</span>
                        </div>
                    </div>

                    <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-2 leading-relaxed">
                        <span>
                            Quản lý yêu cầu khách hàng, gửi báo giá và theo dõi doanh số cá nhân.
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[220px]">
                    <button
                        onClick={handleCreateOrder}
                        type="button"
                        className="rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-[13px] px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 flex items-center justify-center gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Tạo đơn hàng mới</span>
                    </button>
                </div>
            </div>

            {/* KPI ROW */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <StatCard
                    icon={<ClipboardList className="h-4 w-4" />}
                    label="Đơn chờ báo giá"
                    value={stats.pending_quotes}
                    sub="Cần phản hồi sớm"
                    colorClass="bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                />
                <StatCard
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Đơn đã xác nhận"
                    value={stats.confirmed_orders}
                    sub="Trong tháng này"
                    colorClass="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                />
                <StatCard
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Doanh số tháng"
                    value={fmtVND(stats.revenue_this_month) + " đ"}
                    sub="Tổng giá trị đã chốt"
                    colorClass="bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                />
            </div>

            {/* QUEUE CARD */}
            <PendingQueueCard items={pendingOrders} onSelect={handleSelectPending} />

            {/* FOOTNOTE */}
            <div className="text-[11px] text-slate-500 mt-6 leading-relaxed">
                Endpoint dự kiến:{" "}
                <code className="text-slate-700">
                    GET /api/consultant/dashboard
                </code>
                . Backend sẽ tự filter theo tài khoản tư vấn viên (branch, user id).
            </div>
        </div>
    );
}