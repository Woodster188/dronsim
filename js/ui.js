/**
 * Класс UIManager - управление пользовательским интерфейсом
 * Связывает UI с симуляцией
 */

export class UIManager {
    constructor(simulation) {
        this.simulation = simulation;

        // Элементы управления
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.demoBtn = document.getElementById('demoBtn');

        // Элементы визуализации
        this.showTargetInput = document.getElementById('showTarget');
        this.showForcesInput = document.getElementById('showForces');
        this.showTrajectoryInput = document.getElementById('showTrajectory');

        // Поля ввода параметров дрона
        this.massInput = document.getElementById('mass');
        this.motorThrustInput = document.getElementById('motorThrust');
        this.motorDistanceInput = document.getElementById('motorDistance');

        // Поля ввода внешних воздействий
        this.windSpeedInput = document.getElementById('windSpeed');
        this.windDirectionInput = document.getElementById('windDirection');
        this.impulseFrequencyInput = document.getElementById('impulseFrequency');
        this.impulseIntensityInput = document.getElementById('impulseIntensity');
        this.enableObstaclesInput = document.getElementById('enableObstacles');

        // Поля ввода контроллера
        this.kpPosInput = document.getElementById('kpPos');
        this.kdPosInput = document.getElementById('kdPos');
        this.kiPosInput = document.getElementById('kiPos');
        this.kpRotInput = document.getElementById('kpRot');
        this.kdRotInput = document.getElementById('kdRot');
        this.kiRotInput = document.getElementById('kiRot');

        // Информационные поля
        this.positionInfo = document.getElementById('positionInfo');
        this.velocityInfo = document.getElementById('velocityInfo');
        this.rotationInfo = document.getElementById('rotationInfo');
        this.lyapunovInfo = document.getElementById('lyapunovInfo');
        this.fpsInfo = document.getElementById('fpsInfo');

        // Привязка обработчиков событий
        this.bindEvents();
    }

    /**
     * Привязка обработчиков событий
     */
    bindEvents() {
        // Кнопки управления
        this.startBtn.addEventListener('click', () => this.onStart());
        this.pauseBtn.addEventListener('click', () => this.onPause());
        this.stopBtn.addEventListener('click', () => this.onStop());
        this.resetBtn.addEventListener('click', () => this.onReset());

        // Кнопка демо-режима (проверяем наличие)
        if (this.demoBtn) {
            this.demoBtn.addEventListener('click', () => this.onDemo());
        } else {
            console.error('❌ Кнопка demoBtn не найдена в DOM');
        }

        // Визуализация
        if (this.showTargetInput) {
            this.showTargetInput.addEventListener('change', () => this.onVisualizationChange());
        }
        if (this.showForcesInput) {
            this.showForcesInput.addEventListener('change', () => this.onVisualizationChange());
        }
        if (this.showTrajectoryInput) {
            this.showTrajectoryInput.addEventListener('change', () => this.onTrajectoryChange());
        }

        // Параметры дрона - обновляем при изменении
        this.massInput.addEventListener('change', () => this.updateDroneParameters());
        this.motorThrustInput.addEventListener('change', () => this.updateDroneParameters());
        this.motorDistanceInput.addEventListener('change', () => this.updateDroneParameters());

        // Внешние воздействия - обновляем при изменении
        this.windSpeedInput.addEventListener('change', () => this.updateExternalForces());
        this.windDirectionInput.addEventListener('change', () => this.updateExternalForces());
        this.impulseFrequencyInput.addEventListener('change', () => this.updateExternalForces());
        this.impulseIntensityInput.addEventListener('change', () => this.updateExternalForces());
        this.enableObstaclesInput.addEventListener('change', () => this.updateExternalForces());

        // Контроллер - обновляем при изменении
        this.kpPosInput.addEventListener('change', () => this.updateControllerParameters());
        this.kdPosInput.addEventListener('change', () => this.updateControllerParameters());
        this.kiPosInput.addEventListener('change', () => this.updateControllerParameters());
        this.kpRotInput.addEventListener('change', () => this.updateControllerParameters());
        this.kdRotInput.addEventListener('change', () => this.updateControllerParameters());
        this.kiRotInput.addEventListener('change', () => this.updateControllerParameters());
    }

    /**
     * Обработчик кнопки "Старт"
     */
    onStart() {
        this.simulation.start();
        this.updateButtonStates(true, false);
    }

    /**
     * Обработчик кнопки "Пауза"
     */
    onPause() {
        this.simulation.pause();
        this.updateButtonStates(false, true);
    }

