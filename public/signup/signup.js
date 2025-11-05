
// public/signup-form.js
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // stop normal form submission
  e.stopImmediatePropagation(); // prevent double triggers

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  // ✅ PASSWORD MATCH VALIDATION
  const password = data.password.trim();
  const confirmPassword = data.confirmPassword.trim();

  if (password !== confirmPassword) {
    Swal.fire({
      icon: "error",
      title: "Password Mismatch",
      text: "Your passwords do not match. Please try again.",
    });
    return; 
  }

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    Swal.fire({
      title: result.message,
      icon: "success",
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Something went wrong while submitting the form.",
    });
    console.error("Error:", error);
  }
});


// BIRTHDATE AND AGE VALIDATION

const birthdateInput = document.getElementById("birthdate");
const ageInput = document.getElementById("age");

// Disable future dates
const today = new Date().toISOString().split("T")[0];
birthdateInput.setAttribute("max", today);

birthdateInput.addEventListener("change", () => {
  const birthdateValue = birthdateInput.value;
  if (!birthdateValue) {
    ageInput.value = "";
    return;
  }

  const birthDate = new Date(birthdateValue);
  const todayDate = new Date();

  let age = todayDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = todayDate.getMonth() - birthDate.getMonth();
  const dayDiff = todayDate.getDate() - birthDate.getDate();

  // Adjust age if birthday hasn't happened yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  // If age is negative or 0, clear the age field
  if (age < 1) {
    ageInput.value = "";
  } else {
    ageInput.value = age;
  }
});


// NAME FORMATTER

function capitalizeEachWord(str) {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function isAllUppercase(str) {
  return str === str.toUpperCase() && /[A-Z]/.test(str);
}

const nameFields = ["firstName", "middleName", "lastName"];

nameFields.forEach((id) => {
  const input = document.getElementById(id);

  input.addEventListener("input", () => {
    let value = input.value;

    // If input is all caps, fix it
    if (isAllUppercase(value)) {
      value = value.toLowerCase();
    }

    // Capitalize each word
    value = capitalizeEachWord(value);
    input.value = value;
  });
});


// PHONE NUMBER FORMAT

const phoneInput = document.getElementById("phone");
const prefix = "+639"; // include +639

// Initialize with +639 if empty
phoneInput.addEventListener("focus", () => {
  if (!phoneInput.value.startsWith(prefix)) {
    phoneInput.value = prefix;
  }
});

// Prevent deleting the +639 prefix
phoneInput.addEventListener("input", () => {
  if (!phoneInput.value.startsWith(prefix)) {
    const numbersOnly = phoneInput.value.replace(/\D/g, "");
    phoneInput.value = prefix + numbersOnly.replace(/^639?/, "");
  }
});

// Prevent backspacing or moving the cursor before +639
phoneInput.addEventListener("keydown", (e) => {
  if (
    phoneInput.selectionStart <= prefix.length &&
    (e.key === "Backspace" || e.key === "ArrowLeft")
  ) {
    e.preventDefault();
  }
});


// EMAIL FORMATTER

const emailInput = document.getElementById("email");

function formatEmail() {
  let value = emailInput.value.trim();

  const atIndex = value.indexOf("@");
  if (atIndex !== -1) {
    const local = value.slice(0, atIndex);
    const domain = value.slice(atIndex).toLowerCase();

    // Only allow editing if domain is missing or gmail.com
    if (domain.startsWith("@gmail.com") || domain === "") {
      emailInput.value = local + domain;
    } else {
      // Optional: Keep local part but replace domain
      emailInput.value = local + "@gmail.com";
    }
  }
}

emailInput.addEventListener("input", formatEmail);
emailInput.addEventListener("blur", formatEmail);


// NAME FIELD BLOCK SPECIAL CHARACTERS & NUMBERS
function blockSpecialCharacters(inputElement) {
  inputElement.value = inputElement.value.replace(/[^A-Za-z ]/g, "");
}

// Apply to all name fields
const nameInputs = ["firstName", "middleName", "lastName"];
nameInputs.forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener("input", () => blockSpecialCharacters(input));
});

// Disable numbers in name fields
const nameSFields = [
  document.getElementById("firstName"),
  document.getElementById("middleName"),
  document.getElementById("lastName"),
];

nameSFields.forEach((input) => {
  input.addEventListener("keydown", function (event) {
    const allowedKeys = [
      "Backspace",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Delete",
      " ",
    ];
    if (
      event.key >= "0" &&
      event.key <= "9" &&
      !allowedKeys.includes(event.key)
    ) {
      event.preventDefault();
    }
  });
});


//bermejo

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const signupForm = document.getElementById("signup-form");
const signupBtn = document.querySelector(".btn.btn-primary.w-100"); // your button selector

const requirements = {
  length: document.getElementById("length"),
  uppercase: document.getElementById("uppercase"),
  lowercase: document.getElementById("lowercase"),
  number: document.getElementById("number"),
  special: document.getElementById("special"),
  match: document.getElementById("match"),
};

function validatePassword() {
  const value = password.value;

  // Password checks
  const checks = {
    length: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
  };

  // Update requirement indicators
  for (const key in checks) {
    requirements[key].className = checks[key] ? "valid" : "invalid";
  }

  // Confirm password match
  const isMatch = value && confirmPassword.value === value;
  requirements.match.className = isMatch ? "valid" : "invalid";

  // Check if all valid
  const allValid =
    checks.length &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special &&
    isMatch;

  // Enable or disable button
  signupBtn.disabled = !allValid;
  signupBtn.style.opacity = allValid ? "1" : "0.6";
  signupBtn.style.cursor = allValid ? "pointer" : "not-allowed";

  return allValid;
}

password.addEventListener("input", validatePassword);
confirmPassword.addEventListener("input", validatePassword);

// Prevent form submission if requirements are not met
signupForm.addEventListener("submit", function (e) {
  if (!validatePassword()) {
    e.preventDefault();
    alert("Please make sure your password meets all the requirements before signing up.");
  }
});
