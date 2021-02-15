import * as THREE from "three";
import {Vector2} from "three";
import {noise} from "./util/perlin";
import {TerrainBuilder} from "./TerrainBuilder";
import {AssetManager} from "./AssetManager";
import {debugBox, getMax, getMin, getRandomArbitrary, getRandomInt, radialSearch} from "./util/util";
import {Region} from "./Region";
import {Settings} from "./Settings";
import {AnimalHandler} from "./AnimalHandler";
import {DynamicInstancedMesh} from "./DynamicInstancedMesh";

export class World {

  constructor(tiles, tileSize) {
    this.tiles = tiles;
    this.tileSize = tileSize;

    this.worldGroup = new THREE.Group();
    let baseHeightData = this.generateHeight(tiles, tiles, tileSize, Settings.world.waterLandRatio, Settings.world.disruption);
    let max = getMax(baseHeightData);
    while (max < 0) {
      let min = getMin(baseHeightData);
      let tenPercent = Math.abs(min - max) / 10;
      baseHeightData.forEach(d => d + tenPercent);
      max = getMax(baseHeightData);
    }

    this.heightData = this.normalize(baseHeightData);

    let terrainBuilder = new TerrainBuilder();
    this.terrain = terrainBuilder.terrain(this.tiles, this.tileSize, this.heightData);

    this.worldGroup = new THREE.Group();
    this.worldGroup.add(this.terrain);
    this.water = terrainBuilder.createWater(tiles, tileSize);
    this.worldGroup.add(this.water);
    this.obstacles = {};
    this.waterMap = [];
    this.regions = [];

    let scope = this;
    this.updateWaterFunction = (key, value) => {
      if (key === "speed") {
        scope.water.material.uniforms['flowDirection'] = {
          type: 'v2',
          value: new Vector2(.1 + value * .01, .1 + value * .01)
        }
      }
    }
    Settings.onChange.push(this.updateWaterFunction);
  }

