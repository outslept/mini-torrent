import { Torrent } from "./lib/torrent";
import { Client } from "./lib/client";

// Loading a torrenfile
const torrent = new Torrent("test.torrent");

// Initializing the client
const client = new Client(torrent);

// Process start
client.start();
