# Yêu cầu Hệ thống Quản lý Vận tải Hành khách (PTCMSS)

---

## 🧩 Module 1: Quản trị người dùng, phân quyền và quản lý hệ thống (System Administration)
**Vai trò chính:** Admin

---

### 1. Quản lý Thiết lập Hệ thống (System Settings)

*(Bao gồm Màn hình: Xem/Thêm/Chỉnh sửa các giá trị trong System Settings)*

**Mô tả màn hình (Thuộc tính & Hiển thị):**
* Giao diện dạng danh sách các cặp Key-Value, có nút "Thêm mới thiết lập".
* Mỗi dòng hiển thị: Key (ví dụ: `VAT`), Giá trị (input), Mô tả (input).
* Nút "Lưu thay đổi" (để cập nhật hàng loạt) và nút "Xóa" ở mỗi dòng.

**Thiết kế API (Endpoints):**
* `POST /api/admin/settings`: Tạo một thiết lập mới (thêm 1 key mới).
  * **Request Body:**
      ```json
      {
        "settingKey": "NEW_KEY",
        "settingValue": "...",
        "description": "...",
        "valueType": "string"
      }
      ```
* `GET /api/admin/settings`: Lấy danh sách tất cả thiết lập.
  * **Response:**
      ```json
      [
        { "key": "VAT", "value": "10", "description": "..." },
        ...
      ]
      ```
* `PUT /api/admin/settings`: Cập nhật giá trị của nhiều thiết lập cùng lúc (dùng cho nút "Lưu thay đổi").
  * **Request Body:**
      ```json
      [
        { "key": "VAT", "value": "8" },
        { "key": "MAX_DRIVER_LEAVE_DAYS", "value": "4" }
      ]
      ```
* `DELETE /api/admin/settings/{settingKey}`: Xóa một thiết lập (key) khỏi hệ thống.

---

### 2. Quản lý Chi nhánh (Branches)

*(Bao gồm Màn hình: Tạo (M1.S2), Xem danh sách (M1.S3), Xem chi tiết/Chỉnh sửa (M1.S4))*

**Mô tả màn hình:**
* **Danh sách (M1.S3):** Bảng hiển thị: "Tên", "Địa chỉ", "Quản lý", "Số NV", "Trạng thái". Nút "Tạo mới". Hành động: "Sửa", "Xóa" (vô hiệu hóa).
* **Form (M1.S2, M1.S4):** Các trường "Tên", "Địa chỉ", "SĐT", Dropdown "Quản lý", Dropdown "Trạng thái".

**Thiết kế API (Endpoints):**
* `POST /api/admin/branches`: Tạo một chi nhánh mới.
  * **Request Body:**
      ```json
      {
        "name": "Chi nhánh Hà Nội",
        "location": "...",
        "managerId": 5
      }
      ```
* `GET /api/admin/branches`: Lấy danh sách chi nhánh (có phân trang và lọc).
  * **Query Params:** `page`, `limit`, `status`, `keyword`
  * **Response:**
      ```json
      {
        "data": [...],
        "pagination": { "total": 10, ... }
      }
      ```
* `GET /api/admin/branches/{branchId}`: Lấy thông tin chi tiết 1 chi nhánh.
* `PUT /api/admin/branches/{branchId}`: Cập nhật thông tin chi nhánh.
  * **Request Body:**
      ```json
      {
        "name": "...",
        "managerId": 6,
        "status": "Inactive"
      }
      ```
* `DELETE /api/admin/branches/{branchId}`: Vô hiệu hóa/Xóa mềm chi nhánh (cập nhật `status` = 'Closed').

---

### 3. Quản lý Người dùng & Phân quyền (Users & Roles)

*(Bao gồm Màn hình: Tạo User (M1.S5), List Users (M1.S7), View/Edit User (M1.S8))*

