# 🛠️ Setup Guide — 第一次跑起来

按顺序做完，应该 10 分钟内能看到 API 跑起来。

---

## ✅ 前置检查

打开终端，确认你都装好了：

```bash
python3 --version    # 需要 3.11 或更新
node --version       # 需要 18 或更新
git --version
```

---

## 1️⃣ 启动后端 (FastAPI)

```bash
cd finance-tracker/backend

# 创建虚拟环境（强烈推荐）
python3 -m venv .venv

# 激活虚拟环境
# macOS / Linux:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# 装依赖
pip install -r requirements.txt

# 复制环境变量
cp .env.example .env

# 生成一个真正的 SECRET_KEY，然后粘贴到 .env 里
python3 -c "import secrets; print(secrets.token_hex(32))"

# 启动开发服务器
uvicorn app.main:app --reload
```

打开浏览器访问：

- 👉 **API 文档（自动生成）**: http://localhost:8000/docs
- 👉 **健康检查**: http://localhost:8000/health

在 `/docs` 页面，你可以**直接在浏览器里**注册用户、登录、调用 API。这是 FastAPI 最爽的地方。

### 跑测试

```bash
# 在 backend/ 目录下，激活虚拟环境后
pytest -v
```

应该看到 ~10 个测试全部通过。

---

## 2️⃣ 启动前端 (Next.js)

新开一个终端窗口（不要关后端）：

```bash
cd finance-tracker

# 创建 Next.js 项目（这会问几个问题，按 ROADMAP.md Milestone 1 里的答案选）
npx create-next-app@latest frontend

cd frontend

# 装核心库
npm install @tanstack/react-query axios react-hook-form zod recharts lucide-react

# 装 shadcn/ui
npx shadcn@latest init

# 启动开发服务器
npm run dev
```

打开浏览器：

- 👉 **前端**: http://localhost:3000

---

## 3️⃣ 把前后端连起来

在 `frontend/.env.local` 里加一行：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

在 `frontend/src/lib/api.ts` 里建一个 axios 实例（详见 ROADMAP Milestone 1）。

---

## 4️⃣ 用 Git 跟踪进度

```bash
cd finance-tracker

git init
git add .
git commit -m "Initial commit: backend skeleton + project structure"

# 在 GitHub 上建一个 repo（叫 finance-tracker），然后
git remote add origin git@github.com:你的用户名/finance-tracker.git
git branch -M main
git push -u origin main
```

**重要原则**：每完成一个小功能就 commit。招聘的人看 GitHub 时会看 commit history——稳定、频繁的提交比一次性 dump 1000 行强 100 倍。

---

## 🐛 常见问题

**Q: `pip install` 报 bcrypt 编译错误？**
A: macOS 上可能需要 `brew install rust`。或者把 `passlib[bcrypt]` 换成 `bcrypt==4.0.1`。

**Q: 后端能跑但前端调用 API 报 CORS 错误？**
A: 确认 `backend/.env` 里 `FRONTEND_ORIGIN=http://localhost:3000`，并且重启后端。

**Q: 端口被占用？**
A: 后端: `uvicorn app.main:app --reload --port 8001`。前端: `npm run dev -- --port 3001`。

**Q: 我应该一直用 SQLite 吗？**
A: 开发阶段 SQLite 完全够。**部署上线之前**才需要切到 Postgres（Milestone 5）。SQLite 文件 (`finance.db`) 已经在 `.gitignore` 里。

---

## 🎯 第一天的目标

做完上面 1-4 步，你应该能：

1. ✅ 在浏览器里看到 FastAPI 的 Swagger UI
2. ✅ 通过 `/docs` 注册一个用户、登录拿到 token、创建一个 account
3. ✅ `pytest` 全绿
4. ✅ Next.js 默认页面在 3000 端口跑起来
5. ✅ GitHub repo 里有第一个 commit

做到这里就可以休息了——你已经有了一个**真正的全栈项目骨架**。明天开始按 ROADMAP Milestone 1 写前端登录页。
