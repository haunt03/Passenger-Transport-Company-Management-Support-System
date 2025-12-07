import React from "react";

const BRAND_COLOR = "#0079BC";

/**
 * Avatar dùng chung trong toàn hệ thống.
 * - Nếu có đường dẫn ảnh (avatar) thì hiển thị ảnh.
 * - Nếu không có hoặc load lỗi thì fallback sang initials theo tên.
 */
export default function UserAvatar({
                                     name,
                                     avatar,
                                     size = 32,
                                     className = "",
                                   }) {
  const [src, setSrc] = React.useState(null);

  // Resolve ảnh tuyệt đối từ path trả về backend
  React.useEffect(() => {
    if (!avatar) {
      setSrc(null);
      return;
    }
    try {
      const apiBase = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/$/, "");
      const fullUrl = /^https?:\/\//i.test(avatar)
          ? avatar
          : `${apiBase}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
      setSrc(fullUrl);
    } catch {
      setSrc(null);
    }
  }, [avatar]);

  const initials = React.useMemo(() => {
    return (name || "?")
        .trim()
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join("") || "?";
  }, [name]);

  const dimensionStyle = { width: size, height: size };

  return (
      <div
          className={
              "rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold text-white shadow-sm " +
              className
          }
          style={{ ...dimensionStyle, backgroundColor: BRAND_COLOR }}
      >
        {src ? (
            <img
                src={src}
                alt={name || "avatar"}
                className="w-full h-full object-cover"
                onError={() => setSrc(null)}
            />
        ) : (
            <span>{initials}</span>
        )}
      </div>
  );
}

