/**
 * Класс ExternalForces - система внешних воздействий на дрон
 * Включает ветер, импульсные толчки и препятствия
 */

export class ExternalForces {
    constructor(params = {}) {
        // Параметры ветра
        this.windSpeed = params.windSpeed || 0; // м/с
        this.windDirection = params.windDirection || 0; // градусы (0 = по оси X)
        this.windTurbulence = 0.2; // коэффициент турбулентности

        // Параметры импульсных толчков
        this.impulseFrequency = params.impulseFrequency || 0.5; // раз в секунду
        this.impulseIntensity = params.impulseIntensity || 5; // Н
        this.lastImpulseTime = 0;
        this.currentImpulse = { x: 0, y: 0, z: 0 };
        this.impulseDuration = 0.1; // секунды
        this.impulseStartTime = -1;

        // Параметры препятствий
        this.obstaclesEnabled = params.obstaclesEnabled || false;
        this.obstacles = this.generateObstacles();
        this.collisionDistance = 0.5; // м (расстояние, на котором начинает действовать отталкивание)
        this.collisionStiffness = 50; // коэффициент жесткости отталкивания

        // Параметры летающих банок с огурцами 🥒
        this.pickleJarsEnabled = params.pickleJarsEnabled || false;
        this.pickleJarFrequency = params.pickleJarFrequency || 0.3; // раз в секунду
        this.pickleJarSpeed = params.pickleJarSpeed || 3.0; // м/с
        this.pickleJarImpactForce = params.pickleJarImpactForce || 10; // Н
        this.activePickleJars = []; // массив активных банок
        this.lastPickleJarTime = 0;
        this.pickleJarCollisionRadius = 0.3; // м (радиус столкновения)

        // Временная переменная для отслеживания
        this.time = 0;
    }

    /**
     * Обновление параметров
     */
    updateParameters(params) {
        if (params.windSpeed !== undefined) this.windSpeed = params.windSpeed;
        if (params.windDirection !== undefined) this.windDirection = params.windDirection;
        if (params.impulseFrequency !== undefined) this.impulseFrequency = params.impulseFrequency;
        if (params.impulseIntensity !== undefined) this.impulseIntensity = params.impulseIntensity;
        if (params.obstaclesEnabled !== undefined) this.obstaclesEnabled = params.obstaclesEnabled;
        if (params.pickleJarsEnabled !== undefined) this.pickleJarsEnabled = params.pickleJarsEnabled;
        if (params.pickleJarFrequency !== undefined) this.pickleJarFrequency = params.pickleJarFrequency;
        if (params.pickleJarSpeed !== undefined) this.pickleJarSpeed = params.pickleJarSpeed;
        if (params.pickleJarImpactForce !== undefined) this.pickleJarImpactForce = params.pickleJarImpactForce;
    }

    /**
     * Генерация случайных препятствий в пространстве
     */
    generateObstacles() {
        const obstacles = [];
        const numObstacles = 5;

        for (let i = 0; i < numObstacles; i++) {
            obstacles.push({
                position: {
                    x: (Math.random() - 0.5) * 10, // от -5 до 5
                    y: Math.random() * 4 + 1, // от 1 до 5
                    z: (Math.random() - 0.5) * 10
                },
                radius: Math.random() * 0.5 + 0.3 // от 0.3 до 0.8
            });
        }

        return obstacles;
    }

    /**
     * Вычисление силы ветра с учетом турбулентности
     */
    getWindForce() {
        if (this.windSpeed === 0) {
            return { x: 0, y: 0, z: 0 };
        }

        // Преобразование направления ветра из градусов в радианы
        const directionRad = this.windDirection * Math.PI / 180;

        // Базовая сила ветра в горизонтальной плоскости
        const baseWindX = this.windSpeed * Math.cos(directionRad);
        const baseWindZ = this.windSpeed * Math.sin(directionRad);

        // Вертикальная компонента ветра (восходящие/нисходящие потоки)
        // Используем синусоиду для плавных изменений + небольшую случайность
        const verticalWind = Math.sin(this.time * 0.5) * this.windSpeed * 0.3 +
                            (Math.random() - 0.5) * this.windSpeed * 0.2;

        // Добавление турбулентности (случайные флуктуации) для всех осей
        const turbulenceX = (Math.random() - 0.5) * this.windSpeed * this.windTurbulence;
        const turbulenceY = (Math.random() - 0.5) * this.windSpeed * this.windTurbulence * 0.8; // сильнее по вертикали
        const turbulenceZ = (Math.random() - 0.5) * this.windSpeed * this.windTurbulence;

        // Сила ветра пропорциональна квадрату скорости и площади (упрощенная модель)
        const dragCoefficient = 0.3;

        return {
            x: (baseWindX + turbulenceX) * dragCoefficient,
            y: (verticalWind + turbulenceY) * dragCoefficient,
            z: (baseWindZ + turbulenceZ) * dragCoefficient
        };
    }

