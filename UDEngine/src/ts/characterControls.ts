import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { A, D, DIRECTIONS, S, W, SPACE } from './keybinds';
import { generateHTMLTest } from '../ui/name';
import * as CANNON from 'cannon-es';
import { scene, world } from '../index';
import { deleteObject } from './objects';

let wasKeyPressed = false;
let jKeyPressed = false;

export class CharacterControls {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    animationsMap: Map<string, THREE.AnimationAction> = new Map(); // Walk, Run, Idle
    orbitControl: OrbitControls;
    camera: THREE.Camera;

    // state
    toggleRun: boolean = true;
    currentAction: string;
    isPlayerFrozen: boolean = false;

    // temporary data
    walkDirection = new THREE.Vector3();
    rotateAngle = new THREE.Vector3(0, 1, 0);
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
    cameraTarget = new THREE.Vector3();

    // constants
    fadeDuration: number = 0.2;
    runVelocity = 5;
    walkVelocity = 2;
    rotationSpeed = 0.1;

    // Jumping
    private velocityY = 0;
    private canJump = true;

    constructor(model: THREE.Group,
        mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
        orbitControl: OrbitControls, camera: THREE.Camera,
        currentAction: string) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
        this.orbitControl = orbitControl;
        this.camera = camera;
        this.updateCameraTarget(0, 0);
    }

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    public setPlayerFrozen(frozen: boolean) {
        this.isPlayerFrozen = frozen;
    }

    public update(delta: number, keysPressed: any) {
        if (this.isPlayerFrozen) {
            return;
        }

        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        let play = '';
        if (directionPressed && this.toggleRun) {
            play = 'run';
        } else if (directionPressed) {
            play = 'walk';
        } else {
            play = 'idle';
        }

        if (this.currentAction !== play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            if (current) {
                current.fadeOut(this.fadeDuration);
            }
            if (toPlay) {
                toPlay.reset().fadeIn(this.fadeDuration).play();
            }

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction === 'run' || this.currentAction === 'walk') {
            // Calculate the direction the character should move in
            this.calculateWalkDirection(keysPressed);

            // Rotate the character smoothly towards the movement direction
            const angleYDirection = Math.atan2(this.walkDirection.x, this.walkDirection.z);
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYDirection);
            this.model.quaternion.rotateTowards(this.rotateQuarternion, this.rotationSpeed);

            // Move the character
            const velocity = this.currentAction === 'run' ? this.runVelocity : this.walkVelocity;
            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
            this.model.position.x += moveX;
            this.model.position.z += moveZ;
            this.updateCameraTarget(moveX, moveZ);
        }

        // HTML TEST
        if (keysPressed['9']) {
            if (!wasKeyPressed) {
                generateHTMLTest();
            }
            wasKeyPressed = true;
        } else {
            wasKeyPressed = false;
        }

        // Jumping logic
        if (keysPressed[SPACE] && this.canJump) {
            this.velocityY = 5;
            this.canJump = false;
            const jumpAnimation = this.animationsMap.get('jump');
            if (jumpAnimation) {
                jumpAnimation.play();
            }
        }
        this.velocityY -= 9.8 * delta;
        this.model.position.y += this.velocityY * delta;
        this.updateCameraTarget(0, this.velocityY * delta);
        
        if (this.model.position.y <= 0) {
            this.velocityY = 0;
            this.canJump = true;
            this.model.position.y = 0;
        
            const jumpAnimation = this.animationsMap.get('jump');
            if (jumpAnimation) {
                setTimeout(() => {
                    if (this.model.position.y <= 0) {
                        jumpAnimation.stop();
                    }
                }, 1000);
            }
        }

        // Bomb planting logic
        if (keysPressed["j"]) {
            if (!jKeyPressed) {
                this.plantBomb();
                jKeyPressed = true;
            }
        } else {
            jKeyPressed = false;
        }
    }

    private plantBomb() {
        const particleRadius = 0.3;
        const particleShape = new CANNON.Sphere(particleRadius);
        const particleBody = new CANNON.Body({ mass: 1, shape: particleShape });
        const playerPosition = new CANNON.Vec3(this.model.position.x, this.model.position.y, this.model.position.z);
        particleBody.position.copy(playerPosition);

        const placeSpeed = 10;
        const playerDirection = new THREE.Vector3();
        this.model.getWorldDirection(playerDirection);
        const cannonDirection = new CANNON.Vec3(-playerDirection.x, -playerDirection.y, -playerDirection.z);
        particleBody.velocity.copy(cannonDirection.scale(placeSpeed));
        particleBody.velocity.x += 5;
        particleBody.velocity.y += 100;

        world.addBody(particleBody);
        console.log('Bomb Planted!');
        const textureLoader = new THREE.TextureLoader();
        const BaseColor = textureLoader.load("./textures/c4/weapon_c4_baseColor.png");
        const MetallicRough = textureLoader.load("./textures/c4/weapon_c4_metallicRoughness.png");
        const Normal = textureLoader.load("./textures/c4/weapon_c4_normal.png");
        const particleGeometry = new THREE.SphereGeometry(particleRadius);
        const particleMaterial = new THREE.MeshStandardMaterial({ map: BaseColor, metalnessMap: MetallicRough, roughnessMap: MetallicRough, normalMap: Normal });
        const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);

        particleMesh.position.copy(new THREE.Vector3(particleBody.position.x, particleBody.position.y, particleBody.position.z));

        scene.add(particleMesh);
        setTimeout(() => deleteObject(particleMesh, particleBody), 2000);
    }

    private updateCameraTarget(moveX: number, moveZ: number) {
        // move camera
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;

        // update camera target
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }

    private directionOffset(keysPressed: any): number {
        let directionOffset = 0;

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4; // w+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4; // w+d
            } else {
                directionOffset = 0; // w
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI; // s+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI; // s+d
            } else {
                directionOffset = Math.PI; // s
            }
        } else if (keysPressed[A]) {
            directionOffset = Math.PI / 2; // a
        } else if (keysPressed[D]) {
            directionOffset = -Math.PI / 2; // d
        }

        return directionOffset;
    }

    private calculateWalkDirection(keysPressed: any) {
        this.walkDirection.set(0, 0, 0);

        const cameraDirection = new THREE.Vector3();
        const cameraRight = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        this.camera.getWorldDirection(cameraRight);
        cameraDirection.y = 0;
        cameraRight.y = 0;
        cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

        // Z-axis (Forward/Backward)
        if (keysPressed[W]) {
            this.walkDirection.add(cameraDirection);
        }
        if (keysPressed[S]) {
            this.walkDirection.sub(cameraDirection);
        }

        // X-axis (Left/Right)
        if (keysPressed[A]) {
            this.walkDirection.sub(cameraRight);
        }
        if (keysPressed[D]) {
            this.walkDirection.add(cameraRight);
        }

        this.walkDirection.normalize();
        const directionOffset = this.directionOffset(keysPressed);
        this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);
    }
}
