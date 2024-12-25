package com.whatsapp.chat_app.service;

import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.exception.RoomAlreadyExistsException;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.RoomRequest;
import com.whatsapp.chat_app.resoponse.RoomResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomService {
    @Autowired
    RoomRepo roomRepo;

    public RoomResponse createRoom(RoomRequest roomRequest) throws RoomAlreadyExistsException {

            // Check if the room already exists in the repository
            if (roomRepo.findByRoomId(roomRequest.getRoomId()) != null) {
                throw new RoomAlreadyExistsException("Room with ID " + roomRequest.getRoomId() + " already exists");
            }

            // Create the new room
            Room room = new Room();
            room.setRoomId(roomRequest.getRoomId());

            // Save the new room to the repository
            roomRepo.save(room);

            // Return the response
            return new RoomResponse("Room with ID " + roomRequest.getRoomId() + " created successfully", roomRequest.getRoomId());

    }

    public RoomResponse joinRoom(String roomId) {
        if(roomRepo.findByRoomId(roomId) == null){
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }
        return new RoomResponse("Room with ID " + roomId + " joined successfully", roomId);
    }

    public List<Message> getMessagesForRoom(String roomId) {
        Room room = roomRepo.findByRoomId(roomId);
        if(room == null){
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }
        return room.getMessages();
    }
}
