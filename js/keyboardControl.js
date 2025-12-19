/**
 * Класс KeyboardControl - управление дроном с клавиатуры
 */

export class KeyboardControl {
    constructor(simulation) {
        this.simulation = simulation;

        // Состояние клавиш
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            space: false
        };

        // Параметры управления
        this.moveSpeed = 2.0; // м/с - скорость перемещения целевой позиции
        this.verticalSpeed = 1.5; // м/с - скорость изменения высоты

        // Включено ли управление
        this.enabled = false;

        // Привязка обработчиков событий
        this.bindEvents();

        console.log('⌨️ Управление с клавиатуры инициализировано');
        console.log('📖 WASD - движение, Space/Shift - высота, K - вкл/выкл управление');
    }

    /**
     * Привязка обработчиков клавиатуры
     */
    bindEvents() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    /**
     * Обработка нажатия клавиши
     */
    onKeyDown(event) {
        const key = event.key.toLowerCase();

        // Переключение режима управления (K)
        if (key === 'k') {
            this.toggle();
            return;
        }

        // Если управление выключено, игнорируем остальные клавиши
        if (!this.enabled) return;

        // WASD
        if (key === 'w') this.keys.w = true;
        if (key === 'a') this.keys.a = true;
        if (key === 's') this.keys.s = true;
        if (key === 'd') this.keys.d = true;

        // Высота
        if (key === ' ' || key === 'space') {
            this.keys.space = true;
            event.preventDefault(); // Предотвращаем прокрутку страницы
        }
        if (key === 'shift') this.keys.shift = true;
    }

    /**
     * Обработка отпускания клавиши
     */
    onKeyUp(event) {
        const key = event.key.toLowerCase();

        if (key === 'w') this.keys.w = false;
        if (key === 'a') this.keys.a = false;
        if (key === 's') this.keys.s = false;
        if (key === 'd') this.keys.d = false;
        if (key === ' ' || key === 'space') this.keys.space = false;
        if (key === 'shift') this.keys.shift = false;
    }

    /**
     * Включение/выключение управления
     */
    toggle() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            console.log('⌨️ Управление с клавиатуры ВКЛЮЧЕНО');
            console.log('   W/S - вперед/назад (ось X)');
            console.log('   A/D - влево/вправо (ось Z)');
            console.log('   Space - вверх, Shift - вниз');
            console.log('   K - выключить управление');

            // Устанавливаем целевую позицию на текущую позицию дрона
            if (this.simulation.drone && this.simulation.controller) {
                const pos = this.simulation.drone.position;
                this.simulation.controller.setTargetPosition(pos.x, pos.y, pos.z);
            }
        } else {
            console.log('⌨️ Управление с клавиатуры ВЫКЛЮЧЕНО');
        }

        // Обновляем UI индикатор
        this.updateUI();
    }

    /**
     * Включение управления
     */
    enable() {
        if (!this.enabled) {
            this.toggle();
        }
    }

    /**
     * Выключение управления
     */
    disable() {
        if (this.enabled) {
            this.toggle();
        }
    }

    /**
     * Обновление целевой позиции на основе нажатых клавиш
     */
    update(dt) {
        if (!this.enabled || !this.simulation.controller) return;

        const controller = this.simulation.controller;
        const currentTarget = controller.targetPosition;

        // Вычисляем изменение позиции
        let dx = 0;
        let dy = 0;
        let dz = 0;

        // WASD - движение в горизонтальной плоскости
        if (this.keys.w) dx += this.moveSpeed * dt;  // вперед (положительный X)
        if (this.keys.s) dx -= this.moveSpeed * dt;  // назад (отрицательный X)
        if (this.keys.a) dz += this.moveSpeed * dt;  // влево (положительный Z)
        if (this.keys.d) dz -= this.moveSpeed * dt;  // вправо (отрицательный Z)

        // Space/Shift - изменение высоты
        if (this.keys.space) dy += this.verticalSpeed * dt;  // вверх
        if (this.keys.shift) dy -= this.verticalSpeed * dt;  // вниз

        // Обновляем целевую позицию
        const newX = currentTarget.x + dx;
        const newY = Math.max(0.5, currentTarget.y + dy); // минимум 0.5м от земли
        const newZ = currentTarget.z + dz;

        // Ограничиваем область полета
        const maxDistance = 15;
        const distanceFromCenter = Math.sqrt(newX * newX + newZ * newZ);

        if (distanceFromCenter <= maxDistance) {
            controller.setTargetPosition(newX, newY, newZ);
        } else {
            // Если вышли за границу, не обновляем
            console.warn('⚠️ Достигнута граница области полета');
        }
    }

    /**
     * Обновление UI индикатора
     */
    updateUI() {
        const indicator = document.getElementById('keyboardIndicator');
        if (indicator) {
            if (this.enabled) {
                indicator.textContent = '⌨️ РУЧНОЕ УПРАВЛЕНИЕ';
                indicator.classList.add('active');
            } else {
                indicator.textContent = '🤖 АВТОПИЛОТ';
                indicator.classList.remove('active');
            }
        }
    }

    /**
     * Сброс состояния
     */
    reset() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            space: false
        };
    }
}

