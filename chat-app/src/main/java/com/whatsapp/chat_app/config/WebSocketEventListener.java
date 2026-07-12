package com.whatsapp.chat_app.config;

import com.whatsapp.chat_app.service.PresenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    @Autowired
    private PresenceService presenceService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        String[] info = presenceService.userDisconnected(sessionId);
        if (info != null) {
            String roomId = info[0];
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId + "/presence",
                    presenceService.getOnlineUsers(roomId)
            );
        }
    }
}