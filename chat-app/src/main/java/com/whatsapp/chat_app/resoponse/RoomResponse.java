package com.whatsapp.chat_app.resoponse;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomResponse {
    private String message;
    private String roomId;

    // Who owns the room.
    private String createdBy;

    // "OWNER"   -> this user created the room, full access immediately
    // "APPROVED" -> this user was already approved before, full access immediately
    // "PENDING" -> waiting for the owner to accept/deny
    private String status;

    public RoomResponse(String message, String roomId) {
        this.message = message;
        this.roomId = roomId;
    }
}