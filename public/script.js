const socket = io();

if ('Notification' in window) {
  Notification.requestPermission();
}

function showBrowserNotification(msg) {
  if (Notification.permission === 'granted') {
    new Notification('Queue-Info', { body: msg });
  }
}

let currentQueue = [];
let maxSlots = 5;
let watchName = null;
let notified = false; // damit man nur einmal benachrichtigt wird

socket.on('update', data => {
  currentQueue = data.queue;
  maxSlots = data.maxSlots;
  render();
});

function render() {
  const list = document.getElementById('queue-list');
  list.innerHTML = '';

  currentQueue.forEach((user, index) => {
    const { name, joinTime } = user;

    const li = document.createElement('li');

    //Status-Symbole (based on Verfügbare Plätze (index))
    const status = index < maxSlots ? '✅' : '🕓';

    // Watch Hervorhebung
    if (name === watchName) {
      li.classList.add('watch-highlight');
    }

    //Watch/End Watch Buttons
    let watchButtonHtml = '';
    if (name === watchName) {
      watchButtonHtml = `<button class="unwatch" onclick="clearWatch()">❌ End Watch</button>`;
    } else {
      watchButtonHtml = `<button class="watch" onclick="setWatchFromList('${user.name}')">👀 Watch</button>`;
    }

    //Remove Button
    const removeButton = `<button class="remove" onclick="removeUser('${user.name}')">🗑 Remove</button>`;

    // Uhrzeitanzeige
    let timeInfo = '';
    if (index >= maxSlots && joinTime) {
      timeInfo = `<span class="time-info">ab ${joinTime} Uhr</span>`;
    }

    li.innerHTML = `
      <span class="user-info">
        ${index >= maxSlots ? `${index - maxSlots + 1}. ` : ''}
        ${name} ${status}
        ${timeInfo}
      </span>
      ${watchButtonHtml}
      ${removeButton}
    `;

    list.appendChild(li);

    // Trennlinie nach den aktiven Spielern
    if (index === maxSlots - 1 && index < currentQueue.length - 1) {
      const separator = document.createElement('li');
      separator.innerHTML = `<hr style="border: 1px solid #666; margin: 10px 0;">`;
      list.appendChild(separator);
    }
  });

  document.getElementById('slots-info').textContent = `Verfügbare Plätze: ${maxSlots}`;

  // Watch-Logik
  if (watchName && !notified) {
    const index = currentQueue.findIndex(u => u.name === watchName);
    if (index > -1 && index < maxSlots) {
      playNotification();
      showBrowserNotification(`${watchName} is now active!`);
      notified = true;
    }
  }
}

function addUser() {
  const input = document.getElementById('name-input');
  const timeInput = document.getElementById('join-time-input');
  const name = input.value.trim();
  const joinTime = timeInput.value;

  if (name) {
    socket.emit('addUser', { name, joinTime }); // Objekt mit Name und Uhrzeit senden
    nameInput.value = '';  // Eingabe zurücksetzen
    timeInput.value = '';  // Uhrzeit zurücksetzen
  } else {
    alert('Bitte gib einen Namen ein.');
  }
}

function removeUser(name) {
  socket.emit('removeUser', name);
}

function setMaxSlots() {
  const newMax = document.getElementById('max-slots').value;
  socket.emit('setMaxSlots', newMax);
}

function setWatch() {
  const name = document.getElementById('watch-name').value.trim();
  if (name) {
    watchName = name;
    notified = false; // zurücksetzen falls man neu beobachtet
    localStorage.setItem('watchName', name);
    document.getElementById('watch-status').textContent = `⏱ Watch: ${name}`;
  }
}

function setWatchFromList(name) {
  watchName = name;
  notified = false;
  localStorage.setItem('watchName', name);  // speichern
  document.getElementById('watch-status').textContent = `⏱ Watch: ${name}`;
  render();
}

function clearWatch() {
  watchName = null;
  notified = false;
  localStorage.removeItem('watchName');
  document.getElementById('watch-status').textContent = 'No Watch active.';
  render();
}

function playNotification() {
  const audio = document.getElementById('notif-sound');
  audio.play().catch(err => {
    console.log("Notification couldn't be palyed:", err);
  });
}

/*function handleEnter(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addUser();
  }
}*/

// Wiederherstellung bei Seitenaufruf
window.addEventListener('load', () => {
  const savedWatch = localStorage.getItem('watchName');
  if (savedWatch) {
    watchName = savedWatch;
    notified = false; // evtl. erneut benachrichtigen
    document.getElementById('watch-status').textContent = `⏱ Watch: ${watchName}`;
  }
  const nameInput = document.getElementById('name-input');
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addUser();
    }
  });
  render();
});
