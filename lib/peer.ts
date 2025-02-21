import { EventEmitter } from "events";
import net from "net";

export class Peer extends EventEmitter {
  private readonly socket: net.Socket;

  constructor(private readonly ip: string, private readonly port: number) {
    super();
    this.socket = new net.Socket();
  }

  async connect(infoHash: Buffer, peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(this.port, this.ip, () => {
        // Send handshake
        const handshake = Buffer.concat([
          Buffer.from([19]),
          Buffer.from("BitTorrent protocol"),
          Buffer.alloc(8),
          infoHash,
          Buffer.from(peerId),
        ]);
        this.socket.write(handshake);
      });

      this.socket.on("data", (data) => this.handleData(data));
      this.socket.on("error", reject);
    });
  }

  private handleData(data: Buffer) {
    // Parse protocol messages here
    this.emit("message", data);
  }
}
