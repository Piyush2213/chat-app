package com.whatsapp.chat_app.Repo;

import com.whatsapp.chat_app.entity.AdminUser;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminUserRepo extends MongoRepository<AdminUser, String> {
    AdminUser findByUsername(String username);
}