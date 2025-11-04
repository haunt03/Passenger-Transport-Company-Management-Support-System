package org.example.ptcmssbackend.dto.response.common;

import org.springframework.http.HttpStatusCode;

public class ResponseValue extends ResponseScuccess {
    public ResponseValue(HttpStatusCode status, String message) {
        super(status, message);
    }
}