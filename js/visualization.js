/**
 * Класс Visualization - 3D визуализация дрона с использованием Three.js
 */

export class Visualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        // Three.js компоненты
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // 3D модель дрона
        this.droneGroup = null;
        this.droneBody = null;
        this.droneMotors = [];
        this.propellers = [];

        // Визуализация препятствий
        this.obstacleMeshes = [];

        // Визуализация банок с огурцами 🥒
        this.pickleJarMeshes = {};

        // Визуализация осей координат
        this.axesHelper = null;

        // Визуализация траектории
        this.trajectoryPoints = [];
        this.trajectoryLine = null;
        this.maxTrajectoryPoints = 200;

        // Визуализация целевой точки
        this.targetMarker = null;

        // Визуализация векторов сил
        this.forceArrows = {
            wind: null,
            impulse: null,
            control: null,
            total: null
        };

        // Инициализация
        this.init();
    }

    /**
     * Инициализация 3D сцены
     */
    init() {
        // Создание сцены
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.Fog(0x0a0a1a, 10, 50);

        // Создание камеры
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 2, 0);

        // Создание рендерера
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Управление камерой (OrbitControls)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 2, 0);

        // Освещение
        this.setupLighting();

        // Создание дрона
        this.createDrone();

        // Создание окружения
        this.createEnvironment();

        // Система координат
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);

        // Создание маркера целевой точки
        this.createTargetMarker();

        // Создание стрелок для визуализации сил
        this.createForceArrows();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    /**
     * Настройка освещения
     */
    setupLighting() {
        // Ambient light (общее освещение)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (направленный свет с тенями)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Point light (точечный свет для дополнительного освещения)
        const pointLight = new THREE.PointLight(0x667eea, 1, 100);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }

    /**
     * Создание 3D модели дрона
     */
    createDrone() {
        this.droneGroup = new THREE.Group();

        // Центральное тело (рама)
        const bodyGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x667eea,
            shininess: 100
        });
        this.droneBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.droneBody.castShadow = true;
        this.droneGroup.add(this.droneBody);

        // Создание 4 двигателей и пропеллеров
        const motorPositions = [
            { x: 0, y: 0, z: 0.25 },  // передний
            { x: 0.25, y: 0, z: 0 },  // правый
            { x: 0, y: 0, z: -0.25 }, // задний
            { x: -0.25, y: 0, z: 0 }  // левый
        ];

        const motorGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16);
        const motorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

        const propellerGeometry = new THREE.BoxGeometry(0.2, 0.01, 0.04);
        const propellerMaterial = new THREE.MeshPhongMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < 4; i++) {
            // Двигатель
            const motor = new THREE.Mesh(motorGeometry, motorMaterial);
            motor.position.set(motorPositions[i].x, motorPositions[i].y, motorPositions[i].z);
            motor.castShadow = true;
            this.droneMotors.push(motor);
            this.droneGroup.add(motor);

            // Пропеллер (крест из двух лопастей)
            const propellerGroup = new THREE.Group();

            const blade1 = new THREE.Mesh(propellerGeometry, propellerMaterial);
            blade1.position.y = 0.05;
            propellerGroup.add(blade1);

            const blade2 = new THREE.Mesh(propellerGeometry, propellerMaterial);
            blade2.rotation.y = Math.PI / 2;
            blade2.position.y = 0.05;
            propellerGroup.add(blade2);

            propellerGroup.position.set(motorPositions[i].x, motorPositions[i].y, motorPositions[i].z);
            this.propellers.push(propellerGroup);
            this.droneGroup.add(propellerGroup);

            // Соединительные балки
            const armGeometry = new THREE.BoxGeometry(0.25, 0.02, 0.02);
            const armMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
            const arm = new THREE.Mesh(armGeometry, armMaterial);

            if (i === 0 || i === 2) {
                arm.position.set(0, 0, motorPositions[i].z / 2);
            } else {
                arm.rotation.y = Math.PI / 2;
                arm.position.set(motorPositions[i].x / 2, 0, 0);
            }

            arm.castShadow = true;
            this.droneGroup.add(arm);
        }

        // Добавляем группу дрона в сцену
        this.scene.add(this.droneGroup);

        // Инициализация траектории
        this.initTrajectory();
    }

    /**
     * Инициализация визуализации траектории
     */
    initTrajectory() {
        const trajectoryGeometry = new THREE.BufferGeometry();
        const trajectoryMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2
        });

        this.trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
        this.scene.add(this.trajectoryLine);
    }

    /**
     * Создание окружения (пол, сетка)
     */
    createEnvironment() {
        // Пол
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Сетка на полу
        const gridHelper = new THREE.GridHelper(50, 50, 0x667eea, 0x333333);
        this.scene.add(gridHelper);
    }

    /**
     * Обновление позиции и ориентации дрона
     */
    updateDrone(droneState) {
        if (!this.droneGroup) return;

        // Обновление позиции
        this.droneGroup.position.set(
            droneState.position.x,
            droneState.position.y,
            droneState.position.z
        );

        // Обновление ориентации (углы Эйлера)
        this.droneGroup.rotation.set(
            droneState.rotation.roll,
            droneState.rotation.yaw,
            droneState.rotation.pitch,
            'XYZ'
        );

        // Анимация пропеллеров (вращение)
        for (let i = 0; i < this.propellers.length; i++) {
            const speed = droneState.motorSpeeds[i] * 50; // скорость вращения
            const direction = (i === 0 || i === 2) ? 1 : -1; // чередуем направление
            this.propellers[i].rotation.y += speed * direction * 0.016; // ~60 FPS
        }
    }

    /**
     * Обновление траектории полета
     */
    updateTrajectory(position, enabled = true) {
        if (!enabled) return;

        this.trajectoryPoints.push(new THREE.Vector3(position.x, position.y, position.z));

        // Ограничиваем количество точек
        if (this.trajectoryPoints.length > this.maxTrajectoryPoints) {
            this.trajectoryPoints.shift();
        }

        // Обновляем геометрию линии
        if (this.trajectoryLine && this.trajectoryPoints.length > 1) {
            this.trajectoryLine.geometry.setFromPoints(this.trajectoryPoints);
        }
    }

    /**
     * Очистка траектории
     */
    clearTrajectory() {
        this.trajectoryPoints = [];
        if (this.trajectoryLine) {
            this.trajectoryLine.geometry.setFromPoints([]);
        }
    }

    /**
     * Создание маркера целевой точки
     */
    createTargetMarker() {
        const markerGroup = new THREE.Group();

        // Центральная сфера
        const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        markerGroup.add(sphere);

        // Кольца вокруг целевой точки
        const ringGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 32);
        const ringMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.4
        });

        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.rotation.x = Math.PI / 2;
        markerGroup.add(ring1);

        const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring2.rotation.y = Math.PI / 2;
        markerGroup.add(ring2);

        const ring3 = new THREE.Mesh(ringGeometry, ringMaterial);
        markerGroup.add(ring3);

        // По умолчанию на высоте 2м
        markerGroup.position.set(0, 2, 0);

        this.targetMarker = markerGroup;
        this.scene.add(markerGroup);
    }

    /**
     * Создание стрелок для визуализации сил
     */
    createForceArrows() {
        // Стрелка для ветра (голубая)
        this.forceArrows.wind = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0x00bfff,
            0.2,
            0.15
        );
        this.scene.add(this.forceArrows.wind);

        // Стрелка для импульсов (оранжевая)
        this.forceArrows.impulse = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0xff8c00,
            0.2,
            0.15
        );
        this.scene.add(this.forceArrows.impulse);

        // Стрелка для банок с огурцами (зеленая с желтым)
        this.forceArrows.pickleJar = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0x88ff44,
            0.25,
            0.18
        );
        this.scene.add(this.forceArrows.pickleJar);

        // Стрелка для управляющей силы (зеленая)
        this.forceArrows.control = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0x00ff00,
            0.2,
            0.15
        );
        this.scene.add(this.forceArrows.control);

        // Стрелка для суммарной внешней силы (красная)
        this.forceArrows.total = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0xff0000,
            0.3,
            0.2
        );
        this.scene.add(this.forceArrows.total);
    }

    /**
     * Обновление визуализации целевой точки
     */
    updateTargetMarker(targetPosition) {
        if (this.targetMarker) {
            this.targetMarker.position.set(
                targetPosition.x,
                targetPosition.y,
                targetPosition.z
            );

            // Анимация колец
            const time = Date.now() * 0.001;
            this.targetMarker.children[1].rotation.z = time;
            this.targetMarker.children[2].rotation.z = time * 1.2;
            this.targetMarker.children[3].rotation.z = time * 0.8;
        }
    }

    /**
     * Создание 3D модели банки с огурцами
     */
    createPickleJarMesh() {
        const jarGroup = new THREE.Group();

        // Стеклянная банка (цилиндр)
        const jarGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16);
        const jarMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ff88,
            transparent: true,
            opacity: 0.6,
            shininess: 100
        });
        const jar = new THREE.Mesh(jarGeometry, jarMaterial);
        jarGroup.add(jar);

        // Крышка банки
        const lidGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16);
        const lidMaterial = new THREE.MeshPhongMaterial({
            color: 0xffdd44,
            shininess: 50
        });
        const lid = new THREE.Mesh(lidGeometry, lidMaterial);
        lid.position.y = 0.085;
        jarGroup.add(lid);

        // Этикетка
        const labelGeometry = new THREE.CylinderGeometry(0.081, 0.081, 0.06, 16);
        const labelMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 30
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 0;
        jarGroup.add(label);

        // Огурцы внутри (маленькие зеленые цилиндры)
        for (let i = 0; i < 3; i++) {
            const pickleGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8);
            const pickleMaterial = new THREE.MeshPhongMaterial({
                color: 0x228822
            });
            const pickle = new THREE.Mesh(pickleGeometry, pickleMaterial);
            pickle.position.x = (Math.random() - 0.5) * 0.04;
            pickle.position.y = (Math.random() - 0.5) * 0.06;
            pickle.position.z = (Math.random() - 0.5) * 0.04;
            pickle.rotation.z = Math.random() * Math.PI;
            jarGroup.add(pickle);
        }

        jarGroup.castShadow = true;
        return jarGroup;
    }

    /**
     * Создание эффекта разбития банки
     */
    createShatterEffect(position) {
        const particleCount = 15;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            // Осколки стекла
            const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
            const material = new THREE.MeshPhongMaterial({
                color: i < 10 ? 0x88ff88 : 0xffdd44, // стекло или крышка
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.set(position.x, position.y, position.z);

            // Случайная скорость разлета
            particle.userData.velocity = {
                x: (Math.random() - 0.5) * 3,
                y: Math.random() * 2 + 1,
                z: (Math.random() - 0.5) * 3
            };
            particle.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10
            };
            particle.userData.lifetime = 0;

            this.scene.add(particle);
            particles.push(particle);
        }

        // Анимация частиц
        const animateParticles = () => {
            const dt = 0.016;
            const gravity = -9.81;
            let allDone = true;

            for (const particle of particles) {
                if (particle.userData.lifetime < 1.5) {
                    allDone = false;

                    // Гравитация
                    particle.userData.velocity.y += gravity * dt;

                    // Обновление позиции
                    particle.position.x += particle.userData.velocity.x * dt;
                    particle.position.y += particle.userData.velocity.y * dt;
                    particle.position.z += particle.userData.velocity.z * dt;

                    // Вращение
                    particle.rotation.x += particle.userData.rotationSpeed.x * dt;
                    particle.rotation.y += particle.userData.rotationSpeed.y * dt;
                    particle.rotation.z += particle.userData.rotationSpeed.z * dt;

                    // Затухание
                    particle.material.opacity = 0.8 * (1 - particle.userData.lifetime / 1.5);

                    particle.userData.lifetime += dt;

                    // Остановка при касании земли
                    if (particle.position.y <= 0.05) {
                        particle.position.y = 0.05;
                        particle.userData.velocity.y = 0;
                        particle.userData.velocity.x *= 0.9;
                        particle.userData.velocity.z *= 0.9;
                    }
                }
            }

            if (!allDone) {
                requestAnimationFrame(animateParticles);
            } else {
                // Удаляем частицы
                for (const particle of particles) {
                    this.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            }
        };

        animateParticles();
    }

    /**
     * Обновление визуализации банок с огурцами
     */
    updatePickleJars(pickleJars) {
        // Получаем текущие ID банок
        const currentJarIds = new Set(pickleJars.map(jar => jar.id));

        // Удаляем mesh для банок, которых больше нет
        for (const id in this.pickleJarMeshes) {
            if (!currentJarIds.has(parseFloat(id))) {
                const mesh = this.pickleJarMeshes[id];

                // Если банка была близко к земле, создаем эффект разбития
                if (mesh.position.y < 0.3) {
                    this.createShatterEffect(mesh.position);
                }

                this.scene.remove(mesh);
                mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                delete this.pickleJarMeshes[id];
            }
        }

        // Обновляем или создаем mesh для текущих банок
        for (const jar of pickleJars) {
            if (!this.pickleJarMeshes[jar.id]) {
                // Создаем новый mesh
                this.pickleJarMeshes[jar.id] = this.createPickleJarMesh();
                this.scene.add(this.pickleJarMeshes[jar.id]);
            }

            // Обновляем позицию и вращение
            const mesh = this.pickleJarMeshes[jar.id];
            mesh.position.set(jar.position.x, jar.position.y, jar.position.z);
            mesh.rotation.set(jar.rotation.x, jar.rotation.y, jar.rotation.z);

            // Визуальный эффект при падении (банка слегка деформируется)
            if (jar.isFalling) {
                const wobble = Math.sin(jar.rotation.x * 3) * 0.1 + 1;
                mesh.scale.set(wobble, 1 / wobble, wobble);
            } else {
                mesh.scale.set(1, 1, 1);
            }

            // Добавляем эффект при столкновении (вспышка)
            if (jar.hasCollided && !jar.userData?.flashShown) {
                // Временно увеличиваем яркость материалов
                mesh.traverse((child) => {
                    if (child.material) {
                        const originalEmissive = child.material.emissive?.getHex() || 0x000000;
                        child.material.emissive = new THREE.Color(0xffff00);
                        child.material.emissiveIntensity = 0.5;

                        setTimeout(() => {
                            if (child.material) {
                                child.material.emissive = new THREE.Color(originalEmissive);
                                child.material.emissiveIntensity = 0;
                            }
                        }, 100);
                    }
                });

                jar.userData = jar.userData || {};
                jar.userData.flashShown = true;
            }
        }
    }

    /**
     * Обновление визуализации векторов сил
     */
    updateForceVectors(dronePosition, forces) {
        const scale = 0.5; // масштаб для визуализации
        const origin = new THREE.Vector3(
            dronePosition.x,
            dronePosition.y,
            dronePosition.z
        );

        // Ветер
        if (forces.wind) {
            const windMagnitude = Math.sqrt(
                forces.wind.x ** 2 + forces.wind.y ** 2 + forces.wind.z ** 2
            );
            if (windMagnitude > 0.01) {
                const windDir = new THREE.Vector3(
                    forces.wind.x,
                    forces.wind.y,
                    forces.wind.z
                ).normalize();
                this.forceArrows.wind.position.copy(origin);
                this.forceArrows.wind.setDirection(windDir);
                this.forceArrows.wind.setLength(windMagnitude * scale, 0.2, 0.15);
                this.forceArrows.wind.visible = true;
            } else {
                this.forceArrows.wind.visible = false;
            }
        }

        // Импульс
        if (forces.impulse) {
            const impulseMagnitude = Math.sqrt(
                forces.impulse.x ** 2 + forces.impulse.y ** 2 + forces.impulse.z ** 2
            );
            if (impulseMagnitude > 0.01) {
                const impulseDir = new THREE.Vector3(
                    forces.impulse.x,
                    forces.impulse.y,
                    forces.impulse.z
                ).normalize();
                this.forceArrows.impulse.position.copy(origin);
                this.forceArrows.impulse.setDirection(impulseDir);
                this.forceArrows.impulse.setLength(impulseMagnitude * scale * 0.3, 0.2, 0.15);
                this.forceArrows.impulse.visible = true;
            } else {
                this.forceArrows.impulse.visible = false;
            }
        }

        // Банки с огурцами
        if (forces.pickleJar) {
            const pickleJarMagnitude = Math.sqrt(
                forces.pickleJar.x ** 2 + forces.pickleJar.y ** 2 + forces.pickleJar.z ** 2
            );
            if (pickleJarMagnitude > 0.01) {
                const pickleJarDir = new THREE.Vector3(
                    forces.pickleJar.x,
                    forces.pickleJar.y,
                    forces.pickleJar.z
                ).normalize();
                this.forceArrows.pickleJar.position.copy(origin);
                this.forceArrows.pickleJar.setDirection(pickleJarDir);
                this.forceArrows.pickleJar.setLength(pickleJarMagnitude * scale * 0.35, 0.25, 0.18);
                this.forceArrows.pickleJar.visible = true;
            } else {
                this.forceArrows.pickleJar.visible = false;
            }
        }

        // Суммарная внешняя сила
        if (forces.total) {
            const totalMagnitude = Math.sqrt(
                forces.total.x ** 2 + forces.total.y ** 2 + forces.total.z ** 2
            );
            if (totalMagnitude > 0.01) {
                const totalDir = new THREE.Vector3(
                    forces.total.x,
                    forces.total.y,
                    forces.total.z
                ).normalize();
                this.forceArrows.total.position.copy(origin);
                this.forceArrows.total.setDirection(totalDir);
                this.forceArrows.total.setLength(totalMagnitude * scale, 0.3, 0.2);
                this.forceArrows.total.visible = true;
            } else {
                this.forceArrows.total.visible = false;
            }
        }
    }

    /**
     * Включение/выключение визуализации сил
     */
    setForceVisualization(enabled) {
        for (const arrow of Object.values(this.forceArrows)) {
            if (arrow) arrow.visible = enabled;
        }
    }

    /**
     * Включение/выключение визуализации целевой точки
     */
    setTargetVisualization(enabled) {
        if (this.targetMarker) {
            this.targetMarker.visible = enabled;
        }
    }

    /**
     * Визуализация препятствий
     */
    updateObstacles(obstacles, enabled) {
        // Удаляем старые препятствия
        for (const mesh of this.obstacleMeshes) {
            this.scene.remove(mesh);
        }
        this.obstacleMeshes = [];

        // Создаем новые, если включено
        if (enabled) {
            for (const obstacle of obstacles) {
                const geometry = new THREE.SphereGeometry(obstacle.radius, 32, 32);
                const material = new THREE.MeshPhongMaterial({
                    color: 0xff4444,
                    transparent: true,
                    opacity: 0.6
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(
                    obstacle.position.x,
                    obstacle.position.y,
                    obstacle.position.z
                );
                mesh.castShadow = true;

                this.scene.add(mesh);
                this.obstacleMeshes.push(mesh);
            }
        }
    }

    /**
     * Рендеринг сцены
     */
    render() {
        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Обработка изменения размера окна
     */
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Очистка ресурсов
     */
    dispose() {
        window.removeEventListener('resize', this.onWindowResize);

        // Очищаем банки с огурцами
        for (const id in this.pickleJarMeshes) {
            this.scene.remove(this.pickleJarMeshes[id]);
            this.pickleJarMeshes[id].traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.pickleJarMeshes = {};

        if (this.renderer) {
            this.renderer.dispose();
        }

        // Очистка геометрий и материалов
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}

