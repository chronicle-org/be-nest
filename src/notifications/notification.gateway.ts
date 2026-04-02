import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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

const parseCorsOrigins = (): string[] => {
  const rawCorsOrigin = process.env.CORS_ORIGIN;
  return rawCorsOrigin
    ? rawCorsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];
};

const websocketCorsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void => {
  const allowedOrigins = parseCorsOrigins();

  // If no origins are configured, reject all origins (equivalent to empty array config)
  if (allowedOrigins.length === 0) {
    return callback(new Error("Not allowed by CORS"));
  }

  if (origin && allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error("Not allowed by CORS"));
};

interface SocketData {
  userId?: number;
}

@WebSocketGateway({
  namespace: "notifications",
  cors: {
    origin: websocketCorsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    private configService: ConfigService,
  ) {}

  private userSockets = new Map<number, Set<string>>();
  private tokenValidationInterval: NodeJS.Timeout;

  private extractUserIdFromSocket(socket: Socket): number | null {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";

      // Manual cookie parsing to avoid type issues
      let token: string | undefined;
      cookieHeader.split(";").forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key === cookieName) {
          token = value;
        }
      });

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

  private validateSocketToken(socket: Socket): boolean {
    const userId = this.extractUserIdFromSocket(socket);
    if (!userId) {
      socket.disconnect();
      console.warn(
        `Socket ${socket.id} disconnected due to invalid/expired token`,
      );
      return false;
    }
    return true;
  }

  afterInit() {
    // Start periodic token validation every 5 minutes
    this.tokenValidationInterval = setInterval(
      () => {
        if (!this.server?.sockets?.sockets) return;
        this.server.sockets.sockets.forEach((socket) => {
          if (!this.validateSocketToken(socket)) {
            const userId = (socket.data as SocketData)["userId"];
            if (userId) {
              this.userSockets.get(userId)?.delete(socket.id);
            }
          }
        });
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  afterDisconnect() {
    if (this.tokenValidationInterval) {
      clearInterval(this.tokenValidationInterval);
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
    const userId = (socket.data as SocketData)["userId"];
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
    // Re-validate token on each message
    if (!this.validateSocketToken(socket)) {
      throw new WsException("Token expired or invalid");
    }
    const userId = (socket.data as SocketData)["userId"];
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
    // Re-validate token on each message
    if (!this.validateSocketToken(socket)) {
      throw new WsException("Token expired or invalid");
    }
    const userId = (socket.data as SocketData)["userId"];
    if (!userId || !ids.length) throw new WsException("Invalid request");
    const now = new Date();
    await this.repo.update(
      { id: In(ids), recipient_id: userId },
      { read: true, read_at: now },
    );
  }

  @SubscribeMessage("verify-token")
  handleTokenVerification(@ConnectedSocket() socket: Socket) {
    const isValid = this.validateSocketToken(socket);
    socket.emit("token-verified", { valid: isValid });
  }

  sendNotificationToUser(userId: number, notification: Notification) {
    console.log(`[WS] Sending to user:${userId}`, notification);
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
