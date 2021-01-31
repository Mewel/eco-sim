import * as THREE from "three";
import {Vector2} from "three";
import {noise} from "./util/perlin";
import {FlatTerrainBuilder} from "./FlatTerrainBuilder";
import {ModelManager} from "./ModelManager";
import {debugBox, getMax, getMin, getRandomArbitrary, getRandomInt, radialSearch} from "./util/util";
import {Region} from "./Region";
import {Settings} from "./Settings";

export class FlatWorld {

  constructor(tiles, tileSize) {
    this.tiles = tiles;
    this.tileSize = tileSize;

    this.worldGroup = new THREE.Group();
    this.heightData = this.normalize(this.generateHeight(tiles, tiles, tileSize));

    let terrainBuilder = new FlatTerrainBuilder();
    this.terrain = terrainBuilder.terrain(this.tiles, this.tileSize, this.heightData);

    this.worldGroup = new THREE.Group();
    this.worldGroup.add(this.terrain);
    this.water = terrainBuilder.createWater(tiles, tileSize);
    this.worldGroup.add(this.water);
    this.obstacles = {};
    this.waterMap = [];
    this.regions = [];

    let scope = this;
    Settings.onChange.push((key, value) => {
      if (key === "speed") {
        scope.water.material.uniforms['flowDirection'] = {
          type: 'v2',
          value: new Vector2(.2 * value, .2 * value)
        }
      }
    });
  }

  generateHeight(width, height, size) {
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
        const world = worldNoise.simplex2(x / (size * 2), y / (size * 2)); // -1 -> 1
        const amplify = (Math.min(border, world) * 100) + 20;
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
   * Normalizes between -1 and 1
   *
   * @param arr
   */
  normalize(arr) {
    let max = getMax(arr);
    let min = getMin(arr);
    let diff = max - min;
    let normalized = [];
    arr.forEach(v => normalized.push((v / diff) * 2) - 1);
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
    const trees = new THREE.Group();
    trees.name = "trees";
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
      const mesh = new THREE.InstancedMesh(ModelManager.createGeometry(key), ModelManager.material(key), treeGeometries[key].length);
      for (let i = 0; i < treeGeometries[key].length; i++) {
        mesh.setMatrixAt(i, treeGeometries[key][i]);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      trees.add(mesh);
    });
    this.worldGroup.add(trees);
    return trees;
  }

  buildRegions() {
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
    this.foodGroup = new THREE.Group();
    for (let z = 0; z < this.tiles; z++) {
      for (let x = 0; x < this.tiles; x++) {
        if (Math.random() > density || this.isWater(x, z) || this.hasObstacle(x, z)) {
          continue;
        }
        this.getRegion(x, z).food[x + "_" + z] = true;
        let carrot = ModelManager.create("carrot");
        const pos = this.toScene(x, z);
        carrot.position.set(pos.x, -25, pos.z);
        carrot.scale.set(30, 30, 30);
        this.foodGroup.add(carrot);
      }
    }
    this.worldGroup.add(this.foodGroup);
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

  getAvailableFood(gridX, gridZ, maxGridDistance) {
    const region = this.getRegion(gridX, gridZ);
    if (!region) {
      if (this.isWater(gridX, gridZ) || this.hasObstacle(gridX, gridZ)) {
        // sometimes the bunny hops over a water or obstacle tile when searching for food.
        return [];
      }
      console.error("no region for ", gridX, gridZ);
      debugBox(this, gridX, gridZ, 0x00ff00);
      return false;
    }
    return region.getFood(this, gridX, gridZ, maxGridDistance);
  }

  hasFood(gridX, gridZ) {
    const region = this.getRegion(gridX, gridZ);
    if (!region) {
      if (this.isWater(gridX, gridZ) || this.hasObstacle(gridX, gridZ)) {
        // sometimes the bunny hops over a water or obstacle tile when searching for food.
        return false;
      }
      console.error("no region for ", gridX, gridZ);
      debugBox(this, gridX, gridZ, 0x00ff00);
      return false;
    }
    return region.food[gridX + "_" + gridZ];
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

  centerOnGrid(sceneX, sceneZ) {
    const grid = this.toGrid(sceneX, sceneZ);
    return this.toScene(grid.x, grid.y, "center");
  }

}
