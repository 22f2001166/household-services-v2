from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
import uuid
from datetime import datetime

db = SQLAlchemy()


# Role table
class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))


# User table
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    contact_number = db.Column(db.String(15), nullable=True)
    flagged = db.Column(db.Boolean, default=False)
    role_id = db.Column(db.Integer, db.ForeignKey("role.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("service.id"), nullable=True)
    document_path = db.Column(db.String(255), nullable=True)
    service_offered = db.Column(db.String(120), nullable=True)
    fs_uniquifier = db.Column(
        db.String(64), unique=True, nullable=False, default=lambda: str(uuid.uuid4())
    )
    role = db.relationship("Role", backref="users", lazy=True)
    services = db.relationship(
        "Service", foreign_keys=[service_id], backref="provider", lazy=True
    )


# Service table
class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    available = db.Column(db.Boolean, default=True)


# Service Request table
class ServiceRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("service.id"), nullable=False)
    professional_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=True
    )  # Store assigned professional
    status = db.Column(db.String(50), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    rating = db.Column(db.Integer, nullable=True)  # New column for rating (1-5)

    customer = db.relationship("User", foreign_keys=[customer_id], backref="requests")
    service = db.relationship("Service", foreign_keys=[service_id], backref="requests")
    professional = db.relationship(
        "User", foreign_keys=[professional_id], backref="assigned_requests"
    )


# for storing Revoked tokens
class RevokedToken(db.Model):
    """Model to store revoked JWT tokens"""

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def is_revoked(cls, jti):
        return db.session.query(cls.id).filter_by(jti=jti).scalar() is not None
