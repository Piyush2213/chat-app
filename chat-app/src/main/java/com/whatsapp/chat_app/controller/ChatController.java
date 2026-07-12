package com.whatsapp.chat_app.controller;

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
@CrossOrigin(origins = "http://3.111.225.244:5173", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
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
        // Delegate to the service layer to send the message
        if (request.getTimeStamp() == null) {
            request.setTimeStamp(LocalDateTime.now());
        }
        return chatService.sendMessage(roomId, request);
    }

    // Broadcasts "X is typing" / "X stopped typing" to everyone else in the room.
    @MessageMapping("/typing/{roomId}")
    public void typing(@DestinationVariable String roomId, @RequestBody TypingRequest request) {
        chatService.broadcastTyping(roomId, request.getUserName(), request.isTyping());
    }

    // Marks a single message as seen by the given user, broadcasts the updated seenBy list.
    @MessageMapping("/markSeen/{roomId}")
    public void markSeen(@DestinationVariable String roomId, @RequestBody MarkSeenRequest request) {
        chatService.markMessageSeen(roomId, request.getMessageId(), request.getUserName());
    }

    // Toggles an emoji reaction from a user on a message, broadcasts the updated reaction map.
    @MessageMapping("/react/{roomId}")
    public void react(@DestinationVariable String roomId, @RequestBody ReactionRequest request) {
        chatService.toggleReaction(roomId, request.getMessageId(), request.getEmoji(), request.getUserName());
    }

    // Called once a client connects, registers them as online for this room and
    // broadcasts the full online list back to everyone in the room.
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