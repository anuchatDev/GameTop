# คู่มือ Deploy ออนไลน์

ลำดับ: **Database → Backend → Frontend → กลับไปตั้ง CORS ที่ Backend**

## 1. Database — Neon (PostgreSQL ฟรี)

1. สมัครที่ https://neon.tech → Create project (เลือก region Singapore)
2. หน้า Dashboard → **Connection Details** เลือกแบบ *Java / JDBC* จะได้ข้อมูล 3 ค่า:
   - `DATABASE_URL` = `jdbc:postgresql://ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   - `DATABASE_USERNAME` = `neondb_owner`
   - `DATABASE_PASSWORD` = รหัสผ่านที่ Neon ให้มา

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

## 4. ปิด CORS ให้เหลือเฉพาะเว็บของเรา

กลับไปที่ Render → Environment → แก้ `CORS_ORIGINS` เป็น URL frontend จริง เช่น
`https://forbidden-words.netlify.app` (หลายค่าคั่นด้วย comma) → Save (Render จะ redeploy ให้)

## Environment Variables ทั้งหมด

| ตัวแปร | ที่ไหน | จำเป็น | คำอธิบาย |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | backend | ✅ | `prod` (Dockerfile ตั้งไว้ให้แล้ว) |
| `DATABASE_URL` | backend | ✅ | JDBC URL ของ PostgreSQL |
| `DATABASE_USERNAME` | backend | ✅ | |
| `DATABASE_PASSWORD` | backend | ✅ | |
| `JWT_SECRET` | backend | ✅ | สุ่ม ≥ 32 ตัวอักษร — ถ้าเปลี่ยน ทุกคนต้องล็อกอินใหม่ |
| `CORS_ORIGINS` | backend | ✅ | URL ของ frontend คั่นด้วย comma |
| `PORT` | backend | – | แพลตฟอร์มตั้งให้เอง (ค่าเริ่มต้น 8080) |
| `EXPO_PUBLIC_API_URL` | frontend | ✅ | URL ของ backend |

ดูตัวอย่างใน [backend/.env.example](../backend/.env.example) และ [mobile/.env.example](../mobile/.env.example)

## ทดสอบ Docker บนเครื่องตัวเอง (ถ้ามี Docker)

```bash
cd backend
docker build -t forbidden-words-api .
docker run -p 8080:8080 --env-file .env forbidden-words-api
```
