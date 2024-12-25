package com.whatsapp.chat_app.Repo;

import com.whatsapp.chat_app.entity.Room;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomRepo extends MongoRepository<Room, String> {
    Room findByRoomId(String roomId);
}
