let patientTable;
let patientHistory;
let patientHistoryView;
let userId;
let patientId;
let appointment_id;
$(document).ready(function () {
  userId = getQueryParam("user_id");
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  const urlParams = new URLSearchParams(window.location.search);
  patientId = urlParams.get("patient_id");
  appointment_id = urlParams.get("appointment_id");

  console.log("patient_id : " + patientId);
  if (patientId) {
    patientDetails(patientId);
    $("#user_id").val(patientId);
  }
  getSession();
  const patientTableEl = document.getElementById("patientTable");
  if (patientTableEl && $.fn.DataTable) {
    patientTable = $("#patientTable").DataTable({
      columnDefs: [
        { targets: 1, width: "23%" },
        {
          targets: [0], // Index of column to hide (0-based)
          visible: false,
        },
      ],
      searching: false,
      responsive: true,

      ajax: {
        url: "/getPatientsList",
        dataSrc: "data",
        data: function (d) {
          d.fullname = $("#patientName").val().trim();
          d.emailAddress = $("#emailAddress").val().trim();
          d.user_id = $("#user_id").val();
        },
      },
      columns: [
        { data: "id" },
        {
          data: null,
          orderable: false,
          searchable: false,
          render: function (data, type, row) {
            return `
        <a
          class="btn btn-success btn-sm me-2"
          href="../patient/patient_profile.html?patient_id=${row.user_id}"
          data-id="${row.id}"
        >
          View Patient Profile
         <a
          class="btn btn-success btn-sm"
          href="../patient/view_history.html?user_id=${row.user_id}"
          data-id="${row.id}"
        >
          View History
      `;
          },
        },
        { data: "fullname" },
        { data: "gender" },
        { data: "age" },
        { data: "mobile_number" },
        { data: "email_address" },
      ],
    });
  }

  const patientHistoryEl = document.getElementById("patientHistory");
  if (patientHistoryEl && $.fn.DataTable) {
    patientHistory = $("#patientHistory").DataTable({
      searching: false,
      responsive: true,
      ajax: {
        url: "/getConsultationDetails",
        dataSrc: "data",
        data: function (d) {
          d.user_id = patientId ? patientId : userId;

        },
      },
      columns: [
        { data: "consultation_date" },
        { data: "consultation_type" },
        { data: "doctor_fullname" },
        { data: "recommendation" },
        { data: "follow_up" },
        { data: "consultation_status" },
      ],
    });
  }

  $(".dt-length label").each(function () {
    const labelText = $(this).text().trim();
    if (labelText === "entries per page") {
      $(this).remove(); // OR just hide it: $(this).css('display', 'none');
    }
  });

  if (appointment_id) {
    $("#appointment_id").val(appointment_id);
  }
});

function getSession() {
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

      $(".form-control").addClass("readonly");
      $(".form-control").prop("readonly", "true");
      $("select").prop("disabled", true);
      $("#user_id").val(`${data.user_id}`);
      $("#role").val(`${data.role}`);
      $(".criteria").removeClass("readonly");
      $(".criteria").prop("readonly", false);
      if (`${data.role}` == "patient") {
        $("#backDoctor").hide();
        $("#editPatientProfile").show();
        $("#giveReco").hide();

        $("#user_id").val(`${data.user_id}`);
        $("#firstname").val(`${data.firstname}`);
        $("#middlename").val(`${data.middlename}`);
        $("#lastname").val(`${data.lastname}`);
        $("#gender").val(`${data.gender}`);

        $("#age").val(data.age != null ? data.age : "");
        $("#mobileNum").val(`${data.phone}`.replace("+", ""));
        $("#email").val(`${data.email}`);
        patientDetails(`${data.user_id}`);
      } else {
        $("#backDoctor").show();
        $("#editPatientProfile").hide();
      }

      if (`${data.role}` === "doctor") {
        $("#backDoctor").attr(
          "href",
          "../appointment_booking/appointment_list.html"
        );
      } else {
        $("#backDoctor").attr("href", "../patient/patient_list.html");
      }

      if (`${data.role}` !== "doctor") {
        $("#giveReco").hide();
      }

      patientViewHistory(`${data.user_id}`);
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });
}

