document.addEventListener("DOMContentLoaded", function () {
  const updateButtons = document.querySelectorAll(".add-item");

  updateButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-user-id");

      document.getElementById("modal_user_id").value = userId;
    });
  });
});
let table;
$(document).ready(function () {
  table = $("#inventoryTable").DataTable({
    columnDefs: [
      { targets: 1, width: "13%" },
      {
        targets: [0], // Index of column to hide (0-based)
        visible: false,
      },
    ],
    searching: false,
    lengthChange: false,
    dom: "Bfrtip",
    buttons: ["excel", "pdf"],

    responsive: true,
    ajax: {
      url: "/getInventory",
      dataSrc: "data",
      data: function (d) {
        // Add these parameters to the request
        d.item = $("#itemSearch").val();
        d.status = $("#ItemStatus").val();
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
         <button
          class="btn btn-warning btn-sm get-item-btn"
          data-bs-toggle="modal"
          data-bs-target="#updateItem"
          data-bs-backdrop="false"
          data-id="${row.id}"
        >
            Update Item
        </button>
      `;
        },
      },
      { data: "item" },
      { data: "category" },
      { data: "quantity" },
      { data: "price" },
      {
        data: "status",
        render: function (data, type, row) {
          let statusClass = "";

          if (data.toLowerCase() === "out of stock") {
            statusClass = "badge bg-danger";
          } else if (data.toLowerCase() === "in stock") {
            statusClass = "badge bg-success";
          } else {
            statusClass = "badge bg-secondary";
          }

          return `<span class="${statusClass}">${data}</span>`;
        },
      },
    ],
  });

  $("#ItemStatus").on("change", function () {
    table.ajax.reload();
  });
});

function saveItem() {
  const addItem = $("#addItem2").val();
  const addCategory = $("#addCategory").val();
  const addQuantity = $("#addQuantity").val();
  const addMinimum = $("#addMinimum").val();
  const addPrice = $("#addPrice").val();

  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to save this item?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes, Save it!",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/saveInventoryItem",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          addItem,
          addCategory,
          addQuantity,
          addMinimum,
          addPrice,
        }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Saved!",
            text: addItem + " has been saved successfully.",
          }).then(() => {
            // Close the modal (use the actual modal ID)
            $("#addItem").modal("hide");

            // Reload DataTable
            table.ajax.reload();
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

function searchInventory() {
  table.ajax.reload();
}

function clearCriteria() {
  $(".criteria").val("");
  table.ajax.reload();
}

$(document).on("click", ".get-item-btn", function () {
  const id = $(this).data("id");

  $.ajax({
    url: `/getItemInventoryByID/${id}`,
    method: "GET",
    success: function (response) {
      const user = response.data[0];

      // Populate input fields
      $("#updateItemName").val(user.item);
      $("#updateCategory").val(user.category_id);
      $("#updateQuantity").val(user.quantity);
      $("#updateMinimum").val(user.average_quantity);
      $("#updatePrice").val(user.price);
      $("#updateID").val(id);
    },
    error: function () {
      alert("Failed to load inventory");
    },
  });
});

function updateItem() {
  const id = $("#updateID").val();
  const updateItemName = $("#updateItemName").val();
  const updateCategory = $("#updateCategory").val();
  const updateQuantity = $("#updateQuantity").val();
  const updateMinimum = $("#updateMinimum").val();
  const updatePrice = $("#updatePrice").val();
  Swal.fire({
    title: "Are you sure?",
    text: "Do you want to update this item?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#28a745",
    confirmButtonText: "Yes, update it!",
    backdrop: false,
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "/updateInventory",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          id,
          updateItemName,
          updateCategory,
          updateQuantity,
          updateMinimum,
          updatePrice,
        }),
        success: function (response) {
          Swal.fire({
            icon: "success",
            title: "Updated!",
            text: "Item has been updated successfully.",
          }).then(() => {
            $("#updateItem").modal("hide");

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

function discardChanges() {
  $(".form-control").val("");
  $(".form-select").val("");
  $("#addItem").modal("hide");
  $("#updateItem").modal("hide");
}
