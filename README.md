# คำต้องห้าม (Forbidden Words) — Web Edition

เว็บเกมปาร์ตี้ "คำต้องห้าม" เล่นออนไลน์กับเพื่อน 2 คนขึ้นไป (ไม่จำกัดจำนวน): สมัคร/ล็อกอิน → สร้างห้อง → แจกคำ → หลอกล่อให้เพื่อนหลุดปาก → สรุปคะแนนลงโปรไฟล์
พร้อมระบบผู้ดูแล (Admin) สำหรับจัดการผู้ใช้และคลังคำต้องห้าม

มีเกมที่ 2: **🐺 One Night Ultimate Werewolf** — บอทผู้ดำเนินเกมเสียงภาษาไทย, สลับการ์ดอัตโนมัติ, เข้าห้องด้วย QR Code

มีเกมที่ 3: **🍻 OHANA** — เกมไพ่ปาร์ตี้ ผลัดกันจั่วแล้วทำตามคำสั่งบนไพ่ ระบบหาคนโดน/ตาถัดไป/ผ้าพันคอ/บัดดี้ให้ (🔞 20+)

มีเกมที่ 4: **🕵️ Insider (จอมบงการ)** — ถาม-ตอบทายคำปริศนาจากคลังคำ แล้วโหวตจับ Insider ที่แอบรู้คำตอบ (4-20 คน)

มีเกมที่ 5: **🕶️ Spyfall** — ทุกคนอยู่สถานที่เดียวกันยกเว้นสปาย ถาม-ตอบส่งต่อกัน กล่าวหา / สปายเผยตัวทายสถานที่ (3-12 คน, 50 สถานที่)

- 📑 ความต้องการ: [docs/BRD-web-mvp.md](docs/BRD-web-mvp.md) · หมวดหมู่และคลังคำ: [docs/BRD-categories.md](docs/BRD-categories.md) · Werewolf: [docs/BRD-werewolf.md](docs/BRD-werewolf.md) · Insider: [docs/BRD-insider.md](docs/BRD-insider.md) · Spyfall: [docs/BRD-spyfall.md](docs/BRD-spyfall.md) · Responsive: [docs/BRD-responsive.md](docs/BRD-responsive.md)
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
| POST | `/api/auth/guest` | `{nickname}` | เล่นแบบไม่สมัคร → `{token, user, guest: true}` (ชื่อเล่นซ้ำกับคนอื่นได้, ล็อกอินซ้ำไม่ได้) |
| GET | `/api/me` | – | โปรไฟล์ + คะแนนสะสม + ประวัติ 20 รอบล่าสุด |
| POST | `/api/rooms` | – | สร้างห้อง (คนสร้างเป็น host) |
| POST | `/api/rooms/{code}/players` | – | เข้าห้อง (ถ้าเคยอยู่แล้วจะได้ที่นั่งเดิม) |
| GET | `/api/rooms/{code}` | – | สถานะห้อง (คำของตัวเองถูกซ่อน) |
| POST | `/api/rooms/{code}/settings` | `{categoryIds, difficulty, roundSeconds, totalRounds}` | host ตั้งหมวด/ระดับ/เวลาต่อรอบ/จำนวนรอบ (ค่าที่ไม่ส่ง = ใช้ค่าเดิม, totalRounds 0 = ไม่จำกัด) |
| POST | `/api/rooms/{code}/start` | – | host เริ่มรอบ / แจกคำ |
| POST | `/api/rooms/{code}/restart` | – | host เริ่มเกมใหม่หลังเล่นครบรอบ (ล้างคะแนนในห้อง) |
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
| GET | `/api/admin/words?q=&categoryId=` | – | คลังคำทั้งหมด (รวมคำที่ปิดใช้งาน) |
| POST | `/api/admin/words` | `{text, categoryId, difficulty, active}` | เพิ่มคำ |
| PUT | `/api/admin/words/{id}` | `{text, categoryId, difficulty, active}` | แก้ไข / เปิด-ปิดใช้งาน |
| DELETE | `/api/admin/words/{id}` | – | ลบคำ |
| GET / POST | `/api/admin/categories` | `{name, icon}` | ดูทุกหมวด / สร้างหมวดมาตรฐาน |
| PUT / DELETE | `/api/admin/categories/{id}` | `{name, icon, active}` | แก้ / เปิด-ปิด / ลบหมวด (ลบคำในหมวดด้วย) |

