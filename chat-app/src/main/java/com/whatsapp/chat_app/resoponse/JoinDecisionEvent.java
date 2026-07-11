package com.whatsapp.chat_app.resoponse;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Broadcast to /topic/room/{roomId}/joinDecision whenever the owner accepts
// or denies someone, so the specific waiting user can react.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JoinDecisionEvent {
    private String userName;
    private boolean approved;
}