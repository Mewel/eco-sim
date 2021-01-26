import * as THREE from 'three';

import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {MapControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ModelManager} from "./ModelManager";
import {World} from "./World";
import {Bunny} from "./Bunny";
import {PathFinder} from "./PathFinder";
import {getRandomInt} from "./util/util";

let camera, controls, scene, renderer, clock, mixers, world, bunny, pathFinder;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const bunnys = [];

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
  camera.position.set(500, 500, 500);

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
  controls = new MapControls(camera, renderer.domElement);
  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = .05;
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

  ModelManager.init().then(() => {
    // world
    world.generateTrees(["tree_1", "tree_3"], .05);
    const obstacles = [];
    world.getTreeMatrixArray().forEach(matrix => {
      let position = new THREE.Vector3(matrix.elements[12], matrix.elements[13], matrix.elements[14]);
      obstacles.push({position, radius: 10});
    });
    pathFinder.buildObstacleGrid(obstacles).updateGrid();
    //pathFinder.debug(scene);
    //world.debugTrees(scene);

    // bunny's
    bunny = new Bunny();
    let bunnySpawn = new THREE.Vector2(0, 0);
    while (world.getHeight(bunnySpawn.x, bunnySpawn.y) < 0) {
      bunnySpawn = new THREE.Vector2(getRandomInt(-2000, 2000), getRandomInt(-2000, 2000));
    }
    bunny.model.position.set(bunnySpawn.x, world.getHeight(bunnySpawn.x, bunnySpawn.y), bunnySpawn.z);
    scene.add(bunny.model);
    bunny.debugPath(scene);

    /*for (let i = 0; i < 5000; i++) {
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

function animate() {
  const delta = clock.getDelta();
  requestAnimationFrame(animate);
  controls.update();
  stats.update();
  if (bunny) {
    bunny.update();
  }
  pathFinder.update();
  bunnys.forEach(b => b.update());
  render();
}

function render() {
  renderer.render(scene, camera);
}
