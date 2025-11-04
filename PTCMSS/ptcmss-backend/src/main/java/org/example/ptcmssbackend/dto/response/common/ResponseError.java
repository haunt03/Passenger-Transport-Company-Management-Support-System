package org.example.ptcmssbackend.dto.response.common;

public class ResponseError extends ResponseData {
    public ResponseError(int status, String message) {
        super(status, message);
    }
}
