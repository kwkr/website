obj = {
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
camera.position.z = obj.cameraZ;
const canvas = document.getElementById('birdsCanvas');
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor("#000000");
const windowSizeX = window.innerWidth > 720 ? window.innerWidth * 0.7 : window.innerWidth;
const windowSizeY = window.innerWidth > 720 ? window.innerHeight * 0.7 : window.innerHeight;
renderer.setSize(windowSizeX, windowSizeY);

// add boundary
const edgesGeo = new THREE.BoxGeometry(obj.boundarySize * 2, obj.boundarySize * 2, obj.boundarySize * 2);
const edges = new THREE.EdgesGeometry(edgesGeo);
const basicMaterial = new THREE.LineBasicMaterial({ color: '0x00ff00' });
const boundaryMesh = new THREE.LineSegments(edges, basicMaterial);
scene.add(boundaryMesh);

// add bottom plane
const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
const planeMaterial = new THREE.MeshPhongMaterial({ color: '#0ad34b', side: THREE.BackSide, shininess: 1 });
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
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
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
gui.add(obj, 'birdsCount', 10, 1000, 10).onFinishChange(() => {
    const newBirdsNumber = obj.birdsCount;
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
gui.add(obj, 'speedLimit', 0.01, 1, 0.01).name("speed limit");
gui.add(obj, 'flockAdjust', 0, 1, 0.01).name("stay in flock");
gui.add(obj, 'visibility', 0.5, 80, 0.5).name("vision range");
gui.add(obj, 'alignmentAdjust', 0, 1, 0.01).name("align with the flock");
gui.add(obj, 'minDistance', 0.5, 10, 0.5).name("min distance value");
gui.add(obj, 'distanceAdjust', 0, 1, 0.01).name("keep distance");
gui.add(obj, 'sizePenalty').name("flock size penalty");
gui.add(obj, 'showBoundary').name("show boundaries").onChange(sb => {
    if (sb) {
        scene.add(boundaryMesh);
    } else {
        scene.remove(boundaryMesh);
    }
});
gui.add(obj, 'boundarySize', 10, 200, 10).onFinishChange(() => {
    boundaryMesh.geometry.dispose();
    boundaryMesh.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(obj.boundarySize * 2, obj.boundarySize * 2, obj.boundarySize * 2));
    boundaryMesh.position.y = obj.boundarySize - PLANE_LEVEL;
}).name("boundary size");
gui.add(obj, 'boundariesAdjust', 0.01, 1, 0.01).name("avoid boundaries");
gui.add(obj, 'cameraZ', 100, 300, 10).name("camera distance").onFinishChange(() => {
    console.log(obj.cameraZ)
    camera.position.z = obj.cameraZ;
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
    mesh.position.x = obj.boundarySize - Math.floor(Math.random() * obj.boundarySize * 2);
    mesh.position.y = obj.boundarySize - Math.floor(Math.random() * obj.boundarySize * 2);
    mesh.position.z = obj.boundarySize - Math.floor(Math.random() * obj.boundarySize * 2);
    const dx = (0.5 - Math.random()) / 30 + 0.1;
    const dy = (0.5 - Math.random()) / 30 + 0.1;
    const dz = (0.5 - Math.random()) / 30 + 0.1;
    const item = { shape: mesh, dx, dy, dz, id };
    return item;
}


for (let k = 0; k < obj.birdsCount; k++) {
    const item = getNewBird(k);
    scene.add(item.shape);
    birdsObjects.push(item);
}



function adjustForBoundries(c) {
    const shape = c.shape;
    const adjust = obj.boundariesAdjust;
    if (shape.position.x < -obj.boundarySize) {
        c.dx += adjust;
    }

    if (shape.position.x > obj.boundarySize) {
        c.dx -= adjust;
    }

    if (shape.position.y < -PLANE_LEVEL) {
        c.dy += adjust;
    }

    if (shape.position.y > obj.boundarySize) {
        c.dy -= adjust;
    }

    if (shape.position.z < -obj.boundarySize) {
        c.dz += adjust;
    }

    if (shape.position.z > obj.boundarySize) {
        c.dz -= adjust;
    }
}


function adjustForFlock(i) {
    const adjust = obj.flockAdjust;
    let cx = 0;
    let cy = 0;
    let cz = 0;

    let count = 0;
    for (const c of birdsObjects) {
        if (c.id !== i.id) {
            if (distanceVector(i.shape.position, c.shape.position) < obj.visibility) {
                count++;
                cx += c.shape.position.x;
                cy += c.shape.position.y;
                cz += c.shape.position.z;
            }
        }
    }

    const factor = obj.sizePenalty ? Math.min(1, Math.max(0.2, (adjust * 1 / count) * 5)) : 1;

    if (count > 0) {
        i.dx += adjust * factor * ((cx / count) - i.shape.position.x);
        i.dy += adjust * factor * ((cy / count) - i.shape.position.y);
        i.dz += adjust * factor * ((cz / count) - i.shape.position.z);
    }
}

function adjustAlignment(i) {
    const adjust = obj.alignmentAdjust;
    let cx = 0;
    let cy = 0;
    let cz = 0;

    let count = 0;
    for (const c of birdsObjects) {
        if (c.id !== i.id) {
            if (distanceVector(i.shape.position, c.shape.position) < obj.visibility) {
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
    const distance = obj.minDistance;
    const adjust = obj.distanceAdjust;

    let ddx = 0;
    let ddy = 0;
    let ddz = 0;
    let count = 0;
    for (const c of birdsObjects) {
        if (c.id !== i.id) {
            if (distanceVector(i.shape.position, c.shape.position) < distance) {
                count++;
                ddx += ((i.shape.position.x - c.shape.position.x) * adjust);
                ddy += ((i.shape.position.y - c.shape.position.y) * adjust);
                ddz += ((i.shape.position.z - c.shape.position.z) * adjust);
            }
        }
    }

    if (count) {
        i.dx += ddx / count;
        i.dy += ddy / count;
        i.dz += ddz / count;
    }
}


function adjustSpeed(c) {
    if (c.dx < 0) {
        if (c.dx < -obj.speedLimit) {
            c.dx = -obj.speedLimit
        }
    }
    if (c.dy < 0) {
        if (c.dy < -obj.speedLimit) {
            c.dy = -obj.speedLimit
        }
    }
    if (c.dz < 0) {
        if (c.dz < -obj.speedLimit) {
            c.dz = -obj.speedLimit
        }
    }


    if (c.dx >= 0) {
        if (c.dx > obj.speedLimit) {
            c.dx = obj.speedLimit
        }
    }
    if (c.dy >= 0) {
        if (c.dy > obj.speedLimit) {
            c.dy = obj.speedLimit
        }
    }
    if (c.dz >= 0) {
        if (c.dz > obj.speedLimit) {
            c.dz = obj.speedLimit
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
    let radius = obj.cameraZ;
    angle += 0.001;
    camera.position.x = pointOfInterest.x + radius * Math.sin(angle);
    camera.position.z = pointOfInterest.z + radius * Math.cos(angle);
    camera.lookAt(pointOfInterest);
}

const render = function () {
    requestAnimationFrame(render);

    for (const c of birdsObjects) {
        adjustForBoundries(c);
        adjustForFlock(c);
        adjustAlignment(c);
        adjustForDistance(c);
        adjustSpeed(c);

        const shape = c.shape;


        shape.position.x += c.dx;
        shape.position.y += c.dy;
        shape.position.z += c.dz;

        var direction = new THREE.Vector3(c.dx, c.dy, c.dz);
        direction.normalize();
        var forward = new THREE.Vector3(0, 1, 0);
        var quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(forward, direction);
        shape.quaternion.copy(quaternion);
    }
    updateCameraPosition();
    renderer.render(scene, camera);
};

render();

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


