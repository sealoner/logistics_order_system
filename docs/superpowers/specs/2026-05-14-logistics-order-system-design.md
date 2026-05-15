# 物流订单数据管理系统 — 设计文档

> 版本: v1.0 | 日期: 2026-05-14 | 状态: 待实施

---

## 一、项目概述

### 1.1 项目背景

亚马逊跨境电商业务中，多名学员的订单发往中转仓，中转仓重新称重后从 ERP 软件导出 Excel。当前需要一套系统来管理学员账号、统计物流费用、关联称重数据、监控运费余额，并提供数据可视化分析。

### 1.2 核心目标

- 学员账号管理：分配账号权限，学员登录查看自己的物流订单
- 运费预充值管理：手动充值，余额扣费，低余额预警
- Excel 数据导入：ERP 文件上传 + 物流明细上传，智能匹配与合并
- 数据可视化：多维度看板，净销售额、运费趋势、渠道分布等

---

## 二、技术选型

| 层面 | 选型 | 理由 |
|------|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 | 企业级 UI 组件库，Table/Form/Upload 开箱即用，响应式支持好 |
| 状态管理 | React Context + useReducer | 轻量，无需引入 Redux |
| HTTP 客户端 | Axios | 拦截器统一处理 token 和错误 |
| 图表 | ECharts (echarts-for-react) | 功能全面，支持折线图/柱状图/饼图 |
| 路由 | React Router v6 | 支持嵌套路由和路由守卫 |
| 后端 | Python 3.11+ FastAPI | 异步高性能，自动 OpenAPI 文档，Excel 处理生态好 |
| ORM | SQLAlchemy 2.0 | Python 最成熟的 ORM |
| Excel 解析 | openpyxl | 读写 .xlsx，支持样式保留 |
| 认证 | JWT (python-jose) | 无状态认证，适合前后端分离 |
| 密码加密 | passlib + bcrypt | 安全哈希 |
| 数据库 | SQLite | 单文件免部署，数据量级完全够用 |
| 前端构建 | Vite | 快速开发构建 |
| UI 风格 | 现代简约科技风 | 深色/浅色主题，高质感设计 |

---

## 三、系统架构

```
┌──────────────────────────────────────────────────────┐
│                  前端 (React 18 + Vite)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 管理后台  │ │ 学员端    │ │ PC 自适应 │ │ 手机端   │ │
│  │ (admin)  │ │ (student)│ │  布局    │ │ 布局    │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│          Ant Design 5 + React Router v6 + Axios       │
└──────────────────────┬───────────────────────────────┘
                       │ JWT Bearer Token
                       ▼
┌──────────────────────────────────────────────────────┐
│               后端 API (Python FastAPI)                │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 认证模块 │ │ 学员管理 │ │ 订单管理  │ │ 充值管理 │ │
│  │ /auth   │ │/students│ │ /orders  │ │/recharge │ │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ 文件上传 │ │ 数据统计 │ │ Excel 解析引擎        │ │
│  │ /upload  │ │/stats    │ │ 字段校验 + 姓名提取    │ │
│  │          │ │          │ │ + ID 匹配 + 去重处理  │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
└──────────────────────┬───────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
┌──────────────────────────────────────────────────────┐
│                 SQLite (logistics.db)                  │
└──────────────────────────────────────────────────────┘
```

### 角色权限

| 角色 | 权限范围 |
|------|----------|
| admin | 所有权限：学员管理、订单管理、文件上传、充值、查看全部数据 |
| student | 仅查看自己的订单、余额、账单、统计数据 |

---

## 四、数据库设计

### 4.1 users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| name | VARCHAR(50) | NOT NULL | 学员姓名（如"管林海"） |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 登录账号（姓名全拼无空格） |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 哈希 |
| role | VARCHAR(10) | NOT NULL, DEFAULT 'student' | admin / student |
| phone | VARCHAR(20) | | 手机号 |
| remark | TEXT | | 备注 |
| balance | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | 运费余额 |
| is_active | BOOLEAN | NOT NULL, DEFAULT 1 | 是否启用 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | | 更新时间 |

### 4.2 recharge_records（充值记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| student_id | INTEGER | FK → users.id, NOT NULL | 学员 |
| amount | DECIMAL(10,2) | NOT NULL | 充值金额 |
| balance_before | DECIMAL(10,2) | NOT NULL | 充值前余额 |
| balance_after | DECIMAL(10,2) | NOT NULL | 充值后余额 |
| remark | TEXT | | 备注 |
| created_at | DATETIME | NOT NULL | 充值时间 |

