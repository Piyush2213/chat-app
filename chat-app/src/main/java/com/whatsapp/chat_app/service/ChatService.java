package com.whatsapp.chat_app.service;

import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.MessageRequest;
import com.whatsapp.chat_app.resoponse.MessageDeleteEvent;
import com.whatsapp.chat_app.resoponse.MessageEditEvent;
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
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        Message message = new Message();
        message.setId(UUID.randomUUID().toString());
        message.setSender(request.getSender());
        message.setContent(request.getContent());
        message.setTimeStamp(request.getTimeStamp());
        message.setMessageType(request.getMessageType() != null ? request.getMessageType() : "TEXT");
        message.setFileUrl(request.getFileUrl());
        message.setFileName(request.getFileName());
        message.setFileType(request.getFileType());
        message.setSeenBy(new ArrayList<>(List.of(request.getSender())));
        message.setReactions(new HashMap<>());
        message.setEdited(false);
        message.setDeleted(false);

        room.getMessages().add(message);
        roomRepo.save(room);

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
        messageResponse.setEdited(message.isEdited());
        messageResponse.setDeleted(message.isDeleted());

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

    // Only the original author can edit their own message, and only if it
    // hasn't been deleted.
    public void editMessage(String roomId, String messageId, String userName, String newContent) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        Message target = room.getMessages().stream()
                .filter(m -> messageId.equals(m.getId()))
                .findFirst()
                .orElse(null);

        if (target == null) return;
        if (!userName.equals(target.getSender())) return; // not the author
        if (target.isDeleted()) return;

        target.setContent(newContent);
        target.setEdited(true);
        roomRepo.save(room);

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/messageEdited",
                new MessageEditEvent(messageId, newContent)
        );
    }

    // The author can delete their own message; the room owner can delete
    // anyone's message (moderation). Soft-delete: content is cleared but the
    // message stays as a placeholder in the conversation.
    public void deleteMessage(String roomId, String messageId, String userName) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id " + roomId + " does not exist");
        }

        Message target = room.getMessages().stream()
                .filter(m -> messageId.equals(m.getId()))
                .findFirst()
                .orElse(null);

        if (target == null) return;

        boolean isAuthor = userName.equals(target.getSender());
        boolean isOwner = userName.equals(room.getCreatedBy());
        if (!isAuthor && !isOwner) return;

        target.setDeleted(true);
        target.setContent("");
        target.setFileUrl(null);
        target.setFileName(null);
        target.setFileType(null);
        roomRepo.save(room);

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/messageDeleted",
                new MessageDeleteEvent(messageId)
        );
    }
}