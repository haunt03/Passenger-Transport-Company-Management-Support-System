import { apiFetch } from "./http";

/**
 * Remove Vietnamese accents for better search compatibility
 */
function removeVietnameseAccents(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

/**
 * GraphHopper Geocoding API - Autocomplete địa chỉ
 * @param {string} query - Từ khóa tìm kiếm
 * @returns {Promise<Array>} - Danh sách gợi ý địa chỉ
 */
export async function autocompletePlaces(query) {
    if (!query || query.trim().length < 2) {
        return [];
    }

    // Remove Vietnamese accents for better OSM compatibility
    const normalizedQuery = removeVietnameseAccents(query);

    try {
        const response = await apiFetch(`/api/graphhopper/autocomplete?query=${encodeURIComponent(normalizedQuery)}`, {
            auth: false
        });

        return response.map(place => ({
            description: place.description || "",
            fullAddress: place.fullAddress || "",
            placeId: place.placeId || "",
            latitude: place.latitude,
            longitude: place.longitude,
            city: place.city || "",
            state: place.state || "",
            country: place.country || ""
        }));
    } catch (error) {
        console.error("GraphHopper autocomplete error:", error);
        return [];
    }
}

/**
 * Tính khoảng cách giữa 2 địa chỉ
 * @param {string} from - Địa chỉ điểm đi
 * @param {string} to - Địa chỉ điểm đến
 * @returns {Promise<Object>} - {distance, formattedDistance, formattedDuration}
 */
export async function calculateDistance(from, to) {
    // Remove Vietnamese accents for better geocoding
    const normalizedFrom = removeVietnameseAccents(from);
    const normalizedTo = removeVietnameseAccents(to);

    const response = await apiFetch(
        `/api/graphhopper/distance?from=${encodeURIComponent(normalizedFrom)}&to=${encodeURIComponent(normalizedTo)}`,
        { auth: false }
    );

    // Transform GraphHopper response to match expected format
    return {
        distance: response.distanceKm || 0,
        formattedDistance: `${(response.distanceKm || 0).toFixed(1)} km`,
        formattedDuration: `${Math.round(response.durationMinutes || 0)} phút`
    };
}

/**
 * Lấy các tuyến đường thay thế
 * @param {string} from - Địa chỉ điểm đi
 * @param {string} to - Địa chỉ điểm đến
 * @param {number} maxPaths - Số tuyến tối đa (mặc định 3)
 * @returns {Promise<Array>} - Danh sách tuyến đường
 */
export async function getAlternativeRoutes(from, to, maxPaths = 3) {
    // Remove Vietnamese accents for better geocoding
    const normalizedFrom = removeVietnameseAccents(from);
    const normalizedTo = removeVietnameseAccents(to);

    const response = await apiFetch(
        `/api/graphhopper/routes?from=${encodeURIComponent(normalizedFrom)}&to=${encodeURIComponent(normalizedTo)}&maxPaths=${maxPaths}`,
        { auth: false }
    );
    return response;
}
