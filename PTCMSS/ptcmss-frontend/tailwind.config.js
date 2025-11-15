// tailwind.config.js
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    100: "#E8F6FF",
                    500: "#007BC7",
                    600: "#0069A8",
                },
                surface: {
                    DEFAULT: "#FFFFFF",     // surface
                    muted:   "#F9FAFB",     // gray-50 kiểu nền phụ nhẹ
                },
                line: {
                    soft:   "#E5E7EB",      // gray-200
                    strong: "#D1D5DB",      // gray-300
                },
                textc: {
                    main:   "#1F2937",      // gray-800
                    dim:    "#6B7280",      // gray-500
                    invert: "#FFFFFF",
                },
            },
        },
    },
    plugins: [],
};
