import { CharacterControls } from "./ts/characterControls";
import * as THREE from "three";
import Stats from 'stats.js';
import { CameraHelper } from "three"; // Not used yet //
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { logCharacterPosition } from "./ts/dev"; // Used For Logging Character Position //
import { generateTestModel, generateTestHouse, generateTestCouch, deleteObject } from "./ts/objects";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import { World } from "cannon-es";

// SCENE
var loader = new THREE.TextureLoader();
export var scene = new THREE.Scene();
scene.background = loader.load('./textures/sky/sky.png');
export var world = new CANNON.World({});

//const cannonDebugger = CannonDebugger(scene, world, {  // ABLE TO SEE Collisions //
  //color: 0xaee2ff,
  //scale: 3,
//}); // Unhash If Want To See Collisions //

// Create a Stats panel // Unhash If Want To See Stats //
const stats = new Stats();
document.body.appendChild(stats.dom);

// CAMERA
export var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.mouseButtons = {
  LEFT: THREE.MOUSE.RIGHT, // Swapped Left For Right Mouse Button For Camera Movement //
  MIDDLE: THREE.MOUSE.MIDDLE, // Moves Camera In & Out //
  RIGHT: THREE.MOUSE.LEFT, // Swapped Left For Right Mouse Button For Camera Movement //
};
orbitControls.update();

// Call Functions Start //
light();
generateFloor();
generateTestModel();
generateTestCouch();
generateTestHouse();
// Call Functions End //

// MODEL WITH ANIMATIONS //
export var characterControls: CharacterControls;
let playerBody: CANNON.Body;

new GLTFLoader().load("models/model.glb", function (gltf) {
  const model = gltf.scene;
  model.rotation.y = Math.PI;
  model.traverse(function (object: any) {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(model);

  const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap: Map<string, THREE.AnimationAction> = new Map();
  gltfAnimations
    .filter((a) => a.name != "t-pose")
    .forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

  characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, "idle");

  const radius = 0.2;
  const height = 1.2;
  playerBody = new CANNON.Body({
    mass: 5,
    position: new CANNON.Vec3(0, height / 2, 0),
    shape: new CANNON.Cylinder(radius, radius, height, 10),
    fixedRotation: true,
  });
  playerBody.inertia.set(0, 0, 0);
  playerBody.invInertia.set(0, 0, 0);
  world.addBody(playerBody); // Unhash If Want To Add Collision Cylinder To Character //

  playerBody.addEventListener('collide', (event: any) => {
    if (event.body === testBoxBody) {
      console.log("Player Collided With Box");
      characterControls.setPlayerFrozen(true);
    }
  });
});

// CONTROL KEYS
const keysPressed = {};
document.addEventListener("keydown", (event) => { // Run Toggle //
    if (event.shiftKey && characterControls) {
      characterControls.switchRunToggle();
    } else {
      (keysPressed as any)[event.key.toLowerCase()] = true;
    }
  },
  false
);
document.addEventListener("keyup", (event) => {
    (keysPressed as any)[event.key.toLowerCase()] = false;
  },
  false
);

const clock = new THREE.Clock();
const timeStep = 1 / 60;
// ANIMATE
function animate() {
  stats.begin(); // Unhash If Want To See Stats //
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls && characterControls.model) {
    characterControls.update(mixerUpdateDelta, keysPressed);
    playerBody.position.copy(
      new CANNON.Vec3(
        characterControls.model.position.x,
        characterControls.model.position.y,
        characterControls.model.position.z
      )
    );
    //logCharacterPosition(); // Unhash If Want To Log Character Position //
  }
  orbitControls.update();
  world.step(timeStep);
  //cannonDebugger.update(); // Unhash If Want To See Collisions //
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
  stats.end(); // Unhash If Want To See Stats //
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

// Adds A Floor To The Scene //

function generateFloor() {
  const textureLoader = new THREE.TextureLoader();
  const placeholder = textureLoader.load("./textures/ground/t_ground_cement.png");

  const WIDTH = 80;
  const LENGTH = 80;

  const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  const material = new THREE.MeshStandardMaterial({ map: placeholder });

  const floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
}

// Adds light To The Scene //

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
}

// Collision Testing START -- 03/31/2024 //

export const testBoxBody = new CANNON.Body({   // COLLISIONS //
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25)),
  fixedRotation: true,
  position: new CANNON.Vec3(0.9936447767350833, 1, 3.0149588759059),
});
world.addBody(testBoxBody);

const testBox = new THREE.Mesh( // Box //
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
testBox.position.set(1, 1, 3);
scene.add(testBox);

testBoxBody.addEventListener("collide", () => {
  console.log("Box Collided");
  setTimeout(() => deleteObject(testBox, testBoxBody));
});

// Collision Testing END -- 03/31/2024 //