function patientViewHistory(user_id_val) {
  const patientHistoryViewEl = document.getElementById("patientHistoryView");
  if (patientHistoryViewEl && $.fn.DataTable) {
    patientHistoryView = $("#patientHistoryView").DataTable({
      searching: false,
      responsive: true,
      lengthChange: false,
      ajax: {
        url: "/getConsultationDetails",
        dataSrc: "data",
        data: function (d) {
          d.user_id = userId =
            userId === null || userId === "" ? user_id_val : userId;
        },
      },
      columns: [
        { data: "consultation_date" },
        { data: "consultation_type" },
        { data: "doctor_fullname" },
        { data: "recommendation" },
        { data: "follow_up" },
        { data: "consultation_status" },
      ],
    });
  }
}

$(document).on("click", ".get-user-btn", function () {
  document.getElementById("role").addEventListener("mousedown", function (e) {
    e.preventDefault();
  });
  const userId = $(this).data("user-id");

  $.ajax({
    url: `/users_update/${userId}`,
    method: "GET",
    success: function (response) {
      const user = response.data[0];

      // Populate input fields
      $("#firstname").val(user.firstname).prop("readonly", true);
      $("#middlename").val(user.middlename).prop("readonly", true);
      $("#lastname").val(user.lastname).prop("readonly", true);
      $("#birthdate").val(user.birthdate).prop("readonly", true);
      $("#gender").val(user.gender).prop("readonly", true);
      $("#role").val(user.role).prop("readonly", true);
      $("#email").val(user.username);
      $("#status").val(user.status);
      $("#password, #passwordconfirm").val("");
    },
    error: function () {
      alert("Failed to load user");
    },
  });
});

function makeFormReadOnly() {
  const inputs = document.querySelectorAll(
    "input, textarea, select, form-control"
  );

  inputs.forEach((el) => {
    if (el.tagName === "SELECT") {
      el.disabled = true; // Disable select dropdowns
    } else {
      el.setAttribute("readonly", true); // Make input/textarea readonly
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const editBtn = document.getElementById("editInfoBtn");
  if (editBtn) {
    editBtn.addEventListener("click", makeFormEditable);
  }

  function makeFormEditable() {
    const inputs = document.querySelectorAll("input, textarea, select");

    inputs.forEach((el) => {
      if (el.tagName === "SELECT") {
        el.disabled = false;
      } else {
        el.removeAttribute("readonly");
      }
    });
  }
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

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("createPatientButton");
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault(); // Prevent default link navigation

      Swal.fire({
        title: "Are you sure you want to create new Patient?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, Create!",
        backdrop: false,
      }).then((result) => {
        if (result.isConfirmed) {
          let seconds = 2;
          // Show countdown modal
          let countdownInterval;
          Swal.fire({
            title: "Creating Patient Data...",
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
            },
          }).then(() => {
            // Show success message after the countdown finishes
            Swal.fire({
              icon: "success",
              title: "Patient Data Created",
              text: "The patient data has been successfully created.",
              timer: 2000,
              showConfirmButton: false,
            }).then(() => {
              window.location.href = "../patient/patient_list.html";
            });
          });
        }
      });
    });
  }
});

function searchPatient() {
  patientTable.ajax.reload();
}

function handleButtonUpdate() {
  const button = $("#editPatientProfile");
  const currentText = button.text().trim();

  if (currentText.startsWith("Edit Info")) {
    $(".form-control").removeClass("readonly");
    $("select").prop("disabled", false);
    $(".form-control").prop("readonly", false);
    button.html("Save Changes <i class='bi bi-save'></i>");
    button.removeClass("btn-light").addClass("btn-success");
  } else {
    updatePatientInfo($("#user_id").val());
  }
}

function giveRecommendation() {
  let modalElement = document.getElementById("recommendationModal");
  let modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(modalElement);
  }

  $(".reco").removeClass("readonly");
  $(".reco").prop("disabled", false);
  $(".reco").prop("readonly", false);
  modalInstance.show();
}

