package com.whatsapp.chat_app.controller;

import com.whatsapp.chat_app.request.DeleteMessageRequest;
import com.whatsapp.chat_app.request.EditMessageRequest;
import com.whatsapp.chat_app.request.MarkSeenRequest;
import com.whatsapp.chat_app.request.MessageRequest;
import com.whatsapp.chat_app.request.PresenceRequest;
import com.whatsapp.chat_app.request.ReactionRequest;
import com.whatsapp.chat_app.request.TypingRequest;
import com.whatsapp.chat_app.resoponse.MessageResponse;
import com.whatsapp.chat_app.service.ChatService;
import com.whatsapp.chat_app.service.PresenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;


@Controller
@CrossOrigin(origins = {"http://3.111.225.244:5173", "https://involved-novel-absolute-behalf.trycloudflare.com"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class ChatController {
    @Autowired
    ChatService chatService;

    @Autowired
    PresenceService presenceService;

    @Autowired
    SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/sendMessage/{roomId}")
    @SendTo("/topic/room/{roomId}")
    public MessageResponse sendMessage(@DestinationVariable String roomId, @RequestBody MessageRequest request) {
        if (request.getTimeStamp() == null) {
            request.setTimeStamp(LocalDateTime.now());
        }
        return chatService.sendMessage(roomId, request);
    }

    @MessageMapping("/typing/{roomId}")
    public void typing(@DestinationVariable String roomId, @RequestBody TypingRequest request) {
        chatService.broadcastTyping(roomId, request.getUserName(), request.isTyping());
    }

    @MessageMapping("/markSeen/{roomId}")
    public void markSeen(@DestinationVariable String roomId, @RequestBody MarkSeenRequest request) {
        chatService.markMessageSeen(roomId, request.getMessageId(), request.getUserName());
    }

    @MessageMapping("/react/{roomId}")
    public void react(@DestinationVariable String roomId, @RequestBody ReactionRequest request) {
        chatService.toggleReaction(roomId, request.getMessageId(), request.getEmoji(), request.getUserName());
    }

    // Only the author can edit; silently ignored otherwise (checked in the service layer).
    @MessageMapping("/editMessage/{roomId}")
    public void editMessage(@DestinationVariable String roomId, @RequestBody EditMessageRequest request) {
        chatService.editMessage(roomId, request.getMessageId(), request.getUserName(), request.getContent());
    }

    // Author or room owner can delete; checked in the service layer.
    @MessageMapping("/deleteMessage/{roomId}")
    public void deleteMessage(@DestinationVariable String roomId, @RequestBody DeleteMessageRequest request) {
        chatService.deleteMessage(roomId, request.getMessageId(), request.getUserName());
    }

    @MessageMapping("/presence/{roomId}")
    public void presence(@DestinationVariable String roomId, @RequestBody PresenceRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        presenceService.userConnected(sessionId, roomId, request.getUserName());
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/presence",
                presenceService.getOnlineUsers(roomId)
        );
    }
}