/**
 * Класс TrainingMode - автоматическая оптимизация параметров PID контроллера
 * Использует функцию Ляпунова как критерий качества
 */

export class TrainingMode {
    constructor(simulation) {
        this.simulation = simulation;

        // Состояние обучения
        this.isTraining = false;
        this.currentIteration = 0;
        this.totalIterations = 50;

        // История обучения
        this.history = [];
        this.bestParams = null;
        this.bestScore = Infinity;

        // Параметры оптимизации
        this.learningRate = 0.1;
        this.testDuration = 10; // секунды симуляции для одного теста

        // Диапазоны параметров для поиска
        this.paramRanges = {
            kpPos: { min: 5, max: 20 },
            kdPos: { min: 2, max: 10 },
            kiPos: { min: 0.05, max: 0.5 },
            kpRot: { min: 5, max: 15 },
            kdRot: { min: 2, max: 8 },
            kiRot: { min: 0.01, max: 0.2 }
        };

        console.log('🎓 Режим обучения инициализирован');
    }

    /**
     * Запуск процесса обучения
     */
    async startTraining() {
        if (this.isTraining) {
            console.warn('⚠️ Обучение уже запущено');
            return;
        }

        console.log('🎓 НАЧАЛО ОБУЧЕНИЯ');
        console.log(`📊 Будет протестировано ${this.totalIterations} комбинаций параметров`);

        this.isTraining = true;
        this.currentIteration = 0;
        this.history = [];
        this.bestScore = Infinity;

        // Сохраняем исходные параметры
        this.originalParams = this.simulation.uiManager.getCurrentParameters();

        // Останавливаем текущую симуляцию
        if (this.simulation.isRunning) {
            this.simulation.stop();
        }

        // Выключаем управление с клавиатуры
        if (this.simulation.keyboardControl.enabled) {
            this.simulation.keyboardControl.disable();
        }

        // Устанавливаем стандартные воздействия для тестирования
        this.setupTestConditions();

        // Обновляем UI
        this.updateUI();

        // Начинаем итерации
        await this.runIterations();
    }

    /**
     * Настройка условий тестирования
     */
    setupTestConditions() {
        const testParams = {
            windSpeed: 6.0,
            windDirection: 45,
            impulseFrequency: 2.0,
            impulseIntensity: 12,
            obstaclesEnabled: false
        };

        this.simulation.externalForces.updateParameters(testParams);
        console.log('🌪️ Условия тестирования установлены:', testParams);
    }

    /**
     * Выполнение всех итераций обучения
     */
    async runIterations() {
        for (let i = 0; i < this.totalIterations; i++) {
            if (!this.isTraining) {
                console.log('⏸️ Обучение остановлено пользователем');
                break;
            }

            this.currentIteration = i + 1;

            // Генерируем параметры
            let params;
            if (i === 0) {
                // Первая итерация - текущие параметры
                params = this.simulation.uiManager.getCurrentParameters().controller;
            } else if (i < 10) {
                // Первые 10 итераций - случайный поиск
                params = this.generateRandomParams();
            } else {
                // Остальные - улучшение лучших найденных
                params = this.generateImprovedParams();
            }

            // Тестируем параметры
            const score = await this.evaluateParams(params);

            // Сохраняем результат
            this.history.push({ params, score, iteration: i + 1 });

            // Обновляем лучший результат
            if (score < this.bestScore) {
                this.bestScore = score;
                this.bestParams = { ...params };
                console.log(`✨ Новый лучший результат! Итерация ${i + 1}, Score: ${score.toFixed(4)}`);
                console.log('   Параметры:', params);
            }

            // Обновляем UI
            this.updateUI();

            // Небольшая задержка для визуализации
            await this.sleep(100);
        }

        // Завершение обучения
        this.finishTraining();
    }

    /**
     * Генерация случайных параметров
     */
    generateRandomParams() {
        const params = {};
        for (const [key, range] of Object.entries(this.paramRanges)) {
            params[key] = range.min + Math.random() * (range.max - range.min);
        }
        return params;
    }

    /**
     * Генерация улучшенных параметров на основе лучших найденных
     */
    generateImprovedParams() {
        if (!this.bestParams) {
            return this.generateRandomParams();
        }

        const params = {};
        for (const [key, range] of Object.entries(this.paramRanges)) {
            // Добавляем шум к лучшим параметрам
            const noise = (Math.random() - 0.5) * (range.max - range.min) * 0.2;
            let value = this.bestParams[key] + noise;

            // Ограничиваем диапазоном
            value = Math.max(range.min, Math.min(range.max, value));
            params[key] = value;
        }
        return params;
    }

    /**
     * Оценка качества параметров
     */
    async evaluateParams(params) {
        // Применяем параметры к контроллеру
        this.simulation.controller.updateParameters(params);

        // Сбрасываем симуляцию
        this.simulation.reset();

        // Устанавливаем начальную позицию с небольшим смещением
        this.simulation.drone.position = { x: 2, y: 3, z: -1.5 };
        this.simulation.drone.velocity = { x: 0, y: 0, z: 0 };

        // Целевая позиция в центре
        this.simulation.controller.setTargetPosition(0, 2, 0);

        // Запускаем симуляцию
        if (!this.simulation.isRunning) {
            this.simulation.start();
        }

        // Собираем данные во время симуляции
        const lyapunovValues = [];
        const startTime = this.simulation.time;
        const dt = this.simulation.fixedTimeStep;
        const steps = Math.floor(this.testDuration / dt);

        for (let step = 0; step < steps; step++) {
            // Обновляем физику
            this.simulation.keyboardControl.update(dt);
            this.simulation.updatePhysics(dt);

            // Собираем значение функции Ляпунова
            const V = this.simulation.controller.lyapunovValue;
            lyapunovValues.push(V);

            this.simulation.time += dt;
        }

        // Останавливаем симуляцию
        this.simulation.stop();

        // Вычисляем метрику качества
        const score = this.computeScore(lyapunovValues);

        return score;
    }