### 4.3 orders（订单表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| erp_order_id | BIGINT | UNIQUE, NOT NULL | ERP 订单 ID（去重键） |
| student_id | INTEGER | FK → users.id, NOT NULL | 关联学员 |
| order_time | DATETIME | | 订单时间 |
| source | VARCHAR(100) | | 原始来源字段 |
| currency | VARCHAR(10) | | 币种 |
| balance_amount | DECIMAL(10,2) | | 结余（净销售额），导入时从 "$17.18" 解析 |
| asin | VARCHAR(20) | | ASIN |
| status | VARCHAR(50) | | 订单状态 |
| image_url | TEXT | | 图片链接 |
| gross_weight | DECIMAL(10,2) | DEFAULT 0 | 毛重（g），来自物流明细表 |
| quantity | INTEGER | DEFAULT 0 | 数量 |
| channel | VARCHAR(100) | | 渠道 |
| tracking_no | VARCHAR(100) | | 追踪号 |
| freight | DECIMAL(10,2) | DEFAULT 0 | 运费 |
| service_fee | DECIMAL(10,2) | DEFAULT 0 | 服务费 |
| packing_fee | DECIMAL(10,2) | DEFAULT 0 | 打包费 |
| total_cost | DECIMAL(10,2) | DEFAULT 0 | 总费用 = freight + service_fee + packing_fee |
| region | VARCHAR(20) | | 地区 |
| import_batch_id | INTEGER | FK → import_batches.id | 导入批次 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | | 最后更新时间 |

### 4.4 cost_deductions（扣费记录表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| student_id | INTEGER | FK → users.id, NOT NULL | 学员 |
| order_id | INTEGER | FK → orders.id, NOT NULL | 关联订单 |
| amount | DECIMAL(10,2) | NOT NULL | 扣除金额（订单总费用） |
| balance_before | DECIMAL(10,2) | NOT NULL | 扣费前余额 |
| balance_after | DECIMAL(10,2) | NOT NULL | 扣费后余额 |
| created_at | DATETIME | NOT NULL | 扣费时间 |

### 4.5 import_batches（导入批次表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| file_type | VARCHAR(20) | NOT NULL | erp / logistics |
| file_name | VARCHAR(255) | NOT NULL | 原始文件名 |
| total_rows | INTEGER | NOT NULL | 总行数 |
| success_rows | INTEGER | NOT NULL | 成功导入行数 |
| skip_rows | INTEGER | NOT NULL | 跳过行数 |
| new_students | INTEGER | DEFAULT 0 | 自动创建的新学员数 |
| created_at | DATETIME | NOT NULL | 导入时间 |

### 4.6 初始化数据

系统首次启动时自动创建管理员账号：

| name | username | password | role |
|------|----------|----------|------|
| 管理员 | admin | admin123 | admin |

---

## 五、API 设计

基础路径: `/api`

### 5.1 认证模块 `/api/auth`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 公开 | 登录，返回 JWT token + 用户信息 |
| GET | `/api/auth/me` | 登录 | 获取当前用户信息 |
| PUT | `/api/auth/password` | 登录 | 修改密码（需旧密码） |

### 5.2 学员管理 `/api/students`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/students` | admin | 学员列表（分页、搜索、按余额排序） |
| POST | `/api/students` | admin | 新增学员 |
| GET | `/api/students/{id}` | admin | 学员详情（含余额、订单/充值/扣费统计） |
| PUT | `/api/students/{id}` | admin | 编辑学员信息 |
| PATCH | `/api/students/{id}/toggle` | admin | 启用/禁用学员 |
| GET | `/api/students/{id}/recharges` | admin | 某学员充值记录（分页） |
| POST | `/api/students/{id}/recharges` | admin | 手动充值 |
| GET | `/api/students/{id}/deductions` | admin/本人 | 某学员扣费记录（分页） |

### 5.3 订单管理 `/api/orders`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/orders` | 登录 | 订单列表（分页、筛选：学员/日期/渠道/状态；admin 看全部，student 看自己） |
| GET | `/api/orders/{id}` | 登录 | 订单详情 |
| PUT | `/api/orders/{id}` | admin | 手动修改订单 |
| GET | `/api/orders/export` | admin | 导出订单为 Excel |

### 5.4 文件上传 `/api/upload`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/upload/erp` | admin | 上传 ERP 文件 → 解析预览（含字段校验、姓名提取、重复检测、新学员检测） |
| POST | `/api/upload/erp/confirm` | admin | 确认导入（含重复处理决策、新学员确认） |
| POST | `/api/upload/logistics` | admin | 上传物流明细表 → 匹配预览（含字段校验、ID 匹配结果） |
| POST | `/api/upload/logistics/confirm` | admin | 确认导入，更新毛重 |
| GET | `/api/upload/batches` | admin | 导入批次历史 |

