import { Peer } from "./peer";

export class PeerManager {
  private peers: Peer[] = [];

  addPeer(ip: string, port: number) {
    const peer = new Peer(ip, port);
    this.peers.push(peer);
    return peer;
  }

  removePeer(peer: Peer) {
    this.peers = this.peers.filter((p) => p !== peer);
  }
}
