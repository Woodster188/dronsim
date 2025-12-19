/**
 * Класс Simulation - основной класс симуляции
 * Объединяет все компоненты и управляет циклом симуляции
 */

import { Drone } from './drone.js';
import { LyapunovController } from './lyapunov.js';
import { ExternalForces } from './externalForces.js';
import { Visualization } from './visualization.js';
import { UIManager } from './ui.js';
import { KeyboardControl } from './keyboardControl.js';

class Simulation {
    constructor() {
        // Компоненты системы
        this.drone = null;
        this.controller = null;
        this.externalForces = null;
        this.visualization = null;
        this.uiManager = null;
        this.keyboardControl = null;

        // Состояние симуляции
        this.isRunning = false;
        this.isPaused = false;
        this.time = 0;
        this.isDemoMode = false;

        // Параметры физики
        this.fixedTimeStep = 1 / 60; // 60 Hz для физики
        this.accumulator = 0;
        this.maxAccumulator = 0.25; // максимум 250ms накопленного времени

        // Параметры для отслеживания производительности
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        this.fpsUpdateInterval = 0.5; // обновляем FPS каждые 0.5 сек
        this.lastFpsUpdate = 0;

        // Инициализация
        this.init();
    }

    /**
     * Инициализация всех компонентов
     */
    init() {
        // Создаем визуализацию
        this.visualization = new Visualization('canvas-container');

        // Создаем дрон
        this.drone = new Drone({
            mass: 1.0,
            motorThrust: 2.5,
            motorDistance: 0.25
        });

        // Создаем контроллер стабилизации
        this.controller = new LyapunovController({
            kpPos: 10.0,
            kdPos: 5.0,
            kiPos: 0.1,
            kpRot: 8.0,
            kdRot: 4.0,
            kiRot: 0.05
        });

        // Создаем систему внешних воздействий
        this.externalForces = new ExternalForces({
            windSpeed: 0,
            windDirection: 0,
            impulseFrequency: 0.5,
            impulseIntensity: 5,
            obstaclesEnabled: false
        });

        // Создаем UI менеджер
        this.uiManager = new UIManager(this);

        // Создаем управление с клавиатуры
        this.keyboardControl = new KeyboardControl(this);

        // Обновляем визуализацию препятствий
        this.visualization.updateObstacles(
            this.externalForces.getObstacles(),
            false
        );

        // Начальное обновление визуализации
        this.visualization.updateDrone(this.drone.getState());
        this.visualization.render();

        console.log('✅ Симуляция инициализирована');
    }

