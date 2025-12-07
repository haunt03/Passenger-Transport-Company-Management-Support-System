package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.TripStatus;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Disabled("Repository integration test uses real DB; skipped for pure unit-test runs")
class BookingVehicleDetailsRepositoryTest {

    @Autowired
    private BookingVehicleDetailsRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void countReservedQuantityWithoutAssignedVehicles_shouldIncludeOnlyBookingsWithoutTripVehicles() {
        Branches branch = persistBranch("Chi nhánh Đà Nẵng");
        VehicleCategoryPricing category = persistCategory("Xe 45 chỗ");
        Customers customer = persistCustomer("Nguyễn Văn A");

        Instant start = Instant.parse("2025-12-04T02:00:00Z");
        Instant end = start.plusSeconds(3 * 3600);

        // Booking chưa gán xe => phải được tính
        Bookings pendingBooking = persistBooking(customer, branch, BookingStatus.PENDING, new BigDecimal("5000000"));
        persistTrip(pendingBooking, start, end);
        persistBookingVehicleDetails(pendingBooking, category, 2);

        // Booking đã gán xe => không được tính
        Bookings assignedBooking = persistBooking(customer, branch, BookingStatus.CONFIRMED, new BigDecimal("7000000"));
        Trips assignedTrip = persistTrip(assignedBooking, start, end);
        persistBookingVehicleDetails(assignedBooking, category, 3);
        Vehicles vehicle = persistVehicle(branch, category, "43A-123.45");
        persistTripVehicle(assignedTrip, vehicle);

        entityManager.flush();

        List<BookingStatus> statuses = List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.INPROGRESS);
        Integer reserved = repository.countReservedQuantityWithoutAssignedVehicles(
                branch.getId(),
                category.getId(),
                start.minusSeconds(3600),
                end.plusSeconds(3600),
                statuses
        );

        assertThat(reserved).isEqualTo(2);
    }

    private Branches persistBranch(String name) {
        Branches branch = new Branches();
        branch.setBranchName(name);
        branch.setStatus(BranchStatus.ACTIVE);
        return entityManager.persist(branch);
    }

    private VehicleCategoryPricing persistCategory(String name) {
        VehicleCategoryPricing category = new VehicleCategoryPricing();
        category.setCategoryName(name);
        category.setSeats(45);
        category.setPricePerKm(new BigDecimal("15000"));
        return entityManager.persist(category);
    }

    private Customers persistCustomer(String name) {
        Customers customer = new Customers();
        customer.setFullName(name);
        customer.setPhone("0909123456");
        return entityManager.persist(customer);
    }

    private Bookings persistBooking(Customers customer, Branches branch, BookingStatus status, BigDecimal deposit) {
        Bookings booking = new Bookings();
        booking.setCustomer(customer);
        booking.setBranch(branch);
        booking.setStatus(status);
        booking.setDepositAmount(deposit);
        booking.setTotalCost(deposit);
        return entityManager.persist(booking);
    }

    private Trips persistTrip(Bookings booking, Instant start, Instant end) {
        Trips trip = new Trips();
        trip.setBooking(booking);
        trip.setStartTime(start);
        trip.setEndTime(end);
        trip.setStatus(TripStatus.SCHEDULED);
        return entityManager.persist(trip);
    }

    private BookingVehicleDetails persistBookingVehicleDetails(Bookings booking,
                                                               VehicleCategoryPricing category,
                                                               int quantity) {
        BookingVehicleDetails details = new BookingVehicleDetails();
        BookingVehicleDetailsId id = new BookingVehicleDetailsId();
        id.setBookingId(booking.getId());
        id.setVehicleCategoryId(category.getId());
        details.setId(id);
        details.setBooking(booking);
        details.setVehicleCategory(category);
        details.setQuantity(quantity);
        return entityManager.persist(details);
    }

    private Vehicles persistVehicle(Branches branch, VehicleCategoryPricing category, String plate) {
        Vehicles vehicle = new Vehicles();
        vehicle.setBranch(branch);
        vehicle.setCategory(category);
        vehicle.setLicensePlate(plate);
        vehicle.setCapacity(category.getSeats());
        return entityManager.persist(vehicle);
    }

    private TripVehicles persistTripVehicle(Trips trip, Vehicles vehicle) {
        TripVehicles tripVehicle = new TripVehicles();
        tripVehicle.setTrip(trip);
        tripVehicle.setVehicle(vehicle);
        return entityManager.persist(tripVehicle);
    }
}

