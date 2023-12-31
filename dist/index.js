#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const outgoingMessages_1 = require("./messages/outgoingMessages");
const websocket_1 = require("websocket");
const http_1 = __importDefault(require("http"));
const UserManager_1 = require("./UserManager");
const incomingMessages_1 = require("./messages/incomingMessages");
const InMemoryStore_1 = require("./store/InMemoryStore");
const server = http_1.default.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
const userManager = new UserManager_1.UserManager();
const store = new InMemoryStore_1.InMemoryStore();
server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});
const wsServer = new websocket_1.server({
    httpServer: server,
    autoAcceptConnections: true
});
function originIsAllowed(origin) {
    return true;
}
wsServer.on('request', function (request) {
    console.log("inside connect");
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function (message) {
        console.log(message);
        if (message.type === 'utf8') {
            try {
                console.log("indie with message" + message.utf8Data);
                messageHandler(connection, JSON.parse(message.utf8Data));
            }
            catch (e) {
            }
            // console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
        }
    });
    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
// type => JOIN_ROOM, message => InitMessage
//
function messageHandler(ws, message) {
    console.log("incoming message " + JSON.stringify(message));
    if (message.type == incomingMessages_1.SupportedMessage.JoinRoom) {
        const payload = message.payload;
        UserManager_1.UserManager.addUser(payload.name, payload.userId, payload.roomId, ws);
    }
    if (message.type == incomingMessages_1.SupportedMessage.SendMessage) {
        const payload = message.payload;
        const user = userManager.getUser(payload.roomId, payload.userId);
        if (!user) {
            console.error("USer not found in the db");
            return;
        }
        let chat = store.addChat(payload.userId, user.name, payload.roomId, payload.message);
        if (!chat) {
            return;
        }
        const outgoingPayload = {
            type: outgoingMessages_1.SupportedMessage.AddChat,
            payload: {
                chatId: chat.id,
                roomId: payload.roomId,
                message: payload.message,
                name: user.name,
                upvotes: 0
            }
        };
        userManager.broadcast(payload.roomId, payload.userId, outgoingPayload);
    }
    if (message.type === incomingMessages_1.SupportedMessage.UpvoteMessage) {
        const payload = message.payload;
        const chat = store.upvote(payload.userId, payload.roomId, payload.chatId);
        if (!chat) {
            return;
        }
        const outgoingPayload = {
            type: outgoingMessages_1.SupportedMessage.UpdateChat,
            payload: {
                chatId: payload.chatId,
                roomId: payload.roomId,
                upvotes: chat.upvotes.length
            }
        };
        userManager.broadcast(payload.roomId, payload.userId, outgoingPayload);
    }
}