    /**
     * Запуск симуляции
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now() / 1000;
        this.lastFpsUpdate = this.lastTime;

        console.log('▶ Симуляция запущена');
        this.animate();
    }

    /**
     * Пауза симуляции
     */
    pause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? '⏸ Симуляция на паузе' : '▶ Симуляция возобновлена');
    }

    /**
     * Остановка симуляции
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        console.log('⏹ Симуляция остановлена');
    }

    /**
     * Сброс симуляции
     */
    reset() {
        this.drone.reset();
        this.controller.reset();
        this.externalForces.reset();
        this.visualization.clearTrajectory();
        this.keyboardControl.reset();
        this.time = 0;
        this.accumulator = 0;

        // Обновляем визуализацию
        this.visualization.updateDrone(this.drone.getState());
        this.visualization.render();

        console.log('🔄 Симуляция сброшена');
    }

    /**
     * Запуск демонстрационного режима стабилизации
     */
    startDemoMode() {
        console.log('🎯 Запуск демо-режима стабилизации...');
        console.log('🎯 ЦЕЛЬ: Удержание дрона в точке (0, 2, 0) - начало координат на высоте 2м');

        // Сохраняем текущие параметры
        this.savedParams = this.uiManager.getCurrentParameters();

        // Устанавливаем демо-параметры для лучшей визуализации
        const demoParams = {
            drone: {
                mass: 1.0,
                motorThrust: 3.0,
                motorDistance: 0.25
            },
            externalForces: {
                windSpeed: 8.0,           // Сильный ветер (действует по всем осям)
                windDirection: 45,         // Под углом 45°
                impulseFrequency: 1.5,     // Частые толчки (1.5 раз/сек)
                impulseIntensity: 15,      // Сильные толчки в случайных направлениях 3D
                obstaclesEnabled: false
            },
            controller: {
                kpPos: 12.0,  // Более агрессивный контроллер
                kdPos: 6.0,
                kiPos: 0.2,
                kpRot: 10.0,
                kdRot: 5.0,
                kiRot: 0.1
            }
        };

        // Применяем демо-параметры
        this.drone.updateParameters(demoParams.drone);
        this.externalForces.updateParameters(demoParams.externalForces);
        this.controller.updateParameters(demoParams.controller);

        // Явно устанавливаем целевую позицию в начало координат
        this.controller.setTargetPosition(0, 2, 0);
        this.controller.setTargetRotation(0, 0, 0);

        // Обновляем UI
        this.uiManager.setParameters(demoParams);

        // Сбрасываем позицию дрона в начало координат
        this.reset();
        this.drone.position = { x: 0, y: 2, z: 0 };
        this.drone.velocity = { x: 0, y: 0, z: 0 };
        this.drone.rotation = { roll: 0, pitch: 0, yaw: 0 };
        this.drone.angularVelocity = { x: 0, y: 0, z: 0 };

        this.isDemoMode = true;

        // Включаем визуализацию
        this.visualization.setTargetVisualization(true);
        this.visualization.setForceVisualization(true);
        this.uiManager.setVisualizationCheckboxes(true, true, true);

        // Запускаем симуляцию
        if (!this.isRunning) {
            this.start();
        }

        console.log('🎯 Демо-режим стабилизации активирован!');
        console.log('📊 Воздействия:');
        console.log('   - Ветер: 8 м/с (3D: горизонталь + вертикальные потоки)');
        console.log('   - Толчки: 1.5 раз/сек × 15 Н (случайные направления в 3D)');
        console.log('   - Цель: (0, 2, 0) - центр координат');
    }

    /**
     * Выход из демо-режима
     */
    exitDemoMode() {
        if (this.isDemoMode && this.savedParams) {
            // Восстанавливаем сохраненные параметры
            this.drone.updateParameters(this.savedParams.drone);
            this.externalForces.updateParameters(this.savedParams.externalForces);
            this.controller.updateParameters(this.savedParams.controller);
            this.uiManager.setParameters(this.savedParams);

            this.isDemoMode = false;
            console.log('🔙 Демо-режим завершен, параметры восстановлены');
        }
    }

    /**
     * Обновление параметров дрона
     */
    updateDroneParameters(params) {
        this.drone.updateParameters(params);
        console.log('⚙️ Параметры дрона обновлены:', params);
    }

    /**
     * Обновление параметров внешних воздействий
     */
    updateExternalForces(params) {
        this.externalForces.updateParameters(params);
        this.visualization.updateObstacles(
            this.externalForces.getObstacles(),
            params.obstaclesEnabled
        );
        console.log('🌪️ Внешние воздействия обновлены:', params);
    }

    /**
     * Обновление параметров контроллера
     */
    updateControllerParameters(params) {
        this.controller.updateParameters(params);
        console.log('🎯 Параметры контроллера обновлены:', params);
    }

    /**
     * Основной цикл симуляции
     */
    animate() {
        if (!this.isRunning) return;

        // Запрашиваем следующий кадр
        requestAnimationFrame(() => this.animate());

        // Если на паузе, просто рендерим
        if (this.isPaused) {
            this.visualization.render();
            return;
        }

        // Вычисляем deltaTime
        const currentTime = performance.now() / 1000;
        let deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Ограничиваем deltaTime для стабильности
        if (deltaTime > 0.1) deltaTime = 0.1;

        // Добавляем к аккумулятору
        this.accumulator += deltaTime;

        // Ограничиваем аккумулятор
        if (this.accumulator > this.maxAccumulator) {
            this.accumulator = this.maxAccumulator;
        }

        // Фиксированный шаг времени для физики (можем делать несколько итераций за кадр)
        while (this.accumulator >= this.fixedTimeStep) {
            // Обновляем управление с клавиатуры
            this.keyboardControl.update(this.fixedTimeStep);

            this.updatePhysics(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
            this.time += this.fixedTimeStep;
        }

        // Обновляем визуализацию
        this.visualization.updateDrone(this.drone.getState());

        // Обновляем визуализацию целевой точки
        this.visualization.updateTargetMarker(this.controller.targetPosition);

        // Обновляем визуализацию векторов сил
        const forces = this.externalForces.getLastForces();
        this.visualization.updateForceVectors(this.drone.position, forces);

        // Обновляем траекторию (проверяем чекбокс)
        const showTrajectory = document.getElementById('showTrajectory')?.checked ?? true;
        this.visualization.updateTrajectory(this.drone.position, showTrajectory);

        this.visualization.render();

        // Обновляем UI
        this.uiManager.updateInfo(
            this.drone.getState(),
            this.controller.lyapunovValue
        );

        // Обновляем FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = this.frameCount / (currentTime - this.lastFpsUpdate);
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            this.uiManager.updateFPS(this.fps);
        }
    }

    /**
     * Обновление физики (вызывается с фиксированным шагом времени)
     */
    updatePhysics(dt) {
        // 1. Получаем управляющее воздействие от контроллера
        const control = this.controller.computeControl(this.drone, dt);

        // 2. Устанавливаем скорости двигателей
        this.drone.setMotorSpeeds(control.motorSpeeds);

        // 3. Получаем внешние силы
        const externalForces = this.externalForces.getTotalExternalForces(
            this.drone.position,
            this.time
        );

        // Внешние моменты (пока нет, но можно добавить)
        const externalTorques = { x: 0, y: 0, z: 0 };

        // 4. Обновляем состояние дрона
        this.drone.update(dt, externalForces, externalTorques);

        // 5. Проверяем критические состояния
        this.checkCriticalStates();
    }

    /**
     * Проверка критических состояний
     */
    checkCriticalStates() {
        // Проверка на падение
        if (this.drone.position.y <= 0.05) {
            console.warn('⚠️ Дрон упал на землю');
        }

        // Проверка на слишком большой крен/тангаж
        const maxTiltAngle = Math.PI / 3; // 60 градусов
        if (Math.abs(this.drone.rotation.roll) > maxTiltAngle ||
            Math.abs(this.drone.rotation.pitch) > maxTiltAngle) {
            console.warn('⚠️ Слишком большой угол наклона');
        }

        // Проверка на выход за границы
        const maxDistance = 20;
        const distance = Math.sqrt(
            this.drone.position.x ** 2 +
            this.drone.position.z ** 2
        );
        if (distance > maxDistance) {
            console.warn('⚠️ Дрон вышел за границы симуляции');
        }
    }
}

// Создаем и запускаем симуляцию при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚁 Инициализация симуляции дрона...');

    // Проверяем доступность Three.js
    if (typeof THREE === 'undefined') {
        console.error('❌ Three.js не загружен');
        alert('Ошибка: Three.js не загружен. Проверьте подключение библиотеки.');
        return;
    }

    // Создаем симуляцию
    window.simulation = new Simulation();

    console.log('✅ Готово! Нажмите "Старт" для запуска симуляции.');
});

