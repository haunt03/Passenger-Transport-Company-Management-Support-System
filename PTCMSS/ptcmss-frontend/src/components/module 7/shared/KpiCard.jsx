import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

/**
 * KPI Card - Reusable metric widget
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number} props.value - Main value to display
 * @param {string} props.format - 'currency' | 'number' | 'percentage'
 * @param {number} props.delta - Change percentage
 * @param {boolean} props.up - Trend direction
 * @param {string} props.icon - Icon component
 * @param {string} props.color - Theme color: 'blue' | 'green' | 'red' | 'info' | 'purple'
 */
export default function KpiCard({
                                    title,
                                    value,
                                    format = "currency",
                                    delta,
                                    up,
                                    icon: Icon,
                                    color = "blue",
                                    subtitle,
                                    loading = false,
                                }) {
    const colorClasses = {
        blue: "bg-sky-50 text-sky-700 border-sky-200",
        green: "bg-info-50 text-info-700 border-info-200",
        red: "bg-rose-50 text-rose-700 border-rose-200",
        yellow: "bg-info-50 text-info-700 border-info-200",
        purple: "bg-purple-50 text-purple-700 border-purple-200",
    };

    const formatValue = (val) => {
        if (format === "currency") {
            return `${fmtVND(val)} đ`;
        } else if (format === "percentage") {
            return `${Number(val || 0).toFixed(1)}%`;
        } else {
            return fmtVND(val);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="text-sm text-slate-600 font-medium">{title}</div>
                {Icon && (
                    <div className={cls("rounded-lg p-2 border", colorClasses[color])}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </div>

            {/* Value */}
            {loading ? (
                <div className="h-8 bg-slate-200 rounded animate-pulse mb-2" />
            ) : (
                <div className="text-2xl font-semibold text-slate-900 tabular-nums mb-1">
                    {formatValue(value)}
                </div>
            )}

            {/* Delta & Subtitle */}
            <div className="flex items-center gap-3">
                {delta !== undefined && delta !== null && (
                    <div
                        className={cls(
                            "text-xs flex items-center gap-1 font-medium",
                            up ? "text-primary-600" : "text-rose-600"
                        )}
                    >
                        {up ? (
                            <TrendingUp className="h-4 w-4" />
                        ) : (
                            <TrendingDown className="h-4 w-4" />
                        )}
                        {Math.abs(Number(delta || 0)).toFixed(1)}%
                    </div>
                )}
                {subtitle && (
                    <div className="text-xs text-slate-500">{subtitle}</div>
                )}
            </div>
        </div>
    );
}
