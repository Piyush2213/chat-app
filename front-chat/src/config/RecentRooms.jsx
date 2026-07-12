const RECENT_ROOMS_KEY = 'chatapp_recent_rooms';
const MAX_RECENT_ROOMS = 20;

// Returns rooms sorted by most-recently-visited first.
export function getRecentRooms() {
    try {
        const raw = localStorage.getItem(RECENT_ROOMS_KEY);
        if (!raw) return [];
        const rooms = JSON.parse(raw);
        return Array.isArray(rooms) ? rooms.sort((a, b) => b.lastVisited - a.lastVisited) : [];
    } catch (error) {
        return [];
    }
}

// Adds or updates a room in the recent list. Call this after a successful
// create/join, and it's fine to call again on every visit to bump lastVisited.
export function addRecentRoom(roomId, userName, role) {
    try {
        const rooms = getRecentRooms().filter((r) => r.roomId !== roomId);
        rooms.unshift({ roomId, userName, role, lastVisited: Date.now() });
        localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(rooms.slice(0, MAX_RECENT_ROOMS)));
    } catch (error) {
        // Non-critical if this fails (e.g. storage disabled) -- just skip.
    }
}

export function removeRecentRoom(roomId) {
    try {
        const rooms = getRecentRooms().filter((r) => r.roomId !== roomId);
        localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(rooms));
    } catch (error) {
        // Non-critical.
    }
}