import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'logistics.db')}"

SECRET_KEY = os.getenv("SECRET_KEY", "logistics-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

ERP_REQUIRED_FIELDS = [
    "id", "时间", "来源", "币种", "结余", "ASIN", "状态", "图片",
    "毛重", "数量", "渠道", "追踪号", "运费", "服务费", "打包费", "地区"
]

LOGISTICS_REQUIRED_FIELDS = [
    "ID", "渠道名称", "国家", "重量", "业务员", "追踪号",
    "物流费", "服务费", "打包费", "物流总费用", "状态", "物流状态", "时间"
]

LOW_BALANCE_THRESHOLD = 50