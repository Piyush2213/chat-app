package com.whatsapp.chat_app.resoponse;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomResponse {
    private String message;
    private String roomId;
    public RoomResponse(String message, String roomId) {
        this.message = message;
        this.roomId = roomId;
    }
}
