// styles
import './../css/app.css';

// js imports
import * as THREE from 'three';
import * as TWEEN from "@tweenjs/tween.js";

import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {MapControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Settings} from "./Settings";
import {AssetManager} from "./AssetManager";
import {World} from "./World";
import {PathFinder} from "./PathFinder";
import {BunnyInfo} from "./BunnyInfo";
import {EcoInfo} from "./EcoInfo";
import {AnimalHandler} from "./AnimalHandler";
import {Statistics} from "./Statistics";
import {EcoSetup} from "./EcoSetup";

let camera, controls, scene, renderer, animationClock, tickClock, mixers, world, bunnyInfo, audioListener, fps;
let waveAudio, windAudio;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentTickTime = 0;

const stats = {
  tick: 0
};

init();

function init() {
  // animation
  animationClock = new THREE.Clock();
  tickClock = new THREE.Clock();
  mixers = [];

  // init assets
  AssetManager.init();

  // statistic
  Statistics.init();
  Statistics.select("bunnies (sum)", 0);

  EcoSetup.onStart().then(() => {
    create();
  });
}

function create() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(Settings.world.tiles * 10, Settings.world.tiles * 14, Settings.world.tiles * 20);

  // renderer
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // light
  const light = new THREE.AmbientLight(0x888888); // soft white light
  scene.add(light);
  const dirLight = new THREE.DirectionalLight(0x777777);
  const lightDistance = Settings.world.tiles * 20;
  dirLight.position.set(lightDistance, lightDistance * 1.5, lightDistance);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = lightDistance * 3;
  dirLight.shadow.camera.right = lightDistance;
  dirLight.shadow.camera.left = -lightDistance;
  dirLight.shadow.camera.top = lightDistance;
  dirLight.shadow.camera.bottom = -lightDistance;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  // controls
  controls = new MapControls(camera, renderer.domElement);
  controls.addEventListener("change", onCameraChange);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.minDistance = 50;
  controls.maxDistance = 5000;
  controls.maxPolarAngle = Math.PI / 2;
  controls.keys = {LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83};
  controls.keyPanSpeed = 20;
  controls.target.set(Settings.world.tiles * 10, 0, Settings.world.tiles * 13);
  controls.update();

  // audio
  audioListener = new THREE.AudioListener();
  audioListener.setMasterVolume(Settings.audio ? 1. : 0);
  camera.add(audioListener);
  Settings.onChange.push((key, value) => {
    if (key === "audio") {
      audioListener.setMasterVolume(value ? 1. : 0.);
    }
  });

  // misc
  window.addEventListener('resize', onWindowResize, false);

  let tiles = Settings.world.tiles;
  let tileSize = Settings.world.tileSize;

  world = new World(tiles, tileSize);
  scene.add(world.worldGroup);

  // util stuff
  PathFinder.init(world);
  bunnyInfo = new BunnyInfo(world);
  fps = createFPS();
  window.addEventListener("pointerup", onPointerUp);

  // speed gui
  const gui = new GUI();
  gui.add(Settings, "speed", 0, 1000, 1);

  AssetManager.ready().then(() => {
    // world
    world.generateTrees(["tree_3"], Settings.world.treeDensity);
    world.buildWaterMap();
    world.buildRegions();
    world.spawnFood(Settings.world.foodDensity * .1);

    AnimalHandler.init();
    AnimalHandler.spawnBunnies(world, Settings.world.bunnies);
    scene.add(AnimalHandler.group);

    // pathfinder
    PathFinder.updateGrid();

    // audio
    waveAudio = AssetManager.audio("water.mp3", audioListener);
    waveAudio.setLoop(true);
    waveAudio.play();
    updateAudio();

    // start
    animate();
    tick();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
    Statistics.track(stats.tick);
    stats.tick++;
    currentTickTime = 0;
    world.tick();
  }
  setTimeout(tick, 1);
}

function animate(time) {
  requestAnimationFrame(animate);
  const delta = animationClock.getDelta();
  PathFinder.update();
  EcoInfo.update(stats);
  TWEEN.update(time);
  if (AnimalHandler.initialized && Settings.speed > 0) {
    AnimalHandler.update(delta);
  }
  if (bunnyInfo) {
    bunnyInfo.update();
  }
  controls.update();
  fps.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

function createFPS() {
  const fps = new Stats();
  fps.domElement.style.position = 'absolute';
  fps.domElement.style.top = '0px';
  document.body.appendChild(fps.domElement);
  return fps;
}

function onCameraChange() {
  updateAudio();
}

function updateAudio() {
  if (!waveAudio) {
    return;
  }
  const min = 50;
  const max = 1000;
  const y = camera.position.y;
  const volume = y <= min ? 1 : (y > max ? 0 : (1 - (y - min) / (max - min)));
  waveAudio.setVolume(volume * .3);
}
