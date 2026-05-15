from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.batch import ImportBatch
from app.schemas.upload import ErpConfirmRequest, BatchResponse, LogisticsConfirmItem
from app.utils.auth import require_admin, hash_password
from app.services.excel_parser import validate_fields, parse_erp_row, parse_logistics_row, read_excel_to_dicts
from app.services.name_extractor import extract_student_name
from app.services.deduction import deduct_order_cost
from app.utils.pinyin import generate_username
from app.config import ERP_REQUIRED_FIELDS, LOGISTICS_REQUIRED_FIELDS

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/erp")
def upload_erp(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 文件")

    content = file.file.read()
    headers, rows = read_excel_to_dicts(content)

    missing = validate_fields(headers, ERP_REQUIRED_FIELDS)
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少字段: {', '.join(missing)}")

    existing_students = {u.name: u for u in db.query(User).filter(User.role == "student").all()}
    existing_order_ids = {o.erp_order_id: o for o in db.query(Order).all()}

    preview = []
    new_students_map: dict[str, dict] = {}
    duplicates = []
    all_usernames = {u.username for u in db.query(User).all()}

    for row in rows:
        parsed = parse_erp_row(row)
        student_name = extract_student_name(parsed["source"])
        parsed["student_name"] = student_name

        if student_name and student_name not in existing_students and student_name not in new_students_map:
            is_dup = student_name in existing_students
            username = generate_username(student_name, all_usernames)
            all_usernames.add(username)
            new_students_map[student_name] = {
                "name": student_name,
                "username": username,
                "is_duplicate_name": False,
                "existing_student_id": None,
            }
        elif student_name in existing_students:
            parsed["student_match"] = "matched"
        elif student_name in new_students_map:
            parsed["student_match"] = "new"

        if parsed["erp_order_id"] in existing_order_ids:
            existing = existing_order_ids[parsed["erp_order_id"]]
            existing_dict = {
                "erp_order_id": existing.erp_order_id,
                "order_time": existing.order_time.isoformat() if existing.order_time else None,
                "freight": float(existing.freight),
                "service_fee": float(existing.service_fee),
                "packing_fee": float(existing.packing_fee),
                "total_cost": float(existing.total_cost),
                "gross_weight": float(existing.gross_weight),
                "status": existing.status,
                "channel": existing.channel,
                "tracking_no": existing.tracking_no,
                "image_url": existing.image_url,
                "balance_amount": float(existing.balance_amount) if existing.balance_amount else None,
            }
            diff_fields = []
            for key in ["freight", "service_fee", "packing_fee", "total_cost", "status", "channel", "tracking_no", "image_url", "balance_amount"]:
                old_val = existing_dict.get(key)
                new_val = parsed.get(key)
                if old_val != new_val:
                    diff_fields.append(key)
            duplicates.append({
                "erp_order_id": parsed["erp_order_id"],
                "existing": existing_dict,
                "incoming": parsed,
                "diff_fields": diff_fields,
            })
        else:
            preview.append(parsed)

    summary = {
        "total_rows": len(rows),
        "new_rows": len(preview),
        "duplicate_rows": len(duplicates),
    }

    return {
        "summary": summary,
        "new_students": list(new_students_map.values()),
        "duplicates": duplicates,
        "preview": preview,
    }


@router.post("/erp/confirm")
def confirm_erp(
    req: ErpConfirmRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing_students = {u.name: u for u in db.query(User).filter(User.role == "student").all()}
    all_usernames = {u.username for u in db.query(User).all()}
    new_students_created = 0

    student_cache: dict[str, User] = dict(existing_students)

    for name in req.confirmed_students:
        if name not in student_cache:
            username = generate_username(name, all_usernames)
            all_usernames.add(username)
            student = User(
                name=name,
                username=username,
                password_hash=hash_password(username),
                role="student",
            )
            db.add(student)
            db.flush()
            student_cache[name] = student
            new_students_created += 1

    batch = ImportBatch(
        file_type="erp",
        file_name="erp_import",
        total_rows=len(req.rows_to_import),
        success_rows=0,
        skip_rows=0,
        new_students=new_students_created,
    )
    db.add(batch)
    db.flush()

    success = 0
    skip = 0

    for row_data in req.rows_to_import:
        erp_id = row_data["erp_order_id"]
        decision = req.duplicate_decisions.get(str(erp_id))

        existing_order = db.query(Order).filter(Order.erp_order_id == erp_id).first()

        if existing_order:
            # 默认使用智能合并处理重复订单
            if decision == "keep_old":
                skip += 1
                continue
            elif decision == "replace":
                _apply_order_data(existing_order, row_data)
                db.flush()
                success += 1
            else:  # 默认使用智能合并
                _merge_order_data(existing_order, row_data)
                db.flush()
                success += 1
        else:
            student_name = row_data.get("student_name", "")
            student = student_cache.get(student_name)
            if not student:
                skip += 1
                continue

            order = Order(student_id=student.id, import_batch_id=batch.id)
            _apply_order_data(order, row_data)
            db.add(order)
            db.flush()

            if order.total_cost > 0:
                deduct_order_cost(db, student, order)

            success += 1

    batch.success_rows = success
    batch.skip_rows = skip
    db.commit()

    return {"message": "导入完成", "success_rows": success, "skip_rows": skip, "new_students": new_students_created}


@router.post("/logistics")
def upload_logistics(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 文件")

    content = file.file.read()
    headers, rows = read_excel_to_dicts(content)

    missing = validate_fields(headers, LOGISTICS_REQUIRED_FIELDS)
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少字段: {', '.join(missing)}")

    existing_order_ids = {o.erp_order_id: o for o in db.query(Order).all()}

    # 统计每个物流ID出现的次数
    logistics_id_counts = {}
    for row in rows:
        parsed = parse_logistics_row(row)
        lid = parsed["logistics_id"]
        logistics_id_counts[lid] = logistics_id_counts.get(lid, 0) + 1

    matched = []
    unmatched = []

    for row in rows:
        parsed = parse_logistics_row(row)
        lid = parsed["logistics_id"]

        if lid in existing_order_ids:
            order = existing_order_ids[lid]
            matched.append({
                "logistics_id": lid,
                "order_id": order.id,
                "erp_order_id": order.erp_order_id,
                "weight": parsed["weight"],
                "current_gross_weight": float(order.gross_weight),
                "logistics_fee": parsed["logistics_fee"],
                "current_freight": float(order.freight),
                "service_fee": parsed["service_fee"],
                "current_service_fee": float(order.service_fee),
                "packing_fee": parsed["packing_fee"],
                "current_packing_fee": float(order.packing_fee),
                "channel_name": parsed["channel_name"],
                "tracking_no": parsed["tracking_no"],
                "duplicate_count": logistics_id_counts[lid],
            })
        else:
            unmatched.append({
                "logistics_id": lid,
                "reason": "未找到对应订单",
            })

    return {
        "summary": {"total": len(rows), "matched": len(matched), "unmatched": len(unmatched)},
        "matched": matched,
        "unmatched": unmatched,
    }


@router.post("/logistics/confirm")
def confirm_logistics(
    matched_items: list[LogisticsConfirmItem],
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    updated = 0
    created = 0
    batch = ImportBatch(
        file_type="logistics",
        file_name="logistics_import",
        total_rows=len(matched_items),
        success_rows=0,
        skip_rows=0,
    )
    db.add(batch)
    db.flush()

    # 按物流ID分组
    grouped_by_lid = {}
    for item in matched_items:
        if item.logistics_id not in grouped_by_lid:
            grouped_by_lid[item.logistics_id] = []
        grouped_by_lid[item.logistics_id].append(item)

    for lid, items in grouped_by_lid.items():
        # 获取原始订单
        original_order = db.query(Order).filter(Order.id == items[0].order_id).first()
        if not original_order:
            continue

        # 计算平均净销售额
        original_balance = float(original_order.balance_amount or 0)
        item_count = len(items)
        avg_balance = round(original_balance / item_count, 2)

        # 处理第一条数据（更新现有订单）
        first_item = items[0]
        if first_item.weight is not None:
            original_order.gross_weight = first_item.weight
        if first_item.logistics_fee is not None:
            original_order.freight = first_item.logistics_fee
        if first_item.service_fee is not None:
            original_order.service_fee = first_item.service_fee
        if first_item.packing_fee is not None:
            original_order.packing_fee = first_item.packing_fee
        if first_item.channel_name:
            original_order.channel = first_item.channel_name
        if first_item.tracking_no:
            original_order.tracking_no = first_item.tracking_no
        
        original_order.balance_amount = avg_balance
        original_order.total_cost = (original_order.freight or 0) + (original_order.service_fee or 0) + (original_order.packing_fee or 0)
        updated += 1

        # 处理剩余的数据（创建新订单）
        for item in items[1:]:
            new_order = Order(
                erp_order_id=original_order.erp_order_id,
                student_id=original_order.student_id,
                asin=original_order.asin,
                order_time=original_order.order_time,
                gross_weight=item.weight or original_order.gross_weight,
                freight=item.logistics_fee or 0,
                service_fee=item.service_fee or 0,
                packing_fee=item.packing_fee or 0,
                total_cost=(item.logistics_fee or 0) + (item.service_fee or 0) + (item.packing_fee or 0),
                balance_amount=avg_balance,
                status=original_order.status,
                channel=item.channel_name or original_order.channel,
                tracking_no=item.tracking_no or original_order.tracking_no,
                image_url=original_order.image_url,
            )
            db.add(new_order)
            created += 1

    batch.success_rows = updated + created
    db.commit()

    return {"message": "导入完成", "updated_rows": updated, "created_rows": created}


@router.get("/batches")
def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(ImportBatch)
    total = query.count()
    batches = query.order_by(ImportBatch.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": batches}


def _parse_order_time(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val)
        except (ValueError, TypeError):
            return None
    return None


def _apply_order_data(order, data: dict):
    order.erp_order_id = data["erp_order_id"]
    order.order_time = _parse_order_time(data.get("order_time"))
    order.source = data.get("source", "")
    order.currency = data.get("currency", "")
    order.balance_amount = data.get("balance_amount")
    order.asin = data.get("asin", "")
    order.status = data.get("status", "")
    order.image_url = data.get("image_url", "")
    order.gross_weight = data.get("gross_weight", 0)
    order.quantity = data.get("quantity", 0)
    order.channel = data.get("channel", "")
    order.tracking_no = data.get("tracking_no", "")
    order.freight = data.get("freight", 0)
    order.service_fee = data.get("service_fee", 0)
    order.packing_fee = data.get("packing_fee", 0)
    order.total_cost = data.get("total_cost", 0)
    order.region = data.get("region", "")


def _merge_order_data(existing_order, new_data: dict):
    for field in ["order_time", "source", "currency", "balance_amount", "asin", "status",
                  "image_url", "gross_weight", "quantity", "channel", "tracking_no",
                  "freight", "service_fee", "packing_fee", "total_cost", "region"]:
        current_val = getattr(existing_order, field, None)
        new_val = new_data.get(field)
        if current_val is None or current_val == 0 or current_val == "":
            if new_val is not None and new_val != 0 and new_val != "":
                setattr(existing_order, field, new_val)

    existing_order.total_cost = (existing_order.freight or 0) + (existing_order.service_fee or 0) + (existing_order.packing_fee or 0)