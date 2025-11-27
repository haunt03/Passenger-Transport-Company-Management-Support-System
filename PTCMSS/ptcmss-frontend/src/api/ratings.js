import { apiFetch } from './http';

export function createRating(ratingData) {
    return apiFetch('/api/ratings', {
        method: 'POST',
        body: ratingData, // apiFetch sẽ tự động stringify
    });
}

export function getRatingByTrip(tripId) {
    return apiFetch(`/api/ratings/trip/${tripId}`);
}

export function getDriverRatings(driverId, limit = null) {
    const params = limit ? `?limit=${limit}` : '';
    return apiFetch(`/api/ratings/driver/${driverId}${params}`);
}

export function getDriverPerformance(driverId, days = 30) {
    return apiFetch(`/api/ratings/driver/${driverId}/performance?days=${days}`);
}

export function getCompletedTripsForRating() {
    return apiFetch('/api/ratings/trips/completed');
}
