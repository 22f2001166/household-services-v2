Vue.component("loginpage-component", {
  data: function () {
    return {
      email: "",
      password: "",
      errorMessage: "",
    };
  },
  methods: {
    login: function () {
      var self = this; // Capture `this` for use inside fetch
      fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (response.ok) {
              sessionStorage.setItem("token", data.access_token); // Store JWT token
              sessionStorage.setItem("role", data.role); // Store user role for redirection

              // Redirect user based on role
              if (data.role === "admin") {
                window.location.href = "/admin/dashboard";
              } else if (data.role === "professional") {
                window.location.href = "/professional/dashboard";
              } else {
                window.location.href = "/customer/dashboard";
              }
            } else {
              self.errorMessage = data.error || "Invalid credentials!";
            }
          });
        })
        .catch(function () {
          self.errorMessage = "An error occurred. Please try again.";
        });
    },
  },
  template: `
    <div class="container mt-5 text-center fade-in">
      <div class="row justify-content-center mt-4">
        <div class="col-md-5">
          <div class="card shadow-lg p-4 rounded border-0 bg-white">
            <h2 class="text-center text-dark mb-4">Login</h2>
            <form @submit.prevent="login">
              <div class="form-group text-left">
                <label for="email" class="font-weight-bold">Email Address</label>
                <input v-model="email" type="email" class="form-control" id="email" required>
              </div>
              <div class="form-group text-left">
                <label for="password" class="font-weight-bold">Password</label>
                <input v-model="password" type="password" class="form-control" id="password" required>
              </div>
              <p class="text-danger text-center">{{ errorMessage }}</p>
              <button type="submit" class="btn btn-outline-secondary btn-block animate-hover">Login</button>
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

