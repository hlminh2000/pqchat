import { createServer } from "http";
import next from "next";
import { Server, Socket } from "Socket.IO";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  const clients: { [k: string]: { socket: Socket } } = {}

  const sendTo = (clientId: string, event: string, data: any) => {
    const client = clients[clientId]
    if (!client) {
      return
    }
    client.socket.emit(event, data)
  }

  io.on("connection", (socket) => {
    clients[socket.id] = { socket }
    socket.on("disconnect", () => {
      delete clients[socket.id]
      console.log("disconnected!!!");
    });
    socket.onAny((event, data) => {
      if ([
        "rtc:offer",
        "rtc:answer",
        "rtc:ice",
        "rtc:deny"
      ].includes(event)) {
        const { to, payload } = data
        sendTo(to, event, { from: socket.id, payload })
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
