  Vue.component("customer-dashboard", {
    data() {
      return {
        services: [], // Stores services fetched from API
        serviceRequests: [], // Stores requested services
        searchQuery: "", // Stores the search term
        serviceRequestQuery: "", // New search field for service requests
        ratings: {}, // Store ratings by request ID
        user: { username: "", email: "" }, // User profile details
        passwordFields: { old_password: "", new_password: "" }, // Separate password fields
        showEditProfile: false,
      };
    },
    computed: {
      filteredServices() {
        if (!this.searchQuery) {
          return this.services;
        }
        return this.services.filter(service =>
          service.name.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      },
      filteredServiceRequests() {
        if (!this.serviceRequestQuery) return this.serviceRequests;
        return this.serviceRequests.filter(request =>
          request.status.toLowerCase().includes(this.serviceRequestQuery.toLowerCase())
        );
      },
    },
    methods: {
      fetchUserProfile() {
        fetch("/api/user-profile", {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        })
          .then(response => response.json())
          .then(data => {
            this.user.username = data.username;
            this.user.email = data.email;
          })
          .catch(error => console.error("Error fetching profile:", error));
      },
      updateProfile() {
        const updatedData = {
          username: this.user.username,
          email: this.user.email,
        };
  
        // If passwords are provided, include them in the request
        if (this.passwordFields.old_password && this.passwordFields.new_password) {
          updatedData.old_password = this.passwordFields.old_password;
          updatedData.new_password = this.passwordFields.new_password;
        }
  
        fetch("/api/user-profile", {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedData)
        })
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              alert(`Error: ${data.error}`);
            } else {
              alert("Profile updated successfully!");
              this.showEditProfile = false;
              this.fetchUserProfile();
              this.passwordFields = { old_password: "", new_password: "" }; // Clear password fields
            }
          })
          .catch(error => console.error("Error updating profile:", error));
      },
      fetchServices() {
        const token = sessionStorage.getItem("token"); // Retrieve stored JWT token
      
        fetch("/api/services", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,  // Include JWT token
            "Content-Type": "application/json",
          },
        })
          .then(response => {
            if (!response.ok) {
              throw new Error("Failed to fetch services");
            }
            return response.json();
          })
          .then(data => {
            this.services = data;
          })
          .catch(error => console.error("Error fetching services:", error));
      },
      fetchServiceRequests() {
        const token = sessionStorage.getItem("token"); // Retrieve stored JWT token
      
        fetch("/api/request-service", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then(response => {
            if (!response.ok) {
              throw new Error("Failed to fetch service requests");
            }
            return response.json();
          })
          .then(data => {
            this.serviceRequests = data;
          })
          .catch(error => console.error("Error fetching service requests:", error));
      },
      requestService(serviceId) {
        const token = sessionStorage.getItem("token"); // Retrieve stored JWT token
        
        fetch("/api/request-service", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ service_id: serviceId }), // Send service ID
        })
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to request service");
          }
          return response.json();
        })
        .then(data => {
          alert("Service request submitted successfully!");
          this.fetchServiceRequests(); // Refresh list
        })
        .catch(error => console.error("Error requesting service:", error));
      },
      deleteRequest(requestId) {
        const token = sessionStorage.getItem("token");
  
        fetch(`/api/request-service/${requestId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then(response => {
            if (!response.ok) throw new Error("Failed to delete request");
            return response.json();
          })
          .then(() => {
            alert("Request deleted successfully!");
            this.fetchServiceRequests();
          })
          .catch(error => console.error("Error deleting request:", error));
      },
      markAsCompleted(requestId) {
        const token = sessionStorage.getItem("token");
  
        fetch(`/api/request-service/${requestId}/complete`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to mark request as completed");
          }
          return response.json();
        })
        .then(() => {
          alert("Service marked as completed!");
          this.fetchServiceRequests();
        })
        .catch(error => console.error("Error marking service as completed:", error));
      },
      rateService(requestId, rating) {
        const token = sessionStorage.getItem("token");
      
        fetch(`/api/request-service/${requestId}/rate`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.error) {
            alert(data.error);
          } else {
            alert("Rating submitted successfully!");
            this.fetchServiceRequests(); // Refresh requests
          }
        })
        .catch(error => console.error("Error rating service:", error));
      },         
    },
    mounted() {
      this.fetchServices();
      this.fetchServiceRequests();
      this.fetchUserProfile();
    },
    template: `      
      <div class="container mt-3 text-center">
        <div class="bg-light p-3 rounded shadow-sm border">
          <h3 class="font-weight-bold text-dark">Welcome, {{ user.username }}!</h3>
          <button class="btn btn-sm btn-outline-dark" @click="showEditProfile = true">Edit Profile</button>
        </div>

        <!-- Edit Profile Modal -->
        <div v-if="showEditProfile" class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Edit Profile</h5>
              </div>

              <div class="modal-body">
                <form @submit.prevent="updateProfile">
                  <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" v-model="user.username" class="form-control" required>
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" v-model="user.email" class="form-control" required>
                  </div>

                  <h6 class="mt-3">Change Password (Optional)</h6>

                  <div class="mb-3">
                    <label class="form-label">Old Password</label>
                    <input type="password" v-model="passwordFields.old_password" class="form-control">
                  </div>

                  <div class="mb-3">
                    <label class="form-label">New Password</label>
                    <input type="password" v-model="passwordFields.new_password" class="form-control">
                  </div>

                  <button type="submit" class="btn btn-primary">Save</button>
                  <button type="button" class="btn btn-secondary ms-2" @click="showEditProfile = false">Cancel</button>
                </form>
              </div>
            </div>
          </div>
        </div>


        <div class="d-flex flex-column align-items-center mt-4">
          
          <!-- Services Block -->
          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Services</h5>
            <p class="text-muted">View and make service requests.</p>
            <input 
              v-model="searchQuery"
              type="text" 
              class="form-control mt-2 mx-auto text-center" 
              style="width: 40%;" 
              placeholder="Search services..."
            >
            <table class="table table-striped" v-if="filteredServices.length">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Availablity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="service in filteredServices" :key="service.id">
                  <td>{{ service.name }}</td>
                  <td>{{ service.description }}</td>
                  <td>{{ service.price }}</td>
                  <td>
                    <span :class="service.available ? 'text-success' : 'text-danger'">
                      {{ service.available ? "Available" : "Unavailable" }}
                    </span>
                  </td>
                  <td>
                    <button 
                      v-if="service.available" 
                      class="btn btn-sm btn-success"
                      @click="requestService(service.id)"
                    >
                      Request
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-muted mt-3">No services found.</p>
          </div>
  
          <!-- Service Request Status -->
          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Service Request Status</h5>
            <p class="text-muted">Update, track or remove service requests.</p>
            <input v-model="serviceRequestQuery" type="text" class="form-control mt-2 mx-auto text-center" style="width: 40%;" placeholder="Search by status...">
            <table class="table table-striped" v-if="filteredServiceRequests.length">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Request ID</th>
                  <th>Requested On</th>
                  <th>Professional</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="request in filteredServiceRequests" :key="request.id">
                  <td>{{ request.service.name }}</td>
                  <td>{{ request.id }}
                  <td>{{ new Date(request.created_at).toLocaleDateString() }}</td>
                  <td>{{ request.professional ? request.professional.username : "Not Assigned" }}</td>
                  <td>{{ request.status }}</td>
                  <td>
                    <button 
                      v-if="request.status === 'Pending'" 
                      class="btn btn-sm btn-danger"
                      @click="deleteRequest(request.id)"
                    >
                      Delete
                    </button>
                    <button 
                      v-if="request.status === 'Accepted'" 
                      class="btn btn-sm btn-primary"
                      @click="markAsCompleted(request.id)"
                    >
                      Mark as Completed
                    </button>
                    <div v-if="request.status === 'Completed' && (request.rating === null || request.rating === undefined)">
                      <select v-model="ratings[request.id]" class="form-control d-inline w-auto">
                        <option disabled value="">Rate</option>
                        <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                      </select>
                      <button 
                        class="btn btn-sm btn-warning" 
                        @click="rateService(request.id, ratings[request.id])"
                      >
                        Submit Rating
                      </button>
                    </div>

                    <!-- Show the already submitted rating -->
                    <div v-else-if="request.rating !== null && request.rating !== undefined">
                      <span class="text-success">Rated: {{ request.rating }}/5</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-muted mt-3">No service requests found.</p>
          </div>
        </div>
      </div>
    `,
  });
  