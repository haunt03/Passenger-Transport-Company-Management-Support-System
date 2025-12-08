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
import {
    listSystemSettings,
    createSystemSetting,
    updateSystemSetting,
} from "../../api/systemSettings";
import QrPaymentSettings from "../common/QrPaymentSettings.jsx";

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
                        "bg-sky-50 border-sky-300 text-sky-800",
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
    const isBoolean =
        normalize(row.valueType) === "boolean" ||
        ["true", "false"].includes(normalize(edited.value));

    const renderValueInput = () => {
        if (isBoolean) {
            const current = normalize(edited.value) === "true" ? "true" : "false";
            return (
                <select
                    value={current}
                    onChange={(e) =>
                        onChangeField(row.key, "value", e.target.value)
                    }
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }

        return (
            <input
                value={edited.value}
                onChange={(e) =>
                    onChangeField(row.key, "value", e.target.value)
                }
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
        );
    };

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
                {renderValueInput()}
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

    // state hiện tại
    const [settings, setSettings] = React.useState([]);

    // snapshot gốc để phát hiện dirty
    const [originalSettings, setOriginalSettings] = React.useState([]);

    // UI state
    const [query, setQuery] = React.useState("");
    const [loadingRefresh, setLoadingRefresh] = React.useState(false);
    const [loadingSave, setLoadingSave] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);

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

    // xác nhận thêm vào table và gọi API
    const confirmAdd = async () => {
        // tránh trùng key
        const exists = settings.some(
            (s) => normalize(s.key) === normalize(draftNew.key)
        );
        if (exists) {
            push("Key này đã tồn tại, vui lòng chọn key khác.", "error");
            return;
        }

        try {
            // Map frontend format to backend format - include all required fields
            const newSetting = {
                settingKey: draftNew.key.trim(),
                settingValue: draftNew.value.trim(),
                description: draftNew.description.trim(),
                effectiveStartDate: new Date().toISOString().split('T')[0],
                effectiveEndDate: null,
                valueType: 'STRING',
                category: null,
            };

            const created = await createSystemSetting(newSetting);

            // Map backend response to frontend format
            const mappedCreated = {
                ...created,
                key: created.settingKey,
                value: created.settingValue,
                label: created.settingKey
            };

            // Add to local state
            setSettings((list) => [...list, mappedCreated]);
            setOriginalSettings((list) => [...list, mappedCreated]);
            
            setAdding(false);
            setDraftNew({
                key: "",
                label: "",
                value: "",
                description: "",
            });
            
            push("Đã thêm cấu hình mới.", "success");
        } catch (err) {
            console.error("Failed to create system setting:", err);
            push("Không thể thêm cấu hình: " + (err.message || "Lỗi không xác định"), "error");
        }
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

    // Load settings from API
    const loadSettings = React.useCallback(async () => {
        setLoadingRefresh(true);
        try {
            const data = await listSystemSettings();
            const settingsList = Array.isArray(data) ? data : [];

            // Map backend response to frontend format
            const mappedSettings = settingsList.map(item => ({
                ...item,
                key: item.settingKey,
                value: item.settingValue,
                label: item.settingKey // Use settingKey as label since backend doesn't have separate label
            }));

            setSettings(mappedSettings);
            setOriginalSettings(mappedSettings);
            setInitialLoading(false);
        } catch (err) {
            console.error("Failed to load system settings:", err);
        } finally {
            setLoadingRefresh(false);
        }
    }, []);

    // Load on mount
    React.useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Refresh handler
    const handleRefresh = () => {
        loadSettings();
    };

    // Save all changes
    const handleSaveAll = async () => {
        if (!hasChanges || loadingSave) return;
        setLoadingSave(true);

        try {
            // Update existing settings
            const updatePromises = dirtyPayload
                .filter((item) => {
                    // Check if this is an existing setting (has id) or new one
                    const existing = settings.find((s) => s.key === item.key);
                    return existing && existing.id;
                })
                .map((item) => {
                    const existing = settings.find((s) => s.key === item.key);
                    // Map frontend format to backend format - include all required fields
                    return updateSystemSetting(existing.id, {
                        settingKey: item.key,
                        settingValue: item.value,
                        description: item.description,
                        // Keep existing values for required fields
                        effectiveStartDate: existing.effectiveStartDate || new Date().toISOString().split('T')[0],
                        effectiveEndDate: existing.effectiveEndDate || null,
                        valueType: existing.valueType || 'STRING',
                        category: existing.category || null,
                    });
                });

            // Create new settings
            const createPromises = dirtyPayload
                .filter((item) => {
                    const existing = settings.find((s) => s.key === item.key);
                    return !existing || !existing.id;
                })
                .map((item) =>
                    // Map frontend format to backend format - include all required fields
                    createSystemSetting({
                        settingKey: item.key,
                        settingValue: item.value,
                        description: item.description,
                        effectiveStartDate: new Date().toISOString().split('T')[0],
                        effectiveEndDate: null,
                        valueType: 'STRING',
                        category: null,
                    })
                );

            await Promise.all([...updatePromises, ...createPromises]);

            // Reload settings to get updated data
            await loadSettings();
            push("Đã lưu thay đổi cấu hình hệ thống.", "success");
        } catch (err) {
            console.error("Failed to save system settings:", err);
            push("Không thể lưu cấu hình: " + (err.message || "Lỗi không xác định"), "error");
        } finally {
            setLoadingSave(false);
        }
    };

    const BRAND_COLOR = "#0079BC";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            <div className="max-w-7xl mx-auto space-y-5">
                {/* HEADER */}
                <div className="flex flex-wrap items-start gap-4 mb-6">
                    <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                            <Settings className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <div className="text-xs text-slate-500 leading-none mb-1">
                                Quản trị hệ thống
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">
                                Cấu hình hệ thống
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">Quản lý tham số hệ thống (VAT, hạn đặt cọc, số ngày nghỉ tối đa...)</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        {/* search box */}
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm max-w-[240px] focus-within:ring-2 focus-within:ring-[#0079BC]/20 focus-within:border-[#0079BC]/50 transition-all">
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
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all active:scale-[0.98]"
                        >
                            <RefreshCw
                                className={cls(
                                    "h-4 w-4 text-slate-500",
                                    loadingRefresh ? "animate-spin" : ""
                                )}
                            />
                            <span>Làm mới</span>
                        </button>
                    </div>
                </div>

                {/* CARD + TABLE */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {/* header bar của bảng */}
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                                    Danh sách thiết lập hệ thống
                                </h3>
                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        Sửa trực tiếp giá trị. Nhấn <span className="font-semibold text-slate-700">Lưu thay đổi</span> để áp dụng.
                                    </span>
                                </div>
                            </div>
                            {hasChanges && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-amber-600 font-medium">
                                        {dirtyPayload.length} thay đổi chưa lưu
                                    </span>
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={loadingSave}
                                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
                                        style={{ backgroundColor: BRAND_COLOR }}
                                    >
                                        <Save className="h-4 w-4" />
                                        <span>{loadingSave ? "Đang lưu..." : "Lưu thay đổi"}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase tracking-wide text-slate-600 bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold w-[280px] text-left">
                                    Key &amp; Tên hiển thị
                                </th>
                                <th className="px-6 py-3.5 font-semibold w-[200px] text-left">
                                    Giá trị
                                </th>
                                <th className="px-6 py-3.5 font-semibold text-left">
                                    Mô tả
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
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
                                        className="px-6 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Settings className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <div className="text-slate-500 font-medium">Không tìm thấy cấu hình phù hợp</div>
                                            <div className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                            </tbody>
                        </table>
                    </div>

                    {/* footer save bar */}
                    {hasChanges && (
                        <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-sky-50 to-blue-50 flex flex-wrap items-center gap-3 justify-between">
                            <div className="text-sm text-sky-800 font-medium flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                <span>{dirtyPayload.length} thay đổi chưa lưu</span>
                            </div>

                            <button
                                onClick={handleSaveAll}
                                disabled={loadingSave}
                                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
                                style={{ backgroundColor: BRAND_COLOR }}
                            >
                                <Save className="h-4 w-4" />
                                <span>{loadingSave ? "Đang lưu..." : "Lưu thay đổi"}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* QR Payment Settings Section */}
            <div className="mt-6">
                <QrPaymentSettings />
            </div>

            {/* Loading indicator */}
            {initialLoading && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    Đang tải cấu hình hệ thống...
                </div>
            )}
        </div>
    );
}