    /**
     * Обработчик кнопки "Стоп"
     */
    onStop() {
        this.simulation.stop();
        this.updateButtonStates(false, true);
    }

    /**
     * Обработчик кнопки "Сброс"
     */
    onReset() {
        this.simulation.reset();
        this.updateInfo({
            position: { x: 0, y: 2, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 }
        }, 0);
    }

    /**
     * Обработчик кнопки "Демо-режим"
     */
    onDemo() {
        if (this.simulation.isDemoMode) {
            // Выходим из демо-режима
            this.simulation.exitDemoMode();
            this.demoBtn.textContent = '🎯 ДЕМО-РЕЖИМ СТАБИЛИЗАЦИИ';
            this.demoBtn.classList.remove('active-demo');
        } else {
            // Входим в демо-режим
            this.simulation.startDemoMode();
            this.demoBtn.textContent = '🔙 ВЫЙТИ ИЗ ДЕМО-РЕЖИМА';
            this.demoBtn.classList.add('active-demo');
        }
    }

    /**
     * Обработчик изменения визуализации
     */
    onVisualizationChange() {
        if (this.simulation && this.simulation.visualization) {
            if (this.showTargetInput) {
                this.simulation.visualization.setTargetVisualization(this.showTargetInput.checked);
            }
            if (this.showForcesInput) {
                this.simulation.visualization.setForceVisualization(this.showForcesInput.checked);
            }
        }
    }

    /**
     * Обработчик изменения траектории
     */
    onTrajectoryChange() {
        if (!this.showTrajectoryInput.checked) {
            this.simulation.visualization.clearTrajectory();
        }
    }

    /**
     * Обновление состояния кнопок
     */
    updateButtonStates(isRunning, isStopped) {
        this.startBtn.disabled = isRunning;
        this.pauseBtn.disabled = !isRunning;
        this.stopBtn.disabled = !isRunning;
    }

    /**
     * Обновление параметров дрона
     */
    updateDroneParameters() {
        const params = {
            mass: parseFloat(this.massInput.value),
            motorThrust: parseFloat(this.motorThrustInput.value),
            motorDistance: parseFloat(this.motorDistanceInput.value)
        };

        // Валидация
        if (this.validateDroneParameters(params)) {
            this.simulation.updateDroneParameters(params);
        }
    }

    /**
     * Валидация параметров дрона
     */
    validateDroneParameters(params) {
        if (params.mass <= 0 || params.mass > 10) {
            alert('Масса должна быть от 0.1 до 10 кг');
            return false;
        }
        if (params.motorThrust <= 0 || params.motorThrust > 20) {
            alert('Тяга двигателя должна быть от 1 до 20 Н');
            return false;
        }
        if (params.motorDistance <= 0 || params.motorDistance > 1) {
            alert('Расстояние между двигателями должно быть от 0.1 до 1 м');
            return false;
        }
        return true;
    }

    /**
     * Обновление параметров внешних воздействий
     */
    updateExternalForces() {
        const params = {
            windSpeed: parseFloat(this.windSpeedInput.value),
            windDirection: parseFloat(this.windDirectionInput.value),
            impulseFrequency: parseFloat(this.impulseFrequencyInput.value),
            impulseIntensity: parseFloat(this.impulseIntensityInput.value),
            obstaclesEnabled: this.enableObstaclesInput.checked
        };

        // Валидация
        if (this.validateExternalForces(params)) {
            this.simulation.updateExternalForces(params);
        }
    }

    /**
     * Валидация параметров внешних воздействий
     */
    validateExternalForces(params) {
        if (params.windSpeed < 0 || params.windSpeed > 20) {
            alert('Скорость ветра должна быть от 0 до 20 м/с');
            return false;
        }
        if (params.windDirection < 0 || params.windDirection > 360) {
            alert('Направление ветра должно быть от 0 до 360°');
            return false;
        }
        if (params.impulseFrequency < 0 || params.impulseFrequency > 5) {
            alert('Частота толчков должна быть от 0 до 5 раз/сек');
            return false;
        }
        if (params.impulseIntensity < 0 || params.impulseIntensity > 50) {
            alert('Интенсивность толчков должна быть от 0 до 50 Н');
            return false;
        }
        return true;
    }

