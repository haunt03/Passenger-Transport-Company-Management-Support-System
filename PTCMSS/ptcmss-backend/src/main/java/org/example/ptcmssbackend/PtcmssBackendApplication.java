package org.example.ptcmssbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "org.example.ptcmssbackend")
public class PtcmssBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(PtcmssBackendApplication.class, args);
    }

}
