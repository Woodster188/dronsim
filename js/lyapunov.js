/**
 * Класс LyapunovController - система стабилизации дрона
 * Использует PID контроллер и функцию Ляпунова для анализа устойчивости
 */

export class LyapunovController {
    constructor(params = {}) {
        // PID коэффициенты для позиции
        this.kpPos = params.kpPos || 10.0;
        this.kdPos = params.kdPos || 5.0;
        this.kiPos = params.kiPos || 0.1;

        // PID коэффициенты для ориентации
        this.kpRot = params.kpRot || 8.0;
        this.kdRot = params.kdRot || 4.0;
        this.kiRot = params.kiRot || 0.05;

        // Целевое состояние
        this.targetPosition = { x: 0, y: 2, z: 0 };
        this.targetRotation = { roll: 0, pitch: 0, yaw: 0 };

        // Интегральные ошибки
        this.integralPosError = { x: 0, y: 0, z: 0 };
        this.integralRotError = { roll: 0, pitch: 0, yaw: 0 };

        // Предыдущие ошибки для дифференциальной составляющей
        this.prevPosError = { x: 0, y: 0, z: 0 };
        this.prevRotError = { roll: 0, pitch: 0, yaw: 0 };

        // Значение функции Ляпунова
        this.lyapunovValue = 0;

        // Ограничения
        this.maxIntegralError = 10.0;
        this.maxControlForce = 20.0;
        this.maxControlTorque = 5.0;
    }

    /**
     * Обновление параметров контроллера
     */
    updateParameters(params) {
        if (params.kpPos !== undefined) this.kpPos = params.kpPos;
        if (params.kdPos !== undefined) this.kdPos = params.kdPos;
        if (params.kiPos !== undefined) this.kiPos = params.kiPos;
        if (params.kpRot !== undefined) this.kpRot = params.kpRot;
        if (params.kdRot !== undefined) this.kdRot = params.kdRot;
        if (params.kiRot !== undefined) this.kiRot = params.kiRot;
    }

    /**
     * Установка целевой позиции
     */
    setTargetPosition(x, y, z) {
        this.targetPosition = { x, y, z };
    }

    /**
     * Установка целевой ориентации
     */
    setTargetRotation(roll, pitch, yaw) {
        this.targetRotation = { roll, pitch, yaw };
    }

    /**
     * Вычисление ошибки позиции
     */
    calculatePositionError(dronePosition) {
        return {
            x: this.targetPosition.x - dronePosition.x,
            y: this.targetPosition.y - dronePosition.y,
            z: this.targetPosition.z - dronePosition.z
        };
    }

