Vue.component("navbar-component", {
  data() {
    return {
      isAuthenticated: false,
      userRole: "",
    };
  },
  mounted() {
    this.checkAuth();
  },
  methods: {
    checkAuth() {
      const token = sessionStorage.getItem("token");
      this.isAuthenticated = !!(token && token !== "undefined" && token !== "null" && token.trim() !== "");

      const role = sessionStorage.getItem("role");
      if (role) {
        this.userRole = role;
      } else {
        this.userRole = "";
      }
    },
  
    async logout() {
      
      const token = sessionStorage.getItem("token");
    
      if (!token) {
        console.warn("No token found, user already logged out.");
        this.isAuthenticated = false;
        this.userRole = "";
        this.$router.push("/");
        return;
      }
    
      try {
        const response = await fetch("/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"  // Ensure JSON content type
          }
        });
    
        if (response.ok) {
          console.log("Logout successful.");
        } else {
          console.warn("Logout request failed:", response.status, await response.text());
        }
      } catch (error) {
        console.error("Logout failed", error);
      }
    
      // Make sure sessionStorage is cleared
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      // localStorage.removeItem("token");
      // localStorage.removeItem("role");
      this.isAuthenticated = false;
      this.userRole = "";
      this.$router.push("/");
      this.$forceUpdate();
    }, 
  },
  computed: {
    dashboardLink() {
      if (this.userRole === "admin") return "/admin/dashboard";
      if (this.userRole === "professional") return "/professional/dashboard";
      if (this.userRole === "customer") return "/customer/dashboard";
      return "/dashboard"; // Default fallback
    },
  },
  watch: {
    $route() {
      this.checkAuth();
    },
  },
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div class="container d-flex align-items-center justify-content-between">
        
        <!-- Left Side: Home -->
        <ul class="navbar-nav flex-row">
          <li class="nav-item">
            <router-link class="nav-link fs-5 fw-semibold px-3" to="/">🏠 Home</router-link>
          </li>
        </ul>

        <!-- Center: Logo & Brand -->
        <div class="position-absolute" style="left: 50%; transform: translateX(-50%); top: 50%; transform: translate(-50%, -50%);">
          <img src="/static/logo.png" alt="Logo" width="30" height="30">
        </div>

        <!-- Right Side: Authentication Buttons -->
        <div class="d-flex align-items-center">
          <ul class="navbar-nav flex-row">
            <li class="nav-item" v-if="!isAuthenticated">
              <router-link class="nav-link fs-5 fw-semibold px-3" to="/login">
              <i class="fas fa-sign-in-alt me-2"></i> Login
              </router-link>
            </li>
            <li class="nav-item" v-if="!isAuthenticated">
              <router-link class="nav-link fs-5 fw-semibold px-3" to="/register">
              <i class="fas fa-user-plus me-2"></i> Register
              </router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link class="nav-link fs-5 fw-semibold px-3" :to="dashboardLink">
              <i class="fas fa-tachometer-alt me-2"></i> Dashboard
              </router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <button class="btn btn-link fs-5 fw-semibold px-3 text-secondary text-decoration-none" @click="logout">
              <i class="fas fa-sign-out-alt me-2"></i> Logout
              </button>
            </li>
          </ul>
        </div>

      </div>
    </nav>
  `,
});
