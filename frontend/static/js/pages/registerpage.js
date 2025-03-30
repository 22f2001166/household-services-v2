Vue.component("registerpage-component", {
  data: function () {
    return {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "", // Added role field
      document: null, // Added document field
      contactNumber: "",
      selectedService: "", // New field to store selected service
      services: [], // Array to store available services
      errorMessage: "",
      successMessage: "",
    };
  },
  methods: {
    handleFileUpload(event) {
      this.document = event.target.files[0]; // Store selected file
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
    register: function () {
      var self = this; // Capture `this` for use inside fetch

      if (this.password !== this.confirmPassword) {
        this.errorMessage = "Passwords do not match!";
        return;
      }

      let formData = new FormData();
      formData.append("username", this.username);
      formData.append("email", this.email);
      formData.append("password", this.password);
      formData.append("role", this.role);

      if (this.role === "customer") {
        formData.append("contact_number", this.contactNumber);
      }

      if (this.role === "professional") {
        formData.append("service_id", this.selectedService);
        if (this.document) {
          formData.append("document", this.document);
        }
      }
      fetch("/auth/register", {
        method: "POST",
        body: formData,
      })
      .then(response => {
        if (!response.ok) throw response;
        return response.json();
      })
      .then(data => {
        if (data.message) {
          self.successMessage = "Registration successful! Redirecting to login...";
          setTimeout(() => {
            if (self.$router) {
              self.$router.push("/login");
            } else {
              window.location.href = "/static/js/pages/loginpage.js";
            }
          }, 2000);
        } else {
          self.errorMessage = data.error || "Registration failed!";
        }
      })
      .catch(async (errorResponse) => {
        try {
          const errorData = await errorResponse.json();
          self.errorMessage = errorData.error || "An error occurred.";
        } catch {
          self.errorMessage = "An error occurred. Please try again.";
        }
      });
    },
  },
  mounted(){
    this.fetchServices();
  },
  template: `
    <div class="container mt-5 text-center fade-in">
      <div class="row justify-content-center mt-4">
        <div class="col-md-5">
          <div class="card shadow-lg p-4 rounded border-0 bg-white">
            <h2 class="text-center text-dark mb-4">Register</h2>
            <form @submit.prevent="register" enctype="multipart/form-data">
              
              <div class="form-group text-left">
                <label for="username" class="font-weight-bold">Username</label>
                <input v-model="username" type="text" class="form-control" id="username" required>
              </div>

              <div class="form-group text-left">
                <label for="email" class="font-weight-bold">Email Address</label>
                <input v-model="email" type="email" class="form-control" id="email" required>
              </div>

              <div class="form-group text-left">
                <label for="password" class="font-weight-bold">Password</label>
                <input v-model="password" type="password" class="form-control" id="password" required>
              </div>

              <div class="form-group text-left">
                <label for="confirmPassword" class="font-weight-bold">Confirm Password</label>
                <input v-model="confirmPassword" type="password" class="form-control" id="confirmPassword" required>
              </div>

              <div class="form-group text-left">
                <label for="role" class="font-weight-bold">Select Role</label>
                <select v-model="role" class="form-control" id="role" required>
                  <option value="">Choose...</option>
                  <option value="professional">Service Professional</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              
              <div v-if="role === 'customer'" class="form-group text-left">
                <label for="contactNumber" class="font-weight-bold">Contact Number</label>
                <input v-model="contactNumber" type="text" class="form-control" id="contactNumber" required>
              </div>

              <div v-if="role === 'professional'" class="form-group text-left">
                <label for="service" class="font-weight-bold">Select Service</label>
                <select v-model="selectedService" class="form-control" id="service" required>
                  <option value="">Choose a service...</option>
                  <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
                </select>
              </div>

              <div v-if="role === 'professional'" class="form-group text-left">
                <label for="document" class="font-weight-bold">Upload Verification Document</label>
                <input type="file" class="form-control-file border p-2 rounded" id="document" @change="handleFileUpload">
              </div>

              <p class="text-danger text-center">{{ errorMessage }}</p>
              <p class="text-success text-center">{{ successMessage }}</p>

              <button type="submit" class="btn btn-outline-secondary btn-block animate-hover">Register</button>
            </form>
          </div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="text-center mt-5 pb-3 text-dark">
        &copy; 2025 Household Services. All rights reserved.
      </div>
    </div>
  `,
});