**Mô tả màn hình:**
* **Danh sách (M1.S7):** Bảng (Họ tên, Email, Vai trò, Chi nhánh, Trạng thái). Nút "Tạo mới". Bộ lọc (Vai trò, Chi nhánh, Trạng thái). Hành động: "Sửa", "Vô hiệu hóa".
* **Form (M1.S5, M1.S8):** Các trường "Họ tên", "Email", "SĐT", "Mật khẩu", Dropdown "Vai trò", "Chi nhánh", "Trạng thái". Nút "Đặt lại mật khẩu".

**Thiết kế API (Endpoints):**
* `POST /api/admin/users`: Tạo người dùng mới (bao gồm `Employee` và `Driver` nếu `role` = 'DRIVER').
  * **Request Body:**
      ```json
      {
        "fullName": "Nguyễn Văn A",
        "username": "anv",
        "email": "a@example.com",
        "password": "...",
        "phone": "...",
        "roleId": 3,
        "branchId": 1
      }
      ```
* `GET /api/admin/users`: Lấy danh sách user (phân trang và lọc).
  * **Query Params:** `page`, `limit`, `roleId`, `branchId`, `status`, `keyword`
* `GET /api/admin/users/{userId}`: Lấy chi tiết 1 user.
* `PUT /api/admin/users/{userId}`: Cập nhật thông tin user.
  * **Request Body:**
      ```json
      {
        "fullName": "...",
        "roleId": 3,
        "branchId": 1,
        "status": "Active"
      }
      ```
* `DELETE /api/admin/users/{userId}`: Vô hiệu hóa/Xóa mềm user (cập nhật `status` = 'Inactive').
* `POST /api/admin/users/{userId}/reset-password`: (Admin đặt lại mật khẩu cho user).
* `GET /api/admin/roles`: Lấy danh sách tất cả các vai trò (dùng cho dropdown).

---

### 4. Quản lý Vai trò (Roles) - (Màn hình mới)

**Mô tả màn hình:**
* Giao diện CRUD đơn giản (giống Quản lý Chi nhánh) để Admin thêm/sửa/xóa các vai trò trong hệ thống.
* Bảng hiển thị: "Tên vai trò", "Mô tả", "Số lượng người dùng".

**Thiết kế API (Endpoints):**
* `POST /api/admin/roles`: Tạo một vai trò mới.
  * **Request Body:** `{"roleName": "Accountant", "description": "..."}`
* `GET /api/admin/roles`: Lấy danh sách tất cả vai trò.
* `GET /api/admin/roles/{roleId}`: Lấy chi tiết 1 vai trò.
* `PUT /api/admin/roles/{roleId}`: Cập nhật 1 vai trò.
  * **Request Body:** `{"roleName": "...", "description": "..."}`
* `DELETE /api/admin/roles/{roleId}`: Xóa 1 vai trò (chỉ khi không có user nào đang giữ).

---

### 5. Xác thực & Hồ sơ cá nhân (Authentication & Profile)

*(Bao gồm Màn hình: Login (M1.S6), Update Profile (M1.S9))*

**Thiết kế API (Endpoints):**
* `POST /api/auth/login`: Xác thực người dùng.
  * **Request Body:** `{"username": "anv", "password": "..."}`
  * **Response:** `{ "token": "...", "user": { ... } }`
* `GET /api/auth/profile`: Lấy thông tin của user đang đăng nhập (từ token).
* `PUT /api/auth/profile`: Cập nhật thông tin (Họ tên, SĐT).
  * **Request Body:** `{"fullName": "...", "phone": "..."}`
* `POST /api/auth/change-password`: Tự đổi mật khẩu.
  * **Request Body:** `{"oldPassword": "...", "newPassword": "..."}`

---
---

## 🧩 Module 2: Quản lý tài xế (Driver Management - Giao diện Web)
**Vai trò chính:** Driver

---

### 1. Dashboard & Thông báo (Dashboard & Notifications)

*(Bao gồm Màn hình: Driver Dashboard (M2.S1), Xem thông báo (M2.S2))*

