import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

/**
 * Trend Chart - Line chart for revenue/expense trends
 * @param {Object} props
 * @param {Array} props.data - Chart data
 * @param {Array} props.lines - Array of line configs: [{ dataKey, name, color }]
 * @param {string} props.xKey - X-axis data key
 */
export default function TrendChart({
                                       data = [],
                                       lines = [],
                                       xKey = "month",
                                       height = 300,
                                       loading = false,
                                   }) {
    if (loading) {
        return (
            <div className="w-full bg-slate-100 rounded animate-pulse" style={{ height }} />
        );
    }

    if (!data || data.length === 0) {
        return (
            <div
                className="w-full flex items-center justify-center text-slate-500 text-sm"
                style={{ height }}
            >
                Không có dữ liệu
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-slate-600">{entry.name}:</span>
                            <span className="font-semibold text-slate-900 tabular-nums">
                                {fmtVND(entry.value)} đ
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey={xKey}
                    stroke="#64748b"
                    style={{ fontSize: "12px" }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis
                    stroke="#64748b"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => fmtVND(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="line"
                />
                {lines.map((line, index) => (
                    <Line
                        key={index}
                        type="monotone"
                        dataKey={line.dataKey}
                        name={line.name}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={{ fill: line.color, r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
