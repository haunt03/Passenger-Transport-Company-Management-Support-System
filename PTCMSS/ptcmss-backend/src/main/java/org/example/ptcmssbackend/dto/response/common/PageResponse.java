package org.example.ptcmssbackend.dto.response.common;

import lombok.*;

import java.io.Serializable;


@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PageResponse<T> implements Serializable {
    private int pageNo;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    private T items;

    public <R> PageResponse(R collect, int i, int size, long totalElements, int totalPages, boolean last) {
    }
}

