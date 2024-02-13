import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { scene } from '../index'

export function generateTestModel() {
    new GLTFLoader().load('models/scene.gltf', function (gltf) {
        gltf.scene.position.set(23.938522879445152, 0.05, -5.159304852902911); // Vector3 Coords //
        scene.add(gltf.scene);
    });
}

export function generateTestCouch() {
    new GLTFLoader().load('models/couch.glb', function (gltf) {
        gltf.scene.position.set(4.934825835660447, 0.5, -10.356160008190734);
        gltf.scene.scale.set(2.5, 2.5, 2.5);
        scene.add(gltf.scene);
    });
}

export function generateTestHouse() {
    new GLTFLoader().load('models/house.glb', function (gltf) {
        gltf.scene.position.set(4.9108790927091155, 0.5, 15.184452324216828);
        gltf.scene.rotation.set(0, 1.5707963267948966, 0);
        scene.add(gltf.scene);
    });
}