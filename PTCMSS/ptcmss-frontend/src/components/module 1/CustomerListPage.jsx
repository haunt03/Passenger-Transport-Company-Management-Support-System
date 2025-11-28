import React, { useState, useEffect, useCallback } from "react";
import { Users, Search, Calendar, Building2, RefreshCw, Mail, Phone, StickyNote } from "lucide-react";
import { listCustomers } from "../../api/customers";
import { listBranches } from "../../api/branches";
import Pagination from "../common/Pagination";

function cls(...classes) {
    return classes.filter(Boolean).join(" ");
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

export default function CustomerListPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [keyword, setKeyword] = useState("");
    const [branchId, setBranchId] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Pagination
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 10;

    // Branches for filter dropdown
    const [branches, setBranches] = useState([]);

    // Load branches for filter
    useEffect(() => {
        async function loadBranches() {
            try {
                const resp = await listBranches({ size: 100 });
                const list = resp?.content || resp?.data?.content || resp || [];
                setBranches(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error("Failed to load branches:", err);
            }
        }
        loadBranches();
    }, []);

    const fetchCustomers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await listCustomers({
                keyword: keyword.trim() || undefined,
                branchId: branchId || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                page,
                size: pageSize,
            });

            const data = response?.data || response || {};
            const content = data?.content || [];

            setCustomers(Array.isArray(content) ? content : []);
            setTotalPages(data?.totalPages || 1);
            setTotalElements(data?.totalElements || 0);
        } catch (err) {
            console.error("Error fetching customers:", err);
            setError("Không thể tải danh sách khách hàng");
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [keyword, branchId, fromDate, toDate, page]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        fetchCustomers();
    };

    const handleClearFilters = () => {
        setKeyword("");
        setBranchId("");
        setFromDate("");
        setToDate("");
        setPage(0);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0079BC] to-sky-600 flex items-center justify-center shadow-lg">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Danh sách khách hàng</h1>
                            <p className="text-sm text-slate-600">
                                Quản lý thông tin khách hàng • Tổng: {totalElements} khách hàng
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <form onSubmit={handleSearch} className="space-y-4">
                        {/* Row 1: Search + Branch */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Tìm theo tên, SĐT, email..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0079BC]/30 focus:border-[#0079BC]"
                                />
                            </div>

                            {/* Branch */}
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0079BC]/30 focus:border-[#0079BC] appearance-none"
                                >
                                    <option value="">Tất cả chi nhánh</option>
                                    {branches.map((b) => (
                                        <option key={b.id || b.branchId} value={b.id || b.branchId}>
                                            {b.name || b.branchName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Date range + Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* From Date */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0079BC]/30 focus:border-[#0079BC]"
                                />
                            </div>

                            {/* To Date */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#0079BC]/30 focus:border-[#0079BC]"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 md:col-span-2 justify-end">
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 rounded-lg bg-[#0079BC] text-white text-sm font-medium hover:bg-[#006699] transition-colors flex items-center gap-2"
                                >
                                    <Search className="h-4 w-4" />
                                    Tìm kiếm
                                </button>
                                <button
                                    type="button"
                                    onClick={fetchCustomers}
                                    className="p-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                    title="Làm mới"
                                >
                                    <RefreshCw className={cls("h-4 w-4", loading && "animate-spin")} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Tên khách hàng
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Số điện thoại
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Ghi chú
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Ngày tạo
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
                                            <span className="text-sm text-slate-500">Đang tải...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="h-8 w-8 text-slate-300" />
                                            <span className="text-sm text-slate-500">Không có khách hàng nào</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        {/* Name */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0079BC] to-sky-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                                                    {(customer.fullName || "?").charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 text-sm">
                                                        {customer.fullName || "—"}
                                                    </div>
                                                    {customer.address && (
                                                        <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                                            {customer.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="px-4 py-3">
                                            {customer.email ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Mail className="h-4 w-4 text-slate-400" />
                                                    <span>{customer.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>

                                        {/* Phone */}
                                        <td className="px-4 py-3">
                                            {customer.phone ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Phone className="h-4 w-4 text-slate-400" />
                                                    <span className="font-mono">{customer.phone}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>

                                        {/* Note */}
                                        <td className="px-4 py-3">
                                            {customer.note ? (
                                                <div className="flex items-start gap-2 text-sm text-slate-600 max-w-[200px]">
                                                    <StickyNote className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2">{customer.note}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>

                                        {/* Created At */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span>{formatDate(customer.createdAt)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                Trang {page + 1} / {totalPages} • Tổng {totalElements} khách hàng
                            </div>
                            <Pagination
                                currentPage={page + 1}
                                totalPages={totalPages}
                                onPageChange={(p) => setPage(p - 1)}
                            />
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}