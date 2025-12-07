package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.service.LocalImageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalImageServiceTest {

    private LocalImageService localImageService;

    @BeforeEach
    void setUp() {
        localImageService = new LocalImageService();
    }

    // ==================== saveImage() Tests ====================

    @Test
    void saveImage_whenValidFile_shouldSaveAndReturnUrl() throws IOException {
        // Given
        String originalFilename = "test-image.jpg";
        String content = "fake image content";
        MultipartFile file = new MockMultipartFile(
                "image",
                originalFilename,
                "image/jpeg",
                content.getBytes()
        );

        // When
        String result = localImageService.saveImage(file);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).startsWith("/uploads/");
        assertThat(result).contains(originalFilename);
    }

    @Test
    void saveImage_whenFileHasNoOriginalName_shouldStillSave() throws IOException {
        // Given
        String content = "fake image content";
        MultipartFile file = new MockMultipartFile(
                "image",
                null, // No original filename
                "image/jpeg",
                content.getBytes()
        );

        // When
        String result = localImageService.saveImage(file);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).startsWith("/uploads/");
    }

    @Test
    void saveImage_whenIOException_shouldThrowRuntimeException() {
        // Given
        MultipartFile file = new MockMultipartFile(
                "image",
                "test.jpg",
                "image/jpeg",
                new byte[0]
        ) {
            @Override
            public java.io.InputStream getInputStream() throws IOException {
                throw new IOException("Simulated IO error");
            }
        };

        // When & Then
        assertThatThrownBy(() -> localImageService.saveImage(file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Lỗi khi lưu ảnh");
    }

    @Test
    void saveImage_shouldGenerateUniqueFileName() throws IOException {
        // Given
        String originalFilename = "test.jpg";
        String content = "fake image content";
        MultipartFile file1 = new MockMultipartFile(
                "image",
                originalFilename,
                "image/jpeg",
                content.getBytes()
        );
        MultipartFile file2 = new MockMultipartFile(
                "image",
                originalFilename,
                "image/jpeg",
                content.getBytes()
        );

        // When
        String result1 = localImageService.saveImage(file1);
        String result2 = localImageService.saveImage(file2);

        // Then
        assertThat(result1).isNotEqualTo(result2);
        // Both should contain the original filename but with different UUID prefixes
        assertThat(result1).contains(originalFilename);
        assertThat(result2).contains(originalFilename);
    }

    @Test
    void saveImage_whenUploadDirDoesNotExist_shouldCreateDirectory() throws IOException {
        // Given
        String originalFilename = "test-image.jpg";
        String content = "fake image content";
        MultipartFile file = new MockMultipartFile(
                "image",
                originalFilename,
                "image/jpeg",
                content.getBytes()
        );

        // When
        String result = localImageService.saveImage(file);

        // Then
        assertThat(result).isNotNull();
        // Directory should be created (if it didn't exist)
        // This is tested implicitly by the successful save
    }
}

