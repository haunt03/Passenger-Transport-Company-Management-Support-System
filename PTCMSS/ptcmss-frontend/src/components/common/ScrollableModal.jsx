import React from "react";
import { X } from "lucide-react";

/**
 * ScrollableModal - Modal component với scrollbar tự động
 * 
 * Props:
 * - isOpen: boolean - Trạng thái mở/đóng modal
 * - onClose: function - Callback khi đóng modal
 * - title: string - Tiêu đề modal
 * - children: ReactNode - Nội dung modal
 * - maxWidth: string - Chiều rộng tối đa (default: "max-w-2xl")
 * - maxHeight: string - Chiều cao tối đa (default: "max-h-[85vh]")
 */
export default function ScrollableModal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "max-w-2xl",
    maxHeight = "max-h-[85vh]",
    footer = null,
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className={`relative bg-white rounded-2xl shadow-2xl ${maxWidth} w-full ${maxHeight} flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {children}
                </div>

                {/* Footer - Fixed (optional) */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
