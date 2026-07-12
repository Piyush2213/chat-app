package com.whatsapp.chat_app.service;

import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.exception.RoomAlreadyExistsException;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.RoomRequest;
import com.whatsapp.chat_app.resoponse.JoinDecisionEvent;
import com.whatsapp.chat_app.resoponse.JoinRequestEvent;
import com.whatsapp.chat_app.resoponse.KickEvent;
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

        if (roomRepo.findByRoomId(roomRequest.getRoomId()) != null) {
            throw new RoomAlreadyExistsException("Room with ID " + roomRequest.getRoomId() + " already exists");
        }

        Room room = new Room();
        room.setRoomId(roomRequest.getRoomId());
        room.setCreatedBy(roomRequest.getUserName());
        room.setMessages(new ArrayList<>());
        room.setPendingRequests(new ArrayList<>());
        room.setApprovedUsers(new ArrayList<>());

        roomRepo.save(room);

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

        if (userName != null && userName.equals(room.getCreatedBy())) {
            response.setStatus("OWNER");
            return response;
        }

        if (room.getApprovedUsers() != null && room.getApprovedUsers().contains(userName)) {
            response.setStatus("APPROVED");
            return response;
        }

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

    // Removes a user's standing approval and forces their active session out
    // of the room. They'd have to be re-approved to get back in.
    public void kickUser(String roomId, String userName) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }

        if (room.getApprovedUsers() != null) {
            room.getApprovedUsers().remove(userName);
        }
        roomRepo.save(room);

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/kicked",
                new KickEvent(userName)
        );
    }

    // page 0 = most recent `size` messages. page 1 = the next older batch, etc.
    // Messages within a page stay in ascending (oldest-first) order so the
    // frontend can just prepend older pages directly onto the array.
    public List<Message> getMessagesForRoom(String roomId, int page, int size) {
        Room room = roomRepo.findByRoomId(roomId);
        if (room == null) {
            throw new RoomNotFoundExistsException("Room with Id" + roomId + "does not exists");
        }

        List<Message> all = room.getMessages();
        int total = all.size();

        if (size <= 0) size = 20;
        int endExclusive = total - (page * size);
        if (endExclusive <= 0) {
            return new ArrayList<>();
        }
        int startInclusive = Math.max(0, endExclusive - size);

        return new ArrayList<>(all.subList(startInclusive, endExclusive));
    }
}