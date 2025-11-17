// src/components/module 1/SystemSettingsPage.jsx
import React from "react";
import {
    Settings,
    RefreshCw,
    Save,
    Plus,
    Search,
    Info,
    X,
} from "lucide-react";

/**
 * SystemSettingsPage – Module 1.S1 (THEME LIGHT VERSION)
 *
 * Vai trò: Admin
 * Chức năng:
 *  - Xem và chỉnh sửa cấu hình hệ thống
 *  - Thêm cấu hình mới
 *  - Lưu thay đổi
 *
 * API dự kiến:
 *   GET /api/admin/settings
 *   PUT /api/admin/settings
 */

const cls = (...a) => a.filter(Boolean).join(" ");
const normalize = (s) => String(s || "").trim().toLowerCase();

/* ---------------------------------- */
/* Toast system (đã đổi sang light)   */
/* ---------------------------------- */
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

/* ---------------------------------- */
/* 1 dòng setting đang có             */
/* ---------------------------------- */
function SettingRow({ row, edited, onChangeField, isDirty }) {
    return (
        <tr
            className={cls(
                "border-b border-slate-200 align-top hover:bg-slate-50",
                isDirty ? "bg-sky-50" : ""
            )}
        >
            {/* KEY + label */}
            <td className="px-3 py-3 text-xs text-slate-500 font-mono whitespace-nowrap align-top">
                <div className="flex items-start gap-2">
                    <div>
                        <div className="text-[11px] text-slate-800 font-semibold leading-none mb-1">
                            {edited.label || "—"}
                        </div>
                        <div className="text-[11px] leading-none text-slate-400">
                            {row.key}
                        </div>
                    </div>

                    {isDirty ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-300 text-[10px] leading-none font-medium h-fit">
                            Đã sửa
                        </span>
                    ) : null}
                </div>
            </td>

            {/* VALUE editable */}
            <td className="px-3 py-3 w-[200px] align-top">
                <input
                    value={edited.value}
                    onChange={(e) =>
                        onChangeField(row.key, "value", e.target.value)
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                />
            </td>

            {/* DESCRIPTION editable */}
            <td className="px-3 py-3 align-top">
                <textarea
                    value={edited.description}
                    onChange={(e) =>
                        onChangeField(row.key, "description", e.target.value)
                    }
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                />
            </td>
        </tr>
    );
}