**Thiết kế API (Endpoints):**
* `GET /api/driver/dashboard`: Lấy thông tin tổng hợp cho dashboard (chuyến sắp tới, hiện tại, thông báo mới).
* `GET /api/driver/notifications`: Lấy danh sách đầy đủ thông báo (phân trang).
  * **Query Params:** `page`, `limit`, `isRead`
* `PUT /api/driver/notifications/{notificationId}/read`: Đánh dấu một thông báo là đã đọc.
* `DELETE /api/driver/notifications/{notificationId}`: Xóa một thông báo (ẩn khỏi danh sách).
* `PUT /api/driver/notifications/read-all`: Đánh dấu tất cả là đã đọc.

---

### 2. Hồ sơ & Lịch trình (Profile & Schedule)

*(Bao gồm Màn hình: Thông tin tài xế (M2.S3), Lịch trình làm việc (M2.S4))*

**Thiết kế API (Endpoints):**
* `GET /api/driver/profile`: Lấy thông tin profile của tài xế (thông tin cá nhân, bằng lái, thống kê).
* `PUT /api/driver/profile`: Cập nhật thông tin (SĐT, Địa chỉ).
  * **Request Body:** `{"phone": "...", "address": "..."}`
* `GET /api/driver/schedule`: Lấy dữ liệu lịch (chuyến đi, ngày nghỉ) cho 1 tháng.
  * **Query Params:** `month`, `year`
  * **Response:** `[ { "date": "...", "type": "TRIP", ... }, { "date": "...", "type": "LEAVE", ... } ]`

---

### 3. Quản lý Nghỉ phép (Leave Requests)

*(Bao gồm Màn hình: Đăng ký lịch nghỉ (M2.S5))*

**Mô tả màn hình:**
* Form đăng ký (M2.S5) và một tab "Lịch sử nghỉ phép" để xem trạng thái (Pending, Approved, Rejected).

**Thiết kế API (Endpoints):**
* `POST /api/driver/leave-requests`: Gửi yêu cầu nghỉ.
  * **Request Body:** `{"startDate": "...", "endDate": "...", "reason": "..."}`
* `GET /api/driver/leave-requests`: Lấy lịch sử/danh sách các yêu cầu nghỉ của tài xế (phân trang).
  * **Query Params:** `page`, `limit`, `status`
* `GET /api/driver/leave-requests/{leaveId}`: Xem chi tiết 1 yêu cầu.
* `DELETE /api/driver/leave-requests/{leaveId}`: Hủy một yêu cầu nghỉ (chỉ khi `status` = 'Pending').

---

### 4. Quản lý Chuyến đi & Chi phí (Trips & Expenses)

*(Bao gồm Màn hình: Xem chi tiết chuyến (M2.S6), Tạo chi phí (M2.S7))*

**Thiết kế API (Endpoints):**
* `GET /api/driver/trips/upcoming`: Lấy chuyến đi sắp tới (dùng cho dashboard).
* `GET /api/driver/trips/{tripId}`: Lấy chi tiết chuyến đi.
* `PUT /api/driver/trips/{tripId}/status`: Cập nhật trạng thái chuyến (Bắt đầu, Đón khách, Hoàn thành).
  * **Request Body:** `{"status": "Ongoing"}`
* `POST /api/driver/trips/{tripId}/expenses`: Thêm chi phí phát sinh cho chuyến đi.
  * **Request Body:** (FormData) `type=FUEL`, `amount=500000`, `note=...`, `image=(file)`
* `GET /api/driver/trips/{tripId}/expenses`: Lấy danh sách chi phí đã tạo cho chuyến đi.
* `DELETE /api/driver/trips/{tripId}/expenses/{expenseId}`: Xóa một chi phí (chỉ khi chưa được duyệt).

---
---

## 🧩 Module 3: Quản lý phương tiện (Vehicle Management)
**Vai trò chính:** Admin, Manager