**🐺 One Night Werewolf** (`/api/werewolf/rooms`)

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| POST | `/api/werewolf/rooms` | – | สร้างห้อง |
| POST | `/{code}/players` | – | เข้าห้อง (ถ้าเคยอยู่แล้วได้ที่นั่งเดิม) |
| GET | `/{code}` | – | สถานะห้อง (เห็นเฉพาะบทบาทตัวเองจนถึงหน้าสรุปผล) |
| POST | `/{code}/settings` | `{roles, discussionSeconds, nightStepSeconds}` | host ตั้งเซ็ตการ์ด/เวลา (ค่าที่ไม่ส่ง = ค่าเดิม) |
| POST | `/{code}/start` | – | host แจกการ์ด เริ่มกลางคืน (การ์ดต้อง = ผู้เล่น + 3) |
| POST | `/{code}/night` | `{playerIds, centerIndexes}` | แอ็กชันกลางคืนของบทบาทที่ถูกเรียก |
| POST | `/{code}/skip` | – | host ข้ามเวลาคุย → โหวต |
| POST | `/{code}/vote` | `{target}` | โหวต playerId หรือ `CENTER` |
| POST | `/{code}/end-vote` | – | host ปิดโหวต |
| POST | `/{code}/again` | – | host เล่นอีกตา |

**🍻 OHANA** (`/api/ohana/rooms`)

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| POST | `/api/ohana/rooms` | – | สร้างห้อง |
| POST | `/{code}/players` | – | เข้าห้อง (เข้าได้ตลอด นั่งต่อท้ายวง) |
| GET | `/{code}` | – | สถานะห้อง |
| POST | `/{code}/settings` | `{penalty, kingRules}` | host ตั้งบทลงโทษ และกฎของไพ่ K |
| POST | `/{code}/start` · `/{code}/end` | – | host เริ่ม / จบเกม |
| POST | `/{code}/draw` | – | จั่วไพ่ (เฉพาะคนที่ถึงตา) |
| POST | `/{code}/pick` | `{playerIds}` | ไพ่ 2/3: เลือกเพื่อนโดนด้วย · ไพ่ 7: เลือกคู่ดวล |
| POST | `/{code}/duel-loser` | `{playerId}` | ไพ่ 7: บอกคนแพ้ดวลปอด |
| POST | `/{code}/face` | – | ไพ่ J: กดจับหน้า (คนสุดท้ายโดน) |
| POST | `/{code}/skip` | – | host ข้ามตาคนที่ไม่อยู่ |
| POST | `/{code}/guests` · `/{code}/guests/remove` | `{name}` · `{playerId}` | 📱 โหมดมือถือเครื่องเดียว: host เพิ่ม/ลบเพื่อนที่ไม่มีบัญชี (host จั่วแทนเมื่อถึงตา) |
| POST | `/{code}/face-loser` | `{playerId}` | ไพ่ J (เครื่องเดียว): host แตะชื่อคนที่จับหน้าช้าสุด |

**🕵️ Insider** (`/api/insider/rooms`) — คำปริศนาส่งให้เฉพาะ Master/Insider, ตัวตน Insider ซ่อนจนจบเกม

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| POST | `/api/insider/rooms` | – | สร้างห้อง |
| POST | `/{code}/players` | – | เข้าห้อง (4-20 คน, เข้าระหว่างเล่นไม่ได้) |
| GET | `/{code}` | – | สถานะห้อง |
| POST | `/{code}/settings` | `{questionSeconds, categoryIds, difficulty}` | host ตั้งเวลาถาม-ตอบ (1-20 นาที) และหมวด/ระดับคำ |
| POST | `/{code}/start` | – | host แจกบทบาท + สุ่มคำ → ดูบทบาท 20 วินาที |
| POST | `/{code}/begin` | – | host/Master เริ่มจับเวลาถาม-ตอบทันที |
| POST | `/{code}/ask` · `/{code}/guess` | `{text}` | ถาม Master / ทายคำ (ทายถูก → โหวต) |
| POST | `/{code}/answer` | `{entryId, answer}` | Master ตอบ `YES` / `NO` / `IRRELEVANT` |
| POST | `/{code}/correct` | `{playerId}` | Master บอกว่าใครทายถูก (ทายด้วยปาก) |
| POST | `/{code}/vote` | `{playerId}` | โหวต Insider (ห้ามตัวเอง/Master) |
| POST | `/{code}/end-vote` · `/{code}/again` | – | host ปิดโหวต / เล่นอีกตา |

**🕶️ Spyfall** (`/api/spyfall/rooms`) — สปายไม่ได้รับชื่อสถานที่, ตัวสปายและบทบาทเปิดเผยตอนจบรอบ

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| POST | `/api/spyfall/rooms` | – | สร้างห้อง |
| POST | `/{code}/players` | – | เข้าห้อง (3-12 คน, เข้าระหว่างเล่นไม่ได้) |
| GET | `/{code}` | – | สถานะห้อง (+ รายชื่อสถานที่ทั้งหมด) |
| POST | `/{code}/settings` | `{roundSeconds}` | host ตั้งเวลาต่อรอบ (1-20 นาที, เริ่มต้น 8 นาที) |
| POST | `/{code}/start` | – | host แจกการ์ด (host ถามคนแรก) |
| POST | `/{code}/ask` | `{playerId}` | คนที่ถึงตาเลือกคนที่จะถาม (ห้ามถามกลับ) |
| POST | `/{code}/accuse` · `/{code}/accuse-vote` | `{playerId}` · `{agree}` | กล่าวหา (หยุดเวลา, คนละครั้งต่อรอบ) / โหวตเห็นด้วย-ไม่เห็นด้วย |
| POST | `/{code}/spy-guess` | `{location}` | สปายเผยตัวทายสถานที่ |
| POST | `/{code}/vote` · `/{code}/end-vote` | `{playerId}` · – | โหวตตอนหมดเวลา / host ปิดโหวต |
| POST | `/{code}/again` | – | host เริ่มรอบใหม่ |

