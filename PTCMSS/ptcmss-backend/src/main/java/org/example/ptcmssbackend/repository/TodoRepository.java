package org.example.ptcmssbackend.repository;

import org.example.ptcmssbackend.entity.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TodoRepository extends JpaRepository<Todo, Long> {}