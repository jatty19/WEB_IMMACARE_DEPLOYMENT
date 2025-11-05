fetch('http://localhost:3000/homepage', {
  method: 'GET',
  credentials: 'include' // This is crucial for session/cookie-based auth
})
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw new Error(err.message); });
    }
    return response.json();
  })
  .then(data => {
    // Display username in the div
    })
  .catch(error => {
    console.error('Error:', error.message);

  });

   document.addEventListener("DOMContentLoaded", function () {
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        // Remove 'active' class from all links
        navLinks.forEach(function (nav) {
          nav.classList.remove("active");
        });

        // Add 'active' class to the clicked link
        this.classList.add("active");
      });
    });
  });

 document.addEventListener("DOMContentLoaded", function() {
    const schedBtn = document.getElementById("sched-app");
    schedBtn.addEventListener("click", function() {
      const targetPage = this.getAttribute("data-nav");
      console.log("Navigating to:", targetPage); // Debug line
      window.location.href = targetPage;
    });
  });