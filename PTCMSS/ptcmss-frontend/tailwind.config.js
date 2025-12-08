// tailwind.config.js
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand color: blue (quay lại tone xanh)
                brand: {
                    50: "#EFF6FF",
                    100: "#DBEAFE",
                    200: "#BFDBFE",
                    300: "#93C5FD",
                    400: "#60A5FA",
                    500: "#3B82F6",
                    600: "#2563EB",
                    700: "#1D4ED8",
                    800: "#1E40AF",
                    900: "#1E3A8A",
                },
                surface: {
                    DEFAULT: "#FFFFFF",     // surface
                    muted: "#F9FAFB",     // gray-50 kiểu nền phụ nhẹ
                },
                line: {
                    soft: "#E5E7EB",      // gray-200
                    strong: "#D1D5DB",      // gray-300
                },
                textc: {
                    main: "#1F2937",      // gray-800
                    dim: "#6B7280",      // gray-500
                    invert: "#FFFFFF",
                },
            },
        },
    },
    plugins: [],
};
