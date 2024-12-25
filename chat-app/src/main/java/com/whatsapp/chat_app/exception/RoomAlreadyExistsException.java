package com.whatsapp.chat_app.exception;

public class RoomAlreadyExistsException extends Exception{
    public RoomAlreadyExistsException(String message) {
        super(message);
    }
}
