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
    return apiFetch(`/api/users/${id}`, { method: "PUT", body });
}

export async function uploadAvatar(userId, file) {
    const form = new FormData();
    form.append("file", file);
    return apiFetch(`/api/users/${userId}/avatar`, { method: "POST", body: form });
}