#### 上传流程详解

**ERP 文件上传流程：**

```
POST /upload/erp (multipart/form-data, file)
  → 后端读取 Excel，校验表头必需字段
  → 校验失败 → 返回 400 { error: "缺少字段: xxx, xxx" }
  → 校验通过 → 逐行解析：
      1. 提取 "来源" 中的学员姓名（正则: /亚马逊\s+(.+?)\s*\(/）
      2. 匹配系统已有学员
      3. 检测重复 erp_order_id
      4. 计算 total_cost = freight + service_fee + packing_fee
      5. 解析 balance_amount（去除 $ 符号转为数值）
  → 返回 JSON 预览数据：
      {
        "summary": { "total_rows": 39, "new_rows": 35, "duplicate_rows": 4 },
        "new_students": [{ "name": "新学员名", "username": "xinxueyuan" }],
        "duplicates": [{ "existing": {...}, "incoming": {...}, "diff_fields": [...] }],
        "preview": [{ ...每条解析后的订单数据 }]
      }
  → 前端展示预览 + 重复处理 + 新学员确认

POST /upload/erp/confirm (JSON)
  → 请求体：
      {
        "duplicate_decisions": { "erp_order_id": "keep_old" | "replace" | "merge" },
        "confirmed_students": ["管林海", "张仲豪"],
        "rows_to_import": [...]
      }
  → 后端：
      1. 创建新学员账号（已确认的）
      2. 按决策处理重复订单
      3. 逐条入库
      4. 计算扣费，生成 cost_deductions 记录
      5. 记录 import_batch
  → 返回导入结果
```

**物流明细上传流程：**

```
POST /upload/logistics (multipart/form-data, file)
  → 后端读取 Excel，校验表头必需字段
  → 校验失败 → 返回 400
  → 校验通过 → 逐行解析：
      1. 读取 ID
      2. 在 orders 表中查找 erp_order_id 匹配的记录
      3. 匹配成功 → 记录匹配对
      4. 匹配失败 → 记录未匹配项
  → 返回 JSON 预览：
      {
        "summary": { "total": 9, "matched": 7, "unmatched": 2 },
        "matched": [{ "logistics_id": 126758602, "order_id": ..., "weight": 340 }],
        "unmatched": [{ "logistics_id": 999999, "reason": "未找到对应订单" }]
      }

POST /upload/logistics/confirm (JSON)
  → 后端更新匹配成功的订单毛重字段
  → 记录 import_batch
  → 返回更新结果
```

### 5.5 数据统计 `/api/stats`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/stats/overview` | admin | 管理后台总览：学员总数、本月订单数、本月总运费、本月净销售总额、低余额学员数 |
| GET | `/api/stats/student/{id}` | admin/本人 | 单学员统计：余额、本月订单数、本月运费、本月净销售总额 |
| GET | `/api/stats/trends` | 登录 | 趋势数据：`?period=30d&type=orders\|freight\|sales` |
| GET | `/api/stats/channel-distribution` | admin | 各物流渠道订单分布 |
| GET | `/api/stats/student-ranking` | admin | 学员运费排名 Top10 |
| GET | `/api/stats/low-balance` | admin | 低余额学员列表（balance < 50） |

---

## 六、前端设计

### 6.1 页面路由

```
/login                     登录页

/admin/dashboard           管理员数据看板
/admin/students            学员管理列表
/admin/students/:id        学员详情（充值/扣费记录）
/admin/orders              订单管理列表
/admin/upload              文件上传页（ERP + 物流明细）
/admin/batches             导入批次历史

/student/dashboard         学员数据看板
/student/orders            我的订单列表
/student/billing           我的账单（充值+扣费流水）
```

### 6.2 布局方案

**PC 端（>1024px）：**
- 左侧固定侧边栏（Logo + 菜单导航 + 用户信息）
- 右侧内容区（Header 面包屑 + 主内容 + Footer）
- 侧边栏可折叠

**手机端（<768px）：**
- 顶部 Header（Logo + 汉堡菜单）
- 底部 TabBar（主要功能入口）
- 侧边菜单改为抽屉式弹出
- 表格横向可滚动，关键列固定

### 6.3 UI 风格

- **主题**：现代简约科技风，深色/浅色双主题
- **色调**：主色深蓝渐变，强调色亮蓝，卡片毛玻璃效果
- **字体**：系统默认中文字体，数字使用等宽字体
- **动效**：微交互过渡动画，骨架屏加载态
- **图标**：@ant-design/icons 统一图标库

