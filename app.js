const screens = {
  auth: document.getElementById('auth-screen'),
  creator: document.getElementById('creator-screen'),
  world: document.getElementById('world-screen')
};

const authMessage = document.getElementById('auth-message');
const coordsEl = document.getElementById('coords');
const moneyEl = document.getElementById('money');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const bodyColorInput = document.getElementById('body-color');
const clothColorInput = document.getElementById('cloth-color');

const defaultCharacter = {
  bodyColor: bodyColorInput.value,
  clothColor: clothColorInput.value,
  hair: 'short'
};

const state = {
  currentUser: null,
  money: 0,
  character: { ...defaultCharacter }
};

let creatorScene;
let worldScene;

function switchScreen(name) {
  Object.entries(screens).forEach(([key, node]) => {
    node.classList.toggle('active', key === name);
  });
}

function getUsers() {
  return JSON.parse(localStorage.getItem('wg2_users') ?? '{}');
}

function saveUsers(users) {
  localStorage.setItem('wg2_users', JSON.stringify(users));
}

function getSelectedHair() {
  const checked = document.querySelector('input[name="hair"]:checked');
  return checked?.value ?? 'short';
}


function validateCredentials(username, password) {
  if (username.length < 3) {
    return 'Логин должен быть минимум 3 символа.';
  }
  if (password.length < 4) {
    return 'Пароль должен быть минимум 4 символа.';
  }
  return '';
}

function buildCharacterMesh({ bodyColor, clothColor, hair }) {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: bodyColor });
  const clothMat = new THREE.MeshStandardMaterial({ color: clothColor });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#3d2b1f' });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.7), clothMat);
  body.position.y = 2.2;
  root.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), skinMat);
  head.position.y = 3.55;
  root.add(head);

  const armGeo = new THREE.BoxGeometry(0.35, 1.3, 0.35);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.95, 2.2, 0);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.95;
  root.add(leftArm, rightArm);

  const legGeo = new THREE.BoxGeometry(0.42, 1.3, 0.42);
  const leftLeg = new THREE.Mesh(legGeo, clothMat);
  leftLeg.position.set(-0.3, 0.8, 0);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.3;
  root.add(leftLeg, rightLeg);

  let hairMesh;
  if (hair === 'spike') {
    hairMesh = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.6, 5), hairMat);
    hairMesh.position.set(0, 4.3, 0);
  } else if (hair === 'bun') {
    hairMesh = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 1.05), hairMat);
    cap.position.y = 4.1;
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), hairMat);
    bun.position.set(0, 4.35, -0.45);
    hairMesh.add(cap, bun);
  } else {
    hairMesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.32, 1.02), hairMat);
    hairMesh.position.y = 4.08;
  }

  root.add(hairMesh);
  root.traverse((node) => {
    node.castShadow = true;
    node.receiveShadow = true;
  });

  return root;
}

function createBaseRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || canvas.offsetWidth || 500, canvas.clientHeight || 500, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

function setupLights(scene) {
  const amb = new THREE.AmbientLight('#ffffff', 0.55);
  const sun = new THREE.DirectionalLight('#fff4d8', 1.15);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  scene.add(amb, sun);
}

