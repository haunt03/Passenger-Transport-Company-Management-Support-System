import React from "react";
import {
    UserCog,
    PlusCircle,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    X,
    Search,
} from "lucide-react";

/**
 * AdminManagersPage (Style khớp AdminBranchListPage cũ)
 *
 * - Primary màu sky-600 (bg-sky-600 hover:bg-sky-500)
 * - Bubble header sky-600 text-white shadow-[0_10px_30px_rgba(2,132,199,.35)]
 * - Card: rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden
 * - Toast info: bg-white border-slate-300 text-slate-700
 * - Input focus: focus-within:border-sky-500 focus-within:ring-sky-500/30
 * - Nút secondary: border-slate-300 bg-white hover:bg-slate-50
 *
 * Chức năng:
 *  - Danh sách MANAGER
 *  - Tạo manager mới
 *  - Gán chi nhánh (hiển thị trạng thái)
 *
 * API dự kiến:
 *   GET  /api/admin/users?role=MANAGER
 *   POST /api/admin/users { fullName, phone, email, password, role:"MANAGER" }
 */

const cls = (...a) => a.filter(Boolean).join(" ");

/* --------------------- utils --------------------- */
function getInitials(name = "") {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "??";
    return (
        (parts[0][0] || "").toUpperCase() +
        (parts[parts.length - 1][0] || "").toUpperCase()
    );
}

/* --------------------- Toasts (giống BranchListPage cũ) --------------------- */
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
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-md px-3 py-2 text-sm shadow border",
                        t.kind === "success" &&
                        "bg-emerald-50 border-emerald-300 text-emerald-700",
                        t.kind === "error" &&
                        "bg-rose-50 border-rose-300 text-rose-700",
                        t.kind === "info" &&
                        "bg-white border-slate-300 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* --------------------- trạng thái chi nhánh --------------------- */
function ManagerBranchStatus({ branchName }) {
    const assigned = !!branchName;
    return (
        <span
            className={cls(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                assigned
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
            )}
        >
            {assigned ? (
                <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="leading-none">
                        ĐÃ GÁN · {branchName}
                    </span>
                </>
            ) : (
                <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="leading-none">CHƯA GÁN</span>
                </>
            )}
        </span>
    );
}

/* --------------------- avatar + info cell --------------------- */
function ManagerMainCell({ name, email, phone }) {
    return (
        <div className="flex items-start gap-3">
            {/* avatar chữ cái (sky tone thay vì blue) */}
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 shadow-sm text-[12px] font-semibold leading-none">
                {getInitials(name)}
            </div>

            <div className="flex flex-col">
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {name || "—"}
                </div>

                <div className="text-[12px] text-slate-500 leading-tight">
                    {email || "—"}
                </div>

                <div className="text-[12px] text-slate-500 leading-tight">
                    {phone || "—"}
                </div>
            </div>
        </div>
    );
}

