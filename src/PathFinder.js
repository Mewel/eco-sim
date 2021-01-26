import {js} from "easystarjs";
import * as THREE from "three";

export class PathFinder {

  /**
   * Creates a new pathfinder
   *
   * @param world the world object
   * @param resolution the grid resolution. Power of 2. 1 == resolution of the world's height array.
   */
  constructor(world, resolution) {
    this.world = world;
    this.resolution = resolution;

    this.mapSize = this.world.tiles * this.world.tileSize;
    this.mapHalfSize = this.mapSize / 2;
    this.tiles = this.world.tiles * this.resolution;
    this.tileSize = this.world.tileSize / this.resolution;

    this.buildTerrainGrid();
    this.obstaclesGrid = [];

    this.easyStar = new js();
    this.easyStar.setAcceptableTiles([0]);
    this.easyStar.enableDiagonals();
    this.easyStar.enableCornerCutting();
    this.updateGrid();
  }

  find(fromX, fromZ, toX, toZ) {
    return new Promise((resolve, reject) => {
      this.easyStar.findPath(...this.toGrid(fromX, fromZ), ...this.toGrid(toX, toZ), (path) => {
        if (path === null) {
          reject("no path found")
        } else {
          resolve(path);
        }
      });
    });
  }

  getCurve(fromX, fromZ, toX, toZ) {
    return this.find(fromX, fromZ, toX, toZ).then(path => {
      let curvePoints = [new THREE.Vector3(fromX, this.world.getHeight(fromX, fromZ), fromZ)];
      let pathDistance = 1;//3 * this.resolution;
      let last = null;
      let lastDirection = null;
      for (let i = pathDistance; i < path.length - 1; i += pathDistance) {
        const newDirection = last ? new THREE.Vector2(path[i].x, path[i].y).sub(last) : null;
        if (!lastDirection || !lastDirection.equals(newDirection)) {
          curvePoints.push(this.toScene(path[i].x, path[i].y));
        }
        if (last) {
          lastDirection = newDirection;
        }
        last = new THREE.Vector2(path[i].x, path[i].y);
      }
      curvePoints.push(new THREE.Vector3(toX, this.world.getHeight(toX, toZ), toZ));
      return new THREE.CatmullRomCurve3(curvePoints);
    });
  }

  getGrid() {
    const grid = [];
    for (let z = 0; z < this.tiles; z++) {
      let row = [];
      grid.push(row);
      for (let x = 0; x < this.tiles; x++) {
        const terrainValue = (this.terrainGrid[z] && this.terrainGrid[z][x]) ? this.terrainGrid[z][x] : 0;
        const obstacleValue = this.obstaclesGrid[x + "_" + z] ? 2 : 0;
        row.push(terrainValue + obstacleValue);
      }
    }
    return grid;
  }

  buildTerrainGrid() {
    this.terrainGrid = [];
    for (let z = 0; z < this.tiles; z++) {
      let row = [];
      this.terrainGrid.push(row);
      for (let x = 0; x < this.tiles; x++) {
        const sceneX = x * this.tileSize - this.mapHalfSize;
        const sceneZ = z * this.tileSize - this.mapHalfSize;
        row.push(this.world.getHeight(sceneX, sceneZ) < -5 ? 1 : 0);
      }
    }
    return this;
  }

  buildObstacleGrid(obstacles) {
    this.obstaclesGrid = {};
    const p = [-1, -1, 1, -1, -1, 1, 1, 1];
    for (let i = 0; i < obstacles.length; i++) {
      let obstacle = obstacles[i];
      const corners = []; // contains the 4 corners topLeft, topRight, bottomLeft & bottomRight
      for (let j = 0; j < p.length; j += 2) {
        let sceneX = obstacle.position.x + p[j] * obstacle.radius;
        let sceneZ = obstacle.position.z + p[j + 1] * obstacle.radius;
        corners.push(this.toGrid(sceneX, sceneZ));
      }
      for (let x = corners[0][0]; x < corners[3][0]; x++) {
        for (let z = corners[0][1]; z < corners[3][1]; z++) {
          this.obstaclesGrid[x + "_" + z] = true;
        }
      }
    }
    return this;
  }

  updateGrid() {
    this.easyStar.setGrid(this.getGrid());
  }

  toGrid(sceneX, sceneZ) {
    return [
      Math.ceil((sceneX + this.mapHalfSize) / this.tileSize),
      Math.ceil((sceneZ + this.mapHalfSize) / this.tileSize),
    ];
  }

  toScene(gridX, gridY) {
    const halfTiles = this.tiles / 2;
    const sceneX = (gridX - halfTiles) * this.tileSize;
    const sceneZ = (gridY - halfTiles) * this.tileSize;
    return new THREE.Vector3(sceneX, this.world.getHeight(sceneX, sceneZ), sceneZ);
  }

  update() {
    this.easyStar.calculate();
  }

  debug(scene) {
    const grid = this.getGrid();
    const size = this.tiles * this.tiles;
    const imageData = new Uint8Array(4 * size);
    for (let z = 0; z < this.tiles; z++) {
      for (let x = 0; x < this.tiles; x++) {
        let i = z * this.tiles + x;
        if (grid[z][x] === 0) {
          imageData[i * 4] = 255;
          imageData[i * 4 + 1] = 255;
          imageData[i * 4 + 2] = 255;
          imageData[i * 4 + 3] = 80;
        }
      }
    }
    const texture = new THREE.DataTexture(imageData, this.tiles, this.tiles, THREE.RGBAFormat);
    texture.needsUpdate = true;
    let shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: `
      varying vec2 vUV;
      void main() {
        vUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix  * vec4(position, 1.);
      }
    `,
      fragmentShader: `
      uniform sampler2D imageData;
      varying vec2 vUV;
      void main() {
        gl_FragColor = texture(imageData, vec2(vUV.x, 1. - vUV.y));
      }`,
      uniforms: {
        "imageData": {type: "t", value: texture}
      },
      transparent: true
    });
    let planeG = new THREE.PlaneBufferGeometry(this.tiles * this.tileSize, this.tiles * this.tileSize, 1, 1);
    planeG.rotateX(-Math.PI / 2);
    let plane = new THREE.Mesh(planeG, shaderMaterial);
    plane.position.y = 10;
    scene.add(plane);
  }

}