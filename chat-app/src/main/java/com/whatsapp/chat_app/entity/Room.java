package com.whatsapp.chat_app.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Room {
    @Id
    private String roomId;
    private List<Message> messages = new ArrayList<>();

    // The username of whoever created the room. Only this user can approve/deny joins.
    private String createdBy;

    // Usernames currently waiting for the owner to accept/deny them.
    private List<String> pendingRequests = new ArrayList<>();

    // Usernames already approved at least once, so they can rejoin without
    // waiting for approval again.
    private List<String> approvedUsers = new ArrayList<>();
}