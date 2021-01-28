// styles
import './../css/app.css';

// js imports
import * as THREE from 'three';

import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {MapControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ModelManager} from "./ModelManager";
import {World} from "./World";
import {Bunny3D} from "./Bunny3D";
import {PathFinder} from "./PathFinder";
import {getRandomInt} from "./util/util";
import Config from './config';

import {CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer";
import {BunnyInfo} from "./BunnyInfo";
import {Bunny} from "./model/Bunny";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";

// Check environment and set the Config helper
if (__ENV__ === 'dev') {
  console.log('----- RUNNING IN DEV ENVIRONMENT! -----');
  Config.isDev = true;
}

let camera, controls, scene, renderer, clock, mixers, world, pathFinder, labelRenderer;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let bunny, bunnyInfo;
const bunnys = [];

let mixer, foxWalk, foxIdle;

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('keyup', onKeyUp);

init();

function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  //scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(500, 500, 500);

  // renderer
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // label renderer
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  document.body.appendChild(labelRenderer.domElement);

  // light
  const light = new THREE.AmbientLight(0x888888); // soft white light
  scene.add(light);
  const dirLight = new THREE.DirectionalLight(0x777777);
  dirLight.position.set(500, 1000, -500);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 10000;
  dirLight.shadow.camera.right = 2000;
  dirLight.shadow.camera.left = -2000;
  dirLight.shadow.camera.top = 2000;
  dirLight.shadow.camera.bottom = -2000;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  // controls
  controls = new MapControls(camera, document.body);
  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = .08;
  controls.minDistance = 50;
  controls.maxDistance = 5000;
  controls.maxPolarAngle = Math.PI / 2;
  controls.keys = {LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83};
  controls.keyPanSpeed = 20;

  // animation
  clock = new THREE.Clock();
  mixers = [];

  // world
  let tiles = 200;
  let tileSize = 20;

  world = new World(tiles, tileSize);
  scene.add(world.worldGroup);

  // const axesHelper = new THREE.AxesHelper(2000);
  // scene.add(axesHelper);

  // pathfinder
  pathFinder = new PathFinder(world, 2);

  //
  let b = new Bunny();
  b.tick();
  b.think();

  ModelManager.init().then(() => {
    // world
    world.generateTrees(["tree_1", "tree_3"], .05);
    const obstacles = [];
    world.getTreeMatrixArray().forEach(matrix => {
      let position = new THREE.Vector3(matrix.elements[12], matrix.elements[13], matrix.elements[14]);
      obstacles.push({position, radius: 10});
    });
    pathFinder.buildObstacleGrid(obstacles).updateGrid();
    // pathFinder.debug(scene);
    // world.debugTrees(scene);

    // bunny's
    bunny = new Bunny3D();
    let bunnySpawn = new THREE.Vector2(0, 0);
    while (world.getHeight(bunnySpawn.x, bunnySpawn.y) < 0) {
      bunnySpawn = new THREE.Vector2(getRandomInt(-2000, 2000), getRandomInt(-2000, 2000));
    }
    bunny.model.position.set(bunnySpawn.x, world.getHeight(bunnySpawn.x, bunnySpawn.y), bunnySpawn.z);
    scene.add(bunny.model);
    bunny.debugPath(scene);

    bunnyInfo = new BunnyInfo(bunny);

    // fox
    const loader = new FBXLoader();
    loader.load('models/fuchs.fbx', function (object) {
      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          //child.receiveShadow = true;
        }
      });
      scene.add(object);
      mixer = new THREE.AnimationMixer(object);
      foxWalk = mixer.clipAction(object.animations[0]);
      foxIdle = mixer.clipAction(object.animations[1]);
      foxIdle.play();
    });

    /*for (let i = 0; i < 500; i++) {
      const spawnX = getRandomArbitrary(-2000, 2000);
      const spawnZ = getRandomArbitrary(-2000, 2000);
      const spawnY = world.getHeight(spawnX, spawnZ);
      const targetX = getRandomArbitrary(-2000, 2000);
      const targetZ = getRandomArbitrary(-2000, 2000);
      const targetY = world.getHeight(targetX, targetZ);
      if (spawnY < 0 || targetY < 0) {
        continue;
      }
      let b = new Bunny();
      b.model.position.set(spawnX, spawnY, spawnZ);
      scene.add(b.model);
      bunnys.push(b);
      b.jumpTo(new THREE.Vector3(targetX, 0, targetZ), world, pathFinder);
    }*/

  });

  // misc
  window.addEventListener('resize', onWindowResize, false);

  const gui = new GUI();
  gui.add(controls, 'screenSpacePanning');
}

animate();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

// TODO: fix drag
function onPointerUp(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(world.terrainMesh);
  if (!intersects || intersects.length <= 0) {
    return;
  }
  const point = intersects[0].point;
  if (event.button === 2) {
    // teleport bunny on right mouse
    bunny.stop();
    bunny.model.position.set(point.x, world.getHeight(point.x, point.z), point.z);
    return;
  }
  bunny.jumpTo(point, world, pathFinder);
}

function onKeyUp(event) {
  let fade = .5;
  if (event.code === "Space") {
    if (foxWalk.isRunning()) {
      foxWalk.fadeOut(fade);
      foxIdle
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(fade)
        .play();
    } else {
      foxWalk
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(fade)
        .play();
      foxIdle.fadeOut(fade);
    }
  }
}

function animate() {
  const delta = clock.getDelta();
  requestAnimationFrame(animate);
  controls.update();
  stats.update();
  if (mixer) {
    mixer.update(delta);
  }
  if (bunny) {
    bunny.update();
  }
  if (bunnyInfo) {
    bunnyInfo.update();
  }
  pathFinder.update();
  bunnys.forEach(b => b.update());
  render();
}

function render() {
  labelRenderer.render(scene, camera);
  renderer.render(scene, camera);
}
