  Vue.component("professional-dashboard", {
    data() {
    return {
      serviceRequests: [],
      acceptedRequests: [],
      user: { username: "", email: "" }, // User profile details
      passwordFields: { old_password: "", new_password: "" }, // Separate password fields
      showEditProfile: false, // Control modal visibility
      searchPriceQuery: "", // New search query for filtering by price
      searchStatusQuery: ""  // Search query for filtering by status
    };
  },
  computed: {
    filteredServiceRequests() {
      if (!this.searchPriceQuery.trim()) {
        return this.serviceRequests;
      }
  
      const query = this.searchPriceQuery.trim();
      const match = query.match(/^([<>]=?|=)?\s*(\d+)$/);
  
      if (!match) {
        return this.serviceRequests; // Return unfiltered list if query is invalid
      }
  
      const operator = match[1] || "="; // Default to "=" if no operator is provided
      const price = parseFloat(match[2]);
  
      return this.serviceRequests.filter(request => {
        const servicePrice = parseFloat(request.service_price);
        switch (operator) {
          case ">":
            return servicePrice > price;
          case ">=":
            return servicePrice >= price;
          case "<":
            return servicePrice < price;
          case "<=":
            return servicePrice <= price;
          case "=":
            return servicePrice === price;
          default:
            return true;
        }
      });
    },
    filteredAcceptedRequests() {
      if (!this.searchStatusQuery.trim()) {
        return this.acceptedRequests;
      }
  
      const query = this.searchStatusQuery.trim().toLowerCase();
      return this.acceptedRequests.filter(request =>
        request.status.toLowerCase().includes(query)
      );
    }
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
    fetchServiceRequests() {
      fetch("/api/service-requests", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      })
        .then(response => response.json())
        .then(data => {
          // Separate pending and accepted requests
          this.serviceRequests = data.filter(req => req.status === "Pending");
          this.acceptedRequests = data.filter(req => req.status === "Accepted" || req.status === "Completed");
        })
        .catch(error => console.error("Error fetching service requests:", error));
    },
    acceptServiceRequest(requestId) {
      fetch(`/api/service-requests/${requestId}/accept`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
          "Content-Type": "application/json"
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          const acceptedRequest = this.serviceRequests.find(req => req.id === requestId);
          if (acceptedRequest) {
            acceptedRequest.status = "Accepted";
            // Move it to the acceptedRequests list
            this.acceptedRequests.push(acceptedRequest);
            // Remove it from pending serviceRequests
            this.serviceRequests = this.serviceRequests.filter(req => req.id !== requestId);
          }
        }
      })
      .catch(error => console.error("Error accepting service request:", error));
    },
  },
  mounted() {
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
          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Service Requests</h5>
            <p class="text-muted">View and accept service requests.</p>
            <input v-model="searchPriceQuery" type="text" class="form-control mt-2 mx-auto text-center" style="width: 40%;" placeholder="Enter price filer...">
            <div v-if="filteredServiceRequests.length > 0">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Customer Contact</th>
                    <th>Service ID</th>
                    <th>Service Name</th>
                    <th>Service Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="request in filteredServiceRequests" :key="request.id">
                    <td>{{ request.customer_name }}</td>
                    <td>{{ request.customer_contact }}</td>
                    <td>{{ request.id }}</td>
                    <td>{{ request.service_name }}</td>
                    <td>{{ request.service_price }}</td>
                    <td>{{ request.status }}</td>
                    <td>
                      <button 
                        v-if="request.status === 'Pending'" 
                        class="btn btn-sm btn-success"
                        @click="acceptServiceRequest(request.id)"
                      >
                        Accept
                      </button>
                      <span v-else class="text-muted">Accepted</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-muted mt-3">No service requests available.</p>
          </div>

          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Service Request Status</h5>
            <p class="text-muted">Update and track service requests.</p>
            <input v-model="searchStatusQuery" type="text" class="form-control mt-2 mx-auto text-center" style="width: 40%;" placeholder="Search by status...">
            <div v-if="filteredAcceptedRequests.length > 0">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Customer Contact</th>
                    <th>Service ID</th>
                    <th>Service Name</th>
                    <th>Service Price</th>
                    <th>Status</th>
                    <th>Rating (out of 5)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="request in filteredAcceptedRequests" :key="request.id">
                    <td>{{ request.customer_name }}</td>
                    <td>{{ request.customer_contact }}</td>
                    <td>{{ request.id }}</td>
                    <td>{{ request.service_name }}</td>
                    <td>{{ request.service_price }}</td>
                    <td :class="{'text-success': request.status === 'Accepted', 'text-primary': request.status === 'Completed'}">
                    {{ request.status }}
                    </td>
                    <td>{{ request.rating }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-muted mt-3">No accepted service requests.</p>
          </div>
        </div>
      </div>
    `,
  });