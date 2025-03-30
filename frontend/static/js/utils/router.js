const LoginPage = { template: "<loginpage-component></loginpage-component>" };
const RegisterPage = { template: "<registerpage-component></registerpage-component>" };
const HomePage = { template: "<homepage-component></homepage-component>" };
const AdminDashboard = { template: "<admin-dashboard></admin-dashboard>" };
const ProfessionalDashboard = { template: "<professional-dashboard></professional-dashboard>" };
const CustomerDashboard = { template: "<customer-dashboard></customer-dashboard>" };

// Placeholder components for Know More & Terms
const KnowMore = { template: "<div class='container mt-3 text-center'><div class='bg-light p-3 rounded shadow-sm border'><h3 class='font-weight-bold text-dark'>No More :)</h3></div>" };
const Terms = { template: "<div class='container mt-3 text-center'><div class='bg-light p-3 rounded shadow-sm border'><h3 class='font-weight-bold text-dark'>Terms and Conditions</h3></div>" };

const routes = [
  { path: "/", component: HomePage },
  { path: "/login", component: LoginPage },
  { path: "/register", component: RegisterPage },
  { path: "/know-more", component: KnowMore },
  { path: "/terms", component: Terms },
  { path: "/admin/dashboard", component: AdminDashboard, meta: { requiresAuth: true } },
  { path: "/professional/dashboard", component: ProfessionalDashboard, meta: { requiresAuth: true } },
  { path: "/customer/dashboard", component: CustomerDashboard, meta: { requiresAuth: true } },
];

const router = new VueRouter({
  mode: "history",
  routes,
});

// Navigation Guard

router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("role");  

  if (to.path === "/login" && token) {
    if (userRole === "admin") next("/admin/dashboard");
    else if (userRole === "professional") next("/professional/dashboard");
    else if (userRole === "customer") next("/customer/dashboard");
    else next("/"); // Fallback in case role is missing
  } else if (to.meta.requiresAuth && !token) {
    next("/login");
  } else {
    next();
  }
});