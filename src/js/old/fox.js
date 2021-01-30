import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";

window.addEventListener('keyup', onKeyUp);
let mixer, foxWalk, foxIdle;

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