/* ---------------------------------- */
/* inline row để thêm setting mới     */
/* ---------------------------------- */
function NewSettingRow({ draft, onChangeDraft, onConfirm, onCancel }) {
    const valid =
        normalize(draft.key) &&
        normalize(draft.label) &&
        normalize(draft.value);

    return (
        <tr className="bg-slate-50 border-b border-slate-200 align-top">
            {/* KEY + LABEL */}
            <td className="px-3 py-3 align-top">
                <div className="flex flex-col gap-2">
                    <div>
                        <div className="text-[11px] text-slate-600 mb-1">
                            Tên hiển thị
                        </div>
                        <input
                            value={draft.label}
                            onChange={(e) =>
                                onChangeDraft("label", e.target.value)
                            }
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                            placeholder="Thuế VAT / Hạn đặt cọc / ..."
                        />
                    </div>

                    <div>
                        <div className="text-[11px] text-slate-600 mb-1">
                            System key (bắt buộc, duy nhất)
                        </div>
                        <input
                            value={draft.key}
                            onChange={(e) =>
                                onChangeDraft("key", e.target.value)
                            }
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-[12px] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                            placeholder="VAT / DEPOSIT_DUE_DAYS / ..."
                        />
                    </div>
                </div>
            </td>

            {/* VALUE */}
            <td className="px-3 py-3 w-[200px] align-top">
                <div className="text-[11px] text-slate-600 mb-1">
                    Giá trị (value)
                </div>
                <input
                    value={draft.value}
                    onChange={(e) => onChangeDraft("value", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    placeholder="10 / 4 / 3 / ..."
                />
            </td>

            {/* DESCRIPTION + ACTION */}
            <td className="px-3 py-3 align-top">
                <div className="flex flex-col gap-2">
                    <div>
                        <div className="text-[11px] text-slate-600 mb-1">
                            Mô tả
                        </div>
                        <textarea
                            value={draft.description}
                            onChange={(e) =>
                                onChangeDraft("description", e.target.value)
                            }
                            rows={2}
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                            placeholder="Tỷ lệ thuế GTGT (%) / Hạn đặt cọc sau X ngày..."
                        />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <button
                            onClick={() => valid && onConfirm()}
                            disabled={!valid}
                            className={cls(
                                "rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            Thêm
                        </button>

                        <button
                            onClick={onCancel}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors"
                        >
                            <X className="h-3.5 w-3.5 text-slate-400" />
                            Hủy
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
}

/* ---------------------------------- */
/* PAGE CHÍNH                        */
/* ---------------------------------- */
export default function SystemSettingsPage() {
    const { toasts, push } = useToasts();

    // mock data từ GET /api/admin/settings
    const INITIAL_DATA = React.useMemo(
        () => [
            {
                key: "VAT",
                label: "Thuế VAT",
                value: "10",
                description: "Tỷ lệ thuế GTGT (%) áp dụng mặc định.",
            },
            {
                key: "MAX_DRIVER_LEAVE_DAYS",
                label: "Số ngày nghỉ tối đa tài xế",
                value: "5",
                description:
                    "Số ngày nghỉ phép tối đa mỗi tháng mà tài xế có thể xin.",
            },
            {
                key: "DEPOSIT_DUE_DAYS",
                label: "Hạn đặt cọc",
                value: "3",
                description:
                    "Số ngày kể từ khi xác nhận đơn mà khách phải đặt cọc.",
            },
        ],
        []
    );

    // state hiện tại
    const [settings, setSettings] = React.useState(INITIAL_DATA);

    // snapshot gốc để phát hiện dirty
    const [originalSettings, setOriginalSettings] =
        React.useState(INITIAL_DATA);

    // UI state
    const [query, setQuery] = React.useState("");
    const [loadingRefresh, setLoadingRefresh] = React.useState(false);
    const [loadingSave, setLoadingSave] = React.useState(false);

    // state cho "thêm tham số"
    const [adding, setAdding] = React.useState(false);
    const [draftNew, setDraftNew] = React.useState({
        key: "",
        label: "",
        value: "",
        description: "",
    });

    // filter search
    const filteredSettings = React.useMemo(() => {
        const q = normalize(query);
        if (!q) return settings;
        return settings.filter((row) => {
            return (
                normalize(row.key).includes(q) ||
                normalize(row.label).includes(q) ||
                normalize(row.description).includes(q)
            );
        });
    }, [settings, query]);

    // check dirty row
    const isRowDirty = React.useCallback(
        (row) => {
            const orig = originalSettings.find((o) => o.key === row.key);
            if (!orig) return true;
            return (
                orig.value !== row.value ||
                orig.description !== row.description ||
                orig.label !== row.label
            );
        },
        [originalSettings]
    );

    // diff payload
    const dirtyPayload = React.useMemo(() => {
        const diffs = [];
        for (const row of settings) {
            if (isRowDirty(row)) {
                diffs.push({
                    key: row.key,
                    value: row.value,
                    description: row.description,
                    label: row.label,
                });
            }
        }
        return diffs;
    }, [settings, isRowDirty]);

    const hasChanges = dirtyPayload.length > 0;

    /* handlers */

    // sửa field trong dòng có sẵn
    const handleChangeField = (rowKey, field, nextVal) => {
        setSettings((list) =>
            list.map((r) => (r.key === rowKey ? { ...r, [field]: nextVal } : r))
        );
    };

    // bật form thêm
    const startAdd = () => {
        setAdding(true);
        setDraftNew({
            key: "",
            label: "",
            value: "",
            description: "",
        });
    };

    // sửa draft form thêm mới
    const changeDraftField = (field, val) => {
        setDraftNew((d) => ({ ...d, [field]: val }));
    };

    // xác nhận thêm vào table (mock, chưa PUT server)
    const confirmAdd = () => {
        // tránh trùng key
        const exists = settings.some(
            (s) => normalize(s.key) === normalize(draftNew.key)
        );
        if (exists) {
            push("Key này đã tồn tại, vui lòng chọn key khác.", "error");
            return;
        }

        const newRow = {
            key: draftNew.key.trim(),
            label: draftNew.label.trim(),
            value: draftNew.value.trim(),
            description: draftNew.description.trim(),
        };

        setSettings((list) => [...list, newRow]);
        setAdding(false);
        setDraftNew({
            key: "",
            label: "",
            value: "",
            description: "",
        });
    };

    const cancelAdd = () => {
        setAdding(false);
        setDraftNew({
            key: "",
            label: "",
            value: "",
            description: "",
        });
    };

    // giả lập GET /api/admin/settings
    const handleRefresh = () => {
        setLoadingRefresh(true);
        setTimeout(() => {
            // TODO: fetch thật
            setLoadingRefresh(false);
            push("Đã tải lại System Settings (demo).", "info");
        }, 500);
    };

    // giả lập PUT /api/admin/settings
    const handleSaveAll = () => {
        if (!hasChanges || loadingSave) return;
        setLoadingSave(true);

        // TODO: gọi PUT thật với dirtyPayload
        setTimeout(() => {
            // sau "lưu"
            setOriginalSettings(settings);
            setLoadingSave(false);
            push("Đã lưu thay đổi cấu hình hệ thống.", "success");
        }, 600);
    };

    return (
        <>
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="mb-5 flex flex-wrap items-start gap-4">
                <div className="flex flex-col flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(2,132,199,.35)]">
                            <Settings className="h-5 w-5" />
                        </div>
                        <h1 className="text-xl font-semibold text-slate-900">
                            System Settings
                        </h1>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Quản lý tham số hệ thống (VAT, hạn đặt cọc, số ngày
                        nghỉ tối đa...)
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
                    {/* search box */}
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm max-w-[220px] focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:border-sky-500">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tìm key / mô tả..."
                            className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 flex-1"
                        />
                    </div>

                    {/* nút làm mới */}
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-slate-500",
                                loadingRefresh ? "animate-spin" : ""
                            )}
                        />
                        <span>Làm mới</span>
                    </button>

                    {/* nút thêm tham số */}
                    <button
                        onClick={startAdd}
                        disabled={adding}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                        <Plus className="h-4 w-4 text-slate-500" />
                        <span>Thêm tham số</span>
                    </button>
                </div>
            </div>

            {/* CARD + TABLE */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* header bar của bảng */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-start gap-2">
                    <span className="font-medium text-slate-800">
                        Danh sách thiết lập hệ thống
                    </span>

                    <span className="text-[11px] text-slate-500 flex items-start gap-1 leading-relaxed">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                            Sửa trực tiếp giá trị. Nhấn{" "}
                            <span className="text-slate-800 font-medium">
                                Lưu thay đổi
                            </span>{" "}
                            để áp dụng.
                        </span>
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-white border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2 font-medium w-[280px] text-left">
                                Key &amp; Tên hiển thị
                            </th>
                            <th className="px-3 py-2 font-medium w-[200px] text-left">
                                Giá trị
                            </th>
                            <th className="px-3 py-2 font-medium text-left">
                                Mô tả
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                        {/* hàng thêm mới */}
                        {adding ? (
                            <NewSettingRow
                                draft={draftNew}
                                onChangeDraft={changeDraftField}
                                onConfirm={confirmAdd}
                                onCancel={cancelAdd}
                            />
                        ) : null}

                        {/* các hàng hiện có */}
                        {filteredSettings.map((row) => (
                            <SettingRow
                                key={row.key}
                                row={row}
                                edited={row}
                                onChangeField={handleChangeField}
                                isDirty={isRowDirty(row)}
                            />
                        ))}

                        {/* empty state */}
                        {filteredSettings.length === 0 && !adding ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-3 py-10 text-center text-slate-400 text-sm"
                                >
                                    Không tìm thấy cấu hình phù hợp.
                                </td>
                            </tr>
                        ) : null}
                        </tbody>
                    </table>
                </div>

                {/* footer save bar */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3 justify-between text-xs text-slate-500">
                    <div className="text-[11px] text-slate-600">
                        {hasChanges
                            ? `${dirtyPayload.length} thay đổi chưa lưu`
                            : "Không có thay đổi"}
                    </div>

                    <button
                        onClick={handleSaveAll}
                        disabled={!hasChanges || loadingSave}
                        className={cls(
                            "inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        {loadingSave ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </div>

            {/* API hint */}
            <div className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                <div>
                    <span className="text-slate-400">GET:</span>{" "}
                    /api/admin/settings
                </div>
                <div>
                    <span className="text-slate-400">PUT:</span>{" "}
                    /api/admin/settings &nbsp; Body: [{"{"}"key": "VAT",
                    "value": "8"{"}"}]
                </div>
            </div>
        </>
    );
}
