Vue.component("homepage-component", {
  data() {
    return {
      subheadline: "",
      fullText: "Your one-stop solution for booking trusted professionals for all your household needs.",
      testimonials: [
        { text: "Excellent service! The professionals were on time and did a fantastic job.", author: "Priya Sharma" },
        { text: "Easy to use and very reliable. Highly recommended for household services.", author: "Rahul Mehta" },
        { text: "Affordable pricing and great customer support. I will definitely use it again!", author: "Ananya Verma" }
      ],
      currentTestimonialIndex: 0,
      isAnimating: false
    };
  },
  mounted() {
    this.startTypewriter();  // Typewriter effect on sub-headline text
    this.startTestimonialAnimation();  // Animation on Testimonials
  },
  methods: {
    startTypewriter() {
      let i = 0;
      const interval = setInterval(() => {
        if (i < this.fullText.length) {
          this.subheadline += this.fullText.charAt(i);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 50);
    },
    startTestimonialAnimation() {
      setInterval(() => {
        if (this.isAnimating) return;
        this.isAnimating = true;

        gsap.to(".testimonial-card", {
          opacity: 0,
          x: -50,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonials.length;
            gsap.fromTo(
              ".testimonial-card",
              { opacity: 0, x: 50 },
              { opacity: 1, x: 0, duration: 0.5, ease: "power2.out", onComplete: () => (this.isAnimating = false) }
            );
          }
        });
      }, 4000);
    }
  },
  template: `
    <div class="video-container">
      <!-- Background Video -->
      <video autoplay loop muted playsinline class="background-video">
        <source src="/static/moving-lines4.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>

      <div class="container mt-4 text-center">
        <!-- Hero Section -->
        <div class="jumbotron bg-light p-4 rounded shadow fade-in">
          <h1 class="display-4 font-weight-bold text-dark">Welcome to Household Services</h1>
          <p class="lead text-dark typewriter">{{ subheadline }}</p>
          <hr class="my-4">
          
          <div class="mt-4">
            <router-link to="/know-more" class="btn btn-outline-secondary btn-lg mx-2 animate-hover">Know More</router-link>
            <router-link to="/terms" class="btn btn-outline-secondary btn-lg mx-2 animate-hover">Terms & Conditions</router-link>
          </div>
        </div>

        <!-- Testimonials Section -->
        <div class="mt-5 fade-in">
          <h2 class="text-dark">What Our Users Say</h2>
          <div class="row mt-4 justify-content-center">
            <div class="col-md-6">
              <div class="card p-4 shadow-sm testimonial-card text-center">
                <p class="text-muted">"{{ testimonials[currentTestimonialIndex].text }}"</p>
                <h6 class="text-primary">- {{ testimonials[currentTestimonialIndex].author }}</h6>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer Section -->
        <div class="text-center mt-5 pb-3 text-dark">
          &copy; 2025 Household Services. All rights reserved.
        </div>
      </div>
    </div>
  `
});
