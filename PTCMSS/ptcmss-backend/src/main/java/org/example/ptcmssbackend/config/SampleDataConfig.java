package org.example.ptcmssbackend.config;

import lombok.RequiredArgsConstructor;
import org.example.ptcmssbackend.entity.Todo;
import org.example.ptcmssbackend.repository.TodoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration @RequiredArgsConstructor
public class SampleDataConfig {

    private final TodoRepository repo;

    @Bean
    CommandLineRunner seed() {
        return args -> {
            if (repo.count() == 0) {
                repo.save(Todo.builder().title("Chuẩn hoá cấu trúc PTCMSS").note("Sắp xếp module, package").done(true).build());
                repo.save(Todo.builder().title("Kết nối React ↔ Spring ↔ MySQL").note("Kiểm tra qua /api/todos").done(true).build());
                repo.save(Todo.builder().title("Thêm phân trang & tìm kiếm").note("Làm sau phần demo").done(false).build());
            }
        };
    }
}