---

### 1. Quản lý Danh mục xe (Vehicle Categories)

*(Bao gồm Màn hình: Tạo (M3.S1), List (M3.S2), Chi tiết/Cập nhật (M3.S3))*

**Thiết kế API (Endpoints):**
* `POST /api/admin/vehicle-categories`: Tạo danh mục xe mới.
  * **Request Body:** `{"categoryName": "7 chỗ", "description": "...", "baseFare": 100000, "pricePerKm": 10000, ...}` (Sử dụng các trường từ bảng `VehicleCategoryPricing`)
* `GET /api/admin/vehicle-categories`: Lấy danh sách danh mục xe.
  * **Query Params:** `page`, `limit`, `status`
* `GET /api/admin/vehicle-categories/{categoryId}`: Lấy chi tiết 1 danh mục.
* `PUT /api/admin/vehicle-categories/{categoryId}`: Cập nhật danh mục.
  * **Request Body:** (Giống `POST`, nhưng cập nhật)
* `DELETE /api/admin/vehicle-categories/{categoryId}`: Xóa/Vô hiệu hóa một danh mục (cập nhật `status` = 'Inactive').

---

### 2. Quản lý Phương tiện (Vehicles)

*(Bao gồm Màn hình: Tạo (M3.S4), List (M3.S5), Chi tiết/Cập nhật (M3.S6))*

**Thiết kế API (Endpoints):**
* `POST /api/vehicles`: Tạo xe mới.
  * **Request Body:**
      ```json
      {
        "licensePlate": "29A-12345",
        "categoryId": 1,
        "branchId": 1,
        "model": "Vios",
        "capacity": 7,
        "productionYear": 2020,
        "inspectionExpiry": "...",
        ...
      }
      ```
* `GET /api/vehicles`: Lấy danh sách xe (phân trang, lọc).
  * **Query Params:** `page`, `limit`, `branchId`, `categoryId`, `status`, `licensePlate`
  * > **Business Rule:** Manager chỉ thấy xe của chi nhánh mình, Admin thấy tất cả.
* `GET /api/vehicles/{vehicleId}`: Lấy chi tiết xe (thông tin hồ sơ).
* `PUT /api/vehicles/{vehicleId}`: Cập nhật thông tin hồ sơ xe.
  * **Request Body:** `{"odometer": 55000, "status": "Maintenance", ...}`
* `DELETE /api/vehicles/{vehicleId}`: Xóa mềm/Vô hiệu hóa xe (cập nhật `status` = 'Inactive').
* `GET /api/vehicles/{vehicleId}/trips`: (API cho Tab 2) Lấy lịch sử chuyến (phân trang).
* `GET /api/vehicles/{vehicleId}/expenses`: (API cho Tab 3) Lấy lịch sử chi phí (phân trang).

---
---

## 🧩 Module 4: Quản lý báo giá & đặt chuyến (Booking Management)
**Vai trò chính:** Consultant (Tư vấn viên)

---

### 1. Dashboard & Tiện ích (Consultant Dashboard & Utilities)

*(Bao gồm Màn hình: Dashboard (M4.S1) và các API hỗ trợ cho M4.S2)*

**Thiết kế API (Endpoints):**
* `GET /api/consultant/dashboard`: Lấy dữ liệu tổng hợp cho dashboard (đơn chờ xử lý, thống kê cá nhân).
* `POST /api/bookings/check-availability`: (Hỗ trợ M4.S2) Kiểm tra số lượng xe khả dụng.
  * **Request Body:** `{"startTime": "...", "endTime": "...", "categoryId": 1, "branchId": 1}`
  * **Response:** `{"available": true, "count": 5}`
* `POST /api/bookings/calculate-price`: (Hỗ trợ M4.S2) Tính giá dự kiến.
  * **Request Body:** `{"startLocation": "...", "endLocation": "...", "categoryId": 1, "hireTypeId": 1, "useHighway": true}`
  * **Response:** `{"estimatedCost": 1200000}`
