import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { In, Repository } from "typeorm";
import { Notification } from "./notification.entity";
import { Server, Socket } from "socket.io";
import * as jwt from "jsonwebtoken";
import { cookieName, JwtPayload } from "src/auth/jwt.strategy";
import { parse as parseCookies } from "cookie";

const rawCorsOrigin = process.env.CORS_ORIGIN;
const parsedCorsOrigins = rawCorsOrigin
  ? rawCorsOrigin
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  : [];

const websocketCorsOrigin =
  parsedCorsOrigins.length === 0
    ? []
    : parsedCorsOrigins.length === 1
      ? parsedCorsOrigins[0]
      : parsedCorsOrigins;

type SocketData = Map<string, number | undefined>;

@WebSocketGateway({
  namespace: "notifications",
  cors: {
    origin: websocketCorsOrigin,
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
    private configService: ConfigService,
  ) {}

  private userSockets = new Map<number, Set<string>>();

  private extractUserIdFromSocket(socket: Socket): number | null {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies[cookieName];

      if (!token) return null;

      const secret = this.configService.get<string>("JWT_SECRET") || "secret"; // INTENTIONAL FALLBACK, should always be set in production

      const payload = jwt.verify(token, secret, {
        algorithms: ["HS256"],
      }) as JwtPayload;
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
    (socket.data as SocketData)["userId"] = userId;
    await socket.join(`user:${userId}`);
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(socket.id);
  }

  handleDisconnect(socket: Socket) {
    const userId = (socket.data as SocketData)["userId"] as number | undefined;
    if (!userId) return;
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage("acknowledge")
  async handleAcknowledge(
    @MessageBody() id: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data as SocketData)["userId"] as number | undefined;
    if (!userId) return;
    await this.repo.update(
      { id, recipient_id: userId },
      { read: true, read_at: new Date() },
    );
  }

  @SubscribeMessage("acknowledge-all")
  async handleAcknowledgeAll(
    @MessageBody() ids: number[] = [],
    @ConnectedSocket() socket: Socket,
  ) {
    const userId = (socket.data as SocketData)["userId"] as number | undefined;
    if (!userId || !ids.length) throw new WsException("Invalid request");
    const now = new Date();
    await this.repo.update(
      { id: In(ids), recipient_id: userId },
      { read: true, read_at: now },
    );
  }

  sendNotificationToUser(userId: number, notification: Notification) {
    this.server.to(`user:${userId}`).emit("notification", notification);
  }

  sendNotificationToUserBulk(notifications: Notification[]) {
    notifications.forEach((notification) => {
      this.server
        .to(`user:${notification.recipient_id}`)
        .emit("notification", notification);
    });
  }
}
