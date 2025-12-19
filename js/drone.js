/**
 * Класс Drone - физическая модель дрона-квадракоптера
 * Реализует уравнения движения для линейного и вращательного движения
 */

export class Drone {
    constructor(params = {}) {
        // Параметры дрона
        this.mass = params.mass || 1.0; // кг
        this.motorThrust = params.motorThrust || 2.5; // Н (максимальная тяга одного двигателя)
        this.motorDistance = params.motorDistance || 0.25; // м (расстояние от центра до двигателя)

        // Вычисление момента инерции (упрощенная модель - точечные массы на концах рамы)
        this.inertia = this.calculateInertia();

        // Состояние дрона - позиция
        this.position = { x: 0, y: 2, z: 0 }; // м (стартуем на высоте 2м)

        // Состояние дрона - скорость
        this.velocity = { x: 0, y: 0, z: 0 }; // м/с

        // Состояние дрона - ориентация (углы Эйлера)
        this.rotation = { roll: 0, pitch: 0, yaw: 0 }; // радианы

        // Состояние дрона - угловая скорость
        this.angularVelocity = { x: 0, y: 0, z: 0 }; // рад/с

        // Массивы для хранения предыдущих состояний (для интегральной составляющей)
        this.positionHistory = [];
        this.rotationHistory = [];

        // Константы
        this.gravity = 9.81; // м/с²
        this.dragCoefficient = 0.1; // коэффициент сопротивления воздуха

        // Тяга каждого двигателя (0-1, где 1 = максимальная тяга)
        this.motorSpeeds = [0.5, 0.5, 0.5, 0.5]; // [передний, правый, задний, левый]
    }

    /**
     * Вычисление момента инерции дрона
     */
    calculateInertia() {
        // Упрощенная модель: 4 двигателя как точечные массы
        const motorMass = this.mass / 8; // каждый двигатель - 1/8 от общей массы
        const frameMass = this.mass / 2; // рама - половина массы

        // Момент инерции для крестообразной конфигурации
        const Ixx = 2 * motorMass * Math.pow(this.motorDistance, 2);
        const Iyy = 2 * motorMass * Math.pow(this.motorDistance, 2);
        const Izz = 4 * motorMass * Math.pow(this.motorDistance, 2);

        return { x: Ixx, y: Iyy, z: Izz };
    }

    /**
     * Обновление параметров дрона
     */
    updateParameters(params) {
        if (params.mass !== undefined) this.mass = params.mass;
        if (params.motorThrust !== undefined) this.motorThrust = params.motorThrust;
        if (params.motorDistance !== undefined) this.motorDistance = params.motorDistance;

        // Пересчитываем момент инерции
        this.inertia = this.calculateInertia();
    }

    /**
     * Вычисление полной силы, действующей на дрон
     */
    calculateTotalForce(externalForces = { x: 0, y: 0, z: 0 }) {
        // Сила от двигателей (в локальной системе координат дрона)
        const totalThrust = this.motorSpeeds.reduce((sum, speed) => sum + speed, 0) * this.motorThrust;

        // Преобразование тяги в мировую систему координат
        // Тяга направлена вдоль оси Y в локальной системе дрона (вверх)
        const { roll, pitch, yaw } = this.rotation;

        // Правильное преобразование с использованием углов Эйлера (порядок XYZ)
        // Матрица поворота применяется к вектору [0, totalThrust, 0]

        // Сначала упрощенная версия для малых углов:
        // X компонента - наклон вперед (pitch) создает тягу вперед
        const thrustX = totalThrust * Math.sin(pitch);

        // Y компонента - вертикальная тяга, уменьшается при наклонах
        const thrustY = totalThrust * Math.cos(pitch) * Math.cos(roll);

        // Z компонента - наклон влево/вправо (roll) создает тягу в сторону
        // Знак минус, потому что положительный roll (наклон вправо) создает силу влево (-Z)
        const thrustZ = -totalThrust * Math.sin(roll) * Math.cos(pitch);

        // Сила тяжести (всегда направлена вниз)
        const gravityForce = { x: 0, y: -this.mass * this.gravity, z: 0 };

        // Сила сопротивления воздуха (пропорциональна скорости)
        const dragForce = {
            x: -this.dragCoefficient * this.velocity.x,
            y: -this.dragCoefficient * this.velocity.y,
            z: -this.dragCoefficient * this.velocity.z
        };

        // Суммарная сила
        return {
            x: thrustX + gravityForce.x + dragForce.x + externalForces.x,
            y: thrustY + gravityForce.y + dragForce.y + externalForces.y,
            z: thrustZ + gravityForce.z + dragForce.z + externalForces.z
        };
    }

