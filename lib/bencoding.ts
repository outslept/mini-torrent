/**
 * Bencode encoding/decoding implementation compliant with BEP-0003
 * Handles BitTorrent's specific data serialization format
 * @see https://www.bittorrent.org/beps/bep_0003.html#bencoding
 */
import bencode from "bencode";

export class Bencoder {
  /**
   * Decodes bencoded data into native JavaScript types
   * @param data - Buffer containing bencoded data
   * @returns Parsed object structure
   */
  static decode(data: Buffer): any {
    return bencode.decode(data);
  }

  /**
   * Encodes JavaScript objects to bencoded format
   * @param data - Serializable object
   * @returns Buffer ready for network transmission
   */
  static encode(data: any): Buffer {
    return bencode.encode(data);
  }
}
