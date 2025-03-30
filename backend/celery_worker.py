from flask import Flask
from backend.config import Config
from backend.celery_config import make_celery
from backend.models import db
from flask_mail import Mail, Message
import csv
import os
from datetime import datetime

# EXPORT_FOLDER = "frontend/static/exports"
EXPORT_FOLDER = "backend/exports"  # Move to a backend-accessible directory


app = Flask(__name__)
app.config.from_object(Config)

celery = make_celery(app)

# Initialize extensions
db.init_app(app)
mail = Mail(app)


if not os.path.exists(EXPORT_FOLDER):
    os.makedirs(EXPORT_FOLDER)


@celery.task(name="backend.tasks.export_service_requests")
def export_service_requests():
    """Exports completed service requests as CSV."""
    with app.app_context():
        from backend.models import ServiceRequest

        # file_path = os.path.join(
        #     EXPORT_FOLDER,
        #     f"service_requests_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv",
        # )
        filename = f"service_requests_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
        file_path = os.path.join(EXPORT_FOLDER, filename)

        with open(file_path, "w", newline="") as csvfile:
            fieldnames = [
                "Service ID",
                "Service Name",
                "Customer Name",
                "Professional Name",
                "Rating",
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            completed_requests = ServiceRequest.query.filter_by(
                status="Completed"
            ).all()
            for request in completed_requests:
                writer.writerow(
                    {
                        "Service ID": request.service.id,
                        "Service Name": request.service.name,
                        "Customer Name": request.customer.username,
                        "Professional Name": (
                            request.professional.username
                            if request.professional
                            else "N/A"
                        ),
                        "Rating": request.rating,
                    }
                )

        # return file_path
        return filename


@celery.task(name="backend.tasks.send_daily_reminders")
def send_daily_reminders():
    """Send daily reminders to service professionals about unassigned service requests."""
    with app.app_context():

        from backend.models import ServiceRequest, User

        # Fetch all pending service requests that are **not assigned** to a professional
        pending_requests = ServiceRequest.query.filter_by(
            status="Pending", professional_id=None
        ).all()

        if not pending_requests:
            print("No unassigned service requests.")
            return

        # Dictionary to track how many requests are pending per service
        service_request_count = {}
        for request in pending_requests:
            service_request_count[request.service_id] = (
                service_request_count.get(request.service_id, 0) + 1
            )

        # Find professionals offering those services
        professionals = User.query.filter(
            User.service_id.in_(service_request_count.keys())
        ).all()

        if not professionals:
            print("No professionals found for pending requests.")
            return

        # Notify professionals about available service requests
        for professional in professionals:
            service_id = professional.service_id
            pending_count = service_request_count.get(service_id, 0)

            if pending_count > 0:
                print(
                    f"Sending email to {professional.email} about {pending_count} new service requests."
                )

                subject = "New Service Requests Available!"
                body = f"""Hello {professional.username},

You have {pending_count} new service requests available for your service. 
Please check and accept them as soon as possible.

Best,
Household Services Team"""

                msg = Message(
                    subject,
                    sender="no-reply@example.com",
                    recipients=[professional.email],
                )
                msg.body = body

                try:
                    mail.send(msg)
                    print(f"Reminder sent to {professional.email}")
                except Exception as e:
                    print(f"Failed to send email to {professional.email}: {e}")

    return "Daily reminders sent successfully!"


@celery.task(name="backend.tasks.send_monthly_activity_report")
def send_monthly_activity_report():
    """Generate and send monthly activity reports to customers via email."""
    with app.app_context():
        from backend.models import User, Service, ServiceRequest

        customers = User.query.filter(User.role.has(name="customer")).all()

        for customer in customers:
            # Fetch service statistics
            service_requests = ServiceRequest.query.filter_by(
                customer_id=customer.id
            ).all()
            total_requested = len(service_requests)
            total_accepted = sum(
                # 1 for req in service_requests if req.status == "Accepted"
                1
                for req in service_requests
                if req.status in ["Accepted", "Completed"]
            )
            total_completed = sum(
                1 for req in service_requests if req.status == "Completed"
            )

            # Fetch details of each service
            service_details = ""
            for req in service_requests:
                service = Service.query.get(req.service_id)
                service_name = service.name if service else "Unknown Service"
                service_details += f"""
                <tr>
                    <td>{service_name}</td>
                    <td>{req.status}</td>
                    <td>{req.created_at.strftime('%Y-%m-%d')}</td>
                </tr>
                """

            # Generate the HTML report
            report_html = f"""
            <html>
            <body>
                <h2>Monthly Activity Report - {datetime.now().strftime('%B %Y')}</h2>
                <p>Dear {customer.username},</p>
                <p>Here is your service activity summary till past month:</p>
                <ul>
                    <li><strong>Total Services Requested:</strong> {total_requested}</li>
                    <li><strong>Total Services Accepted:</strong> {total_accepted}</li>
                    <li><strong>Total Services Completed:</strong> {total_completed}</li>
                </ul>
                <h3>Service Details</h3>
                <table border="1" cellpadding="5" cellspacing="0">
                    <tr>
                        <th>Service Name</th>
                        <th>Status</th>
                        <th>Request Date</th>
                    </tr>
                    {service_details if service_details else '<tr><td colspan="3">No services requested</td></tr>'}
                </table>
                <p>Thank you for using our platform!</p>
                <p>Best regards,<br>Household Services Team</p>
            </body>
            </html>
            """

            # Send the email
            msg = Message(
                "Your Monthly Activity Report",
                sender="no-reply@example.com",
                recipients=[customer.email],
            )
            msg.html = report_html

            try:
                mail.send(msg)
                print(f"Monthly report sent to {customer.email}")
            except Exception as e:
                print(f"Failed to send report to {customer.email}: {e}")

    return "Monthly reports sent successfully!"
