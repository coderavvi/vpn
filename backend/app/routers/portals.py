"""
Department Portals Router.
Provides protected internal enterprise application resources for HR, Finance, and IT.
Enforces Role-Based Micro-Segmentation and logs unauthorized access attempts.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AccessViolation
from app.services.rbac_service import check_user_permission
from app.services.auth_service import sanitize_ip
from app.middleware.auth_middleware import get_current_user
from app.middleware.vpn_required import require_vpn_connection

router = APIRouter(prefix="/api/portals", tags=["Department Portals"])


def _record_violation(
    db: Session,
    user: User,
    request: Request,
    target_segment: str,
    target_ip: str,
    target_port: int,
):
    """Log an unauthorized access violation to the database."""
    client_ip = request.client.host if request.client else None
    if user.wireguard_client and user.wireguard_client.assigned_ip:
        vpn_ip = str(user.wireguard_client.assigned_ip)
    else:
        vpn_ip = sanitize_ip(client_ip) or "10.10.0.0"

    violation = AccessViolation(
        user_id=user.id,
        vpn_client_ip=vpn_ip,
        destination_ip=target_ip,
        destination_port=target_port,
        protocol="TCP",
        violation_type=f"UNAUTHORIZED_{target_segment.upper()}_ACCESS",
        action_taken="BLOCKED",
        nftables_rule_matched=f"ip saddr != @{target_segment.replace('-', '_')}_users drop",
    )
    db.add(violation)
    db.commit()


@router.get("/hr", response_model=Dict[str, Any], dependencies=[Depends(require_vpn_connection)])
def get_hr_portal(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Access the HR Department Portal.
    Protected by micro-segmentation: strictly permits HR and Admin roles.
    Unauthorized attempts trigger an AccessViolation log entry and HTTP 403.
    """
    if not check_user_permission(current_user, "hr-ns"):
        _record_violation(
            db=db,
            user=current_user,
            request=request,
            target_segment="hr-ns",
            target_ip="10.20.10.2",
            target_port=9001,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your role does not have authorization for the HR micro-segment (10.20.10.0/24:9001)",
        )

    return {
        "department": "Human Resources",
        "segment": "hr-ns",
        "portal_address": "10.20.10.2:9001",
        "status": "authorized",
        "user": current_user.username,
        "role": current_user.role.name if current_user.role else "None",
        "data": {
            "total_employees": 142,
            "open_requisitions": 8,
            "onboarding_pending": 3,
            "payroll_period": "2026-09",
            "announcements": [
                {"id": 1, "title": "Annual Open Enrollment", "date": "2026-10-01"},
                {"id": 2, "title": "Q3 Performance Reviews Due", "date": "2026-09-30"},
            ],
            "quick_links": [
                {"name": "Employee Directory", "path": "/hr/directory"},
                {"name": "Leave Management", "path": "/hr/leave"},
                {"name": "Benefits Portal", "path": "/hr/benefits"},
            ],
        },
    }


@router.get("/finance", response_model=Dict[str, Any], dependencies=[Depends(require_vpn_connection)])
def get_finance_portal(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Access the Finance Department Portal.
    Protected by micro-segmentation: strictly permits Finance and Admin roles.
    Unauthorized attempts trigger an AccessViolation log entry and HTTP 403.
    """
    if not check_user_permission(current_user, "finance-ns"):
        _record_violation(
            db=db,
            user=current_user,
            request=request,
            target_segment="finance-ns",
            target_ip="10.20.20.2",
            target_port=9002,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your role does not have authorization for the Finance micro-segment (10.20.20.0/24:9002)",
        )

    return {
        "department": "Finance",
        "segment": "finance-ns",
        "portal_address": "10.20.20.2:9002",
        "status": "authorized",
        "user": current_user.username,
        "role": current_user.role.name if current_user.role else "None",
        "data": {
            "q3_revenue": "$4,250,000",
            "operating_budget_remaining": "$820,000",
            "invoices_pending_approval": 12,
            "fiscal_year": "FY2026",
            "ledger_summary": {
                "accounts_receivable": "$540,200",
                "accounts_payable": "$210,400",
                "cash_reserve": "$3,100,000",
            },
            "quick_links": [
                {"name": "General Ledger", "path": "/fin/ledger"},
                {"name": "Expense Approvals", "path": "/fin/expenses"},
                {"name": "Financial Reports", "path": "/fin/reports"},
            ],
        },
    }


@router.get("/it", response_model=Dict[str, Any], dependencies=[Depends(require_vpn_connection)])
def get_it_portal(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Access the IT Operations Portal.
    Protected by micro-segmentation: strictly permits IT and Admin roles.
    Unauthorized attempts trigger an AccessViolation log entry and HTTP 403.
    """
    if not check_user_permission(current_user, "it-ns"):
        _record_violation(
            db=db,
            user=current_user,
            request=request,
            target_segment="it-ns",
            target_ip="10.20.30.2",
            target_port=9003,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your role does not have authorization for the IT micro-segment (10.20.30.0/24:9003)",
        )

    return {
        "department": "IT Operations",
        "segment": "it-ns",
        "portal_address": "10.20.30.2:9003",
        "status": "authorized",
        "user": current_user.username,
        "role": current_user.role.name if current_user.role else "None",
        "data": {
            "infrastructure_status": "All Systems Nominal",
            "active_nodes": 8,
            "open_tickets": 5,
            "uptime": "99.98%",
            "network_namespaces": ["hr-ns", "finance-ns", "it-ns"],
            "wireguard_gateway": "10.10.0.1",
            "quick_links": [
                {"name": "DNS Management", "path": "/it/dns"},
                {"name": "Firewall Diagnostics", "path": "/it/firewall"},
                {"name": "Server Topology", "path": "/it/topology"},
            ],
        },
    }
