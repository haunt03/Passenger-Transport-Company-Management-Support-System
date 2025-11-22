package org.example.ptcmssbackend.enums;

/**
 * Backward-compatible enum for driver status.
 * Supports both legacy TitleCase values (Available, OnTrip, Inactive)
 * and uppercase values (AVAILABLE, ONTRIP, INACTIVE) that may exist in DB.
 */
public enum DriverStatus {
    // Uppercase variants (for existing DB rows)
    AVAILABLE,
    ONTRIP,
    INACTIVE
}
