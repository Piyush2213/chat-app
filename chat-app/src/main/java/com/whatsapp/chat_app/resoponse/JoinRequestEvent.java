package com.whatsapp.chat_app.resoponse;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Broadcast to /topic/room/{roomId}/joinRequests whenever someone new
// requests to join, so the owner sees it live without refreshing.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestEvent {
    private String userName;
}