import React from "react";
import { X } from "lucide-react";

/**
 * AnimatedDialog - Reusable dialog component with smooth animations
 *
 * Features:
 * - Fade in/out backdrop
 * - Scale + fade animation for dialog content
 * - Smooth transitions (300ms)
 * - Click outside to close
 * - ESC key to close
 * - Customizable size and position
 *
 * @param {boolean} open - Whether dialog is open
 * @param {function} onClose - Close handler
 * @param {ReactNode} children - Dialog content
 * @param {string} size - Size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} showCloseButton - Show X button in top-right
 * @param {string} className - Additional classes for dialog content
 * @param {boolean} closeOnBackdropClick - Close when clicking backdrop (default: true)
 */
export default function AnimatedDialog({
                                           open,
                                           onClose,
                                           children,
                                           size = "md",
                                           showCloseButton = true,
                                           className = "",
                                           closeOnBackdropClick = true,
                                       }) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);

    // Handle ESC key
    React.useEffect(() => {
        if (!open) return;
        const handleEsc = (e) => {
            if (e.key === "Escape" && onClose) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [open, onClose]);

    // Animation states
    React.useEffect(() => {
        if (open) {
            setIsVisible(true);
            // Small delay to trigger animation
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            // Wait for animation to complete before hiding
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [open]);

    if (!isVisible) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        full: "max-w-full mx-4",
    };

    const handleBackdropClick = (e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget && onClose) {
            onClose();
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
                isAnimating
                    ? "opacity-100"
                    : "opacity-0"
            } transition-opacity duration-300 ease-out`}
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${
                    isAnimating ? "opacity-100" : "opacity-0"
                } transition-opacity duration-300 ease-out`}
            />

            {/* Dialog Content */}
            <div
                className={`relative w-full ${sizeClasses[size]} ${
                    isAnimating
                        ? "scale-100 opacity-100 translate-y-0"
                        : "scale-95 opacity-0 translate-y-4"
                } transition-all duration-300 ease-out ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/20 overflow-hidden">
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 active:scale-95"
                            aria-label="Đóng"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <div className="relative">{children}</div>
                </div>
            </div>
        </div>
    );
}

/**
 * AnimatedModal - Alias for AnimatedDialog (backward compatibility)
 */
export const AnimatedModal = AnimatedDialog;

