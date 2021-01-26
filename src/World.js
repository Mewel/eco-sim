import * as THREE from 'three';
import {noise} from "./util/perlin";
import {TerrainBuilder} from "./TerrainBuilder";
import {ModelManager} from "./ModelManager";
import {getRandomArbitrary, getRandomInt} from "./util/util";

export class World {

  constructor(tiles, tileSize) {
    const scope = this;
    this.tiles = tiles;
    this.tileSize = tileSize;
    this.worldGroup = new THREE.Group();

    this.heightData = this.generateHeight(tiles, tiles, tileSize);

    const terrainBuilder = new TerrainBuilder();
    this.terrainMesh = terrainBuilder.createGround(tiles * tileSize, this.heightData);
    this.worldGroup.add(this.terrainMesh);
    this.worldGroup.add(terrainBuilder.createWater(tiles * tileSize));
  }

  generateTrees(modelNames, density) {
    const trees = new THREE.Group();
    trees.name = "trees";
    // treeNamesArray
    const treeGeometries = {};
    modelNames.forEach(tree => treeGeometries[tree] = []);
    const vertices = this.terrainMesh.geometry.attributes.position.array;

    let j = 0;
    for (let i = 0; i < vertices.length; i += 3) {
      if (vertices[i + 1] > 0 && Math.random() > 1 - density) {
        const x = getRandomArbitrary(-5, 5);
        const z = getRandomArbitrary(-5, 5);
        const y = this.getHeight(vertices[i] + x, vertices[i + 2] + z);

        const key = modelNames[getRandomInt(0, modelNames.length)];

        // Instanced
        let scale = 15;
        let yScale = getRandomArbitrary(-3, 3);
        let scaleMatrix = new THREE.Matrix4();
        scaleMatrix.set(scale,
          0, 0, vertices[i] + x,
          0, scale + yScale, 0, y,
          0, 0, scale, vertices[i + 2] + z,
          0, 0, 0, 1);
        let rotateMatrix = new THREE.Matrix4();
        rotateMatrix.makeRotationY(getRandomArbitrary(0, 2 * Math.PI));
        let resultMatrix = new THREE.Matrix4();
        treeGeometries[key].push(resultMatrix.multiply(scaleMatrix, rotateMatrix));

        // merged
        //const geometry = ModelManager.createGeometry(tree);
        //geometry.scale(20, 20, 20);
        //geometry.translate(vertices[i] + x, vertices[i + 1], vertices[i + 2] + z);
        //treeGeometries[key].push(geometry);

        // naive
        /*const model = ModelManager.create(tree);
        model.scale.set(20, 20, 20);
        model.position.set(vertices[i] + x, vertices[i + 1], vertices[i + 2] + z);
        model.castShadow = false;
        scene.add(model);*/
        j++;
      }
    }
    console.log("trees generated: ", j);
    // instantiated
    Object.keys(treeGeometries).forEach(key => {
      const mesh = new THREE.InstancedMesh(ModelManager.createGeometry(key), ModelManager.material(key), treeGeometries[key].length);
      for (let i = 0; i < treeGeometries[key].length; i++) {
        mesh.setMatrixAt(i, treeGeometries[key][i]);
      }
      mesh.castShadow = true;
      trees.add(mesh);
    });
    this.worldGroup.add(trees);
    // merged
    //const buffer = BufferGeometryUtils.mergeBufferGeometries(treeGeometries);
    //const forestMesh = new THREE.Mesh(buffer, ModelManager.material("tree_1"));
    //scene.add(forestMesh);

    return trees;
  }

  getTreeMatrixArray() {
    const arr = [];
    const trees = this.worldGroup.getObjectByName("trees");
    for(let i = 0; i < trees.children.length; i++) {
      const instancedMesh = trees.children[i];
      for (let j = 0; j < instancedMesh.count; j++) {
        let matrix = new THREE.Matrix4();
        instancedMesh.getMatrixAt(j, matrix)
        arr.push(matrix);
      }
    }
    return arr;
  }

  debugTrees(scene) {
    this.getTreeMatrixArray().forEach(matrix => {
      let position = new THREE.Vector3(matrix.elements[12],matrix.elements[13],  matrix.elements[14]);
      const geometry = new THREE.BoxGeometry(20, 20, 20);
      const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
      const cube = new THREE.Mesh(geometry, material);
      cube.position.copy(position);
      scene.add(cube);
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
        const maxHeight = Math.min(amplify, 1) + (Math.abs(cN) * 25);
        data[x + y * height] = maxHeight;
      }
    }
    return data;

    function smoothstep(min, max, value) {
      let x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }
  }

  /**
   * Returns the height of the terrain at the given point.
   *
   * @param sceneX
   * @param sceneZ
   * @returns {null|number}
   */
  getHeight(sceneX, sceneZ) {
    const size = this.tiles * this.tileSize;
    const worldX = sceneX + size / 2; // 0 - 4000
    const worldZ = sceneZ + size / 2; // 0 - 4000
    if (worldX < 0 || worldZ < 0 || worldX > size || worldZ > size) {
      return null;
    }
    const segmentSize = size / (this.tiles - 1);

    const tile = new THREE.Vector2(worldX / segmentSize, worldZ / segmentSize); // 0 - 200
    const p1 = new THREE.Vector2(Math.floor(tile.x), Math.floor(tile.y));
    const p2 = new THREE.Vector2(Math.ceil(tile.x), Math.floor(tile.y));
    const p3 = new THREE.Vector2(Math.ceil(tile.x), Math.ceil(tile.y));
    const p4 = new THREE.Vector2(Math.floor(tile.x), Math.ceil(tile.y));

    const a1 = new THREE.Vector2((1 - Math.abs(p1.x - tile.x)), (1 - Math.abs(p1.y - tile.y)));
    const a2 = new THREE.Vector2((1 - Math.abs(p2.x - tile.x)), (1 - Math.abs(p2.y - tile.y)));
    const a3 = new THREE.Vector2((1 - Math.abs(p3.x - tile.x)), (1 - Math.abs(p3.y - tile.y)));
    const a4 = new THREE.Vector2((1 - Math.abs(p4.x - tile.x)), (1 - Math.abs(p4.y - tile.y)));

    const v1 = this.heightData[p1.x + p1.y * this.tiles] * ((a1.x + a1.y) / 4);
    const v2 = this.heightData[p2.x + p2.y * this.tiles] * ((a2.x + a2.y) / 4);
    const v3 = this.heightData[p3.x + p3.y * this.tiles] * ((a3.x + a3.y) / 4);
    const v4 = this.heightData[p4.x + p4.y * this.tiles] * ((a4.x + a4.y) / 4);

    return v1 + v2 + v3 + v4;
  }

}
