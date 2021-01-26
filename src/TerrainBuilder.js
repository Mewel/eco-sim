import * as THREE from 'three';
import {Water} from 'three/examples/jsm/objects/Water2';
import {TerrainMaterial} from "./TerrainMaterial";

export class TerrainBuilder {

  createGround(size, heightData) {
    const textureLoader = new THREE.TextureLoader();
    const rockTexture = textureLoader.load('textures/rocks/color.jpg');
    rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping;
    const sandTexture = textureLoader.load('textures/sand/color.jpg');
    sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
    const grassTexture = textureLoader.load('textures/gras/color.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;

    let terrainMaterial = new TerrainMaterial();
    terrainMaterial.terrain.push({
      value: rockTexture,
      blend: [-30., 0., -2., -1.],
      scale: 20.0
    });
    terrainMaterial.terrain.push({
      value: sandTexture,
      blend: [-2., -1., -.5, .5],
      scale: 2.0
    });
    terrainMaterial.terrain.push({
      value: grassTexture,
      blend: [-.5, .5],
      scale: 20.0
    });
    const geometry = this.createTerrainGeometry(size, heightData);
    let mesh = new THREE.Mesh(geometry, terrainMaterial);
    mesh.receiveShadow = true;
    return mesh;
  }

  createTerrainGeometry(size, heightData) {
    const segments = Math.sqrt(heightData.length);
    const geometry = new THREE.PlaneBufferGeometry(size, size, segments -1, segments -1);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 1] = heightData[i / 3];
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  inverseSubdivision(heightData, times) {
    const sub = [];
    const segments = Math.sqrt(heightData.length) / 2;
    for (let y = 0; y < segments; y++) {
      for (let x = 0; x < segments; x++) {
        const p1 = heightData[(2 * x) + (4 * y * segments)];
        const p2 = heightData[(2 * x) + (4 * y * segments) + 1];
        const p3 = heightData[(2 * x) + (4 * y * segments) + (segments * 2)];
        const p4 = heightData[(2 * x) + (4 * y * segments) + (segments * 2) + 1];
        sub.push((p1 + p2 + p3 + p4) / 4);
      }
    }
    return times > 1 ? this.inverseSubdivision(sub, times - 1) : sub;
  }

  createSubDivTerrain(size, heightData, times) {
    const newHeightData = this.inverseSubdivision(heightData, times);
    const geometry = this.createTerrainGeometry(size, newHeightData);
    geometry.computeVertexNormals();
    let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0xff0000}));
    mesh.receiveShadow = true;
    return mesh;
  }

  createWater(size) {
    const waterGeometry = new THREE.PlaneBufferGeometry(size, size);
    const water = new Water(waterGeometry, {
      color: '#ffffff',
      scale: 5,
      flowDirection: new THREE.Vector2(.2, .2),
      textureWidth: 512,
      textureHeight: 512,
      clipBias: 0.1
    });
    water.position.y = 0;
    water.rotation.x = Math.PI * -0.5;
    return water;
  }

}



