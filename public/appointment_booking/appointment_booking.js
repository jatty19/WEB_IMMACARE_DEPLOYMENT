let bookingTable;
//Click View Booking in Datatable - Opening of Modal and showing booking data
document.addEventListener("DOMContentLoaded", function () {
  // This ensures the DOM is fully loaded before binding the event
  $(document).on("click", ".get-user-btn", function () {
    const id = $(this).data("id");
    $.ajax({
      url: `/getBookingListById/${id}`,
      method: "GET",
      success: function (response) {
        const user = response.data[0];
        $("#booking_id").val(user.id);

        $("#queue_no").val(user.queue_no);
        document.getElementById("labelConsultationType").textContent =
          user.consultation_type;

        document.getElementById("labelBookedDate").textContent =
          user.booking_date;

        document.getElementById("labelBookedTime").textContent =
          user.booking_time;

        document.getElementById("labelFullname").textContent = user.fullname;

        document.getElementById("labelGender").textContent = user.gender;

        document.getElementById("labelAge").textContent = user.age;

        document.getElementById("labelConsultationType2").textContent =
          user.consultation_type;

        document.getElementById("labelBookedDate2").textContent =
          user.booking_date;

        document.getElementById("labelBookedTime2").textContent =
          user.booking_time;

        document.getElementById("labelFullname2").textContent = user.fullname;

        document.getElementById("labelGender2").textContent = user.gender;

        document.getElementById("labelAge2").textContent = user.age;

        if (user.queue_no !== null && user.queue_no !== "") {
          $("#generateQueueNumber").prop("disabled", true);
        } else {
          $("#generateQueueNumber").prop("disabled", false);
        }
      },
      error: function () {
        alert("Failed to load user");
      },
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const dateInput = document.getElementById("newDateBooking");

  const today = new Date();
  today.setDate(today.getDate() + 1); // Tomorrow

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  dateInput.min = `${yyyy}-${mm}-${dd}`;
});

function generateQueueNumber() {
  const id = $("#booking_id").val();

  $.ajax({
    url: `/generateQueueNumber/${id}`,
    method: "POST",
    success: function (response) {
      Swal.fire({
        title: "Generated!",
        text: `Queue Number: ${response.queue_no}`,
        icon: "success",
      }).then(() => {
        $("#bookingModal").modal("hide");
        // Reload DataTable
        bookingTable.ajax.reload();
      });
    },
    error: function () {
      alert("Failed to generate queue number.");
    },
  });
}

function clearCriteria() {
  $(".criteria").val("");
  bookingTable.ajax.reload();
}

function searchBooking() {
  bookingTable.ajax.reload();
}

function formatDateToDB(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${month}-${day}-${year}`; // MM-DD-YYYY
}

let currentDate = new Date();

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  $("#monthAndYear").text(`${monthNames[month]} ${year}`);

  const today = new Date(); // current system date (now)
  today.setHours(0, 0, 0, 0); // clear time for accurate comparison

  let calendar = "";
  let day = 1;
  let done = false;

  for (let i = 0; i < 6 && !done; i++) {
    let row = "<tr>";
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) {
        row += "<td></td>";
      } else if (day > lastDate) {
        row += "<td></td>";
        done = true; // stop looping after last day
      } else {
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);

        const isPast = cellDate < today;
        const disabledAttr = isPast ? "disabled" : "";
        const disabledClass = isPast ? "btn-secondary disabled" : "btn-light";

        row += `<td>
                <button class="btn btn-lg ${disabledClass} calendar-day" 
                        data-day="${day}" 
                        data-month="${month}" 
                        data-year="${year}"
                        ${disabledAttr}>
                  ${day}
                </button>
              </td>`;
        day++;
      }
    }
    row += "</tr>";
    calendar += row;
  }

  $("#calendarBody").html(calendar);
}
let role;
$(document).ready(function () {
  fetch("http://localhost:3000/homepage", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.message);
        });
      }
      return response.json();
    })
    .then((data) => {
      role = `${data.role}`;
      const rawDate = data.birthdate;
      let formattedDate = "";
      if (rawDate) {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj)) {
          formattedDate = dateObj.toISOString().split("T")[0];
          $("#birthdate").val(formattedDate);
        } else {
          $("#birthdate").val(""); // Or handle as you prefer
        }
      } else {
        $("#birthdate").val("");
      }

      $("#user_id").val(`${data.user_id}`).prop("readonly", true);
      $("#user_id_list").val(`${data.user_id_id}`).prop("readonly", true);
      $("#user_id_booking").val(`${data.user_id}`).prop("readonly", true);
      $("#firstname").val(`${data.firstname}`).prop("readonly", true);
      $("#middlename").val(`${data.middlename}`).prop("readonly", true);
      $("#lastname").val(`${data.lastname}`).prop("readonly", true);
      $("#gender").val(`${data.gender}`).prop("readonly", true);
      $("#age").val(`${data.age}`).prop("readonly", true);
      $("#role").val(`${data.role}`).prop("readonly", true);
      $("#role_list").val(`${data.role}`).prop("readonly", true);
      $("#mobileNum2").val(`${data.phone}`).prop("readonly", true);
      $("#email").val(`${data.email}`).prop("readonly", true);
      if (`${data.role}` == "patient") {
        $("#patientName").prop("readonly", true);
      }
      patientDetails(`${data.user_id_id}`);

      initBookingTable();
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });

  const today = new Date().toISOString().split("T")[0];
  $("#bookingDate").val(today);

  renderCalendar(currentDate);

  $("#prevMonth").click(function () {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });

  $("#nextMonth").click(function () {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });

  $(document).on("click", ".calendar-day", function () {
    const day = $(this).data("day");
    const month = $(this).data("month");
    const year = $(this).data("year");

    onDateClick(year, month, day);
  });

  $("#selectedDate, #selectedTime, #consultationType, #doctorSelect").on(
    "change",
    function () {
      updateNextButtonState();
    }
  );

  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("type");
  const doc_id = urlParams.get("doc_id");
  const date = urlParams.get("date");
  const time = urlParams.get("time");

  $("#consultationTypeDisplay").val(type);
  $("#selectedDateDisplay").val(date);
  $("#selectedTimeDisplay").val(time);
  $("#doctors_id").val(doc_id);

  $(".dt-length label").each(function () {
    const labelText = $(this).text().trim();
    if (labelText === "entries per page") {
      $(this).remove(); // OR just hide it: $(this).css('display', 'none');
    }
  });

  $("#consultationType").on("change", function () {
    const typeId = $(this).val();

    if (typeId) {
      $.ajax({
        url: "/getDoctorsByConsultationType", // Your server route
        type: "GET",
        data: { consultationType: typeId },
        success: function (response) {
          const doctorSelect = $("#doctorSelect");
          doctorSelect.empty(); // Clear previous options
          doctorSelect.append('<option value="">-- Select Doctor --</option>');

          if (response && response.length > 0) {
            response.forEach(function (doctor) {
              doctorSelect.append(
                `<option value="${doctor.id}">${doctor.name}</option>`
              );
            });
          } else {
            doctorSelect.append(
              '<option value="">No doctors available</option>'
            );
          }
        },
        error: function () {
          alert("Error fetching doctors.");
        },
      });
    } else {
      $("#doctorSelect").html('<option value="">-- Select Doctor --</option>');
    }
  });

  $("#status").on("change", function () {
    bookingTable.ajax.reload();
  });
});

function initBookingTable() {
  const bookingTableEl = document.getElementById("bookingTable");
  if (bookingTableEl && $.fn.DataTable) {
    bookingTable = $("#bookingTable").DataTable({
      columnDefs: [
        { targets: 1, width: "16%" },
        {
          targets: [0], // Index of column to hide (0-based)
          visible: false,
        },
      ],

      searching: false,
      responsive: true,
      ajax: {
        url: "/getBookingListSearch",
        dataSrc: "data",
        data: function (d) {
          d.booking_date = $("#bookingDate").val()
            ? formatDateToDB($("#bookingDate").val())
            : "";
          d.fullname = $("#patientName").val();
          d.status = $("#status").val();
          d.consultation_type = $("#consultationType").val();
          d.role = role;
          d.user_id = $("#user_id_list").val();
        },
      },
      columns: [
        { data: "id" },
        {
          data: null,
          orderable: false,
          searchable: false,
          render: function (data, type, row) {
            const hiddenStatuses = ["Emergency", "Cancelled", "Completed"];
            const role = $("#role_list").val(); // get current role

            const hideTagButton =
              hiddenStatuses.includes(row.status) ||
              role === "patient" ||
              role === "doctor";

            const showViewBooking = role !== "doctor";
            const showProfileButton = role === "doctor";

            return `
      ${
        showViewBooking
          ? `<button
              class="btn btn-info btn-sm get-user-btn adminBtn me-2"
              onclick="viewBookingModal(this)" 
              data-id="${row.id}"
              data-status="${row.status}"
              data-bookingdate="${row.booking_date}"
            >
              View Booking
            </button>`
          : ""
      }

      ${
        !hideTagButton
          ? `<button
              class="btn btn-secondary btn-sm get-user-btn adminBtn me-2"
              onclick="tagModal(this)" 
              data-id="${row.id}"
              data-status="${row.status}"
              data-bookingdate="${row.booking_date}"
            >
              Tag
            </button>`
          : ""
      }

      ${
        showProfileButton
          ? `<a
              class="btn btn-success btn-sm get-user-btn adminBtn"
             href="../patient/patient_profile.html?patient_id=${row.patient_user_id}&appointment_id=${row.id}"

              data-id="${row.id}"
            >
              View Patient Profile
            </a>`
          : ""
      }
    `;
          },
        },
        { data: "fullname" },
        { data: "consultation_type" },
        { data: "booking_date" },
        { data: "queue_no" },
        {
          data: "status",
          render: function (data) {
            let statusClass = "";

            if (data.toLowerCase() === "booked") {
              statusClass = "badge bg-info";
            } else if (
              data.toLowerCase() === "in queue" ||
              data.toLowerCase() === "consulted"
            ) {
              statusClass = "badge bg-warning";
            } else if (data.toLowerCase() === "completed") {
              statusClass = "badge bg-success";
            } else if (data.toLowerCase() === "cancelled") {
              statusClass = "badge bg-danger";
            } else {
              statusClass = "badge bg-secondary";
            }

            return `<span class="${statusClass}">${data}</span>`;
          },
        },
      ],
    });
  }
}

function onDateClick(year, month, day) {
  const selectedDate = new Date(year, month, day);
  const now = new Date();

  const formattedDate = `${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}-${year}`;

  $(".calendar-day").removeClass("selected-date");
  $("#selectedDate").val(formattedDate).trigger("change");

  $(
    `.calendar-day[data-day='${day}'][data-month='${month}'][data-year='${year}']`
  ).addClass("selected-date");

  // Time button control
  const isToday = selectedDate.toDateString() === now.toDateString();

  $(".buttonTime").each(function () {
    const timeRange = $(this).text().trim(); // e.g., "8:00 AM - 9:00 AM"
    const [startTimeStr] = timeRange.split(" - ");
    const startDateTime = new Date(selectedDate);

    const [time, meridian] = startTimeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    startDateTime.setHours(hours, minutes, 0, 0);

    if (isToday && startDateTime < now) {
      $(this).addClass("disabled").attr("disabled", true);
    } else {
      $(this).removeClass("disabled").attr("disabled", false);
    }
  });
}

$(document).on("click", ".buttonTime", function () {
  $(".buttonTime").removeClass("selected-time");
  $(this).addClass("selected-time");
  const timeLabel = $(this).text().trim();
  $("#selectedTime").val("");
  $("#selectedTime").val(timeLabel).trigger("change");
});

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("nextBtn");
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      $("#nextBtn").prop("disabled", true);
      const consultationType = $("#consultationType option:selected").text();
      const selectedDate = $("#selectedDate").val();
      const selectedTime = $("#selectedTime").val();
      const doctors_id = $("#doctorSelect").val();
      $.ajax({
        url: "/validateAppointment",
        method: "GET",
        contentType: "application/json",
        data: {
          consultation_type: consultationType,
          booking_date: $("#selectedDate").val(),
          booking_time: $("#selectedTime").val(),
          user_id: $("#user_id_booking").val(),
        },
        success: function (response) {
          console.log(response);
          if (response.exists) {
            Swal.fire({
              title: "",
              text:
                response.message ||
                "You already have a booking at this date and time.",
              icon: "error",
            }).then(() => {
              $("#nextBtn").prop("disabled", false);
            });
          } else {
            Swal.fire({
              title: "Are you sure you want to proceed booking?",
              html: `
          <strong>Consultation Type:</strong> ${consultationType || "N/A"}<br>
          <strong>Date:</strong> ${selectedDate || "N/A"}<br>
          <strong>Time:</strong> ${selectedTime || "N/A"}
        `,
              icon: "question",
              showCancelButton: true,
              confirmButtonColor: "#28a745",
              cancelButtonColor: "#d33",
              confirmButtonText: "Yes, proceed!",
              backdrop: false,
            }).then((result) => {
              if (result.isConfirmed) {
                let seconds = 3;
                const params = new URLSearchParams({
                  type: consultationType,
                  doc_id: doctors_id,
                  date: selectedDate,
                  time: selectedTime,
                });
                const targetUrl = `../appointment_booking/appointment_patient_form.html?${params.toString()}`;

                // Show countdown modal
                let countdownInterval;
                Swal.fire({
                  title: "Proceeding...",
                  html: `Redirecting in <b>${seconds}</b> second(s)...`,
                  timer: seconds * 1000,
                  timerProgressBar: true,
                  backdrop: false,
                  didOpen: () => {
                    Swal.showLoading();
                    const content = Swal.getHtmlContainer().querySelector("b");
                    countdownInterval = setInterval(() => {
                      seconds--;
                      if (content) content.textContent = seconds;
                    }, 1000);
                  },
                  willClose: () => {
                    clearInterval(countdownInterval);
                    // Update iframe src on confirmation after countdown
                    window.parent.document.getElementById(
                      "main-content-frame"
                    ).src = targetUrl;
                  },
                });
              }
            });
          }
        },
        error: function (xhr) {
          alert("Error: " + (xhr.responseJSON?.message || "Unknown error"));
        },
      });
    });
  }
});

function updateNextButtonState() {
  const selectedDate = $("#selectedDate").val();
  const selectedTime = $("#selectedTime").val();
  const consultationType = $("#consultationType").val();
  const $btn = $("#nextBtn");

  if (selectedDate && selectedTime && consultationType) {
    $btn
      .removeClass("btn-secondary disabled")
      .addClass("btn-warning")
      .removeAttr("disabled")
      .attr("tabindex", "0")
      .attr("aria-disabled", "false");
  } else {
    $btn
      .removeClass("btn-warning")
      .addClass("btn-secondary disabled")
      .attr("disabled", "disabled")
      .attr("tabindex", "-1")
      .attr("aria-disabled", "true");
  }
}

$(document).on("click", "#submitBookingBtn", function () {
  $("#selectedTime").val();
});

$(document).ready(function () {
  let currentStep = 0;
  const steps = document.querySelectorAll(".form-step");
  const indicators = document.querySelectorAll(".step-indicator .step");

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === index);
    });
    indicators.forEach((ind, i) => {
      ind.classList.remove("active", "completed");
      if (i < index) ind.classList.add("completed");
      if (i === index) ind.classList.add("active");
    });
  }

  //-BERMEJO
  function nextStep() {
    if (currentStep === 0 && !validateStep1()) return;
    if (currentStep === 1 && !validateStep2()) return;
    if (currentStep === 2 && !validateStep3()) return;
    if (currentStep === 3 && !validateStep4()) return;

    if (currentStep < steps.length - 1) {
      currentStep++;
      showStep(currentStep);
    }

    document.getElementById("labelFirstname").textContent =
      $("#firstname").val();
    document.getElementById("labelMiddlename").textContent =
      $("#middlename").val();
    document.getElementById("labelLastname").textContent = $("#lastname").val();
    document.getElementById("labelGender").textContent = $("#gender").val();
    document.getElementById("labelBirthdate").textContent =
      $("#birthdate").val();
    document.getElementById("labelAge").textContent = $("#age").val();
    document.getElementById("labelCivilStatus").textContent =
      $("#civilStatus").val();
    document.getElementById("labelMobilenum").textContent =
      $("#mobileNum2").val();
    document.getElementById("labelEmailadd").textContent = $("#email").val();
    document.getElementById("labelHomeadd").textContent =
      $("#homeAddress").val();
    document.getElementById("labelName").textContent = $("#name").val();
    document.getElementById("labelRelationship").textContent =
      $("#relationship").val();
    document.getElementById("labelMobilenum2").textContent =
      $("#mobileNum3").val();

    document.getElementById("labelBloodtype").textContent =
      $("#bloodType").val();
    document.getElementById("labelAlergies").textContent = $("#alergies").val();
    document.getElementById("labelCurrentMed").textContent =
      $("#currentMedication").val();
    document.getElementById("labelPastmed").textContent = $(
      "#pastMedicalConditions"
    ).val();
    document.getElementById("labelChronicill").textContent =
      $("#chronicIllnes").val();
    document.getElementById("labelConsultationType").textContent = $(
      "#consultationTypeDisplay"
    ).val();
    document.getElementById("labelselectedDateDisplay").textContent = $(
      "#selectedDateDisplay"
    ).val();
    document.getElementById("labelselectedTimeDisplay").textContent = $(
      "#selectedTimeDisplay"
    ).val();
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
  }

  window.nextStep = nextStep;
  window.prevStep = prevStep;
  showStep(currentStep);
});

document.addEventListener("DOMContentLoaded", function () {
  const birthdateInput = document.getElementById("birthdate");
  const ageInput = document.getElementById("age");

  if (birthdateInput && ageInput) {
    birthdateInput.addEventListener("change", function () {
      const birthdateValue = birthdateInput.value;
      if (!birthdateValue) {
        ageInput.value = "";
        return;
      }

      const birthdate = new Date(birthdateValue);
      const today = new Date();

      let age = today.getFullYear() - birthdate.getFullYear();
      const monthDiff = today.getMonth() - birthdate.getMonth();
      const dayDiff = today.getDate() - birthdate.getDate();

      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      ageInput.value = age >= 0 ? age : "";
    });
  }
});

async function bookAppointment() {
  //-BERMEJO
  if (!validateStep5()) return;
  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to confirm this booking?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, book it!",
    backdrop: false,
  }).then(async (result) => {
    if (result.isConfirmed) {
      const data = {
        user_id: document.getElementById("user_id").value,
        firstname: document.getElementById("firstname").value,
        middlename: document.getElementById("middlename").value,
        lastname: document.getElementById("lastname").value,
        gender: document.getElementById("gender").value,
        birthdate: document.getElementById("birthdate").value,
        age: document.getElementById("age").value,
        civil_status: document.getElementById("civilStatus").value,
        mobile_number: document.getElementById("mobileNum2").value,
        email_address: document.getElementById("email").value,
        home_address: document.getElementById("homeAddress").value,
        emergency_name: document.getElementById("name").value,
        emergency_relationship: document.getElementById("relationship").value,
        emergency_mobile_number: document.getElementById("mobileNum3").value,
        bloodtype: document.getElementById("bloodType").value,
        allergies: document.getElementById("alergies").value,
        current_medication: document.getElementById("currentMedication").value,
        past_medical_condition: document.getElementById("pastMedicalConditions")
          .value,
        chronic_illness: document.getElementById("chronicIllnes").value,
        consultation_type: document.getElementById("consultationTypeDisplay")
          .value,
        booking_date: document.getElementById("selectedDateDisplay").value,
        booking_time: document.getElementById("selectedTimeDisplay").value,
        status: "Booked",
        doctor_id: document.getElementById("doctors_id").value,
      };

      $.ajax({
        url: "/book-appointment",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Your appointment has been booked.",
            text: "Redirecting shortly...",
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
          }).then(() => {
            window.location.href =
              "../appointment_booking/appointment_list.html";
          });
        },
        error: function (xhr) {
          alert("Error: " + xhr.responseJSON.message);
        },
      });
    }
  });
}

//STEPS -BERMEJO
//step 1
function validateStep1() {
  const requiredFields = [
    "firstname",
    "middlename",
    "lastname",
    "gender",
    "birthdate",
    "civilStatus",
    "age",
  ];

  let isValid = true;
  let firstInvalidField = null;

  requiredFields.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;

    let value = field.value;

    if (field.tagName === "SELECT") {
      value = field.options[field.selectedIndex].value;
    }

    const isEmpty =
      !value ||
      value.trim() === "" ||
      value === "Select Gender" ||
      value === "Select Civil Status" ||
      (id === "age" && (isNaN(value) || Number(value) <= 0));

    if (isEmpty) {
      field.classList.add("is-invalid");
      if (!firstInvalidField) firstInvalidField = field;
      isValid = false;
    } else {
      field.classList.remove("is-invalid");
    }
  });

  if (!isValid) {
    // alert("Please complete all required fields before continuing.");
    Swal.fire({
      title: "",
      text: "Please complete all required fields before continuing.",
      icon: "error",
    });
    if (firstInvalidField) firstInvalidField.focus();
  }

  return isValid;
}

//step2
function validateStep2() {
  const requiredFields = ["mobileNum2", "email", "homeAddress"];
  let isValid = true;
  let firstInvalidField = null;

  requiredFields.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;

    const value = field.value.trim();

    // Simple email pattern
    const isEmailValid =
      id === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : true;

    const isEmpty = !value || !isEmailValid;

    if (isEmpty) {
      field.classList.add("is-invalid");
      if (!firstInvalidField) firstInvalidField = field;
      isValid = false;
    } else {
      field.classList.remove("is-invalid");
    }
  });

  if (!isValid) {
    Swal.fire({
      title: "",
      text: "Please complete all required fields before continuing.",
      icon: "error",
    });
    if (firstInvalidField) firstInvalidField.focus();
  }

  return isValid;
}

//step 3
function validateStep3() {
  const requiredFields = ["name", "relationship", "mobileNum3"];
  let isValid = true;
  let firstInvalidField = null;

  requiredFields.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;

    const value = field.value.trim();

    const isEmpty =
      !value || (id === "relationship" && value === "Select Relationship");

    if (isEmpty) {
      field.classList.add("is-invalid");
      if (!firstInvalidField) firstInvalidField = field;
      isValid = false;
    } else {
      field.classList.remove("is-invalid");
    }
  });

  if (!isValid) {
    Swal.fire({
      title: "",
      text: "Please complete all required fields before continuing.",
      icon: "error",
    });
    if (firstInvalidField) firstInvalidField.focus();
  }

  return isValid;
}

//step4
function validateStep4() {
  const requiredFields = [
    "bloodType",
    "alergies",
    "currentMedication",
    "pastMedicalConditions",
    "chronicIllnes",
  ];

  let isValid = true;
  let firstInvalidField = null;

  requiredFields.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;

    const value = field.value.trim();

    const isEmpty =
      !value || (id === "bloodType" && value === "Select Bloodtype");

    if (isEmpty) {
      field.classList.add("is-invalid");
      if (!firstInvalidField) firstInvalidField = field;
      isValid = false;
    } else {
      field.classList.remove("is-invalid");
    }
  });

  if (!isValid) {
    Swal.fire({
      title: "",
      text: "Please fill in all required fields with valid information or enter 'NA' if not applicable.",
      icon: "error",
    });
    if (firstInvalidField) firstInvalidField.focus();
  }

  return isValid;
}

//step5
function validateStep5() {
  const labelIds = [
    "labelConsultationType",
    "labelselectedDateDisplay",
    "labelselectedTimeDisplay",
    "labelFirstname",
    "labelMiddlename",
    "labelLastname",
    "labelGender",
    "labelBirthdate",
    "labelAge",
    "labelCivilStatus",
    "labelMobilenum",
    "labelEmailadd",
    "labelHomeadd",
    "labelName",
    "labelRelationship",
    "labelMobilenum2",
    "labelBloodtype",
    "labelAlergies",
    "labelCurrentMed",
    "labelPastmed",
    "labelChronicill",
  ];

  let isValid = true;

  for (const id of labelIds) {
    const element = document.getElementById(id);
    if (!element || !element.textContent.trim()) {
      Swal.fire({
        title: "",
        text: `Missing value for: ${id.replace("label", "")}`,
        icon: "error",
      });
      element.scrollIntoView({ behavior: "smooth" });
      isValid = false;
      break;
    }
  }

  return isValid;
}

function viewBookingModal(button) {
  const status = $(button).data("status");
  const current_booking_date = $(button).data("bookingdate");
  const modal = new bootstrap.Modal(document.getElementById("bookingModal"));
  const role = $("#role").val();
  const dateStr = current_booking_date;
  const labelDate = new Date(dateStr);
  const today = new Date();

  const date = new Date(today);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  const formattedDate = `${month}-${day}-${year}`;

  console.log(dateStr);
  console.log(formattedDate);
  today.setHours(0, 0, 0, 0);
  labelDate.setHours(0, 0, 0, 0);
  console.log("role: ", role);
  if (labelDate < today) {
    $("#cancelBooking").prop("disabled", true);
    $("#generateQueueNumber").hide();
  }

  if (
    role === "patient" &&
    (status === "Emergency" ||
      status === "Cancelled" ||
      status === "Completed" ||
      status === "In Queue" ||
      status === "Consulted")
  ) {
    $(".updateBookingBtn").hide();
    $("#generateQueueNumber").hide();
  } else if ((role === "admin" || role === "staff") && status === "Booked") {
    $("#generateQueueNumber").show();
    $(".updateBookingBtn").hide();
  }

  switch (true) {
    case status === "Booked":
      $("#generateQueueNumber").show();
      $(".updateBookingBtn").show();
      break;

    case status === "Emergency" ||
      status === "Cancelled" ||
      status === "Completed" ||
      status === "In Queue" ||
      status === "Consulted":
      $("#generateQueueNumber").hide();
      $(".updateBookingBtn").hide();
      break;

    default:
      $("#generateQueueNumber").show();
      $(".updateBookingBtn").hide();
      break;
  }

  if (role === "admin" || role === "staff") {
    $(".updateBookingBtn").hide();
  }

  if (dateStr != formattedDate) {
    $("#generateQueueNumber").hide();
  }

  if ($("#role_list").val() === "patient") {
    $("#generateQueueNumber").hide();
  }

  modal.show();
}

function tagModal(button) {
  const status = $(button).data("status");
  const current_booking_date = $(button).data("bookingdate");
  const modal = new bootstrap.Modal(document.getElementById("tagModal"));
  const role = $("#role").val();
  const dateStr = current_booking_date;
  const labelDate = new Date(dateStr);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  labelDate.setHours(0, 0, 0, 0);

  // Always reset the dropdown options
  const $tag = $("#tag");
  $tag.empty(); // Remove all options

  // Add all default options back
  $tag.append(`<option selected value=""></option>`);
  $tag.append(`<option value="Emergency">Emergency Booking</option>`);
  $tag.append(`<option value="Cancelled">Cancel Booking</option>`);
  $tag.append(`<option value="Completed">Completed Booking</option>`);

  // Then apply condition
  if (status === "Consulted") {
    $tag.find('option[value="Emergency"], option[value="Cancelled"]').remove();
  }

  // Clear selection
  $tag.val("");

  modal.show();
}

function reschedBooking() {
  const bookingModalEl = document.getElementById("bookingModal");
  const reschedModalEl = document.getElementById("reschedModal");

  const bookingModal = bootstrap.Modal.getInstance(bookingModalEl);
  const reschedModal = new bootstrap.Modal(reschedModalEl);

  if (bookingModal) {
    bookingModal.hide();
  }

  reschedModal.show();
}

function saveNewBooking() {
  const newBookingDate = $("#newDateBooking").val();
  const newBookingTime = $("#newTimeBooking").val();
  const booking_id = $("#booking_id").val();
  const rawDate = newBookingDate; // yyyy-mm-dd
  const dateObj = new Date(rawDate);

  // Format to mm-dd-yyyy
  const formattedDate =
    ("0" + (dateObj.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + dateObj.getDate()).slice(-2) +
    "-" +
    dateObj.getFullYear();

  console.log(formattedDate); // "07-02-2024"

  // Then use formattedDate in your UPDATE query

  if (newBookingDate === "" || newBookingTime === "") {
    Swal.fire({
      title: "",
      text: "Complete the required fields",
      icon: "error",
    });
  } else {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to reschedule your booking?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      confirmButtonText: "Yes",
      backdrop: false,
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: "/reschedBooking",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({
            formattedDate,
            newBookingTime,
            booking_id,
          }),
          success: function (response) {
            Swal.fire({
              icon: "success",
              title: "Updated!",
              text: "Your booking has been rescheduled successfully.",
            }).then(() => {
              $("#reschedModal").modal("hide");

              // Reload DataTable
              bookingTable.ajax.reload();
            });
          },
          error: function (xhr) {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: xhr.responseJSON?.message || "Something went wrong.",
            });
          },
        });
      }
    });
  }
}

function cancelBooking() {
  const booking_id = $("#booking_id").val();
  const tag = "Cancelled";
  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to cancel your booking?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/cancelBooking",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          booking_id,
          tag,
        }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Cancelled!",
            text: "Your booking has been cancelled.",
          }).then(() => {
            $("#reschedModal").modal("hide");
            // Reload DataTable
            bookingTable.ajax.reload();
          });
        },
        error: function (xhr) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: xhr.responseJSON?.message || "Something went wrong.",
          });
        },
      });
    }
  });
}

function saveTag() {
  const booking_id = $("#booking_id").val();
  const tag = $("#tag").val();
  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to tag this booking as " + tag + "?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/cancelBooking",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          booking_id,
          tag,
        }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Tagged as " + tag + "!",
            text: "",
          }).then(() => {
            $("#tagModal").modal("hide");
            // Reload DataTable
            bookingTable.ajax.reload();
          });
        },
        error: function (xhr) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: xhr.responseJSON?.message || "Something went wrong.",
          });
        },
      });
    }
  });
}

function patientDetails(patient_user_id) {
  console.log("patient_user_id: " + patient_user_id);
  $.ajax({
    url: "/getPatientInfo",
    type: "GET",
    data: { patient_user_id: patient_user_id },
    success: function (response) {
      const data = response.data[0];

      if (response.data && response.data.length > 0) {
        const data = response.data[0];
        const rawDate = data.birthdate;
        let formattedDate = "";
        if (rawDate) {
          const dateObj = new Date(rawDate);
          if (!isNaN(dateObj)) {
            formattedDate = dateObj.toISOString().split("T")[0];
            $("#birthdate").val(formattedDate);
          } else {
            $("#birthdate").val("");
          }
        } else {
          $("#birthdate").val("");
        }

        $("#firstname").val(data.firstname);
        $("#middlename").val(data.middlename);
        $("#lastname").val(data.lastname);
        $("#gender").val(data.gender);
        $("#age").val(data.age);
        $("#role").val(data.role);
        $("#civilStatus").val(data.civil_status);
        $("#mobileNum2").val(data.mobile_number);
        $("#email").val(data.email);
        $("#homeAddress").val(data.home_address);
        $("#name").val(data.emergency_name);
        $("#relationship").val(data.emergency_relationship);
        $("#mobileNum3").val(data.emergency_mobile_number);
        $("#bloodType").val(data.bloodtype);
        $("#alergies").val(data.allergies);
        $("#currentMedication").val(data.current_medication);
        $("#pastMedicalConditions").val(data.past_medical_condition);
        $("#chronicIllnes").val(data.chronic_illness);
      } else {
        // If no data, clear the birthdate field
        $("#birthdate").val("");
      }
    },
    error: function () {
      alert("Error fetching patientDetails.");
    },
  });
}


//bermejo

document.addEventListener("DOMContentLoaded", function () {
  // ===== Name fields that shouldn't contain numbers =====
  const noNumberFields = [
    "firstname",
    "middlename",
    "lastname",
    "name",
    "alergies",
    "currentMedication",
    "pastMedicalConditions",
    "chronicIllnes",
  ];

  noNumberFields.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener("input", function (e) {
      const regex = /^[A-Za-z,\s]*$/;
      let errorMsg = input.parentNode.querySelector(".error-msg");
      if (errorMsg) errorMsg.remove();

      if (!regex.test(e.target.value)) {
        input.classList.add("invalid-input");
        e.target.value = e.target.value.replace(/[^A-Za-z,\s]/g, "");
        errorMsg = document.createElement("small");
        errorMsg.classList.add("error-msg");
        errorMsg.innerText = "Numbers are not allowed in this field.";
        input.parentNode.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 1500);
      } else {
        input.classList.remove("invalid-input");
      }
    });
  });

  // ===== Mobile number field (must start with 09 and 11 digits) =====
  const mobileFields = ["mobileNum2", "mobileNum3"];

  mobileFields.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    // Always start with "09"
    if (!input.value.startsWith("09")) input.value = "09";

    input.addEventListener("input", function (e) {
      // Allow only digits
      e.target.value = e.target.value.replace(/[^0-9]/g, "");

      // Force "09" prefix if removed
      if (!e.target.value.startsWith("09")) {
        e.target.value = "09";
      }

      // Limit to 11 digits
      if (e.target.value.length > 11) {
        e.target.value = e.target.value.slice(0, 11);
      }

      // Error handling
      let errorMsg = input.parentNode.querySelector(".error-msg");
      if (errorMsg) errorMsg.remove();

      if (e.target.value.length !== 11) {
        input.classList.add("invalid-input");
        errorMsg = document.createElement("small");
        errorMsg.classList.add("error-msg");
        errorMsg.innerText = "Mobile number must be 11 digits and start with 09.";
        input.parentNode.appendChild(errorMsg);
        setTimeout(() => errorMsg.remove(), 1500);
      } else {
        input.classList.remove("invalid-input");
      }
    });

    // Prevent cursor before “09”
    input.addEventListener("click", function () {
      if (input.selectionStart < 2) {
        input.setSelectionRange(2, 2);
      }
    });
  });

  // ===== Block form submission if any invalid input exists =====
  const form = document.querySelector("form"); // Adjust selector if needed

  form.addEventListener("submit", function (e) {
    let hasError = false;

    // Check all text inputs with invalid-input class
    document.querySelectorAll("input").forEach((input) => {
      if (input.classList.contains("invalid-input") || input.value.trim() === "") {
        hasError = true;
      }
    });

    // Recheck mobile numbers specifically
    mobileFields.forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;

      const value = input.value.trim();
      if (!value.startsWith("09") || value.length !== 11) {
        hasError = true;
        input.classList.add("invalid-input");
      }
    });

    if (hasError) {
      e.preventDefault();
      alert("Please fix invalid fields before proceeding.");
    }
  });
});

