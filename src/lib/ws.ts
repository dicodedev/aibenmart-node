import WebSocket from "ws";
import type { UserType } from "../types/index";

import { apiService } from "./apiService";

import dotenv from "dotenv";
dotenv.config();

const ApiService = new apiService();

type Room = {
  users: Map<number, Client>;
};

type Client = {
  user: UserType;
  ws: WebSocket;
  typing: boolean;
};

const rooms = new Map<number, Room>();

const WebsocketConnection = async (websock: WebSocket.Server) => {
  websock.on("connection", (ws: WebSocket) => {
    let currentUser: UserType;

    ws.on("message", (message: string) => {
      const jsonValidation = IsJsonString(message);
      if (!jsonValidation) {
        console.error("JSON error");
        return;
      }

      const event = JSON.parse(message);
      switch (event.type) {
        case "init":
          currentUser = event.user;
          const roomId = event.roomId;

          // Create room if it doesn't exist
          if (!rooms.has(roomId)) {
            rooms.set(roomId, {
              users: new Map(),
            });
          }

          const room = rooms.get(roomId)!;

          const existing = room.users.get(currentUser.id);
          if (!existing) {
            room.users.set(currentUser.id, {
              user: currentUser,
              ws,
              typing: false,
            });

            console.warn(
              `Added user: ${currentUser.name} to room id: ${roomId} `,
            );
          } else {
            console.warn(
              `Using user: ${currentUser.name} current session in room id: ${roomId} `,
            );
          }
          break;
        case "ping":
          send(ws, "pong", { type: "pong" });
          break;
        case "message":
          onMessage(event, ws);
          break;
        case "typing":
          break;
        default:
          break;
      }
    });

    ws.on("close", () => {
      for (const [roomId, room] of rooms.entries()) {
        for (const [userId, client] of room.users.entries()) {
          if (client.ws === ws) {
            console.log(
              `Cleaning up user ${client.user.name} (${client.user.email}) from room id: ${roomId}`,
            );

            room.users.delete(userId); //user is logged out
            if (!room.users.size) {
              rooms.delete(roomId);
            }

            break;
          }
        }
      }
    });
  });

  const onMessage = async (event: any, ws: WebSocket) => {
    const { roomId, user, message } = event;

    const room = rooms.get(roomId)!;
    if (!room) return;

    const client = room.users.get(user.id);
    if (!client) {
      console.error("❌ No user found", user.name);
      return;
    }

    const others = Array.from(room.users.values()).filter(
      (c) => c.user.id !== user.id,
    );
    if (!others.length) {
      console.error("❌ Partner is not online");

      //send push notification
      try {
        const response = await ApiService.sendPostRequest(
          "/push-chat-notification",
          {
            room_id: roomId,
            body: message,
            user_id: user.id,
          },
        );
        console.log("Push notifcation: ", response);
      } catch (error) {
        console.log("error: ", error);
      }
    }

    try {
      //save message
      const response = await ApiService.sendPostRequest("/log-message", {
        room_id: roomId,
        body: message,
        user_id: user.id,
      });

      console.log("Save message: ", response);
      send(ws, "messaged", response);
      broadcast(others, "newMessage", response);
    } catch (error) {
      console.log("error: ", error);
    }
  };

  const onTyping = async (event: any, ws: WebSocket) => {
    const { roomId, user } = event;

    const room = rooms.get(roomId)!;
    if (!room) return;

    const client = room.users.get(user.id);
    if (!client) {
      console.error("❌ No user found", user.name);
      return;
    }

    const others = Array.from(room.users.values()).filter(
      (c) => c.user.id !== user.id,
    );
    if (others.length) {
      console.error("❌ Partner is not online");
    }

    //save message
    const resp = {};

    send(ws, "messaged", resp);
    broadcast(others, "newMessage", resp);
  };

  const IsJsonString = (str: string) => {
    try {
      JSON.parse(str);
    } catch (error) {
      return false;
    }
    return true;
  };

  const send = (ws: WebSocket, type: string, msg: any) => {
    const message = {
      type,
      data: msg,
    };

    const resp = JSON.stringify(message);
    ws.send(resp);
  };

  const broadcast = (target: Client[], type: string, data: any) => {
    const message = {
      type,
      data,
    };
    const resp = JSON.stringify(message);
    target.forEach((client) => client.ws.send(resp));
  };
};

export { WebsocketConnection };
