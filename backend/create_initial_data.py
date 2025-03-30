from backend.models import db, User, Role
from flask_security.utils import hash_password
from uuid import uuid4


def create_initial_data(app):
    with app.app_context():
        db.create_all()

        # Create roles if they don't exist
        roles = {
            "admin": "Administrator role",
            "professional": "Service Professional",
            "customer": "Customer",
        }

        for role_name, description in roles.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name, description=description)
                db.session.add(role)

        db.session.commit()

        # Retrieve admin role
        admin_role = Role.query.filter_by(name="admin").first()

        # Create admin user if not exists
        admin_user = User.query.filter_by(email="admin@example.com").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password=hash_password("123"),
                flagged=False,
                fs_uniquifier=uuid4().hex,
                role_id=admin_role.id,  # Explicitly set role_id
            )
            db.session.add(admin_user)

        db.session.commit()  # Commit changes
