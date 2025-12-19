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

