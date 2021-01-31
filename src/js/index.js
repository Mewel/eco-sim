// styles
import './../css/app.css';

// js imports
import * as THREE from 'three';

import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {MapControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ModelManager} from "./ModelManager";
import {Settings} from "./Settings";
import {debugBox, getRandomInt, radialSearch} from "./util/util";

import {CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer";
import {FlatWorld} from "./FlatWorld";
import {Bunny} from "./Bunny";
import {PathFinder} from "./PathFinder";
import {BunnyInfo} from "./BunnyInfo";

let camera, controls, scene, renderer, clock, mixers, world, pathFinder, labelRenderer, bunnyInfo;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const bunnys = [];
let bunnyGroup = new THREE.Group();
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

  // util stuff
  pathFinder = new PathFinder(world);
  bunnyInfo = new BunnyInfo(world);

  ModelManager.init().then(() => {
    // world
    world.generateTrees(["tree_1", "tree_3"], .1);
    world.buildWaterMap();
    world.buildRegions();
    world.spawnFood(.01);
    //world.regions.forEach(region => region.debug(world));

    // pathfinder
    pathFinder.updateGrid();

    // bunny's
    for (let i = 0; i < 50; i++) {
      let spawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
      while (!world.isWalkable(spawn.x, spawn.y)) {
        spawn = new THREE.Vector2(getRandomInt(0, world.tiles), getRandomInt(0, world.tiles));
      }
      let bunny = new Bunny(i);
      bunny.model.position.copy(world.toScene(spawn.x, spawn.y));
      bunnys.push(bunny);
      bunnyGroup.add(bunny.model);
    }
    scene.add(bunnyGroup);
  });

  // misc
  window.addEventListener('resize', onWindowResize, false);

  const gui = new GUI();
  gui.add(Settings, "speed", 1, 100, 1);
}

animate();

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
    const intersects = raycaster.intersectObjects(bunnyGroup.children, true);
    if (!intersects || intersects.length <= 0) {
      return;
    }
    const bunnyName = intersects[0].object.parent.name;
    const bunny = bunnys.find(b => b.name === bunnyName);
    if (bunny) {
      bunnyInfo.assignBunny(bunny);
    }
  }
  // debug stuff
  if (event.button === 2) {
    const intersects = raycaster.intersectObject(world.terrain);
    if (!intersects || intersects.length <= 0) {
      return;
    }
    const center = world.toGrid(intersects[0].point.x, intersects[0].point.z);
    radialSearch(center, world, (scope, target, from, minDistance, oldTarget) => {
      let distance = center.distanceTo(target);
      debugBox(scope, target.x, target.y, 0x00ff00);
      if (target.x >= 0 && target.x < scope.tiles && target.y >= 0 && target.y < scope.tiles &&
        distance < minDistance && !scope.isWater(target.x, target.y) && !scope.hasObstacle(target.x, target.y) &&
        scope.hasFood(target.x, target.y)) {
        return [distance, target];
      }
      return [minDistance, oldTarget];
    });
  }
}

function animate() {
  const delta = clock.getDelta();
  currentTickTime += delta;
  if (currentTickTime > (1 / Settings.speed)) {
    bunnys.forEach(bunny => bunny.tick(world, pathFinder));
    currentTickTime = 0;
  }

  requestAnimationFrame(animate);
  controls.update();
  stats.update();
  if (bunnyInfo && bunnyInfo.isBunnyAssigned()) {
    bunnyInfo.update(camera);
  }
  if (pathFinder) {
    pathFinder.update();
  }
  bunnys.forEach(bunny => bunny.model.update());
  render();
}

function render() {
  labelRenderer.render(scene, camera);
  renderer.render(scene, camera);
}
