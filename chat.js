// Chat integration and command processing
let client = null;
let simulation = null;
let characters = {};

// Initialize elements
const channelInput = document.getElementById('channel-input');
const connectButton = document.getElementById('connect-btn');
const chatBox = document.getElementById('chat-box');
const statusDiv = document.getElementById('status');

// Handle connect/disconnect
connectButton.addEventListener('click', () => {
  if (client && client.readyState() === 'OPEN') {
    disconnectFromChat();
  } else {
    connectToChat();
  }
});

// Command regex patterns
const commandPatterns = {
  move: /!move\s+(north|south|east|west)/i,
  build: /!build\s+(house|garden|shop)/i,
  interact: /!interact\s+(\w+)/i,
  emote: /!emote\s+(wave|dance|sit|jump)/i
};

function connectToChat() {
  const channel = channelInput.value.toLowerCase().trim();
  
  if (!channel) {
    alert('Please enter a channel name');
    return;
  }

  // Create new client
  client = new window.tmi.Client({
    connection: {
      secure: true,
      reconnect: true
    },
    channels: [channel]
  });

  // Handle connection
  client.connect().catch(console.error);

  // Setup event handlers
  client.on('connected', () => {
    statusDiv.className = 'status connected';
    statusDiv.textContent = `Connected to ${channel}'s chat`;
    connectButton.textContent = 'Disconnect';
    
    // Initialize simulation if it hasn't been already
    if (!simulation) {
      simulation = new Simulation();
      simulation.init();
    }
  });

  client.on('disconnected', () => {
    statusDiv.className = 'status disconnected';
    statusDiv.textContent = 'Disconnected from chat';
    connectButton.textContent = 'Connect';
  });

  client.on('message', (channel, tags, message, self) => {
    // Add chat message to the chat box
    addChatMessage(tags['display-name'], message, tags);
    
    // Process the message for commands
    processMessage(tags['display-name'], message, tags);
    
    // Create or update character for this user
    handleUserCharacter(tags['display-name'], tags);
  });
}

function disconnectFromChat() {
  if (client) {
    client.disconnect();
    client = null;
  }
}

function addChatMessage(username, message, tags) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'timestamp';
  timestampSpan.textContent = timestamp;
  messageDiv.appendChild(timestampSpan);

  // Add username
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = username;
  messageDiv.appendChild(usernameSpan);

  // Add message
  const messageText = document.createElement('span');
  messageText.textContent = `: ${message}`;
  messageDiv.appendChild(messageText);

  // Add to chat box and scroll to bottom
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Limit messages to prevent memory issues
  while (chatBox.children.length > 100) {
    chatBox.removeChild(chatBox.firstChild);
  }
}

function processMessage(username, message, tags) {
  // Check for commands
  for (const [command, pattern] of Object.entries(commandPatterns)) {
    const match = message.match(pattern);
    if (match) {
      executeCommand(command, match[1], username);
      break;
    }
  }
}

function executeCommand(command, parameter, username) {
  if (!characters[username]) return;
  
  const character = characters[username];
  
  switch(command) {
    case 'move':
      character.moveDirection(parameter);
      break;
    case 'build':
      character.buildStructure(parameter);
      break;
    case 'interact':
      if (characters[parameter]) {
        character.interactWith(characters[parameter]);
      }
      break;
    case 'emote':
      character.performEmote(parameter);
      break;
  }
}

function handleUserCharacter(username, tags) {
  if (simulation && !characters[username]) {
    // Create new character based on user info
    const colorData = tags.color ? tags.color : generateRandomColor(username);
    const badges = tags.badges || {};
    const isMod = badges.moderator === '1';
    const isSubscriber = badges.subscriber === '1';
    const isBroadcaster = badges.broadcaster === '1';
    
    // Generate character type based on user status
    let characterType = 'villager';
    if (isBroadcaster) characterType = 'king';
    else if (isMod) characterType = 'knight';
    else if (isSubscriber) characterType = 'noble';
    
    // Create the character
    characters[username] = simulation.createCharacter(username, characterType, colorData);
    console.log(`Created ${characterType} character for ${username}`);
  }
}

function generateRandomColor(seed) {
  // Generate consistent color based on username
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const color = `#${((hash & 0xFFFFFF) | 0x100000).toString(16).substring(1)}`;
  return color;
}

// Handle Enter key in input
channelInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    connectButton.click();
  }
});

// UI controls
document.getElementById('follow-btn').addEventListener('click', () => {
  if (simulation) simulation.toggleFollowMode();
});

document.getElementById('view-btn').addEventListener('click', () => {
  if (simulation) simulation.toggleTopView();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (simulation) simulation.resetCamera();
});