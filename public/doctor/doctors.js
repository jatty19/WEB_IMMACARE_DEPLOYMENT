let user_id;
let firstname = $("#firstname").val();
let middlename = $("#middlename").val();
let lastname = $("#lastname").val();
let gender = $("#gender").val();
let birthdate = $("#dateofBirth").val();
let age = $("#age").val();
let contactNumber = $("#contactNumber").val();
let emailAddress = $("#emailAddress").val();
let specialty = $("#specialty").val();
let department = $("#department").val();
let yearsofexp = $("#yearsofexp").val();
let professionalBoard = $("#professionalBoard").val();
let certificate = $("#certificate").val();
let status = $("#status").val();
let doctorsTable;
let doctors_id = 0;
// $(document).on("click", ".get-user-btn", function () {
//   document.addEventListener("DOMContentLoaded", function () {
//     const roleEl = document.getElementById("role");
//     if (roleEl) {
//       roleEl.addEventListener("mousedown", function (e) {
//         e.preventDefault();
//       });
//     }
//   });
//   $("#user_id").val(doctors_id);
//   const userId = $(this).data("id");
//   doctors_id = userId;
//   user_id = userId;

//   alert(doctors_id);
//   $.ajax({
//     url: `/users_update/${doctors_id}`,
//     method: "GET",
//     success: function (response) {
//       const user = response.data[0];

//       // Populate input fields
//       $("#firstname").val(user.firstname).prop("readonly", true);
//       $("#middlename").val(user.middlename).prop("readonly", true);
//       $("#lastname").val(user.lastname).prop("readonly", true);
//       $("#birthdate").val(user.birthdate).prop("readonly", true);
//       $("#gender").val(user.gender).prop("readonly", true);
//       $("#role").val(user.role).prop("readonly", true);
//       $("#email").val(user.username);
//       $("#status").val(user.status);
//       $("#password, #passwordconfirm").val("");
//     },
//     error: function () {
//       alert("Failed to load user");
//     },
//   });

//   getSession();
// });