    /**
     * Вычисление импульсной силы (случайные толчки)
     */
    getImpulseForce(currentTime) {
        // Проверяем, нужно ли создать новый импульс
        if (this.impulseFrequency > 0) {
            const timeSinceLastImpulse = currentTime - this.lastImpulseTime;
            const impulseInterval = 1.0 / this.impulseFrequency;

            if (timeSinceLastImpulse >= impulseInterval) {
                // Создаем новый импульс в полностью случайном 3D направлении
                // Используем сферические координаты для равномерного распределения
                const randomAzimuth = Math.random() * 2 * Math.PI; // 0-360° горизонтальный угол
                const randomElevation = (Math.random() - 0.5) * Math.PI; // ±90° вертикальный угол

                // Преобразуем в декартовы координаты
                const horizontalComponent = Math.cos(randomElevation);

                this.currentImpulse = {
                    x: this.impulseIntensity * Math.cos(randomAzimuth) * horizontalComponent,
                    y: this.impulseIntensity * Math.sin(randomElevation),
                    z: this.impulseIntensity * Math.sin(randomAzimuth) * horizontalComponent
                };

                this.lastImpulseTime = currentTime;
                this.impulseStartTime = currentTime;
            }
        }

        // Проверяем, действует ли текущий импульс
        if (this.impulseStartTime >= 0 && (currentTime - this.impulseStartTime) < this.impulseDuration) {
            // Импульс затухает линейно
            const remainingTime = this.impulseDuration - (currentTime - this.impulseStartTime);
            const factor = remainingTime / this.impulseDuration;

            return {
                x: this.currentImpulse.x * factor,
                y: this.currentImpulse.y * factor,
                z: this.currentImpulse.z * factor
            };
        } else {
            return { x: 0, y: 0, z: 0 };
        }
    }

    /**
     * Создание новой банки с огурцами
     */
    spawnPickleJar(dronePosition) {
        // Случайное направление подлета (сферические координаты)
        const azimuth = Math.random() * 2 * Math.PI; // 0-360°
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5; // ±45°

        // Начальная позиция на расстоянии 15 метров от дрона
        const spawnDistance = 15;
        const horizontalComponent = Math.cos(elevation);

        const spawnPosition = {
            x: dronePosition.x + spawnDistance * Math.cos(azimuth) * horizontalComponent,
            y: dronePosition.y + spawnDistance * Math.sin(elevation),
            z: dronePosition.z + spawnDistance * Math.sin(azimuth) * horizontalComponent
        };

        // Направление к дрону (нормализованный вектор)
        const dx = dronePosition.x - spawnPosition.x;
        const dy = dronePosition.y - spawnPosition.y;
        const dz = dronePosition.z - spawnPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const direction = {
            x: dx / distance,
            y: dy / distance,
            z: dz / distance
        };

        // Скорость банки
        const velocity = {
            x: direction.x * this.pickleJarSpeed,
            y: direction.y * this.pickleJarSpeed,
            z: direction.z * this.pickleJarSpeed
        };

        // Создаем объект банки
        const jar = {
            id: Date.now() + Math.random(), // уникальный ID
            position: spawnPosition,
            velocity: velocity,
            rotation: { x: 0, y: 0, z: 0 }, // для визуализации вращения
            rotationSpeed: {
                x: (Math.random() - 0.5) * 6,
                y: (Math.random() - 0.5) * 4,
                z: (Math.random() - 0.5) * 2
            }, // случайная скорость вращения
            hasCollided: false,
            isFalling: false, // флаг падения
            spawnTime: this.time
        };

        this.activePickleJars.push(jar);
        console.log('🥒 Банка с огурцами запущена!');
    }

