from sqlalchemy.orm import Session

from app.models.user import User
from app.models.order import Order
from app.models.deduction import CostDeduction


def deduct_order_cost(db: Session, student: User, order: Order):
    total_cost = float(order.total_cost)
    balance_before = float(student.balance)
    balance_after = balance_before - total_cost

    student.balance = balance_after

    deduction = CostDeduction(
        student_id=student.id,
        order_id=order.id,
        amount=total_cost,
        balance_before=balance_before,
        balance_after=balance_after,
    )
    db.add(deduction)
    return deduction