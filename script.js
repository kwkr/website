settings = {
    birdsCount: 100,
    speedLimit: 0.5,
    boundariesAdjust: 0.05,
    flockAdjust: 0.01,
    alignmentAdjust: 0.01,
    visibility: 10,
    minDistance: 3,
    distanceAdjust: 0.05,
    sizePenalty: true,
    showBoundary: true,
    angle: 0,
    boundarySize: 40,
    cameraZ: 120
}

const PLANE_LEVEL = 50;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = settings.cameraZ;
const canvas = document.getElementById('birdsCanvas');
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor("#000000");
const windowSizeX = window.innerWidth > 720 ? window.innerWidth * 0.7 : window.innerWidth;
const windowSizeY = window.innerWidth > 720 ? window.innerHeight * 0.7 : window.innerHeight;
renderer.setSize(windowSizeX, windowSizeY);

// add boundary
const edgesGeo = new THREE.BoxGeometry(settings.boundarySize * 2, settings.boundarySize * 2, settings.boundarySize * 2);
const edges = new THREE.EdgesGeometry(edgesGeo);
const basicMaterial = new THREE.LineBasicMaterial({ color: '0x00ff00' });
const boundaryMesh = new THREE.LineSegments(edges, basicMaterial);
scene.add(boundaryMesh);

// add bottom plane
const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
const planeMaterial = new THREE.MeshPhongMaterial({ color: '#0ad34b', side: THREE.BackSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.receiveShadow = true;
plane.rotation.x = degreesToRadians(90);
plane.position.y = -PLANE_LEVEL - 20;
scene.add(plane);

// create sky
const vertexShader = `
    varying vec3 vWorldPosition;

    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    varying vec3 vWorldPosition;

    void main() {
        float t = normalize(vWorldPosition).y * 0.5 + 0.5;

        vec3 skyTopColor = vec3(0.0, 0.3, 0.7); // Dark blue
        vec3 skyBottomColor = vec3(0.6, 0.7, 1.0); // Light blue

        vec3 skyColor = mix(skyBottomColor, skyTopColor, t);

        gl_FragColor = vec4(skyColor, 1.0);
    }
`;

const skyMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide
});
const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(skyMesh);

// add light source
const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.PointLight(color, intensity);
light.castShadow = true;
light.position.set(0, 200, 0);
scene.add(light);

const birdsObjects = [];
const colors = generateNeonColors(4);
const gui = new lil.GUI();
gui.add(settings, 'birdsCount', 10, 1000, 10).onFinishChange(() => {
    const newBirdsNumber = settings.birdsCount;
    if (birdsObjects.length >= newBirdsNumber) {
        let deleted = birdsObjects.splice(newBirdsNumber, 1000);
        for (const item of deleted) {
            scene.remove(item.shape);
        }
    } else {
        const missing = newBirdsNumber - birdsObjects.length;
        for (let k = 0; k < missing; k++) {
            const item = getNewBird(new Date().getTime());
            scene.add(item.shape);
            birdsObjects.push(item);
        }

    }
}).name("birds count");
gui.add(settings, 'speedLimit', 0.01, 1, 0.01).name("speed limit");
gui.add(settings, 'flockAdjust', 0, 1, 0.01).name("stay in flock");
gui.add(settings, 'visibility', 0.5, 80, 0.5).name("vision range");
gui.add(settings, 'alignmentAdjust', 0, 1, 0.01).name("align with the flock");
gui.add(settings, 'minDistance', 0.5, 10, 0.5).name("min distance value");
gui.add(settings, 'distanceAdjust', 0, 1, 0.01).name("keep distance");
gui.add(settings, 'sizePenalty').name("flock size penalty");
gui.add(settings, 'showBoundary').name("show boundaries").onChange(sb => {
    if (sb) {
        scene.add(boundaryMesh);
    } else {
        scene.remove(boundaryMesh);
    }
});
gui.add(settings, 'boundarySize', 10, 200, 10).onFinishChange(() => {
    boundaryMesh.geometry.dispose();
    boundaryMesh.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(settings.boundarySize * 2, settings.boundarySize * 2, settings.boundarySize * 2));
    boundaryMesh.position.y = settings.boundarySize - PLANE_LEVEL;
}).name("boundary size");
gui.add(settings, 'boundariesAdjust', 0.01, 1, 0.01).name("avoid boundaries");
gui.add(settings, 'cameraZ', 100, 300, 10).name("camera distance").onFinishChange(() => {
    console.log(settings.cameraZ)
    camera.position.z = settings.cameraZ;
});
gui.close();

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

const geometry = new THREE.ConeGeometry(1, 3, 8);
function getNewBird(id) {
    const material = new THREE.MeshToonMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.x = settings.boundarySize - Math.floor(Math.random() * settings.boundarySize * 2);
    mesh.position.y = settings.boundarySize - Math.floor(Math.random() * settings.boundarySize * 2);
    mesh.position.z = settings.boundarySize - Math.floor(Math.random() * settings.boundarySize * 2);
    const dx = (0.5 - Math.random()) / 30 + 0.1;
    const dy = (0.5 - Math.random()) / 30 + 0.1;
    const dz = (0.5 - Math.random()) / 30 + 0.1;
    const item = { shape: mesh, dx, dy, dz, id };
    return item;
}

for (let k = 0; k < settings.birdsCount; k++) {
    const item = getNewBird(k);
    scene.add(item.shape);
    birdsObjects.push(item);
}

