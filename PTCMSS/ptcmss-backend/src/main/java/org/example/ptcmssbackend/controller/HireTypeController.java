package org.example.ptcmssbackend.controller;

import org.example.ptcmssbackend.entity.HireTypes;
import org.example.ptcmssbackend.repository.HireTypesRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hire-types")
public class HireTypeController {

    private final HireTypesRepository hireTypesRepository;

    public HireTypeController(HireTypesRepository hireTypesRepository) {
        this.hireTypesRepository = hireTypesRepository;
    }

    @GetMapping
    public ResponseEntity<List<HireTypes>> getAllHireTypes() {
        List<HireTypes> hireTypes = hireTypesRepository.findAll();
        return ResponseEntity.ok(hireTypes);
    }

    @GetMapping("/active")
    public ResponseEntity<List<HireTypes>> getActiveHireTypes() {
        List<HireTypes> hireTypes = hireTypesRepository.findByIsActiveTrue();
        return ResponseEntity.ok(hireTypes);
    }
}