* `GET /api/customers/search`: (Hỗ trợ M4.S2) Tìm khách hàng theo SĐT.
  * **Query Params:** `phone=0912...`

---

### 2. Quản lý Đơn hàng (Bookings)

*(Bao gồm Màn hình: Tạo (M4.S2), List (M4.S3), Chi tiết (M4.S4), Sửa (M4.S5))*

**Thiết kế API (Endpoints):**
* `POST /api/bookings`: Tạo đơn hàng (Booking) chính thức.
  * **Request Body:**
      ```json
      {
        "customer": {"phone": "...", "fullName": "..."},
        "branchId": 1,
        "hireTypeId": 1,
        "useHighway": true,
        "estimatedCost": 1200000,
        "totalCost": 1100000, // Giá báo khách
        "depositAmount": 500000,
        "status": "Pending",
        "vehicles": [ // Thông tin từ BookingVehicleDetails
          {"vehicleCategoryId": 1, "quantity": 1}
        ],
        "trips": [ // Thông tin từ Trips
          {"startTime": "...", "endTime": "...", "startLocation": "...", "endLocation": "..."}
        ]
      }
      ```
* `GET /api/bookings`: Lấy danh sách đơn hàng (API tự lọc theo `branchId` của consultant, Admin thấy hết).
  * **Query Params:** `page`, `limit`, `status`, `startDate`, `keyword` (mã đơn, SĐT khách)
* `GET /api/bookings/{bookingId}`: Lấy chi tiết đơn hàng (bao gồm thông tin khách, trips, payments, dispatch).
* `PUT /api/bookings/{bookingId}`: Cập nhật thông tin đơn hàng.
  * (Chỉ cho phép khi `status` = 'Pending' hoặc 'Confirmed').
  * **Request Body:** (Tương tự `POST`)
* `DELETE /api/bookings/{bookingId}`: Hủy đơn hàng (cập nhật `status` = 'Cancelled').

---
---

## 🧩 Module 5: Quản lý lịch trình & điều phối chuyến (Dispatch Management)
**Vai trò chính:** Coordinator (Điều phối viên)

---

### 1. Dashboard & Điều phối (Coordinator Dashboard & Assignment)

*(Bao gồm Màn hình: Dashboard (M5.S1), Gán chuyến (M5.S3))*

**Thiết kế API (Endpoints):**
* `GET /api/coordinator/dashboard`: Lấy dữ liệu dashboard (đơn PENDING, lịch trình tài xế/xe dạng Gantt).
  * **Query Params:** `date=...`, `branchId` (Admin có thể chọn)
  * **Response:** `{"pendingBookings": [...], "driverSchedules": [...], "vehicleSchedules": [...]}`
* `GET /api/coordinator/trips/{tripId}/suggestions`: Lấy danh sách [Tài xế + Xe] gợi ý cho 1 chuyến.
* `POST /api/coordinator/trips/{tripId}/assign`: Gán tài xế và xe cho 1 chuyến (Trip).
  * **Request Body (Manual):** `{"driverId": 101, "vehicleId": 55}`
* `POST /api/coordinator/trips/{tripId}/unassign`: Hủy gán (gỡ tài xế/xe) khỏi chuyến (trước khi chuyến bắt đầu).

---

### 2. Phê duyệt & Chi phí chung (Approvals & General Expenses)

*(Bao gồm Màn hình: Thông báo (M5.S2), Tạo chi phí chung (M5.S4))*

