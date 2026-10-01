/**
 * game.js — ตัวเกมหลัก: สถานะ, ฟิสิกส์การยิง, การให้คะแนน, การวาดบน canvas
 *
 * สถานะ: 'idle' -> 'playing' <-> 'paused' -> 'over'
 */
window.BW = window.BW || {};

(function (BW) {
    const C = BW.CONFIG;
    const R = C.RADIUS;

    class Game {
        /**
         * @param {HTMLCanvasElement} canvas
         * @param {{onHud:Function, onEnd:Function}} hooks
         */
        constructor(canvas, hooks) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.hooks = hooks;

            this.grid = new BW.Grid();
            this.state = 'idle';
            this.aim = { x: C.CANNON.x, y: 200 };
            this.aiming = false;
            this.shooter = null;
            this.next = null;
            this.effects = [];
            this.lastTs = 0;

            this.score = 0;
            this.timeLeft = C.GAME_SECONDS;
            this.level = 1;
            this.pops = 0;
            this.dropSpeed = C.DROP_SPEED;
            this.coins = BW.Storage.getNumber('coins', 0);
            this.high = BW.Storage.getNumber('highScore', 0);

            this.bindInput();
            requestAnimationFrame((t) => this.loop(t));
        }

        /* ---------------- สถานะเกม ---------------- */

        start() {
            this.grid.reset();
            this.score = 0;
            this.timeLeft = C.GAME_SECONDS;
            this.level = 1;
            this.pops = 0;
            this.dropSpeed = C.DROP_SPEED;
            this.effects = [];
            this.next = null;
            this.state = 'playing';
            this.loadShooter();
            BW.Sound.startBGM();
            this.hooks.onHud(this.snapshot());
        }

        pause() {
            if (this.state !== 'playing') return false;
            this.state = 'paused';
            this.aiming = false;
            BW.Sound.stopBGM();
            return true;
        }

        resume() {
            if (this.state !== 'paused') return false;
            this.state = 'playing';
            BW.Sound.startBGM();
            return true;
        }

        end(win, text) {
            if (this.state === 'over' || this.state === 'idle') return;
            this.state = 'over';
            this.aiming = false;
            BW.Sound.stopBGM();

            const record = this.score > this.high;
            if (record) {
                this.high = this.score;
                BW.Storage.set('highScore', this.high);
            }
            BW.Storage.set('coins', this.coins);

            this.hooks.onHud(this.snapshot());
            this.hooks.onEnd({ win: win, text: text, score: this.score, record: record });
        }

        /** กลับสู่เมนู: ล้างกระดาน หยุดเพลง และกลับเป็นสถานะ idle */
        quit() {
            if (this.state === 'playing' || this.state === 'paused') {
                BW.Storage.set('coins', this.coins);
            }
            this.state = 'idle';
            this.aiming = false;
            BW.Sound.stopBGM();
            this.grid.reset();
            this.effects = [];
            this.shooter = null;
            this.next = null;
            this.score = 0;
            this.timeLeft = C.GAME_SECONDS;
            this.level = 1;
            this.pops = 0;
            this.dropSpeed = C.DROP_SPEED;
            this.hooks.onHud(this.snapshot());
        }

        snapshot() {
            return {
                score: this.score,
                time: Math.max(0, Math.ceil(this.timeLeft)),
                level: this.level,
                coins: this.coins,
                pops: this.pops,
                goal: C.GOAL_PER_LEVEL * this.level,
                high: Math.max(this.high, this.score)
            };
        }

        /* ---------------- ลูกที่ยิง ---------------- */

        loadShooter() {
            const inPlay = this.grid.typesInPlay();
            const pool = inPlay.length ? inPlay : C.TYPES;
            const pick = () => pool[Math.floor(Math.random() * pool.length)];

            let type = this.next;
            if (!type || !pool.some((t) => t.color === type.color)) type = pick();
            this.next = pick();

            this.shooter = {
                x: C.CANNON.x,
                y: C.CANNON.y,
                vx: 0,
                vy: 0,
                moving: false,
                type: type
            };
        }

        aimAngle() {
            let a = Math.atan2(this.aim.y - C.CANNON.y, this.aim.x - C.CANNON.x);
            if (a > 0) a = a > Math.PI / 2 ? -Math.PI + 0.2 : -0.2;   // เล็งต่ำกว่าปืน
            return Math.max(-Math.PI + 0.2, Math.min(-0.2, a));
        }

        shoot() {
            const s = this.shooter;
            if (this.state !== 'playing' || !s || s.moving) return;
            const a = this.aimAngle();
            s.vx = Math.cos(a) * C.SHOT_SPEED;
            s.vy = Math.sin(a) * C.SHOT_SPEED;
            s.moving = true;
            BW.Sound.shoot();
        }

        /* ---------------- Input (เมาส์ + ทัช ผ่าน Pointer Events) ---------------- */

        bindInput() {
            const c = this.canvas;
            const toCanvas = (e) => {
                const rect = c.getBoundingClientRect();
                return {
                    x: (e.clientX - rect.left) * (c.width / rect.width),
                    y: (e.clientY - rect.top) * (c.height / rect.height)
                };
            };

            c.addEventListener('pointerdown', (e) => {
                BW.Sound.init();
                this.aiming = true;
                this.aim = toCanvas(e);
                try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            });

            c.addEventListener('pointermove', (e) => {
                this.aim = toCanvas(e);
            });

            c.addEventListener('pointerup', (e) => {
                if (!this.aiming) return;
                this.aiming = false;
                this.aim = toCanvas(e);
                this.shoot();
            });

            c.addEventListener('pointercancel', () => { this.aiming = false; });
        }

        /* ---------------- Loop ---------------- */

        loop(ts) {
            const dt = Math.min(0.033, (ts - (this.lastTs || ts)) / 1000);
            this.lastTs = ts;

            if (this.state === 'playing') this.update(dt);
            if (this.state !== 'paused') this.updateEffects(dt);
            this.render();
            if (this.state === 'playing') this.hooks.onHud(this.snapshot());

            requestAnimationFrame((t) => this.loop(t));
        }

        update(dt) {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.end(true, 'Time Out!');
                return;
            }

            this.grid.advance(this.dropSpeed * dt);
            if (this.grid.lowestEdge() >= C.GROUND_Y) {
                this.end(false, 'Touched Ground!');
                return;
            }

            this.moveShooter(dt);
        }

        moveShooter(dt) {
            const s = this.shooter;
            if (!s || !s.moving) return;

            // แบ่งก้าวย่อย ป้องกันลูกทะลุบับเบิลเมื่อเฟรมช้า
            const steps = Math.max(1, Math.ceil((C.SHOT_SPEED * dt) / 6));
            for (let i = 0; i < steps; i++) {
                s.x += (s.vx * dt) / steps;
                s.y += (s.vy * dt) / steps;

                if (s.x - R <= C.FIELD_LEFT) {
                    s.x = C.FIELD_LEFT + R;
                    s.vx = Math.abs(s.vx);
                    BW.Sound.bounce();
                } else if (s.x + R >= C.FIELD_RIGHT) {
                    s.x = C.FIELD_RIGHT - R;
                    s.vx = -Math.abs(s.vx);
                    BW.Sound.bounce();
                }

                if (s.y - R <= C.CEILING_Y + this.grid.offsetY || this.grid.hitsBubble(s.x, s.y)) {
                    this.land();
                    return;
                }
            }
        }

        land() {
            const s = this.shooter;
            s.moving = false;

            const cell = this.grid.nearestEmpty(s.x, s.y);
            if (!cell) {
                this.end(false, 'Board Full!');
                return;
            }

            this.grid.set(cell.r, cell.c, s.type);
            BW.Sound.snap();

            const matches = this.grid.findMatches(cell.r, cell.c);
            if (matches.length >= C.MIN_MATCH) {
                this.popCells(matches);
                this.dropCells(this.grid.findFloating());
                this.checkLevelUp();
                if (this.grid.isEmpty()) this.grid.fillRows(3);   // เคลียร์หมดกระดาน -> เติมใหม่
            }

            this.loadShooter();
        }

        popCells(cells) {
            for (const { r, c } of cells) {
                const p = this.grid.position(r, c);
                this.effects.push({ kind: 'pop', x: p.x, y: p.y, type: this.grid.get(r, c), t: 0 });
                this.grid.set(r, c, null);
            }
            this.score += cells.length * C.POP_SCORE;
            this.pops += cells.length;
            this.coins += cells.length;
            BW.Sound.pop();
        }

        dropCells(cells) {
            for (const { r, c } of cells) {
                const p = this.grid.position(r, c);
                this.effects.push({
                    kind: 'fall', x: p.x, y: p.y, vy: -120,
                    type: this.grid.get(r, c), t: 0
                });
                this.grid.set(r, c, null);
                this.score += C.FLOAT_SCORE;
                this.coins += 1;
            }
        }

        checkLevelUp() {
            const goal = C.GOAL_PER_LEVEL * this.level;
            if (this.pops >= goal) {
                this.pops = 0;
                this.level += 1;
                this.timeLeft += C.LEVEL_TIME_BONUS;
                this.dropSpeed = Math.min(C.DROP_SPEED_MAX, this.dropSpeed + C.DROP_SPEED_STEP);
            }
        }

        updateEffects(dt) {
            for (const fx of this.effects) {
                fx.t += dt;
                if (fx.kind === 'fall') {
                    fx.vy += 1400 * dt;
                    fx.y += fx.vy * dt;
                }
            }
            this.effects = this.effects.filter((fx) =>
                fx.kind === 'pop' ? fx.t < 0.25 : fx.y < C.HEIGHT + R
            );
        }

        /* ---------------- วาดภาพ ---------------- */

        render() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, C.WIDTH, C.HEIGHT);
            this.drawField(ctx);
            this.drawGrid(ctx);
            this.drawEffects(ctx);
            this.drawAim(ctx);
            this.drawCannon(ctx);
        }

        drawField(ctx) {
            ctx.strokeStyle = '#6d4c27';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(C.FIELD_LEFT - 3, C.CEILING_Y - 3);
            ctx.lineTo(C.FIELD_LEFT - 3, 490);
            ctx.moveTo(C.FIELD_RIGHT + 3, C.CEILING_Y - 3);
            ctx.lineTo(C.FIELD_RIGHT + 3, 490);
            ctx.moveTo(C.FIELD_LEFT - 3, C.CEILING_Y - 3);
            ctx.lineTo(C.FIELD_RIGHT + 3, C.CEILING_Y - 3);
            ctx.stroke();

            ctx.strokeStyle = '#ff4747';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(C.FIELD_LEFT, C.GROUND_Y);
            ctx.lineTo(C.FIELD_RIGHT, C.GROUND_Y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        drawGrid(ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(C.FIELD_LEFT, C.CEILING_Y, C.FIELD_RIGHT - C.FIELD_LEFT, C.HEIGHT);
            ctx.clip();
            this.grid.forEach((r, c, type) => {
                const p = this.grid.position(r, c);
                this.drawBubble(ctx, p.x, p.y, type, R);
            });
            ctx.restore();
        }

        drawEffects(ctx) {
            for (const fx of this.effects) {
                if (fx.kind === 'pop') {
                    const k = fx.t / 0.25;
                    ctx.save();
                    ctx.globalAlpha = 1 - k;
                    this.drawBubble(ctx, fx.x, fx.y, fx.type, R * (1 + k * 0.5));
                    ctx.restore();
                } else {
                    this.drawBubble(ctx, fx.x, fx.y, fx.type, R);
                }
            }
        }

        drawAim(ctx) {
            if (this.state !== 'playing' || !this.shooter || this.shooter.moving) return;
            const a = this.aimAngle();
            ctx.beginPath();
            ctx.moveTo(C.CANNON.x, C.CANNON.y);
            ctx.lineTo(C.CANNON.x + Math.cos(a) * 140, C.CANNON.y + Math.sin(a) * 140);
            ctx.strokeStyle = this.aiming ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        drawCannon(ctx) {
            const cx = C.CANNON.x;
            const cy = C.CANNON.y;

            // กระบอกปืน (หมุนตามมุมเล็ง)
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.aimAngle() + Math.PI / 2);
            ctx.fillStyle = '#4a2a18';
            ctx.fillRect(-9, -42, 18, 50);
            ctx.restore();

            // ฐาน
            ctx.fillStyle = '#6d4c27';
            ctx.beginPath();
            ctx.arc(cx, cy + 12, 22, 0, Math.PI * 2);
            ctx.fill();

            // กระรอก + ลูกถัดไป
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText('🐿️', cx - 100, cy + 10);

            if (this.next) {
                this.drawBubble(ctx, cx - 55, cy + 12, this.next, 12);
                ctx.font = '10px Kanit, sans-serif';
                ctx.fillStyle = '#ffde7a';
                ctx.fillText('NEXT', cx - 55, cy + 32);
            }

            if (this.shooter) {
                this.drawBubble(ctx, this.shooter.x, this.shooter.y, this.shooter.type, R);
            }
        }

        drawBubble(ctx, x, y, type, radius) {
            ctx.save();

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = type.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = type.border || 'rgba(0,0,0,0.15)';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fill();

            if (type.icon && radius >= 10) {
                ctx.font = Math.round(radius * 0.85) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(type.icon, x, y + 1);
            }

            ctx.restore();
        }
    }

    BW.Game = Game;
})(window.BW);