    /**
     * Обновление позиций банок с огурцами
     */
    updatePickleJars(dronePosition, dt) {
        if (!this.pickleJarsEnabled) return { x: 0, y: 0, z: 0 };

        // Проверяем, нужно ли создать новую банку
        if (this.pickleJarFrequency > 0) {
            const timeSinceLastJar = this.time - this.lastPickleJarTime;
            const jarInterval = 1.0 / this.pickleJarFrequency;

            if (timeSinceLastJar >= jarInterval) {
                this.spawnPickleJar(dronePosition);
                this.lastPickleJarTime = this.time;
            }
        }

        let totalForce = { x: 0, y: 0, z: 0 };
        const gravity = -9.81; // м/с² (ускорение свободного падения)

        // Обновляем позиции существующих банок
        for (let i = this.activePickleJars.length - 1; i >= 0; i--) {
            const jar = this.activePickleJars[i];

            // Если банка падает, применяем гравитацию
            if (jar.isFalling) {
                jar.velocity.y += gravity * dt; // ускорение вниз

                // Добавляем небольшое сопротивление воздуха
                const airResistance = 0.98;
                jar.velocity.x *= airResistance;
                jar.velocity.z *= airResistance;

                // Увеличиваем скорость вращения при падении
                jar.rotationSpeed.x *= 1.05;
                jar.rotationSpeed.y *= 1.05;
                jar.rotationSpeed.z *= 1.05;
            }

            // Обновляем позицию
            jar.position.x += jar.velocity.x * dt;
            jar.position.y += jar.velocity.y * dt;
            jar.position.z += jar.velocity.z * dt;

            // Обновляем вращение для визуализации
            jar.rotation.x += jar.rotationSpeed.x * dt;
            jar.rotation.y += jar.rotationSpeed.y * dt;
            jar.rotation.z += jar.rotationSpeed.z * dt;

            // Проверяем столкновение с землей
            if (jar.position.y <= 0.1 && jar.isFalling) {
                // Банка упала на землю - удаляем её
                this.activePickleJars.splice(i, 1);
                console.log('🥒 Банка упала на землю и разбилась!');
                continue;
            }

            // Проверяем столкновение с дроном (только если банка еще не падает)
            if (!jar.hasCollided && !jar.isFalling) {
                const dx = jar.position.x - dronePosition.x;
                const dy = jar.position.y - dronePosition.y;
                const dz = jar.position.z - dronePosition.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < this.pickleJarCollisionRadius) {
                    // Столкновение! Создаем импульсную силу на дрон
                    const impactDirection = {
                        x: jar.velocity.x,
                        y: jar.velocity.y,
                        z: jar.velocity.z
                    };

                    const velocityMagnitude = Math.sqrt(
                        impactDirection.x ** 2 +
                        impactDirection.y ** 2 +
                        impactDirection.z ** 2
                    );

                    if (velocityMagnitude > 0.01) {
                        // Сила на дрон
                        totalForce.x += (impactDirection.x / velocityMagnitude) * this.pickleJarImpactForce;
                        totalForce.y += (impactDirection.y / velocityMagnitude) * this.pickleJarImpactForce;
                        totalForce.z += (impactDirection.z / velocityMagnitude) * this.pickleJarImpactForce;

                        // Банка отскакивает от дрона (упругое столкновение)
                        // Вектор нормали от дрона к банке
                        const normalX = dx / distance;
                        const normalY = dy / distance;
                        const normalZ = dz / distance;

                        // Коэффициент упругости (0.5 = частично упругий удар)
                        const restitution = 0.5;

                        // Вычисляем проекцию скорости на нормаль
                        const velocityDotNormal =
                            jar.velocity.x * normalX +
                            jar.velocity.y * normalY +
                            jar.velocity.z * normalZ;

                        // Отражаем скорость относительно нормали
                        jar.velocity.x = jar.velocity.x - 2 * velocityDotNormal * normalX;
                        jar.velocity.y = jar.velocity.y - 2 * velocityDotNormal * normalY;
                        jar.velocity.z = jar.velocity.z - 2 * velocityDotNormal * normalZ;

                        // Применяем коэффициент упругости и добавляем случайное вращение
                        jar.velocity.x *= restitution;
                        jar.velocity.y *= restitution;
                        jar.velocity.z *= restitution;

                        // Добавляем случайное отклонение (банка кувыркается)
                        jar.velocity.x += (Math.random() - 0.5) * 2;
                        jar.velocity.y += (Math.random() - 0.5) * 2;
                        jar.velocity.z += (Math.random() - 0.5) * 2;

                        // Увеличиваем вращение после удара
                        jar.rotationSpeed.x += (Math.random() - 0.5) * 10;
                        jar.rotationSpeed.y += (Math.random() - 0.5) * 10;
                        jar.rotationSpeed.z += (Math.random() - 0.5) * 10;

                        // Помечаем банку как упавшую и начинаем падение
                        jar.hasCollided = true;
                        jar.isFalling = true;

                        console.log('💥 Банка попала в дрон и отлетела!');
                    }
                }
            }

            // Удаляем банки, которые улетели слишком далеко или живут слишком долго
            const distanceFromOrigin = Math.sqrt(
                jar.position.x ** 2 +
                jar.position.y ** 2 +
                jar.position.z ** 2
            );

            const lifetime = this.time - jar.spawnTime;

            if (distanceFromOrigin > 50 || lifetime > 30) {
                this.activePickleJars.splice(i, 1);
            }
        }

