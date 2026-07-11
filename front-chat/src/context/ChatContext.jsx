import { createContext, useState } from "react";
import { useContext } from "react";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [roomId, setRoomId] = useState("");
    const [currentUser, setCurrentUser] = useState("");
    const [connected, setConnected] = useState(false);
    const [isRoomOwner, setIsRoomOwner] = useState(false);

    return (
        <ChatContext.Provider
            value={{
                roomId,
                currentUser,
                connected,
                setRoomId,
                setCurrentUser,
                setConnected,
                isRoomOwner,
                setIsRoomOwner,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

const useChatContext = () => useContext(ChatContext);
export default useChatContext;