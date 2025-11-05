$(document).ready(function () {
  const table = $("#dashboardTable").DataTable({
    searching: false,
    responsive: true,
    lengthChange: false,
    info: false,
  });

  // const ctx = document.getElementById("myChart").getContext("2d");

  // const myChart = new Chart(ctx, {
  //   type: "bar", // or 'line', 'pie', etc.
  //   data: {
  //     labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
  //     datasets: [
  //       {
  //         label: "Sample Votes",
  //         data: [12, 19, 3, 5, 2, 3],
  //         backgroundColor: [
  //           "rgba(255, 99, 132, 0.2)",
  //           "rgba(54, 162, 235, 0.2)",
  //           "rgba(255, 206, 86, 0.2)",
  //           "rgba(75, 192, 192, 0.2)",
  //           "rgba(153, 102, 255, 0.2)",
  //           "rgba(255, 159, 64, 0.2)",
  //         ],
  //         borderColor: [
  //           "rgba(255,99,132,1)",
  //           "rgba(54,162,235,1)",
  //           "rgba(255,206,86,1)",
  //           "rgba(75,192,192,1)",
  //           "rgba(153,102,255,1)",
  //           "rgba(255,159,64,1)",
  //         ],
  //         borderWidth: 1,
  //       },
  //     ],
  //   },
  //   options: {
  //     responsive: true,
  //     scales: {
  //       y: {
  //         beginAtZero: true,
  //       },
  //     },
  //   },
  // });

  $.get("/appointment-count", function (data) {
    $("#appointmentCount").text(data.total_booked);
  }).fail(function (xhr) {
    alert(xhr.responseJSON.message);
  });

  $.get("/appointment-count-today", function (data) {
    $("#patientTodayCount").text(data.total_booked_today);
  }).fail(function (xhr) {
    alert(xhr.responseJSON.message);
  });

  $.get("/overall_patients", function (data) {
    $("#patientCount").text(data.patient_count);
  }).fail(function (xhr) {
    alert(xhr.responseJSON.message);
  });

  $.get("/item-inventory-count", function (data) {
    $("#inventoryCount").text(data.inventory_count);
  }).fail(function (xhr) {
    alert(xhr.responseJSON.message);
  });
});
