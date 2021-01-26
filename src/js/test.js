import * as THREE from 'three'
import {MapControls} from "three/examples/jsm/controls/OrbitControls";

let camera, controls, scene, renderer, sun, modelManager, clock, mixers;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  //scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  // light
  const dirLight = new THREE.DirectionalLight(0x444444);
  dirLight.shadowDarkness = 0.5;
  scene.add(dirLight)

  const light = new THREE.SpotLight(0xffffff);
  light.castShadow = true;
  light.shadow.camera.far = 2000;
  light.position.y = 100;
  light.position.x = 100;
  light.position.z = 100;
  scene.add(light);

  // camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(20, 20, 20);

  // controls
  controls = new MapControls(camera, document.body);
  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = .05;
  controls.minDistance = 5;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2;
  controls.keys = {LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83};
  controls.keyPanSpeed = 20;

  // misc
  window.addEventListener('resize', onWindowResize, false);

  // data
  const data = [
    0, 0, 0, 0, 0, 0, 0, 0,
    3, 3, 3, 3, 3, 3, 3, 3,
    0, 0, 0, 0, 0, 0, 0, 0,
    6, 6, 6, 6, 6, 6, 6, 6,
    0, 0, 0, 0, 0, 0, 0, 0,
    8, 8, 8, 8, 8, 8, 8, 8,
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 5, 5, 5, 5, 5, 5, 5,
  ];

  // test
  const seg = 8;
  const geometry = new THREE.PlaneBufferGeometry(20, 20, seg - 1, seg - 1);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    vertices[i + 1] = data[i / 3];
  }
  geometry.computeVertexNormals();
  let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0xff0000}));
  scene.add(mesh);

  // 2
  const seg2 = seg / 2;
  const geometry2 = new THREE.PlaneBufferGeometry(20, 20, seg2 - 1, seg2 - 1);
  geometry2.rotateX(-Math.PI / 2);
  const vertices2 = geometry2.attributes.position.array;
  for (let y = 0; y < seg2; y++) {
    for (let x = 0; x < seg2; x++) {
      const p1 = data[(2 * x) + (4 * y * seg2)];
      const p2 = data[(2 * x) + (4 * y * seg2) + 1];
      const p3 = data[(2 * x) + (4 * y * seg2) + seg];
      const p4 = data[(2 * x) + (4 * y * seg2) + seg + 1];
      vertices2[x * 3 + y * seg2 * 3 + 1] = (p1 + p2 + p3 + p4) / 4;
    }
  }
  geometry2.computeVertexNormals();
  let mesh2 = new THREE.Mesh(geometry2, new THREE.MeshPhongMaterial({color: 0x0000ff}));
  mesh2.receiveShadow = true;
  scene.add(mesh2);


  // helper
  const axesHelper = new THREE.AxesHelper(200);
  scene.add(axesHelper);

}

animate();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}
