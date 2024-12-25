package com.whatsapp.chat_app.service;

import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.MessageRequest;
import com.whatsapp.chat_app.resoponse.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    @Autowired
    private RoomRepo roomRepo;

    public MessageResponse sendMessage(String roomId, MessageRequest request) {
        // Find the room by roomId
        Room room = roomRepo.findByRoomId(roomId);

        // Check if room exists
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        // Create the message and populate it with the request details
        Message message = new Message();
        message.setSender(request.getSender());
        message.setContent(request.getContent());
        message.setTimeStamp(request.getTimeStamp());

        // Add the message to the room's message list
        room.getMessages().add(message);

        // Save the updated room to the repository
        roomRepo.save(room);

        // Return a MessageResponse object to be sent to the client
        MessageResponse messageResponse = new MessageResponse();
        messageResponse.setSender(message.getSender());
        messageResponse.setContent(message.getContent());
        messageResponse.setTimeStamp(message.getTimeStamp());
        messageResponse.setRoomId(roomId);

        return messageResponse;
    }
}
