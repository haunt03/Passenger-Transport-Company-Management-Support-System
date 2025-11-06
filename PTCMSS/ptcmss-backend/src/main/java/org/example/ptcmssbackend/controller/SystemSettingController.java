package org.example.ptcmssbackend.controller;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.dto.request.SystemSettingRequest;
import org.example.ptcmssbackend.dto.response.SystemSettingResponse;
import org.example.ptcmssbackend.service.SystemSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system-settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class SystemSettingController {

    private final SystemSettingService repo;

    @GetMapping
    public ResponseEntity<List<SystemSettingResponse>> getAll() {
        return ResponseEntity.ok(repo.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SystemSettingResponse> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(repo.getById(id));
    }

    @PostMapping
    public ResponseEntity<SystemSettingResponse> create(@Validated @RequestBody SystemSettingRequest request) {
        return ResponseEntity.ok(repo.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SystemSettingResponse> update(
            @PathVariable Integer id,
            @Validated @RequestBody SystemSettingRequest request) {
        return ResponseEntity.ok(repo.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        repo.delete(id);
        return ResponseEntity.noContent().build();
    }
}