import {Sky} from "three/examples/jsm/objects/Sky";
import * as THREE from "three";
let sky, sun;

const effectController = {
  turbidity: 10,
  rayleigh: 3,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.7,
  inclination: 1,
  azimuth: 0.3665,
  exposure: .5
};

//renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 0.5;
initSky();

function animate() {
  effectController.azimuth += 0.01 * delta;
  if(effectController.azimuth > 1) {
    effectController.azimuth = 0;
  }
  effectController.exposure = Math.min(Math.max(0, effectController.azimuth - .5) * 2 +.3, 1);
  guiChanged();
}

function guiChanged() {

  const uniforms = sky.material.uniforms;
  uniforms[ "turbidity" ].value = effectController.turbidity;
  uniforms[ "rayleigh" ].value = effectController.rayleigh;
  uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
  uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;

  const theta = Math.PI * ( effectController.inclination - 0.5 );
  const phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

  sun.x = Math.cos( phi );
  sun.y = Math.sin( phi ) * Math.sin( theta );
  sun.z = Math.sin( phi ) * Math.cos( theta );

  uniforms[ "sunPosition" ].value.copy( sun );

  renderer.toneMappingExposure = effectController.exposure;
  renderer.render( scene, camera );

}

function initSky() {

  // Add Sky
  sky = new Sky();
  sky.scale.setScalar( 45000 );
  scene.add( sky );

  sun = new THREE.Vector3();

  /// GUI

  const gui = new GUI();

  gui.add( effectController, "turbidity", 0.0, 20.0, 0.1 ).onChange( guiChanged );
  gui.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "exposure", 0, 1, 0.0001 ).onChange( guiChanged );

  guiChanged();

}