**Thiết kế API (Endpoints):**
* `GET /api/coordinator/approvals`: Lấy danh sách các mục chờ duyệt (nghỉ phép, giảm giá, chi phí).
* `POST /api/coordinator/leave-requests/{leaveId}/approve`: Duyệt nghỉ phép.
* `POST /api/coordinator/leave-requests/{leaveId}/reject`: Từ chối nghỉ phép.
* `POST /api/coordinator/bookings/{bookingId}/discount/approve`: Duyệt giảm giá.
* `POST /api/coordinator/bookings/{bookingId}/discount/reject`: Từ chối giảm giá.
* `POST /api/expenses`: Tạo yêu cầu chi phí chung (bảo dưỡng, bến bãi...).
  * **Request Body:** `{"type": "MAINTENANCE", "vehicleId": 55, "amount": 2000000, ...}`
* `GET /api/expenses`: Lấy danh sách chi phí chung (phân trang, lọc).
  * **Query Params:** `page`, `limit`, `type`, `vehicleId`, `status`
* `GET /api/expenses/{expenseId}`: Xem chi tiết 1 chi phí chung.
* `PUT /api/expenses/{expenseId}`: Cập nhật 1 chi phí chung (trước khi duyệt).
* `DELETE /api/expenses/{expenseId}`: Xóa 1 chi phí chung (trước khi duyệt).

---
---

## 🧩 Module 6: Quản lý chi phí & tài chính (Accounting Management)
**Vai trò chính:** Accountant (Kế toán)

---

### 1. Dashboard & Phê duyệt Chi phí (Accountant Dashboard & Expense Approval)

*(Bao gồm Màn hình: Accountant Dashboard (M6.S1))*

**Thiết kế API (Endpoints):**
* `GET /api/accountant/dashboard`: Lấy dữ liệu dashboard (biểu đồ, công nợ, danh sách chi phí chờ duyệt).
* `GET /api/accountant/expenses-queue`: Lấy danh sách tất cả chi phí (từ Driver và Coordinator) đang chờ duyệt.
  * **Query Params:** `page`, `limit`
* `POST /api/accountant/expenses/{expenseId}/approve`: Duyệt 1 chi phí (thay đổi `paymentStatus` = 'Paid' hoặc 'Approved').
* `POST /api/accountant/expenses/{expenseId}/reject`: Từ chối 1 chi phí.

---

### 2. Quản lý Hóa đơn & Công nợ (Invoices & Debt)

*(Bao gồm Màn hình: Quản lý hóa đơn (M6.S2), Quản lý công nợ (M6.S4))*

**Thiết kế API (Endpoints):**
* `POST /api/accountant/invoices`: Tạo hóa đơn (thu) từ một Booking đã hoàn thành.
  * **Request Body:** `{"bookingId": 123, "totalAmount": 1100000, "dueDate": "..."}`
* `GET /api/accountant/invoices`: Lấy danh sách hóa đơn (phân trang, lọc).
  * **Query Params:** `page`, `limit`, `status` ('Unpaid', 'Paid', 'Overdue'), `customerId`, `keyword`
* `GET /api/accountant/invoices/{invoiceId}`: Lấy chi tiết 1 hóa đơn.
* `PUT /api/accountant/invoices/{invoiceId}`: Cập nhật hóa đơn (sửa thông tin, `dueDate`).
* `DELETE /api/accountant/invoices/{invoiceId}`: Hủy/Void hóa đơn (cập nhật `status` = 'Cancelled').
* `POST /api/accountant/invoices/{invoiceId}/send-email`: Gửi email hóa đơn cho khách.

---

### 3. Quản lý Thanh toán (Payments)

*(Bao gồm Màn hình: Ghi nhận Cọc/Thanh toán (M6.S3))*

**Thiết kế API (Endpoints):**
* `POST /api/accountant/payments`: Ghi nhận một khoản thanh toán (liên kết với `Booking` hoặc `Invoice`).
  * **Request Body:**
      ```json
      {
        "invoiceId": 50,
        "bookingId": 123, // Có thể là cọc (isDeposit=true)
        "amount": 500000,
        "paymentMethod": "BANK_TRANSFER",
        "paymentDate": "...",
        "isDeposit": true
      }
      ```
