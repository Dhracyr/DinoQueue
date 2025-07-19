const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let maxSlots = 5;
let queue = [];

io.on('connection', (socket) => {
  sendQueue();

  socket.on('addUser', ({ name, joinTime }) => {
  if (!queue.find(user => user.name === name)) {
    queue.push({ name, joinTime: joinTime || null }); // optional, falls leer
    sendQueue();
  }
  });

  socket.on('removeUser', (name) => {
    queue = queue.filter(user => user.name !== name);
    sendQueue();
  });

  socket.on('setMaxSlots', (newMax) => {
    maxSlots = parseInt(newMax) || 5;
    sendQueue();
  });
});

function sendQueue() {
  const now = new Date();
  const activeQueue = [];
  let slotsFilled = 0;

  for (const user of queue) {
    if (slotsFilled >= maxSlots) {
      break;
    }

    if (!user.joinTime) {
      // Kein Zeitlimit – nur nehmen, wenn niemand mit Time eligible ist
      activeQueue.push(user);
      slotsFilled++;
    } else {
      const [hours, minutes] = user.joinTime.split(':').map(Number);
      const joinDate = new Date(now);
      joinDate.setHours(hours, minutes, 0, 0);

      // Wenn Uhrzeit vor jetzt: Auf morgen verschieben
      if (joinDate < now) {
        joinDate.setDate(joinDate.getDate() + 1);
      }

      const diffMinutes = (joinDate - now) / (1000 * 60);
      if (diffMinutes <= 15) {
        user.joinTime = null;
        activeQueue.push(user);
        slotsFilled++;
      }
      // Sonst: überspringen, aber nicht aus Queue löschen
    }
  }

  // Alle übrigen hinten anhängen (nicht aktiv)
  const waitingQueue = queue.filter(user => !activeQueue.includes(user));
  const fullQueue = activeQueue.concat(waitingQueue);

  io.emit('update', {
    queue: fullQueue,
    maxSlots,
  });
}

http.listen(3000, () => {
  console.log('Server läuft auf http://localhost:3000');
});