    /**
     * Вычисление метрики качества на основе значений Ляпунова
     */
    computeScore(lyapunovValues) {
        // Несколько метрик:

        // 1. Интегральная ошибка (площадь под кривой Ляпунова)
        const integral = lyapunovValues.reduce((sum, v) => sum + v, 0);

        // 2. Время до стабилизации (когда V < threshold)
        const threshold = 0.5;
        let settlingTime = lyapunovValues.length;
        for (let i = 0; i < lyapunovValues.length; i++) {
            if (lyapunovValues[i] < threshold) {
                // Проверяем, что остается стабильным
                let stable = true;
                for (let j = i; j < Math.min(i + 100, lyapunovValues.length); j++) {
                    if (lyapunovValues[j] > threshold * 2) {
                        stable = false;
                        break;
                    }
                }
                if (stable) {
                    settlingTime = i;
                    break;
                }
            }
        }

        // 3. Максимальное значение (overshoot)
        const maxValue = Math.max(...lyapunovValues);

        // 4. Финальная ошибка
        const finalValues = lyapunovValues.slice(-100);
        const finalError = finalValues.reduce((sum, v) => sum + v, 0) / finalValues.length;

        // Комбинированная метрика (взвешенная сумма)
        const score =
            0.4 * integral / lyapunovValues.length +  // средняя ошибка
            0.3 * settlingTime / lyapunovValues.length +  // время стабилизации
            0.2 * maxValue +  // максимальное отклонение
            0.1 * finalError;  // остаточная ошибка

        return score;
    }

    /**
     * Завершение обучения
     */
    finishTraining() {
        this.isTraining = false;

        console.log('✅ ОБУЧЕНИЕ ЗАВЕРШЕНО!');
        console.log(`📊 Протестировано итераций: ${this.history.length}`);
        console.log(`🏆 Лучший Score: ${this.bestScore.toFixed(4)}`);
        console.log('🎯 Лучшие параметры:');
        console.log(this.bestParams);

        // Обновляем UI
        this.updateUI();

        // Показываем результаты
        this.displayResults();
    }

    /**
     * Остановка обучения
     */
    stopTraining() {
        this.isTraining = false;
        console.log('⏹️ Обучение остановлено');
    }

    /**
     * Применение лучших найденных параметров
     */
    applyBestParams() {
        if (!this.bestParams) {
            console.warn('⚠️ Нет найденных параметров для применения');
            return;
        }

        // Применяем к контроллеру
        this.simulation.controller.updateParameters(this.bestParams);

        // Обновляем UI
        this.simulation.uiManager.setParameters({
            ...this.originalParams,
            controller: this.bestParams
        });

        console.log('✅ Лучшие параметры применены к симуляции');
    }

    /**
     * Восстановление исходных параметров
     */
    restoreOriginalParams() {
        if (!this.originalParams) {
            console.warn('⚠️ Нет сохраненных исходных параметров');
            return;
        }

        this.simulation.controller.updateParameters(this.originalParams.controller);
        this.simulation.uiManager.setParameters(this.originalParams);

        console.log('🔙 Исходные параметры восстановлены');
    }

    /**
     * Отображение результатов
     */
    displayResults() {
        const resultsDiv = document.getElementById('trainingResults');
        if (!resultsDiv) return;

        let html = '<h3>📊 Результаты обучения</h3>';
        html += `<p><strong>Лучший Score:</strong> ${this.bestScore.toFixed(4)}</p>`;
        html += '<table class="results-table">';
        html += '<tr><th>Параметр</th><th>Исходное</th><th>Оптимальное</th><th>Изменение</th></tr>';

        for (const key in this.bestParams) {
            const original = this.originalParams.controller[key];
            const optimal = this.bestParams[key];
            const change = ((optimal - original) / original * 100).toFixed(1);

            html += `<tr>
                <td>${key}</td>
                <td>${original.toFixed(2)}</td>
                <td>${optimal.toFixed(2)}</td>
                <td style="color: ${change > 0 ? 'green' : 'red'}">${change > 0 ? '+' : ''}${change}%</td>
            </tr>`;
        }

        html += '</table>';

        resultsDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
    }

    /**
     * Обновление UI
     */
    updateUI() {
        const progressBar = document.getElementById('trainingProgress');
        const statusText = document.getElementById('trainingStatus');
        const iterationText = document.getElementById('trainingIteration');
        const scoreText = document.getElementById('trainingScore');

        if (progressBar) {
            const progress = (this.currentIteration / this.totalIterations) * 100;
            progressBar.style.width = `${progress}%`;
        }

        if (statusText) {
            statusText.textContent = this.isTraining ? '🎓 Обучение...' : '✅ Готово';
        }

        if (iterationText) {
            iterationText.textContent = `${this.currentIteration} / ${this.totalIterations}`;
        }

        if (scoreText && this.bestScore !== Infinity) {
            scoreText.textContent = this.bestScore.toFixed(4);
        }
    }

    /**
     * Утилита для задержки
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

