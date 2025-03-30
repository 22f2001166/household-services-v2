from flask_restful import Resource, reqparse
from backend.models import db, User, Service, ServiceRequest
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_security.utils import verify_password, hash_password
from backend.extensions import cache
from celery.result import AsyncResult
from backend.celery_worker import export_service_requests
import os
from flask import send_file

# Define the export folder path
EXPORT_FOLDER = "backend/exports"


# Admin retrieve users (with caching), delete, and flag/unflag them
class UserResource(Resource):
    @jwt_required()
    def get(self):
        """Retrieve all users (with caching)"""
        cached_users = cache.get("all_users")
        if cached_users:
            print("Cache HIT: Returning cached users")
            return cached_users, 200
        print("Cache MISS: Fetching users from DB")
        users = User.query.all()
        users_data = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role.name,
                "flagged": user.flagged,
                "document_path": (
                    user.document_path if user.role.name == "professional" else None
                ),
                "service_offered": (
                    Service.query.get(user.service_id).name
                    if user.role.name == "professional" and user.service_id
                    else None
                ),
            }
            for user in users
        ]

        # Store in cache with expiry (e.g., 5 minutes)
        cache.set("all_users", users_data, timeout=300)
        print("Cache SET: Stored users in cache")
        return users_data, 200

    @jwt_required()
    def delete(self, user_id):
        """Delete a user and clear cache"""
        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404

        if user.role.name == "admin":
            return {"error": "Admins cannot be deleted"}, 403

        db.session.delete(user)
        db.session.commit()

        # Clear cache
        cache.delete("all_users")

        return {"message": "User deleted successfully"}, 200

    @jwt_required()
    def put(self, user_id):
        """Flag a user"""
        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404

        if user.role.name == "admin":
            return {"error": "Admins cannot be flagged"}, 403

        # user.flagged = True
        user.flagged = not user.flagged

        db.session.commit()

        # Clear cache
        cache.delete("all_users")

        return {"message": "User flagged successfully"}, 200


# Admin retrieve services (with caching), add new service, delete service, and make services available/unavailable
class ServiceResource(Resource):
    # @jwt_required()
    def get(self):
        """Retrieve all services (cached)"""
        cached_services = cache.get("all_services")
        if cached_services:
            print("Cache HIT: Returning cached services")
            return cached_services, 200
        print("Cache MISS: Fetching services from DB")
        services = Service.query.all()
        services_data = [
            {
                "id": service.id,
                "name": service.name,
                "description": service.description,
                "price": service.price,
                "available": service.available,
            }
            for service in services
        ]

        # Cache for 10 minutes
        cache.set("all_services", services_data, timeout=600)
        print("Cache SET: Stored services in cache")
        return services_data, 200

    @jwt_required()
    def post(self):
        """Add a new service (Admin only)"""
        parser = reqparse.RequestParser()
        parser.add_argument(
            "name", type=str, required=True, help="Service name is required"
        )
        parser.add_argument(
            "description",
            type=str,
            required=True,
            help="Service description is required",
        )
        parser.add_argument(
            "price", type=float, required=True, help="Service price is required"
        )
        args = parser.parse_args()

        # Only admins can add services
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if user.role.name != "admin":
            return {"error": "Unauthorized"}, 403

        new_service = Service(
            name=args["name"], description=args["description"], price=args["price"]
        )
        db.session.add(new_service)
        db.session.commit()

        # Clear cache
        cache.delete("all_services")

        return {
            "message": "Service added successfully",
            "service": {
                "id": new_service.id,
                "name": new_service.name,
                "description": new_service.description,
                "price": new_service.price,
            },
        }, 201

    @jwt_required()
    def delete(self, service_id):
        """Delete a service (Admin only)"""
        service = Service.query.get(service_id)
        if not service:
            return {"error": "Service not found"}, 404

        # Only admins can delete services
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if user.role.name != "admin":
            return {"error": "Unauthorized"}, 403

        db.session.delete(service)
        db.session.commit()

        # Clear cache
        cache.delete("all_services")

        return {"message": "Service deleted successfully"}, 200

    @jwt_required()
    def put(self, service_id):
        """Toggle availability of a service"""
        service = Service.query.get(service_id)
        if not service:
            return {"error": "Service not found"}, 404

        service.available = not service.available  # Toggle availability
        db.session.commit()

        # Clear the cache so the next request fetches updated services
        cache.delete("all_services")

        return {
            "message": f"Service {'enabled' if service.available else 'disabled'} successfully",
            "available": service.available,
        }, 200


