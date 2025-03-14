/**
 * 游戏主类
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.score = 0;
        this.gameOver = false;
        this.capybara = new Capybara(this.canvas.width / 2, this.canvas.height - 80);
        this.oranges = [];
        this.bombs = [];
        
        // 移动设备触摸控制变量
        this.touchStartX = 0;
        this.isTouching = false;
        this.lastTouchX = 0;
        this.touchSensitivity = 1.5; // 降低触摸灵敏度，使移动更平滑
        this.minSwipeDistance = 5; // 最小滑动距离阈值
        this.touchStartTime = 0;
        this.lastShootTime = 0;
        this.shootInterval = 300; // 射击间隔（毫秒）
        
        this.setupEventListeners();
        this.gameLoop();
    }

    /**
     * 调整画布大小
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 20;
        const containerHeight = container.clientHeight - 120;
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        if (this.capybara) {
            this.capybara.x = Math.min(this.canvas.width - this.capybara.width, 
                Math.max(0, this.capybara.x));
            this.capybara.y = this.canvas.height - 80;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 键盘事件
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.capybara.moveLeft(this.canvas.width);
            } else if (e.key === 'ArrowRight') {
                this.capybara.moveRight(this.canvas.width);
            } else if (e.key === ' ') {
                this.shoot();
            }
        });

        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isTouching = true;
            this.touchStartX = e.touches[0].clientX;
            this.lastTouchX = this.touchStartX;
            this.touchStartTime = Date.now();
            this.shoot();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isTouching) return;
            
            const touchX = e.touches[0].clientX;
            const diff = touchX - this.lastTouchX;
            
            // 只有当移动距离超过阈值时才移动
            if (Math.abs(diff) > this.minSwipeDistance) {
                const moveAmount = diff / this.touchSensitivity;
                if (diff > 0) {
                    this.capybara.moveRight(this.canvas.width, moveAmount);
                } else {
                    this.capybara.moveLeft(this.canvas.width, Math.abs(moveAmount));
                }
                this.lastTouchX = touchX;
            }

            // 持续触摸时自动射击
            const now = Date.now();
            if (now - this.lastShootTime >= this.shootInterval) {
                this.shoot();
                this.lastShootTime = now;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouching = false;
        }, { passive: false });

        // 禁用双击缩放
        document.addEventListener('dblclick', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    /**
     * 发射橘子
     */
    shoot() {
        if (!this.gameOver) {
            const now = Date.now();
            if (now - this.lastShootTime >= this.shootInterval) {
                this.oranges.push(new Orange(
                    this.capybara.x + this.capybara.width / 2,
                    this.capybara.y
                ));
                this.lastShootTime = now;
            }
        }
    }

    /**
     * 更新游戏状态
     */
    update() {
        if (this.gameOver) {
            document.getElementById('gameOver').style.display = 'block';
            document.getElementById('finalScore').textContent = this.score;
            return;
        }

        // 更新橘子位置
        this.oranges = this.oranges.filter(orange => {
            orange.update();
            return orange.y > 0;
        });

        // 生成炸弹
        if (Math.random() < 0.02) {
            const bombX = Math.random() * (this.canvas.width - 28);
            this.bombs.push(new Bomb(bombX, -28));
        }

        // 更新炸弹位置
        this.bombs = this.bombs.filter(bomb => {
            bomb.update();
            return bomb.y < this.canvas.height;
        });

        // 检测碰撞
        this.checkCollisions();
    }

    /**
     * 检查碰撞
     */
    checkCollisions() {
        // 检查橘子和炸弹的碰撞
        this.oranges.forEach((orange, orangeIndex) => {
            this.bombs.forEach((bomb, bombIndex) => {
                if (this.isColliding(orange, bomb)) {
                    this.oranges.splice(orangeIndex, 1);
                    this.bombs.splice(bombIndex, 1);
                    this.score += 10;
                    document.getElementById('scoreValue').textContent = this.score;
                }
            });
        });

        // 检查卡皮巴拉和炸弹的碰撞
        if (!this.gameOver) {
            this.bombs.forEach((bomb, index) => {
                if (this.isColliding(this.capybara, bomb)) {
                    this.bombs.splice(index, 1);
                    this.gameOver = true;
                }
            });
        }
    }

    /**
     * 检查两个对象是否碰撞
     */
    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    /**
     * 绘制游戏画面
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.gameOver) {
            this.capybara.draw(this.ctx);
        }
        
        this.oranges.forEach(orange => orange.draw(this.ctx));
        this.bombs.forEach(bomb => bomb.draw(this.ctx));
    }

    /**
     * 游戏主循环
     */
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

/**
 * 卡皮巴拉类
 */
class Capybara {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 64;
        this.speed = 4; // 调整移动速度为4
    }

    moveLeft(canvasWidth, amount = this.speed) {
        this.x = Math.max(0, this.x - amount);
    }

    moveRight(canvasWidth, amount = this.speed) {
        this.x = Math.min(canvasWidth - this.width, this.x + amount);
    }

    draw(ctx) {
        // 身体
        ctx.fillStyle = '#B89470';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width/2,
            this.y + this.height/2,
            this.width/2.2,
            this.height/2.5,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 耳朵外部
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.25,
            this.y + this.height * 0.3,
            12,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.75,
            this.y + this.height * 0.3,
            12,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 耳朵内部
        ctx.fillStyle = '#8B5742';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.25,
            this.y + this.height * 0.3,
            8,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            this.x + this.width * 0.75,
            this.y + this.height * 0.3,
            8,
            0,
            Math.PI * 2
        );
        ctx.fill();

    }
}

/**
 * 橘子类
 */
class Orange {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.speed = 10;
        this.rotation = 0;
    }

    update() {
        this.y -= this.speed;
        this.rotation += 0.2;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // 橘子主体
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FFA500');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // 叶子
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.ellipse(6, -6, 8, 4, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -8, 5, 2, Math.PI/3, 0, Math.PI * 2);
        ctx.fill();

        // 叶子茎
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(4, -6);
        ctx.stroke();

        ctx.restore();
    }
}

/**
 * 炸弹类
 */
class Bomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 28;
        this.speed = 4;
    }

    update() {
        this.y += this.speed;
    }

    draw(ctx) {
        // 炸弹主体
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2,
            this.y + this.height/2,
            this.width/2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 炸弹顶部
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2,
            this.y + this.height/4,
            this.width/4,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 导火线
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y + this.height/4);
        ctx.lineTo(this.x + this.width/2, this.y - 4);
        ctx.stroke();
    }
}

/**
 * 重新开始游戏
 */
function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    game = new Game();
}

// 启动游戏
let game = new Game(); 