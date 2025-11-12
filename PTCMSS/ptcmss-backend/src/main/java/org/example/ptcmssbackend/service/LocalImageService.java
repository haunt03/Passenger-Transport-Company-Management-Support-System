package org.example.ptcmssbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocalImageService {

    private static final String UPLOAD_DIR = "uploads/"; // nằm cùng cấp với target/

    public String saveImage(MultipartFile file) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR).toAbsolutePath();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // URL public để truy cập
            return "/uploads/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi lưu ảnh: " + e.getMessage(), e);
        }
    }
}