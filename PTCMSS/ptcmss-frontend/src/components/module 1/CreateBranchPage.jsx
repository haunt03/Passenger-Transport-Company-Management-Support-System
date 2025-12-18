import React from "react";
import {
    Building2,
    User,
    MapPin,
    Save,
    X,
    Loader2,
    Plus,
} from "lucide-react";

/**
 * Module 1.S2 – Quản lý chi nhánh (theo style AdminBranchListPage cũ)
 *
 * - Màu chủ đạo: sky-600 / hover sky-500
 * - Bubble icon header: bg-sky-600 text-white shadow-[0_10px_30px_rgba(2,132,199,.35)]
 * - Card bảng: rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden
 * - Toasts: bg-white border-slate-300 text-slate-700 (info)
 * - Input focus: ring-sky-500/30 border-sky-500
 */

const cls = (...a) => a.filter(Boolean).join(" ");

/* ---------------------------------- Toasts ---------------------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((list) => [...list, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((list) => list.filter((t) => t.id !== id));
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
                        "bg-info-50 border-info-300 text-info-700",
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

/* =========================
   Modal tạo chi nhánh (SKY)
   ========================= */
function CreateBranchModal({
                               open,
                               managers,
                               existingBranches,
                               onClose,
                               onCreate,
                           }) {
    const [name, setName] = React.useState("");
    const [address, setAddress] = React.useState("");
    const [managerId, setManagerId] = React.useState("");

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    // reset khi mở modal
    React.useEffect(() => {
        if (open) {
            setName("");
            setAddress("");
            setManagerId("");
            setLoading(false);
            setError("");
        }
    }, [open]);

    if (!open) return null;

    const valid =
        name.trim() !== "" &&
        address.trim() !== "" &&
        managerId !== "";

    const handleSubmit = async () => {
        if (!valid) {
            setError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
            return;
        }

        // Validate tên chi nhánh không trùng
        const trimmedName = name.trim();
        const isDuplicate = existingBranches.some(
            (b) => b.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
            setError("Tên chi nhánh đã tồn tại. Vui lòng chọn tên khác.");
            return;
        }

        setLoading(true);
        setError("");

        const payload = {
            branchName: trimmedName,
            location: address.trim(),
            managerId: Number(managerId),
        };

        try {
            const { createBranch } = await import("../../api/branches");
            const result = await createBranch(payload);

            const newBranch = {
                id: result?.id || result?.data?.id,
                name: result?.branchName || result?.data?.branchName,
                address: result?.location || result?.data?.location,
                manager_id: result?.managerId || result?.data?.managerId,
                manager_name:
                    managers.find(
                        (m) => String(m.id) === String(managerId)
                    )?.name || "(unknown)",
            };

            onCreate && onCreate(newBranch);
            onClose && onClose();
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.data?.message || err?.message || "Không thể tạo chi nhánh. Thử lại.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                    {/* bubble sky-600 giống các màn sky theme */}
                    <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <Building2 className="h-5 w-5" />
                    </div>

                    <div className="font-semibold text-slate-900 leading-tight">
                        Tạo cơ sở / chi nhánh mới
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-500 hover:text-slate-700 transition-colors"
                        title="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-4 space-y-4 text-sm">
                    {/* Tên chi nhánh */}
                    <div>
                        <div className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                                Tên chi nhánh{" "}
                                <span className="text-rose-500">*</span>
                            </span>
                        </div>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 placeholder:text-slate-400"
                            placeholder="Chi nhánh Hà Nội"
                        />
                    </div>

                    {/* Địa chỉ */}
                    <div>
                        <div className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                                Địa chỉ{" "}
                                <span className="text-rose-500">*</span>
                            </span>
                        </div>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={2}
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 placeholder:text-slate-400"
                            placeholder="Số 123 Đường ABC, Q. XYZ, Hà Nội"
                        />
                    </div>

                    {/* Quản lý chi nhánh */}
                    <div>
                        <div className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                                Quản lý chi nhánh{" "}
                                <span className="text-rose-500">*</span>
                            </span>
                        </div>
                        <select
                            value={managerId}
                            onChange={(e) => setManagerId(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                        >
                            <option value="">
                                -- Chọn quản lý (MANAGER chưa gán) --
                            </option>
                            {managers.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name} (ID {m.id})
                                </option>
                            ))}
                        </select>

                        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Chỉ hiển thị user có role MANAGER chưa thuộc chi
                            nhánh nào.
                        </div>
                    </div>

                    {error ? (
                        <div className="text-[12px] text-rose-600">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* FOOTER */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3 justify-between">
                    {/* <div className="text-[11px] leading-snug text-slate-500">
                        Endpoint dự kiến:
                        <code className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono text-slate-700">
                            POST /api/admin/branches
                        </code>
                    </div> */}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                        >
                            Huỷ
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={!valid || loading}
                            className={cls(
                                "rounded-md px-3 py-2 text-sm font-medium shadow-sm inline-flex items-center gap-2 transition-colors",
                                !valid || loading
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-sky-600 hover:bg-sky-500 text-white"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Đang lưu...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>Lưu chi nhánh</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* =========================
   Trang danh sách chi nhánh
   ========================= */
export default function AdminBranchesPage() {
    const { toasts, push } = useToasts();

    // danh sách manager rảnh (chưa gán branch)
    const [managers] = React.useState([
        { id: 11, name: "Nguyễn Văn Hùng" },
        { id: 12, name: "Trần Thị Mai" },
        { id: 13, name: "Lê Quốc Bảo" },
    ]);

    // danh sách chi nhánh
    const [branches, setBranches] = React.useState([
        {
            id: 1,
            name: "Chi nhánh Hà Nội",
            address: "Số 12 Phố ABC, Q. Hoàn Kiếm, Hà Nội",
            manager_id: 11,
            manager_name: "Nguyễn Văn Hùng",
        },
        {
            id: 2,
            name: "Chi nhánh TP.HCM",
            address: "45 Nguyễn Huệ, Quận 1, TP.HCM",
            manager_id: 99,
            manager_name: "(đang cập nhật)",
        },
    ]);

    const [openModal, setOpenModal] = React.useState(false);

    const handleCreateBranch = (newBranch) => {
        setBranches((list) => [newBranch, ...list]);

        push(
            "Đã tạo chi nhánh " +
            newBranch.name +
            " (ID " +
            newBranch.id +
            ")",
            "success"
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* PAGE HEADER (sky theme giống AdminBranchListPage) */}
            <div className="flex flex-wrap items-start gap-4 mb-5">
                <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                    {/* bubble sky-600 */}
                    <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <Building2 className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col">
                        <div className="text-[11px] text-slate-500 leading-none mb-1">
                            Hệ thống chi nhánh / cơ sở
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                                Quản lý chi nhánh
                            </h1>

                            {/* badge: giống StatusBadge ACTIVE style */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-sky-50 text-sky-700 border-sky-300">
                                <span className="leading-none font-medium">
                                    {branches.length} cơ sở
                                </span>
                            </span>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-relaxed mt-1">
                            Tạo chi nhánh mới và gán Manager phụ trách.
                        </div>
                    </div>
                </div>

                {/* actions bên phải */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
                    <button
                        onClick={() => setOpenModal(true)}
                        className="inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tạo chi nhánh</span>
                    </button>
                </div>
            </div>

            {/* TABLE CARD (style branch-list gốc) */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* header bar của bảng */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                    Danh sách chi nhánh hiện tại ({branches.length})
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2 font-medium text-slate-600 text-xs w-[60px]">
                                ID
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600 text-xs">
                                Tên chi nhánh
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600 text-xs">
                                Địa chỉ
                            </th>
                            <th className="px-3 py-2 font-medium text-slate-600 text-xs whitespace-nowrap">
                                Quản lý
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                        {branches.map((br) => (
                            <tr
                                key={br.id}
                                className="border-b border-slate-200 hover:bg-slate-50/70 align-top"
                            >
                                {/* ID */}
                                <td className="px-3 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                                    {br.id}
                                </td>

                                {/* Tên chi nhánh */}
                                <td className="px-3 py-3 text-sm font-medium text-slate-900">
                                    {br.name}
                                </td>

                                {/* Địa chỉ */}
                                <td className="px-3 py-3 text-xs leading-relaxed text-slate-600">
                                    {br.address}
                                </td>

                                {/* Manager */}
                                <td className="px-3 py-3 text-xs text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{br.manager_name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        ID {br.manager_id}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {branches.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-10 text-center text-sm text-slate-500"
                                >
                                    Chưa có chi nhánh nào.
                                </td>
                            </tr>
                        ) : null}
                        </tbody>
                    </table>
                </div>

                {/* footer hint */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-[11px] leading-relaxed text-slate-500">
                    Khi nối API:
                    <br />
                    POST{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-mono text-slate-700">
                        /api/admin/branches
                    </code>
                    <br />
                    Body gồm name, address, phone, manager_id.
                </div>
            </div>

            {/* MODAL */}
            <CreateBranchModal
                open={openModal}
                managers={managers}
                existingBranches={branches}
                onClose={() => setOpenModal(false)}
                onCreate={handleCreateBranch}
            />
        </div>
    );
}
