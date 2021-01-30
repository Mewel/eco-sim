import {js} from "easystarjs";
import * as THREE from "three";

export class PathFinder {

  /**
   * Creates a new pathfinder
   *
   * @param world the world object
   */
  constructor(world) {
    this.world = world;

    this.buildTerrainGrid();

    this.easyStar = new js();
    this.easyStar.setAcceptableTiles([0]);
    this.easyStar.enableDiagonals();
    this.easyStar.enableCornerCutting();
    this.updateGrid();
  }

  find(fromX, fromZ, toX, toZ) {
    return new Promise((resolve, reject) => {
      this.easyStar.findPath(fromX, fromZ, toX, toZ, (path) => {
        if (path === null) {
          reject("no path found")
        } else {
          resolve(path);
        }
      });
    });
  }

  getCurve(fromGridX, fromGridZ, toGridX, toGridZ) {
    return this.find(fromGridX, fromGridZ, toGridX, toGridZ).then(path => {
      let curvePoints = [this.world.toScene(fromGridX, fromGridZ)];

      for (let i = 1; i < path.length - 1; i++) {
        curvePoints.push(this.world.toScene(path[i].x, path[i].y));
      }
      /* TODO optimize curve
      let last = new THREE.Vector2(fromGridX, fromGridZ);
      let lastDirection = null;
      for (let i = 1; i < path.length - 1; i++) {
        const newDirection = last ? new THREE.Vector2(path[i].x, path[i].y).sub(last) : null;
        if (!lastDirection || !lastDirection.equals(newDirection)) {
          curvePoints.push(this.world.toScene(path[i].x, path[i].y));
        }
        if (last) {
          lastDirection = newDirection;
        }
        last = new THREE.Vector2(path[i].x, path[i].y);
      }
      */

      curvePoints.push(this.world.toScene(toGridX, toGridZ));
      return new THREE.CatmullRomCurve3(curvePoints);
    });
  }

  getGrid() {
    const grid = [];
    for (let z = 0; z < this.world.tiles; z++) {
      let row = [];
      grid.push(row);
      for (let x = 0; x < this.world.tiles; x++) {
        const terrainValue = (this.terrainGrid[z] && this.terrainGrid[z][x]) ? this.terrainGrid[z][x] : 0;
        const obstacleValue = this.world.hasObstacle(x, z) ? 2 : 0;
        row.push(terrainValue + obstacleValue);
      }
    }
    return grid;
  }

  buildTerrainGrid() {
    this.terrainGrid = [];
    for (let z = 0; z < this.world.tiles; z++) {
      let row = [];
      this.terrainGrid.push(row);
      for (let x = 0; x < this.world.tiles; x++) {
        row.push(this.world.isWater(x, z) ? 1 : 0);
      }
    }
    return this;
  }

  updateGrid() {
    this.easyStar.setGrid(this.getGrid());
  }

  update() {
    this.easyStar.calculate();
  }

}