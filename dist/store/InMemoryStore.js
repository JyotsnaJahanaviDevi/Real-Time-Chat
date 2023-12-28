"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStore = void 0;
let globalChatId = 0;
class InMemoryStore {
    constructor() {
        this.store = new Map();
    }
    initRoom(roomId) {
        this.store.set(roomId, {
            roomId,
            chats: []
        });
    }
    // last 50 chats -> limit = 50, offset - 0
    // limit = 50, offset - 50
    getChats(roomId, limit, offset) {
        const room = this.store.get(roomId);
        if (!room) {
            return [];
        }
        return room.chats.reverse().slice(0, offset).slice(-1 * limit);
    }
    addChat(userId, name, roomId, message) {
        const room = this.store.get(roomId);
        if (!room) {
            return null;
        }
        const chat = {
            id: (globalChatId++).toString(),
            userId,
            name,
            message,
            upvotes: []
        };
        room.chats.push(chat);
        return chat;
    }
    upvote(userId, roomId, chatId) {
        const room = this.store.get(roomId);
        if (!room) {
            return;
        }
        const chat = room.chats.find(({ id }) => id === chatId);
        if (chat) {
            chat.upvotes.push(userId);
        }
        return chat;
    }
}
exports.InMemoryStore = InMemoryStore;
