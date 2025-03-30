// Vue 2 Initialization (CDN-based)

new Vue({
  el: "#app",
  router,
  template: `
    <div>
      <navbar-component></navbar-component> <!-- Navbar Component -->
      <router-view></router-view> <!-- Page Content -->
    </div>
  `,
});