    /**
     * Вычисление ошибки ориентации
     */
    calculateRotationError(droneRotation) {
        return {
            roll: this.normalizeAngle(this.targetRotation.roll - droneRotation.roll),
            pitch: this.normalizeAngle(this.targetRotation.pitch - droneRotation.pitch),
            yaw: this.normalizeAngle(this.targetRotation.yaw - droneRotation.yaw)
        };
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
     * Вычисление функции Ляпунова V(x)
     * V(x) = 0.5 * (||position_error||² + ||rotation_error||² + ||velocity||² + ||angular_velocity||²)
     */
    calculateLyapunovFunction(drone) {
        const posError = this.calculatePositionError(drone.position);
        const rotError = this.calculateRotationError(drone.rotation);

        const posErrorSquared = posError.x * posError.x + posError.y * posError.y + posError.z * posError.z;
        const rotErrorSquared = rotError.roll * rotError.roll + rotError.pitch * rotError.pitch + rotError.yaw * rotError.yaw;
        const velocitySquared = drone.velocity.x * drone.velocity.x + drone.velocity.y * drone.velocity.y + drone.velocity.z * drone.velocity.z;
        const angVelSquared = drone.angularVelocity.x * drone.angularVelocity.x +
                             drone.angularVelocity.y * drone.angularVelocity.y +
                             drone.angularVelocity.z * drone.angularVelocity.z;

        this.lyapunovValue = 0.5 * (posErrorSquared + rotErrorSquared + velocitySquared + angVelSquared);
        return this.lyapunovValue;
    }

    /**
     * PID контроллер для позиции
     */
    computePositionControl(drone, dt) {
        // Вычисляем текущую ошибку
        const error = this.calculatePositionError(drone.position);

        // Пропорциональная составляющая
        const pTerm = {
            x: this.kpPos * error.x,
            y: this.kpPos * error.y,
            z: this.kpPos * error.z
        };

        // Интегральная составляющая
        this.integralPosError.x += error.x * dt;
        this.integralPosError.y += error.y * dt;
        this.integralPosError.z += error.z * dt;

        // Ограничение интегральной ошибки (anti-windup)
        this.integralPosError.x = Math.max(-this.maxIntegralError, Math.min(this.maxIntegralError, this.integralPosError.x));
        this.integralPosError.y = Math.max(-this.maxIntegralError, Math.min(this.maxIntegralError, this.integralPosError.y));
        this.integralPosError.z = Math.max(-this.maxIntegralError, Math.min(this.maxIntegralError, this.integralPosError.z));

        const iTerm = {
            x: this.kiPos * this.integralPosError.x,
            y: this.kiPos * this.integralPosError.y,
            z: this.kiPos * this.integralPosError.z
        };

        // Дифференциальная составляющая (используем скорость дрона)
        const dTerm = {
            x: -this.kdPos * drone.velocity.x,
            y: -this.kdPos * drone.velocity.y,
            z: -this.kdPos * drone.velocity.z
        };

        // Сохраняем текущую ошибку для следующей итерации
        this.prevPosError = error;

        // Суммарная управляющая сила
        let force = {
            x: pTerm.x + iTerm.x + dTerm.x,
            y: pTerm.y + iTerm.y + dTerm.y,
            z: pTerm.z + iTerm.z + dTerm.z
        };

        // Ограничение управляющей силы
        const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y + force.z * force.z);
        if (forceMagnitude > this.maxControlForce) {
            const scale = this.maxControlForce / forceMagnitude;
            force.x *= scale;
            force.y *= scale;
            force.z *= scale;
        }

        return force;
    }

    /**
     * PID контроллер для ориентации
     */
    computeRotationControl(drone, dt) {
        // Вычисляем текущую ошибку
        const error = this.calculateRotationError(drone.rotation);

        // Пропорциональная составляющая
        const pTerm = {
            roll: this.kpRot * error.roll,
            pitch: this.kpRot * error.pitch,
            yaw: this.kpRot * error.yaw
        };

        // Интегральная составляющая
        this.integralRotError.roll += error.roll * dt;
        this.integralRotError.pitch += error.pitch * dt;
        this.integralRotError.yaw += error.yaw * dt;

        // Ограничение интегральной ошибки
        this.integralRotError.roll = Math.max(-this.maxIntegralError, Math.min(this.maxIntegralError, this.integralRotError.roll));
        this.integralRotError.pitch = Math.max(-this.maxIntegralError, Math.min(this.maxIntegralError, this.integralRotError.pitch));
        this.integralRotError.yaw = Math.max(-this.maxIntegralError, Math.min(this.maxIntegralError, this.integralRotError.yaw));

        const iTerm = {
            roll: this.kiRot * this.integralRotError.roll,
            pitch: this.kiRot * this.integralRotError.pitch,
            yaw: this.kiRot * this.integralRotError.yaw
        };

        // Дифференциальная составляющая (используем угловую скорость)
        const dTerm = {
            roll: -this.kdRot * drone.angularVelocity.x,
            pitch: -this.kdRot * drone.angularVelocity.z,
            yaw: -this.kdRot * drone.angularVelocity.y
        };

        // Сохраняем текущую ошибку
        this.prevRotError = error;

        // Суммарный управляющий момент
        let torque = {
            x: pTerm.roll + iTerm.roll + dTerm.roll,
            y: pTerm.yaw + iTerm.yaw + dTerm.yaw,
            z: pTerm.pitch + iTerm.pitch + dTerm.pitch
        };

        // Ограничение управляющего момента
        const torqueMagnitude = Math.sqrt(torque.x * torque.x + torque.y * torque.y + torque.z * torque.z);
        if (torqueMagnitude > this.maxControlTorque) {
            const scale = this.maxControlTorque / torqueMagnitude;
            torque.x *= scale;
            torque.y *= scale;
            torque.z *= scale;
        }

        return torque;
    }