# Customer can request, delete, retrieve, and mark service requests complete
class RequestServiceResource(Resource):
    """API endpoint to request a service"""

    @jwt_required()
    def post(self):
        """Allows a customer to request an available service"""

        parser = reqparse.RequestParser()
        parser.add_argument(
            "service_id", type=int, required=True, help="Service ID is required"
        )
        args = parser.parse_args()

        current_user_id = get_jwt_identity()
        customer = User.query.get(current_user_id)

        # Check if the user exists
        if not customer:
            return {"error": "User not found"}, 404

        # Check if the user is a customer
        if customer.role.name != "customer":
            return {"error": "Only customers can request services"}, 403

        # Check if the service exists
        service = Service.query.get(args["service_id"])
        if not service:
            return {"error": "Service not found"}, 404

        # Check if the service is available
        if not service.available:
            return {"error": "Service is not available"}, 400

        # Create a new service request
        new_request = ServiceRequest(
            customer_id=current_user_id, service_id=args["service_id"]
        )
        db.session.add(new_request)
        db.session.commit()

        return {"message": "Service request submitted successfully"}, 201

    @jwt_required()
    def delete(self, request_id):
        """Allows a customer to cancel a service request"""

        current_user_id = get_jwt_identity()
        customer = User.query.get(current_user_id)

        # Check if the user exists
        if not customer:
            return {"error": "User not found"}, 404

        # Check if the user is a customer
        if customer.role.name != "customer":
            return {"error": "Only customers can cancel service requests"}, 403

        # Check if the service request exists
        service_request = ServiceRequest.query.filter_by(
            id=request_id, customer_id=current_user_id
        ).first()

        if not service_request:
            return {"error": "Service request not found"}, 404

        # Delete the service request
        db.session.delete(service_request)
        db.session.commit()

        return {"message": "Service request deleted successfully"}, 200

    @jwt_required()
    def get(self):
        """Retrieve all service requests for the logged-in customer"""

        current_user_id = get_jwt_identity()
        customer = User.query.get(current_user_id)

        # Check if the user exists
        if not customer:
            return {"error": "User not found"}, 404

        # Check if the user is a customer
        if customer.role.name != "customer":
            return {"error": "Only customers can view their service requests"}, 403

        # Fetch all service requests for the customer
        service_requests = ServiceRequest.query.filter_by(
            customer_id=current_user_id
        ).all()

        # Convert to JSON format
        requests_data = [
            {
                "id": req.id,
                "service": {
                    "id": req.service.id,
                    "name": req.service.name,
                },
                "created_at": req.created_at.isoformat(),
                "status": req.status,
                "professional": (
                    {
                        "id": req.professional.id,
                        "username": req.professional.username,
                    }
                    if req.professional
                    else None
                ),  # Return professional info if assigned
                "rating": req.rating,
            }
            for req in service_requests
        ]

        return requests_data, 200  # Return JSON response

    @jwt_required()
    def patch(self, request_id):
        """Mark a service request as completed by the customer"""
        user_id = get_jwt_identity()
        request = ServiceRequest.query.filter_by(
            id=request_id, customer_id=user_id, status="Accepted"
        ).first()

        if not request:
            return {"error": "Request not found or not eligible for completion"}, 404

        request.status = "Completed"
        db.session.commit()

        return {"message": "Service request marked as completed"}, 200


# Customers can rate the service requests
class RateServiceResource(Resource):
    """API endpoint to rate a completed service request"""

    @jwt_required()
    def post(self, request_id):
        """Allows a customer to rate a completed service request"""

        parser = reqparse.RequestParser()
        parser.add_argument(
            "rating", type=int, required=True, help="Rating is required (1-5)"
        )
        args = parser.parse_args()

        current_user_id = get_jwt_identity()
        request = ServiceRequest.query.get(request_id)

        if not request:
            return {"error": "Service request not found"}, 404

        if int(request.customer_id) != int(current_user_id):
            return {"error": "Unauthorized"}, 403

        if request.status != "Completed":
            return {"error": "You can only rate completed services"}, 400

        if request.rating is not None:
            return {"error": "You have already rated this service"}, 400

        request.rating = args["rating"]
        db.session.commit()

        return {"message": "Service request rated successfully"}, 200


