package org.example.ptcmssbackend.exception;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.Date;

import static org.springframework.http.HttpStatus.*;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handle exception when validate data
     *
     * @param e
     * @param request
     * @return errorResponse
     */
    @ExceptionHandler({ConstraintViolationException.class,
            MissingServletRequestParameterException.class, MethodArgumentNotValidException.class})
    @ResponseStatus(BAD_REQUEST)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "400", description = "Bad Request",
                    content = {@Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "Handle exception when the data invalid. (@RequestBody, @RequestParam, @PathVariable)",
                                    summary = "Handle Bad Request",
                                    value = "{\"timestamp\": \"2024-04-07T11:38:56.368+00:00\", \"status\": 400, \"path\": \"/api/v1/...\", \"error\": \"Invalid Payload\", \"message\": \"{data} must be not blank\"}"
                            ))})
    })
    public ErrorResponse handleValidationException(Exception e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setStatus(BAD_REQUEST.value());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));

        String message = e.getMessage();
        if (e instanceof MethodArgumentNotValidException) {
            MethodArgumentNotValidException ex = (MethodArgumentNotValidException) e;
            // Lấy tất cả validation errors và join lại
            message = ex.getBindingResult()
                    .getFieldErrors()
                    .stream()
                    .map(error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : error.getField() + " không hợp lệ")
                    .collect(java.util.stream.Collectors.joining(", "));
            errorResponse.setError("Invalid Payload");
            errorResponse.setMessage(message);
        } else if (e instanceof MissingServletRequestParameterException) {
            errorResponse.setError("Invalid Parameter");
            errorResponse.setMessage(message);
        } else if (e instanceof ConstraintViolationException) {
            errorResponse.setError("Invalid Parameter");
            errorResponse.setMessage(message.substring(message.indexOf(" ") + 1));
        } else {
            errorResponse.setError("Invalid Data");
            errorResponse.setMessage(message);
        }

        return errorResponse;
    }


    /**
     * Handle exception when the request not found data
     *
     * @param e
     * @param request
     * @return
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(NOT_FOUND)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "404", description = "Bad Request",
                    content = {@Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "404 Response",
                                    summary = "Handle exception when resource not found",
                                    value = "{\"timestamp\": \"2023-10-19T06:07:35.321+00:00\", \"status\": 404, \"path\": \"/api/v1/...\", \"error\": \"Not Found\", \"message\": \"{data} not found\"}"
                            ))})
    })
    public ErrorResponse handleResourceNotFoundException(ResourceNotFoundException e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(NOT_FOUND.value());
        errorResponse.setError(NOT_FOUND.getReasonPhrase());
        errorResponse.setMessage(e.getMessage());

        return errorResponse;
    }

    /**
     * Handle exception when the data is conflicted
     *
     * @param e
     * @param request
     * @return
     */
    @ExceptionHandler(InvalidDataException.class)
    @ResponseStatus(CONFLICT)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "409", description = "Conflict",
                    content = {@Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "409 Response",
                                    summary = "Handle exception when input data is conflicted",
                                    value = "{\"timestamp\": \"2023-10-19T06:07:35.321+00:00\", \"status\": 409, \"path\": \"/api/v1/...\", \"error\": \"Conflict\", \"message\": \"{data} exists, Please try again!\"}"
                            ))})
    })
    public ErrorResponse handleDuplicateKeyException(InvalidDataException e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(CONFLICT.value());
        errorResponse.setError(CONFLICT.getReasonPhrase());
        errorResponse.setMessage(e.getMessage());

        return errorResponse;
    }

    /**
     * Handle RuntimeException (thường là business logic errors)
     * Đặt trước Exception.class để catch trước
     */
    /**
     * Handle RuntimeException (thường là business logic errors)
     * Đặt trước Exception.class để catch trước, nhưng sau các specific handlers
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleRuntimeException(RuntimeException e, WebRequest request) {
        // Bỏ qua các exceptions đã được handle ở trên (không thể check instanceof vì chúng không phải RuntimeException)
        // Nhưng Spring sẽ tự động match với handler cụ thể hơn trước
        
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(BAD_REQUEST.value());
        errorResponse.setError("Bad Request");
        errorResponse.setMessage(e.getMessage() != null ? e.getMessage() : "Đã xảy ra lỗi. Vui lòng thử lại sau.");
        return errorResponse;
    }

    /**
     * Handle DataIntegrityViolationException (database constraint violations)
     * Xử lý lỗi duplicate key, unique constraint violations
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleDataIntegrityViolationException(DataIntegrityViolationException e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(BAD_REQUEST.value());
        errorResponse.setError("Data Integrity Violation");
        
        String message = e.getMessage();
        String userFriendlyMessage = "Dữ liệu không hợp lệ hoặc đã tồn tại trong hệ thống.";
        
        // Parse error message để hiển thị thông báo rõ ràng hơn
        if (message != null) {
            if (message.contains("phone") || message.contains("Phone")) {
                userFriendlyMessage = "Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.";
            } else if (message.contains("email") || message.contains("Email")) {
                userFriendlyMessage = "Email đã được sử dụng bởi người dùng khác. Vui lòng sử dụng email khác.";
            } else if (message.contains("username") || message.contains("Username")) {
                userFriendlyMessage = "Tên đăng nhập đã được sử dụng. Vui lòng chọn tên đăng nhập khác.";
            } else if (message.contains("Duplicate entry") || message.contains("duplicate")) {
                userFriendlyMessage = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại thông tin.";
            }
        }
        
        errorResponse.setMessage(userFriendlyMessage);
        return errorResponse;
    }

    /**
     * Handle exception when internal server error
     *
     * @param e
     * @param request
     * @return error
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(INTERNAL_SERVER_ERROR)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "500", description = "Internal Server Error",
                    content = {@Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "500 Response",
                                    summary = "Handle exception when internal server error",
                                    value = "{\"timestamp\": \"2023-10-19T06:35:52.333+00:00\", \"status\": 500, \"path\": \"/api/v1/...\", \"error\": \"Internal Server Error\", \"message\": \"Connection timeout, please try again\"}"
                            ))})
    })
    public ErrorResponse handleException(Exception e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(INTERNAL_SERVER_ERROR.value());
        errorResponse.setError(INTERNAL_SERVER_ERROR.getReasonPhrase());
        errorResponse.setMessage(e.getMessage() != null ? e.getMessage() : "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");

        return errorResponse;
    }

    /**
     * Handle InvoiceException
     */
    @ExceptionHandler(InvoiceException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleInvoiceException(InvoiceException e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(BAD_REQUEST.value());
        errorResponse.setError("Invoice Error");
        errorResponse.setMessage(e.getMessage());
        return errorResponse;
    }

    /**
     * Handle PaymentException
     */
    @ExceptionHandler(PaymentException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handlePaymentException(PaymentException e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(BAD_REQUEST.value());
        errorResponse.setError("Payment Error");
        errorResponse.setMessage(e.getMessage());
        return errorResponse;
    }

    /**
     * Handle AccessDeniedException (403 Forbidden)
     * Khi user không có quyền truy cập
     */
    @ExceptionHandler({AccessDeniedException.class, ForBiddenException.class})
    @ResponseStatus(FORBIDDEN)
    @ApiResponses(value = {
            @ApiResponse(responseCode = "403", description = "Forbidden",
                    content = {@Content(mediaType = APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "403 Response",
                                    summary = "Handle exception when access is denied",
                                    value = "{\"timestamp\": \"2023-10-19T06:07:35.321+00:00\", \"status\": 403, \"path\": \"/api/v1/...\", \"error\": \"Forbidden\", \"message\": \"Bạn không có quyền thực hiện thao tác này\"}"
                            ))})
    })
    public ErrorResponse handleAccessDeniedException(Exception e, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(new Date());
        errorResponse.setPath(request.getDescription(false).replace("uri=", ""));
        errorResponse.setStatus(FORBIDDEN.value());
        errorResponse.setError("Forbidden");
        
        // Cải thiện message để user-friendly hơn
        String message = e.getMessage();
        if (message == null || message.isEmpty()) {
            message = "Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.";
        } else if (message.contains("Access is denied") || message.contains("access denied") || message.contains("Access denied")) {
            message = "Bạn không có quyền thực hiện thao tác này. Chỉ Admin và Manager mới có thể tạo tài khoản mới. Vui lòng liên hệ quản trị viên nếu bạn cần quyền này.";
        }
        
        errorResponse.setMessage(message);
        return errorResponse;
    }
}