* `GET /api/accountant/invoices/{invoiceId}/payments`: Lấy danh sách thanh toán của 1 hóa đơn.
* `GET /api/accountant/bookings/{bookingId}/payments`: Lấy danh sách thanh toán/cọc của 1 đơn hàng.
* `DELETE /api/accountant/payments/{paymentId}`: Hủy/Xóa một giao dịch thanh toán (do nhầm lẫn).

---

### 4. Báo cáo Tài chính (Financial Reports)

*(Bao gồm Màn hình: Báo cáo Doanh thu (M6.S5), Báo cáo Chi phí (M6.S6))*

**Thiết kế API (Endpoints):**
* `GET /api/reports/revenue`: Lấy dữ liệu báo cáo doanh thu.
  * **Query Params:** `fromDate`, `toDate`, `branchId`, `customerId`
  * **Response:** `{ "totalRevenue": ..., "chartData": [...], "details": [...] }`
* `GET /api/reports/expense`: Lấy dữ liệu báo cáo chi phí.
  * **Query Params:** `fromDate`, `toDate`, `branchId`, `type` (loại CP), `vehicleId`
  * **Response:** `{ "totalExpense": ..., "chartData": [...], "details": [...] }`

---
---

## 🧩 Module 7: Báo cáo & Phân tích (Reporting & Analytics)
**Vai trò chính:** Admin, Manager

---

### 1. Dashboard Tổng quan (Admin & Manager Dashboards)

*(Bao gồm Màn hình: Dashboard Admin (M7.S1), Dashboard Manager (M7.S2))*

**Thiết kế API (Endpoints):**
* `GET /api/admin/dashboard-stats`: Lấy số liệu thống kê cho Admin (toàn công ty).
  * **Query Params:** `fromDate`, `toDate`
* `GET /api/manager/dashboard-stats`: Lấy số liệu thống kê (API tự lọc theo `branchId` của Manager).
  * **Query Params:** `fromDate`, `toDate`
* `GET /api/reports/fleet-utilization`: Báo cáo hiệu suất sử dụng xe.
* `GET /api/reports/driver-performance`: Báo cáo hiệu suất tài xế (View `v_DriverMonthlyPerformance`).

---
---

## 🧩 Module 8: Ứng dụng tài xế (Driver Mobile App)
**Vai trò chính:** Driver (Giao diện Mobile)

*(Module này chủ yếu sử dụng lại các API đã định nghĩa ở Module 2, nhưng có thêm các API đặc thù cho Mobile)*

**Thiết kế API (Endpoints):**
* `POST /api/driver/fcm-token`: (Khi đăng nhập) Gửi FCM token của thiết bị lên server.
  * **Request Body:** `{"token": "DEVICE_FCM_TOKEN_HERE"}`
* `GET /api/driver/schedule`: (M8.S2) Lấy lịch trình cá nhân (dùng M2.S4).
* `POST /api/driver/leave-requests`: (M8.S3) Đăng ký nghỉ (dùng M2.S5).
* `GET /api/driver/leave-requests`: (M8.S3) Xem lịch sử nghỉ (dùng M2.S5).
* `POST /api/driver/trips/{tripId}/respond`: (M8.S4) Phản hồi (Chấp nhận/Từ chối) chuyến đi mới được gán.
  * **Request Body:** `{"action": "ACCEPT"}` (hoặc `REJECT`)
* `GET /api/driver/trips/{tripId}`: (M8.S5) Xem chi tiết chuyến đi (dùng M2.S6).
* `PUT /api/driver/trips/{tripId}/status`: (M8.S5) Cập nhật trạng thái chuyến (dùng M2.S6).
* `POST /api/driver/trips/{tripId}/incident`: (M8.S6) Gửi báo cáo sự cố.
  * **Request Body:** `{"type": "VEHICLE_BREAKDOWN", "notes": "...", "location": "..."}`
* `GET /api/driver/trips/{tripId}/incidents`: (M8.S6) Lấy lịch sử các sự cố đã báo cáo cho chuyến.

