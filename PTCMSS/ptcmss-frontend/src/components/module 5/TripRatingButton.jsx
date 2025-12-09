import React, { useState, useEffect } from 'react';
import { Star, CheckCircle } from 'lucide-react';
import RateDriverDialog from './RateDriverDialog';
import { getRatingByTrip } from '../../api/ratings';

const TripRatingButton = ({ trip, onRatingComplete }) => {
    const [showDialog, setShowDialog] = useState(false);
    const [existingRating, setExistingRating] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkExistingRating();
    }, [trip.tripId]);

    const checkExistingRating = async () => {
        if (trip.status !== 'COMPLETED') {
            setLoading(false);
            return;
        }

        try {
            const response = await getRatingByTrip(trip.tripId);
            setExistingRating(response.data);
        } catch (error) {
            console.error('Error checking rating:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        checkExistingRating();
        onRatingComplete?.();
    };

    // Don't show button if trip is not completed
    if (trip.status !== 'COMPLETED') {
        return null;
    }

    if (loading) {
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Đang kiểm tra...
            </div>
        );
    }

    // Show rated status if already rated
    if (existingRating) {
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Đã đánh giá</span>
                <div className="flex ml-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            size={14}
                            className={
                                star <= (existingRating.overallRating || 0)
                                    ? 'fill-primary-500 text-primary-500'
                                    : 'text-gray-300'
                            }
                        />
                    ))}
                </div>
                <span className="text-sm font-semibold">
                    {parseFloat(existingRating.overallRating).toFixed(1)}
                </span>
            </div>
        );
    }

    // Show rate button
    return (
        <>
            <button
                onClick={() => setShowDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                <Star size={18} />
                <span className="font-medium">Đánh giá tài xế</span>
            </button>

            {showDialog && (
                <RateDriverDialog
                    trip={trip}
                    onClose={() => setShowDialog(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
};

export default TripRatingButton;
