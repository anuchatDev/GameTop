# คู่มือ Deploy ออนไลน์

ลำดับ: **Database → Backend → Frontend → กลับไปตั้ง CORS ที่ Backend**

## 1. Database — Neon (PostgreSQL ฟรี)

1. สมัครที่ https://neon.tech → Create project (เลือก region Singapore)
2. ในหน้าโปรเจกต์ กดปุ่ม **Connect** (มุมขวาบน) แล้วคัดลอก connection string หน้าตาแบบนี้:

   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

3. แยกออกเป็น 3 ค่า:

   | ตัวแปร | เอาจาก | ตัวอย่าง |
   |---|---|---|
   | `DATABASE_URL` | `jdbc:postgresql://` + ส่วน **หลัง `@`** จนจบ | `jdbc:postgresql://ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
   | `DATABASE_USERNAME` | ส่วนระหว่าง `//` กับ `:` | `neondb_owner` |
   | `DATABASE_PASSWORD` | ส่วนระหว่าง `:` กับ `@` | `AbC123xyz` |

> ⚠️ ต้องเป็นรูปแบบ `jdbc:postgresql://...` เท่านั้น ไม่ใช่ `postgres://user:pass@...`
> ตารางจะถูกสร้างอัตโนมัติตอน backend start ครั้งแรก (`ddl-auto: update`)

Supabase ใช้ได้เหมือนกัน: Project Settings → Database → Connection string แบบ JDBC

## 2. Backend — Render

1. push โค้ดขึ้น GitHub
2. https://render.com → **New → Blueprint** → เลือก repo `GameTop` (Render จะอ่าน [render.yaml](../render.yaml))
3. กรอก Environment Variables ที่ระบบถาม:

   | Key | ค่า |
   |---|---|
   | `DATABASE_URL` / `DATABASE_USERNAME` / `DATABASE_PASSWORD` | จากขั้นที่ 1 |
   | `CORS_ORIGINS` | ใส่ไว้ก่อนเป็น `*` แล้วค่อยแก้หลังได้ URL frontend |
   | `JWT_SECRET` | Render สุ่มให้อัตโนมัติ |

4. รอ build เสร็จ → ทดสอบ `https://<ชื่อ-service>.onrender.com/api/health` ต้องได้ `{"status":"ok"}`

> แพ็กเกจฟรีของ Render จะหลับเมื่อไม่มีคนใช้ ~15 นาที — request แรกหลังหลับใช้เวลา ~1 นาที
> และเมื่อหลับ/รีสตาร์ต **ห้องเกมที่ค้างอยู่จะหาย** (ข้อมูลผู้ใช้และคะแนนอยู่ใน DB ไม่หาย)

**Railway:** New Project → Deploy from GitHub → Root directory `backend` (มี Dockerfile อยู่แล้ว) → ใส่ env ชุดเดียวกัน + `SPRING_PROFILES_ACTIVE=prod`

## 3. Frontend — Netlify หรือ Vercel

### Netlify
1. https://app.netlify.com → **Add new site → Import from Git** → เลือก repo
2. **Base directory:** `mobile` (ค่าอื่นอ่านจาก [netlify.toml](../mobile/netlify.toml))
3. **Environment variables:** `EXPO_PUBLIC_API_URL` = `https://<ชื่อ-service>.onrender.com`
4. Deploy

### Vercel
1. https://vercel.com → **Add New → Project** → เลือก repo
2. **Root Directory:** `mobile` (ค่าอื่นอ่านจาก [vercel.json](../mobile/vercel.json))
3. **Environment Variables:** `EXPO_PUBLIC_API_URL` = URL ของ backend
4. Deploy

> `EXPO_PUBLIC_API_URL` ถูกฝังตอน build — ถ้าเปลี่ยนค่าต้องกด **Redeploy**

> ⚠️ ถ้าเปิดเว็บแล้วโดนเด้งไปหน้าล็อกอิน Netlify (HTTP 401) แปลว่าเปิด Site protection อยู่ —
> ไปที่ **Site configuration → Access & security** แล้วตั้งเป็น **No protection / Public** เพื่อให้คนทั่วไปเข้าเล่นได้

## 4. ตั้งผู้ดูแลระบบ (Admin) คนแรก

1. สมัครสมาชิกบนเว็บตามปกติ
2. Render → Environment → เพิ่ม `ADMIN_USERNAMES` = ชื่อผู้ใช้ที่เพิ่งสมัคร (หลายคนคั่นด้วย comma) → Save
3. Render จะ redeploy ให้ — เปิดเว็บใหม่จะเห็นปุ่ม **🛠️ ระบบผู้ดูแล** ในหน้าแรก

หลังจากนั้นตั้ง/ถอด Admin คนอื่นได้จากหน้า Admin เลย ไม่ต้องแก้ env อีก

## 5. ปิด CORS ให้เหลือเฉพาะเว็บของเรา

