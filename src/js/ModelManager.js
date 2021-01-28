import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

const ModelManager = {

  model: {},
  animation: {},
  readyFlag: false,
  resolveAwaiters: [],

  init() {
    const scope = this;
    const loadingManager = new THREE.LoadingManager();
    return Promise.all([
      this.loadTrees(loadingManager),
      this.loadRabbit(loadingManager)
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

  loadRabbit(loadingManager) {
    return new Promise((resolve) => {
      const scope = this;
      const loader = new GLTFLoader(loadingManager);
      loader.load("models/rabbit.glb", function (gltf) {
        scope.model["rabbit"] = gltf.scene.children[0];
        scope.animation["rabbit"] = gltf.animations;
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


  applyBottomCenter(mesh) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.center();
    mesh.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, mesh.geometry.boundingBox.min.y * -1, 0));
  },

  create(modelName) {
    return this.model[modelName].clone();
  },

  createGeometry(modelName) {
    return this.model[modelName].geometry.clone();
  },

  material(modelName) {
    return this.model[modelName].material;
  },

  getClip(modelName, clipName) {
    return THREE.AnimationClip.findByName(this.animation[modelName], clipName);
  }

}

export {ModelManager};


/*
 // direct loading works - with animation. not sure why
   const loader = new FBXLoader();
   loader.load('models/fuchs.fbx', function (object) {
     object.traverse(function (child) {
       if (child.isMesh) {
         child.castShadow = true;
         //child.receiveShadow = true;
       }
     });
     scene.add(object);
   });

 // this does not work. not sure why. animation is not playing
 loadFox(loadingManager) {
   return new Promise((resolve) => {
     const scope = this;
     const loader = new FBXLoader(loadingManager);
     loader.load('models/fuchs.fbx', function (object) {
       object.traverse(function (child) {
         if (child.isMesh) {
           child.castShadow = true;
           //child.receiveShadow = true;
         }
       });
       scope.model["fox"] = object;
       scope.animation["fox"] = object.animations;
       resolve();
     });
   });
 },

 // fox
 let object = ModelManager.create("fox");
 mixer = new THREE.AnimationMixer(object);
 let clip = ModelManager.getClip("fox", "rig|Laufen");
 const action = mixer.clipAction(clip);
 action.play();
 scene.add(object);
 */

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