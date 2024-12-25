package com.whatsapp.chat_app.exception;

public class RoomNotFoundExistsException extends RuntimeException {
    public RoomNotFoundExistsException(String message) {
        super(message);
    }
}
