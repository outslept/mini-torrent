import { readFileSync } from "fs";
import { Bencoder } from "./bencoding";
import { createHash } from "crypto";

export class Torrent {
  public announce: string;
  public infoHash: Buffer;
  public pieceLength: number;
  public totalLength: number;
  public pieces: Buffer[];

  constructor(path: string) {
    console.log("Loading torrent file from:", path);

    const data = readFileSync(path);
    console.log("Torrent file size:", data.length, "bytes");

    const decoded = Bencoder.decode(data);
    console.log("Decoded torrent structure:", {
      announce: decoded.announce,
      info: {
        name: decoded.info.name,
        "piece length": decoded.info["piece length"],
        pieces: decoded.info.pieces?.length,
      },
    });

    const info = decoded.info;

    // Unified handling for announce URL
    const announceData = decoded.announce;
    if (typeof announceData === "string") {
      this.announce = announceData;
    } else {
      // Handle Uint8Array, Buffer, or number arrays
      const buffer = Buffer.from(announceData);
      this.announce = buffer.toString("utf8");
    }

    console.log("Raw announce data:", decoded.announce);
    console.log("Processed announce URL:", this.announce);

    console.log("Announce URL:", this.announce);

    this.pieceLength = info["piece length"];
    console.log("Piece length:", this.pieceLength);

    if (info.length) {
      this.totalLength = info.length;
      console.log("Single file torrent, total length:", this.totalLength);
    } else {
      this.totalLength = info.files.reduce(
        (sum: number, file: any) => sum + file.length,
        0
      );
      console.log("Multi-file torrent, total length:", this.totalLength);
    }

    const infoBuffer = Bencoder.encode(info);
    this.infoHash = createHash("sha1").update(infoBuffer).digest();
    console.log("Info hash:", this.infoHash.toString("hex"));

    const piecesString = info.pieces.toString("binary");
    this.pieces = [];
    for (let i = 0; i < piecesString.length; i += 20) {
      this.pieces.push(Buffer.from(piecesString.substr(i, 20), "binary"));
    }
    console.log("Number of pieces:", this.pieces.length);
  }
}
