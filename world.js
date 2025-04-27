// World generation and management for the simulation

class World {
  constructor(scene, size) {
    this.scene = scene;
    this.size = size;
    this.heightMap = new Map();
    this.buildings = [];
    this.trees = [];
    this.structures = [];
  }
  
  // This class will be expanded as needed by the simulation class
  // It currently exists as a placeholder for future world generation features
  // like dynamic terrain modification, building placement, etc.
  
  getHeightAt(x, z) {
    // Get height from heightmap or interpolate
    const key = `${Math.floor(x)},${Math.floor(z)}`;
    return this.heightMap.get(key) || 0;
  }
  
  setHeightAt(x, z, height) {
    const key = `${Math.floor(x)},${Math.floor(z)}`;
    this.heightMap.set(key, height);
  }
  
  addStructure(structure, x, y, z) {
    structure.position.set(x, y, z);
    this.scene.add(structure);
    this.structures.push(structure);
    return structure;
  }
  
  findNearestBuilding(position) {
    let closest = null;
    let minDistance = Infinity;
    
    for (const building of this.buildings) {
      const distance = position.distanceTo(building.position);
      if (distance < minDistance) {
        minDistance = distance;
        closest = building;
      }
    }
    
    return closest;
  }
  
  getRandomLocation() {
    const x = (Math.random() - 0.5) * this.size;
    const z = (Math.random() - 0.5) * this.size;
    const y = this.getHeightAt(x, z);
    
    return new THREE.Vector3(x, y, z);
  }
}