### 6.4 关键页面功能

**登录页**：居中卡片式登录框，品牌 Logo，渐变背景

**管理员看板**：
- 顶部 5 个概览卡片（学员总数、本月订单数、本月总运费、本月净销售总额、低余额预警数）
- 净销售额趋势折线图（近 30 天每日净销售额汇总）
- 订单数量 & 运费金额双轴折线图（可切换日/月视图）
- 学员运费排名 Top10 柱状图
- 物流渠道分布饼图
- 低余额学员列表（红色高亮标记）
- 最近 5 次导入批次记录

**学员看板**：
- 顶部 4 个概览卡片（当前余额、本月订单数、本月总运费、本月净销售总额）
- 净销售额趋势折线图（近 30 天个人）
- 订单数量趋势折线图（近 30 天）
- 费用构成饼图（运费/服务费/打包费）
- 最近 10 笔订单列表

**学员管理页**：
- 表格列：姓名、账号、手机号、运费余额、订单数、状态、操作
- 余额 < 50 的行标记红色警告标签
- 操作：充值、查看详情、编辑、启用/禁用
- 顶部搜索框 + 新增学员按钮

**学员详情页**：
- 基本信息卡片
- 余额信息 + 快捷充值按钮
- Tab 切换：充值记录 / 扣费记录 / 订单列表

**订单管理页**：
- 筛选器：学员下拉、日期范围、渠道、状态
- 表格列：订单ID、学员、时间、ASIN、毛重、运费、服务费、打包费、总费用、结余、状态、图片预览
- 图片列显示缩略图，点击可放大
- 导出 Excel 按钮

**文件上传页**：
- 两个上传卡片并排（ERP 文件上传 / 物流明细上传）
- 拖拽上传区域 + 文件选择按钮
- 上传后显示解析预览表格
- 重复订单对比弹窗（旧 vs 新，高亮差异字段）
- 新学员确认弹窗
- 确认导入按钮

### 6.5 路由守卫

```typescript
// AdminRoute: 检查 role === 'admin'，否则跳转 403
// StudentRoute: 检查 role === 'student'，否则跳转 403
// ProtectedRoute: 检查是否登录，未登录跳 /login
```

---

## 七、核心业务逻辑

### 7.1 姓名提取

```
来源字段格式: "亚马逊 管林海 (美国)"
提取正则: /亚马逊\s+(.+?)\s*\(/
提取结果: "管林海"

处理边界：
- 无括号 → 取"亚马逊 "之后全部内容
- 无"亚马逊 "前缀 → 取全部内容作为姓名
- 提取后 trim 处理空白字符
```

### 7.2 学员账号自动生成 & 重名处理

**账号生成规则：**

```
姓名 "管林海" → 全拼 "guanlinhai" → username = "guanlinhai"
姓名 "张仲豪" → 全拼 "zhangzhonghao" → username = "zhangzhonghao"

密码 = username（首次创建时）
使用 pypinyin 库进行汉字转拼音
若拼音账号已存在，追加数字后缀: guanlinhai2
```

**重名处理机制：**

当 Excel 中提取的姓名与系统中已有学员同名时，分两种情况：

| 场景 | 判断依据 | 处理方式 |
|------|----------|----------|
| 同一人 | 管理员确认为同一人 | 直接关联已有账号，订单归属该学员 |
| 不同人（重名） | 管理员判断为不同人 | 手动创建新账号，系统在姓名后追加区分标记 |

**上传预览中的重名提醒：**

- 上传 ERP 文件后，预览界面将姓名匹配结果分为三类：
  - **已匹配学员**（绿色标签）：姓名在系统中已存在，订单自动关联
  - **新学员**（蓝色标签）：姓名在系统中不存在，确认后将自动创建账号
  - **⚠ 重名提醒**：当新学员姓名与已有学员完全相同时，额外标记警告，由管理员确认是"关联已有账号"还是"创建独立新账号"

**创建独立新账号时的区分方式：**

- 管理员手动为该学员添加备注（如"管林海-上海"、"管林海-A组"）来区分
- 账号自动追加后缀（如 guanlinhai2），管理员可在确认前手动修改
- 学员列表中通过备注 + 手机号 + 创建时间来区分同名学员

### 7.3 运费扣费逻辑

```
ERP 导入确认时：
  total_cost = freight + service_fee + packing_fee
  IF student.balance >= total_cost:
    student.balance -= total_cost
    生成 cost_deduction 记录
  ELSE:
    student.balance -= total_cost（余额可为负）
    生成 cost_deduction 记录
    标记该学员为低余额警告
```