/* --------------------- Modal tạo Manager (sky style như CreateBranchModal cũ) --------------------- */
function CreateManagerModal({ open, onClose, onSave }) {
    const [fullName, setFullName] = React.useState("");
    const [phone, setPhone] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    const valid =
        fullName.trim() !== "" &&
        email.trim() !== "" &&
        password.trim() !== "";

    React.useEffect(() => {
        if (!open) {
            setFullName("");
            setPhone("");
            setEmail("");
            setPassword("");
        }
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-2">
                    <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <UserCog className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                        <div className="font-semibold text-slate-900 leading-tight">
                            Tạo quản lý chi nhánh
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                            Tài khoản có vai trò MANAGER, dùng để đăng nhập hệ thống.
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-500 hover:text-slate-700 transition-colors"
                        title="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* body */}
                <div className="p-4 space-y-4 text-sm text-slate-800">
                    {/* Họ & Tên */}
                    <div>
                        <div className="mb-1 text-xs text-slate-600">
                            Họ &amp; Tên{" "}
                            <span className="text-rose-500">*</span>
                        </div>
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 placeholder:text-slate-400"
                            placeholder="VD: Trần Thị B"
                        />
                    </div>

                    {/* SĐT */}
                    <div>
                        <div className="mb-1 text-xs text-slate-600">
                            Số điện thoại
                        </div>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 placeholder:text-slate-400"
                            placeholder="09xx xxx xxx"
                        />
                    </div>

                    {/* Email + Mật khẩu */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <div className="mb-1 text-xs text-slate-600">
                                Email (đăng nhập){" "}
                                <span className="text-rose-500">*</span>
                            </div>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 placeholder:text-slate-400"
                                placeholder="manager@example.com"
                                type="email"
                            />
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-slate-600">
                                Mật khẩu tạm{" "}
                                <span className="text-rose-500">*</span>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 placeholder:text-slate-400"
                                placeholder="Tối thiểu 6 ký tự"
                            />
                        </div>
                    </div>

                    <div className="text-[11px] leading-relaxed text-slate-500 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                        Sau khi tạo, Manager sẽ xuất hiện trong danh sách.
                        Bạn có thể gán họ vào chi nhánh phù hợp.
                    </div>
                </div>

                {/* footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() =>
                            valid &&
                            onSave({
                                fullName,
                                phone,
                                email,
                                password,
                            })
                        }
                        disabled={!valid}
                        className={cls(
                            "rounded-md px-3 py-2 text-sm font-medium shadow-sm transition-colors",
                            valid
                                ? "bg-sky-600 hover:bg-sky-500 text-white"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        Tạo quản lý
                    </button>
                </div>
            </div>
        </div>
    );
}

/* --------------------- page chính --------------------- */
export default function AdminManagersPage() {
    const { toasts, push } = useToasts();

    // mock data
    const [managers, setManagers] = React.useState([
        {
            id: 101,
            name: "Nguyễn Văn A",
            phone: "0901 111 222",
            email: "vana@example.com",
            branchId: 1,
            branchName: "Chi nhánh Hà Nội",
        },
        {
            id: 102,
            name: "Trần Thị B",
            phone: "0902 222 333",
            email: "thib@example.com",
            branchId: null,
            branchName: null,
        },
    ]);

    const [loading, setLoading] = React.useState(false);
    const [openCreate, setOpenCreate] = React.useState(false);

    // search / filter
    const [query, setQuery] = React.useState("");

    const filteredManagers = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return managers;
        return managers.filter((m) => {
            return (
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                (m.phone || "").toLowerCase().includes(q)
            );
        });
    }, [managers, query]);

    // refresh mock
    const onRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            push("Đã tải lại danh sách quản lý", "info");
        }, 500);
    };

    // create manager từ modal
    const handleCreateManager = ({
                                     fullName,
                                     phone,
                                     email,
                                     password, // eslint-disable-line no-unused-vars
                                 }) => {
        const newId =
            Math.max(...managers.map((m) => m.id), 100) + 1;

        const newManager = {
            id: newId,
            name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            branchId: null,
            branchName: null,
        };

        setManagers((prev) => [...prev, newManager]);
        push("Đã tạo quản lý " + newManager.name, "success");
        setOpenCreate(false);

        // TODO: POST /api/admin/users { fullName, phone, email, password, role:"MANAGER" }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-wrap items-start gap-4 mb-5">
                {/* left cluster */}
                <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                    {/* bubble sky-600 giống BranchListPage cũ */}
                    <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <UserCog className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                                Quản lý Quản lý Chi nhánh
                            </h1>

                            {/* pill theo style StatusBadge ACTIVE (sky nhạt viền sky) */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-sky-50 text-sky-700 border-sky-300">
                                <span className="leading-none font-medium">
                                    MANAGER role
                                </span>
                            </span>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-relaxed mt-1">
                            Tạo tài khoản quản lý chi nhánh, theo dõi người nào đã
                            gán vào chi nhánh nào.
                        </div>
                    </div>
                </div>

                {/* right side actions (search / thêm / refresh) */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
                    {/* search box (giữ focus-within sky như Branch page inputs) */}
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm max-w-[220px] focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:border-sky-500">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 flex-1"
                            placeholder="Tìm theo tên, email..."
                        />
                    </div>

                    {/* CTA chính: thêm quản lý */}
                    <button
                        onClick={() => setOpenCreate(true)}
                        className="inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Thêm quản lý</span>
                    </button>

                    {/* refresh */}
                    <button
                        onClick={onRefresh}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-slate-500",
                                loading ? "animate-spin" : ""
                            )}
                        />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* TABLE CARD (style giống BranchListPage cũ) */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* header bar của bảng */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex flex-wrap items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">
                        Danh sách quản lý chi nhánh
                    </span>
                    <span className="text-[11px] text-slate-500 leading-none">
                        Tổng {filteredManagers.length} người
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-2 font-medium text-slate-600 text-xs">
                                Quản lý
                            </th>
                            <th className="px-4 py-2 font-medium text-slate-600 text-xs whitespace-nowrap">
                                Trạng thái gán chi nhánh
                            </th>
                            <th className="px-4 py-2 font-medium text-slate-600 text-xs text-right">
                                ID
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                        {filteredManagers.map((m) => (
                            <tr
                                key={m.id}
                                className="border-b border-slate-200 hover:bg-slate-50/70"
                            >
                                {/* main info */}
                                <td className="px-4 py-3 align-top">
                                    <ManagerMainCell
                                        name={m.name}
                                        email={m.email}
                                        phone={m.phone}
                                    />
                                </td>

                                {/* branch status */}
                                <td className="px-4 py-3 align-top text-sm text-slate-700">
                                    <ManagerBranchStatus branchName={m.branchName} />
                                </td>

                                {/* ID */}
                                <td className="px-4 py-3 align-top text-right text-[12px] text-slate-400 tabular-nums">
                                    #{m.id}
                                </td>
                            </tr>
                        ))}

                        {filteredManagers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-4 py-10 text-center text-sm text-slate-500"
                                >
                                    Không tìm thấy quản lý nào khớp từ khóa.
                                </td>
                            </tr>
                        ) : null}
                        </tbody>
                    </table>
                </div>

                {/* footer hint */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-[11px] leading-relaxed text-slate-500">
                    Dữ liệu mock. Khi nối API:
                    <br />
                    GET /api/admin/users?role=MANAGER
                    <br />
                    POST /api/admin/users (tạo mới Manager)
                </div>
            </div>

            {/* MODAL TẠO MANAGER */}
            <CreateManagerModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSave={handleCreateManager}
            />
        </div>
    );
}
