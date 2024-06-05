import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { A, D, DIRECTIONS, S, W, SPACE } from './keybinds'
import { generateHTMLTest } from '../ui/name';
import Test from '../ui/test';
import * as CANNON from 'cannon-es'
import { scene, world } from '../index'
import { deleteObject } from './objects';
let wasKeyPressed = false;
let jKeyPressed = false;

export class CharacterControls {

    model: THREE.Group
    mixer: THREE.AnimationMixer
    animationsMap: Map<string, THREE.AnimationAction> = new Map() // Walk, Run, Idle
    orbitControl: OrbitControls
    camera: THREE.Camera

    // state
    toggleRun: boolean = true
    currentAction: string
    isPlayerFrozen: boolean = false
    
    // temporary data
    walkDirection = new THREE.Vector3()
    rotateAngle = new THREE.Vector3(0, 1, 0)
    rotateQuarternion: THREE.Quaternion = new THREE.Quaternion()
    cameraTarget = new THREE.Vector3()
    
    // constants
    fadeDuration: number = 0.2
    runVelocity = 5
    walkVelocity = 2

    // Jumping //
    private velocityY = 0;
    private canJump = true;

    constructor(model: THREE.Group,
        mixer: THREE.AnimationMixer, animationsMap: Map<string, THREE.AnimationAction>,
        orbitControl: OrbitControls, camera: THREE.Camera,
        currentAction: string) {
        this.model = model
        this.mixer = mixer
        this.animationsMap = animationsMap
        this.currentAction = currentAction
        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play()
            }
        })
        this.orbitControl = orbitControl
        this.camera = camera
        this.updateCameraTarget(0,0)
    }

    public switchRunToggle() {
        this.toggleRun = !this.toggleRun
    }

    public setPlayerFrozen(frozen: boolean) {  // FREEZE PLAYER //
        this.isPlayerFrozen = frozen;
    }

    public update(delta: number, keysPressed: any) {
        if (this.isPlayerFrozen) { // CHECK IF PLAYER IS FROZEN //
            return;
        }

        const directionPressed = DIRECTIONS.some(key => keysPressed[key] == true)

        var play = '';
        if (directionPressed && this.toggleRun) {
            play = 'Run'
        } else if (directionPressed) {
            play = 'Walk'
        } else {
            play = 'Idle'
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play)
            const current = this.animationsMap.get(this.currentAction)

            current.fadeOut(this.fadeDuration)
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play
        }

        this.mixer.update(delta)

        if (this.currentAction == 'Run' || this.currentAction == 'Walk') {
            // calculate towards camera direction
            var angleYCameraDirection = Math.atan2(
                    (this.camera.position.x - this.model.position.x), 
                    (this.camera.position.z - this.model.position.z))
            // diagonal movement angle offset
            var directionOffset = this.directionOffset(keysPressed)

            // rotate model
            this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset)
            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2)

            // calculate direction
            this.camera.getWorldDirection(this.walkDirection)
            this.walkDirection.y = 0
            this.walkDirection.normalize()
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset)

            // run/walk velocity
            const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity

            // move model & camera
            const moveX = this.walkDirection.x * velocity * delta
            const moveZ = this.walkDirection.z * velocity * delta
            this.model.position.x += moveX
            this.model.position.z += moveZ
            this.updateCameraTarget(moveX, moveZ)
        }
            
        if (keysPressed['9']) { // HTML TEST //
            if (!wasKeyPressed) {
                Test();
            }
            wasKeyPressed = true;
        } else {
            wasKeyPressed = false;
        }

        if (keysPressed[SPACE] && this.canJump) { // JUMPING //
            this.velocityY = 5;
            this.canJump = false;
        }
        this.velocityY -= 9.8 * delta;
        this.model.position.y += this.velocityY * delta;
        this.updateCameraTarget(0, this.velocityY * delta);

        if (this.model.position.y <= 0) {
            this.velocityY = 0; 
            this.canJump = true;
            this.model.position.y = 0;
        }

        if (keysPressed["j"]) { // BOMB -- 03/31/2024 -- Added DeleteObject After 2seconds (will be when to add particle effect and sound) //
            if (!jKeyPressed) {
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
                const particleMaterial = new THREE.MeshStandardMaterial({map: BaseColor, metalnessMap: MetallicRough, roughnessMap: MetallicRough, normalMap: Normal});
                const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
        
                particleMesh.position.copy(new THREE.Vector3(particleBody.position.x, particleBody.position.y, particleBody.position.z));
        
                scene.add(particleMesh);
                jKeyPressed = true;
                setTimeout(() => deleteObject(particleMesh, particleBody), 2000);
            }
        } else {
            jKeyPressed = false;
        }
    }

    private updateCameraTarget(moveX: number, moveZ: number) {
        // move camera
        this.camera.position.x += moveX
        this.camera.position.z += moveZ

        // update camera target
        this.cameraTarget.x = this.model.position.x
        this.cameraTarget.y = this.model.position.y + 1
        this.cameraTarget.z = this.model.position.z
        this.orbitControl.target = this.cameraTarget
    }

    private directionOffset(keysPressed: any) { // DIRECTIONAL MOVEMENT //
        var directionOffset = 0 // w

        if (keysPressed[W]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 // w+a
            } else if (keysPressed[D]) {
                directionOffset = - Math.PI / 4 // w+d
            }
        } else if (keysPressed[S]) {
            if (keysPressed[A]) {
                directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
            } else if (keysPressed[D]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
            } else {
                directionOffset = Math.PI // s
            }
        } else if (keysPressed[A]) {
            directionOffset = Math.PI / 2 // a
        } else if (keysPressed[D]) {
            directionOffset = - Math.PI / 2 // d
        }

        return directionOffset
    }
}