กลับไปที่ Render → Environment → แก้ `CORS_ORIGINS` เป็น URL frontend จริง เช่น
`https://forbidden-words.netlify.app` (หลายค่าคั่นด้วย comma) → Save (Render จะ redeploy ให้)

## 6. (ไม่บังคับ) เปิดลืมรหัสผ่าน และล็อกอินด้วย LINE / Google

ทุกอย่างในข้อนี้ฟรี ไม่ตั้ง = ปุ่มนั้นถูกซ่อนไว้เฉยๆ เว็บใช้งานได้ตามปกติ
ตั้งค่าเสร็จแล้วกด Save ใน Render (จะ redeploy ให้) — **ไม่ต้อง** build หน้าเว็บใหม่ เพราะหน้าเว็บถาม backend เองว่าเปิดปุ่มไหนบ้าง

**ลืมรหัสผ่าน (ส่งอีเมลผ่าน Brevo — ฟรี 300 ฉบับ/วัน)**

1. สมัคร https://www.brevo.com → **Senders, Domains & Dedicated IPs → Senders** → เพิ่มอีเมลผู้ส่ง แล้วกดยืนยันในอีเมล
2. **SMTP & API → API Keys → Generate** → คัดลอก key
3. Render → Environment: `BREVO_API_KEY` = key, `MAIL_FROM` = อีเมลผู้ส่งที่ยืนยันแล้ว,
   `PUBLIC_URL` = `https://forbidden-words.netlify.app`

> ใช้ HTTP API แทน SMTP เพราะ Render แบบฟรีปิดพอร์ต SMTP

**LINE Login**

1. https://developers.line.biz → Create provider → Create a **LINE Login** channel (App types: Web app)
2. แท็บ **LINE Login** → Callback URL = `https://forbidden-words.netlify.app/` (มี / ปิดท้าย ตรงกับหน้าเว็บ)
3. ถ้าต้องการอีเมล: แท็บ Basic settings → **OpenID Connect → Email address permission → Apply**
   (ไม่ขอก็ได้ — ผู้ใช้ LINE จะได้บัญชีใหม่แยกจากบัญชีที่สมัครด้วยอีเมล)
4. Render → Environment: `LINE_CHANNEL_ID` = Channel ID, `LINE_CHANNEL_SECRET` = Channel secret
5. กด **Publish** channel (ตอนเป็น Developing มีแค่ผู้ดูแล channel ที่ล็อกอินได้)

**Google**

1. https://console.cloud.google.com → APIs & Services → **OAuth consent screen** → External → กรอกชื่อแอป/อีเมล → Publish
2. **Credentials → Create credentials → OAuth client ID** → Web application →
   Authorized JavaScript origins = `https://forbidden-words.netlify.app` (ทดสอบบนเครื่องเพิ่ม `http://localhost:8081`)
3. Render → Environment: `GOOGLE_CLIENT_ID` = Client ID (ไม่ต้องใช้ Client secret)

ล็อกอินด้วย LINE / Google ที่อีเมล (ยืนยันแล้ว) ตรงกับบัญชีที่สมัครไว้ = เข้าบัญชีเดิม ไม่สร้างบัญชีซ้ำ

## Environment Variables ทั้งหมด

| ตัวแปร | ที่ไหน | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | backend | ✅ | `prod` (Dockerfile ตั้งไว้ให้แล้ว) |
| `DATABASE_URL` | backend | ✅ | JDBC URL ของ PostgreSQL |
| `DATABASE_USERNAME` | backend | ✅ | |
| `DATABASE_PASSWORD` | backend | ✅ | |
| `JWT_SECRET` | backend | ✅ | สุ่ม ≥ 32 ตัวอักษร — ถ้าเปลี่ยน ทุกคนต้องล็อกอินใหม่ |
| `CORS_ORIGINS` | backend | ✅ | URL ของ frontend คั่นด้วย comma |
| `ADMIN_USERNAMES` | backend | – | ชื่อผู้ใช้ที่ได้สิทธิ์ Admin คั่นด้วย comma |
| `PORT` | backend | – | แพลตฟอร์มตั้งให้เอง (ค่าเริ่มต้น 8080) |
| `PUBLIC_URL` | backend | – | URL หน้าเว็บ ใช้ทำลิงก์ในอีเมลรีเซ็ตรหัสผ่าน |
| `BREVO_API_KEY` / `MAIL_FROM` | backend | – | เปิดลืมรหัสผ่าน (ดูข้อ 6) |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` | backend | – | เปิดล็อกอินด้วย LINE |
| `GOOGLE_CLIENT_ID` | backend | – | เปิดล็อกอินด้วย Google |
| `EXPO_PUBLIC_API_URL` | frontend | ✅ | URL ของ backend |

ดูตัวอย่างใน [backend/.env.example](../backend/.env.example) และ [mobile/.env.example](../mobile/.env.example)

## ทดสอบ Docker บนเครื่องตัวเอง (ถ้ามี Docker)

```bash
cd backend
docker build -t forbidden-words-api .
docker run -p 8080:8080 --env-file .env forbidden-words-api
```