    /**
     * Вычисление полного момента, действующего на дрон
     */
    calculateTotalTorque(externalTorques = { x: 0, y: 0, z: 0 }) {
        // Моменты от разницы в тягах двигателей
        // Конфигурация: 0-передний, 1-правый, 2-задний, 3-левый
        const [front, right, back, left] = this.motorSpeeds;

        // Момент по оси X (roll) - разница между правым/левым
        const torqueX = (right - left) * this.motorThrust * this.motorDistance;

        // Момент по оси Z (pitch) - разница между передним/задним
        const torqueZ = (front - back) * this.motorThrust * this.motorDistance;

        // Момент по оси Y (yaw) - реактивный момент от пропеллеров
        // (передний и задний крутятся в одну сторону, правый и левый - в другую)
        const torqueY = ((front + back) - (right + left)) * this.motorThrust * 0.05;

        // Демпфирование угловой скорости
        const angularDrag = 0.1;

        return {
            x: torqueX - angularDrag * this.angularVelocity.x + externalTorques.x,
            y: torqueY - angularDrag * this.angularVelocity.y + externalTorques.y,
            z: torqueZ - angularDrag * this.angularVelocity.z + externalTorques.z
        };
    }

    /**
     * Обновление состояния дрона (интегрирование уравнений движения)
     * @param {number} dt - временной шаг (секунды)
     * @param {object} externalForces - внешние силы
     * @param {object} externalTorques - внешние моменты
     */
    update(dt, externalForces = { x: 0, y: 0, z: 0 }, externalTorques = { x: 0, y: 0, z: 0 }) {
        // Вычисляем силы и моменты
        const totalForce = this.calculateTotalForce(externalForces);
        const totalTorque = this.calculateTotalTorque(externalTorques);

        // Линейное движение: F = ma => a = F/m
        const acceleration = {
            x: totalForce.x / this.mass,
            y: totalForce.y / this.mass,
            z: totalForce.z / this.mass
        };

        // Обновление скорости: v = v + a*dt
        this.velocity.x += acceleration.x * dt;
        this.velocity.y += acceleration.y * dt;
        this.velocity.z += acceleration.z * dt;

        // Обновление позиции: p = p + v*dt
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Ограничение по высоте (не даем упасть ниже земли)
        if (this.position.y < 0.1) {
            this.position.y = 0.1;
            this.velocity.y = Math.max(0, this.velocity.y); // убираем отрицательную скорость
        }

        // Вращательное движение: τ = Iα => α = τ/I
        const angularAcceleration = {
            x: totalTorque.x / this.inertia.x,
            y: totalTorque.y / this.inertia.y,
            z: totalTorque.z / this.inertia.z
        };

        // Обновление угловой скорости: ω = ω + α*dt
        this.angularVelocity.x += angularAcceleration.x * dt;
        this.angularVelocity.y += angularAcceleration.y * dt;
        this.angularVelocity.z += angularAcceleration.z * dt;

        // Обновление ориентации: θ = θ + ω*dt
        this.rotation.roll += this.angularVelocity.x * dt;
        this.rotation.pitch += this.angularVelocity.z * dt;
        this.rotation.yaw += this.angularVelocity.y * dt;

        // Нормализация углов (держим в диапазоне -π до π)
        this.rotation.roll = this.normalizeAngle(this.rotation.roll);
        this.rotation.pitch = this.normalizeAngle(this.rotation.pitch);
        this.rotation.yaw = this.normalizeAngle(this.rotation.yaw);

        // Сохраняем историю для интегральной составляющей
        this.positionHistory.push({ ...this.position });
        this.rotationHistory.push({ ...this.rotation });

        // Ограничиваем размер истории
        if (this.positionHistory.length > 100) {
            this.positionHistory.shift();
            this.rotationHistory.shift();
        }
    }

    /**
     * Нормализация угла в диапазон [-π, π]
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Установка скоростей двигателей
     * @param {Array<number>} speeds - массив из 4 значений от 0 до 1
     */
    setMotorSpeeds(speeds) {
        for (let i = 0; i < 4; i++) {
            this.motorSpeeds[i] = Math.max(0, Math.min(1, speeds[i]));
        }
    }

    /**
     * Сброс состояния дрона
     */
    reset() {
        this.position = { x: 0, y: 2, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { roll: 0, pitch: 0, yaw: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.motorSpeeds = [0.5, 0.5, 0.5, 0.5];
        this.positionHistory = [];
        this.rotationHistory = [];
    }

    /**
     * Получение текущего состояния дрона
     */
    getState() {
        return {
            position: { ...this.position },
            velocity: { ...this.velocity },
            rotation: { ...this.rotation },
            angularVelocity: { ...this.angularVelocity },
            motorSpeeds: [...this.motorSpeeds]
        };
    }
}

