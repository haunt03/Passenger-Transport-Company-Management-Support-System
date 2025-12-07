# PTCMSS – Chiến Lược Unit Test

## 1. Bản đồ chức năng

| Nhóm chức năng | Backend chính | Frontend chính |
| --- | --- | --- |
| Quản trị hệ thống | `SystemSettingsService`, `BranchService`, `UserService` | `[src/components/module 1/*]` |
| Phương tiện | `VehicleServiceImpl`, `VehicleCategoryService` | `[module 3/*]`, `CoordinatorVehicleListPage` |
| Đơn hàng/Tư vấn | `BookingServiceImpl`, `PricingService` | `CreateOrderPage`, `ConsultantOrderListPage` |
| Điều phối & Lịch chạy | `DispatchServiceImpl`, `TripService`, `NotificationService` | `[module 5/*]` |
| Tài xế | `DriverServiceImpl`, `LeaveRequestService` | `[module 2/*]` |
| Kế toán & Thanh toán | `PaymentService`, `ExpenseRequestService` | `[module 6/*]` |
| Báo cáo & Dashboard | `ReportService`, `AnalyticsService` | `[module 7/*]`, `Dashboard` pages |

## 2. Backend – đề xuất unit test (chi tiết)

### 2.1 Authentication & Session
- `AuthController` / AuthService  
  - Đăng nhập: thành công, sai mật khẩu, user bị khóa.  
  - Refresh / logout (nếu có).
- `SessionService` / utils session  
  - Resolve role hiện tại từ token/session.  
  - Áp dụng `ROLES` cho route quan trọng (sử dụng `@WebMvcTest` kiểm tra `@PreAuthorize`).

### 2.2 Booking & Orders
- `BookingServiceImpl`
  - `create(CreateBookingRequest)`  
    - Tạo đơn với nhiều loại xe, tự tính `depositAmount` khi null.  
    - Ném lỗi khi chi nhánh / hireType không hợp lệ, quantity <= 0.
  - `checkAvailability(CheckAvailabilityRequest)`  
    - Case đủ xe: `availableCount = total - busy - reserved`, `ok == true`.  
    - Case thiếu xe: `ok == false`, `availableCount < needed`, `busyCount = busy + reserved`, có `alternativeCategories`, `nextAvailableSlots`.
  - `assign(id, AssignRequest)`  
    - Tạo `TripVehicles` đúng số lượng, cập nhật `BookingStatus` đúng.  
    - Không cho assign khi booking ở trạng thái không cho phép.
  - Huỷ / cập nhật đơn  
    - Chỉ cho phép trên các status cho phép, tính mất cọc đúng rule.
- Repository liên quan:
  - `BookingRepository`: `findPendingBookings`, `countByStatus`, filter theo chi nhánh/consultant.  
  - `BookingVehicleDetailsRepository`: `countReservedQuantityWithoutAssignedVehicles` với các case:  
    - Booking PENDING/CONFIRMED/INPROGRESS, chưa có `TripVehicles` → được tính.  
    - Đã có `TripVehicles` hoặc ngoài khoảng thời gian → không tính.  
  - `TripRepository`, `TripVehicleRepository`: query trips/vehicles bận theo khoảng thời gian.

### 2.3 Dispatch & Scheduling
- `DispatchServiceImpl`
  - Lấy danh sách trips chờ điều phối theo chi nhánh/ngày, loại bỏ trips đã assign đầy đủ.  
  - Phân công driver/vehicle: chọn theo chi nhánh, loại xe, thời gian rảnh, status driver.  
  - Khi gán: tạo `TripVehicles`, cập nhật trạng thái driver/vehicle và trip.  
  - Sinh cảnh báo khi không tìm được tài xế/xe phù hợp, khi trễ giờ, v.v.
- Service phụ trợ (nếu có): `DriverScheduleService`, `TripQueryService` – tính lịch rảnh/bận.

### 2.4 Vehicle & Driver Management
- `VehicleServiceImpl`  
  - CRUD xe: validate biển số, loại xe, chi nhánh.  
  - Tính trạng thái đăng kiểm/bảo hiểm (còn bao nhiêu ngày, hết hạn).  
  - Lọc xe theo chi nhánh, loại, trạng thái (AVAILABLE/INUSE/MAINTENANCE/INACTIVE).
- `DriverServiceImpl`  
  - CRUD tài xế: validate GPLX, hạng, ngày hết hạn.  
  - Tính trạng thái GPLX (còn ngày, quá hạn).  
  - Chuyển trạng thái driver theo hành động (AVAILABLE/BUSY/ON_LEAVE/INACTIVE).
- Repository: `VehicleRepository.filterVehicles(...)`, `DriverRepository` filter theo chi nhánh/trạng thái.

### 2.5 Driver Schedule, Leave, Incidents
- `DriverScheduleService`  
  - Trả về lịch trips của tài xế đúng trong khoảng ngày, không lẫn chi nhánh.  
  - Hợp nhất nhiều trip trong cùng ngày (nếu có logic).
