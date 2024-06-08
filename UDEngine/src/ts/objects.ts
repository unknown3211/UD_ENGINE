import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene, world } from '../index';
import * as CANNON from 'cannon-es';
import * as THREE from "three";

export function deleteObject(object: THREE.Mesh, body: CANNON.Body) {
    if (world.bodies.includes(body)) {
        world.removeBody(body);
    }
    scene.remove(object);
}

export function generateTestModel() {
    new GLTFLoader().load('models/scene.gltf', function (gltf) {
        gltf.scene.position.set(23.938522879445152, 0.05, -5.159304852902911);
        scene.add(gltf.scene);


        const body = new CANNON.Body({
            mass: 0, // Set mass to 0 for static objects
            position: new CANNON.Vec3(23.938522879445152, 0.05, -5.159304852902911)
        });
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        body.addShape(shape);
        world.addBody(body);
    });
}

export function generateTestCouch() {
    var couch: THREE.Object3D;
    var body: CANNON.Body;
    new GLTFLoader().load('models/couch.glb', function (gltf) {
        couch = gltf.scene;
        couch.position.set(4.934825835660447, 0.5, -10.356160008190734);
        couch.scale.set(2.5, 2.5, 2.5);
        scene.add(couch);

        body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(4.934825835660447, 0.5, -10.356160008190734)
        });
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        body.addShape(shape);
        world.addBody(body);

        body.addEventListener("collide", () => {
            console.log("Couch Collided");
            setTimeout(() => deleteObject(couch as THREE.Mesh, body), 1000);
        });
    });
}

export function generateTestHouse() {
    new GLTFLoader().load('models/house.glb', function (gltf) {
        gltf.scene.position.set(4.9108790927091155, 0.5, 15.184452324216828);
        gltf.scene.rotation.set(0, 1.5707963267948966, 0);
        scene.add(gltf.scene);

        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(4.9108790927091155, 0.5, 15.184452324216828)
        });
        const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        body.addShape(shape);
        world.addBody(body);
    });
}