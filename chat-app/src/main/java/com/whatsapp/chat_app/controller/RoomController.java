package com.whatsapp.chat_app.controller;

import com.whatsapp.chat_app.entity.Message;
import com.whatsapp.chat_app.exception.RoomAlreadyExistsException;
import com.whatsapp.chat_app.exception.RoomNotFoundExistsException;
import com.whatsapp.chat_app.request.JoinDecisionRequest;
import com.whatsapp.chat_app.request.RoomRequest;
import com.whatsapp.chat_app.resoponse.RoomResponse;
import com.whatsapp.chat_app.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v1/rooms")
@CrossOrigin(origins = "http://3.111.225.244:5173", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class RoomController {
    @Autowired
    RoomService roomService;

    @PostMapping("/create-room")
    public ResponseEntity<RoomResponse> createRoom(@RequestBody RoomRequest roomRequest){
        try {
            // Call the service to create the room and return the response
            RoomResponse response = roomService.createRoom(roomRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RoomAlreadyExistsException e) {
            // Handle the case where room already exists
            RoomResponse errorResponse = new RoomResponse(e.getMessage(), null);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    @GetMapping("/join-room/{roomId}")
    public ResponseEntity<RoomResponse> joinRoom(@PathVariable String roomId,
                                                 @RequestParam String userName){
        try {
            RoomResponse response = roomService.joinRoom(roomId, userName);
            return ResponseEntity.status(HttpStatus.OK).body(response);

        } catch (RoomNotFoundExistsException e) {
            RoomResponse errorResponse = new RoomResponse(e.getMessage(), null);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    // Lets the room owner fetch the current wait list, e.g. on page load/refresh.
    @GetMapping("/{roomId}/pending-requests")
    public ResponseEntity<List<String>> getPendingRequests(@PathVariable String roomId){
        try {
            return ResponseEntity.status(HttpStatus.OK).body(roomService.getPendingRequests(roomId));
        } catch (RoomNotFoundExistsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    // Owner calls this to accept or deny a pending user.
    @PostMapping("/{roomId}/decision")
    public ResponseEntity<Void> decideJoinRequest(@PathVariable String roomId,
                                                  @RequestBody JoinDecisionRequest request){
        try {
            roomService.decideJoinRequest(roomId, request.getUserName(), request.isApproved());
            return ResponseEntity.status(HttpStatus.OK).build();
        } catch (RoomNotFoundExistsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("{roomId}/messages")
    public ResponseEntity<List<Message>> getMessages(@PathVariable String roomId,
                                                     @RequestParam(value = "page", defaultValue = "0", required = false)int page,
                                                     @RequestParam(value = "size", defaultValue = "20", required = false)int size){
        try{
            List<Message> messages = roomService.getMessagesForRoom(roomId);
            return ResponseEntity.status(HttpStatus.OK).body(messages);
        } catch (RoomNotFoundExistsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
}