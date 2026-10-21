# คำต้องห้าม (Forbidden Words) — Web Edition

เว็บเกมปาร์ตี้ "คำต้องห้าม" เล่นออนไลน์กับเพื่อน 2 คนขึ้นไป (ไม่จำกัดจำนวน): สมัคร/ล็อกอิน → สร้างห้อง → แจกคำ → หลอกล่อให้เพื่อนหลุดปาก → สรุปคะแนนลงโปรไฟล์
พร้อมระบบผู้ดูแล (Admin) สำหรับจัดการผู้ใช้และคลังคำต้องห้าม

- 📑 ความต้องการ: [docs/BRD-web-mvp.md](docs/BRD-web-mvp.md)
- 🚀 วิธี deploy ออนไลน์: [docs/DEPLOY.md](docs/DEPLOY.md)

| ส่วน | เทคโนโลยี | โฟลเดอร์ |
|---|---|---|
| หลังบ้าน (API) | Java 17 + Spring Boot 3 + JPA (H2 ตอน dev / PostgreSQL ตอน prod) | [backend/](backend/) |
| หน้าบ้าน (เว็บ) | React Native Web (Expo SDK 51) + TypeScript | [mobile/](mobile/) |

## วิธีเล่น

1. สมัครสมาชิก / เข้าสู่ระบบ
2. เจ้าของห้องกด **สร้างห้องใหม่** → ได้รหัสห้อง 4 ตัว แล้วบอกเพื่อน
3. เพื่อนกด **เข้าห้อง** ด้วยรหัสนั้น
4. เจ้าของห้องกด **เริ่มเกม** → ทุกคนเห็นคำของคนอื่น แต่คำของตัวเองเป็น `???`
5. ใครหลุดปากพูดคำบนหัวตัวเอง → แตะการ์ดคนนั้น แล้วเลือกว่าใครเป็นคนหลอก
6. หมด 5 นาที → ผู้รอดชีวิตทายคำบนหัวตัวเอง → แสดงผู้ชนะและบันทึกคะแนนลงโปรไฟล์

| เหตุการณ์ | คะแนน |
|---|---|
| หลอกให้คนอื่นพูดคำต้องห้ามได้ (Kill) | +1 ต่อคน |
| พูดคำต้องห้ามบนหัวตัวเอง | ตกรอบ |
| รอดจนหมดเวลา | 0.5 |
| รอด + ทายคำตัวเองถูก | 1 |

ปรับค่าได้ใน [application.yml](backend/src/main/resources/application.yml)

## รันบนเครื่อง (dev)

ต้องมี JDK 17+ และ Node.js 18+ (ไม่ต้องติดตั้ง Maven — `mvnw` ดาวน์โหลดให้เอง)

```powershell
# Terminal 1 — backend ที่ http://localhost:8080 (ฐานข้อมูล H2 เก็บใน backend/data/)
cd backend
.\mvnw spring-boot:run

# Terminal 2 — หน้าเว็บที่ http://localhost:8081
cd mobile
npm install
copy .env.example .env
npm run web
```

รันเทสต์: `cd backend; .\mvnw test` และ `cd mobile; npm run typecheck`

## API

