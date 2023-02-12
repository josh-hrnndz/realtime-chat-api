import { WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { first } from 'rxjs';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class WebSocketsController implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private rooms: Map<string, Set<string>> = new Map();
  private users: Map<string, string> = new Map();
  private connectedUsers = 0;
  private firstUserQueue = [];

  afterInit(server: Server) {
    console.log('WebSocketsController initialized!');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.connectedUsers++;
    const userId = this.generateUserId();
    this.users.set(client.id, userId);
    let roomName: string = null;

    if (this.connectedUsers % 2 == 0) {
      const firstUser = this.firstUserQueue.shift();
      firstUser.roomName = roomName;
      roomName = this.getRoomName(firstUser.client.id);
      if (!roomName) {
        roomName = 'room-' + Math.floor(Math.random() * 10000);
        this.createRoom(firstUser.client, client, roomName);
      } else {
        this.createRoom(firstUser.client, client, roomName);
      }
      firstUser.client.emit('onConnect', {userId: firstUser.userId, message: "User connected", roomName: roomName});
      client.emit('onConnect', {userId: userId, message: "User connected", roomName: roomName});
    } else {
      this.firstUserQueue.push({client, userId, roomName: null}); 
    }

    client.on('message', (data) => {
      this.sendMessage(data.roomName, data);
    });

    client.on('error', (error) => {
      console.error(`Error received from client ${client.id}:`, error);
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers--;
    this.users.delete(client.id);
    this.deleteRoom(client);
  }

  createRoom(client1: Socket, client2: Socket, roomName: string) {
    const room = new Set([client1.id, client2.id]);
    this.rooms.set(roomName, room);
    client1.join(roomName);
    client2.join(roomName);
  }

  sendMessage(roomName: string, data: any) {
    this.server.to(roomName).emit('message', data);
  }

  deleteRoom(client: Socket) {
    const roomName = this.getRoomName(client.id);
    if (roomName) {
      const room = this.rooms.get(roomName);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.rooms.delete(roomName);
        }
      }
      client.leave(roomName);
    }
  }

  getRoomName(clientId: string) {
    for (const [roomName, room] of this.rooms) {
      if (room.has(clientId)) {
        return roomName;
      }
    }
    return null;
  }

  generateUserId() {
    return 'user-' + Math.floor(Math.random() * 10000);
  }
}
