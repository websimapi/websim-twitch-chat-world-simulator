// Main simulation controller
class Simulation {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.characters = {};
    this.followTarget = null;
    this.isFollowing = false;
    this.isTopView = false;
    this.worldSize = 1000;
    this.terrain = null;
    this.buildings = [];
    
    // Character selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedCharacter = null;
    
    this.init = this.init.bind(this);
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseClick = this.onMouseClick.bind(this);
  }
  
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.0015);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 100, 150);
    this.camera.lookAt(0, 0, 0);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    
    // Create controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2;
    
    // Add event listeners
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('click', this.onMouseClick);
    
    // Create lights
    this.addLights();
    
    // Create world
    this.createWorld();
    
    // Start animation loop
    this.animate();
  }
  
  addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 1, 1).normalize();
    dirLight.position.multiplyScalar(100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);
  }
  
  createWorld() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 128, 128);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x355E3B, // Forest green
      roughness: 0.8,
      metalness: 0.2
    });
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
    
    // Create heightmap for terrain
    this.createTerrainHeightmap(groundGeometry);
    
    // Add water plane
    const waterGeometry = new THREE.PlaneGeometry(this.worldSize * 2, this.worldSize * 2);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.2
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5;
    this.scene.add(water);
    
    // Add trees and rocks
    this.addEnvironmentObjects();
    
    // Add village center
    this.createVillageCenter();
  }
  
  createTerrainHeightmap(geometry) {
    // Create random heightmap for terrain
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Create rolling hills effect
      const distance = Math.sqrt(x * x + z * z) / this.worldSize;
      
      // Simplex-like noise
      const frequency = 0.01;
      const height = 
        Math.sin(x * frequency) * Math.cos(z * frequency) * 10 +
        Math.sin(x * frequency * 2) * Math.cos(z * frequency * 2) * 5;
      
      // Lower height at the edges
      const edgeFactor = Math.max(0, 1 - distance * 2);
      
      vertices[i + 1] = height * edgeFactor;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  
  addEnvironmentObjects() {
    // Add trees
    const treeCount = 200;
    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() - 0.5) * this.worldSize * 0.9;
      const z = (Math.random() - 0.5) * this.worldSize * 0.9;
      
      // Check distance from center
      const distance = Math.sqrt(x * x + z * z);
      if (distance < 50) continue; // Keep center area clear
      
      this.createTree(x, this.getHeightAt(x, z), z);
    }
    
    // Add rocks
    const rockCount = 50;
    for (let i = 0; i < rockCount; i++) {
      const x = (Math.random() - 0.5) * this.worldSize * 0.9;
      const z = (Math.random() - 0.5) * this.worldSize * 0.9;
      
      // Check distance from center
      const distance = Math.sqrt(x * x + z * z);
      if (distance < 50) continue; // Keep center area clear
      
      this.createRock(x, this.getHeightAt(x, z), z);
    }
  }
  
  createTree(x, y, z) {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y + 4, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.scene.add(trunk);
    
    // Tree leaves
    const leavesGeometry = new THREE.ConeGeometry(5, 12, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, y + 12, z);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    this.scene.add(leaves);
  }
  
  createRock(x, y, z) {
    // Random rock size
    const size = 1 + Math.random() * 3;
    
    // Rock
    const rockGeometry = new THREE.DodecahedronGeometry(size, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.8
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, y + size / 2, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
  }
  
  createVillageCenter() {
    // Create center plaza
    const plazaGeometry = new THREE.CircleGeometry(40, 32);
    const plazaMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xD2B48C,
      roughness: 0.9
    });
    const plaza = new THREE.Mesh(plazaGeometry, plazaMaterial);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.1; // Slightly above ground
    this.scene.add(plaza);
    
    // Add central fountain
    this.createFountain(0, 0, 0);
    
    // Add buildings around the center
    const buildingCount = 8;
    const radius = 60;
    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const building = this.createBuilding(x, this.getHeightAt(x, z), z, i % 3);
      this.buildings.push(building);
    }
  }
  
  createFountain(x, y, z) {
    // Fountain base
    const baseGeometry = new THREE.CylinderGeometry(10, 12, 2, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, y + 1, z);
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    
    // Fountain middle
    const middleGeometry = new THREE.CylinderGeometry(6, 8, 2, 16);
    const middle = new THREE.Mesh(middleGeometry, baseMaterial);
    middle.position.set(x, y + 3, z);
    middle.castShadow = true;
    middle.receiveShadow = true;
    this.scene.add(middle);
    
    // Water
    const waterGeometry = new THREE.CylinderGeometry(8, 8, 0.5, 16);
    const waterMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4444ff,
      transparent: true,
      opacity: 0.7
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.set(x, y + 2, z);
    this.scene.add(water);
    
    // Center pillar
    const pillarGeometry = new THREE.CylinderGeometry(1, 1, 8, 8);
    const pillar = new THREE.Mesh(pillarGeometry, baseMaterial);
    pillar.position.set(x, y + 7, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.scene.add(pillar);
    
    // Top sphere
    const sphereGeometry = new THREE.SphereGeometry(2, 16, 16);
    const sphere = new THREE.Mesh(sphereGeometry, baseMaterial);
    sphere.position.set(x, y + 12, z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.scene.add(sphere);
  }
  
  createBuilding(x, y, z, type = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    let width, depth, height, color;
    
    switch(type) {
      case 0: // House
        width = 16;
        depth = 12;
        height = 8;
        color = 0xD2B48C; // Tan
        break;
      case 1: // Shop
        width = 14;
        depth = 18;
        height = 10;
        color = 0xCD853F; // Peru
        break;
      case 2: // Tall building
        width = 12;
        depth = 12;
        height = 15;
        color = 0xBC8F8F; // Rosy Brown
        break;
    }
    
    // Main building
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshStandardMaterial({ color });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = height / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);
    
    // Roof
    const roofHeight = height * 0.5;
    const roofGeometry = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, roofHeight, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height + roofHeight / 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
    
    // Door
    const doorWidth = 3;
    const doorHeight = 5;
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, doorHeight / 2, depth / 2 + 0.1);
    group.add(door);
    
    // Windows
    const windowSize = 2;
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xADD8E6,
      transparent: true,
      opacity: 0.7
    });
    
    // Add windows on each side
    const windowOffsetY = height / 2;
    
    // Front windows
    const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow1.position.set(-width / 4, windowOffsetY, depth / 2 + 0.1);
    group.add(frontWindow1);
    
    const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow2.position.set(width / 4, windowOffsetY, depth / 2 + 0.1);
    group.add(frontWindow2);
    
    // Side windows
    const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow1.position.set(width / 2 + 0.1, windowOffsetY, depth / 4);
    sideWindow1.rotation.y = Math.PI / 2;
    group.add(sideWindow1);
    
    const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow2.position.set(width / 2 + 0.1, windowOffsetY, -depth / 4);
    sideWindow2.rotation.y = Math.PI / 2;
    group.add(sideWindow2);
    
    // Add to scene
    this.scene.add(group);
    return group;
  }
  
  getHeightAt(x, z) {
    // Simple height function to match the terrain
    const distance = Math.sqrt(x * x + z * z) / this.worldSize;
    const frequency = 0.01;
    
    const height = 
      Math.sin(x * frequency) * Math.cos(z * frequency) * 10 +
      Math.sin(x * frequency * 2) * Math.cos(z * frequency * 2) * 5;
    
    const edgeFactor = Math.max(0, 1 - distance * 2);
    return height * edgeFactor;
  }
  
  createCharacter(username, type, color) {
    // Get random position near the center
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 20;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = this.getHeightAt(x, z);
    
    // Create character and add to scene
    const character = new Character(username, type, color, this.scene);
    character.setPosition(x, y, z);
    
    this.characters[username] = character;
    return character;
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Get all character meshes
    const characterMeshes = [];
    for (const username in this.characters) {
      const character = this.characters[username];
      if (character.mesh) {
        characterMeshes.push(character.mesh);
      }
    }
    
    // Check for intersections
    const intersects = this.raycaster.intersectObjects(characterMeshes);
    
    if (intersects.length > 0) {
      // Find the selected character
      for (const username in this.characters) {
        const character = this.characters[username];
        if (character.mesh === intersects[0].object) {
          this.selectCharacter(character);
          break;
        }
      }
    } else {
      // Deselect if clicked elsewhere
      this.selectCharacter(null);
    }
  }
  
  selectCharacter(character) {
    // Remove highlight from previously selected character
    if (this.selectedCharacter) {
      this.selectedCharacter.setSelected(false);
    }
    
    this.selectedCharacter = character;
    
    // Update UI
    const selectedDetails = document.getElementById('selected-details');
    
    if (character) {
      // Highlight new selection
      character.setSelected(true);
      
      // Update info panel
      selectedDetails.innerHTML = `
        <strong>Name:</strong> ${character.username}<br>
        <strong>Type:</strong> ${character.type}<br>
        <strong>Mood:</strong> ${character.mood}<br>
        <strong>Activity:</strong> ${character.activity}
      `;
      
      // Set as follow target if in follow mode
      if (this.isFollowing) {
        this.followTarget = character;
      }
    } else {
      selectedDetails.textContent = "No character selected";
    }
  }
  
  toggleFollowMode() {
    this.isFollowing = !this.isFollowing;
    
    if (this.isFollowing && this.selectedCharacter) {
      this.followTarget = this.selectedCharacter;
    } else {
      this.followTarget = null;
    }
    
    const followBtn = document.getElementById('follow-btn');
    followBtn.textContent = this.isFollowing ? 'Stop Following' : 'Follow';
  }
  
  toggleTopView() {
    this.isTopView = !this.isTopView;
    
    if (this.isTopView) {
      this.camera.position.set(0, 300, 0);
      this.camera.lookAt(0, 0, 0);
    } else {
      this.resetCamera();
    }
    
    const viewBtn = document.getElementById('view-btn');
    viewBtn.textContent = this.isTopView ? 'Normal View' : 'Top View';
  }
  
  resetCamera() {
    this.camera.position.set(0, 100, 150);
    this.camera.lookAt(0, 0, 0);
    this.controls.reset();
    this.isTopView = false;
    
    const viewBtn = document.getElementById('view-btn');
    viewBtn.textContent = 'Top View';
  }
  
  updateCharacters(deltaTime) {
    for (const username in this.characters) {
      this.characters[username].update(deltaTime, this.characters);
    }
  }
  
  updateCamera() {
    if (this.isFollowing && this.followTarget) {
      // Get target position
      const target = this.followTarget.getPosition();
      
      // Set camera position behind and above the character
      const cameraOffset = new THREE.Vector3(-30, 20, -30);
      cameraOffset.applyQuaternion(this.followTarget.getRotation());
      
      // Smooth camera movement
      this.camera.position.lerp(target.clone().add(cameraOffset), 0.05);
      this.camera.lookAt(target);
      
      // Disable controls when following
      this.controls.enabled = false;
    } else {
      this.controls.enabled = true;
    }
  }
  
  animate() {
    requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    
    // Update characters
    this.updateCharacters(deltaTime);
    
    // Update camera
    this.updateCamera();
    
    // Update controls
    this.controls.update();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

class Character {
  constructor(username, type, color, scene) {
    this.username = username;
    this.type = type;
    this.color = color;
    this.scene = scene;
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.mood = 'Neutral';
    this.activity = 'Idle';
    
    this.init = this.init.bind(this);
    this.update = this.update.bind(this);
    this.setPosition = this.setPosition.bind(this);
    this.getPosition = this.getPosition.bind(this);
    this.getRotation = this.getRotation.bind(this);
    this.setSelected = this.setSelected.bind(this);
    
    this.init();
  }
  
  init() {
    // Create character mesh
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }
  
  update(deltaTime, characters) {
    // Update character logic here
  }
  
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
  }
  
  getPosition() {
    return this.position;
  }
  
  getRotation() {
    return this.rotation;
  }
  
  setSelected(selected) {
    // Update character selection logic here
  }
}