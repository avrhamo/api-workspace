package com.example.demo.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/users")
public class UserController {

    @PostMapping("/{category}")
    public ResponseEntity<?> createUser(
            @PathVariable String category,
            @RequestParam(required = false, defaultValue = "api") String source,
            @RequestBody User user
    ) {
        try {
            System.out.println("Inserting to mongodb!");
            System.out.println("Category: " + category);
            System.out.println("Source: " + source);
            System.out.println("Phone: " + user.getPhone());
            
            if (new Random().nextInt(100) < 8) { // 8% chance of bad request
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                            "error", "Invalid request data",
                            "category", category,
                            "source", source
                        ));
            }
            
            UpdateResult createdUser = testerService.createUser(user);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                        "result", createdUser,
                        "category", category,
                        "source", source
                    ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred"));
        }
    }
} 