    /**
     * Вычисление управляющего воздействия (главный метод)
     * Возвращает скорости двигателей [0-1]
     */
    computeControl(drone, dt) {
        // Вычисляем функцию Ляпунова
        this.calculateLyapunovFunction(drone);

        // Вычисляем управляющие силы для позиции
        const controlForce = this.computePositionControl(drone, dt);

        // Преобразуем желаемые горизонтальные силы в желаемые углы наклона
        // Для движения по X нужен наклон по pitch (вперед/назад)
        // Для движения по Z нужен наклон по roll (влево/вправо)
        const totalThrust = drone.mass * drone.gravity + controlForce.y;
        const maxTiltAngle = Math.PI / 6; // ограничение ±30°

        // Желаемые углы для достижения горизонтальных сил
        let desiredPitch = 0;
        let desiredRoll = 0;

        if (totalThrust > 0.1) {
            // pitch контролирует движение по X (вперед/назад)
            // Малый угол: tan(pitch) ≈ F_x / F_y
            desiredPitch = Math.atan2(controlForce.x, totalThrust);

            // roll контролирует движение по Z (влево/вправо)
            // Знак минус: положительный roll (наклон вправо) → движение влево (-Z)
            // Поэтому для движения в +Z нужен отрицательный roll
            desiredRoll = Math.atan2(-controlForce.z, totalThrust);

            // Ограничиваем углы для безопасности
            desiredPitch = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, desiredPitch));
            desiredRoll = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, desiredRoll));
        }

        // Обновляем целевую ориентацию для каскадного управления
        const originalTargetRotation = { ...this.targetRotation };
        this.targetRotation.roll = desiredRoll;
        this.targetRotation.pitch = desiredPitch;
        // yaw остается как был задан

        // Вычисляем управляющие моменты для достижения желаемой ориентации
        const controlTorque = this.computeRotationControl(drone, dt);

        // Восстанавливаем оригинальную целевую ориентацию
        this.targetRotation = originalTargetRotation;

        // Преобразуем силы и моменты в скорости двигателей
        // Базовая тяга для компенсации гравитации
        const baseThrust = (drone.mass * drone.gravity) / (4 * drone.motorThrust);

        // Дополнительная тяга для управления по высоте
        const verticalThrust = controlForce.y / (4 * drone.motorThrust);

        // Распределение моментов на двигатели
        const rollControl = controlTorque.x / (2 * drone.motorThrust * drone.motorDistance);
        const pitchControl = controlTorque.z / (2 * drone.motorThrust * drone.motorDistance);
        const yawControl = controlTorque.y / (4 * drone.motorThrust * 0.05);

        // Вычисляем скорости каждого двигателя
        // Конфигурация: 0-передний, 1-правый, 2-задний, 3-левый
        const motorSpeeds = [
            baseThrust + verticalThrust + pitchControl + yawControl,  // передний
            baseThrust + verticalThrust + rollControl - yawControl,    // правый
            baseThrust + verticalThrust - pitchControl + yawControl,  // задний
            baseThrust + verticalThrust - rollControl - yawControl     // левый
        ];

        // Ограничиваем значения в диапазоне [0, 1]
        for (let i = 0; i < 4; i++) {
            motorSpeeds[i] = Math.max(0, Math.min(1, motorSpeeds[i]));
        }

        return {
            motorSpeeds,
            controlForce,
            controlTorque,
            desiredAngles: { roll: desiredRoll, pitch: desiredPitch }
        };
    }

    /**
     * Сброс интегральных ошибок
     */
    reset() {
        this.integralPosError = { x: 0, y: 0, z: 0 };
        this.integralRotError = { roll: 0, pitch: 0, yaw: 0 };
        this.prevPosError = { x: 0, y: 0, z: 0 };
        this.prevRotError = { roll: 0, pitch: 0, yaw: 0 };
        this.lyapunovValue = 0;
    }
}