document.addEventListener("DOMContentLoaded", function () {
  const prescriptionTag = document.getElementById("prescription_tag");
  const prescriptionDiv = document.getElementById("prescriptionDiv");

  if (prescriptionTag && prescriptionDiv) {
    prescriptionTag.addEventListener("change", function () {
      if (this.value === "Yes") {
        prescriptionDiv.style.display = "flex";
      } else {
        prescriptionDiv.style.display = "none";
      }
    });
  }
});

function saveRecommendation() {
  const recommendation = $("#recommendation").val();
  const pres_tag = $("#prescription_tag").val();
  const prescription = $("#prescription").val();
  const follow_up = $("#follow_up").val();
  const appointment_id = $("#appointment_id").val();

  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to submit this?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/giveRecommendation",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          appointment_id,
          recommendation,
          follow_up,
          pres_tag,
          prescription,
        }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Submitted!",
            text: "Recommendation successfully created!",
          }).then(() => {
            if (!modalInstance) {
              modalInstance = new bootstrap.Modal(modalElement);
            }
            modalInstance.hide();
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

function searchPatients() {
  patientTable.ajax.reload();
}

function clearCriteria() {
  $(".criteria").val("");
  patientTable.ajax.reload();
}

function patientDetails(patient_user_id) {
  $.ajax({
    url: "/getPatientInfo",
    type: "GET",
    data: { patient_user_id: patient_user_id },
    success: function (response) {
      const data = response.data[0];
      const rawDate = data.birthdate;
      const dateObj = new Date(rawDate);
      const formattedDate = dateObj.toISOString().split("T")[0];

      $("#firstname").val(data.firstname);
      $("#middlename").val(data.middlename);
      $("#lastname").val(data.lastname);
      $("#gender").val(data.gender);
      $("#birthdate").val(formattedDate);
      $("#age").val(data.age);
      $("#role").val(data.role);
      $("#civilStatus").val(data.civil_status);
      $("#mobileNum").val(data.mobile_number);
      $("#email").val(data.email);
      $("#homeAddress").val(data.home_address);
      $("#name").val(data.emergency_name);
      $("#relationship").val(data.emergency_relationship);
      $("#mobileNum2").val(data.emergency_mobile_number);
      $("#bloodType").val(data.bloodtype);
      $("#allergies").val(data.allergies);
      $("#currentMedications").val(data.current_medication);
      $("#pastMedicalConditions").val(data.past_medical_condition);
      $("#chronicIllnes").val(data.chronic_illness);
    },
    error: function () {
      alert("Error fetching patientDetails.");
    },
  });
}

function updatePatientInfo(user_id) {
  const data = {
    user_id: user_id,
    firstname: $("#firstname").val(),
    middlename: $("#middlename").val(),
    lastname: $("#lastname").val(),
    gender: $("#gender").val(),
    birthdate: $("#birthdate").val(),
    age: $("#age").val(),
    civil_status: $("#civilStatus").val(),
    mobile_number: $("#mobileNum").val(),
    home_address: $("#homeAddress").val(),
    emergency_name: $("#name").val(),
    emergency_relationship: $("#relationship").val(),
    emergency_mobile_number: $("#mobileNum2").val(),
    bloodtype: $("#bloodType").val(),
    allergies: $("#allergies").val(),
    current_medication: $("#currentMedications").val(),
    past_medical_condition: $("#pastMedicalConditions").val(),
    chronic_illness: $("#chronicIllnes").val(),
    email: $("#email").val(),
  };

  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to update your info?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/updatePatientInfo",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function (res) {
          Swal.fire({
            icon: "success",
            title: "Saved!",
            text: "Profile updated successfully.",
          }).then(() => {
            patientDetails(user_id);
            $(".form-control").addClass("readonly");
            $(".form-control").prop("readonly", "true");
            $("select").prop("disabled", true);

            const button = $("#editPatientProfile");
            const currentText = button.text().trim();

            if (currentText.startsWith("Save Changes")) {
              button.html("Edit Info <i class='bi bi-pencil-square'></i>");
              button.removeClass("btn-success").addClass("btn-warning");
            }
          });
        },
        error: function (xhr, status, error) {
          console.error("Error updating patient info:", error);
          alert("Failed to update patient information.");
        },
      });
    }
  });
}
