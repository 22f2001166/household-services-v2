  Vue.component("admin-dashboard", {
    template: `      
      <div class="container mt-3 text-center">
        <div class="bg-light p-3 rounded shadow-sm border d-flex justify-content-between align-items-center">
          <h6 class="text-secondary">Total Users: {{ totalUsers }}</h6>
          <h3 class="font-weight-bold text-dark">Welcome, Admin!</h3>
          <h6 class="text-secondary">Total Services: {{ totalServices }}</h6>
        </div>
  
        <div class="d-flex flex-column align-items-center mt-4">
          
          <!-- Users Section -->
          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Users</h5>
            <p class="text-muted">View, flag, or remove users.</p>
            <button @click="showUserGraphModal" class="btn btn-outline-secondary mb-3">Show User Graph</button>
            <input v-model="searchUser" type="text" class="form-control mt-2 mx-auto text-center" style="width: 40%;" placeholder="Search Users...">

            <table class="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id">
                  <td>{{ user.id }}</td>
                  <td>{{ user.username }}
                  <a v-if="user.role === 'professional' && user.document_path" 
                    :href="'/' + user.document_path" 
                    target="_blank" 
                    class="ms-2 btn btn-link btn-sm">
                    Doc
                  </a></td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.role }}
                  <span v-if="user.role === 'professional'">
                    ({{ user.service_offered || 'Not Specified' }})
                    <span v-if="averageRatings[user.id]">
                      | ⭐ {{ averageRatings[user.id] }}
                    </span>
                  </span>
                  </td>
                  <td>
                    <span :class="user.flagged ? 'text-danger' : 'text-success'">
                      {{ user.flagged ? "Flagged" : "Active" }}
                    </span>
                  </td>
                  <td>
                    <template v-if="user.role !== 'admin'">
                      <button 
                        @click="toggleFlagUser(user)" 
                        class="btn btn-sm" 
                        :class="user.flagged ? 'btn-secondary' : 'btn-warning'">
                        {{ user.flagged ? "Unflag" : "Flag" }}
                      </button>
                      <button @click="deleteUser(user.id)" class="btn btn-danger btn-sm">Delete</button>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <!-- Services Section -->
          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Services</h5>
            <p class="text-muted">Add, update, or remove services.</p>
  
            <button @click="showAddServiceModal = true" class="btn btn-outline-secondary mb-3">Add Service</button>
            <input v-model="searchService" type="text" class="form-control mt-2 mx-auto text-center" style="width: 40%;" placeholder="Search Services...">
 
            <table class="table table-striped" v-if="filteredServices.length">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="service in filteredServices" :key="service.id">
                  <td>{{ service.id }}</td>
                  <td>{{ service.name }}</td>
                  <td>{{ service.description }}</td>
                  <td>{{ service.price }} </td>
                  <td>
                    <span :class="service.available ? 'text-success' : 'text-danger'">
                      {{ service.available ? "Available" : "Unavailable" }}
                    </span>
                  </td>
                  <td>
                    <button @click="toggleServiceAvailability(service)" class="btn btn-sm" 
                      :class="service.available ? 'btn-warning' : 'btn-success'">
                      {{ service.available ? "Unavailable" : "Available" }}
                    </button>
                    <button @click="deleteService(service.id)" class="btn btn-danger btn-sm">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <!-- Requests Section -->
          <div class="w-100 p-3 mb-3 bg-white shadow-sm rounded border">
            <h5 class="font-weight-bold text-dark">Requests</h5>
            <p class="text-muted">Manage service requests.</p>
            <!-- Show Graph Button -->
            <button @click="showGraphModal" class="btn btn-outline-secondary mb-3">Show Graph</button>
            <button @click="exportServiceRequests" class="btn btn-outline-secondary mb-3">Export as CSV</button>
            <input v-model="searchRequest" type="text" class="form-control mt-2 mx-auto text-center" style="width: 40%;" placeholder="Search Service Requests...">

            <table class="table table-striped" v-if="filteredRequests.length">
              <thead>
                <tr>
                  <th>SR ID</th>
                  <th>Service Name</th>
                  <th>Customer Name</th>
                  <th>Professional Name</th>
                  <th>Status</th>
                  <th>Rating (Out of 5)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="request in filteredRequests" :key="request.id">
                  <td>{{ request.id }}</td>
                  <td>{{ request.service.name }}</td>
                  <td>{{ request.customer.username }}</td>
                  <td>{{ request.professional ? request.professional.username : "Not Assigned" }}</td>
                  <td>{{ request.status }}</td>
                  <td>{{ request.rating }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-muted mt-3">No service requests found.</p>
          </div>
        </div>
  
        <!-- Add Service Modal -->
        <div v-if="showAddServiceModal" class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Add New Service</h5>
              </div>
              <div class="modal-body">
                <form @submit.prevent="addService">
                  <div class="mb-3">
                    <label class="form-label">Service Name</label>
                    <input v-model="newService.name" type="text" class="form-control" required>
                  </div>
  
                  <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea v-model="newService.description" class="form-control" required></textarea>
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Price (in Rs)</label>
                    <input v-model="newService.price" type="number" class="form-control" required>
                  </div>
                  
                  <button type="submit" class="btn btn-success">Add Service</button>
                  <button type="button" class="btn btn-secondary ms-2" @click="showAddServiceModal = false">Cancel</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Backdrop -->
        <div v-if="showAddServiceModal" class="modal-backdrop fade show"></div>
        
        <!-- Graph Modal -->
        <div v-if="graphModalVisible" class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Requests Status Graph</h5>
                <button type="button" class="btn-close" @click="graphModalVisible = false"></button>
              </div>
              <div class="modal-body">
                <canvas id="requestsChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Backdrop -->
        <div v-if="graphModalVisible" class="modal-backdrop fade show"></div>

        <!-- User Role Graph Modal -->
        <div v-if="userGraphModalVisible" class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">User Role Distribution</h5>
                <button type="button" class="btn-close" @click="userGraphModalVisible = false"></button>
              </div>
              <div class="modal-body">
                <canvas id="userChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Backdrop -->
        <div v-if="userGraphModalVisible" class="modal-backdrop fade show"></div>
  
      </div>
    `,
  
    data() {
      return {
        users: [],
        services: [],
        serviceRequests: [],
        averageRatings: {}, 
        searchUser: "", // Added for search functionality
        searchService: "",
        searchRequest: "",
        showAddServiceModal: false,
        graphModalVisible: false,  // New state for Graph Modal
        userGraphModalVisible: false,
        userChart: null,
        newService: {
          name: "",
          description: "",
          price: "",
        },
      };
    },
    computed: {
      totalUsers() {
        return this.users.length;
      },
      totalServices() {
        return this.services.length;
      },
      filteredUsers() {
        return this.users.filter(user => {
          const searchTerm = this.searchUser.toLowerCase();
          return (
            user.username.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm) ||
            (user.flagged ? "flagged" : "active").includes(searchTerm)
          );
        });
      },

      filteredServices() {
        return this.services.filter(service => {
          const searchTerm = this.searchService.toLowerCase();
          return (
            service.name.toLowerCase().includes(searchTerm) ||
            service.description.toLowerCase().includes(searchTerm) ||
            service.price.toString().includes(searchTerm) ||
            (service.available ? "available" : "unavailable").includes(searchTerm)
          );
        });
      },

      filteredRequests() {
        return this.serviceRequests.filter(request => {
          const searchTerm = this.searchRequest.toLowerCase();
          return (
            request.service.name.toLowerCase().includes(searchTerm) ||
            request.customer.username.toLowerCase().includes(searchTerm) ||
            (request.professional && request.professional.username.toLowerCase().includes(searchTerm)) ||
            request.status.toLowerCase().includes(searchTerm)
          );
        });
      },
    },
    mounted() {
      this.fetchUsers();
      // setInterval(this.fetchUsers, 5000); // real time data update but can increase serve load !
      this.fetchServices();
      this.fetchServiceRequests();
    },
  
    methods: {
      async fetchServiceRequests() {
        const token = sessionStorage.getItem("token"); // Retrieve stored JWT token
  
        fetch("/api/admin/service-requests", {
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
            // Compute the average rating for each professional
            const ratingsMap = {};
            const countMap = {};

            data.forEach(request => {
              if (request.professional && request.rating) {
                const proId = request.professional.id;
                    
                if (!ratingsMap[proId]) {
                  ratingsMap[proId] = 0;
                  countMap[proId] = 0;
                }
                    
                ratingsMap[proId] += request.rating;
                countMap[proId] += 1;
              }
            });

            // Store average ratings
            this.averageRatings = {};
            for (const proId in ratingsMap) {
              this.averageRatings[proId] = (ratingsMap[proId] / countMap[proId]).toFixed(2);
            }
          })
          .catch(error => console.error("Error fetching service requests:", error));
      },
      async fetchUsers() {
        try {
          const token = sessionStorage.getItem("token"); // Get JWT from storage
          const response = await fetch("/api/users", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (!response.ok) throw new Error("Failed to fetch users");

          const data = await response.json();
          this.users = data.map(user => ({
            ...user,
            flagged: user.flagged || false
          }));
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      },
  
      async toggleFlagUser(user) {
        try {
          const token = sessionStorage.getItem("token");
          const response = await fetch(`/api/users/${user.id}/flag`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
          });
  
          if (response.ok) {
            user.flagged = !user.flagged; // Toggle status
          } else {
            alert("Failed to update user flag status.");
          }
        } catch (error) {
          console.error("Error toggling user flag status:", error);
        }
      },
  
      async deleteUser(userId) {
        if (!confirm("Are you sure you want to delete this user?")) return;
  
        try {
          const token = sessionStorage.getItem("token");
          const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (response.ok) {
            // alert("User deleted successfully!");
            this.fetchUsers();
          } else {
            alert("Failed to delete user.");
          }
        } catch (error) {
          console.error("Error deleting user:", error);
        }
      },
  
      async fetchServices() {
        try {
          const token = sessionStorage.getItem("token"); // Get JWT from storage
          const response = await fetch("/api/services", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (!response.ok) throw new Error("Failed to fetch services");
          const data = await response.json();
          this.services = data;
        } catch (error) {
          console.error("Error fetching services:", error);
        }
      },
  
      async addService() {
        try {
          const token = sessionStorage.getItem("token"); // Get JWT from storage
          const response = await fetch("/api/services", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(this.newService),
          });
  
          if (response.ok) {
            // alert("Service added successfully!");
            this.fetchServices();  // Refresh list
            this.showAddServiceModal = false;  // Close modal
            this.newService = { name: "", description: "", price: "" };  // Reset form
          } else {
            alert("Failed to add service.");
          }
        } catch (error) {
          console.error("Error adding service:", error);
        }
      },
  
      async deleteService(serviceId) {
        if (!confirm("Are you sure you want to delete this service?")) return;
  
        try {
          const token = sessionStorage.getItem("token");
          const response = await fetch(`/api/services/${serviceId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (response.ok) {
            // alert("Service deleted successfully!");
            this.fetchServices();
          } else {
            alert("Failed to delete service.");
          }
        } catch (error) {
          console.error("Error deleting service:", error);
        }
      },
      async toggleServiceAvailability(service) {
        try {
          const token = sessionStorage.getItem("token");
          const response = await fetch(`/api/services/${service.id}/toggle-availability`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
          });
      
          if (response.ok) {
            service.available = !service.available; // Toggle status
          } else {
            alert("Failed to update service availability.");
          }
        } catch (error) {
          console.error("Error toggling service availability:", error);
        }
      },
      showGraphModal() {
        this.graphModalVisible = true;
    
        // Count requests by status
        const statusCounts = {
          Completed: 0,
          Pending: 0,
          Accepted: 0,
        };
    
        this.serviceRequests.forEach(request => {
          if (statusCounts[request.status] !== undefined) {
            statusCounts[request.status]++;
          }
        });
    
        // Wait for modal to render, then load the chart
        this.$nextTick(() => {
          const ctx = document.getElementById("requestsChart").getContext("2d");
    
          if (this.chartInstance) {
            this.chartInstance.destroy(); // Destroy existing chart if any
          }
    
          this.chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
              labels: ["Completed", "Pending", "Accepted"],
              datasets: [{
                label: "",
                data: [
                  statusCounts.Completed,
                  statusCounts.Pending,
                  statusCounts.Accepted,
                ],
                backgroundColor: ["#28a745", "#ffc107", "#007bff"],
                borderColor: ["#218838", "#e0a800", "#0056b3"],
                borderWidth: 1,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true },
              },
              plugins: {
                tooltip: { enabled: false }, // Disable tooltips
                legend: { display: false } // Remove legend
              },
            },
          });
        });
      },
      showUserGraphModal() {
        this.userGraphModalVisible = true;
        this.$nextTick(() => {
          this.renderUserChart();
        });
      },
    
      renderUserChart() {
        const ctx = document.getElementById("userChart").getContext("2d");
        
        const professionals = this.users.filter(user => user.role === "professional").length;
        const customers = this.users.filter(user => user.role === "customer").length;
        const total = professionals + customers;
    
        if (this.userChart) {
          this.userChart.destroy(); // Destroy existing chart instance before creating a new one
        }
    
        this.userChart = new Chart(ctx, {
          type: "pie",
          data: {
            labels: ["Professionals", "Customers"],
            datasets: [{
              data: [professionals, customers],
              backgroundColor: ["#007bff", "#28a745"],
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: "top" },
              tooltip: {
                callbacks: {
                  label: function(tooltipItem) {
                    const value = tooltipItem.raw;
                    const percentage = ((value / total) * 100).toFixed(2) + "%";
                    return `${tooltipItem.label}: ${value} (${percentage})`;
                  }
                }
              }
            }
          }
        });
      },
      async exportServiceRequests() {
        try {
          const response = await fetch("/admin/api/export-csv", {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          });
          const data = await response.json();
          if (response.ok) {
            alert("Export started! Check the status.");
            this.checkExportStatus(data.task_id);
          } else {
            alert(data.error);
          }
        } catch (error) {
          console.error("Export failed:", error);
        }
      },
      
      async checkExportStatus(taskId) {
        const interval = setInterval(async () => {
          const response = await fetch(`/admin/api/export-csv/${taskId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          });
      
          const data = await response.json();
          
          if (data.status === "Completed") {
            clearInterval(interval);
            // alert(`Export completed! Download: ${data.file}`);
            // Create a temporary download link
            const downloadLink = document.createElement("a");
            downloadLink.href = data.file;  // File URL from API
            downloadLink.download = "export.csv";  // Suggested filename
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            alert("Export completed! File is downloading.");
          } else if (data.status === "Failed") {
            clearInterval(interval);
            alert("Export failed.");
          }
        }, 5000);
      },            
    },
  });
  