  generateHeight(width, height, size, waterLandRatio = .5, disruption = .5) {
    const worldNoise = noise();
    worldNoise.seed(Math.random());
    const borderNoise = noise();
    borderNoise.seed(Math.random());

    const data = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // circle border
        const cX = (x / width) * 2 - 1;
        const cY = (y / height) * 2 - 1;
        const d = .6 - Math.sqrt(cX * cX + cY * cY);
        const cN = borderNoise.simplex2(x / (size / 2), y / (size / 2)) * .2; // -.2 -> .2

        // smoothstep border on the edges
        const borderX = ((smoothstep(0.0, 0.2, (x / width)) - smoothstep(.8, 1.0, (x / width))) * 2) - .6;
        const borderY = ((smoothstep(0.0, 0.2, (y / height)) - smoothstep(.8, 1.0, (y / height))) * 2) - .6;
        const border = Math.min(Math.min(borderX, borderY), d + cN);

        // world
        let disruptionInverse = 3.5 - (disruption * 3);
        const world = worldNoise.simplex2(x / (size * disruptionInverse), y / (size * disruptionInverse)); // -1 -> 1
        const amplify = (Math.min(border, world) * 100) + (40 * waterLandRatio);
        data[x + y * height] = amplify + (Math.abs(cN) * 50);
      }
    }
    return data;

    function smoothstep(min, max, value) {
      let x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }
  }

  /**
   * Normalizes between - 1 and 1 but keep's
   *
   * @param arr
   */
  normalize(arr) {
    const max = getMax(arr);
    const min = getMin(arr) * -1;
    let normalized = [];
    arr.forEach(v => normalized.push(v < 0 ? v / min : v / max));
    return normalized;
  }

  buildWaterMap() {
    for (let i = 0; i < this.heightData.length; i++) {
      const grid = this.toGridVector(i);
      if (this.isWater(grid.x, grid.y) || this.hasObstacle(grid.x, grid.y)) {
        this.waterMap[i] = null;
        continue;
      }
      if (this.hasWater(grid.x, grid.y)) {
        this.waterMap[i] = new Vector2(grid.x, grid.y);
        continue;
      }
      this.waterMap[i] = radialSearch(grid, this, this.#updateWaterFound);
    }
  }

  #updateWaterFound(scope, target, center, minDistance, oldTarget) {
    let distance = center.distanceTo(target);
    if (target.x >= 0 && target.x < scope.tiles && target.y >= 0 && target.y < scope.tiles &&
      distance < minDistance && scope.hasWater(target.x, target.y) &&
      !scope.isWater(target.x, target.y) && !scope.hasObstacle(target.x, target.y)) {
      return [distance, target];
    }
    return [minDistance, oldTarget];
  }

  generateTrees(modelNames, density) {
    this.treeGroup = new THREE.Group();
    this.treeGroup.name = "trees";
    const treeGeometries = {};
    modelNames.forEach(tree => treeGeometries[tree] = []);

    for (let z = 0; z < this.tiles; z += 2) {
      for (let x = 0; x < this.tiles; x += 2) {
        if (this.isWater(x, z) || Math.random() > density) {
          continue;
        }
        this.obstacles[x + "_" + z] = true;
        const sceneVector = this.toScene(x, z, "center");
        const key = modelNames[getRandomInt(0, modelNames.length)];
        let scale = 20;
        let yScale = getRandomArbitrary(-5, 5);
        let scaleMatrix = new THREE.Matrix4();
        scaleMatrix.set(scale,
          0, 0, sceneVector.x,
          0, scale + yScale, 0, sceneVector.y,
          0, 0, scale, sceneVector.z,
          0, 0, 0, 1);
        let rotateMatrix = new THREE.Matrix4();
        rotateMatrix.makeRotationY(getRandomArbitrary(0, 2 * Math.PI));
        let resultMatrix = new THREE.Matrix4();
        treeGeometries[key].push(resultMatrix.multiplyMatrices(scaleMatrix, rotateMatrix));
      }
    }
    // instantiated
    Object.keys(treeGeometries).forEach(key => {
      const mesh = new THREE.InstancedMesh(AssetManager.geometry(key), AssetManager.material(key), treeGeometries[key].length);
      for (let i = 0; i < treeGeometries[key].length; i++) {
        mesh.setMatrixAt(i, treeGeometries[key][i]);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.treeGroup.add(mesh);
    });
    this.worldGroup.add(this.treeGroup);
    return this.treeGroup;
  }

  removeTrees() {
    if (this.treeGroup) {
      this.treeGroup.children[0].dispose();
      this.worldGroup.remove(this.treeGroup);
    }
  }

  buildRegions() {
    this.regions = [];
    for (let z = 0; z < this.tiles; z++) {
      for (let x = 0; x < this.tiles; x++) {
        if (!this.isWater(x, z) && !this.hasObstacle(x, z) && this.getRegion(x, z) === undefined) {
          let region = new Region();
          this.regions.push(region);
          region.build(this, x, z);
        }
      }
    }
  }

  getRegion(gridX, gridZ) {
    return this.regions.find(region => region.isPartOf(gridX, gridZ));
  }

  spawnFood(density) {
    const spawns = [];
    const carrot = AssetManager.create("carrot");
    for (let z = 0; z < this.tiles; z++) {
      for (let x = 0; x < this.tiles; x++) {
        if (Math.random() > density || this.isWater(x, z) || this.hasObstacle(x, z)) {
          continue;
        }
        spawns.push(new THREE.Vector2(x, z));
      }
    }
    this.foodMesh = new DynamicInstancedMesh(carrot.geometry, carrot.material, spawns.length);
    for (let i = 0; i < spawns.length; i++) {
      const spawn = spawns[i];
      const food = this.getRegion(spawn.x, spawn.y).addFood(this, i, spawn.x, spawn.y);
      this.foodMesh.setMatrixAt(i, food.model.matrix);
    }
    this.worldGroup.add(this.foodMesh);
  }

  removeFood() {
    if (this.foodMesh) {
      this.foodMesh.dispose();
      this.worldGroup.remove(this.foodMesh);
    }
  }

  spawnBabies(babies, mother) {
    const position = mother.model.getPosition();
    babies.forEach(baby => {
      let tile = this.toGrid(position.x, position.z);
      baby.model.setPosition(position.x, 0, position.z);
      baby.region = mother.region;
      AnimalHandler.addBunny(baby);
    });
  }

  getBunny(name) {
    for (let i = 0; i < this.regions.length; i++) {
      let result = this.regions[i].animals.find(b => b.name === name);
      if (result) {
        return result;
      }
    }
    return null;
  }

  getAnimals(gridX, gridZ, maxGridDistance) {
    let region = this.getRegion(gridX, gridZ);
    if (!region) {
      // sometimes the bunny hops over a water or obstacle tile
      if (!this.isWater(gridX, gridZ) && !this.hasObstacle(gridX, gridZ)) {
        console.error("no region for ", gridX, gridZ);
        debugBox(this, gridX, gridZ, 0x00ff00);
      }
      return [];
    }
    const d = maxGridDistance * this.tileSize;
    let v = new THREE.Vector3(gridX * this.tileSize, 0, gridZ * this.tileSize);
    return region.animals.filter(animal => {
      return v.distanceTo(animal.model.getPosition()) <= d;
    });
  }

  removeAnimal(animal) {
    animal.region.removeAnimal(animal);
    AnimalHandler.remove(animal);
  }

  isWater(gridX, gridZ) {
    return gridX >= 0 && gridX < this.tiles && gridZ >= 0 && gridZ < this.tiles &&
      this.heightData[gridX + gridZ * this.tiles] < 0;
  }

  /**
   * Checks if the a tile next to the given tile has water
   *
   * @param gridX
   * @param gridZ
   */
  hasWater(gridX, gridZ) {
    return this.isWater(gridX + 1, gridZ) || this.isWater(gridX - 1, gridZ) ||
      this.isWater(gridX, gridZ + 1) || this.isWater(gridX, gridZ - 1);
  }

  hasObstacle(gridX, gridZ) {
    return this.obstacles[gridX + "_" + gridZ];
  }

  isWalkable(gridX, gridZ) {
    return !this.isWater(gridX, gridZ) && !this.hasObstacle(gridX, gridZ);
  }

  getClosestWaterTile(gridX, gridZ, maxGridDistance) {
    const closestTile = this.waterMap[gridX + gridZ * this.tiles];
    if (!closestTile) {
      if (this.isWater(gridX, gridZ) || this.hasObstacle(gridX, gridZ)) {
        // sometimes the bunny hops over a water or obstacle tile when searching for water.
        return null;
      }
      console.error("no closest water tile for ", gridX, gridZ);
      debugBox(this, gridX, gridZ, 0x0000ff);
      return null;
    }
    return new THREE.Vector2(gridX, gridZ).distanceTo(closestTile) <= maxGridDistance ? closestTile : null;
  }

  hasFood(gridX, gridZ) {
    const region = this.getRegion(gridX, gridZ);
    if (!region) {
      // sometimes the bunny hops over a water or obstacle tile when searching for food.
      if (!this.isWater(gridX, gridZ) && !this.hasObstacle(gridX, gridZ)) {
        console.error("no region for ", gridX, gridZ);
        debugBox(this, gridX, gridZ, 0x00ff00);
      }
      return false;
    }
    return region.hasFood(gridX, gridZ);
  }

  toGridVector(index) {
    return new THREE.Vector2(index % this.tiles, Math.floor(index / this.tiles));
  }

  toScene(gridX, gridY, align = "center") {
    const sceneX = gridX * this.tileSize + (align === "center" ? this.tileSize / 2 : 0);
    const sceneZ = gridY * this.tileSize + (align === "center" ? this.tileSize / 2 : 0);
    return new THREE.Vector3(sceneX, 0, sceneZ);
  }

  toGrid(sceneX, sceneZ) {
    return new THREE.Vector2(Math.floor(sceneX / this.tileSize), Math.floor(sceneZ / this.tileSize));
  }

  tick() {
    this.regions.forEach(region => region.tick(this));
  }

  dispose() {
    this.removeTrees();
    this.removeFood();
    this.water.geometry.dispose();
    this.water.material.dispose();
    this.terrain.geometry.dispose();
    this.terrain.material.dispose();
    const i = Settings.onChange.indexOf(this.updateWaterFunction);
    Settings.onChange.splice(i, 1);
  }

}
