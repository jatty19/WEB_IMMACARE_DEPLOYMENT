let table;

$(document).ready(function () {
  table = $("#example").DataTable({
    columnDefs: [
      { targets: 1, width: "10%" },
      {
        targets: [0], // Index of column to hide (0-based)
        visible: false,
      },
    ],
    responsive: true,
    lengthChange: false,
    searching: false,
    ajax: {
      url: "/users",
      dataSrc: "data",
      data: function (d) {
        d.fullname = $("#fullname").val();
        d.role = $("#roleSearch").val();
      },
    },
    columns: [
      { data: "user_id" },
      {
        data: null,
        orderable: false,
        searchable: false,
        render: function (data, type, row) {
          return `
        <button
          class="btn btn-warning btn-sm get-user-btn"
          data-bs-toggle="modal"
          data-bs-target="#updateModal"
          data-bs-backdrop="false"
          data-user-id="${row.user_id}"
        >
          Update
        </button>
      `;
        },
      },
      {
        data: "role",
        render: function (data, type, row) {
          if (!data) return "";
          return data.charAt(0).toUpperCase() + data.slice(1).toLowerCase();
        },
      },
      { data: "fullname" },
      { data: "status" },
      { data: "username" },
      { data: "updated_date" },
    ],
  });

  $(".dt-length label").each(function () {
    const labelText = $(this).text().trim();
    if (labelText === "entries per page") {
      $(this).remove(); // OR just hide it: $(this).css('display', 'none');
    }
  });
});

$(document).on("click", ".get-user-btn", function () {
  document.getElementById("role").addEventListener("mousedown", function (e) {
    e.preventDefault();
  });
  const userId = $(this).data("user-id");
  console.log("userId", userId);
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
      $("#role").prop("disabled", false); // Enable first
      $("#role").val(user.role); // Set value
      $("#role").prop("disabled", true); // Disable again if needed

      $("#email").val(user.username);
      $("#status").val(user.status);
      $("#password, #passwordconfirm").val("");
    },
    error: function () {
      alert("Failed to load user");
    },
  });
});

function updateUser() {
  const user_id = $("#modal_user_id").val();
  const email = $("#email").val();
  const password = $("#password").val();
  const status = $("#status").val();

  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to update this account?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes, create!",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/updateUserAccount",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ user_id, email, password, status }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Updated Account!",
            text: "Account has been updated successfully.",
          }).then(() => {
            $("#updateModal").modal("hide");
            $(".updateInput").val("");
            table.ajax.reload();
          });
        },
        error: function (xhr) {
          Swal.fire({
            title: "Error!",
            text: xhr.responseJSON.message,
            icon: "error",
          });
        },
      });
    }
  });
}

$(document).on("click", ".get-user-btn", function () {
  const userId = $(this).data("user-id");
  $("#modal_user_id").val(userId);
});

function saveUser() {
  const firstname = $("#addFirstname").val();
  const middlename = $("#AddMiddlename").val();
  const lastname = $("#AddLastname").val();
  const gender = $("#addGender").val();
  const birthdate = $("#addBirthdate").val();
  const role = $("#addRole").val();
  const email = $("#addEmail").val();
  const password = $("#addPassword").val();
  const password2 = $("#addPasswordconfirm").val();
  const status = $("#addStatus").val();

  $(".addInput").each(function () {
    if ($(this).val() == null || $(this).val().trim() === "") {
      Swal.fire({
        title: "",
        text: "Please complete all required fields.",
        icon: "error",
      });
    } else if (password !== password2) {
      Swal.fire({
        title: "",
        text: "Password Mismatch",
        icon: "error",
      });
    } else {
      Swal.fire({
        title: "Are you sure?",
        text: "Do you want to create this account?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        confirmButtonText: "Yes, create!",
        backdrop: false,
      }).then((result) => {
        if (result.isConfirmed) {
          $.ajax({
            url: "/createAccount",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
              firstname,
              middlename,
              lastname,
              gender,
              birthdate,
              email,
              password,
              role,
              status,
            }),
            success: function (response) {
              Swal.fire({
                icon: "success",
                title: "Account Created!",
                text: "Account has been created successfully.",
              }).then(() => {
                $("#addUserModal").modal("hide");
                $(".addInput").val("");
                table.ajax.reload();
              });
            },
            error: function (xhr) {
              alert("Error: " + xhr.responseJSON.message);
            },
          });
        }
      });
    }
  });
}

function clearCriteria() {
  $(".criteria").val("");
  table.ajax.reload();
}

function searchUser() {
  table.ajax.reload();
}
