from flask import Flask, send_from_directory
from flask_security import Security, SQLAlchemyUserDatastore
from flask_restful import Api
from backend.config import Config
from backend.extensions import cache  # Import cache from extensions
from backend.models import db, User, Role
from backend.create_initial_data import create_initial_data
from backend.routes import auth_bp, main_bp, init_jwt
from backend.resources import (
    UserResource,
    ServiceResource,
    RequestServiceResource,
    RateServiceResource,
    ServiceRequestResource,
    AdminServiceRequestsResource,
    UserProfileResource,
    ExportCSVResource,
    DownloadCSVResource,
)

app = Flask(
    __name__, static_folder="frontend/static", template_folder="frontend/templates"
)
app.config.from_object(Config)

# Initialize caching
cache.init_app(
    app, config={"CACHE_TYPE": "redis", "CACHE_REDIS_URL": "redis://localhost:6379/0"}
)

# Initialize extensions
db.init_app(app)
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

# Initialize JWT
jwt = init_jwt(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(main_bp)


# Serve static files
@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory("frontend/static", filename)


# Serve vue files
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_vue(path):
    if path and ("static/" in path or "js/" in path or "css/" in path):
        return send_from_directory("frontend/static", path)
    return send_from_directory("frontend/templates", "index.html")


# Api registrations
api = Api(app)
api.add_resource(
    UserResource,
    "/api/users",
    "/api/users/<int:user_id>",
    "/api/users/<int:user_id>/flag",
)
api.add_resource(
    ServiceResource,
    "/api/services",
    "/api/services/<int:service_id>",
    "/api/services/<int:service_id>/toggle-availability",
)
api.add_resource(
    RequestServiceResource,
    "/api/request-service",
    "/api/request-service/<int:request_id>",
    "/api/request-service/<int:request_id>/complete",
)
api.add_resource(
    RateServiceResource,
    "/api/request-service/<int:request_id>/rate",
)
api.add_resource(
    ServiceRequestResource,
    "/api/service-requests",
    "/api/service-requests/<int:request_id>/accept",
)
api.add_resource(AdminServiceRequestsResource, "/api/admin/service-requests")
api.add_resource(UserProfileResource, "/api/user-profile")
api.add_resource(
    ExportCSVResource, "/admin/api/export-csv", "/admin/api/export-csv/<string:task_id>"
)
api.add_resource(DownloadCSVResource, "/download/<filename>")


# main app
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        create_initial_data(app)
    app.run(debug=True)
