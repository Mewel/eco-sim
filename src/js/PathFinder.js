import {js} from "easystarjs";
import * as THREE from "three";

const PathFinder = {

  init(world) {
    this.world = world;
    this.buildTerrainGrid();
    this.easyStar = new js();
    this.easyStar.setAcceptableTiles([0]);
    this.easyStar.enableDiagonals();
    this.easyStar.enableCornerCutting();
    this.easyStar.enableSync();
    this.updateGrid();
  },

  find(fromX, fromZ, toX, toZ, onCreated = null) {
    return new Promise((resolve, reject) => {
      const id = this.easyStar.findPath(fromX, fromZ, toX, toZ, (path) => {
        if (path === null) {
          reject("no path found")
        } else {
          resolve(path);
        }
      });
      if (id && onCreated) {
        onCreated(id);
      }
    });
  },

  getCurve(fromGridX, fromGridZ, toGridX, toGridZ, onCreated = null) {
    return this.find(fromGridX, fromGridZ, toGridX, toGridZ, onCreated).then(path => {
      let curvePoints = [this.world.toSceneVector3(fromGridX, fromGridZ)];
      for (let i = 1; i < path.length - 1; i++) {
        curvePoints.push(this.world.toSceneVector3(path[i].x, path[i].y));
      }
      curvePoints.push(this.world.toSceneVector3(toGridX, toGridZ));
      return new THREE.CatmullRomCurve3(curvePoints);
    });
  },

  getGrid() {
    const grid = [];
    for (let z = 0; z < this.world.tiles; z++) {
      const row = [];
      grid.push(row);
      for (let x = 0; x < this.world.tiles; x++) {
        const terrainValue = (this.terrainGrid[z] && this.terrainGrid[z][x]) ? this.terrainGrid[z][x] : 0;
        const obstacleValue = this.world.hasObstacle(x, z) ? 2 : 0;
        row.push(terrainValue + obstacleValue);
      }
    }
    return grid;
  },

  buildTerrainGrid() {
    this.terrainGrid = [];
    for (let z = 0; z < this.world.tiles; z++) {
      const row = [];
      this.terrainGrid.push(row);
      for (let x = 0; x < this.world.tiles; x++) {
        row.push(this.world.isWater(x, z) ? 1 : 0);
      }
    }
    return this;
  },

  updateGrid() {
    this.easyStar.setGrid(this.getGrid());
  },

  update() {
    this.easyStar.calculate();
  }

}

export {PathFinder}
