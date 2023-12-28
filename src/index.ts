#!/usr/bin/env node
import { OutgoingMessage, SupportedMessage as OutgoingSupportedMessages } from "./messages/outgoingMessages";
import {Message, server as WebSocketServer, connection} from "websocket"
import http from 'http';
import { UserManager } from "./UserManager";
import { IncomingMessage, SupportedMessage } from "./messages/incomingMessages";
import { InMemoryStore } from "./store/InMemoryStore";
import { OuterExpressionKinds } from "typescript";

const server = http.createServer(function(request: any, response: any) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

const userManager = new UserManager();
const store = new InMemoryStore();

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true
});

function originIsAllowed(origin: string) {
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {

        if (message.type === 'utf8') {
            try {
                messageHandler(connection, JSON.parse(message.utf8Data));

            } catch(e) {

            }
            // console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
        }
        
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

// type => JOIN_ROOM, message => InitMessage
//
function messageHandler(ws: connection, message: IncomingMessage) {
    if(message.type == SupportedMessage.JoinRoom) {
        const payload= message.payload;
        UserManager.addUser(payload.name, payload.userId, payload.roomId, ws);
    }
    if(message.type == SupportedMessage.SendMessage) {
        const payload= message.payload;
        const user = userManager.getUser(payload.roomId, payload.userId);
        if(!user) {
            console.error("USer not found in the db");
            return;
        }
        let chat = store.addChat(payload.userId, user.name, payload.roomId, payload.message);

        if(!chat) {
            return;
        }

        const outgoingPayload: OutgoingMessage= {
            type: OutgoingSupportedMessages.AddChat,
            payload: {
                chatId: chat.id,
                roomId: payload.roomId,
                message: payload.message,
                name: user.name,
                upvotes: 0
            }
        }
        userManager.broadcast(payload.roomId, payload.userId, outgoingPayload);
    }
    if(message.type === SupportedMessage.UpvoteMessage) {
        const payload = message.payload;
        const chat = store.upvote(payload.userId, payload.roomId, payload.chatId);
        if(!chat) {
            return;
        }

        const outgoingPayload: OutgoingMessage= {
            type: OutgoingSupportedMessages.UpdateChat,
            payload: {
                chatId: payload.chatId,
                roomId: payload.roomId,
                upvotes: chat.upvotes.length
            }
        }
        userManager.broadcast(payload.roomId, payload.userId, outgoingPayload);
    }


}