ทุก endpoint ยกเว้น `/api/auth/*`, `/api/words*`, `/api/health` ต้องส่ง header `Authorization: Bearer <token>`

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, email, password}` | สมัคร → `{token, user}` |
| POST | `/api/auth/login` | `{login, password}` | login = ชื่อผู้ใช้หรืออีเมล |
| GET | `/api/me` | – | โปรไฟล์ + คะแนนสะสม + ประวัติ 20 รอบล่าสุด |
| POST | `/api/rooms` | – | สร้างห้อง (คนสร้างเป็น host) |
| POST | `/api/rooms/{code}/players` | – | เข้าห้อง (ถ้าเคยอยู่แล้วจะได้ที่นั่งเดิม) |
| GET | `/api/rooms/{code}` | – | สถานะห้อง (คำของตัวเองถูกซ่อน) |
| POST | `/api/rooms/{code}/start` | – | host เริ่มรอบ / แจกคำ |
| POST | `/api/rooms/{code}/kills` | `{victimId, killerId?}` | รายงานคนพูดคำต้องห้าม |
| POST | `/api/rooms/{code}/guess` | `{guess}` | ผู้รอดชีวิตทายคำ |
| POST | `/api/rooms/{code}/end` | – | host ข้ามขั้น (จบช่วงเล่น / สรุปผล) |
| GET | `/api/words`, `/api/words/packs` | – | ดูชุดคำ |
| GET | `/api/health` | – | health check สำหรับ deploy |

**Admin** (ต้องเป็นผู้ใช้ role `ADMIN` — ตั้งคนแรกผ่าน env `ADMIN_USERNAMES`)

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| GET | `/api/admin/stats` | – | จำนวนผู้ใช้ / คำ / ห้องที่เปิดอยู่ |
| GET | `/api/admin/users?q=` | – | รายชื่อผู้ใช้ (ค้นหาได้) |
| POST | `/api/admin/users/{id}/ban` | `{banned}` | ระงับ / ยกเลิกระงับบัญชี |
| POST | `/api/admin/users/{id}/role` | `{role}` | `PLAYER` หรือ `ADMIN` |
| GET | `/api/admin/words?q=&pack=` | – | คลังคำทั้งหมด (รวมคำที่ปิดใช้งาน) |
| POST | `/api/admin/words` | `{text, category, pack, active}` | เพิ่มคำ |
| PUT | `/api/admin/words/{id}` | `{text, category, pack, active}` | แก้ไข / เปิด-ปิดใช้งาน |
| DELETE | `/api/admin/words/{id}` | – | ลบคำ |

สถานะห้อง: `LOBBY → PLAYING (5 นาที) → GUESSING → FINISHED → PLAYING ...`

## ระบบผู้ดูแล (Admin) และแพ็กเสริม

- ตั้ง Admin คนแรก: ใส่ชื่อผู้ใช้ใน env `ADMIN_USERNAMES` (dev: `$env:ADMIN_USERNAMES="ชื่อ"; .mvnw spring-boot:run`)
- หน้า Admin (ปุ่ม 🛠️ ในหน้าแรก): ดูภาพรวม, ระงับ/ตั้งสิทธิ์ผู้ใช้, เพิ่ม/แก้/ลบ/ปิดใช้งานคำ
- **แพ็กเสริม:** เพิ่มคำในหน้า Admin แล้วใส่ชื่อแพ็กใหม่ (เช่น `exp1`) — ไม่ต้อง deploy ใหม่
- คลังคำเก็บในฐานข้อมูล — ไฟล์ [base.json](backend/src/main/resources/words/base.json) ใช้นำเข้า 100 คำแรกอัตโนมัติเมื่อฐานข้อมูลยังว่างเท่านั้น

## ข้อจำกัดของเวอร์ชัน MVP (ตาม BRD)

- ห้องเกมเก็บในหน่วยความจำ — รีสตาร์ต backend แล้วห้องหาย, ห้องที่ไม่เคลื่อนไหว 6 ชม. ถูกลบ (ผู้ใช้และคะแนนอยู่ใน DB ไม่หาย) — ถ้าจะ scale หลายเครื่องต้องย้ายห้องไป Redis
- หน้าเว็บอัปเดตด้วยการ poll ทุก 1.5 วินาที (ยังไม่ใช้ WebSocket)
- จำการล็อกอินและห้องล่าสุดใน localStorage ของเบราว์เซอร์ — รีเฟรชหน้าแล้วกลับเข้าห้องเดิมได้ แต่ถ้า backend รีสตาร์ต ห้องจะหาย
- ตารางฐานข้อมูลสร้างด้วย `ddl-auto: update` — ถ้าระบบโตขึ้นควรเปลี่ยนไปใช้ Flyway
