import { Torrent } from "./torrent";
import { Tracker } from "./tracker";
import { PeerManager } from "./peer-manager";

export class Client {
  private readonly tracker: Tracker;
  private readonly peerManager = new PeerManager();

  constructor(private readonly torrent: Torrent) {
    console.log(
      "Client initialized with torrent hash:",
      torrent.infoHash.toString("hex")
    );
    this.tracker = new Tracker(torrent);
  }

  async start() {
    console.log("Starting client...");
    try {
      const { peers } = await this.tracker.requestPeers();
      console.log("Received peers from tracker:", peers);

      peers.forEach((peer) => {
        const [ip, port] = peer.split(":");
        console.log("Connecting to peer:", { ip, port });

        this.peerManager
          .addPeer(ip, parseInt(port))
          .connect(this.torrent.infoHash, "-TS0001-123456789012");
      });
    } catch (error) {
      console.error("Client start failed:", error);
    }
  }
}