### 7.4 低余额警告

```
触发条件: balance < 50 元
展示位置:
  - 管理员看板：低余额学员数卡片 + 低余额列表
  - 学员列表：余额列红色标签
  - 学员端：登录后顶部横幅提醒 + 看板余额卡片红色边框
```

### 7.5 重复订单处理（三种策略）

| 策略 | 行为 | 适用场景 |
|------|------|----------|
| keep_old | 保留旧数据，跳过新记录 | 旧数据已完善，新数据无价值 |
| replace | 用新数据完全覆盖旧数据 | 数据有重大更新，以新为准 |
| merge | 旧记录空字段用新数据填充，已有数据保持不变 | 数据逐步完善，新数据补充旧数据缺失的字段 |

### 7.6 物流明细 ID 匹配

```
物流明细表.ID → orders.erp_order_id
匹配成功 → 更新 orders.gross_weight = 物流明细表.重量
匹配失败 → 记录未匹配项，导入结果中展示
```

### 7.7 字段校验规则

**ERP 文件必需字段（16个）**：
`id, 时间, 来源, 币种, 结余, ASIN, 状态, 图片, 毛重, 数量, 渠道, 追踪号, 运费, 服务费, 打包费, 地区`

**物流明细文件必需字段（13个）**：
`ID, 渠道名称, 国家, 重量, 业务员, 追踪号, 物流费, 服务费, 打包费, 物流总费用, 状态, 物流状态, 时间`

**校验规则**：
- 不要求字段顺序一致
- 缺字段 → 拒绝导入，返回 400 + 缺失字段列表
- 多余字段 → 忽略
- 字段名完全匹配（大小写敏感）

---

## 八、项目结构

```
logistics_order_system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置（数据库路径、JWT密钥等）
│   │   ├── database.py          # SQLAlchemy 引擎 & Session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── order.py
│   │   │   ├── recharge.py
│   │   │   ├── deduction.py
│   │   │   └── batch.py
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── student.py
│   │   │   ├── order.py
│   │   │   └── upload.py
│   │   ├── routers/             # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── students.py
│   │   │   ├── orders.py
│   │   │   ├── upload.py
│   │   │   └── stats.py
│   │   ├── services/            # 业务逻辑
│   │   │   ├── __init__.py
│   │   │   ├── excel_parser.py  # Excel 解析引擎
│   │   │   ├── name_extractor.py # 姓名提取
│   │   │   └── deduction.py     # 扣费逻辑
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── auth.py          # JWT 工具
│   │       └── pinyin.py        # 拼音转换
│   ├── requirements.txt
│   └── init_db.py               # 初始化数据库 + 管理员账号
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                 # Axios 封装 + 接口定义
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── students.ts
│   │   │   ├── orders.ts
│   │   │   ├── upload.ts
│   │   │   └── stats.ts
│   │   ├── contexts/            # React Context
│   │   │   └── AuthContext.tsx
│   │   ├── components/          # 通用组件
│   │   │   ├── Layout/
│   │   │   ├── RouteGuard/
│   │   │   ├── StatCard/
│   │   │   └── DuplicateModal/
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Students/
│   │   │   │   ├── StudentDetail/
│   │   │   │   ├── Orders/
│   │   │   │   ├── Upload/
│   │   │   │   └── Batches/
│   │   │   └── student/
│   │   │       ├── Dashboard/
│   │   │       ├── Orders/
│   │   │       └── Billing/
│   │   ├── styles/
│   │   │   └── global.css
│   │   └── utils/
│   │       └── index.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── sucai/                       # 示例文件（已有）
│   ├── 导出订单20260514055011.xlsx
│   └── 美国特快专线-物流费用统计0514.xlsx
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-14-logistics-order-system-design.md
```

---

## 九、部署方案

### 开发环境

```bash
# 后端
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
```

### 生产环境

- 后端：gunicorn + uvicorn workers，Nginx 反向代理
- 前端：`npm run build` 生成静态文件，Nginx 托管
- 数据库：SQLite 文件放在持久化目录
- 可选：使用 Docker Compose 一键部署

---

## 十、风险与注意事项

1. **拼音转换准确性**：多音字可能导致账号不准确，需管理员手动修正
2. **Excel 格式兼容**：不同 ERP 版本导出格式可能略有差异，字段校验可拦截大部分问题
3. **并发安全**：SQLite 写锁限制，单用户场景无问题，多用户高并发时需迁移 PostgreSQL
4. **数据备份**：建议定期备份 logistics.db 文件
5. **小程序适配**：API 完全可复用，前端需用 Taro/uni-app 重写，数据层不变