        return totalForce;
    }

    /**
     * Проверка коллизий с препятствиями и вычисление силы отталкивания
     */
    checkCollisions(dronePosition) {
        if (!this.obstaclesEnabled) {
            return { x: 0, y: 0, z: 0 };
        }

        let totalForce = { x: 0, y: 0, z: 0 };

        for (const obstacle of this.obstacles) {
            // Вычисляем расстояние до препятствия
            const dx = dronePosition.x - obstacle.position.x;
            const dy = dronePosition.y - obstacle.position.y;
            const dz = dronePosition.z - obstacle.position.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Проверяем, находимся ли мы в зоне влияния препятствия
            const effectiveDistance = this.collisionDistance + obstacle.radius;

            if (distance < effectiveDistance) {
                // Вычисляем силу отталкивания (обратно пропорциональна расстоянию)
                const penetration = effectiveDistance - distance;
                const forceMagnitude = this.collisionStiffness * penetration;

                // Направление силы - от препятствия к дрону
                if (distance > 0.01) { // избегаем деления на ноль
                    const forceX = (dx / distance) * forceMagnitude;
                    const forceY = (dy / distance) * forceMagnitude;
                    const forceZ = (dz / distance) * forceMagnitude;

                    totalForce.x += forceX;
                    totalForce.y += forceY;
                    totalForce.z += forceZ;
                }
            }
        }

        return totalForce;
    }

    /**
     * Вычисление всех внешних сил
     */
    getTotalExternalForces(dronePosition, currentTime, dt = 0.016) {
        this.time = currentTime;

        const windForce = this.getWindForce();
        const impulseForce = this.getImpulseForce(currentTime);
        const collisionForce = this.checkCollisions(dronePosition);
        const pickleJarForce = this.updatePickleJars(dronePosition, dt);

        // Сохраняем отдельные компоненты для визуализации
        this.lastForces = {
            wind: windForce,
            impulse: impulseForce,
            collision: collisionForce,
            pickleJar: pickleJarForce,
            total: {
                x: windForce.x + impulseForce.x + collisionForce.x + pickleJarForce.x,
                y: windForce.y + impulseForce.y + collisionForce.y + pickleJarForce.y,
                z: windForce.z + impulseForce.z + collisionForce.z + pickleJarForce.z
            }
        };

        return this.lastForces.total;
    }

    /**
     * Получение последних сил для визуализации
     */
    getLastForces() {
        return this.lastForces || {
            wind: { x: 0, y: 0, z: 0 },
            impulse: { x: 0, y: 0, z: 0 },
            collision: { x: 0, y: 0, z: 0 },
            pickleJar: { x: 0, y: 0, z: 0 },
            total: { x: 0, y: 0, z: 0 }
        };
    }

    /**
     * Получение списка активных банок для визуализации
     */
    getActivePickleJars() {
        return this.activePickleJars;
    }

    /**
     * Получение списка препятствий для визуализации
     */
    getObstacles() {
        return this.obstacles;
    }

    /**
     * Сброс состояния
     */
    reset() {
        this.lastImpulseTime = 0;
        this.impulseStartTime = -1;
        this.currentImpulse = { x: 0, y: 0, z: 0 };
        this.lastPickleJarTime = 0;
        this.activePickleJars = [];
        this.time = 0;
    }
}

