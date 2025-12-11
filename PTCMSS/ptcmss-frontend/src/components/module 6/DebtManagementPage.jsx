import React from "react";
import {
    AlertCircle,
    Calendar,
    Building2,
    User,
    RefreshCw,
    Download,
    Mail,
    Phone,
    MessageSquare,
    Tag,
    FileText,
    TrendingUp,
} from "lucide-react";
import { getDebts, getAgingBuckets, sendDebtReminder, updateDebtInfo, setPromiseToPay, setDebtLabel } from "../../api/debts";
import { listBranches } from "../../api/branches";
import { exportInvoiceListToExcel } from "../../api/exports";

const BRAND_COLOR = "#0079BC";
const cls = (...a) => a.filter(Boolean).join(" ");

const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

const DEBT_LABELS = {
    NORMAL: "Bình thường",
    VIP: "VIP",
    TRANH_CHAP: "Tranh chấp",
};

const REMINDER_TYPES = {
    EMAIL: "Email",
    SMS: "SMS",
    PHONE: "Điện thoại",
};

// Toast system
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2600) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((a) => [...a, { id, msg, kind }]);
        setTimeout(() => setToasts((a) => a.filter((t) => t.id !== id)), ttl);
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
                        "rounded-md px-3 py-2 text-sm shadow border",
                        t.kind === "success" && "bg-info-50 border-info-300 text-info-700",
                        t.kind === "error" && "bg-rose-50 border-rose-300 text-rose-700",
                        t.kind === "info" && "bg-white border-slate-300 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

