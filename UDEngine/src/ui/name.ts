let isOpen = false;
let element: HTMLDivElement | null = null;

export function generateHTMLTest() {
    if (!isOpen) {
        element = document.createElement('div');
        element.innerHTML = '<h1>UD ENGINE</h1>';
        element.innerHTML += '<h2>Made With THREE.JS</h2>';
        element.style.position = 'absolute';
        element.style.top = '10px';
        element.style.right = '10px';
        document.body.appendChild(element);
    } else {
        if (element) {
            document.body.removeChild(element);
            element = null;
        }
    }
    isOpen = !isOpen;
}