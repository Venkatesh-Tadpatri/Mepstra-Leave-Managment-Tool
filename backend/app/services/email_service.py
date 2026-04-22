import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

WEEKEND_WORK_PREFIX = "weekend work request:"


def _request_meta(leave_type: str, reason: str = ""):
    normalized_reason = (reason or "").strip().lower()
    if leave_type == "special" and normalized_reason.startswith(WEEKEND_WORK_PREFIX):
        return {
            "entity": "Weekend Work Request",
            "approval_heading": "Weekend Work Approval Request",
            "type_label": "Weekend Work",
            "type_row_label": "Request Type",
            "apply_sentence": "has submitted a weekend work request and requires your approval.",
        }
    if leave_type == "special":
        return {
            "entity": "Compensate Leave Request",
            "approval_heading": "Compensate Leave Approval Request",
            "type_label": "Compensate Leave",
            "type_row_label": "Leave Type",
            "apply_sentence": "has applied for compensate leave and requires your approval.",
        }
    return {
        "entity": "Leave Request",
        "approval_heading": "Leave Approval Request",
        "type_label": leave_type.title(),
        "type_row_label": "Leave Type",
        "apply_sentence": "has applied for leave and requires your approval.",
    }


def send_email(to_email: str, subject: str, html_body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("Email not configured, skipping send to %s", to_email)
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())
        logger.info("Email sent to %s", to_email)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))


def send_leave_request_email(employee_name: str, leave_type: str, start_date, end_date,
                              total_days: float, reason: str, approver_email: str,
                              approver_name: str, leave_id: int):
    meta = _request_meta(leave_type, reason)
    subject = f"{meta['approval_heading']} - {employee_name} [{meta['type_label']}]"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
    <div style="background:#1a56db;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">{meta['approval_heading']}</h2>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <p>Dear <strong>{approver_name}</strong>,</p>
      <p><strong>{employee_name}</strong> {meta['apply_sentence']}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>{meta['type_row_label']}</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{meta['type_label']}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>From</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{start_date}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>To</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{end_date}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>Total Days</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{total_days} day(s)</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>Reason</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{reason}</td></tr>
      </table>
      <p>Please login to the <strong>Mepstra Leave Portal</strong> to approve or reject this request.</p>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from {settings.COMPANY_NAME}.</p>
    </div></body></html>
    """
    send_email(approver_email, subject, html)


def send_otp_email(to_email: str, otp: str):
    subject = "Your OTP for Mepstra Leave Portal Registration"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
    <div style="background:#1a56db;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">Email Verification — Mepstra Leave Portal</h2>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <p>Hi there,</p>
      <p>Use the One-Time Password (OTP) below to verify your email and complete registration:</p>
      <div style="margin:24px 0;text-align:center">
        <span style="display:inline-block;font-size:36px;font-weight:bold;letter-spacing:10px;
                     background:#f0f4ff;border:2px dashed #1a56db;border-radius:12px;
                     padding:16px 32px;color:#1a56db">{otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">This OTP is valid for <strong>2 minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from {settings.COMPANY_NAME}.</p>
    </div></body></html>
    """
    send_email(to_email, subject, html)


def send_admin_approved_manager_notification(manager_email: str, manager_name: str,
                                              employee_name: str, leave_type: str,
                                              start_date, end_date, total_days: float,
                                              reason: str, comment: str = ""):
    meta = _request_meta(leave_type, reason)
    subject = f"FYI: Admin approved {employee_name}'s {meta['type_label']} leave"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
    <div style="background:#7c3aed;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">Leave Approved by Admin</h2>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <p>Dear <strong>{manager_name}</strong>,</p>
      <p>This is to inform you that the Admin has approved <strong>{employee_name}</strong>'s leave request on your behalf.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>{meta['type_row_label']}</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{meta['type_label']}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>Employee</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{employee_name}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>From</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{start_date}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>To</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{end_date}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>Total Days</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{total_days} day(s)</td></tr>
        {"<tr><td style='padding:10px;border:1px solid #e5e7eb'><strong>Admin Comment</strong></td><td style='padding:10px;border:1px solid #e5e7eb'>" + comment + "</td></tr>" if comment else ""}
      </table>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from {settings.COMPANY_NAME}.</p>
    </div></body></html>
    """
    send_email(manager_email, subject, html)


def send_leave_status_email(employee_email: str, employee_name: str, leave_type: str,
                             start_date, end_date, total_days: float, status: str,
                             comment: str = "", reason: str = ""):
    meta = _request_meta(leave_type, reason)
    color = "#16a34a" if status == "approved" else "#dc2626"
    subject = f"Your {meta['entity']} has been {status.title()}"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
    <div style="background:{color};padding:20px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">{meta['entity']} {status.title()}</h2>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <p>Dear <strong>{employee_name}</strong>,</p>
      <p>Your {meta['entity'].lower()} has been <strong style="color:{color}">{status.upper()}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>{meta['type_row_label']}</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{meta['type_label']}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>From</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{start_date}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>To</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{end_date}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>Total Days</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{total_days} day(s)</td></tr>
        {"<tr style='background:#f9fafb'><td style='padding:10px;border:1px solid #e5e7eb'><strong>Comment</strong></td><td style='padding:10px;border:1px solid #e5e7eb'>" + comment + "</td></tr>" if comment else ""}
      </table>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from {settings.COMPANY_NAME}.</p>
    </div></body></html>
    """
    send_email(employee_email, subject, html)


def send_wfh_request_email(employee_name: str, start_date, end_date, total_days: float,
                            reason: str, approver_email: str, approver_name: str):
    subject = f"WFH Approval Request - {employee_name}"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
    <div style="background:#0284c7;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">Work From Home Request</h2>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <p>Dear <strong>{approver_name}</strong>,</p>
      <p><strong>{employee_name}</strong> has submitted a Work From Home request and requires your approval.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>From</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{start_date}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>To</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{end_date}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>Total Days</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{total_days} day(s)</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>Reason</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{reason}</td></tr>
      </table>
      <p>Please login to the <strong>Mepstra Leave Portal</strong> to approve or reject this request.</p>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from {settings.COMPANY_NAME}.</p>
    </div></body></html>
    """
    send_email(approver_email, subject, html)


def send_wfh_status_email(employee_email: str, employee_name: str, start_date, end_date,
                           total_days: float, status: str, comment: str = ""):
    color = "#16a34a" if status == "approved" else "#dc2626"
    subject = f"Your Work From Home Request has been {status.title()}"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
    <div style="background:{color};padding:20px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0">Work From Home Request {status.title()}</h2>
    </div>
    <div style="padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
      <p>Dear <strong>{employee_name}</strong>,</p>
      <p>Your Work From Home request has been <strong style="color:{color}">{status.upper()}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>From</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{start_date}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb"><strong>To</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{end_date}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px;border:1px solid #e5e7eb"><strong>Total Days</strong></td><td style="padding:10px;border:1px solid #e5e7eb">{total_days} day(s)</td></tr>
        {"<tr><td style='padding:10px;border:1px solid #e5e7eb'><strong>Comment</strong></td><td style='padding:10px;border:1px solid #e5e7eb'>" + comment + "</td></tr>" if comment else ""}
      </table>
      <p style="color:#6b7280;font-size:12px">This is an automated notification from {settings.COMPANY_NAME}.</p>
    </div></body></html>
    """
    send_email(employee_email, subject, html)
