/**
 * grid.js — ตารางบับเบิลแบบรังผึ้ง (แถวยาว 11 ลูก / แถวสั้น 10 ลูก สลับกัน)
 *
 * แก้บั๊กเดิม: เมื่อดันแถวใหม่เข้ามาด้านบน แถวเก่าจะเลื่อนลง 1 แถวและ "สลับความยาว"
 * ทำให้บับเบิลลูกที่ 11 หลุดตาราง ที่นี่ใช้ตัวแปร parity เพื่อให้แต่ละแถวคงความยาวเดิมเสมอ
 */
window.BW = window.BW || {};

(function (BW) {
    const C = BW.CONFIG;
    const R = C.RADIUS;

    class Grid {
        constructor() {
            this.reset();
        }

        reset() {
            this.parity = 0;
            this.offsetY = 0;
            this.cells = [];
            for (let r = 0; r < C.ROWS; r++) {
                this.cells.push(new Array(this.rowLength(r)).fill(null));
            }
            this.fillRows(C.START_ROWS);
        }

        randomType() {
            return C.TYPES[Math.floor(Math.random() * C.TYPES.length)];
        }

        isLong(r) {
            return (r + this.parity) % 2 === 0;
        }

        rowLength(r) {
            return this.isLong(r) ? C.COLS : C.COLS - 1;
        }

        /** เติมบับเบิลสุ่มในแถวบนสุด n แถว */
        fillRows(n) {
            this.offsetY = 0;
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < this.cells[r].length; c++) {
                    this.cells[r][c] = this.randomType();
                }
            }
        }

        /** ให้ตารางค่อย ๆ เลื่อนลง และเพิ่มแถวใหม่เมื่อครบหนึ่งแถว */
        advance(px) {
            this.offsetY += px;
            while (this.offsetY >= C.ROW_HEIGHT) {
                this.offsetY -= C.ROW_HEIGHT;
                this.pushRow();
            }
        }

        pushRow() {
            this.cells.pop();                 // ทิ้งแถวล่างสุด (ว่างอยู่ก่อนเกมจะจบ)
            this.parity = 1 - this.parity;    // สลับ parity เพื่อให้แถวเดิมคงความยาว
            const row = [];
            const len = this.rowLength(0);
            for (let c = 0; c < len; c++) row.push(this.randomType());
            this.cells.unshift(row);
        }

        get(r, c) {
            if (r < 0 || r >= C.ROWS) return null;
            const row = this.cells[r];
            if (c < 0 || c >= row.length) return null;
            return row[c];
        }

        set(r, c, type) {
            this.cells[r][c] = type;
        }

        inBounds(r, c) {
            return r >= 0 && r < C.ROWS && c >= 0 && c < this.cells[r].length;
        }

        position(r, c) {
            const shift = this.isLong(r) ? 0 : R;
            return {
                x: C.FIELD_LEFT + R + shift + c * R * 2,
                y: C.CEILING_Y + R + r * C.ROW_HEIGHT + this.offsetY
            };
        }

        neighbors(r, c) {
            const dc = this.isLong(r) ? [-1, 0] : [0, 1];
            const list = [
                [r, c - 1], [r, c + 1],
                [r - 1, c + dc[0]], [r - 1, c + dc[1]],
                [r + 1, c + dc[0]], [r + 1, c + dc[1]]
            ];
            const out = [];
            for (const [nr, nc] of list) {
                if (this.inBounds(nr, nc)) out.push({ r: nr, c: nc });
            }
            return out;
        }

        forEach(fn) {
            for (let r = 0; r < C.ROWS; r++) {
                for (let c = 0; c < this.cells[r].length; c++) {
                    const t = this.cells[r][c];
                    if (t) fn(r, c, t);
                }
            }
        }

        /** หาช่องว่างที่ใกล้จุด (x, y) ที่สุด */
        nearestEmpty(x, y) {
            let best = null;
            let bestDist = Infinity;
            for (let r = 0; r < C.ROWS; r++) {
                for (let c = 0; c < this.cells[r].length; c++) {
                    if (this.cells[r][c]) continue;
                    const p = this.position(r, c);
                    const d = Math.hypot(x - p.x, y - p.y);
                    if (d < bestDist) {
                        bestDist = d;
                        best = { r: r, c: c };
                    }
                }
            }
            return best;
        }

        /** ลูกที่ยิงมาชนบับเบิลใดบ้างหรือยัง */
        hitsBubble(x, y) {
            let hit = false;
            this.forEach((r, c) => {
                if (hit) return;
                const p = this.position(r, c);
                if (Math.hypot(x - p.x, y - p.y) < C.HIT_DISTANCE) hit = true;
            });
            return hit;
        }

        /** กลุ่มสีเดียวกันที่ติดกับ (r, c) */
        findMatches(r, c) {
            const start = this.get(r, c);
            if (!start) return [];
            const seen = new Set([r + ',' + c]);
            const queue = [{ r: r, c: c }];
            const result = [];
            while (queue.length) {
                const cur = queue.shift();
                result.push(cur);
                for (const n of this.neighbors(cur.r, cur.c)) {
                    const key = n.r + ',' + n.c;
                    const t = this.get(n.r, n.c);
                    if (!seen.has(key) && t && t.color === start.color) {
                        seen.add(key);
                        queue.push(n);
                    }
                }
            }
            return result;
        }

        /** บับเบิลที่ไม่ได้เชื่อมกับเพดาน (แถวบนสุด) */
        findFloating() {
            const connected = new Set();
            const queue = [];
            for (let c = 0; c < this.cells[0].length; c++) {
                if (this.cells[0][c]) {
                    connected.add('0,' + c);
                    queue.push({ r: 0, c: c });
                }
            }
            while (queue.length) {
                const cur = queue.shift();
                for (const n of this.neighbors(cur.r, cur.c)) {
                    const key = n.r + ',' + n.c;
                    if (!connected.has(key) && this.get(n.r, n.c)) {
                        connected.add(key);
                        queue.push(n);
                    }
                }
            }
            const floating = [];
            this.forEach((r, c) => {
                if (!connected.has(r + ',' + c)) floating.push({ r: r, c: c });
            });
            return floating;
        }

        /** ขอบล่างสุดของบับเบิลทั้งหมด (ใช้ตรวจว่าแตะพื้นหรือยัง) */
        lowestEdge() {
            let lowest = -Infinity;
            this.forEach((r, c) => {
                const y = this.position(r, c).y + R;
                if (y > lowest) lowest = y;
            });
            return lowest;
        }

        isEmpty() {
            let any = false;
            this.forEach(() => { any = true; });
            return !any;
        }

        /** ชนิดบับเบิลที่ยังเหลืออยู่บนกระดาน (ไว้สุ่มลูกที่ยิง ไม่ให้ติดสี) */
        typesInPlay() {
            const colors = new Set();
            this.forEach((r, c, t) => colors.add(t.color));
            return C.TYPES.filter((t) => colors.has(t.color));
        }
    }

    BW.Grid = Grid;
})(window.BW);
