type MessageListener = (data: any) => void;

class SocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private reconnectTimer: any = null;
  private isConnected: boolean = false;
  private currentUserId?: string;
  private currentRole?: string;

  public connect(userId?: string, role?: string) {
    this.currentUserId = userId;
    this.currentRole = role;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // Re-authenticate if user changed
      if (userId && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'AUTH', userId, role });
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('[WS-Client] Connected to gateway:', wsUrl);
        if (this.currentUserId) {
          this.send({ type: 'AUTH', userId: this.currentUserId, role: this.currentRole });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.listeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error('[WS-Client] Listener error:', err);
            }
          });
        } catch (err) {
          console.error('[WS-Client] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[WS-Client] Socket error, reconnecting...', err);
        this.ws?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.currentUserId, this.currentRole);
    }, 3000);
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public joinBookingRoom(bookingId: string) {
    this.send({ type: 'JOIN_BOOKING', bookingId });
  }

  public leaveBookingRoom(bookingId: string) {
    this.send({ type: 'LEAVE_BOOKING', bookingId });
  }

  public get connected(): boolean {
    return this.isConnected;
  }
}

export const socket = new SocketClient();
