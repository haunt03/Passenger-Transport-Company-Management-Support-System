import { apiFetch } from "./http";
import { getStoredUserId } from "../utils/session";

export function getMyProfile() {
    const id = getStoredUserId();
    if (!id) throw new Error("NO_USER_ID");
    return apiFetch(`/api/users/${id}`);
}

export function updateMyProfile(body) {
    const id = getStoredUserId();
    if (!id) throw new Error("NO_USER_ID");
    // Sử dụng endpoint mới /profile cho user tự cập nhật
    return apiFetch(`/api/users/${id}/profile`, { method: "PATCH", body });
}

export async function uploadAvatar(userId, file) {
    const form = new FormData();
    form.append("file", file);
    return apiFetch(`/api/users/${userId}/avatar`, { method: "POST", body: form });
}

export function changePassword(userId, body) {
    return apiFetch(`/api/users/${userId}/change-password`, { method: "POST", body });
}