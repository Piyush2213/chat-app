package com.whatsapp.chat_app.service;

import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.MessageRequest;
import com.whatsapp.chat_app.resoponse.MessageResponse;
import com.whatsapp.chat_app.resoponse.ReactionEvent;
import com.whatsapp.chat_app.resoponse.SeenEvent;
import com.whatsapp.chat_app.resoponse.TypingEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Service
public class ChatService {

    @Autowired
    private RoomRepo roomRepo;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public MessageResponse sendMessage(String roomId, MessageRequest request) {
        // Find the room by roomId
        Room room = roomRepo.findByRoomId(roomId);

        // Check if room exists
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        // Create the message and populate it with the request details
        Message message = new Message();
        message.setId(UUID.randomUUID().toString());
        message.setSender(request.getSender());
        message.setContent(request.getContent());
        message.setTimeStamp(request.getTimeStamp());
        message.setMessageType(request.getMessageType() != null ? request.getMessageType() : "TEXT");
        message.setFileUrl(request.getFileUrl());
        message.setFileName(request.getFileName());
        message.setFileType(request.getFileType());
        // The sender has, definitionally, already seen their own message.
        message.setSeenBy(new ArrayList<>(List.of(request.getSender())));
        message.setReactions(new HashMap<>());

        // Add the message to the room's message list
        room.getMessages().add(message);

        // Save the updated room to the repository
        roomRepo.save(room);

        // Return a MessageResponse object to be sent to the client
        MessageResponse messageResponse = new MessageResponse();
        messageResponse.setId(message.getId());
        messageResponse.setSender(message.getSender());
        messageResponse.setContent(message.getContent());
        messageResponse.setTimeStamp(message.getTimeStamp());
        messageResponse.setRoomId(roomId);
        messageResponse.setMessageType(message.getMessageType());
        messageResponse.setFileUrl(message.getFileUrl());
        messageResponse.setFileName(message.getFileName());
        messageResponse.setFileType(message.getFileType());
        messageResponse.setSeenBy(message.getSeenBy());
        messageResponse.setReactions(message.getReactions());

        return messageResponse;
    }

    public void broadcastTyping(String roomId, String userName, boolean typing) {
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/typing",
                new TypingEvent(userName, typing)
        );
    }

    public void markMessageSeen(String roomId, String messageId, String userName) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        Message target = room.getMessages().stream()
                .filter(m -> messageId.equals(m.getId()))
                .findFirst()
                .orElse(null);

        if (target == null) return;

        if (target.getSeenBy() == null) {
            target.setSeenBy(new ArrayList<>());
        }
        if (!target.getSeenBy().contains(userName)) {
            target.getSeenBy().add(userName);
            roomRepo.save(room);
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId + "/seen",
                    new SeenEvent(messageId, target.getSeenBy())
            );
        }
    }

    public void toggleReaction(String roomId, String messageId, String emoji, String userName) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        Message target = room.getMessages().stream()
                .filter(m -> messageId.equals(m.getId()))
                .findFirst()
                .orElse(null);

        if (target == null) return;

        if (target.getReactions() == null) {
            target.setReactions(new HashMap<>());
        }

        List<String> users = target.getReactions().computeIfAbsent(emoji, k -> new ArrayList<>());
        if (users.contains(userName)) {
            users.remove(userName);
            if (users.isEmpty()) {
                target.getReactions().remove(emoji);
            }
        } else {
            users.add(userName);
        }

        roomRepo.save(room);
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/reactions",
                new ReactionEvent(messageId, target.getReactions())
        );
    }
}