function initCreatorScene() {
  const canvas = document.getElementById('creator-canvas');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d141f');

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(3.6, 3.6, 5.2);
  camera.lookAt(0, 2.2, 0);

  const renderer = createBaseRenderer(canvas);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 30),
    new THREE.MeshStandardMaterial({ color: '#2f3b50', roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  floor.receiveShadow = true;

  scene.add(floor);
  setupLights(scene);

  let character = buildCharacterMesh(state.character);
  scene.add(character);

  const updateCharacter = () => {
    state.character = {
      bodyColor: bodyColorInput.value,
      clothColor: clothColorInput.value,
      hair: getSelectedHair()
    };
    scene.remove(character);
    character = buildCharacterMesh(state.character);
    scene.add(character);
  };

  [bodyColorInput, clothColorInput].forEach((input) => input.addEventListener('input', updateCharacter));
  document.querySelectorAll('input[name="hair"]').forEach((radio) => radio.addEventListener('change', updateCharacter));

  const resize = () => {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 420;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize();

  const animate = () => {
    if (!screens.creator.classList.contains('active')) {
      requestAnimationFrame(animate);
      return;
    }
    character.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  window.addEventListener('resize', resize);
  creatorScene = { resize };
}

function initWorldScene() {
  const canvas = document.getElementById('world-canvas');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fcaef');
  scene.fog = new THREE.Fog('#8fcaef', 18, 42);

  const renderer = createBaseRenderer(canvas);
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);

  const player = buildCharacterMesh(state.character);
  scene.add(player);

  const worldSize = 80;
  const buildCellSize = 4;
  const houseCost = 100;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize, worldSize),
    new THREE.MeshStandardMaterial({ color: '#74ad5d', roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  const grid = new THREE.GridHelper(worldSize, worldSize / buildCellSize, 0x2f5236, 0x2f5236);
  grid.position.y = 0.05;
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  scene.add(grid);

  for (let i = 0; i < 34; i += 1) {
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.5 + Math.random() * 1.8, 1),
      new THREE.MeshStandardMaterial({ color: '#98a7bb' })
    );
    rock.position.set((Math.random() - 0.5) * 65, rock.geometry.parameters.height / 2, (Math.random() - 0.5) * 65);
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    scene.add(rock);
  }

  setupLights(scene);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const builtCells = new Set();

  const getCellKey = (x, z) => `${x}:${z}`;

  const createHouse = (x, z) => {
    const house = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.2, 2.5),
      new THREE.MeshStandardMaterial({ color: '#ccb395' })
    );
    base.position.y = 1.1;

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: '#90433a' })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.0;

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.1, 0.08),
      new THREE.MeshStandardMaterial({ color: '#55382b' })
    );
    door.position.set(0, 0.6, 1.29);

    house.add(base, roof, door);
    house.position.set(x, 0, z);
    house.traverse((node) => {
      node.castShadow = true;
      node.receiveShadow = true;
    });

    scene.add(house);
  };

  const onWorldClick = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(ground)[0];
    if (!hit) return;

    const snappedX = Math.round(hit.point.x / buildCellSize) * buildCellSize;
    const snappedZ = Math.round(hit.point.z / buildCellSize) * buildCellSize;

    if (Math.abs(snappedX) > worldSize / 2 - buildCellSize || Math.abs(snappedZ) > worldSize / 2 - buildCellSize) {
      return;
    }

    const key = getCellKey(snappedX, snappedZ);
    if (builtCells.has(key) || state.money < houseCost) {
      return;
    }

    builtCells.add(key);
    createHouse(snappedX, snappedZ);
    state.money -= houseCost;
    updateMoneyHud();

    const users = getUsers();
    if (users[state.currentUser]) {
      users[state.currentUser].money = state.money;
      saveUsers(users);
    }
  };

  canvas.addEventListener('click', onWorldClick);

  const keys = new Set();
  const speed = 3.5;
  const passiveIncomePerSecond = 12;
  let moneyBuffer = 0;
  const bounds = 35;

  const directionMap = {
    KeyW: new THREE.Vector3(-1, 0, -1),
    KeyS: new THREE.Vector3(1, 0, 1),
    KeyA: new THREE.Vector3(-1, 0, 1),
    KeyD: new THREE.Vector3(1, 0, -1)
  };

  document.addEventListener('keydown', (event) => {
    if (directionMap[event.code]) {
      keys.add(event.code);
    }
  });

  document.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });

  let prev = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    moneyBuffer += passiveIncomePerSecond * dt;
    if (moneyBuffer >= 1) {
      const gained = Math.floor(moneyBuffer);
      moneyBuffer -= gained;
      state.money += gained;
    }

    const activeKey = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].find((code) => keys.has(code));
    if (activeKey) {
      const dir = directionMap[activeKey].clone().normalize();
      player.position.addScaledVector(dir, speed * dt);
      player.position.x = THREE.MathUtils.clamp(player.position.x, -bounds, bounds);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -bounds, bounds);
      player.rotation.y = Math.atan2(dir.x, dir.z);
    }

    camera.position.set(player.position.x + 9, player.position.y + 12, player.position.z + 9);
    camera.lookAt(player.position.x, player.position.y + 1.8, player.position.z);
    coordsEl.textContent = `X: ${player.position.x.toFixed(1)}, Z: ${player.position.z.toFixed(1)}`;
    updateMoneyHud();

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);
  worldScene = { resize };
}

function goToCreator() {
  switchScreen('creator');
  creatorScene?.resize();
}

function updateMoneyHud() {
  if (moneyEl) {
    moneyEl.textContent = `Деньги: ${state.money} монет`;
  }
}

document.getElementById('login-btn').addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const credentialError = validateCredentials(username, password);
  if (credentialError) {
    authMessage.textContent = credentialError;
    return;
  }

  const users = getUsers();

  if (users[username]?.password === password) {
    state.currentUser = username;
    state.character = users[username].character ?? { ...defaultCharacter };
    state.money = users[username].money ?? 200;
    bodyColorInput.value = state.character.bodyColor;
    clothColorInput.value = state.character.clothColor;
    const match = document.querySelector(`input[name="hair"][value="${state.character.hair}"]`);
    if (match) {
      match.checked = true;
    }
    authMessage.textContent = 'Успешный вход.';
    goToCreator();
  } else {
    authMessage.textContent = 'Неверный логин или пароль.';
  }
});

document.getElementById('register-btn').addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    authMessage.textContent = 'Заполни логин и пароль.';
    return;
  }

  const credentialError = validateCredentials(username, password);
  if (credentialError) {
    authMessage.textContent = credentialError;
    return;
  }

  const users = getUsers();
  if (users[username]) {
    authMessage.textContent = 'Пользователь уже существует.';
    return;
  }

  users[username] = { password, character: { ...defaultCharacter }, money: 200 };
  saveUsers(users);
  state.currentUser = username;
  state.money = 200;
  authMessage.textContent = 'Регистрация успешна. Настрой персонажа.';
  goToCreator();
});

document.getElementById('start-game-btn').addEventListener('click', () => {
  if (!state.currentUser) {
    return;
  }

  state.character = {
    bodyColor: bodyColorInput.value,
    clothColor: clothColorInput.value,
    hair: getSelectedHair()
  };

  const users = getUsers();
  if (users[state.currentUser]) {
    users[state.currentUser].character = state.character;
    users[state.currentUser].money = state.money;
    saveUsers(users);
  }

  switchScreen('world');
  if (!worldScene) {
    initWorldScene();
  } else {
    worldScene.resize();
  }
});

initCreatorScene();
switchScreen('auth');