# Professional can retrieve and accept a service request
class ServiceRequestResource(Resource):
    @jwt_required()
    def get(self):
        """Retrieve service requests for the logged-in professional"""
        user_id = get_jwt_identity()
        professional = User.query.get(user_id)

        if not professional or professional.role.name != "professional":
            return {"error": "Unauthorized access"}, 403

        # Ensure professional has a service
        if not professional.service_id:
            return {"error": "No service assigned"}, 400

        # Fetch only service requests that are still pending OR assigned to this professional
        requests = ServiceRequest.query.filter(
            (ServiceRequest.service_id == professional.service_id)
            & (
                (ServiceRequest.status == "Pending")
                | (ServiceRequest.professional_id == user_id)
            )
        ).all()

        return [
            {
                "id": req.id,
                "customer_name": req.customer.username,
                "customer_contact": req.customer.contact_number,
                "service_name": req.service.name,
                "service_price": req.service.price,
                "status": req.status,
                "created_at": req.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "rating": req.rating,
            }
            for req in requests
        ], 200

    @jwt_required()
    def put(self, request_id):
        """Mark a service request as 'Accepted'"""
        current_user_id = get_jwt_identity()

        service_request = ServiceRequest.query.get(request_id)
        if not service_request:
            return {"error": "Service request not found"}, 404

        # Check if the request is already accepted
        if service_request.status == "Accepted":
            return {"error": "Service request already accepted"}, 400

        # Update status to 'Accepted'
        service_request.status = "Accepted"
        service_request.professional_id = current_user_id  # Assign the professional

        db.session.commit()

        return {"message": "Service request accepted successfully"}, 200


# Admin can retrieve all the service requests
class AdminServiceRequestsResource(Resource):
    """Retrieve all service requests (Admin only)"""

    @jwt_required()
    def get(self):
        """Fetch all service requests with details"""
        current_user_id = get_jwt_identity()
        admin = User.query.get(current_user_id)

        # Check if the user is an admin
        if not admin or admin.role.name != "admin":
            return {"error": "Unauthorized access"}, 403

        # Retrieve all service requests
        requests = ServiceRequest.query.all()
        request_list = []

        for req in requests:
            request_list.append(
                {
                    "id": req.id,
                    "service": {"id": req.service.id, "name": req.service.name},
                    "customer": {
                        "id": req.customer.id,
                        "username": req.customer.username,
                    },
                    "professional": (
                        {
                            "id": req.professional.id,
                            "username": req.professional.username,
                        }
                        if req.professional
                        else None
                    ),
                    "status": req.status,
                    "rating": req.rating,
                }
            )

        return request_list, 200


# Customers and Professionals can fetch and update their profiles
class UserProfileResource(Resource):
    """Fetch and update user profile, including password"""

    @jwt_required()
    def get(self):
        """Retrieve the profile of the logged-in user"""
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return {"error": "User not found"}, 404

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.name,
            "flagged": user.flagged,
            "service_offered": (
                Service.query.get(user.service_id).name
                if user.role.name == "professional" and user.service_id
                else None
            ),
        }, 200

    @jwt_required()
    def put(self):
        """Update user profile including password"""
        parser = reqparse.RequestParser()
        parser.add_argument("username", type=str, required=False)
        parser.add_argument("email", type=str, required=False)
        parser.add_argument("old_password", type=str, required=False)
        parser.add_argument("new_password", type=str, required=False)
        args = parser.parse_args()

        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return {"error": "User not found"}, 404

        # Update username
        if args["username"]:
            user.username = args["username"]

        # Update email
        if args["email"]:
            user.email = args["email"]

        # Update password if provided
        if args["old_password"] and args["new_password"]:
            if not verify_password(user.password, args["old_password"]):
                return {"error": "Old password is incorrect"}, 400

            user.password_hash = hash_password(args["new_password"])

        db.session.commit()

        # Clear the cache for all users to reflect updated data
        cache.delete("all_users")

        return {"message": "Profile updated successfully"}, 200


# Admin can export CSV of service requests which are "Completed"
class ExportCSVResource(Resource):
    """Triggers a background CSV export job"""

    @jwt_required()
    def post(self):
        """Trigger the CSV export and return task ID"""
        task = export_service_requests.delay()
        return {"message": "Export started", "task_id": task.id}, 202

    @jwt_required()
    def get(self, task_id):
        """Check the status of a Celery task"""
        task_result = AsyncResult(task_id, backend=export_service_requests.backend)

        if task_result.state == "PENDING":
            return {"status": "Pending"}, 202
        elif task_result.state == "SUCCESS":
            # return {"status": "Completed", "file": task_result.result}, 200
            filename = task_result.result  # Filename returned by Celery
            return {"status": "Completed", "file": f"/download/{filename}"}, 200
        elif task_result.state == "FAILURE":
            return {"status": "Failed", "error": str(task_result.info)}, 500
        else:
            return {"status": task_result.state}, 202


# Admin can download CSV exported in browser
class DownloadCSVResource(Resource):
    """Serves the exported CSV file for download"""

    # @jwt_required()
    def get(self, filename):
        """Serve the file if it exists"""
        file_path = os.path.join(EXPORT_FOLDER, filename)

        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)
        else:
            return {"error": "File not found"}, 404
