// styles
import './../css/app.css';

// js imports
import * as THREE from 'three';

import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {MapControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ModelManager} from "./ModelManager";
import Config from './config';
import {getRandomInt} from "./util/util";

import {CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer";
import {FlatWorld} from "./FlatWorld";
import {Bunny} from "./Bunny";
import {PathFinder} from "./PathFinder";
import {BunnyInfo} from "./BunnyInfo";

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
let tickTime = 0.5;
let currentTickTime = 0;

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
document.body.appendChild(stats.domElement);
window.addEventListener('pointerup', onPointerUp);

init();

function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  //scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(2000, 1700, 4000);

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
  dirLight.position.set(4000, 6000, 4000);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 10000;
  dirLight.shadow.camera.right = 4000;
  dirLight.shadow.camera.left = -4000;
  dirLight.shadow.camera.top = 4000;
  dirLight.shadow.camera.bottom = -4000;
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
  controls.target.set(2000, 0, 2700);
  controls.update();

  // animation
  clock = new THREE.Clock();
  mixers = [];

  // world
  let tiles = 200;
  let tileSize = 20;

  //world = new World(tiles, tileSize);
  world = new FlatWorld(tiles, tileSize);
  scene.add(world.worldGroup);


  const axesHelper = new THREE.AxesHelper(2000);
  scene.add(axesHelper);

  // pathfinder
  pathFinder = new PathFinder(world);

  ModelManager.init().then(() => {
    // world
    world.generateTrees(["tree_1", "tree_3"], .1);
    world.buildWaterMap();
    world.spawnFood(.01);

    // pathfinder
    pathFinder.updateGrid();

    // bunny's
    bunny = new Bunny();
    let bunnySpawn = new THREE.Vector2(Math.ceil(world.tiles / 2), Math.ceil(world.tiles / 2));
    while (world.isWater(bunnySpawn.x, bunnySpawn.y) || world.hasObstacle(bunnySpawn.x, bunnySpawn.y)) {
      bunnySpawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
    }
    bunny.model.position.set(bunnySpawn.x * tileSize, 0, bunnySpawn.y * tileSize);
    console.log(bunnySpawn);
    scene.add(bunny.model);
    bunny.model.debugPath(scene);
    bunnyInfo = new BunnyInfo(bunny);

    // carrot


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
  const intersects = raycaster.intersectObject(world.terrain);
  if (!intersects || intersects.length <= 0) {
    return;
  }
  const point = intersects[0].point;
  if (event.button === 2) {
    // teleport bunny on right mouse
    bunny.model.stop();
    bunny.model.position.copy(world.centerOnGrid(point.x, point.z));
    return;
  }
  bunny.model.jumpToDebug(world.toGrid(point.x, point.z), world, pathFinder);
}


function animate() {
  const delta = clock.getDelta();
  currentTickTime += delta;
  if (currentTickTime > tickTime) {
    if (bunny) {
      bunny.tick(world, pathFinder);
    }
    currentTickTime = 0;
  }

  requestAnimationFrame(animate);
  controls.update();
  stats.update();
  if (bunny) {
    bunny.model.update();
  }
  if (bunnyInfo) {
    bunnyInfo.update(camera);
  }
  if (pathFinder) {
    pathFinder.update();
  }
  bunnys.forEach(b => b.update());
  render();
}

function render() {
  labelRenderer.render(scene, camera);
  renderer.render(scene, camera);
}