- `LeaveRequestService`  
  - Tạo yêu cầu nghỉ: không cho phép trùng thời gian với trips đã có.  
  - Phê duyệt/từ chối: cập nhật trạng thái driver & leave request.
- `IncidentReportService` (nếu có)  
  - Tạo report, gửi notification đến Dispatch/Manager.

### 2.6 Accounting & Payments
- `PaymentService` / logic thanh toán trong `BookingServiceImpl`  
  - Ghi nhận thanh toán cọc / thanh toán đủ, không cho over-pay.  
  - Lưu lịch sử thanh toán đúng số tiền, trạng thái booking cập nhật.  
  - Tính toán mất cọc khi huỷ theo rule thời gian.
- `ExpenseRequestService`  
  - Tạo yêu cầu chi phí: validate bắt buộc, số tiền > 0.  
  - Phê duyệt/từ chối: chỉ khi trạng thái còn PENDING, cập nhật số tiền chi.
- Repository: `BookingPaymentRepository`, `ExpenseRequestRepository` với các filter theo trạng thái/chi nhánh.

### 2.7 Reporting & Analytics
- `ReportService` / `AnalyticsService`  
  - Báo cáo doanh thu/chi phí theo khoảng thời gian, chi nhánh.  
  - Thống kê số đơn theo trạng thái (PENDING/CONFIRMED/COMPLETED/CANCELLED).  
  - Unit test với repository mock trả về dữ liệu mẫu.

### 2.8 Hạ tầng & Tiện ích
- `NotificationService` / WebSocket notifier  
  - Gửi đúng tới topic/role/user khi có sự kiện booking/dispatch.  
  - Test với mock `SimpMessagingTemplate` hoặc wrapper.
- `FileStorageService`  
  - Lưu file vào đúng thư mục, chặn path traversal, filter extension.  
  - Xử lý lỗi IO trả ra message phù hợp.
- Utility class (`DateTimeUtils`, `PriceCalculator`, …)  
  - Các hàm tính toán ngày giờ, giá tiền, được test độc lập, không cần Spring context.

## 3. Frontend – đề xuất unit test

### Setup
- Use Vitest + React Testing Library.
- Mock API modules (`src/api/*`), `WebSocketContext`, `session` utils.
- Provide helper to render with router + role context.

### Common components
- Inputs, modals, pagination: snapshot + interaction tests.
- `NotificationToast`: ensures queueing + auto-dismiss.

### Module 1 – Admin
- `AdminUsersPage`: filter by status/role, API error handling.
- `SystemSettingsPage`: form validation, optimistic update.

### Module 2 – Driver
- `DriverDashboard`: metrics shown for given mock API data.
- `DriverSchedulePage`: date filter updates list + empty state.
- `DriverLeaveRequestPage`: form validation + success toast.

### Module 3 – Vehicles
- `VehicleListPage`: branch filter auto-applied; time filter toggles `vehicleAvailability`.
- `VehicleDetailPage`: renders inspection/insurance badges.
- `VehicleCategoryManagePage`: add/edit category form logic.

### Module 4 – Consultant
- `CreateOrderPage`:
  - Form sections validation.
  - `checkVehicleAvailability` triggered once per selection.
  - Price recalculation when inputs change.
- `ConsultantOrderListPage`: search/pagination state persists in URL.
- `OrderDetailPage`: shows unassigned trips count + triggers assign dialog.

### Module 5 – Coordinator
- `CoordinatorVehicleListPage`: search, branch scoping, time filter (badge only when available).
- `CoordinatorDriverListPage`: availability badge gate logic.
- `CoordinatorTimelinePro`: drag-drop or status change events produce dispatch calls (mock).
- `NotificationsDashboard`: filters warnings vs critical.

### Module 6 – Accounting
- `ExpenseRequestForm`: dynamic list of expenses; submit disabled until valid.
- `InvoiceManagement`: bulk actions enable only when selection non-empty.

### Module 7 – Reporting
- `AdminDashboard`: renders cards for summary metrics; fallback message when API fails.
- `ManagerDashboard`: ensures chart receives normalized data.

### Cross-cutting
- Role-based navigation guard tests via `ProtectedRoute`.
- `WebSocketContext`: ensures message subscription pushes to `NotificationToast`.

## 4. Ưu tiên & Thực thi

1. **Critical path**: Booking/Dispatch backend + CreateOrder/Coordinator frontend.
2. **Regression layer**: Authentication/session, SystemSettings, Vehicle/Driver, Payment flows.
3. **UI polish**: Reporting dashboards, admin grids.

### CI workflow
- Backend: Maven `mvn -pl ptcmss-backend test` (GitHub Actions windows + ubuntu matrix).
- Frontend: `npm ci`, `npm run test -- --runInBand`.
- Collect coverage via `jacoco` + Vitest coverage; fail if < threshold (e.g., 70% for critical packages).

### Checklist
- [ ] Tests created for each backend service in scope.
- [ ] React components have corresponding specs in `__tests__` or `.test.jsx`.
- [ ] Mocks for APIs consolidated under `tests/mocks`.
- [ ] CI pipeline executes both suites + uploads coverage report.