export default function DebtManagementPage() {
    const { toasts, push } = useToasts();

    const [loading, setLoading] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Filters
    const [branchId, setBranchId] = React.useState(null);
    const [customerId, setCustomerId] = React.useState(null);
    const [debtLabel, setDebtLabel] = React.useState("");
    const [keyword, setKeyword] = React.useState("");

    // Data
    const [debts, setDebts] = React.useState([]);
    const [agingBuckets, setAgingBuckets] = React.useState({
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucketOver90: 0,
    });
    const [branches, setBranches] = React.useState([]);

    // Selected debt for actions
    const [selectedDebt, setSelectedDebt] = React.useState(null);
    const [showReminderModal, setShowReminderModal] = React.useState(false);
    const [showPromiseModal, setShowPromiseModal] = React.useState(false);
    const [showLabelModal, setShowLabelModal] = React.useState(false);

    // Load branches
    React.useEffect(() => {
        (async () => {
            try {
                const branchesData = await listBranches({ size: 100 });
                setBranches(Array.isArray(branchesData) ? branchesData : []);
            } catch (err) {
                console.error("Error loading branches:", err);
            }
        })();
    }, []);

    // Load debts and aging buckets
    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [debtsData, agingData] = await Promise.all([
                getDebts({
                    branchId: branchId || undefined,
                    customerId: customerId || undefined,
                    overdueOnly: true,
                    debtLabel: debtLabel || undefined,
                    keyword: keyword.trim() || undefined,
                    sortBy: "dueDate",
                    sortDir: "asc",
                }),
                getAgingBuckets({
                    branchId: branchId || undefined,
                    customerId: customerId || undefined,
                }),
            ]);

            setDebts(Array.isArray(debtsData?.content) ? debtsData.content : (Array.isArray(debtsData) ? debtsData : []));
            setAgingBuckets(agingData || {
                bucket0_30: 0,
                bucket31_60: 0,
                bucket61_90: 0,
                bucketOver90: 0,
            });
        } catch (err) {
            console.error("Error loading debts:", err);
            setError(err.message || "Không thể tải danh sách công nợ");
            push("Lỗi khi tải danh sách công nợ", "error");
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [branchId, customerId, debtLabel, keyword, push]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    // Actions
    const handleSendReminder = async (invoiceId, reminderType, note) => {
        try {
            await sendDebtReminder(invoiceId, {
                reminderType,
                note: note || undefined,
            });
            push(`Đã gửi nhắc nợ qua ${REMINDER_TYPES[reminderType]}`, "success");
            setShowReminderModal(false);
            loadData();
        } catch (err) {
            console.error("Error sending reminder:", err);
            push("Lỗi khi gửi nhắc nợ: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const handleSetPromise = async (invoiceId, promiseDate) => {
        try {
            await setPromiseToPay(invoiceId, {
                promiseToPayDate: promiseDate,
            });
            push("Đã cập nhật hẹn thanh toán", "success");
            setShowPromiseModal(false);
            loadData();
        } catch (err) {
            console.error("Error setting promise:", err);
            push("Lỗi khi cập nhật hẹn thanh toán: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const handleSetLabel = async (invoiceId, label) => {
        try {
            await setDebtLabel(invoiceId, {
                debtLabel: label,
            });
            push(`Đã gắn nhãn ${DEBT_LABELS[label]}`, "success");
            setShowLabelModal(false);
            loadData();
        } catch (err) {
            console.error("Error setting label:", err);
            push("Lỗi khi gắn nhãn: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const handleExport = async () => {
        try {
            await exportInvoiceListToExcel({
                paymentStatus: "UNPAID",
                branchId: branchId || undefined,
            });
            push("Đã xuất danh sách công nợ (Excel)", "success");
        } catch (err) {
            console.error("Export error:", err);
            push("Lỗi khi xuất Excel: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* Header */}
            <div className="flex flex-wrap items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-md bg-rose-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(220,38,38,.35)]">
                    <AlertCircle className="h-5 w-5" />
                </div>

                <div className="flex flex-col flex-1">
                    <div className="text-[11px] text-slate-500 leading-none mb-1">
                        Kế toán / Quản lý công nợ
                    </div>
                    <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                        Quản lý Công nợ
                    </h1>
                    <p className="text-slate-500 text-[13px]">
                        Danh sách nợ · Aging buckets · Gửi nhắc nợ · Hẹn thanh toán
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50"
                    >
                        <RefreshCw className={cls("h-4 w-4", loading ? "animate-spin" : "")} />
                        <span>Làm mới</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 flex items-center gap-1"
                    >
                        <Download className="h-4 w-4" />
                        <span>Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Aging Buckets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="text-[11px] text-slate-500 mb-1">0-30 ngày</div>
                    <div className="text-xl font-semibold text-slate-900 tabular-nums">
                        {fmtVND(agingBuckets.bucket0_30 || 0)} đ
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="text-[11px] text-slate-500 mb-1">31-60 ngày</div>
                    <div className="text-xl font-semibold text-info-700 tabular-nums">
                        {fmtVND(agingBuckets.bucket31_60 || 0)} đ
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="text-[11px] text-slate-500 mb-1">61-90 ngày</div>
                    <div className="text-xl font-semibold text-orange-700 tabular-nums">
                        {fmtVND(agingBuckets.bucket61_90 || 0)} đ
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="text-[11px] text-slate-500 mb-1">Trên 90 ngày</div>
                    <div className="text-xl font-semibold text-rose-700 tabular-nums">
                        {fmtVND(agingBuckets.bucketOver90 || 0)} đ
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 mb-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[12px] text-slate-600 mb-1 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>Chi nhánh</span>
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800"
                            value={branchId || ""}
                            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b) => (
                                <option key={b.branchId} value={b.branchId}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[12px] text-slate-600 mb-1 flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            <span>Nhãn</span>
                        </label>
                        <select
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800"
                            value={debtLabel}
                            onChange={(e) => setDebtLabel(e.target.value)}
                        >
                            <option value="">Tất cả</option>
                            {Object.entries(DEBT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[12px] text-slate-600 mb-1 flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>Tìm kiếm</span>
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800"
                            placeholder="Mã HĐ, khách hàng..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <div className="text-[11px] text-slate-500">
                            Tổng công nợ: <span className="font-semibold text-slate-900">{fmtVND(totalDebt)} đ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Debt Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center justify-between">
                    <div>
                        Danh sách công nợ ({debts.length} mục)
                    </div>
                    {error && <div className="text-rose-600 text-[11px]">{error}</div>}
                </div>

                {initialLoading ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        Đang tải dữ liệu...
                    </div>
                ) : debts.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        Không có công nợ nào
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Mã HĐ</th>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Khách hàng</th>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Số tiền</th>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Hạn TT</th>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Quá hạn</th>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Nhãn</th>
                                    <th className="px-4 py-2 font-medium text-slate-700 text-[11px]">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {debts.map((debt) => (
                                    <tr key={debt.invoiceId} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-slate-900 font-medium">
                                            {debt.invoiceNumber || `INV-${debt.invoiceId}`}
                                        </td>
                                        <td className="px-4 py-2 text-slate-800">{debt.customerName || "—"}</td>
                                        <td className="px-4 py-2 text-slate-900 font-semibold tabular-nums">
                                            {fmtVND(debt.balance || 0)} đ
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">
                                            {debt.dueDate || "—"}
                                        </td>
                                        <td className="px-4 py-2">
                                            {debt.daysOverdue > 0 ? (
                                                <span className="px-2 py-1 rounded text-[11px] bg-rose-100 text-rose-700 border border-rose-300">
                                                    {debt.daysOverdue} ngày
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {debt.debtLabel ? (
                                                <span className="px-2 py-1 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-300">
                                                    {DEBT_LABELS[debt.debtLabel] || debt.debtLabel}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedDebt(debt);
                                                        setShowReminderModal(true);
                                                    }}
                                                    className="px-2 py-1 rounded text-[11px] bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100"
                                                    title="Gửi nhắc nợ"
                                                >
                                                    <Mail className="h-3 w-3 inline" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedDebt(debt);
                                                        setShowPromiseModal(true);
                                                    }}
                                                    className="px-2 py-1 rounded text-[11px] bg-info-50 text-info-700 border border-info-300 hover:bg-info-100"
                                                    title="Hẹn thanh toán"
                                                >
                                                    <Calendar className="h-3 w-3 inline" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedDebt(debt);
                                                        setShowLabelModal(true);
                                                    }}
                                                    className="px-2 py-1 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100"
                                                    title="Gắn nhãn"
                                                >
                                                    <Tag className="h-3 w-3 inline" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals - Simplified for now */}
            {showReminderModal && selectedDebt && (
                <ReminderModal
                    debt={selectedDebt}
                    onClose={() => {
                        setShowReminderModal(false);
                        setSelectedDebt(null);
                    }}
                    onSend={handleSendReminder}
                />
            )}
            {showPromiseModal && selectedDebt && (
                <PromiseModal
                    debt={selectedDebt}
                    onClose={() => {
                        setShowPromiseModal(false);
                        setSelectedDebt(null);
                    }}
                    onSet={handleSetPromise}
                />
            )}
            {showLabelModal && selectedDebt && (
                <LabelModal
                    debt={selectedDebt}
                    onClose={() => {
                        setShowLabelModal(false);
                        setSelectedDebt(null);
                    }}
                    onSet={handleSetLabel}
                />
            )}
        </div>
    );
}

// Simple modals
function ReminderModal({ debt, onClose, onSend }) {
    const [type, setType] = React.useState("EMAIL");
    const [note, setNote] = React.useState("");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl p-4 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold mb-3">Gửi nhắc nợ</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-slate-600">Loại</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            {Object.entries(REMINDER_TYPES).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-slate-600">Ghi chú</label>
                        <textarea
                            className="w-full border rounded px-3 py-2"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSend(debt.invoiceId, type, note)}
                            className="flex-1 bg-sky-600 text-white px-3 py-2 rounded"
                        >
                            Gửi
                        </button>
                        <button onClick={onClose} className="flex-1 bg-slate-200 px-3 py-2 rounded">
                            Hủy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PromiseModal({ debt, onClose, onSet }) {
    const [date, setDate] = React.useState("");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl p-4 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold mb-3">Hẹn thanh toán</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-slate-600">Ngày hẹn</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSet(debt.invoiceId, date)}
                            className="flex-1 bg-sky-600 text-white px-3 py-2 rounded"
                        >
                            Xác nhận
                        </button>
                        <button onClick={onClose} className="flex-1 bg-slate-200 px-3 py-2 rounded">
                            Hủy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LabelModal({ debt, onClose, onSet }) {
    const [label, setLabel] = React.useState(debt.debtLabel || "NORMAL");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl p-4 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold mb-3">Gắn nhãn</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-slate-600">Nhãn</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        >
                            {Object.entries(DEBT_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSet(debt.invoiceId, label)}
                            className="flex-1 bg-purple-600 text-white px-3 py-2 rounded"
                        >
                            Xác nhận
                        </button>
                        <button onClick={onClose} className="flex-1 bg-slate-200 px-3 py-2 rounded">
                            Hủy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