**ทุกเกม**

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| GET | `/api/rooms/lookup/{code}` | – | หาว่ารหัสห้องเป็นของเกมไหน → `{code, games}` (หน้าแรกใช้ช่องกรอกรหัสช่องเดียว) |

**หมวดหมู่** (ผู้ใช้ทุกคน)

| Method | Path | Body | คำอธิบาย |
|---|---|---|---|
| GET | `/api/categories` | – | หมวดมาตรฐาน + หมวดของฉัน พร้อมจำนวนคำแต่ละระดับ |
| GET | `/api/categories/draw?ids=&difficulty=&count=` | – | สุ่มคำ (โหมด 🎲 สุ่มคำ) |
| POST | `/api/categories` | `{name, icon}` | สร้างหมวดเฉพาะกิจ |
| PUT / DELETE | `/api/categories/{id}` | `{name, icon}` | แก้ / ลบหมวดของตัวเอง |
| GET / POST | `/api/categories/{id}/words` | `{text, difficulty}` | ดู / เพิ่มคำในหมวด |
| DELETE | `/api/categories/{id}/words/{wordId}` | – | ลบคำ |

สถานะห้อง: `LOBBY → PLAYING (ตามเวลาที่ตั้ง) → GUESSING → FINISHED → PLAYING ...` จนครบจำนวนรอบ → จบเกม (`gameOver`) → `restart` กลับไป `LOBBY`

ค่าเริ่มต้นของห้องใหม่: **5 นาทีต่อรอบ, 3 รอบ** — ปรับได้ที่ `game.round-seconds` / `game.default-rounds` ใน application.yml

## ระบบผู้ดูแล (Admin) และหมวดหมู่คำ

- ตั้ง Admin คนแรก: ใส่ชื่อผู้ใช้ใน env `ADMIN_USERNAMES` (dev: `$env:ADMIN_USERNAMES="ชื่อ"; .mvnw spring-boot:run`)
- หน้า Admin (ปุ่ม 🛠️ ในหน้าแรก): ดูภาพรวม, ระงับ/ตั้งสิทธิ์ผู้ใช้, เพิ่ม/แก้/ลบ/ปิดใช้งานคำ
- **หมวดมาตรฐาน 5 หมวด** แต่ละคำมีระดับ ง่าย/ปานกลาง/ยาก — Host เลือกหมวดและระดับได้ก่อนเริ่มแต่ละรอบ
- **แพ็กเสริม = หมวดใหม่:** Admin สร้างหมวดมาตรฐานใหม่ที่แท็บ "หมวด" แล้วเพิ่มคำที่แท็บ "คลังคำ" — ไม่ต้อง deploy ใหม่
- **หมวดเฉพาะกิจ:** ผู้ใช้สร้างหมวดของตัวเองได้ที่ "📚 หมวดของฉัน" (เช่น ธีมปีใหม่, ธีมบริษัท)
- ข้อมูลตั้งต้นนำเข้าอัตโนมัติทีละเวอร์ชัน (จำไว้ในตาราง `app_meta`): [base.json](backend/src/main/resources/words/base.json) 100 คำ และ [categories-v2.json](backend/src/main/resources/seed/categories-v2.json) หมวด 5 หมวด + คำเพิ่ม 109 คำ [words-v3.json](backend/src/main/resources/seed/words-v3.json) อีก 308 คำ และ [words-v4.json](backend/src/main/resources/seed/words-v4.json) อีก 750 คำ (รวม 1267 คำ) — คำที่ Admin ลบแล้วจะไม่กลับมา

## ข้อจำกัดของเวอร์ชัน MVP (ตาม BRD)

- ห้องเกมเก็บในหน่วยความจำ — รีสตาร์ต backend แล้วห้องหาย, ห้องที่ไม่เคลื่อนไหว 6 ชม. ถูกลบ (ผู้ใช้และคะแนนอยู่ใน DB ไม่หาย) — ถ้าจะ scale หลายเครื่องต้องย้ายห้องไป Redis
- หน้าเว็บอัปเดตด้วยการ poll ทุก 1.5 วินาที (ยังไม่ใช้ WebSocket)
- จำการล็อกอินและห้องล่าสุดใน localStorage ของเบราว์เซอร์ — รีเฟรชหน้าแล้วกลับเข้าห้องเดิมได้ แต่ถ้า backend รีสตาร์ต ห้องจะหาย
- ตารางฐานข้อมูลสร้างด้วย `ddl-auto: update` — ถ้าระบบโตขึ้นควรเปลี่ยนไปใช้ Flyway
