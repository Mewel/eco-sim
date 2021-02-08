// styles
import './../css/app.css';

// js imports
import * as THREE from 'three';
import * as TWEEN from "@tweenjs/tween.js";

import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {MapControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ModelManager} from "./ModelManager";
import {Settings} from "./Settings";

import {CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer";
import {World} from "./World";
import {PathFinder} from "./PathFinder";
import {BunnyInfo} from "./BunnyInfo";
import {EcoInfo} from "./EcoInfo";
import {AnimalHandler} from "./AnimalHandler";

let camera, controls, scene, renderer, animationClock, tickClock, mixers, world, labelRenderer, bunnyInfo;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentTickTime = 0;

const stats = {
  tick: 0
};

const fps = new Stats();
fps.domElement.style.position = 'absolute';
fps.domElement.style.top = '0px';
document.body.appendChild(fps.domElement);
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
  labelRenderer.domElement.style.pointerEvents = 'none';
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
  controls = new MapControls(camera, renderer.domElement);
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
  animationClock = new THREE.Clock();
  tickClock = new THREE.Clock();
  mixers = [];

  // world
  let tiles = 200;
  let tileSize = 20;

  //world = new World(tiles, tileSize);
  world = new World(tiles, tileSize);
  scene.add(world.worldGroup);


  const axesHelper = new THREE.AxesHelper(2000);
  scene.add(axesHelper);

  // util stuff
  PathFinder.init(world);
  bunnyInfo = new BunnyInfo(world);

  ModelManager.init().then(() => {
    // world
    world.generateTrees(["tree_1", "tree_3"], .1);
    world.buildWaterMap();
    world.buildRegions();
    world.spawnFood(.01);

    AnimalHandler.init();
    AnimalHandler.spawnBunnies(world, 100);
    scene.add(AnimalHandler.group);
    //world.regions.forEach(region => region.debug(world));

    // pathfinder
    PathFinder.updateGrid();
  });

  // misc
  window.addEventListener('resize', onWindowResize, false);

  const gui = new GUI();
  gui.add(Settings, "speed", 0, 100, 1);
}

animate();
tick();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerUp(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // select bunny
  if (event.button === 0) {
    const intersections = raycaster.intersectObjects(AnimalHandler.group.children, true);
    if (!intersections || intersections.length <= 0) {
      return;
    }
    const arr = intersections[0].object.userData.array;
    const instanceId = intersections[0].instanceId;
    const bunnyName = arr[instanceId].bunny.name;
    const bunny = world.getBunny(bunnyName);
    if (bunny) {
      bunnyInfo.assignBunny(bunny);
      EcoInfo.assignAnimal(bunny);
      EcoInfo.show();
      EcoInfo.showTab(".eco-info-animal");
    }
  }
}

function tick() {
  const delta = tickClock.getDelta();
  currentTickTime += delta;
  if (currentTickTime > (1 / Settings.speed)) {
    stats.tick++;
    currentTickTime = 0;
    world.tick();
  }
  setTimeout(tick, 1);
}

function animate(time) {
  requestAnimationFrame(animate);
  const delta = animationClock.getDelta();
  controls.update();
  fps.update();
  EcoInfo.update(stats);
  PathFinder.update();
  TWEEN.update(time);
  if (AnimalHandler.initialized && Settings.speed > 0) {
    AnimalHandler.update(delta);
  }
  if(bunnyInfo) {
    bunnyInfo.update();
  }
  render();
}

function render() {
  labelRenderer.render(scene, camera);
  renderer.render(scene, camera);
}
