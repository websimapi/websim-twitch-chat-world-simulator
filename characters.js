// Character class for simulation
class Character {
  constructor(username, type, color, scene) {
    this.username = username;
    this.type = type;
    this.color = color;
    this.scene = scene;
    
    // Character state
    this.position = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.mesh = null;
    this.nameTag = null;
    this.selected = false;
    this.path = [];
    
    // Character traits
    this.speed = 5 + Math.random() * 3;
    this.mood = this.getRandomMood();
    this.activity = 'exploring';
    this.interests = this.generateInterests();
    this.lastInteractionTime = 0;
    this.interactionCooldown = 5; // seconds
    this.buildingCooldown = 30; // seconds
    this.lastBuildTime = 0;
    
    // Initialize mesh
    this.createMesh();
    
    // Start autonomous behavior
    this.setRandomDestination();
  }
  
  createMesh() {
    // Character body
    let bodyGeometry;
    
    switch(this.type) {
      case 'king':
        bodyGeometry = new THREE.ConeGeometry(2, 6, 8);
        break;
      case 'knight':
        bodyGeometry = new THREE.BoxGeometry(3, 5, 2);
        break;
      case 'noble':
        bodyGeometry = new THREE.CylinderGeometry(1.5, 2, 5, 8);
        break;
      default: // villager
        bodyGeometry = new THREE.CylinderGeometry(1, 2, 4, 8);
        break;
    }
    
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: this.color,
      roughness: 0.7,
      metalness: 0.3
    });
    
    this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Add character to scene
    this.scene.add(this.mesh);
    
    // Create username label above character
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.font = '24px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.fillText(this.username, 128, 24);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const nameMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    
    this.nameTag = new THREE.Sprite(nameMaterial);
    this.nameTag.scale.set(10, 2.5, 1);
    
    this.scene.add(this.nameTag);
    
    // Add selection indicator
    this.selectionRing = this.createSelectionRing();
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
    
    // Update positions
    this.updateMeshPosition();
  }
  
  createSelectionRing() {
    const geometry = new THREE.RingGeometry(3, 3.5, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2; // Flat on ground
    
    return ring;
  }
  
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.updateMeshPosition();
  }
  
  getPosition() {
    return this.position.clone();
  }
  
  getRotation() {
    return this.rotation.clone();
  }
  
  updateMeshPosition() {
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      
      // Adjust character height to be above ground
      if (this.type === 'king') {
        this.mesh.position.y += 3;
      } else if (this.type === 'knight') {
        this.mesh.position.y += 2.5;
      } else if (this.type === 'noble') {
        this.mesh.position.y += 2.5;
      } else {
        this.mesh.position.y += 2;
      }
    }
    
    if (this.nameTag) {
      this.nameTag.position.copy(this.position);
      this.nameTag.position.y += 8; // Position above character
    }
    
    if (this.selectionRing) {
      this.selectionRing.position.copy(this.position);
      this.selectionRing.position.y += 0.1; // Just above ground
    }
  }
  
  setSelected(selected) {
    this.selected = selected;
    if (this.selectionRing) {
      this.selectionRing.visible = selected;
    }
  }
  
  moveTowards(targetPosition, deltaTime) {
    // Calculate direction
    const direction = targetPosition.clone().sub(this.position);
    const distance = direction.length();
    
    // If close enough, consider arrived
    if (distance < 1) {
      return true;
    }
    
    // Normalize direction and apply speed
    direction.normalize();
    
    // Apply movement
    const movement = direction.multiplyScalar(this.speed * deltaTime);
    this.position.add(movement);
    
    // Calculate rotation to face direction of movement
    if (movement.length() > 0) {
      const lookAt = new THREE.Vector3(
        this.position.x + direction.x,
        this.position.y,
        this.position.z + direction.z
      );
      
      const m = new THREE.Matrix4();
      m.lookAt(this.position, lookAt, new THREE.Vector3(0, 1, 0));
      
      const targetQuaternion = new THREE.Quaternion();
      targetQuaternion.setFromRotationMatrix(m);
      
      // Smoothly rotate
      this.mesh.quaternion.slerp(targetQuaternion, 5 * deltaTime);
      this.rotation.copy(this.mesh.quaternion);
    }
    
    // Update position
    this.updateMeshPosition();
    
    // Not arrived yet
    return false;
  }
  
  update(deltaTime, otherCharacters) {
    // Follow path if we have one
    if (this.path.length > 0) {
      const arrived = this.moveTowards(this.path[0], deltaTime);
      
      if (arrived) {
        this.path.shift();
        
        // If path is empty, we've reached the destination
        if (this.path.length === 0) {
          this.onDestinationReached();
        }
      }
    }
    
    // Random chance to change destination if idle
    if (this.path.length === 0 && Math.random() < 0.005) {
      this.setRandomDestination();
    }
    
    // Random chance to interact with nearby characters
    if (Math.random() < 0.01 * deltaTime) {
      this.findAndInteractWithNearby(otherCharacters);
    }
    
    // Random chance to change mood
    if (Math.random() < 0.001 * deltaTime) {
      this.mood = this.getRandomMood();
    }
  }
  
  setRandomDestination() {
    // Pick a random destination within the world
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 200;
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    // Set a simple path to the destination
    this.path = [new THREE.Vector3(x, 0, z)];
    this.activity = 'walking';
  }
  
  moveDirection(direction) {
    // Handle command to move in specific direction
    const distance = 30;
    let x = 0, z = 0;
    
    switch(direction.toLowerCase()) {
      case 'north':
        z = -distance;
        break;
      case 'south':
        z = distance;
        break;
      case 'east':
        x = distance;
        break;
      case 'west':
        x = -distance;
        break;
    }
    
    // Set path to target location (relative to current position)
    const targetPosition = new THREE.Vector3(
      this.position.x + x,
      0,
      this.position.z + z
    );
    
    this.path = [targetPosition];
    this.activity = `moving ${direction}`;
  }
  
  buildStructure(type) {
    const now = Date.now() / 1000;
    if (now - this.lastBuildTime < this.buildingCooldown) {
      return; // Still on cooldown
    }
    
    // Set building activity
    this.activity = `building ${type}`;
    
    // Create a small structure near the character
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 5;
    
    const x = this.position.x + Math.cos(angle) * distance;
    const z = this.position.z + Math.sin(angle) * distance;
    
    // TODO: Implement actual building creation in simulation
    console.log(`${this.username} is building a ${type} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
    
    // Set cooldown
    this.lastBuildTime = now;
  }
  
  interactWith(character) {
    const now = Date.now() / 1000;
    if (now - this.lastInteractionTime < this.interactionCooldown) {
      return; // Still on cooldown
    }
    
    // Move toward the character
    const targetPosition = character.getPosition();
    this.path = [targetPosition.clone()];
    
    // Set interaction state
    this.activity = `interacting with ${character.username}`;
    
    // Set cooldown
    this.lastInteractionTime = now;
  }
  
  performEmote(emote) {
    // Set emote activity
    this.activity = emote;
    
    // TODO: Add visual emote indicators or animations
    console.log(`${this.username} is performing emote: ${emote}`);
    
    // Reset activity after a delay
    setTimeout(() => {
      if (this.activity === emote) {
        this.activity = 'idle';
      }
    }, 3000);
  }
  
  findAndInteractWithNearby(otherCharacters) {
    const now = Date.now() / 1000;
    if (now - this.lastInteractionTime < this.interactionCooldown) {
      return; // Still on cooldown
    }
    
    // Find nearby characters
    const nearbyCharacters = [];
    
    for (const username in otherCharacters) {
      if (username === this.username) continue;
      
      const otherCharacter = otherCharacters[username];
      const distance = this.position.distanceTo(otherCharacter.position);
      
      if (distance < 20) {
        nearbyCharacters.push(otherCharacter);
      }
    }
    
    // If found nearby characters, interact with a random one
    if (nearbyCharacters.length > 0) {
      const randomIndex = Math.floor(Math.random() * nearbyCharacters.length);
      const targetCharacter = nearbyCharacters[randomIndex];
      
      // Move toward the character
      this.path = [targetCharacter.position.clone()];
      
      // Set interaction state
      this.activity = `approaching ${targetCharacter.username}`;
      
      // Set cooldown
      this.lastInteractionTime = now;
    }
  }
  
  onDestinationReached() {
    // Choose a random activity
    const activities = ['idle', 'observing', 'thinking', 'resting'];
    this.activity = activities[Math.floor(Math.random() * activities.length)];
    
    // Wait for a while before moving again
    setTimeout(() => {
      if (this.path.length === 0) {
        this.setRandomDestination();
      }
    }, 3000 + Math.random() * 7000);
  }
  
  getRandomMood() {
    const moods = ['happy', 'curious', 'relaxed', 'excited', 'thoughtful', 'busy'];
    return moods[Math.floor(Math.random() * moods.length)];
  }
  
  generateInterests() {
    const allInterests = [
      'building', 'exploring', 'socializing', 'collecting', 
      'trading', 'crafting', 'gardening', 'fishing'
    ];
    
    // Pick 2-3 random interests
    const count = 2 + Math.floor(Math.random() * 2);
    const interests = [];
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * allInterests.length);
      interests.push(allInterests[randomIndex]);
      allInterests.splice(randomIndex, 1);
    }
    
    return interests;
  }
}