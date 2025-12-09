import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating, size = 16, showValue = true, className = '' }) => {
    const value = parseFloat(rating) || 0;

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={size}
                    className={star <= value ? 'fill-primary-500 text-primary-500' : 'text-gray-300'}
                />
            ))}
            {showValue && value > 0 && (
                <span className="ml-1 text-sm font-medium text-gray-700">
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
};

export default StarRating;
