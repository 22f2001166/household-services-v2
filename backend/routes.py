import os
from flask import Blueprint, request, jsonify, render_template
from flask_security.utils import verify_password, hash_password
from werkzeug.utils import secure_filename
from backend.models import db, User, Role, RevokedToken
from backend.extensions import cache
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    JWTManager,
    get_jwt,
)

UPLOAD_FOLDER = "frontend/static/uploads"
ALLOWED_EXTENSIONS = {"pdf"}  # only pdf files

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


auth_bp = Blueprint("auth", __name__)
main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    return render_template("index.html")


# jwt management
def init_jwt(app):
    app.config["JWT_SECRET_KEY"] = "your_jwt_secret_key"
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

    jwt = JWTManager(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return RevokedToken.is_revoked(jti)

    return jwt


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if user and verify_password(password, user.password):
        if user.flagged:
            return jsonify({"error": "Your account has been flagged"}), 403
        access_token = create_access_token(identity=str(user.id))
        return (
            jsonify(access_token=access_token.decode("utf-8"), role=user.role.name),
            200,
        )
    return jsonify({"error": "Invalid credentials"}), 401


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        jti = get_jwt().get("jti")  # Extract token identifier safely
        subject = get_jwt().get("sub")  # Extract subject (user ID)

        if not jti or not subject:
            return jsonify({"error": "Invalid token"}), 400

        if not RevokedToken.is_revoked(jti):
            revoked_token = RevokedToken(jti=jti)
            db.session.add(revoked_token)
            db.session.commit()
        return jsonify({"message": "Logged out successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Logout failed", "details": str(e)}), 500


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True)

    if data:  # If JSON request
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        role_name = data.get("role")
        contact_number = data.get("contact_number") if role_name == "customer" else None
        service_id = data.get("service_id") if role_name == "professional" else None

    else:  # If FormData request (for file uploads)
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        role_name = request.form.get("role")
        contact_number = (
            request.form.get("contact_number") if role_name == "customer" else None
        )
        service_id = (
            request.form.get("service_id") if role_name == "professional" else None
        )

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists"}), 400

    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify({"error": "Invalid role selected"}), 400

    document_path = None
    if role_name == "professional":
        if "document" not in request.files:
            return jsonify({"error": "Document is required for professionals"}), 400

        document = request.files["document"]
        if document and allowed_file(document.filename):
            # filename = secure_filename(document.filename)
            ext = document.filename.rsplit(".", 1)[1].lower()
            unique_filename = f"{email.replace('@', '_').replace('.', '_')}.{ext}"
            save_path = os.path.join(os.getcwd(), UPLOAD_FOLDER, unique_filename)
            document.save(save_path)
            document_path = f"static/uploads/{unique_filename}"
        else:
            return jsonify({"error": "Invalid file type"}), 400

    new_user = User(
        username=username,
        email=email,
        password=hash_password(password),
        contact_number=contact_number,
        flagged=False,
        role_id=role.id,
        document_path=document_path,
        service_id=service_id,
    )
    db.session.add(new_user)
    db.session.commit()

    # invalid cache after registering new user
    cache.delete("all_users")

    return jsonify({"message": "User registered successfully"}), 201
