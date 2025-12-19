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
    getTotalExternalForces(dronePosition, currentTime) {
        this.time = currentTime;

        const windForce = this.getWindForce();
        const impulseForce = this.getImpulseForce(currentTime);
        const collisionForce = this.checkCollisions(dronePosition);

        // Сохраняем отдельные компоненты для визуализации
        this.lastForces = {
            wind: windForce,
            impulse: impulseForce,
            collision: collisionForce,
            total: {
                x: windForce.x + impulseForce.x + collisionForce.x,
                y: windForce.y + impulseForce.y + collisionForce.y,
                z: windForce.z + impulseForce.z + collisionForce.z
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
            total: { x: 0, y: 0, z: 0 }
        };
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
        this.time = 0;
    }
}

