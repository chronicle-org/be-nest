import { InjectRepository } from "@nestjs/typeorm";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { In, Repository } from "typeorm";
import { Notification } from "./notification.entity";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { cookieName, JwtPayload } from "src/auth/jwt.strategy";

@WebSocketGateway({
  namespace: "notifications",
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
  ) {}

  private userSockets = new Map<number, Socket>();
  private extractUserIdFromSocket(socket: Socket): number | null {
    try {
      const cookies = socket.handshake.headers.cookie || "";

      const token = cookies
        .split("; ")
        .find((c) => c.startsWith(cookieName + "="))
        ?.split("=")[1];

      if (!token) return null;

      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "secret",
      ) as JwtPayload;
      return payload.user_id;
    } catch (error) {
      console.error("Auth error:", error);
      return null;
    }
  }

  async handleConnection(socket: Socket) {
    const userId = this.extractUserIdFromSocket(socket);
    if (!userId) {
      socket.disconnect();
      return;
    }
    await socket.join(`user_${userId}`);
    this.userSockets.set(userId, socket);
  }

  handleDisconnect(socket: Socket) {
    for (const [userId, userSocket] of this.userSockets) {
      if (userSocket.id === socket.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage("acknowledge")
  async handleAcknowledge(
    @MessageBody() id: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = this.extractUserIdFromSocket(socket);
    if (!userId) return;
    await this.repo.update(
      { id, recipient_id: userId },
      { read: true, read_at: new Date() },
    );
  }

  @SubscribeMessage("acknowledge-all")
  async handleAcknowledgeAll(
    @MessageBody() ids: number[],
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = this.extractUserIdFromSocket(socket);
    if (!userId) return;
    const now = new Date();
    await this.repo.update(
      { id: In(ids), recipient_id: userId },
      { read: true, read_at: now },
    );
  }

  sendNotificationToUser(userId: number, notification: Notification) {
    this.server.to(`user_${userId}`).emit("notification", notification);
  }
}