    /**
     * Обновление параметров контроллера
     */
    updateControllerParameters() {
        const params = {
            kpPos: parseFloat(this.kpPosInput.value),
            kdPos: parseFloat(this.kdPosInput.value),
            kiPos: parseFloat(this.kiPosInput.value),
            kpRot: parseFloat(this.kpRotInput.value),
            kdRot: parseFloat(this.kdRotInput.value),
            kiRot: parseFloat(this.kiRotInput.value)
        };

        // Валидация
        if (this.validateControllerParameters(params)) {
            this.simulation.updateControllerParameters(params);
        }
    }

    /**
     * Валидация параметров контроллера
     */
    validateControllerParameters(params) {
        const keys = Object.keys(params);
        for (const key of keys) {
            if (params[key] < 0 || params[key] > 50) {
                alert(`Параметр ${key} должен быть от 0 до 50`);
                return false;
            }
        }
        return true;
    }

    /**
     * Обновление информационной панели
     */
    updateInfo(droneState, lyapunovValue) {
        // Позиция
        this.positionInfo.textContent = `${droneState.position.x.toFixed(2)}, ${droneState.position.y.toFixed(2)}, ${droneState.position.z.toFixed(2)}`;

        // Скорость (модуль вектора скорости)
        const velocityMagnitude = Math.sqrt(
            droneState.velocity.x ** 2 +
            droneState.velocity.y ** 2 +
            droneState.velocity.z ** 2
        );
        this.velocityInfo.textContent = velocityMagnitude.toFixed(2);

        // Ориентация (в градусах)
        const rollDeg = (droneState.rotation.roll * 180 / Math.PI).toFixed(1);
        const pitchDeg = (droneState.rotation.pitch * 180 / Math.PI).toFixed(1);
        const yawDeg = (droneState.rotation.yaw * 180 / Math.PI).toFixed(1);
        this.rotationInfo.textContent = `${rollDeg}, ${pitchDeg}, ${yawDeg}`;

        // Функция Ляпунова
        this.lyapunovInfo.textContent = lyapunovValue.toFixed(4);
    }

    /**
     * Обновление FPS
     */
    updateFPS(fps) {
        this.fpsInfo.textContent = fps.toFixed(0);
    }

    /**
     * Получение текущих параметров из UI
     */
    getCurrentParameters() {
        return {
            drone: {
                mass: parseFloat(this.massInput.value),
                motorThrust: parseFloat(this.motorThrustInput.value),
                motorDistance: parseFloat(this.motorDistanceInput.value)
            },
            externalForces: {
                windSpeed: parseFloat(this.windSpeedInput.value),
                windDirection: parseFloat(this.windDirectionInput.value),
                impulseFrequency: parseFloat(this.impulseFrequencyInput.value),
                impulseIntensity: parseFloat(this.impulseIntensityInput.value),
                obstaclesEnabled: this.enableObstaclesInput.checked
            },
            controller: {
                kpPos: parseFloat(this.kpPosInput.value),
                kdPos: parseFloat(this.kdPosInput.value),
                kiPos: parseFloat(this.kiPosInput.value),
                kpRot: parseFloat(this.kpRotInput.value),
                kdRot: parseFloat(this.kdRotInput.value),
                kiRot: parseFloat(this.kiRotInput.value)
            }
        };
    }

    /**
     * Установка параметров в UI
     */
    setParameters(params) {
        // Параметры дрона
        this.massInput.value = params.drone.mass;
        this.motorThrustInput.value = params.drone.motorThrust;
        this.motorDistanceInput.value = params.drone.motorDistance;

        // Внешние воздействия
        this.windSpeedInput.value = params.externalForces.windSpeed;
        this.windDirectionInput.value = params.externalForces.windDirection;
        this.impulseFrequencyInput.value = params.externalForces.impulseFrequency;
        this.impulseIntensityInput.value = params.externalForces.impulseIntensity;
        this.enableObstaclesInput.checked = params.externalForces.obstaclesEnabled;

        // Контроллер
        this.kpPosInput.value = params.controller.kpPos;
        this.kdPosInput.value = params.controller.kdPos;
        this.kiPosInput.value = params.controller.kiPos;
        this.kpRotInput.value = params.controller.kpRot;
        this.kdRotInput.value = params.controller.kdRot;
        this.kiRotInput.value = params.controller.kiRot;
    }

    /**
     * Установка состояния чекбоксов визуализации
     */
    setVisualizationCheckboxes(target, forces, trajectory) {
        this.showTargetInput.checked = target;
        this.showForcesInput.checked = forces;
        this.showTrajectoryInput.checked = trajectory;
    }
}

