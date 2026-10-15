import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

interface ClientConnection {
  ws: WebSocket;
  role?: string;
  userId?: string;
  rooms: Set<string>;
}

class RealtimeServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientConnection> = new Map();

  public initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = {
        ws,
        rooms: new Set()
      };
      this.clients.set(ws, client);

      // Send greeting handshake
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to Sagara Local Services Real-time Gateway',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err);
        this.clients.delete(ws);
      });
    });

    console.log('[WS] WebSocket server initialized on /ws');
  }

  private handleClientMessage(client: ClientConnection, message: any) {
    switch (message.type) {
      case 'AUTH':
        client.userId = message.userId;
        client.role = message.role;
        if (message.role === 'admin') {
          client.rooms.add('admin');
        }
        if (message.userId) {
          client.rooms.add(`user:${message.userId}`);
          if (message.role === 'provider') {
            client.rooms.add(`provider:${message.userId}`);
          }
        }
        client.ws.send(JSON.stringify({
          type: 'AUTH_SUCCESS',
          userId: client.userId,
          role: client.role,
          rooms: Array.from(client.rooms)
        }));
        break;

      case 'JOIN_BOOKING':
        if (message.bookingId) {
          const room = `booking:${message.bookingId}`;
          client.rooms.add(room);
          client.ws.send(JSON.stringify({ type: 'JOINED_ROOM', room }));
        }
        break;

      case 'LEAVE_BOOKING':
        if (message.bookingId) {
          const room = `booking:${message.bookingId}`;
          client.rooms.delete(room);
          client.ws.send(JSON.stringify({ type: 'LEFT_ROOM', room }));
        }
        break;

      case 'PING':
        client.ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;

      default:
        break;
    }
  }

  // Broadcast to room
  public broadcastToRoom(room: string, payload: any) {
    const raw = JSON.stringify(payload);
    for (const [ws, client] of this.clients.entries()) {
      if (client.rooms.has(room) && ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  // Broadcast to all connected clients
  public broadcastAll(payload: any) {
    const raw = JSON.stringify(payload);
    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  // Convenience broadcast helpers
  public notifyBookingUpdated(booking: any, eventNote?: string) {
    const payload = {
      type: 'BOOKING_UPDATED',
      booking,
      eventNote,
      timestamp: new Date().toISOString()
    };
    // Send to booking room
    this.broadcastToRoom(`booking:${booking.id}`, payload);
    // Send to customer
    this.broadcastToRoom(`user:${booking.customer_id}`, payload);
    // Send to provider if assigned
    if (booking.provider_id) {
      this.broadcastToRoom(`provider:${booking.provider_id}`, payload);
      this.broadcastToRoom(`user:${booking.provider_id}`, payload);
    }
    // Send to admin live monitor
    this.broadcastToRoom('admin', payload);
  }

  public notifyProviderDispatch(providerId: string, booking: any, timeoutSecs: number) {
    const payload = {
      type: 'INCOMING_JOB_OFFER',
      booking,
      timeoutSecs,
      timestamp: new Date().toISOString()
    };
    this.broadcastToRoom(`provider:${providerId}`, payload);
    this.broadcastToRoom(`user:${providerId}`, payload);
  }

  public notifyAdmin(action: string, data: any) {
    this.broadcastToRoom('admin', {
      type: 'ADMIN_ALERT',
      action,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

export const realtimeServer = new RealtimeServer();
