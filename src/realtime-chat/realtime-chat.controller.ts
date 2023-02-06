import { WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class WebSocketsController implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private rooms: Map<string, Set<string>> = new Map();
  private users: Map<string, string> = new Map();

  afterInit(server: Server) {
    console.log('WebSocketsController initialized!');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userId = this.generateUserId();
    this.users.set(client.id, userId);
    this.createRoom(client);
    const roomName = this.getRoomName(client.id);
    this.sendMessage(roomName, {userId, data: "User connected"});
    client.on('message', (data) => {
      this.sendMessage(roomName, {userId, data});
    });
  }

  handleDisconnect(client: Socket) {
    this.users.delete(client.id);
    this.deleteRoom(client);
  }
  
  createRoom(client: Socket) {
    let roomName = null;
    this.rooms.forEach((value, key) => {
      if (value.size === 1) {
        roomName = key;
      }
    });
  
    if (!roomName) {
      roomName = 'room-' + Math.floor(Math.random() * 10000);
    }
    client.join(roomName);
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set([client.id]));
    } else {
      this.rooms.get(roomName)?.add(client.id);
    }
  }

  deleteRoom(client: Socket) {
    this.rooms.forEach((value, key) => {
      if (value.has(client.id)) {
        value.delete(client.id);
        if (value.size === 0) { 
          this.rooms.delete(key);
        }
      }
    });
  }

  sendMessage(roomName: string, data: any) {
    this.server.to(roomName).emit('message', data);
  }

  getRoomName(clientId: string): string {
    let roomName = '';
    this.rooms.forEach((value, key) => {
      if (value.has(clientId)) {
        roomName = key;
      }
    });
    return roomName;
  }

  generateUserId(): string {
    return Math.floor(Math.random() * 1000000000).toString();
  }
}
