import { characterControls } from './index';

export function logCharacterPosition() {
    if (characterControls && characterControls.model) {
        console.log(characterControls.model.position);
    } else {
        console.log('Character model not loaded');
    }
}