$(document).ready(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get("id");

  if (doctorId) {
    doctorInfo(doctorId);
    $("#user_id").val(doctorId);
  }

  getSession();
  doctorsTable = $("#doctorsTable").DataTable({
    columnDefs: [
      { targets: 1, width: "15%" },
      {
        targets: [0], // Index of column to hide (0-based)
        visible: false,
      },
    ],
    searching: false,
    responsive: true,
    lengthChange: false,
    ajax: {
      url: "/getDoctorsList",
      dataSrc: "data",
      data: function (d) {
        d.doctorName = $("#doctorsName").val();
        d.specialtyId = $("#specialtySearch").val();
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
          class="btn btn-warning btn-sm get-user-btn"
          href="../doctor/doctors_profile.html?id=${row.id}"
          data-id="${row.id}"
        >
          View Doctors Profile
        
      `;
        },
      },
      { data: "fullname" },
      {
        data: "specialty",
        render: function (data, type, row) {
          return checkSpecialty(data);
        },
      },
      { data: "email" },
    ],
  });

  $(".dt-length label").each(function () {
    const labelText = $(this).text().trim();
    if (labelText === "entries per page") {
      $(this).remove(); // OR just hide it: $(this).css('display', 'none');
    }
  });
});

function checkSpecialty(specialtyId) {
  switch (parseInt(specialtyId)) {
    case 1:
      return "Prenatal";
    case 2:
      return "Post Natal";
    case 3:
      return "Family Planning";
    case 4:
      return "Vaccination (Pedia and Adult)";
    case 5:
      return "Ultrasound";
    case 6:
      return "Laboratory Services";
    case 7:
      return "ECG";
    case 8:
      return "Non-stress test for pregnant";
    case 9:
      return "Hearing screening test";
    case 10:
      return "2D Echo";
    case 11:
      return "Minor Surgery";
    case 12:
      return "Obgyne";
    case 13:
      return "Pediatrician";
    case 14:
      return "Surgeon";
    case 15:
      return "Internal Medicine";
    case 16:
      return "Urologist";
    case 17:
      return "ENT";
    case 18:
      return "Opthalmologist";
    case 19:
      return "Ear Piercing";
    case 20:
      return "Papsmear";
    default:
      return "Unknown Specialty";
  }
}

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
      if (`${data.role}` === "doctor") {
        document.querySelector("h2").textContent =
          "Dr. " + `${data.firstname}` + " " + `${data.lastname}`;

        const rawDate = data.birthdate;
        let formattedDate = "";
        if (rawDate) {
          const dateObj = new Date(rawDate);
          if (!isNaN(dateObj)) {
            formattedDate = dateObj.toISOString().split("T")[0];
            $("#dateofBirth").val(formattedDate);
          } else {
            $("#dateofBirth").val(""); // Or handle as you prefer
          }
        } else {
          $("#dateofBirth").val("");
        }
        $("#user_id").val(data.user_id_id);

        $("#firstname").val(`${data.firstname}`);
        $("#middlename").val(data.middlename != null ? data.middlename : "");

        $("#lastname").val(`${data.lastname}`);
        $("#gender").val(`${data.gender}`);
        $("#dateofBirth").val(formattedDate);
        $("#age").val(data.age != null ? data.age : "");
        $("#contactNumber").val(`${data.phone}`.replace("+", ""));
        $("#emailAddress").val(`${data.email}`);
        getProfessionalInfo();
        doctorInfo(doctors_id);
      }

      $(".form-control").addClass("readonly");
      $(".form-control").prop("readonly", "true");
      $("select").prop("disabled", true);

      if (data.role === "admin") {
        $("#doctorsName, #specialtySearch").removeClass("readonly");
        $("#doctorsName, #specialtySearch").prop("readonly", false);
        $("#doctorsName, #specialtySearch").prop("disabled", false);
        $("#updateButton").hide();

        getProfessionalInfo();
      }
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });
}

function doctorInfo(id) {
  $.ajax({
    url: "/getDoctorsInfo",
    type: "GET",
    data: { doctor_user_id: id },
    success: function (response) {
      if (
        response.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        const data = response.data[0];

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
        $("#firstname").val(data.firstname);
        $("#middlename").val(data.middlename);
        $("#lastname").val(data.lastname);
        $("#gender").val(data.gender);

        $("#age").val(data.age);
        $("#role").val(data.role);
      }
    },
    error: function () {
      alert("Error fetching patientDetails.");
    },
  });
}

function handleButtonUpdate() {
  const button = $("#updateButton");
  const currentText = button.text().trim();

  if (currentText.startsWith("Update Info")) {
    $(".form-control").removeClass("readonly");
    $("select").prop("disabled", false);
    $(".form-control").prop("readonly", false);
    button.html("Save Changes <i class='bi bi-save'></i>");
    button.removeClass("btn-light").addClass("btn-success");
  } else {
    updateDoctorInfo();
  }
}

function updateDoctorInfo() {
  const user_id = $("#user_id").val();
  const firstname = $("#firstname").val();
  const middlename = $("#middlename").val();
  const lastname = $("#lastname").val();
  const gender = $("#gender").val();
  const birthdate = $("#dateofBirth").val();
  const age = $("#age").val();
  const contactNumber = $("#contactNumber").val();
  const emailAddress = $("#emailAddress").val();
  const specialty = $("#specialty").val();
  const department = $("#department").val();
  const yearsofexp = $("#yearsofexp").val();
  const professionalBoard = $("#professionalBoard").val();
  const certificate = $("#certificate").val();
  const status = $("#status").val();

  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to apply changes?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/updateDoctorInfo",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          user_id,
          firstname,
          middlename,
          lastname,
          gender,
          birthdate,
          age,
          contactNumber,
          emailAddress,
          specialty,
          department,
          yearsofexp,
          professionalBoard,
          certificate,
          status,
        }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Saved!",
            text: "Profile updated successfully.",
          }).then(() => {
            getSession();
            const button = $("#updateButton");
            const currentText = button.text().trim();

            if (currentText.startsWith("Save Changes")) {
              button.html("Update Info <i class='bi bi-pencil-square'></i>");
              button.removeClass("btn-success").addClass("btn-light");
            }
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

function savePasswordChanges() {
  const password = $("#password").val();
  const confirmPassword = $("#confirmPassword").val();
  const user_id = $("#user_id").val();
  if (password == null || confirmPassword === "") {
    Swal.fire({
      title: "",
      text: "Please fill password.",
      icon: "error",
    });
  } else if (password !== confirmPassword) {
    Swal.fire({
      title: "",
      text: "Password Mismatch",
      icon: "error",
    });
  } else {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to change your password?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      confirmButtonText: "Yes",
      backdrop: false,
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: "/updateDoctorPassword",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({
            user_id,
            password,
          }),
          success: function (response) {
            Swal.fire({
              icon: "success",
              title: "Saved!",
              text: "Password changed successfully.",
            }).then(() => {
              $("#changePasswordModal").modal("hide");
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

function changePasswordModal() {
  $(".form-control").removeClass("readonly");
  $("select").prop("disabled", false);
  $(".form-control").prop("readonly", false);
  $("#password, #confirmPassword").val("");
  $("#password, #confirmPassword").removeClass("readonly");
  const modal = new bootstrap.Modal(
    document.getElementById("changePasswordModal2")
  );
  modal.show();
}

function discardChanges() {
  const modalElement = document.getElementById("changePasswordModal2");
  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (modalInstance) {
    modalInstance.hide();
  }
}

function getProfessionalInfo() {
  const user_id = $("#user_id").val();
  console.log("user_id: " + user_id);
  $.ajax({
    url: `/getProfessionalInfo/${user_id}`,
    method: "GET",
    success: function (response) {
      if (
        response.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        const data = response.data[0];

        $("#specialty").val(data.specialty ?? "");
        $("#department").val(data.department ?? "");
        $("#yearsofexp").val(data.yearsofexp ?? "");
        $("#professionalBoard").val(data.professionalBoard ?? "");
        $("#certificate").val(data.certificate ?? "");
        $("#status").val(data.status ?? "");
      }
    },
    error: function () {
      alert("Failed to load Professional Info");
    },
  });
}

function searchDoctor() {
  doctorsTable.ajax.reload();
}

function clearCriteria() {
  $(".criteria").val("");
  doctorsTable.ajax.reload();
}
