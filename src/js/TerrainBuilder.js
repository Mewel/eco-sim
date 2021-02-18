import * as THREE from "three";
import {Water} from "three/examples/jsm/objects/Water2";

export class TerrainBuilder {

  static POSITION = {
    top: [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1],
    xPlus: [1, 0, 1, 1, 0, 0, 1, -1, 1, 1, -1, 0],
    xMinus: [0, 0, 0, 0, 0, 1, 0, -1, 0, 0, -1, 1],
    zPlus: [0, 0, 1, 1, 0, 1, 0, -1, 1, 1, -1, 1],
    zMinus: [1, 0, 0, 0, 0, 0, 1, -1, 0, 0, -1, 0]
  };

  static NORMALS = {
    top: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    xPlus: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    xMinus: [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0],
    zPlus: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    zMinus: [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]
  }

  static INDEX = [0, 2, 1, 2, 3, 1];

  terrain(tiles, tileSize, heightData) {
    const uvSize = 1 / tiles;
    const info = {
      tileSize: tileSize,
      halfTileSize: tileSize / 2,
      scaleTexture: 1,
      uvSize: uvSize,
      uvOffset: uvSize / 3,
      indexCounter: 0,
    }
    const data = {
      vertices: [],
      uv: [],
      normals: [],
      index: []
    }

    for (let i = 0; i < heightData.length; i++) {
      info.tile = this.getTile(i, tiles, heightData);
      info.uv = [info.tile[0] / tiles, info.tile[2] / tiles];

      const xPlus = (heightData[i + 1] < 0 ? -1 : 1);
      const xMinus = (heightData[i - 1] < 0 ? -1 : 1);
      const zPlus = (heightData[i + tiles] < 0 ? -1 : 1);
      const zMinus = (heightData[i - tiles] < 0 ? -1 : 1);

      this.applyData(i, info, data, "top");
      if (info.tile[0] === tiles - 1 || info.tile[1] > xPlus) {
        this.applyData(i, info, data, "xPlus");
      }
      if (info.tile[0] === 0 || info.tile[1] > xMinus) {
        this.applyData(i, info, data, "xMinus");
      }
      if (info.tile[2] === tiles - 1 || info.tile[1] > zPlus) {
        this.applyData(i, info, data, "zPlus");
      }
      if (info.tile[2] === 0 || info.tile[1] > zMinus) {
        this.applyData(i, info, data, "zMinus");
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(data.vertices), 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(Float32Array.from(data.uv), 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Float32Array.from(data.normals), 3));
    geometry.index = new THREE.Uint32BufferAttribute(Uint32Array.from(data.index), 1);
    geometry.computeBoundingSphere();

    const texture = this.generateTexture(tiles, heightData, info.scaleTexture);
    const terrain = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({map: texture}));
    terrain.receiveShadow = true;

    return terrain;
  }

  applyData(i, info, data, direction) {
    const offset = [info.tile[0] * info.tileSize, (info.tile[1] * info.halfTileSize) - info.halfTileSize, info.tile[2] * info.tileSize];
    TerrainBuilder.POSITION[direction].map((v, j) => {
      return offset[j % 3] + v * info.tileSize;
    }).forEach(v => data.vertices.push(v));
    this.getUV(info).forEach(v => data.uv.push(v));
    TerrainBuilder.NORMALS[direction].forEach(v => data.normals.push(v));
    TerrainBuilder.INDEX.map(v => v + info.indexCounter * 4).forEach(v => data.index.push(v));
    info.indexCounter++;
  }

  getUV(info) {
    const u = info.uv[0];
    const v = info.uv[1];
    return [
      u + info.uvOffset, v + info.uvOffset,
      u + info.uvSize - info.uvOffset, v + info.uvOffset,
      u + info.uvOffset, v + info.uvSize - info.uvOffset,
      u + info.uvSize - info.uvOffset, v + info.uvSize - info.uvOffset
    ];
  }

  getTile(i, tiles, heightData) {
    return [i % tiles, (heightData[i] < 0 ? -1 : 1), Math.floor(i / tiles)];
  }

  generateTexture(tiles, heightData, scale) {
    const size = tiles * tiles;
    const imageData = new Uint8Array(3 * size);

    let shoreWater = new THREE.Color(0x86DAFF);
    let water = new THREE.Color(0x1695CD);

    let beach = new THREE.Color(0xFFF580);
    let gras = new THREE.Color(0x65D95A);
    let darkGras = new THREE.Color(0x39BF2C);

    for (let z = 0; z < tiles; z++) {
      for (let x = 0; x < tiles; x++) {
        let i = z * tiles + x;
        if (heightData[i] < 0) {
          let shoreToWater = water.clone().lerp(shoreWater, smoothstep(.6, 1, heightData[i] + 1));
          imageData[i * 3] = shoreToWater.r * 255;
          imageData[i * 3 + 1] = shoreToWater.g * 255;
          imageData[i * 3 + 2] = shoreToWater.b * 255;
        } else {
          let beachToGras = beach.clone().lerp(gras, smoothstep(0, 0.3, heightData[i]));
          let grasToDark = beachToGras.lerp(darkGras, heightData[i]);
          imageData[i * 3] = grasToDark.r * 255;
          imageData[i * 3 + 1] = grasToDark.g * 255;
          imageData[i * 3 + 2] = grasToDark.b * 255;
        }
      }
    }
    const scaledImageData = scale !== 1 ? this.scaleData(imageData, tiles, scale) : imageData;
    const texture = new THREE.DataTexture(scaledImageData, tiles * scale, tiles * scale, THREE.RGBFormat);
    texture.needsUpdate = true;
    return texture;

    function smoothstep(min, max, value) {
      let x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }
  }

  scaleData(imageData, tiles, scale) {
    const scaled = new Uint8Array(imageData.length * scale * scale);
    for (let z = 0; z < tiles * scale; z++) {
      for (let x = 0; x < tiles * scale; x++) {
        const oldZ = Math.floor(z / scale);
        const oldX = Math.floor(x / scale);
        const oldI = oldX + oldZ * tiles;
        const newI = x + z * tiles * scale;
        scaled[newI * 3] = imageData[oldI * 3];
        scaled[newI * 3 + 1] = imageData[oldI * 3 + 1];
        scaled[newI * 3 + 2] = imageData[oldI * 3 + 2];
      }
    }
    return scaled;
  }

  createWater(tiles, tileSize) {
    const size = tiles * tileSize;
    const waterGeometry = new THREE.PlaneBufferGeometry(size, size);
    const water = new Water(waterGeometry, {
      color: '#ffffff',
      scale: 5,
      flowDirection: new THREE.Vector2(.2, .2),
      textureWidth: 512,
      textureHeight: 512,
      clipBias: 0.1
    });
    water.position.x = size / 2;
    water.position.z = size / 2;
    water.position.y = -4;
    water.rotation.x = Math.PI * -0.5;
    return water;
  }

}