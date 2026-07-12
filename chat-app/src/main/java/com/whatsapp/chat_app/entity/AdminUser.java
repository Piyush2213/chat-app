package com.whatsapp.chat_app.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "admins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminUser {
    @Id
    private String id;
    private String username;

    // Bcrypt hash -- the plaintext password is never stored anywhere.
    private String passwordHash;
}