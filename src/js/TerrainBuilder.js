import * as THREE from "three";
import {BufferGeometryUtils} from 'three/examples/jsm/utils/BufferGeometryUtils';
import {Water} from "three/examples/jsm/objects/Water2";

export class TerrainBuilder {

  terrain(tiles, tileSize, heightData) {
    const geometries = [];
    const matrix = new THREE.Matrix4();
    const halfTileSize = tileSize / 2;

    const scaleTexture = 1;
    const uvSize = 1 / tiles;
    const uvOffset = uvSize / 3;

    for (let i = 0; i < heightData.length; i++) {
      let grid = this.grid(i, tiles, heightData);
      const sceneY = (grid.y * halfTileSize) - halfTileSize;

      const u = grid.x / tiles;
      const v = grid.z / tiles;

      const pyGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
      this.applyUV(pyGeometry, u, v, uvSize, uvOffset);
      pyGeometry.rotateX(-Math.PI / 2);
      pyGeometry.translate(0, 0, 0);
      matrix.makeTranslation(halfTileSize + grid.x * tileSize, sceneY, halfTileSize + grid.z * tileSize);
      geometries.push(pyGeometry.clone().applyMatrix4(matrix));

      const xPlus1 = this.grid(i + 1, tiles, heightData);
      const xMinus1 = this.grid(i - 1, tiles, heightData);
      const zPlus1 = this.grid(i + tiles, tiles, heightData);
      const zMinus1 = this.grid(i - tiles, tiles, heightData);

      if (grid.x === tiles - 1 || grid.y > xPlus1.y) {
        const pxGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
        this.applyUV(pxGeometry, u, v, uvSize, uvOffset);
        pxGeometry.rotateY(Math.PI / 2);
        pxGeometry.translate(halfTileSize, -halfTileSize, 0);
        matrix.makeTranslation(halfTileSize + grid.x * tileSize, sceneY, halfTileSize + grid.z * tileSize);
        geometries.push(pxGeometry.clone().applyMatrix4(matrix));
      }

      if (grid.x === 0 || grid.y > xMinus1.y) {
        const nxGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
        this.applyUV(nxGeometry, u, v, uvSize, uvOffset);
        nxGeometry.rotateY(-Math.PI / 2);
        nxGeometry.translate(-halfTileSize, -halfTileSize, 0);
        matrix.makeTranslation(halfTileSize + grid.x * tileSize, sceneY, halfTileSize + grid.z * tileSize);
        geometries.push(nxGeometry.clone().applyMatrix4(matrix));
      }

      if (grid.z === tiles - 1 || grid.y > zPlus1.y) {
        const pzGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
        this.applyUV(pzGeometry, u, v, uvSize, uvOffset);
        pzGeometry.translate(0, -halfTileSize, halfTileSize);
        matrix.makeTranslation(halfTileSize + grid.x * tileSize, sceneY, halfTileSize + grid.z * tileSize);
        geometries.push(pzGeometry.clone().applyMatrix4(matrix));
      }

      if (grid.z === 0 || grid.y > zMinus1.y) {
        const nzGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
        this.applyUV(nzGeometry, u, v, uvSize, uvOffset);
        nzGeometry.rotateY(-Math.PI);
        nzGeometry.translate(0, -halfTileSize, -halfTileSize);
        matrix.makeTranslation(halfTileSize + grid.x * tileSize, sceneY, halfTileSize + grid.z * tileSize);
        geometries.push(nzGeometry.clone().applyMatrix4(matrix));
      }
    }
    const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    geometry.computeBoundingSphere();
    geometry.normalizeNormals();

    const texture = this.generateTexture(tiles, heightData, scaleTexture);
    const terrain = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({map: texture}));
    terrain.receiveShadow = true;
    return terrain;
  }

  grid(i, tiles, heightData) {
    return new THREE.Vector3(i % tiles, (heightData[i] < 0 ? -1 : 1), Math.floor(i / tiles));
  }

  applyUV(geometry, u, v, uvSize, uvOffset) {
    geometry.attributes.uv.array[0] = u + uvOffset;
    geometry.attributes.uv.array[1] = v + uvOffset;
    geometry.attributes.uv.array[2] = u + uvSize - uvOffset;
    geometry.attributes.uv.array[3] = v + uvOffset;
    geometry.attributes.uv.array[4] = u + uvOffset;
    geometry.attributes.uv.array[5] = v + uvSize - uvOffset;
    geometry.attributes.uv.array[6] = u + uvSize - uvOffset;
    geometry.attributes.uv.array[7] = v + uvSize - uvOffset;
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
          let grasToDark = beachToGras.lerp(darkGras,  heightData[i]);
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