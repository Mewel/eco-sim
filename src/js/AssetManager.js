import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

const AssetManager = {

  model: {},
  animation: {},
  audioBuffer: {},
  readyFlag: false,
  resolveAwaiters: [],

  init() {
    const scope = this;
    const loadingManager = new THREE.LoadingManager();
    return Promise.all([
      this.loadTrees(loadingManager),
      this.loadGLB("bunny_male", loadingManager),
      this.loadGLB("bunny_female", loadingManager),
      this.loadGLB("carrot", loadingManager),
      this.loadAudio("water.mp3", loadingManager)
    ]).then(() => {
      scope.readyFlag = true;
      scope.resolveAwaiters.forEach(resolve => resolve());
    });
  },

  ready() {
    const scope = this;
    return new Promise((resolve) => {
      if (scope.readyFlag) {
        resolve();
      } else {
        scope.resolveAwaiters.push(resolve);
      }
    });
  },

  loadGLB(name, loadingManager) {
    return new Promise((resolve) => {
      const scope = this;
      const loader = new GLTFLoader(loadingManager);
      loader.load("models/" + name + ".glb", function (gltf) {
        scope.model[name] = gltf.scene.children[0];
        scope.animation[name] = gltf.animations;
        resolve();
      });
    });
  },

  loadTrees(loadingManager) {
    return new Promise((resolve) => {
      const scope = this;
      const loader = new GLTFLoader(loadingManager);
      loader.load("models/tree.glb", function (gltf) {
        gltf.scene.children.forEach(tree => {
          scope.model[tree.name] = tree;
        });
        resolve();
      });
    });
  },

  loadAudio(name, loadingManager) {
    return new Promise((resolve) => {
      const scope = this;
      const loader = new THREE.AudioLoader(loadingManager);
      loader.load("audio/" + name, function (buffer) {
        scope.audioBuffer[name] = buffer;
        resolve();
      });
    });
  },

  applyBottomCenter(mesh) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.center();
    mesh.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, mesh.geometry.boundingBox.min.y * -1, 0));
  },

  create(modelName) {
    return this.model[modelName].clone();
  },

  geometry(modelName) {
    return this.model[modelName].geometry.clone();
  },

  material(modelName) {
    return this.model[modelName].material;
  },

  clip(modelName, clipName) {
    return THREE.AnimationClip.findByName(this.animation[modelName], clipName);
  },

  audio(name, listener) {
    const audio = new THREE.Audio(listener);
    audio.setBuffer(this.audioBuffer[name]);
    return audio;
  }

}

export {AssetManager};


/*
  loadTrees_old(loadingManager, textureLoader) {
    return new Promise((resolve) => {
      const nameArr = ["tree_1", "tree_2", "tree_3", "tree_4", "tree_5", "tree_6", "tree_7", "tree_8", "tree_9",
        "tree_10", "tree_11", "tree_12", "rock"];
      const textureArr = ["_1_tree", "_2_tree", "_3_tree", "_4_tree", "_5_tree", "_6_tree", "_7_tree", "_10_tree",
        "_11_tree", "_12_tree", "_8_tree", "_9_tree", "Rock_1_"];

      const scope = this;
      new MTLLoader(loadingManager)
        .setPath('models/tree/')
        .load('tree.mtl', function (materials) {
          materials.preload();

          new OBJLoader(loadingManager)
            .setMaterials(materials)
            .setPath('models/tree/')
            .load('tree.obj', function (object) {
              object.castShadow = true;
              for (let i = 0; i < object.children.length; i++) {
                object.children[i].material.map = textureLoader.load("models/tree/" + textureArr[i] + ".png");
                object.children[i].material.color.setHex(0xffffff);
                object.children[i].castShadow = true;
                scope.applyBottomCenter(object.children[i]);
                scope.model[nameArr[i]] = object.children[i];
              }
              resolve();
            });
        });
    });
  },
*/
