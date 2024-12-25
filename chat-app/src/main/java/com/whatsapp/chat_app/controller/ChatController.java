package com.whatsapp.chat_app.controller;


import com.whatsapp.chat_app.request.MessageRequest;
import com.whatsapp.chat_app.resoponse.MessageResponse;
import com.whatsapp.chat_app.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
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

    @MessageMapping("/sendMessage/{roomId}")
    @SendTo("/topic/room/{roomId}")
    public MessageResponse sendMessage(@DestinationVariable String roomId, @RequestBody MessageRequest request) {
        // Delegate to the service layer to send the message
        if (request.getTimeStamp() == null) {
            request.setTimeStamp(LocalDateTime.now());
        }
        return chatService.sendMessage(roomId, request);
    }

}
