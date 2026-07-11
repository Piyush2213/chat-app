package com.whatsapp.chat_app.service;

import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.exception.RoomAlreadyExistsException;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.RoomRequest;
import com.whatsapp.chat_app.resoponse.JoinDecisionEvent;
import com.whatsapp.chat_app.resoponse.JoinRequestEvent;
import com.whatsapp.chat_app.resoponse.RoomResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomService {
    @Autowired
    RoomRepo roomRepo;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public RoomResponse createRoom(RoomRequest roomRequest) throws RoomAlreadyExistsException {

        // Check if the room already exists in the repository
        if (roomRepo.findByRoomId(roomRequest.getRoomId()) != null) {
            throw new RoomAlreadyExistsException("Room with ID " + roomRequest.getRoomId() + " already exists");
        }

        // Create the new room
        Room room = new Room();
        room.setRoomId(roomRequest.getRoomId());
        room.setCreatedBy(roomRequest.getUserName());
        room.setMessages(new ArrayList<>());
        room.setPendingRequests(new ArrayList<>());
        room.setApprovedUsers(new ArrayList<>());

        // Save the new room to the repository
        roomRepo.save(room);

        // Return the response
        RoomResponse response = new RoomResponse("Room with ID " + roomRequest.getRoomId() + " created successfully", roomRequest.getRoomId());
        response.setCreatedBy(room.getCreatedBy());
        response.setStatus("OWNER");
        return response;
    }

    public RoomResponse joinRoom(String roomId, String userName) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }

        RoomResponse response = new RoomResponse("Room with ID " + roomId + " joined successfully", roomId);
        response.setCreatedBy(room.getCreatedBy());

        // Room owner always gets straight in.
        if (userName != null && userName.equals(room.getCreatedBy())) {
            response.setStatus("OWNER");
            return response;
        }

        // Already approved before -> straight in, no need to wait again.
        if (room.getApprovedUsers() != null && room.getApprovedUsers().contains(userName)) {
            response.setStatus("APPROVED");
            return response;
        }

        // Otherwise, register (or re-register) a pending request and notify the owner live.
        if (room.getPendingRequests() == null) {
            room.setPendingRequests(new ArrayList<>());
        }
        if (!room.getPendingRequests().contains(userName)) {
            room.getPendingRequests().add(userName);
            roomRepo.save(room);
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId + "/joinRequests",
                    new JoinRequestEvent(userName)
            );
        }

        response.setStatus("PENDING");
        return response;
    }

    public List<String> getPendingRequests(String roomId) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }
        return room.getPendingRequests() != null ? room.getPendingRequests() : new ArrayList<>();
    }

    public void decideJoinRequest(String roomId, String userName, boolean approved) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }

        if (room.getPendingRequests() != null) {
            room.getPendingRequests().remove(userName);
        }

        if (approved) {
            if (room.getApprovedUsers() == null) {
                room.setApprovedUsers(new ArrayList<>());
            }
            if (!room.getApprovedUsers().contains(userName)) {
                room.getApprovedUsers().add(userName);
            }
        }

        roomRepo.save(room);

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/joinDecision",
                new JoinDecisionEvent(userName, approved)
        );
    }

    public List<Message> getMessagesForRoom(String roomId) {
        Room room = roomRepo.findByRoomId(roomId);
        if(room == null){
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }
        return room.getMessages();
    }
}