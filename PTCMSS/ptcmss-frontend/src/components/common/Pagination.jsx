import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Pagination Component
 *
 * Props:
 * - currentPage: number - Trang hiện tại (bắt đầu từ 1)
 * - totalPages: number - Tổng số trang
 * - onPageChange: function - Callback khi chuyển trang
 * - itemsPerPage: number - Số items mỗi trang (default: 10)
 * - totalItems: number - Tổng số items (default: 0)
 * - maxVisible: number - Số trang hiển thị tối đa (default: 5)
 */
export default function Pagination({
                                       currentPage = 1,
                                       totalPages = 1,
                                       onPageChange,
                                       itemsPerPage = 10,
                                       totalItems = 0,
                                       maxVisible = 5,
                                   }) {
    const pages = [];

    // Tính toán range của pages cần hiển thị
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    // Tính toán items hiển thị
    const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-white">
            {/* Info text */}
            <div className="text-sm text-slate-600">
                Hiển thị <span className="font-semibold text-slate-900">{startItem}</span> -{" "}
                <span className="font-semibold text-slate-900">{endItem}</span> trong tổng số{" "}
                <span className="font-semibold text-slate-900">{totalItems}</span>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2">
                {/* First page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang đầu"
                >
                    <ChevronsLeft className="h-4 w-4 text-slate-600" />
                </button>

                {/* Previous page */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang trước"
                >
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>

                {/* Page numbers */}
                {startPage > 1 && (
                    <>
                        <button
                            onClick={() => onPageChange(1)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            1
                        </button>
                        {startPage > 2 && (
                            <span className="px-2 text-slate-400">...</span>
                        )}
                    </>
                )}

                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                            ? "bg-[#EDC531] text-white shadow-md"
                            : "border border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        {page}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && (
                            <span className="px-2 text-slate-400">...</span>
                        )}
                        <button
                            onClick={() => onPageChange(totalPages)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                {/* Next page */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang sau"
                >
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>

                {/* Last page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang cuối"
                >
                    <ChevronsRight className="h-4 w-4 text-slate-600" />
                </button>
            </div>
        </div>
    );
}