function adjustForBoundaries(bird) {
    const shape = bird.shape;
    const adjust = settings.boundariesAdjust;
    if (shape.position.x < -settings.boundarySize) {
        bird.dx += adjust;
    }

    if (shape.position.x > settings.boundarySize) {
        bird.dx -= adjust;
    }

    if (shape.position.y < -PLANE_LEVEL) {
        bird.dy += adjust;
    }

    if (shape.position.y > settings.boundarySize) {
        bird.dy -= adjust;
    }

    if (shape.position.z < -settings.boundarySize) {
        bird.dz += adjust;
    }

    if (shape.position.z > settings.boundarySize) {
        bird.dz -= adjust;
    }
}

function adjustForFlock(i) {
    const adjust = settings.flockAdjust;
    let cx = 0;
    let cy = 0;
    let cz = 0;

    let count = 0;
    for (const c of birdsObjects) {
        if (c.id !== i.id) {
            if (distanceVector(i.shape.position, c.shape.position) < settings.visibility) {
                count++;
                cx += c.shape.position.x;
                cy += c.shape.position.y;
                cz += c.shape.position.z;
            }
        }
    }

    const factor = settings.sizePenalty ? Math.min(1, Math.max(0.2, (adjust * 1 / count) * 5)) : 1;

    if (count > 0) {
        i.dx += adjust * factor * ((cx / count) - i.shape.position.x);
        i.dy += adjust * factor * ((cy / count) - i.shape.position.y);
        i.dz += adjust * factor * ((cz / count) - i.shape.position.z);
    }
}

function adjustAlignment(i) {
    const adjust = settings.alignmentAdjust;
    let cx = 0;
    let cy = 0;
    let cz = 0;

    let count = 0;
    for (const c of birdsObjects) {
        if (c.id !== i.id) {
            if (distanceVector(i.shape.position, c.shape.position) < settings.visibility) {
                count++;
                cx += c.dx;
                cy += c.dy;
                cz += c.dz;
            }
        }
    }

    if (count > 0) {
        i.dx += adjust * ((cx / count) - i.dx);
        i.dy += adjust * ((cy / count) - i.dy);
        i.dz += adjust * ((cz / count) - i.dz);
    }
}

function adjustForDistance(i) {
    const distance = settings.minDistance;
    const adjust = settings.distanceAdjust;

    let cx = 0;
    let cy = 0;
    let cz = 0;
    let count = 0;
    for (const c of birdsObjects) {
        if (c.id !== i.id) {
            if (distanceVector(i.shape.position, c.shape.position) < distance) {
                count++;
                cx += c.shape.position.x;
                cy += c.shape.position.y;
                cz += c.shape.position.z;
            }
        }
    }

    if (count) {
        i.dx += (i.shape.position.x - (cx / count)) * adjust;
        i.dy += (i.shape.position.y - (cy / count)) * adjust;
        i.dz += (i.shape.position.z - (cz / count)) * adjust;
    }
}

function adjustSpeed(i) {
    if (i.dx < 0) {
        if (i.dx < -settings.speedLimit) {
            i.dx = -settings.speedLimit
        }
    }
    if (i.dy < 0) {
        if (i.dy < -settings.speedLimit) {
            i.dy = -settings.speedLimit
        }
    }
    if (i.dz < 0) {
        if (i.dz < -settings.speedLimit) {
            i.dz = -settings.speedLimit
        }
    }

    if (i.dx >= 0) {
        if (i.dx > settings.speedLimit) {
            i.dx = settings.speedLimit
        }
    }
    if (i.dy >= 0) {
        if (i.dy > settings.speedLimit) {
            i.dy = settings.speedLimit
        }
    }
    if (i.dz >= 0) {
        if (i.dz > settings.speedLimit) {
            i.dz = settings.speedLimit
        }
    }
}

function distanceVector(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const pointOfInterest = new THREE.Vector3(0, 0, 0);
let angle = 0;
function updateCameraPosition() {
    const radius = settings.cameraZ;
    angle += 0.001;
    camera.position.x = pointOfInterest.x + radius * Math.sin(angle);
    camera.position.z = pointOfInterest.z + radius * Math.cos(angle);
    camera.lookAt(pointOfInterest);
}

const render = function () {
    requestAnimationFrame(render);

    for (const item of birdsObjects) {
        adjustForBoundaries(item);
        adjustForFlock(item);
        adjustAlignment(item);
        adjustForDistance(item);
        adjustSpeed(item);

        const shape = item.shape;

        shape.position.x += item.dx;
        shape.position.y += item.dy;
        shape.position.z += item.dz;

        const direction = new THREE.Vector3(item.dx, item.dy, item.dz);
        direction.normalize();
        const forward = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(forward, direction);
        shape.quaternion.copy(quaternion);
    }
    updateCameraPosition();
    renderer.render(scene, camera);
};

render();


// utils for generating colors
function generateNeonColors(n) {
    const colors = [];
    const hueStep = 360 / n;

    for (let i = 0; i < n; i++) {
        const hue = (i * hueStep) % 360;
        colors.push(hsvToHex(hue, 1, 1));
    }

    return colors;
}

function hsvToHex(h, s, v) {
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));

    switch (i) {
        case 0: [r, g, b] = [v, t, p]; break;
        case 1: [r, g, b] = [q, v, p]; break;
        case 2: [r, g, b] = [p, v, t]; break;
        case 3: [r, g, b] = [p, q, v]; break;
        case 4: [r, g, b] = [t, p, v]; break;
        case 5: [r, g, b] = [v, p, q]; break;
    }

    const rgbToHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return "#" + rgbToHex(r) + rgbToHex(g) + rgbToHex(b);
}


