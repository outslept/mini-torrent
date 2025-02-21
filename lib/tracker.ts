import dgram from "dgram";
import { Torrent } from "./torrent";

interface TrackerResponse {
  interval: number;
  peers: string[];
}

export class Tracker {
  private readonly socket = dgram.createSocket("udp4");
  private readonly CONNECTION_ID = Buffer.from([
    0x00, 0x00, 0x04, 0x17, 0x27, 0x10, 0x19, 0x80,
  ]);
  private readonly ACTION_CONNECT = 0;
  private readonly ACTION_ANNOUNCE = 1;
  private readonly DEFAULT_TIMEOUT = 15000;

  constructor(private readonly torrent: Torrent) {
    this.socket.on("error", (err) => console.error("UDP error:", err));
  }

  async requestPeers(): Promise<TrackerResponse> {
    const url = this.parseTrackerUrl();
    const connectionId = await this.connectToTracker(url);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Tracker request timed out"));
        this.socket.close();
      }, this.DEFAULT_TIMEOUT);

      this.sendAnnounce(
        connectionId,
        url,
        (response, peers) => {
          clearTimeout(timer);
          resolve({ interval: response.readUInt32BE(8), peers });
        },
        reject
      );
    });
  }

  private parseTrackerUrl(): { host: string; port: number } {
    const announceUrl = this.torrent.announce;
    if (!announceUrl.startsWith("udp://")) {
      throw new Error(`Unsupported tracker protocol: ${announceUrl}`);
    }

    const parsed = new URL(announceUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 80,
    };
  }

  private async connectToTracker(url: {
    host: string;
    port: number;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const transactionId = this.generateTransactionId();
      const message = Buffer.alloc(16);

      this.CONNECTION_ID.copy(message, 0);
      message.writeUInt32BE(this.ACTION_CONNECT, 8);
      message.writeUInt32BE(transactionId, 12);

      const cleanup = () => {
        this.socket.removeAllListeners("message");
        this.socket.removeAllListeners("error");
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Connection timeout"));
      }, this.DEFAULT_TIMEOUT);

      this.socket.once("message", (msg) => {
        if (
          msg.readUInt32BE(0) !== this.ACTION_CONNECT ||
          msg.readUInt32BE(4) !== transactionId
        ) {
          return;
        }

        clearTimeout(timer);
        cleanup();
        resolve(msg.subarray(8, 16));
      });

      this.socket.send(message, url.port, url.host, (err) => {
        if (err) {
          clearTimeout(timer);
          cleanup();
          reject(err);
        }
      });
    });
  }

  private sendAnnounce(
    connectionId: Buffer,
    url: { host: string; port: number },
    onSuccess: (response: Buffer, peers: string[]) => void,
    onError: (error: Error) => void
  ) {
    const transactionId = this.generateTransactionId();
    const message = Buffer.alloc(98);

    connectionId.copy(message, 0);
    message.writeUInt32BE(this.ACTION_ANNOUNCE, 8);
    message.writeUInt32BE(transactionId, 12);
    this.torrent.infoHash.copy(message, 16);
    Buffer.from("-TS0001-123456789012").copy(message, 36); // Peer ID
    message.writeBigUInt64BE(BigInt(0), 56); // Downloaded
    message.writeBigUInt64BE(BigInt(this.torrent.totalLength), 64); // Left
    message.writeBigUInt64BE(BigInt(0), 72); // Uploaded
    message.writeUInt32BE(0, 80); // Event (0 = none)
    message.writeUInt32BE(0, 84); // IP address (0 = default)
    message.writeUInt32BE(this.generateTransactionId(), 88); // Key
    message.writeInt32BE(-1, 92); // Num want (-1 = default)
    message.writeUInt16BE(6881, 96); // Port

    this.socket.once("message", (msg) => {
      if (msg.readUInt32BE(4) !== transactionId) return;

      const action = msg.readUInt32BE(0);
      if (action === 3) {
        // Error
        const errorMessage = msg.toString("utf8", 8);
        onError(new Error(`Tracker error: ${errorMessage}`));
        return;
      }

      const peers = this.parseCompactPeers(msg.subarray(20));
      onSuccess(msg, peers);
    });

    this.socket.send(message, url.port, url.host, (err) => {
      if (err) onError(err);
    });
  }

  private parseCompactPeers(buffer: Buffer): string[] {
    const peers: string[] = [];
    for (let i = 0; i < buffer.length; i += 6) {
      const ip = buffer.subarray(i, i + 4).join(".");
      const port = buffer.readUInt16BE(i + 4);
      peers.push(`${ip}:${port}`);
    }
    return peers;
  }

  private generateTransactionId(): number {
    return Math.floor(Math.random() * 0xffffffff);
  }
}
